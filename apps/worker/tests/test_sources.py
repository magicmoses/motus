import time
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from sources.pubmed_client import DATE_FILTER, PubMedClient
from sources.rss_client import _entry_date


class TestRssEntryDate:
    def test_rfc822_pubdate_converted_to_iso(self):
        entry = SimpleNamespace(
            published='Mon, 09 Jun 2026 10:00:00 GMT',
            published_parsed=time.strptime('2026-06-09', '%Y-%m-%d'),
        )
        assert _entry_date(entry) == '2026-06-09'

    def test_missing_pubdate_is_none(self):
        assert _entry_date(SimpleNamespace()) is None

    def test_unparsed_pubdate_is_none(self):
        # feedparser sets published_parsed=None when it can't parse the date
        entry = SimpleNamespace(published='garbage', published_parsed=None)
        assert _entry_date(entry) is None


class TestPubMedSearchWindow:
    def _search(self, days_back):
        client = PubMedClient()
        client.delay = 0  # no rate-limit sleep in tests
        response = MagicMock()
        response.json.return_value = {'esearchresult': {'idlist': ['1', '2']}}
        with patch('sources.pubmed_client.httpx.get', return_value=response) as get:
            ids = client.search('"running economy"[TIAB]', days_back=days_back)
        assert ids == ['1', '2']
        return get.call_args.kwargs['params']

    def test_daily_window_uses_reldate_on_entrez_date(self):
        params = self._search(days_back=3)
        assert params['reldate'] == 3
        assert params['datetype'] == 'edat'
        assert DATE_FILTER in params['term']

    def test_all_time_search_has_no_window(self):
        params = self._search(days_back=0)
        assert 'reldate' not in params
        assert 'datetype' not in params
        assert DATE_FILTER not in params['term']
