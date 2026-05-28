import os
import time

import httpx
from dotenv import load_dotenv

from utils.logger import get_logger

load_dotenv()
logger = get_logger(__name__)

BASE_URL = 'https://api.semanticscholar.org/graph/v1/'
FIELDS = 'title,abstract,authors,publicationVenue,publicationDate,externalIds,isOpenAccess,citationCount'

SS_QUERIES = [
    # Running
    'marathon running performance physiology',
    'ultramarathon trail running physiology',
    'running economy biomechanics injury',
    # Cycling
    'road cycling power output aerobic capacity',
    'functional threshold power cyclists training',
    'cycling physiology performance endurance',
    # Rowing
    'rowing ergometer performance physiology',
    'on-water rowing biomechanics strength',
    # Skiing
    'cross-country skiing endurance physiology',
    'alpine ski touring performance physiology',
    # Hyrox / functional fitness
    'functional fitness concurrent training performance',
    'hybrid athlete strength endurance',
    # Cross-sport physiology (multi-taggable)
    'VO2max endurance athletes training adaptation',
    'lactate threshold aerobic performance sport',
    'HRV heart rate variability training load',
    'altitude hypoxia endurance adaptation',
    'periodization endurance training load',
    'sports nutrition endurance performance',
    'sleep recovery athletic performance',
    'strength training endurance sport',
    # Extended — female athletes, mental, triathlon
    'polarized training zone distribution intensity endurance',
    'female athlete physiology menstrual cycle performance',
    'triathlon multisport performance physiology',
    'mental fatigue endurance pacing strategy',
    'ketogenic low carbohydrate diet endurance athlete',
    'blood flow restriction training muscle adaptation',
    'mitochondrial biogenesis aerobic exercise training',
    'detraining retraining aerobic capacity endurance',
    'wearable technology training load monitoring athlete',
    'bone stress injury runner athlete load',
]


class SemanticScholarClient:
    def __init__(self) -> None:
        self.api_key: str = os.environ.get('SEMANTIC_SCHOLAR_API_KEY', '').strip()
        self.delay: float = 1.1

    def _check_key(self) -> bool:
        if not self.api_key:
            logger.warning('Semantic Scholar key not configured — skipping source')
            return False
        return True

    def _get_headers(self) -> dict:
        headers: dict = {}
        if self.api_key:
            headers['x-api-key'] = self.api_key
        return headers

    def search(self, query: str, max_results: int = 50) -> list[dict]:
        if not self._check_key():
            return []
        params = {
            'query': query,
            'limit': min(max_results, 100),
            'fields': FIELDS,
        }
        try:
            resp = httpx.get(
                BASE_URL + 'paper/search',
                params=params,
                headers=self._get_headers(),
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            papers = []
            for item in data.get('data', []):
                paper = self._normalize(item)
                if paper:
                    papers.append(paper)
            return papers
        except Exception as e:
            logger.error(f'Semantic Scholar search error: {e}')
            return []
        finally:
            time.sleep(self.delay)

    def _normalize(self, item: dict) -> dict | None:
        try:
            title = (item.get('title') or '').strip()
            if not title:
                return None
            doi = (item.get('externalIds') or {}).get('DOI')
            paper_id = item.get('paperId', '')
            venue = item.get('publicationVenue') or {}
            journal = venue.get('name')
            authors = [a.get('name', '') for a in (item.get('authors') or []) if a.get('name')]
            return {
                'title': title,
                'abstract': item.get('abstract'),
                'authors': authors,
                'journal': journal,
                'doi': doi,
                'source_id': paper_id,
                'source_name': 'semantic_scholar',
                'source_url': f'https://www.semanticscholar.org/paper/{paper_id}' if paper_id else None,
                'published_at': item.get('publicationDate'),
            }
        except Exception as e:
            logger.error(f'Semantic Scholar normalize error: {e}')
            return None

    def search_all_queries(self) -> list[dict]:
        if not self._check_key():
            return []
        seen_dois: set[str] = set()
        results: list[dict] = []
        for query in SS_QUERIES:
            papers = self.search(query)
            for paper in papers:
                doi = paper.get('doi')
                if doi and doi in seen_dois:
                    continue
                if doi:
                    seen_dois.add(doi)
                results.append(paper)
        logger.info(f'Semantic Scholar complete: {len(results)} unique papers')
        return results
