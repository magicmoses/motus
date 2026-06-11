import os
import time
from xml.etree import ElementTree as ET

import httpx
from dotenv import load_dotenv

from utils.logger import get_logger

load_dotenv()
logger = get_logger(__name__)

BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/'
DATE_FILTER = '("2018/01/01"[PDAT] : "3000"[PDAT])'

ENDURANCE_QUERIES = [
    # RUNNING (10)
    '"endurance running"[TIAB]',
    '"distance running"[TIAB]',
    '"marathon running"[TIAB]',
    '"ultramarathon"[TIAB]',
    '"trail running"[TIAB]',
    '"running economy"[TIAB]',
    '"running biomechanics"[TIAB]',
    '"sprint performance"[TIAB] AND "running"[TIAB]',
    '"5K performance"[TIAB] OR "10K performance"[TIAB]',
    '"half marathon"[TIAB] AND "performance"[TIAB]',
    # CYCLING (7)
    '"endurance cycling"[TIAB]',
    '"road cycling"[TIAB] AND "performance"[TIAB]',
    '"cycling power output"[TIAB]',
    '"track cycling"[TIAB] AND "physiology"[TIAB]',
    '"gravel cycling"[TIAB]',
    '"ultra cycling"[TIAB]',
    '"cyclist physiology"[TIAB]',
    # ROWING (5)
    '"rowing performance"[TIAB]',
    '"ergometer rowing"[TIAB]',
    '"indoor rowing"[TIAB]',
    '"rowing biomechanics"[TIAB]',
    '"sculling"[TIAB] AND "physiology"[TIAB]',
    # SKIING (5)
    '"cross-country skiing"[TIAB]',
    '"alpine skiing"[TIAB] AND "physiology"[TIAB]',
    '"ski touring"[TIAB]',
    '"biathlon"[TIAB] AND "performance"[TIAB]',
    '"nordic skiing"[TIAB] AND "endurance"[TIAB]',
    # HYROX / FUNCTIONAL (5)
    '"functional fitness"[TIAB]',
    '"obstacle race"[TIAB]',
    '"concurrent training"[TIAB]',
    '"hybrid athlete"[TIAB]',
    '"functional threshold"[TIAB]',
    # PHYSIOLOGY cross-sport (8) — tagger will assign multiple sports
    '"maximal oxygen uptake"[TIAB]',
    '"VO2max"[TIAB] AND "endurance"[TIAB]',
    '"lactate threshold"[TIAB]',
    '"heart rate variability"[TIAB] AND "exercise"[TIAB]',
    '"cardiac output"[TIAB] AND "exercise"[TIAB]',
    '"altitude training"[TIAB]',
    '"heat acclimatization"[TIAB] AND "exercise"[TIAB]',
    '"anaerobic threshold"[TIAB]',
    # TRAINING (7)
    '"periodization"[TIAB] AND "endurance"[TIAB]',
    '"high intensity interval training"[TIAB]',
    '"HIIT"[TIAB] AND "endurance"[TIAB]',
    '"strength training"[TIAB] AND "endurance"[TIAB]',
    '"training load"[TIAB] AND "endurance"[TIAB]',
    '"taper"[TIAB] AND "endurance"[TIAB]',
    '"overtraining"[TIAB] OR "RED-S"[TIAB]',
    # RECOVERY (7)
    '"exercise recovery"[TIAB]',
    '"sleep"[TIAB] AND "athletic performance"[TIAB]',
    '"sleep quality"[TIAB] AND "athlete"[TIAB]',
    '"HRV-guided training"[TIAB]',
    '"cold water immersion"[TIAB] AND "exercise"[TIAB]',
    '"compression garment"[TIAB] AND "recovery"[TIAB]',
    '"sauna"[TIAB] AND "exercise recovery"[TIAB]',
    # NUTRITION (9)
    '"endurance nutrition"[TIAB]',
    '"carbohydrate loading"[TIAB]',
    '"sports nutrition"[TIAB] AND "endurance"[TIAB]',
    '"protein intake"[TIAB] AND "endurance"[TIAB]',
    '"hydration"[TIAB] AND "exercise performance"[TIAB]',
    '"caffeine"[TIAB] AND "endurance"[TIAB]',
    '"beta-alanine"[TIAB] AND "performance"[TIAB]',
    '"nitrate supplementation"[TIAB]',
    '"gastrointestinal"[TIAB] AND "endurance"[TIAB]',
    # INJURY — running (5)
    '"achilles tendinopathy"[TIAB]',
    '"running injury"[TIAB]',
    '"iliotibial band"[TIAB]',
    '"plantar fasciitis"[TIAB]',
    '"patellofemoral pain"[TIAB]',
    # INJURY — cycling (3)
    '"knee pain"[TIAB] AND "cycling"[TIAB]',
    '"lower back pain"[TIAB] AND "cyclist"[TIAB]',
    '"cyclist overuse injury"[TIAB]',
    # INJURY — rowing (2)
    '"low back pain"[TIAB] AND "rowing"[TIAB]',
    '"rowing injury"[TIAB]',
    # INJURY — cross-sport (3)
    '"stress fracture"[TIAB] AND "athlete"[TIAB]',
    '"injury prevention"[TIAB] AND "endurance"[TIAB]',
    '"load management"[TIAB] AND "injury"[TIAB]',
    # FEMALE ATHLETES (4)
    '"female athlete"[TIAB] AND "performance"[TIAB]',
    '"menstrual cycle"[TIAB] AND "exercise performance"[TIAB]',
    '"relative energy deficiency in sport"[TIAB]',
    '"female endurance"[TIAB]',
    # PHYSIOLOGY DEEP (5)
    '"mitochondrial adaptation"[TIAB] AND "exercise"[TIAB]',
    '"muscle fiber type"[TIAB] AND "endurance"[TIAB]',
    '"blood flow restriction"[TIAB] AND "training"[TIAB]',
    '"respiratory muscle training"[TIAB]',
    '"bone stress injury"[TIAB] AND "runner"[TIAB]',
    # TRAINING METHODS (4)
    '"polarized training"[TIAB]',
    '"zone 2 training"[TIAB]',
    '"detraining"[TIAB] AND "endurance"[TIAB]',
    '"heat training"[TIAB] AND "endurance"[TIAB]',
    # RECOVERY EXTENDED (3)
    '"napping"[TIAB] AND "athletic performance"[TIAB]',
    '"foam rolling"[TIAB] AND "performance"[TIAB]',
    '"massage"[TIAB] AND "exercise recovery"[TIAB]',
    # NUTRITION EXTENDED (5)
    '"ketogenic diet"[TIAB] AND "endurance"[TIAB]',
    '"sodium bicarbonate"[TIAB] AND "exercise performance"[TIAB]',
    '"iron deficiency"[TIAB] AND "athlete"[TIAB]',
    '"antioxidant"[TIAB] AND "endurance performance"[TIAB]',
    '"creatine"[TIAB] AND "endurance"[TIAB]',
    # TRIATHLON / MULTISPORT (3)
    '"triathlon"[TIAB] AND "physiology"[TIAB]',
    '"ironman triathlon"[TIAB]',
    '"duathlon"[TIAB] AND "performance"[TIAB]',
    # MENTAL PERFORMANCE (3)
    '"mental fatigue"[TIAB] AND "endurance"[TIAB]',
    '"pacing strategy"[TIAB] AND "endurance"[TIAB]',
    '"psychological"[TIAB] AND "endurance performance"[TIAB]',
    # MARTIAL ARTS (6)
    '"martial arts"[TIAB] AND ("physiology" OR "performance" OR "fitness" OR "training adaptation")[TIAB]',
    '"judo"[TIAB] AND ("physiology" OR "performance" OR "training")[TIAB]',
    '"taekwondo"[TIAB] AND ("physiology" OR "performance" OR "training")[TIAB]',
    '"Brazilian jiu-jitsu"[TIAB] AND ("physiology" OR "conditioning")[TIAB]',
    '"capoeira"[TIAB]',
    '"wushu"[TIAB] OR "kung fu"[TIAB] AND "exercise"[TIAB]',
    # MIND-BODY (5)
    '"tai chi"[TIAB] AND ("exercise" OR "balance" OR "cardiovascular" OR "longevity" OR "aging")[TIAB]',
    '"qigong"[TIAB] AND ("exercise" OR "health" OR "performance" OR "rehabilitation")[TIAB]',
    '"mind-body exercise"[TIAB]',
    '"tai chi"[TIAB] AND "older adults"[TIAB]',
    '"qigong"[TIAB] AND "older adults"[TIAB]',
    # YOGA AND PILATES (5)
    '"yoga"[TIAB] AND ("athletic performance" OR "endurance" OR "flexibility" OR "injury prevention")[TIAB]',
    '"yoga"[TIAB] AND ("recovery" OR "muscle" OR "fatigue")[TIAB]',
    '"pilates"[TIAB] AND ("core strength" OR "athletic" OR "performance" OR "rehabilitation")[TIAB]',
    '"hot yoga"[TIAB] OR "bikram yoga"[TIAB]',
    '"yoga"[TIAB] AND "randomized"[TIAB] AND "exercise"[TIAB]',
]
# Total: 123 queries


