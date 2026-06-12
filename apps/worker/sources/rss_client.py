import re
import time
from typing import Optional

import feedparser
from dotenv import load_dotenv

from sources.crossref_client import CrossrefClient
from utils.logger import get_logger

load_dotenv()
logger = get_logger(__name__)

RSS_FEEDS = [
    # Tier 1 — high-impact sports science journals
    'https://bjsm.bmj.com/rss/current.xml',                                                    # BJSM
    'https://journals.physiology.org/action/showFeed?type=etoc&feed=rss&jc=jappl',             # JAP
    'https://journals.humankinetics.com/rss/journals/ijsnem',                                   # IJSNEM
    'https://journals.humankinetics.com/rss/journals/ijspp',                                    # IJSPP
    'https://link.springer.com/search.rss?query=endurance+exercise&facet-journal-id=40279',    # Sports Medicine
    'https://www.frontiersin.org/journals/physiology/rss',                                       # Frontiers Physiology
    # Tier 2 — additional coverage
    'https://journals.lww.com/acsm-msse/rss',                                                   # MSSE (LWW)
    'https://onlinelibrary.wiley.com/action/showFeed?jc=1600-0838&type=etoc&feed=rss',         # SJMSS (Wiley)
    # Disabled — verify URL before enabling
    # 'https://link.springer.com/search.rss?query=&facet-journal-id=421',                      # EJAP (need to confirm journal ID)
    # 'https://link.springer.com/search.rss?query=&facet-journal-id=40798',                    # Sports Medicine Open (need to confirm)
    # 'https://www.tandfonline.com/action/showFeed?type=etoc&feed=rss&jc=tejs20',              # EJSS — returned 0 entries, disabled
]

DOI_PATTERN = re.compile(r'10\.\d{4,}/[^\s"<>?#]+')


def _entry_date(entry) -> Optional[str]:
    """RSS pubDates are RFC-822 ('Mon, 09 Jun 2026 …'). Use feedparser's
    parsed struct_time and emit the ISO date the normalizer expects."""
    parsed = getattr(entry, 'published_parsed', None)
    if not parsed:
        return None
    return time.strftime('%Y-%m-%d', parsed)


class RSSClient:
    def __init__(self) -> None:
        self.crossref = CrossrefClient()

    def fetch_all(self) -> list[dict]:
        results: list[dict] = []
        for feed_url in RSS_FEEDS:
            try:
                entries = self._fetch_feed(feed_url)
                results.extend(entries)
                logger.info(f'RSS fetched {len(entries)} entries from {feed_url[:60]}')
            except Exception as e:
                logger.error(f'RSS feed error for {feed_url[:60]}: {e}')
        return results

    def _fetch_feed(self, url: str) -> list[dict]:
        feed = feedparser.parse(url)
        results = []
        for entry in feed.entries:
            link = getattr(entry, 'link', '') or ''

            # Extract DOI from multiple possible locations in feed metadata
            doi = (
                self._extract_doi(link)
                or self._extract_doi(getattr(entry, 'id', '') or '')
                or getattr(entry, 'prism_doi', None)
                or getattr(entry, 'dc_identifier', None)
            )
            if doi:
                doi = doi.strip()

            # Try Crossref for full metadata (abstract, authors, journal)
            if doi:
                enriched = self.crossref.lookup_doi(doi)
                if enriched:
                    enriched['source_url'] = link
                    enriched['source_name'] = 'rss'
                    results.append(enriched)
                    continue

            # Fallback: build record from feed entry directly.
            # feedparser extracts abstract as entry.summary — use it.
            title = getattr(entry, 'title', '') or ''
            if not title:
                continue

            abstract = getattr(entry, 'summary', None) or getattr(entry, 'description', None)
            # Strip HTML tags from abstract if present
            if abstract:
                abstract = re.sub(r'<[^>]+>', ' ', abstract).strip()
                abstract = re.sub(r'\s+', ' ', abstract)

            authors = []
            for a in getattr(entry, 'authors', []):
                name = a.get('name', '')
                if name:
                    authors.append(name)

            results.append({
                'title': title,
                'abstract': abstract or None,
                'authors': authors,
                'journal': getattr(feed.feed, 'title', None),
                'doi': doi,
                'source_id': doi,
                'source_name': 'rss',
                'source_url': link,
                'published_at': _entry_date(entry),
            })
        return results

    def _extract_doi(self, url: str) -> Optional[str]:
        m = DOI_PATTERN.search(url)
        if not m:
            return None
        return m.group().rstrip('.,;)')
