import time
from typing import Optional

import httpx
from dotenv import load_dotenv

from utils.http import get_with_retry
from utils.logger import get_logger

load_dotenv()
logger = get_logger(__name__)

BASE_URL = 'https://api.crossref.org/works/'
HEADERS = {'User-Agent': 'Motus/1.0 (mailto:motus@placeholder.com)'}


class CrossrefClient:
    def __init__(self) -> None:
        self.delay: float = 0.5

    def lookup_doi(self, doi: str) -> Optional[dict]:
        try:
            resp = get_with_retry(BASE_URL + doi, headers=HEADERS, timeout=30)
            time.sleep(self.delay)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            msg = resp.json().get('message', {})

            title_list = msg.get('title', [])
            title = title_list[0] if title_list else None
            if not title:
                return None

            authors = []
            for a in msg.get('author', []):
                given = a.get('given', '')
                family = a.get('family', '')
                name = f'{family} {given}'.strip() if family else given
                if name:
                    authors.append(name)

            journal_list = msg.get('container-title', [])
            journal = journal_list[0] if journal_list else None

            pub = msg.get('published', {})
            parts = pub.get('date-parts', [[]])[0]
            published_at: str | None = None
            if parts and len(parts) >= 1:
                year = parts[0]
                month = parts[1] if len(parts) > 1 else 1
                day = parts[2] if len(parts) > 2 else 1
                published_at = f'{year}-{str(month).zfill(2)}-{str(day).zfill(2)}'

            return {
                'title': title,
                'abstract': msg.get('abstract'),
                'authors': authors,
                'journal': journal,
                'doi': msg.get('DOI'),
                'source_id': msg.get('DOI'),
                'source_name': 'rss',
                'source_url': None,
                'published_at': published_at,
            }
        except httpx.HTTPError as e:
            logger.warning(f'Crossref lookup failed for DOI {doi}: {e}')
            return None
        except Exception as e:
            logger.error(f'Crossref unexpected error for DOI {doi}: {e}')
            return None
