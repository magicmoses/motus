import argparse
import hashlib
import os

from dotenv import load_dotenv

from db import queries
from sources.pubmed_client import PubMedClient
from sources.semantic_scholar_client import SemanticScholarClient
from sources.arxiv_client import ArXivClient
from sources.rss_client import RSSClient
from utils.logger import get_logger

load_dotenv()
logger = get_logger(__name__)


def title_hash(title: str) -> str:
    return hashlib.md5(title.lower().strip().encode()).hexdigest()


def _is_duplicate(paper: dict, seen_dois: set[str], seen_hashes: set[str]) -> bool:
    doi = paper.get('doi')
    if doi and doi in seen_dois:
        return True
    th = title_hash(paper.get('title', ''))
    if th in seen_hashes:
        return True
    if doi:
        if queries.paper_exists_by_doi(doi):
            return True
        if queries.paper_exists_in_queue(doi):
            return True
    else:
        # No DOI (e.g. arXiv) — fall back to source_id for persistent cross-run dedup
        source_id = paper.get('source_id')
        if source_id:
            if queries.paper_exists_by_source_id(source_id):
                return True
            if queries.paper_exists_in_queue_by_source_id(source_id):
                return True
    return False


def _queue_paper(paper: dict, source: str, seen_dois: set[str], seen_hashes: set[str]) -> bool:
    """Insert paper to ingestion_queue if not duplicate. Returns True if queued."""
    if _is_duplicate(paper, seen_dois, seen_hashes):
        return False
    doi = paper.get('doi')
    if doi:
        seen_dois.add(doi)
    seen_hashes.add(title_hash(paper.get('title', '')))
    queries.insert_to_queue(raw=paper, source=source)
    return True


def run_pubmed(
    days_back: int,
    limit: int,
    seen_dois: set[str],
    seen_hashes: set[str],
) -> tuple[int, int, int]:
    """Discover papers from PubMed. Returns (found, queued, skipped)."""
    client = PubMedClient()
    papers = client.search_all_queries(days_back=days_back)
    if limit:
        papers = papers[:limit]
    queued = 0
    for paper in papers:
        if _queue_paper(paper, 'pubmed', seen_dois, seen_hashes):
            queued += 1
    skipped = len(papers) - queued
    logger.info(f'PubMed: found={len(papers)} queued={queued} skipped={skipped}')
    return len(papers), queued, skipped


def run_semantic_scholar(
    seen_dois: set[str],
    seen_hashes: set[str],
) -> tuple[int, int, int]:
    """Discover papers from Semantic Scholar. Returns (found, queued, skipped)."""
    client = SemanticScholarClient()
    papers = client.search_all_queries()
    queued = 0
    for paper in papers:
        if _queue_paper(paper, 'semantic_scholar', seen_dois, seen_hashes):
            queued += 1
    skipped = len(papers) - queued
    logger.info(f'Semantic Scholar: found={len(papers)} queued={queued} skipped={skipped}')
    return len(papers), queued, skipped


def run_arxiv(
    seen_dois: set[str],
    seen_hashes: set[str],
) -> tuple[int, int, int]:
    """Discover papers from arXiv. Returns (found, queued, skipped)."""
    client = ArXivClient()
    papers = client.search_all_queries()
    queued = 0
    for paper in papers:
        if _queue_paper(paper, 'arxiv', seen_dois, seen_hashes):
            queued += 1
    skipped = len(papers) - queued
    logger.info(f'arXiv: found={len(papers)} queued={queued} skipped={skipped}')
    return len(papers), queued, skipped


def run_rss(
    seen_dois: set[str],
    seen_hashes: set[str],
) -> tuple[int, int, int]:
    """Discover papers from RSS feeds. Returns (found, queued, skipped)."""
    client = RSSClient()
    papers = client.fetch_all()
    queued = 0
    for paper in papers:
        if _queue_paper(paper, 'rss', seen_dois, seen_hashes):
            queued += 1
    skipped = len(papers) - queued
    logger.info(f'RSS: found={len(papers)} queued={queued} skipped={skipped}')
    return len(papers), queued, skipped


def main() -> None:
    parser = argparse.ArgumentParser(description='Motus paper researcher')
    parser.add_argument(
        '--source',
        default='all',
        choices=['all', 'pubmed', 'semantic_scholar', 'arxiv', 'rss'],
    )
    parser.add_argument('--days', type=int, default=1)
    parser.add_argument('--limit', type=int, default=0,
                        help='Max papers per source (0 = unlimited)')
    args = parser.parse_args()

    # Shared dedup state across all sources so cross-source duplicates are caught
    seen_dois: set[str] = set()
    seen_hashes: set[str] = set()
    totals: dict[str, tuple[int, int, int]] = {}

    if args.source in ('all', 'pubmed'):
        found, queued, skipped = run_pubmed(args.days, args.limit, seen_dois, seen_hashes)
        totals['PubMed'] = (found, queued, skipped)

    if args.source in ('all', 'semantic_scholar'):
        key = os.getenv('SEMANTIC_SCHOLAR_API_KEY', '').strip()
        if not key:
            logger.warning('Semantic Scholar key not set — skipping source')
            totals['Semantic Scholar'] = (-1, 0, 0)
        else:
            found, queued, skipped = run_semantic_scholar(seen_dois, seen_hashes)
            totals['Semantic Scholar'] = (found, queued, skipped)

    if args.source in ('all', 'arxiv'):
        found, queued, skipped = run_arxiv(seen_dois, seen_hashes)
        totals['arXiv'] = (found, queued, skipped)

    if args.source in ('all', 'rss'):
        found, queued, skipped = run_rss(seen_dois, seen_hashes)
        totals['RSS'] = (found, queued, skipped)

    total_queued = 0
    logger.info('=' * 50)
    logger.info('RESEARCHER REPORT')
    logger.info('=' * 50)
    for source, (found, queued, skipped) in totals.items():
        if found == -1:
            logger.info(f'{source:20s}: SKIPPED — no API key')
        else:
            logger.info(
                f'{source:20s}: found {found:4d} | queued {queued:4d} | skipped {skipped:4d}'
            )
            total_queued += queued
    logger.info(f'TOTAL queued: {total_queued}')
    logger.info('=' * 50)


if __name__ == '__main__':
    main()
