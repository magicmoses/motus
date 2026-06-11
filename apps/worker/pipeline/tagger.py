import argparse
import json
import os
import re
from pathlib import Path

import anthropic

from db import queries
from utils.cost_tracker import log_call
from utils.env import load_env
from utils.logger import get_logger

load_env()
logger = get_logger(__name__)

MODEL = 'claude-haiku-4-5-20251001'
MAX_TOKENS = 768
TAGGER_PROMPT = Path(__file__).parent.parent / 'prompts' / 'tagger_system.txt'

_CONF_AUTO_COMMIT = 0.75
_CONF_NEEDS_REVIEW = 0.50

_ALLOWED_SPORTS = frozenset({'running', 'cycling', 'rowing', 'skiing', 'hyrox', 'triathlon'})
_ALLOWED_RESEARCH_DIMENSIONS = frozenset({
    'female_athlete', 'masters_longevity', 'supplements',
    'technology_wearables', 'ai_ml_research', 'para_sport',
})
_ALLOWED_MOVEMENT_PRACTICES = frozenset({
    'martial_arts', 'mind_body', 'yoga_pilates',
})
_ALLOWED_BODY_REGIONS = frozenset({
    'calves', 'quads', 'hamstrings', 'glutes', 'core', 'lower_back',
    'hip_flexors', 'knees', 'achilles', 'shoulders', 'neck', 'grip_forearms',
    'hip_abductors', 'ankles', 'it_band', 'foot', 'lats',
})
_ALLOWED_TOPICS = frozenset({
    'vo2max', 'lactate', 'hrv', 'cardiac_output', 'altitude', 'biomechanics',
    'pacing', 'heat_performance', 'fatigue', 'periodization', 'intervals',
    'strength', 'overtraining', 'sleep', 'active_recovery', 'passive_recovery',
    'hrv_recovery', 'carbohydrates', 'protein', 'hydration', 'supplements',
    'gut_health', 'tendon', 'stress_fracture', 'it_band', 'plantar_fascia',
    'knee', 'hamstring', 'prevention', 'psychology', 'pacing_strategy', 'pain_tolerance',
    # Running distance categories
    'marathon', 'half_marathon', 'ultramarathon', 'trail_running', '5k_10k',
})
_ALLOWED_STUDY_TYPES = frozenset({'RCT', 'cohort', 'review', 'case_study', 'mechanistic', 'meta_analysis', 'cross_sectional'})
_ALLOWED_POPULATIONS = frozenset({'recreational', 'trained', 'elite', 'mixed', 'unknown'})


def _extract_json(text: str) -> str:
    """Strip markdown code fences if the model wraps its JSON output."""
    text = text.strip()
    match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    return match.group(1).strip() if match else text


def _filter_allowed(values: list, allowed: frozenset) -> list:
    return [v for v in (values or []) if v in allowed]


def _parse_sample_size(value) -> int | None:
    """Extract a clean integer from sample_size — LLM sometimes returns strings like
    'n=27 (13 canines, 9 humans)'. Takes the first integer found, or None."""
    if value is None:
        return None
    if isinstance(value, int):
        return value
    m = re.search(r'\d+', str(value))
    return int(m.group()) if m else None


def _determine_status(confidence: dict) -> str:
    """
    Derive enrichment_status from confidence scores.

    All three key signals below 0.50 → flagged (excluded from feed).
    At least two at or above 0.75 → auto_committed.
    Otherwise → needs_review.
    """
    sports_c = confidence.get('sports', 0.0) or 0.0
    topics_c = confidence.get('topics', 0.0) or 0.0
    evidence_c = confidence.get('evidence_level', 0.0) or 0.0

    if sports_c < _CONF_NEEDS_REVIEW and topics_c < _CONF_NEEDS_REVIEW and evidence_c < _CONF_NEEDS_REVIEW:
        return 'flagged'

    high_confidence_count = sum(1 for c in [sports_c, topics_c, evidence_c] if c >= _CONF_AUTO_COMMIT)
    if high_confidence_count >= 2:
        return 'auto_committed'
    return 'needs_review'


def _call_llm(client: anthropic.Anthropic, title: str, abstract: str) -> tuple[dict | None, int, int]:
    """Run the tagger prompt and parse the JSON response.
    Returns (parsed dict | None, input_tokens, output_tokens)."""
    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=TAGGER_PROMPT.read_text(encoding='utf-8'),
            messages=[{'role': 'user', 'content': f'Title: {title}\n\nAbstract: {abstract}'}],
        )
        inp = msg.usage.input_tokens
        out = msg.usage.output_tokens
        raw_text = _extract_json(msg.content[0].text if msg.content else '')
        try:
            return json.loads(raw_text), inp, out
        except json.JSONDecodeError:
            logger.warning(f'Tagger: invalid JSON response for "{title[:40]}" — raw: {raw_text[:120]!r}')
            return None, inp, out
    except Exception as e:
        logger.warning(f'Tagger API error for "{title[:40]}": {e}')
        return None, 0, 0


def _log_reasoning(data: dict) -> None:
    """Debug-log the model's multi-perspective reasoning — never stored in DB."""
    perspectives = data.get('_perspectives') or {}
    if perspectives:
        logger.debug(
            f'Perspectives — athlete: {perspectives.get("athlete", "")} | '
            f'researcher: {perspectives.get("researcher", "")} | '
            f'clinician: {perspectives.get("clinician", "")} | '
            f'physiologist: {perspectives.get("physiologist", "")}'
        )
    sport_reasoning = data.get('_sport_reasoning', '')
    if sport_reasoning:
        logger.debug(f'Sport reasoning: {sport_reasoning}')


