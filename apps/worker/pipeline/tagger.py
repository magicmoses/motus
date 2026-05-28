import argparse
import json
import os
import re
from pathlib import Path

import anthropic
from dotenv import load_dotenv

from db import queries
from utils.cost_tracker import log_call
from utils.logger import get_logger

load_dotenv()
logger = get_logger(__name__)

MODEL = 'claude-haiku-4-5-20251001'
MAX_TOKENS = 400
TAGGER_PROMPT = Path(__file__).parent.parent / 'prompts' / 'tagger_system.txt'

_CONF_AUTO_COMMIT = 0.85
_CONF_NEEDS_REVIEW = 0.60

_ALLOWED_SPORTS = frozenset({'running', 'cycling', 'rowing', 'skiing', 'hyrox', 'inline_skating', 'triathlon'})
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


def _determine_status(confidence: dict) -> str:
    """
    Derive enrichment_status from confidence scores.

    All three key signals below 0.60 → flagged (excluded from feed).
    All three at or above 0.85 → auto_committed.
    Otherwise → needs_review.
    """
    sports_c = confidence.get('sports', 0.0) or 0.0
    topics_c = confidence.get('topics', 0.0) or 0.0
    evidence_c = confidence.get('evidence_level', 0.0) or 0.0

    if sports_c < _CONF_NEEDS_REVIEW and topics_c < _CONF_NEEDS_REVIEW and evidence_c < _CONF_NEEDS_REVIEW:
        return 'flagged'
    if sports_c >= _CONF_AUTO_COMMIT and topics_c >= _CONF_AUTO_COMMIT and evidence_c >= _CONF_AUTO_COMMIT:
        return 'auto_committed'
    return 'needs_review'


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

    system_prompt = TAGGER_PROMPT.read_text(encoding='utf-8')
    user_msg = f'Title: {title}\n\nAbstract: {abstract}'

    msg = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system_prompt,
        messages=[{'role': 'user', 'content': user_msg}],
    )
    inp = msg.usage.input_tokens
    out = msg.usage.output_tokens

    raw_text = _extract_json(msg.content[0].text if msg.content else '')
    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        logger.warning(f'Tagger: invalid JSON response for "{title[:40]}" — raw: {raw_text[:120]!r}')
        return None, inp, out

    confidence: dict = data.get('confidence') or {}

    # Apply confidence thresholds — drop fields below needs_review threshold
    sports = _filter_allowed(data.get('sports'), _ALLOWED_SPORTS)
    if (confidence.get('sports') or 0.0) < _CONF_NEEDS_REVIEW:
        sports = []

    body_regions = _filter_allowed(data.get('body_regions'), _ALLOWED_BODY_REGIONS)
    if (confidence.get('body_regions') or 0.0) < _CONF_NEEDS_REVIEW:
        body_regions = []

    topics = _filter_allowed(data.get('topics'), _ALLOWED_TOPICS)
    if (confidence.get('topics') or 0.0) < _CONF_NEEDS_REVIEW:
        topics = []

    evidence_level = data.get('evidence_level')
    if (confidence.get('evidence_level') or 0.0) < _CONF_NEEDS_REVIEW:
        evidence_level = None

    study_type = data.get('study_type')
    if study_type not in _ALLOWED_STUDY_TYPES:
        study_type = None

    population = data.get('population')
    if population not in _ALLOWED_POPULATIONS:
        population = None

    tags = {
        'sports': sports,
        'body_regions': body_regions,
        'topics': topics,
        'study_type': study_type,
        'population': population,
        'sample_size': data.get('sample_size'),
        'evidence_level': evidence_level,
        'confidence_sports': confidence.get('sports'),
        'confidence_regions': confidence.get('body_regions'),
        'confidence_topics': confidence.get('topics'),
        'confidence_evidence': confidence.get('evidence_level'),
    }
    return tags, inp, out


def main() -> None:
    parser = argparse.ArgumentParser(description='Motus tagger stage')
    parser.add_argument('--limit', type=int, default=20,
                        help='Max enrichments to process per run')
    args = parser.parse_args()

    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
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
            queries.update_enrichment(enrichment_id, {'enrichment_status': 'failed'})
            failed += 1
            continue

        status = _determine_status({
            'sports': tags.get('confidence_sports'),
            'topics': tags.get('confidence_topics'),
            'evidence_level': tags.get('confidence_evidence'),
        })
        tags['enrichment_status'] = status

        queries.update_enrichment(enrichment_id, tags)
        succeeded += 1
        logger.info(f'Tagged [{status}]: {title_preview}')

    logger.info(f'Tagger complete: succeeded={succeeded} failed={failed}')


if __name__ == '__main__':
    main()
