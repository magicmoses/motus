"""
Full pipeline entrypoint. Run all 4 stages in sequence.
Designed for Railway cron: python run_pipeline.py
"""
import os
import sys

from dotenv import load_dotenv

load_dotenv()

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

    logger.info('=== MOTUS PIPELINE COMPLETE ===')


if __name__ == '__main__':
    main()
