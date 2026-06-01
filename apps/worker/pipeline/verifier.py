import argparse
import re

from dotenv import load_dotenv

from db import queries
from utils.logger import get_logger

load_dotenv()
logger = get_logger(__name__)

_DOI_RE = re.compile(r'^10\.\d{4,}/\S+$')
_SUMMARY_MAX_WORDS = 150
_CONF_THRESHOLD = 0.60


def _word_count(text: str) -> int:
    return len(text.split()) if text else 0


def _verify_enrichment(enrichment: dict) -> tuple[str, str]:
    """
    Apply soft-reject policy gates defined in the ingestion-pipeline skill.

    Returns (status, reason). reason is '' when no soft-reject applies.

    Soft-reject → 'flagged':
      - Summary > 150 words after writer retry
      - All confidence scores < 0.60
      - No sport tag assigned
      - Evidence level null

    Otherwise: preserve existing auto_committed / needs_review status.
    """
    paper = enrichment.get('papers') or {}
    doi = paper.get('doi') or ''
    summary = enrichment.get('summary') or ''
    sports = enrichment.get('sports') or []
    movement_practices = enrichment.get('movement_practices') or []
    evidence_level = enrichment.get('evidence_level')

    conf_sports = enrichment.get('confidence_sports') or 0.0
    conf_topics = enrichment.get('confidence_topics') or 0.0
    conf_evidence = enrichment.get('confidence_evidence') or 0.0

    reasons: list[str] = []

    if summary and _word_count(summary) > _SUMMARY_MAX_WORDS:
        reasons.append('summary too long')

    if doi and not _DOI_RE.match(doi):
        reasons.append('invalid DOI format')

    if not sports and not movement_practices:
        reasons.append('no sport or movement practice tag')

    if evidence_level is None:
        reasons.append('evidence level missing')

    if conf_sports < _CONF_THRESHOLD and conf_topics < _CONF_THRESHOLD and conf_evidence < _CONF_THRESHOLD:
        reasons.append('all confidence scores below threshold')

    if reasons:
        return 'flagged', '; '.join(reasons)

    current = enrichment.get('enrichment_status', 'needs_review')
    if current == 'auto_committed':
        return 'auto_committed', ''
    return 'needs_review', ''


def main() -> None:
    parser = argparse.ArgumentParser(description='Motus verifier stage')
    parser.add_argument('--limit', type=int, default=500,
                        help='Max enrichments to verify per run')
    args = parser.parse_args()

    enrichments = queries.get_enrichments_for_verification(limit=args.limit)
    logger.info(f'Verifier: processing {len(enrichments)} enrichments')

    auto_committed = 0
    needs_review = 0
    flagged = 0

    for enrichment in enrichments:
        enrichment_id = enrichment['id']
        paper = enrichment.get('papers') or {}
        title_preview = paper.get('title', '')[:60]

        status, reason = _verify_enrichment(enrichment)

        if reason:
            logger.warning(f'Flagged [{reason}]: {title_preview}')
        else:
            logger.info(f'Verified [{status}]: {title_preview}')

        queries.update_enrichment(enrichment_id, {'enrichment_status': status})

        if status == 'auto_committed':
            auto_committed += 1
        elif status == 'needs_review':
            needs_review += 1
        else:
            flagged += 1

    logger.info(
        f'Verifier complete: auto_committed={auto_committed} '
        f'needs_review={needs_review} flagged={flagged}'
    )


if __name__ == '__main__':
    main()
