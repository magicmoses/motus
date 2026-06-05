from datetime import date
from unittest.mock import patch

import pytest

from pipeline.normalizer import (
    ABSTRACT_MIN_WORDS,
    CUTOFF_DATE,
    _normalize_paper,
    _parse_date,
    _validate,
    title_hash,
    word_count,
)


def _make_paper(**overrides) -> dict:
    base = {
        'title': 'Effect of interval training on VO2max in trained cyclists',
        'abstract': ' '.join(['word'] * ABSTRACT_MIN_WORDS),
        'doi': '10.1234/test.2022.001',
        'source_url': 'https://example.com/paper',
        'published_at': '2022-06-15',
        'authors': ['Smith J', 'Jones A'],
        'journal': 'Journal of Sports Science',
        'source_id': 'abc123',
        'source_name': 'pubmed',
    }
    base.update(overrides)
    return base


class TestWordCount:
    def test_empty_string(self):
        assert word_count('') == 0

    def test_none_like(self):
        assert word_count('') == 0

    def test_counts_correctly(self):
        assert word_count('one two three') == 3

    def test_leading_trailing_spaces(self):
        assert word_count('  a b c  ') == 3


class TestParseDate:
    def test_valid_iso(self):
        assert _parse_date('2022-06-15') == date(2022, 6, 15)

    def test_none_returns_none(self):
        assert _parse_date(None) is None

    def test_empty_string(self):
        assert _parse_date('') is None

    def test_invalid_format(self):
        assert _parse_date('not-a-date') is None

    def test_truncates_to_10_chars(self):
        assert _parse_date('2022-06-15T12:00:00') == date(2022, 6, 15)


class TestValidate:
    @patch('pipeline.normalizer.queries.paper_exists_by_doi', return_value=False)
    @patch('pipeline.normalizer.queries.paper_exists_by_title_hash', return_value=False)
    def test_valid_paper_accepted(self, mock_hash, mock_doi):
        valid, reason = _validate(_make_paper())
        assert valid is True
        assert reason == ''

    @patch('pipeline.normalizer.queries.paper_exists_by_doi', return_value=False)
    @patch('pipeline.normalizer.queries.paper_exists_by_title_hash', return_value=False)
    def test_missing_abstract(self, mock_hash, mock_doi):
        valid, reason = _validate(_make_paper(abstract=''))
        assert valid is False
        assert 'abstract' in reason

    @patch('pipeline.normalizer.queries.paper_exists_by_doi', return_value=False)
    @patch('pipeline.normalizer.queries.paper_exists_by_title_hash', return_value=False)
    def test_short_abstract(self, mock_hash, mock_doi):
        valid, reason = _validate(_make_paper(abstract='too short'))
        assert valid is False
        assert 'abstract' in reason

    @patch('pipeline.normalizer.queries.paper_exists_by_doi', return_value=False)
    @patch('pipeline.normalizer.queries.paper_exists_by_title_hash', return_value=False)
    def test_no_doi_and_no_source_url(self, mock_hash, mock_doi):
        valid, reason = _validate(_make_paper(doi=None, source_url=None))
        assert valid is False
        assert 'identifier' in reason

    @patch('pipeline.normalizer.queries.paper_exists_by_doi', return_value=False)
    @patch('pipeline.normalizer.queries.paper_exists_by_title_hash', return_value=False)
    def test_paper_too_old(self, mock_hash, mock_doi):
        valid, reason = _validate(_make_paper(published_at='2015-01-01'))
        assert valid is False
        assert 'old' in reason

    @patch('pipeline.normalizer.queries.paper_exists_by_doi', return_value=True)
    @patch('pipeline.normalizer.queries.paper_exists_by_title_hash', return_value=False)
    def test_duplicate_doi(self, mock_hash, mock_doi):
        valid, reason = _validate(_make_paper())
        assert valid is False
        assert 'duplicate' in reason.lower()

    @patch('pipeline.normalizer.queries.paper_exists_by_doi', return_value=False)
    @patch('pipeline.normalizer.queries.paper_exists_by_title_hash', return_value=False)
    def test_no_doi_but_source_url_ok(self, mock_hash, mock_doi):
        valid, reason = _validate(_make_paper(doi=None))
        assert valid is True

    @patch('pipeline.normalizer.queries.paper_exists_by_doi', return_value=False)
    @patch('pipeline.normalizer.queries.paper_exists_by_title_hash', return_value=False)
    def test_on_cutoff_date_accepted(self, mock_hash, mock_doi):
        cutoff_str = CUTOFF_DATE.isoformat()
        valid, _ = _validate(_make_paper(published_at=cutoff_str))
        assert valid is True

    @patch('pipeline.normalizer.queries.paper_exists_by_doi', return_value=False)
    @patch('pipeline.normalizer.queries.paper_exists_by_title_hash', return_value=False)
    def test_missing_published_at_accepted(self, mock_hash, mock_doi):
        valid, reason = _validate(_make_paper(published_at=None))
        assert valid is True


class TestNormalizePaper:
    def test_projects_expected_keys(self):
        paper = _make_paper()
        result = _normalize_paper(paper)
        expected_keys = {'doi', 'title', 'abstract', 'authors', 'journal',
                         'source_url', 'source_id', 'source_name', 'published_at',
                         'citation_count'}
        assert set(result.keys()) == expected_keys

    def test_date_truncated_to_10_chars(self):
        paper = _make_paper(published_at='2022-06-15T12:00:00Z')
        result = _normalize_paper(paper)
        assert result['published_at'] == '2022-06-15'

    def test_missing_published_at_is_none(self):
        paper = _make_paper(published_at=None)
        result = _normalize_paper(paper)
        assert result['published_at'] is None

    def test_authors_defaults_to_empty_list(self):
        paper = _make_paper(authors=None)
        result = _normalize_paper(paper)
        assert result['authors'] == []

    def test_extra_fields_stripped(self):
        paper = _make_paper()
        paper['internal_queue_id'] = 'should-not-appear'
        result = _normalize_paper(paper)
        assert 'internal_queue_id' not in result


class TestTitleHash:
    def test_case_insensitive(self):
        assert title_hash('Hello World') == title_hash('hello world')

    def test_strips_whitespace(self):
        assert title_hash('  hello  ') == title_hash('hello')

    def test_different_titles(self):
        assert title_hash('Title A') != title_hash('Title B')
