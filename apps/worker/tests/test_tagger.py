"""
Characterization tests for pipeline/tagger.py.

Pin the CURRENT behavior of JSON extraction, enum filtering, confidence
thresholds, status derivation, and main() mode routing so refactors can be
verified identical. No network: the Anthropic client and db queries are mocked.
"""
import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from pipeline import tagger
from pipeline.tagger import (
    _determine_status,
    _extract_json,
    _filter_allowed,
    _parse_sample_size,
    tag_paper,
)


def _mock_client(response_data=None, text=None, inp=100, out=50):
    if text is None:
        text = json.dumps(response_data)
    msg = SimpleNamespace(
        usage=SimpleNamespace(input_tokens=inp, output_tokens=out),
        content=[SimpleNamespace(text=text)],
    )
    client = MagicMock()
    client.messages.create.return_value = msg
    return client


def _enrichment(**overrides) -> dict:
    base = {
        'id': 'e1',
        'paper_id': 'p1',
        'papers': {
            'id': 'p1',
            'title': 'Interval training and VO2max in trained runners',
            'abstract': 'A randomized controlled trial of interval training in runners.',
        },
    }
    base.update(overrides)
    return base


_FULL_RESPONSE = {
    'sports': ['running', 'soccer'],                      # soccer not allowed
    'movement_practices': ['yoga_pilates', 'crossfit'],   # crossfit not allowed
    'body_regions': ['calves', 'elbow'],                  # elbow not allowed
    'topics': ['vo2max', 'nonsense_topic'],               # nonsense not allowed
    'research_dimensions': ['female_athlete', 'fake_dim'],
    'evidence_level': 2,
    'study_type': 'RCT',
    'population': 'trained',
    'sample_size': 'n=42 runners',
    'confidence': {
        'sports': 0.9,
        'body_regions': 0.8,
        'topics': 0.85,
        'evidence_level': 0.9,
    },
}

_GOLDEN_TAGS = {
    'sports': ['running'],
    'movement_practices': ['yoga_pilates'],
    'body_regions': ['calves'],
    'topics': ['vo2max'],
    'research_dimensions': ['female_athlete'],
    'study_type': 'RCT',
    'population': 'trained',
    'sample_size': 42,
    'evidence_level': 2,
    'confidence_sports': 0.9,
    'confidence_regions': 0.8,
    'confidence_topics': 0.85,
    'confidence_evidence': 0.9,
}


class TestExtractJson:
    def test_plain_json_passthrough(self):
        assert _extract_json('{"a": 1}') == '{"a": 1}'

    def test_strips_json_fence(self):
        assert _extract_json('```json\n{"a": 1}\n```') == '{"a": 1}'

    def test_strips_bare_fence(self):
        assert _extract_json('```\n{"a": 1}\n```') == '{"a": 1}'

    def test_fence_with_surrounding_prose(self):
        assert _extract_json('Here:\n```json\n{"a": 1}\n```\nDone.') == '{"a": 1}'


class TestFilterAllowed:
    def test_filters_disallowed_values(self):
        assert _filter_allowed(['running', 'soccer'], frozenset({'running'})) == ['running']

    def test_none_input_returns_empty(self):
        assert _filter_allowed(None, frozenset({'running'})) == []


class TestParseSampleSize:
    @pytest.mark.parametrize('value,expected', [
        (None, None),
        (27, 27),
        ('27', 27),
        ('n=27 (13 canines, 9 humans)', 27),
        ('twenty', None),
    ])
    def test_parsing(self, value, expected):
        assert _parse_sample_size(value) == expected


class TestDetermineStatus:
    @pytest.mark.parametrize('sports,topics,evidence,expected', [
        # all three below 0.50 → flagged
        (0.4, 0.3, 0.2, 'flagged'),
        (0.0, 0.0, 0.0, 'flagged'),
        # at least two at/above 0.75 → auto_committed
        (0.9, 0.9, 0.3, 'auto_committed'),
        (0.75, 0.75, 0.0, 'auto_committed'),
        (0.9, 0.9, 0.9, 'auto_committed'),
        # otherwise → needs_review
        (0.9, 0.6, 0.6, 'needs_review'),
        (0.49, 0.51, 0.2, 'needs_review'),
        (0.74, 0.74, 0.74, 'needs_review'),
    ])
    def test_threshold_matrix(self, sports, topics, evidence, expected):
        conf = {'sports': sports, 'topics': topics, 'evidence_level': evidence}
        assert _determine_status(conf) == expected

    def test_missing_keys_treated_as_zero(self):
        assert _determine_status({}) == 'flagged'

    def test_none_values_treated_as_zero(self):
        assert _determine_status({'sports': None, 'topics': None, 'evidence_level': None}) == 'flagged'


