"""
Characterization tests for pipeline/researcher.py.

These pin the CURRENT observable behavior (dedup decisions, queue side effects,
per-source accounting, source routing) so refactors can be verified identical.
No network: source clients and db queries are mocked.
"""
from unittest.mock import MagicMock, patch

import pytest

from pipeline import researcher
from pipeline.researcher import _is_duplicate, _queue_paper, title_hash


def _paper(i: int = 0, prefix: str = 'p', doi: bool = True) -> dict:
    return {
        'title': f'{prefix} paper {i}',
        'doi': f'10.1000/{prefix}.{i}' if doi else None,
        'source_id': f'{prefix}-{i}',
    }


_NO_DB_HIT = {
    'paper_exists_by_doi': False,
    'paper_exists_in_queue': False,
    'paper_exists_by_source_id': False,
    'paper_exists_in_queue_by_source_id': False,
}


def _patch_queries(**overrides):
    """Patch all dedup query functions on the researcher's queries module."""
    values = {**_NO_DB_HIT, **overrides}
    mocks = {}
    patchers = []
    for name, ret in values.items():
        p = patch(f'pipeline.researcher.queries.{name}', return_value=ret)
        mocks[name] = p
        patchers.append(p)
    return patchers


class TestTitleHash:
    def test_case_insensitive(self):
        assert title_hash('Hello World') == title_hash('hello world')

    def test_strips_whitespace(self):
        assert title_hash('  hello  ') == title_hash('hello')

    def test_different_titles(self):
        assert title_hash('Title A') != title_hash('Title B')


class TestIsDuplicate:
    def test_doi_in_seen_set_no_db_call(self):
        paper = _paper()
        with patch('pipeline.researcher.queries.paper_exists_by_doi') as db:
            assert _is_duplicate(paper, {paper['doi']}, set()) is True
            db.assert_not_called()

    def test_title_hash_in_seen_set_no_db_call(self):
        paper = _paper()
        seen_hashes = {title_hash(paper['title'])}
        with patch('pipeline.researcher.queries.paper_exists_by_doi') as db:
            assert _is_duplicate(paper, set(), seen_hashes) is True
            db.assert_not_called()

    def test_doi_exists_in_papers_table(self):
        paper = _paper()
        with patch('pipeline.researcher.queries.paper_exists_by_doi', return_value=True):
            assert _is_duplicate(paper, set(), set()) is True

    def test_doi_exists_in_queue(self):
        paper = _paper()
        with patch('pipeline.researcher.queries.paper_exists_by_doi', return_value=False), \
             patch('pipeline.researcher.queries.paper_exists_in_queue', return_value=True):
            assert _is_duplicate(paper, set(), set()) is True

    def test_fresh_doi_paper_not_duplicate(self):
        paper = _paper()
        with patch('pipeline.researcher.queries.paper_exists_by_doi', return_value=False), \
             patch('pipeline.researcher.queries.paper_exists_in_queue', return_value=False):
            assert _is_duplicate(paper, set(), set()) is False

    def test_no_doi_falls_back_to_source_id_papers(self):
        paper = _paper(doi=False)
        with patch('pipeline.researcher.queries.paper_exists_by_source_id', return_value=True):
            assert _is_duplicate(paper, set(), set()) is True

    def test_no_doi_falls_back_to_source_id_queue(self):
        paper = _paper(doi=False)
        with patch('pipeline.researcher.queries.paper_exists_by_source_id', return_value=False), \
             patch('pipeline.researcher.queries.paper_exists_in_queue_by_source_id', return_value=True):
            assert _is_duplicate(paper, set(), set()) is True

    def test_no_doi_fresh_source_id_not_duplicate(self):
        paper = _paper(doi=False)
        with patch('pipeline.researcher.queries.paper_exists_by_source_id', return_value=False), \
             patch('pipeline.researcher.queries.paper_exists_in_queue_by_source_id', return_value=False):
            assert _is_duplicate(paper, set(), set()) is False

    def test_no_doi_no_source_id_not_duplicate_no_db_call(self):
        paper = {'title': 'orphan paper', 'doi': None, 'source_id': None}
        with patch('pipeline.researcher.queries.paper_exists_by_doi') as db_doi, \
             patch('pipeline.researcher.queries.paper_exists_by_source_id') as db_sid:
            assert _is_duplicate(paper, set(), set()) is False
            db_doi.assert_not_called()
            db_sid.assert_not_called()