def _confidence_gated(data: dict, field: str, allowed: frozenset, confidence_key: str) -> list:
    """Keep only allowed enum values; drop the whole list when confidence is
    below the needs_review threshold."""
    confidence = data.get('confidence') or {}
    if (confidence.get(confidence_key) or 0.0) < _CONF_NEEDS_REVIEW:
        return []
    return _filter_allowed(data.get(field), allowed)


def _validate_tags(data: dict) -> dict:
    """Map a parsed LLM response onto the enrichment tag columns:
    enum-filter every list, null out low-confidence fields, coerce types."""
    confidence: dict = data.get('confidence') or {}

    evidence_level = data.get('evidence_level')
    if (confidence.get('evidence_level') or 0.0) < _CONF_NEEDS_REVIEW:
        evidence_level = None

    study_type = data.get('study_type')
    if study_type not in _ALLOWED_STUDY_TYPES:
        study_type = None

    population = data.get('population')
    if population not in _ALLOWED_POPULATIONS:
        population = None

    return {
        'sports': _confidence_gated(data, 'sports', _ALLOWED_SPORTS, 'sports'),
        'movement_practices': _filter_allowed(data.get('movement_practices'), _ALLOWED_MOVEMENT_PRACTICES),
        'body_regions': _confidence_gated(data, 'body_regions', _ALLOWED_BODY_REGIONS, 'body_regions'),
        'topics': _confidence_gated(data, 'topics', _ALLOWED_TOPICS, 'topics'),
        'research_dimensions': _filter_allowed(data.get('research_dimensions'), _ALLOWED_RESEARCH_DIMENSIONS),
        'study_type': study_type,
        'population': population,
        'sample_size': _parse_sample_size(data.get('sample_size')),
        'evidence_level': evidence_level,
        'confidence_sports': confidence.get('sports'),
        'confidence_regions': confidence.get('body_regions'),
        'confidence_topics': confidence.get('topics'),
        'confidence_evidence': confidence.get('evidence_level'),
    }


def tag_paper(client: anthropic.Anthropic, enrichment: dict) -> tuple[dict | None, int, int]:
    """
    Call the tagger LLM and return a tag dict.
    Returns (tags | None, input_tokens, output_tokens).
    """
    paper = enrichment.get('papers') or {}
    title = paper.get('title', '')
    abstract = paper.get('abstract', '')

    if not abstract:
        return None, 0, 0

    data, inp, out = _call_llm(client, title, abstract)
    if data is None:
        return None, inp, out

    _log_reasoning(data)
    return _validate_tags(data), inp, out


def main() -> None:
    parser = argparse.ArgumentParser(description='Motus tagger stage')
    parser.add_argument('--limit', type=int, default=100,
                        help='Max enrichments to process per run')
    parser.add_argument('--backfill-dimensions', action='store_true',
                        help='Retrofit research_dimensions onto already-tagged enrichments '
                             'without touching sports/topics/evidence_level')
    parser.add_argument('--retag-all', action='store_true',
                        help='Full re-tag all committed enrichments with the current prompt. '
                             'Use after significant prompt changes.')
    args = parser.parse_args()

    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])

    if args.retag_all:
        enrichments = queries.get_all_tagged_enrichments(limit=args.limit)
        logger.info(f'Tagger (retag-all): {len(enrichments)} enrichments to fully re-tag')
    elif args.backfill_dimensions:
        enrichments = queries.get_enrichments_missing_dimensions(limit=args.limit)
        logger.info(f'Tagger (backfill-dimensions): {len(enrichments)} enrichments to update')
    else:
        enrichments = queries.get_enrichments_pending_tags(limit=args.limit)
        logger.info(f'Tagger: processing {len(enrichments)} enrichments')

    succeeded = 0
    failed = 0

    for enrichment in enrichments:
        enrichment_id = enrichment['id']
        paper = enrichment.get('papers') or {}
        paper_id = paper.get('id', enrichment.get('paper_id', ''))
        title_preview = paper.get('title', '')[:60]

        tags, inp, out = tag_paper(client, enrichment)
        log_call('tagger', MODEL, inp, out, paper_id)

        if tags is None:
            logger.warning(f'Tagger failed: {title_preview}')
            if not args.backfill_dimensions:
                queries.update_enrichment(enrichment_id, {'enrichment_status': 'failed'})
            failed += 1
            continue


        if args.backfill_dimensions:
            # Only write new fields — never overwrite reviewed sports/topics/status
            queries.update_enrichment(enrichment_id, {
                'research_dimensions': tags.get('research_dimensions', []),
                'movement_practices': tags.get('movement_practices', []),
            })
            logger.info(f'Dimensions backfilled: {title_preview}')
        else:
            # Full write — covers both normal tagging and --retag-all
            status = _determine_status({
                'sports': tags.get('confidence_sports'),
                'topics': tags.get('confidence_topics'),
                'evidence_level': tags.get('confidence_evidence'),
            })
            tags['enrichment_status'] = status
            queries.update_enrichment(enrichment_id, tags)
            mode = 'Re-tagged' if args.retag_all else 'Tagged'
            logger.info(f'{mode} [{status}]: {title_preview}')

        succeeded += 1

    logger.info(f'Tagger complete: succeeded={succeeded} failed={failed}')


if __name__ == '__main__':
    main()
