import os
from typing import Optional

from dotenv import load_dotenv
from supabase import create_client, Client

from utils.logger import get_logger

load_dotenv()
logger = get_logger(__name__)

_client: Optional[Client] = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.environ['SUPABASE_URL']
        key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
        _client = create_client(url, key)
    return _client


def get_last_paper_hours_ago() -> float | None:
    """Returns hours since the most recent paper was added. None if no papers exist."""
    client = get_client()
    result = client.table('papers').select('created_at').order('created_at', desc=True).limit(1).execute()
    if not result.data:
        return None
    from datetime import datetime, timezone
    ts = datetime.fromisoformat(result.data[0]['created_at'])
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - ts).total_seconds() / 3600


def get_pending_queue(limit: int = 50) -> list[dict]:
    client = get_client()
    result = client.table('ingestion_queue').select('*').eq('status', 'pending').limit(limit).execute()
    return result.data or []


def update_queue_status(id: str, status: str, error: Optional[str] = None) -> None:
    client = get_client()
    payload: dict = {'status': status}
    if error:
        payload['error'] = error
    client.table('ingestion_queue').update(payload).eq('id', id).execute()


def insert_to_queue(raw: dict, source: str) -> None:
    client = get_client()
    client.table('ingestion_queue').insert({'raw': raw, 'source': source, 'status': 'pending'}).execute()


def insert_paper(paper: dict) -> str:
    client = get_client()
    result = client.table('papers').insert(paper).execute()
    return result.data[0]['id']


def paper_exists_by_doi(doi: str) -> bool:
    client = get_client()
    result = client.table('papers').select('id').eq('doi', doi).limit(1).execute()
    return bool(result.data)


def paper_exists_in_queue(doi: str) -> bool:
    """Check if a DOI has ever been seen in ingestion_queue (any status).
    Checking all statuses prevents re-queuing papers that failed normalization."""
    client = get_client()
    result = (
        client.table('ingestion_queue')
        .select('id')
        .filter('raw->>doi', 'eq', doi)
        .limit(1)
        .execute()
    )
    return bool(result.data)


def paper_exists_by_source_id(source_id: str) -> bool:
    client = get_client()
    result = client.table('papers').select('id').eq('source_id', source_id).limit(1).execute()
    return bool(result.data)


def paper_exists_in_queue_by_source_id(source_id: str) -> bool:
    client = get_client()
    result = (
        client.table('ingestion_queue')
        .select('id')
        .filter('raw->>source_id', 'eq', source_id)
        .limit(1)
        .execute()
    )
    return bool(result.data)


def paper_exists_by_title_hash(title_hash: str) -> bool:
    # We store title hash check in-memory across the run; DB has no title_hash column
    # This function is a no-op hook for future DB-side dedup
    return False


def get_papers_missing_citation_count(limit: int = 200) -> list[dict]:
    """Return papers from non-SS sources that have no citation_count yet."""
    client = get_client()
    result = (
        client.table('papers')
        .select('id, doi, source_name, source_id')
        .is_('citation_count', None)
        .neq('source_name', 'semantic_scholar')
        .limit(limit)
        .execute()
    )
    return result.data or []


def update_paper_citation_count(paper_id: str, count: int) -> None:
    client = get_client()
    client.table('papers').update({'citation_count': count}).eq('id', paper_id).execute()


def get_failed_queue_items_for_retry(limit: int = 200) -> list[dict]:
    """
    Failed queue items that are worth retrying — excludes structural failures
    (abstract too short, duplicate, too old, no identifier) which will fail again.
    """
    client = get_client()
    result = (
        client.table('ingestion_queue')
        .select('*')
        .eq('status', 'failed')
        .limit(limit * 4)
        .execute()
    )
    structural = {'abstract too short', 'missing abstract', 'no identifier',
                  'paper too old', 'duplicate DOI', 'duplicate title'}
    rows = [
        r for r in (result.data or [])
        if not any(s in (r.get('error') or '') for s in structural)
    ]
    return rows[:limit]


def reset_queue_item_to_pending(queue_id: str) -> None:
    client = get_client()
    client.table('ingestion_queue').update(
        {'status': 'pending', 'error': None}
    ).eq('id', queue_id).execute()


def get_failed_enrichments_for_writer_retry(limit: int = 50) -> list[dict]:
    """Writer-failed enrichments: status=failed, no summary. Safe to delete and re-attempt."""
    client = get_client()
    result = (
        client.table('enrichments')
        .select('id, paper_id, papers(id, title, abstract)')
        .eq('enrichment_status', 'failed')
        .is_('summary', None)
        .limit(limit)
        .execute()
    )
    return result.data or []


def delete_enrichment(enrichment_id: str) -> None:
    client = get_client()
    client.table('enrichments').delete().eq('id', enrichment_id).execute()


def get_papers_without_enrichment(limit: int = 20) -> list[dict]:
    client = get_client()
    # LEFT JOIN equivalent: papers where no enrichment exists
    result = (
        client.table('papers')
        .select('*, enrichments(id)')
        .is_('enrichments.id', None)  # type: ignore[arg-type]
        .limit(limit)
        .execute()
    )
    return result.data or []


def insert_enrichment(enrichment: dict) -> str:
    client = get_client()
    result = client.table('enrichments').insert(enrichment).execute()
    return result.data[0]['id']


def update_enrichment(id: str, fields: dict) -> None:
    client = get_client()
    client.table('enrichments').update(fields).eq('id', id).execute()


def get_all_tagged_enrichments(limit: int = 1200) -> list[dict]:
    """All enrichments for full re-tag after prompt changes — includes failed so
    papers truncated by MAX_TOKENS in a previous run get another attempt."""
    client = get_client()
    result = (
        client.table('enrichments')
        .select('*, papers(*)')
        .in_('enrichment_status', ['auto_committed', 'needs_review', 'failed'])
        .not_.is_('papers.abstract', None)
        .limit(limit)
        .execute()
    )
    return result.data or []


def get_enrichments_missing_dimensions(limit: int = 300) -> list[dict]:
    """Enrichments already tagged (sports populated) but missing research_dimensions.
    Used by tagger --backfill-dimensions to retrofit new dimension tags."""
    client = get_client()
    result = (
        client.table('enrichments')
        .select('*, papers(*)')
        .in_('enrichment_status', ['auto_committed', 'needs_review', 'pending'])
        .not_.is_('sports', None)
        .limit(limit * 3)  # over-fetch then filter client-side for empty array
        .execute()
    )
    rows = [r for r in (result.data or []) if not r.get('research_dimensions')]
    return rows[:limit]


def get_enrichments_pending_tags(limit: int = 20) -> list[dict]:
    client = get_client()
    result = (
        client.table('enrichments')
        .select('*, papers(*)')
        .is_('sports', None)
        .not_.in_('enrichment_status', ['failed'])
        .limit(limit)
        .execute()
    )
    return result.data or []


def get_enrichments_for_verification(limit: int = 50) -> list[dict]:
    client = get_client()
    result = (
        client.table('enrichments')
        .select('*, papers(*)')
        .in_('enrichment_status', ['auto_committed', 'needs_review'])
        .limit(limit)
        .execute()
    )
    return result.data or []
