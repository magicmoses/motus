"""
Pipeline health monitoring. Called at the start of each pipeline run.
Logs a prominent warning if the pipeline has been idle too long,
so the issue is visible in Railway logs without a separate alerting system.
"""
from utils.logger import get_logger

logger = get_logger(__name__)

IDLE_WARNING_HOURS = 72   # warn if no new paper in 3 days
IDLE_CRITICAL_HOURS = 120  # critical if no new paper in 5 days


def check_and_log() -> float | None:
    """
    Query last paper age and log health status.
    Returns hours_ago (float) or None if no papers exist.
    Call this at the top of run_pipeline.py before any stage runs.
    """
    try:
        from db import queries
        hours_ago = queries.get_last_paper_hours_ago()
    except Exception as e:
        logger.error(f'Health check failed: {e}')
        return None

    if hours_ago is None:
        logger.warning('HEALTH: No papers in database yet — pipeline has never successfully run')
        return None

    if hours_ago >= IDLE_CRITICAL_HOURS:
        logger.error(
            f'HEALTH CRITICAL: Pipeline idle for {hours_ago:.1f}h '
            f'(threshold: {IDLE_CRITICAL_HOURS}h) — investigate Railway cron and deploy logs'
        )
    elif hours_ago >= IDLE_WARNING_HOURS:
        logger.warning(
            f'HEALTH WARNING: Pipeline idle for {hours_ago:.1f}h '
            f'(threshold: {IDLE_WARNING_HOURS}h) — last paper may be stale'
        )
    else:
        logger.info(f'HEALTH OK: last paper {hours_ago:.1f}h ago')

    return hours_ago