class TestQueuePaper:
    def test_queues_new_paper_and_updates_seen_sets(self):
        paper = _paper()
        seen_dois: set = set()
        seen_hashes: set = set()
        with patch('pipeline.researcher.queries.paper_exists_by_doi', return_value=False), \
             patch('pipeline.researcher.queries.paper_exists_in_queue', return_value=False), \
             patch('pipeline.researcher.queries.insert_to_queue') as insert:
            assert _queue_paper(paper, 'pubmed', seen_dois, seen_hashes) is True
            insert.assert_called_once_with(raw=paper, source='pubmed')
        assert paper['doi'] in seen_dois
        assert title_hash(paper['title']) in seen_hashes

    def test_duplicate_not_queued(self):
        paper = _paper()
        with patch('pipeline.researcher.queries.insert_to_queue') as insert:
            assert _queue_paper(paper, 'pubmed', {paper['doi']}, set()) is False
            insert.assert_not_called()

    def test_paper_without_doi_only_adds_title_hash(self):
        paper = _paper(doi=False)
        seen_dois: set = set()
        seen_hashes: set = set()
        with patch('pipeline.researcher.queries.paper_exists_by_source_id', return_value=False), \
             patch('pipeline.researcher.queries.paper_exists_in_queue_by_source_id', return_value=False), \
             patch('pipeline.researcher.queries.insert_to_queue'):
            assert _queue_paper(paper, 'arxiv', seen_dois, seen_hashes) is True
        assert seen_dois == set()
        assert title_hash(paper['title']) in seen_hashes


@pytest.fixture
def no_db_dupes():
    with patch('pipeline.researcher.queries.paper_exists_by_doi', return_value=False), \
         patch('pipeline.researcher.queries.paper_exists_in_queue', return_value=False), \
         patch('pipeline.researcher.queries.paper_exists_by_source_id', return_value=False), \
         patch('pipeline.researcher.queries.paper_exists_in_queue_by_source_id', return_value=False), \
         patch('pipeline.researcher.queries.insert_to_queue') as insert:
        yield insert


class TestRunSourceAccounting:
    """found/queued/skipped accounting + source labels for each source runner."""

    def test_pubmed_counts_and_source_label(self, no_db_dupes):
        papers = [_paper(i, 'pm') for i in range(3)]
        client = MagicMock()
        client.search_all_queries.return_value = papers
        with patch('pipeline.researcher.PubMedClient', return_value=client):
            # pre-seed one DOI as already seen → it must be skipped
            found, queued, skipped = researcher.run_source(
                'pubmed', seen_dois={papers[0]['doi']}, seen_hashes=set(),
                days_back=1, limit=0,
            )
        assert (found, queued, skipped) == (3, 2, 1)
        client.search_all_queries.assert_called_once_with(days_back=1)
        sources = {c.kwargs['source'] for c in no_db_dupes.call_args_list}
        assert sources == {'pubmed'}

    def test_pubmed_limit_truncates_before_queueing(self, no_db_dupes):
        papers = [_paper(i, 'pm') for i in range(5)]
        client = MagicMock()
        client.search_all_queries.return_value = papers
        with patch('pipeline.researcher.PubMedClient', return_value=client):
            found, queued, skipped = researcher.run_source(
                'pubmed', seen_dois=set(), seen_hashes=set(),
                days_back=1, limit=2,
            )
        assert (found, queued, skipped) == (2, 2, 0)

    def test_semantic_scholar_counts_and_source_label(self, no_db_dupes):
        papers = [_paper(i, 'ss') for i in range(2)]
        client = MagicMock()
        client.search_all_queries.return_value = papers
        with patch('pipeline.researcher.SemanticScholarClient', return_value=client):
            found, queued, skipped = researcher.run_source('semantic_scholar', set(), set())
        assert (found, queued, skipped) == (2, 2, 0)
        sources = {c.kwargs['source'] for c in no_db_dupes.call_args_list}
        assert sources == {'semantic_scholar'}

    def test_arxiv_counts_and_source_label(self, no_db_dupes):
        papers = [_paper(i, 'ax', doi=False) for i in range(2)]
        client = MagicMock()
        client.search_all_queries.return_value = papers
        with patch('pipeline.researcher.ArXivClient', return_value=client):
            found, queued, skipped = researcher.run_source('arxiv', set(), set())
        assert (found, queued, skipped) == (2, 2, 0)
        sources = {c.kwargs['source'] for c in no_db_dupes.call_args_list}
        assert sources == {'arxiv'}

    def test_rss_counts_and_source_label(self, no_db_dupes):
        papers = [_paper(i, 'rss') for i in range(2)]
        client = MagicMock()
        client.fetch_all.return_value = papers
        with patch('pipeline.researcher.RSSClient', return_value=client):
            found, queued, skipped = researcher.run_source('rss', set(), set())
        assert (found, queued, skipped) == (2, 2, 0)
        sources = {c.kwargs['source'] for c in no_db_dupes.call_args_list}
        assert sources == {'rss'}

    def test_cross_source_dedup_via_shared_seen_sets(self, no_db_dupes):
        """A DOI queued by source 1 must be skipped by source 2 in the same run."""
        shared = _paper(0, 'shared')
        pm = MagicMock()
        pm.search_all_queries.return_value = [shared]
        ss = MagicMock()
        ss.search_all_queries.return_value = [dict(shared)]
        seen_dois: set = set()
        seen_hashes: set = set()
        with patch('pipeline.researcher.PubMedClient', return_value=pm), \
             patch('pipeline.researcher.SemanticScholarClient', return_value=ss):
            r1 = researcher.run_source('pubmed', seen_dois, seen_hashes)
            r2 = researcher.run_source('semantic_scholar', seen_dois, seen_hashes)
        assert r1 == (1, 1, 0)
        assert r2 == (1, 0, 1)
        assert no_db_dupes.call_count == 1


