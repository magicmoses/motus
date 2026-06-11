"""
Pipeline stage: fetch citation counts for PubMed/arXiv/RSS papers via SS API.

Semantic Scholar can look up any paper by DOI, PMID, or arXiv ID.
This fills in citation_count for papers that didn't come through the SS
search client (where citationCount is returned inline with the search result).

Runs after Writer/Tagger — citation count is not needed for enrichment,
only for future relevance scoring.
"""
import argparse

from utils.env import load_env

load_env()

from db import queries
from sources.semantic_scholar_client import SemanticScholarClient
from utils.logger import get_logger

logger = get_logger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description='Fetch citation counts for non-SS papers')
    parser.add_argument('--limit', type=int, default=100,
                        help='Max papers to update per run')
    args = parser.parse_args()

    client = SemanticScholarClient()
    papers = queries.get_papers_missing_citation_count(limit=args.limit)
    logger.info(f'CitationUpdater: {len(papers)} papers missing citation_count')

    updated = 0
    not_found = 0

    for paper in papers:
        count = client.lookup_citation_count(paper)
        if count is not None:
            queries.update_paper_citation_count(paper['id'], count)
            updated += 1
        else:
            not_found += 1

    logger.info(f'CitationUpdater complete: updated={updated} not_found={not_found}')


if __name__ == '__main__':
    main()