class PubMedClient:
    def __init__(self) -> None:
        self.api_key: str = os.environ.get('PUBMED_API_KEY', '')
        self.delay: float = 0.1 if self.api_key else 0.35

    def _get(self, endpoint: str, params: dict) -> httpx.Response:
        if self.api_key:
            params['api_key'] = self.api_key
        url = BASE_URL + endpoint
        response = httpx.get(url, params=params, timeout=30)
        response.raise_for_status()
        time.sleep(self.delay)
        return response

    def search(self, query: str, days_back: int = 7, max_results: int = 50) -> list[str]:
        """days_back > 0 restricts results to records added to PubMed within
        the last N days (reldate on the Entrez date); days_back <= 0 searches
        all-time. Without reldate every 'daily' run re-searched 2018→now."""
        full_query = f'({query}) AND {DATE_FILTER}' if days_back > 0 else query
        params = {
            'db': 'pubmed',
            'term': full_query,
            'retmax': max_results,
            'retmode': 'json',
        }
        if days_back > 0:
            params['reldate'] = days_back
            params['datetype'] = 'edat'
        try:
            resp = self._get('esearch.fcgi', params)
            data = resp.json()
            return data['esearchresult']['idlist']
        except Exception as e:
            logger.error(f'PubMed search error for query "{query[:50]}": {e}')
            return []

    def fetch_details(self, pmids: list[str]) -> list[dict]:
        if not pmids:
            return []
        # Batch up to 200 per request
        results: list[dict] = []
        for i in range(0, len(pmids), 200):
            batch = pmids[i:i + 200]
            params = {
                'db': 'pubmed',
                'id': ','.join(batch),
                'retmode': 'xml',
            }
            try:
                resp = self._get('efetch.fcgi', params)
                root = ET.fromstring(resp.content)
                for record in root.findall('.//PubmedArticle'):
                    paper = self._parse_record(record)
                    if paper:
                        results.append(paper)
            except Exception as e:
                logger.error(f'PubMed efetch error for batch starting {batch[0]}: {e}')
        return results

    def _parse_record(self, record: ET.Element) -> dict | None:
        try:
            mc = record.find('MedlineCitation')
            if mc is None:
                return None
            art = mc.find('Article')
            if art is None:
                return None

            title = art.findtext('ArticleTitle') or ''
            title = title.strip()

            abstract_parts = art.findall('.//AbstractText')
            abstract = ' '.join(
                (t.text or '') for t in abstract_parts if t.text
            ).strip()

            authors: list[str] = []
            for author in art.findall('.//Author'):
                last = author.findtext('LastName') or ''
                fore = author.findtext('ForeName') or ''
                if last:
                    authors.append(f'{last} {fore}'.strip())

            journal = art.findtext('.//Journal/Title') or ''

            pub_date = art.find('.//PubDate')
            year = pub_date.findtext('Year') if pub_date is not None else None
            month = pub_date.findtext('Month') if pub_date is not None else '01'
            day = pub_date.findtext('Day') if pub_date is not None else '01'
            published_at: str | None = None
            if year:
                month_map = {
                    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
                }
                month_num = month_map.get(month, month) if month and not month.isdigit() else (month or '01').zfill(2)
                day_num = (day or '01').zfill(2)
                published_at = f'{year}-{month_num}-{day_num}'

            pmid = mc.findtext('PMID') or ''
            doi: str | None = None
            for aid in record.findall('.//ArticleId'):
                if aid.get('IdType') == 'doi' and aid.text:
                    doi = aid.text.strip()
                    break

            if not title:
                return None

            return {
                'title': title,
                'abstract': abstract or None,
                'authors': authors,
                'journal': journal or None,
                'doi': doi,
                'source_id': pmid,
                'source_name': 'pubmed',
                'source_url': f'https://pubmed.ncbi.nlm.nih.gov/{pmid}/' if pmid else None,
                'published_at': published_at,
            }
        except Exception as e:
            logger.error(f'PubMed parse error: {e}')
            return None

    def search_all_queries(self, days_back: int = 1) -> list[dict]:
        seen_dois: set[str] = set()
        seen_pmids: set[str] = set()
        results: list[dict] = []

        for query in ENDURANCE_QUERIES:
            pmids = self.search(query, days_back=days_back)
            new_pmids = [p for p in pmids if p not in seen_pmids]
            seen_pmids.update(new_pmids)

            if not new_pmids:
                continue

            papers = self.fetch_details(new_pmids)
            for paper in papers:
                doi = paper.get('doi')
                if doi and doi in seen_dois:
                    continue
                if doi:
                    seen_dois.add(doi)
                results.append(paper)

        logger.info(f'PubMed search_all_queries complete: {len(results)} unique papers')
        return results
