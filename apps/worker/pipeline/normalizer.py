import argparse
import hashlib
from datetime import date
from typing import Optional

from dotenv import load_dotenv

from db import queries
from utils.logger import get_logger

load_dotenv()
logger = get_logger(__name__)

CUTOFF_DATE = date(2018, 1, 1)
ABSTRACT_MIN_WORDS = 80


def word_count(text: str) -> int:
    return len(text.split()) if text else 0


def title_hash(title: str) -> str:
    return hashlib.md5(title.lower().strip().encode()).hexdigest()


def _parse_date(date_str: Optional[str]) -> Optional[date]:
    """Parse an ISO-ish date string to a date, returning None on failure."""
    if not date_str:
        return None
    try:
        return date.fromisoformat(str(date_str)[:10])
    except (ValueError, TypeError):
        return None


def _validate(paper: dict) -> tuple[bool, str]:
    """
    Apply normalization rules from the pipeline skill.

    Returns (is_valid, reject_reason). reject_reason is empty when valid.

    Hard-reject conditions (matches ingestion-pipeline SKILL.md policy gates):
    - Abstract missing or < 80 words
    - No DOI and no stable source URL
    - published_at < 2018
    - DOI already in papers table (duplicate)
    - Title hash already in papers table (duplicate)
    """
    abstract = paper.get('abstract') or ''
    if not abstract:
        return False, 'missing abstract'
    if word_count(abstract) < ABSTRACT_MIN_WORDS:
        return False, 'abstract too short'

    doi = paper.get('doi')
    source_url = paper.get('source_url')
    if not doi and not source_url:
        return False, 'no identifier'

    published = _parse_date(paper.get('published_at'))
    if published is not None and published < CUTOFF_DATE:
        return False, 'paper too old'

    if doi and queries.paper_exists_by_doi(doi):
        return False, 'duplicate DOI'

    th = title_hash(paper.get('title', ''))
    if queries.paper_exists_by_title_hash(th):
        return False, 'duplicate title'

    return True, ''


def _normalize_paper(raw: dict) -> dict:
    """
    Project only the columns that belong in the papers table.

    Strips any queue-internal fields and normalises published_at to a
    10-character ISO 8601 date string (or None).
    """
    published_raw = raw.get('published_at', '')
    published_at: Optional[str] = str(published_raw)[:10] if published_raw else None

    return {
        'doi': raw.get('doi'),
        'title': raw.get('title', ''),
        'abstract': raw.get('abstract'),
        'authors': raw.get('authors') or [],
        'journal': raw.get('journal'),
        'source_url': raw.get('source_url'),
        'source_id': raw.get('source_id'),
        'source_name': raw.get('source_name'),
        'published_at': published_at,
        'citation_count': raw.get('citation_count'),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description='Motus normalizer')
    parser.add_argument('--limit', type=int, default=2000,
                        help='Max queue items to process per run')
    parser.add_argument('--retry-failed', action='store_true',
                        help='Retry failed queue items (excludes structural failures)')
    args = parser.parse_args()

    if args.retry_failed:
        failed_items = queries.get_failed_queue_items_for_retry(limit=args.limit)
        logger.info(f'Normalizer (retry-failed): resetting {len(failed_items)} items to pending')
        for item in failed_items:
            queries.reset_queue_item_to_pending(item['id'])
        logger.info('Reset complete — run normalizer normally to process them')
        return

    items = queries.get_pending_queue(limit=args.limit)
    logger.info(f'Normalizer: processing {len(items)} pending queue items')

    accepted = 0
    rejected = 0

    for item in items:
        queue_id: str = item['id']
        raw: dict = item.get('raw') or {}
        title_preview = raw.get('title', '')[:60]

        queries.update_queue_status(queue_id, 'processing')

        valid, reason = _validate(raw)
        if not valid:
            logger.info(f'Rejected [{reason}]: {title_preview}')
            queries.update_queue_status(queue_id, 'failed', error=reason)
            rejected += 1
            continue

        try:
            paper = _normalize_paper(raw)
            queries.insert_paper(paper)
            queries.update_queue_status(queue_id, 'done')
            accepted += 1
            logger.info(f'Accepted: {title_preview}')
        except Exception as exc:
            logger.error(f'Insert error for "{raw.get("title", "")[:40]}": {exc}')
            queries.update_queue_status(queue_id, 'failed', error=str(exc))
            rejected += 1

    logger.info(f'Normalizer complete: accepted={accepted} rejected={rejected}')


if __name__ == '__main__':
    main()