class TestTagPaper:
    def test_golden_full_response(self):
        client = _mock_client(_FULL_RESPONSE)
        tags, inp, out = tag_paper(client, _enrichment())
        assert tags == _GOLDEN_TAGS
        assert (inp, out) == (100, 50)

    def test_fenced_json_response_parsed(self):
        client = _mock_client(text=f'```json\n{json.dumps(_FULL_RESPONSE)}\n```')
        tags, _, _ = tag_paper(client, _enrichment())
        assert tags == _GOLDEN_TAGS

    def test_low_sports_confidence_drops_sports(self):
        data = json.loads(json.dumps(_FULL_RESPONSE))
        data['confidence']['sports'] = 0.4
        tags, _, _ = tag_paper(_mock_client(data), _enrichment())
        assert tags['sports'] == []
        assert tags['confidence_sports'] == 0.4  # raw confidence still recorded

    def test_low_regions_confidence_drops_regions(self):
        data = json.loads(json.dumps(_FULL_RESPONSE))
        data['confidence']['body_regions'] = 0.3
        tags, _, _ = tag_paper(_mock_client(data), _enrichment())
        assert tags['body_regions'] == []

    def test_low_topics_confidence_drops_topics(self):
        data = json.loads(json.dumps(_FULL_RESPONSE))
        data['confidence']['topics'] = 0.49
        tags, _, _ = tag_paper(_mock_client(data), _enrichment())
        assert tags['topics'] == []

    def test_low_evidence_confidence_nulls_evidence_level(self):
        data = json.loads(json.dumps(_FULL_RESPONSE))
        data['confidence']['evidence_level'] = 0.2
        tags, _, _ = tag_paper(_mock_client(data), _enrichment())
        assert tags['evidence_level'] is None

    def test_invalid_study_type_and_population_nulled(self):
        data = json.loads(json.dumps(_FULL_RESPONSE))
        data['study_type'] = 'observational'
        data['population'] = 'martian'
        tags, _, _ = tag_paper(_mock_client(data), _enrichment())
        assert tags['study_type'] is None
        assert tags['population'] is None

    def test_missing_abstract_skips_api_call(self):
        client = _mock_client(_FULL_RESPONSE)
        enrichment = _enrichment(papers={'id': 'p1', 'title': 'T', 'abstract': ''})
        tags, inp, out = tag_paper(client, enrichment)
        assert (tags, inp, out) == (None, 0, 0)
        client.messages.create.assert_not_called()

    def test_invalid_json_returns_none_with_tokens(self):
        client = _mock_client(text='not json at all')
        tags, inp, out = tag_paper(client, _enrichment())
        assert tags is None
        assert (inp, out) == (100, 50)

    def test_api_error_returns_none_zero_tokens(self):
        client = MagicMock()
        client.messages.create.side_effect = RuntimeError('boom')
        tags, inp, out = tag_paper(client, _enrichment())
        assert (tags, inp, out) == (None, 0, 0)


class TestMainRouting:
    @pytest.fixture(autouse=True)
    def _env_and_anthropic(self, monkeypatch):
        monkeypatch.setenv('ANTHROPIC_API_KEY', 'test-key')
        with patch('pipeline.tagger.anthropic.Anthropic', return_value=MagicMock()), \
             patch('pipeline.tagger.log_call'):
            yield

    def _tags(self, **conf):
        tags = dict(_GOLDEN_TAGS)
        tags.update(conf)
        return tags

    def test_normal_mode_full_write_with_status(self):
        enr = _enrichment()
        tags = self._tags()
        with patch('pipeline.tagger.queries.get_enrichments_pending_tags', return_value=[enr]) as q, \
             patch('pipeline.tagger.tag_paper', return_value=(dict(tags), 10, 5)), \
             patch('pipeline.tagger.queries.update_enrichment') as update, \
             patch('sys.argv', ['tagger']):
            tagger.main()
        q.assert_called_once_with(limit=100)
        (eid, payload), _ = update.call_args
        assert eid == 'e1'
        # full tag payload + derived status (0.9/0.85/0.9 → auto_committed)
        assert payload['enrichment_status'] == 'auto_committed'
        for k, v in tags.items():
            assert payload[k] == v

    def test_normal_mode_failure_marks_failed(self):
        with patch('pipeline.tagger.queries.get_enrichments_pending_tags', return_value=[_enrichment()]), \
             patch('pipeline.tagger.tag_paper', return_value=(None, 0, 0)), \
             patch('pipeline.tagger.queries.update_enrichment') as update, \
             patch('sys.argv', ['tagger']):
            tagger.main()
        update.assert_called_once_with('e1', {'enrichment_status': 'failed'})

    def test_backfill_mode_writes_only_dimension_fields(self):
        with patch('pipeline.tagger.queries.get_enrichments_missing_dimensions',
                   return_value=[_enrichment()]) as q, \
             patch('pipeline.tagger.tag_paper', return_value=(self._tags(), 10, 5)), \
             patch('pipeline.tagger.queries.update_enrichment') as update, \
             patch('sys.argv', ['tagger', '--backfill-dimensions']):
            tagger.main()
        q.assert_called_once_with(limit=100)
        update.assert_called_once_with('e1', {
            'research_dimensions': ['female_athlete'],
            'movement_practices': ['yoga_pilates'],
        })

    def test_backfill_mode_failure_does_not_touch_status(self):
        with patch('pipeline.tagger.queries.get_enrichments_missing_dimensions',
                   return_value=[_enrichment()]), \
             patch('pipeline.tagger.tag_paper', return_value=(None, 0, 0)), \
             patch('pipeline.tagger.queries.update_enrichment') as update, \
             patch('sys.argv', ['tagger', '--backfill-dimensions']):
            tagger.main()
        update.assert_not_called()

    def test_retag_all_mode_uses_full_retag_query(self):
        with patch('pipeline.tagger.queries.get_all_tagged_enrichments',
                   return_value=[_enrichment()]) as q, \
             patch('pipeline.tagger.tag_paper', return_value=(self._tags(), 10, 5)), \
             patch('pipeline.tagger.queries.update_enrichment') as update, \
             patch('sys.argv', ['tagger', '--retag-all']):
            tagger.main()
        q.assert_called_once_with(limit=100)
        (eid, payload), _ = update.call_args
        assert payload['enrichment_status'] == 'auto_committed'
