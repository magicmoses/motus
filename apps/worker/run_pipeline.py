"""
Full pipeline entrypoint. Run all stages in sequence.
Runs daily via GitHub Actions (.github/workflows/daily-pipeline.yml)
or manually: python run_pipeline.py
"""
import os
import sys

from utils.env import load_env

load_env()

from utils.logger import get_logger

logger = get_logger('run_pipeline')


def _check_env() -> None:
    required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY']
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        logger.error(f'Missing required env vars: {missing}')
        sys.exit(1)


def main() -> None:
    _check_env()

    logger.info('=== MOTUS PIPELINE START ===')

    from utils.health_alert import check_and_log as health_check
    health_check()

    # Stage 1: Researcher
    logger.info('--- Stage 1: Researcher ---')
    from pipeline.researcher import main as researcher_main
    researcher_main()

    # Stage 2: Normalizer
    logger.info('--- Stage 2: Normalizer ---')
    from pipeline.normalizer import main as normalizer_main
    normalizer_main()

    # Stage 3a: Writer
    logger.info('--- Stage 3a: Writer ---')
    from pipeline.writer import main as writer_main
    writer_main()

    # Stage 3b: Tagger
    logger.info('--- Stage 3b: Tagger ---')
    from pipeline.tagger import main as tagger_main
    tagger_main()

    # Stage 4: Verifier
    logger.info('--- Stage 4: Verifier ---')
    from pipeline.verifier import main as verifier_main
    verifier_main()

    # Stage 5: Citation updater (best-effort — does not block on failure)
    logger.info('--- Stage 5: Citation Updater ---')
    try:
        from pipeline.citation_updater import main as citation_updater_main
        citation_updater_main()
    except Exception as e:
        logger.warning(f'Citation updater failed (non-fatal): {e}')

    logger.info('=== MOTUS PIPELINE COMPLETE ===')


if __name__ == '__main__':
    main()
