"""
Characterization tests for pipeline/writer.py.

Pin the CURRENT behavior of summary trimming, bad-phrase detection, and the
generate → self-check → retry flow so refactors can be verified identical.
No network: the Anthropic client is mocked.
"""
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from pipeline import writer
from pipeline.writer import (
    _has_bad_phrases,
    _trim_to_sentence_boundary,
    _word_count,
    generate_summary,
)


def _msg(text: str, inp: int = 100, out: int = 50):
    return SimpleNamespace(
        usage=SimpleNamespace(input_tokens=inp, output_tokens=out),
        content=[SimpleNamespace(text=text)],
    )


def _client(*texts: str):
    client = MagicMock()
    client.messages.create.side_effect = [_msg(t) for t in texts]
    return client


_PAPER = {'title': 'Interval training in runners', 'abstract': 'An RCT abstract.'}


class TestTrimToSentenceBoundary:
    def test_short_text_unchanged(self):
        text = 'A short factual summary.'
        assert _trim_to_sentence_boundary(text) == text

    def test_long_text_cut_at_last_period(self):
        text = ' '.join(['aa'] * 100) + ' bb. ' + ' '.join(['cc'] * 30)
        result = _trim_to_sentence_boundary(text)
        assert result == ' '.join(['aa'] * 100) + ' bb.'

    def test_long_text_without_period_hard_truncated(self):
        text = ' '.join(['xx'] * 130)
        result = _trim_to_sentence_boundary(text)
        assert _word_count(result) == 120


class TestHasBadPhrases:
    def test_coaching_phrase_detected_case_insensitive(self):
        assert _has_bad_phrases('You should increase volume.') is True

    def test_hedge_phrase_detected(self):
        assert _has_bad_phrases('It seems plausible.') is True

    def test_clean_text_passes(self):
        assert _has_bad_phrases('VO2max increased by 8% after six weeks.') is False


class TestGenerateSummary:
    def test_clean_summary_returned_with_tokens(self):
        client = _client('VO2max increased by 8% after six weeks.')
        summary, inp, out = generate_summary(client, _PAPER)
        assert summary == 'VO2max increased by 8% after six weeks.'
        assert (inp, out) == (100, 50)
        assert client.messages.create.call_count == 1

    def test_empty_response_returns_none(self):
        client = MagicMock()
        client.messages.create.return_value = SimpleNamespace(
            usage=SimpleNamespace(input_tokens=100, output_tokens=0),
            content=[],
        )
        summary, inp, out = generate_summary(client, _PAPER)
        assert summary is None
        assert (inp, out) == (100, 0)

    def test_long_output_trimmed_to_sentence(self):
        text = ' '.join(['aa'] * 100) + ' bb. ' + ' '.join(['cc'] * 30)
        client = _client(text)
        summary, _, _ = generate_summary(client, _PAPER)
        assert summary == ' '.join(['aa'] * 100) + ' bb.'

    def test_bad_phrase_triggers_retry_and_uses_rewrite(self):
        client = _client(
            'You should train at threshold.',
            'Threshold training improved performance.',
        )
        summary, inp, out = generate_summary(client, _PAPER)
        assert summary == 'Threshold training improved performance.'
        assert client.messages.create.call_count == 2
        assert (inp, out) == (200, 100)  # tokens accumulate across retry

    def test_bad_phrase_persisting_after_retry_returns_none(self):
        client = _client(
            'You should train at threshold.',
            'Athletes should still do this.',
        )
        summary, inp, out = generate_summary(client, _PAPER)
        assert summary is None
        assert (inp, out) == (200, 100)

    def test_empty_retry_keeps_original_failure(self):
        client = MagicMock()
        client.messages.create.side_effect = [
            _msg('You should train at threshold.'),
            SimpleNamespace(
                usage=SimpleNamespace(input_tokens=100, output_tokens=0),
                content=[],
            ),
        ]
        summary, _, _ = generate_summary(client, _PAPER)
        assert summary is None


class TestMainRetryFailed:
    def test_retry_failed_refetches_exactly_the_failed_papers(self, monkeypatch):
        monkeypatch.setenv('ANTHROPIC_API_KEY', 'test-key')
        failed = [{'id': 'e1', 'paper_id': 'p1'}, {'id': 'e2', 'paper_id': 'p2'}]
        papers = [
            {'id': 'p1', 'title': 'T1', 'abstract': 'A1'},
            {'id': 'p2', 'title': 'T2', 'abstract': 'A2'},
        ]
        with patch('pipeline.writer.anthropic.Anthropic', return_value=MagicMock()), \
             patch('pipeline.writer.log_call'), \
             patch('pipeline.writer.queries.get_failed_enrichments_for_writer_retry',
                   return_value=failed), \
             patch('pipeline.writer.queries.delete_enrichment') as delete, \
             patch('pipeline.writer.queries.get_papers_by_ids', return_value=papers) as by_ids, \
             patch('pipeline.writer.generate_summary', return_value=('Summary.', 10, 5)), \
             patch('pipeline.writer.queries.insert_enrichment') as insert, \
             patch('sys.argv', ['writer', '--retry-failed']):
            writer.main()
        by_ids.assert_called_once_with(['p1', 'p2'])
        assert delete.call_count == 2
        assert insert.call_count == 2
