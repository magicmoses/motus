from unittest.mock import MagicMock, patch

import httpx
import pytest

from utils.http import get_with_retry


def _response(status: int):
    response = MagicMock()
    response.status_code = status
    return response


def _get(side_effects):
    """Run get_with_retry against a scripted httpx.get, with sleeps disabled."""
    with patch('utils.http.httpx.get', side_effect=side_effects) as get, \
         patch('utils.http.time.sleep') as sleep:
        result = get_with_retry('https://api.example.org/x')
        return result, get, sleep


class TestGetWithRetry:
    def test_success_first_try_no_retry(self):
        result, get, sleep = _get([_response(200)])
        assert result.status_code == 200
        assert get.call_count == 1
        sleep.assert_not_called()

    def test_timeout_then_success(self):
        result, get, _ = _get([httpx.TimeoutException('slow'), _response(200)])
        assert result.status_code == 200
        assert get.call_count == 2

    def test_server_error_then_success(self):
        result, get, _ = _get([_response(503), _response(200)])
        assert result.status_code == 200
        assert get.call_count == 2

    def test_rate_limit_retried(self):
        result, get, _ = _get([_response(429), _response(200)])
        assert result.status_code == 200
        assert get.call_count == 2

    def test_persistent_server_error_returns_last_response(self):
        # caller's raise_for_status keeps its existing error handling
        result, get, _ = _get([_response(500)] * 3)
        assert result.status_code == 500
        assert get.call_count == 3

    def test_persistent_timeout_raises(self):
        with pytest.raises(httpx.TimeoutException):
            _get([httpx.TimeoutException('slow')] * 3)

    def test_non_transient_status_not_retried(self):
        result, get, sleep = _get([_response(404)])
        assert result.status_code == 404
        assert get.call_count == 1
        sleep.assert_not_called()

    def test_backoff_is_exponential(self):
        _, _, sleep = _get([_response(500), _response(500), _response(200)])
        delays = [c.args[0] for c in sleep.call_args_list]
        assert delays == [2.0, 4.0]
