import time
from types import SimpleNamespace

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
