import os
import re
import time
from typing import Optional

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
    # MARTIAL ARTS
    'martial arts physiology performance training adaptation',
    'judo taekwondo combat sport physiology conditioning',
    'capoeira Brazilian jiu-jitsu physical fitness',
    # MIND-BODY
    'tai chi exercise balance cardiovascular aging longevity',
    'qigong health exercise intervention older adults',
    'mind body exercise movement health outcomes',
    # YOGA AND PILATES
    'yoga athletic performance flexibility injury prevention recovery',
    'pilates core stability athletic performance rehabilitation',
]


class SemanticScholarClient:
    def __init__(self) -> None:
        self.api_key: str = os.environ.get('SEMANTIC_SCHOLAR_API_KEY', '').strip()
        # With key: 100 req/min → 1.1s safe. Without key: 100 req/5min → 3s required.
        self.delay: float = 1.1 if self.api_key else 3.0

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
                'citation_count': item.get('citationCount'),
            }
        except Exception as e:
            logger.error(f'Semantic Scholar normalize error: {e}')
            return None

    def lookup_citation_count(self, paper: dict) -> Optional[int]:
        """
        Fetch citation count for a single paper via SS paper lookup API.
        Supports PubMed (DOI or PMID), arXiv (arXiv ID), and RSS (DOI).
        Returns None if the paper cannot be found or the request fails.
        """
        identifier = self._build_identifier(paper)
        if not identifier:
            return None
        try:
            resp = httpx.get(
                BASE_URL + f'paper/{identifier}',
                params={'fields': 'citationCount'},
                headers=self._get_headers(),
                timeout=15,
            )
            time.sleep(self.delay)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json().get('citationCount')
        except Exception as e:
            logger.warning(f'SS citation lookup failed for {identifier}: {e}')
            return None

    def _build_identifier(self, paper: dict) -> Optional[str]:
        """Build a Semantic Scholar paper identifier from available paper fields."""
        doi = paper.get('doi')
        if doi:
            return f'DOI:{doi}'
        source_name = paper.get('source_name', '')
        source_id = paper.get('source_id', '') or ''
        if source_name == 'pubmed' and source_id:
            return f'PMID:{source_id}'
        if source_name == 'arxiv' and source_id:
            # source_id is the full arXiv URL: http://arxiv.org/abs/2401.12345v2
            m = re.search(r'arxiv\.org/abs/([^v\s]+)', source_id, re.IGNORECASE)
            if m:
                return f'ARXIV:{m.group(1)}'
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
