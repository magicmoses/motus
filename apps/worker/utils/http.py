"""HTTP GET with retry/backoff for the external paper APIs.

Retries transient failures — 429, 5xx, timeouts, connection errors — with
exponential backoff. Non-transient statuses (e.g. 404) return immediately.
If the final attempt produced a response it is returned (callers keep their
own raise_for_status / status handling); if it raised, the exception
propagates so callers' existing error handling still applies.
"""
import time

import httpx

from utils.logger import get_logger

logger = get_logger(__name__)

RETRY_STATUSES = {429, 500, 502, 503, 504}


def get_with_retry(
    url: str,
    *,
    params: dict | None = None,
    headers: dict | None = None,
    timeout: float = 30,
    retries: int = 3,
    backoff: float = 2.0,
    follow_redirects: bool = False,
) -> httpx.Response:
    last_exc: Exception | None = None
    response: httpx.Response | None = None
    for attempt in range(retries):
        try:
            response = httpx.get(
                url, params=params, headers=headers,
                timeout=timeout, follow_redirects=follow_redirects,
            )
            if response.status_code not in RETRY_STATUSES:
                return response
            reason = f'HTTP {response.status_code}'
            last_exc = None
        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            last_exc = exc
            reason = type(exc).__name__
        if attempt < retries - 1:
            delay = backoff * (2 ** attempt)
            logger.warning(
                f'GET {url[:60]} failed ({reason}) — retry {attempt + 1}/{retries - 1} in {delay}s'
            )
            time.sleep(delay)
    if last_exc is not None:
        raise last_exc
    return response  # type: ignore[return-value]  # final transient-status response
