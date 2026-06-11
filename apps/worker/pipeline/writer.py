import argparse
import os
from pathlib import Path

import anthropic

from db import queries
from utils.cost_tracker import log_call
from utils.env import load_env
from utils.logger import get_logger

load_env()
logger = get_logger(__name__)

MODEL = 'claude-haiku-4-5-20251001'
MAX_TOKENS = 400
WRITER_PROMPT = Path(__file__).parent.parent / 'prompts' / 'writer_system.txt'

_COACHING_PHRASES = [
    'you should', 'try to', 'consider',
    'it is recommended', 'athletes should', 'we recommend',
]
_HEDGE_PHRASES = [
    'it seems', 'perhaps', 'might suggest',
    'could potentially', 'may indicate',
]


def _load_prompt() -> str:
    return WRITER_PROMPT.read_text(encoding='utf-8')


def _word_count(text: str) -> int:
    return len(text.split()) if text else 0


def _has_bad_phrases(text: str) -> bool:
    lower = text.lower()
    return any(p in lower for p in _COACHING_PHRASES + _HEDGE_PHRASES)


def _trim_to_sentence_boundary(text: str, max_words: int = 120) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text
    trimmed = ' '.join(words[:max_words])
    last_period = trimmed.rfind('.')
    return trimmed[:last_period + 1] if last_period > 0 else trimmed


def generate_summary(client: anthropic.Anthropic, paper: dict) -> tuple[str | None, int, int]:
    """
    Generate a writer summary for a paper.
    Returns (summary | None, total_input_tokens, total_output_tokens).
    """
    system_prompt = _load_prompt()
    title = paper.get('title', '')
    abstract = paper.get('abstract', '')

    total_in, total_out = 0, 0

    msg = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system_prompt,
        messages=[{'role': 'user', 'content': f'Title: {title}\n\nAbstract: {abstract}'}],
    )
    total_in += msg.usage.input_tokens
    total_out += msg.usage.output_tokens
    summary = msg.content[0].text.strip() if msg.content else ''

    if not summary:
        return None, total_in, total_out

    summary = _trim_to_sentence_boundary(summary)

    if _has_bad_phrases(summary):
        retry_prompt = (
            'Rewrite the following summary removing any coaching language '
            '("you should", "try to", "consider", "we recommend", "athletes should") '
            'and hedging phrases ("it seems", "perhaps", "might suggest", '
            '"could potentially", "may indicate"). '
            'Keep all factual content intact.\n\n'
            f'Summary: {summary}'
        )
        retry = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=system_prompt,
            messages=[
                {'role': 'user', 'content': f'Title: {title}\n\nAbstract: {abstract}'},
                {'role': 'assistant', 'content': summary},
                {'role': 'user', 'content': retry_prompt},
            ],
        )
        total_in += retry.usage.input_tokens
        total_out += retry.usage.output_tokens
        retry_text = retry.content[0].text.strip() if retry.content else ''
        if retry_text:
            summary = _trim_to_sentence_boundary(retry_text)

    if _has_bad_phrases(summary) or _word_count(summary) > 150:
        return None, total_in, total_out

    return summary, total_in, total_out


def main() -> None:
    parser = argparse.ArgumentParser(description='Motus writer stage')
    parser.add_argument('--limit', type=int, default=100,
                        help='Max papers to process per run')
    parser.add_argument('--retry-failed', action='store_true',
                        help='Retry papers whose writer enrichment previously failed')
    args = parser.parse_args()

    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])

    if args.retry_failed:
        failed = queries.get_failed_enrichments_for_writer_retry(limit=args.limit)
        logger.info(f'Writer (retry-failed): deleting {len(failed)} failed enrichments for re-attempt')
        for e in failed:
            queries.delete_enrichment(e['id'])
        logger.info('Deleted — re-running writer on those papers now')
        paper_ids = {e['paper_id'] for e in failed}
        papers_raw = queries.get_papers_without_enrichment(limit=len(paper_ids) + 10)
        papers = [p for p in papers_raw if p['id'] in paper_ids]
    else:
        papers = queries.get_papers_without_enrichment(limit=args.limit)

    logger.info(f'Writer: processing {len(papers)} papers')

    succeeded = 0
    failed = 0

    for paper in papers:
        paper_id = paper['id']
        title_preview = paper.get('title', '')[:60]

        summary, inp, out = generate_summary(client, paper)
        log_call('writer', MODEL, inp, out, paper_id)

        if summary is None:
            logger.warning(f'Writer failed: {title_preview}')
            queries.insert_enrichment({
                'paper_id': paper_id,
                'enrichment_status': 'failed',
            })
            failed += 1
            continue

        queries.insert_enrichment({
            'paper_id': paper_id,
            'summary': summary,
            'enrichment_status': 'pending',
        })
        succeeded += 1
        logger.info(f'Wrote summary: {title_preview}')

    logger.info(f'Writer complete: succeeded={succeeded} failed={failed}')


if __name__ == '__main__':
    main()