class TestMainRouting:
    def _clients(self):
        pm, ss, ax, rss = MagicMock(), MagicMock(), MagicMock(), MagicMock()
        pm.search_all_queries.return_value = [_paper(0, 'pm')]
        ss.search_all_queries.return_value = [_paper(0, 'ss')]
        ax.search_all_queries.return_value = [_paper(0, 'ax', doi=False)]
        rss.fetch_all.return_value = [_paper(0, 'rss')]
        return pm, ss, ax, rss

    def test_all_sources_run_when_key_present(self, no_db_dupes, monkeypatch):
        monkeypatch.setenv('SEMANTIC_SCHOLAR_API_KEY', 'test-key')
        pm, ss, ax, rss = self._clients()
        with patch('pipeline.researcher.PubMedClient', return_value=pm), \
             patch('pipeline.researcher.SemanticScholarClient', return_value=ss), \
             patch('pipeline.researcher.ArXivClient', return_value=ax), \
             patch('pipeline.researcher.RSSClient', return_value=rss), \
             patch('sys.argv', ['researcher']):
            researcher.main()
        sources = [c.kwargs['source'] for c in no_db_dupes.call_args_list]
        assert sources == ['pubmed', 'semantic_scholar', 'arxiv', 'rss']

    def test_semantic_scholar_skipped_without_key(self, no_db_dupes, monkeypatch):
        monkeypatch.delenv('SEMANTIC_SCHOLAR_API_KEY', raising=False)
        pm, ss, ax, rss = self._clients()
        with patch('pipeline.researcher.PubMedClient', return_value=pm), \
             patch('pipeline.researcher.SemanticScholarClient', return_value=ss), \
             patch('pipeline.researcher.ArXivClient', return_value=ax), \
             patch('pipeline.researcher.RSSClient', return_value=rss), \
             patch('sys.argv', ['researcher']):
            researcher.main()
        ss.search_all_queries.assert_not_called()
        sources = [c.kwargs['source'] for c in no_db_dupes.call_args_list]
        assert sources == ['pubmed', 'arxiv', 'rss']

    def test_single_source_selection(self, no_db_dupes, monkeypatch):
        monkeypatch.setenv('SEMANTIC_SCHOLAR_API_KEY', 'test-key')
        pm, ss, ax, rss = self._clients()
        with patch('pipeline.researcher.PubMedClient', return_value=pm), \
             patch('pipeline.researcher.SemanticScholarClient', return_value=ss), \
             patch('pipeline.researcher.ArXivClient', return_value=ax), \
             patch('pipeline.researcher.RSSClient', return_value=rss), \
             patch('sys.argv', ['researcher', '--source', 'pubmed']):
            researcher.main()
        sources = [c.kwargs['source'] for c in no_db_dupes.call_args_list]
        assert sources == ['pubmed']
        ss.search_all_queries.assert_not_called()
        ax.search_all_queries.assert_not_called()
        rss.fetch_all.assert_not_called()

    def test_days_and_limit_args_forwarded(self, no_db_dupes, monkeypatch):
        monkeypatch.setenv('SEMANTIC_SCHOLAR_API_KEY', 'test-key')
        pm, ss, ax, rss = self._clients()
        pm.search_all_queries.return_value = [_paper(i, 'pm') for i in range(5)]
        with patch('pipeline.researcher.PubMedClient', return_value=pm), \
             patch('pipeline.researcher.SemanticScholarClient', return_value=ss), \
             patch('pipeline.researcher.ArXivClient', return_value=ax), \
             patch('pipeline.researcher.RSSClient', return_value=rss), \
             patch('sys.argv', ['researcher', '--source', 'pubmed', '--days', '3', '--limit', '2']):
            researcher.main()
        pm.search_all_queries.assert_called_once_with(days_back=3)
        assert no_db_dupes.call_count == 2
