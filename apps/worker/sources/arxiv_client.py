import time
from xml.etree import ElementTree as ET

import httpx
from dotenv import load_dotenv

from utils.logger import get_logger

load_dotenv()
logger = get_logger(__name__)

BASE_URL = 'https://export.arxiv.org/api/query'
ATOM_NS = 'http://www.w3.org/2005/Atom'

ARXIV_QUERIES = [
    # Cross-sport physiology — will be multi-tagged by tagger
    'all:VO2max endurance training adaptation',
    'all:lactate threshold aerobic capacity athlete',
    'all:HRV heart rate variability training load',
    'all:altitude hypoxia endurance performance',
    'all:sports nutrition endurance performance',
    'all:periodization high intensity interval training endurance',
    'all:strength training endurance athlete',
    # Sport-specific
    'all:running biomechanics economy performance',
    'all:marathon ultramarathon trail running physiology',
    'all:cycling power output aerobic performance',
    'all:rowing ergometer physiology performance',
    'all:cross-country skiing endurance physiology',
]


class ArXivClient:
    def __init__(self) -> None:
        self.delay: float = 0.5

    def search(self, query: str, max_results: int = 25) -> list[dict]:
        params = {'search_query': query, 'max_results': max_results}
        try:
            resp = httpx.get(BASE_URL, params=params, timeout=30, follow_redirects=True)
            resp.raise_for_status()
            time.sleep(self.delay)
            root = ET.fromstring(resp.content)
            results = []
            for entry in root.findall(f'{{{ATOM_NS}}}entry'):
                paper = self._parse_entry(entry)
                if paper:
                    results.append(paper)
            return results
        except Exception as e:
            logger.error(f'arXiv search error for query "{query[:40]}": {e}')
            return []

    def _parse_entry(self, entry: ET.Element) -> dict | None:
        try:
            def t(tag: str) -> str | None:
                el = entry.find(f'{{{ATOM_NS}}}{tag}')
                return el.text.strip() if el is not None and el.text else None

            title = t('title')
            if not title:
                return None
            title = ' '.join(title.split())  # collapse whitespace/newlines

            summary = t('summary')
            published = t('published')
            entry_id = t('id')

            authors = []
            for author in entry.findall(f'{{{ATOM_NS}}}author'):
                name_el = author.find(f'{{{ATOM_NS}}}name')
                if name_el is not None and name_el.text:
                    authors.append(name_el.text.strip())

            return {
                'title': title,
                'abstract': summary,
                'authors': authors,
                'journal': 'arXiv',
                'doi': None,
                'source_id': entry_id,
                'source_name': 'arxiv',
                'source_url': entry_id,
                'published_at': published[:10] if published else None,
            }
        except Exception as e:
            logger.error(f'arXiv parse error: {e}')
            return None

    def search_all_queries(self) -> list[dict]:
        seen_ids: set[str] = set()
        results: list[dict] = []
        for query in ARXIV_QUERIES:
            papers = self.search(query)
            for paper in papers:
                sid = paper.get('source_id', '')
                if sid and sid in seen_ids:
                    continue
                if sid:
                    seen_ids.add(sid)
                results.append(paper)
        logger.info(f'arXiv complete: {len(results)} unique papers')
        return results
