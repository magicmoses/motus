# Reliability Pass — Findings & Plan (2026-06-11)

Snapshot of the working version: tag `pre-refactor-snapshot` / branch `safety/pre-refactor`
at commit `cd76d20fea0c0aabe5664cdf6520b4396fbaa3be`. All work happens on `refactor/reliability-pass`.

## 1. Root cause: why the daily crawl never runs

The intended flow (commit `848803e`) was:

```
GitHub Actions cron (06:00 UTC)
  → curl POST https://motus-worker.up.railway.app/trigger-pipeline
  → Flask api_server.py on Railway
  → subprocess: python run_pipeline.py
```

It is broken at three independent points:

1. **Railway never serves the Flask app.** Both `apps/worker/railway.toml` and
   `apps/worker/nixpacks.toml` set the start command to `python run_pipeline.py` — a one-shot
   script that runs and exits. `api_server.py` is never started, so nothing listens for the
   trigger. Evidence: every trigger gets Railway's edge error
   `{"status":"error","code":502,"message":"Application failed to respond"}`
   (Actions run 27339659136, 2026-06-11).

2. **The failure is silent.** The workflow's `curl` has no `--fail` flag, so HTTP 502 still
   exits 0 and the job reports **success**. All scheduled runs since 2026-06-08 are "green"
   in 21–22 s while doing nothing.

3. **The design could not work anyway.** `api_server.py` runs the pipeline *synchronously*
   inside the request handler (up to 3600 s). Railway's HTTP edge times out long before that,
   so any real run would have been killed mid-request.

**Fix (Phase 1):** run the crawl directly inside GitHub Actions — no Railway dependency,
fail-loud, all required secrets already exist as repository secrets
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `PUBMED_API_KEY`,
`SEMANTIC_SCHOLAR_API_KEY`).

## 2. Module map (apps/worker, 2,573 LOC)

| Module | LOC | Responsibility |
|---|---|---|
| `run_pipeline.py` | 79 | Entrypoint; stages 1–5 in sequence; fails loud on stages 1–4 |
| `pipeline/researcher.py` | 180 | Discovery from 4 sources → `ingestion_queue` |
| `pipeline/normalizer.py` | 149 | Queue → `papers` (policy gates, dedup) |
| `pipeline/writer.py` | 169 | Summaries via Haiku → `enrichments` |
| `pipeline/tagger.py` | 266 | Tags/confidence via Haiku → `enrichments` |
| `pipeline/verifier.py` | 113 | Soft-reject gates on enrichments |
| `pipeline/citation_updater.py` | 55 | Citation counts via Semantic Scholar (best-effort) |
| `sources/pubmed_client.py` | 305 | E-utilities client, 123 queries |
| `sources/semantic_scholar_client.py` | 198 | Graph API client, 38 queries |
| `sources/arxiv_client.py` | 135 | Atom API client, 23 queries (has retry/backoff) |
| `sources/rss_client.py` | 109 | 8 journal feeds + Crossref enrichment |
| `sources/crossref_client.py` | 70 | DOI → metadata lookup |
| `db/queries.py` | 250 | All Supabase access |
| `utils/` | 146 | logger, cost_tracker, health_alert |
| `api_server.py` | 43 | Flask HTTP trigger (never deployed correctly; superseded by Actions) |

Required env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`.
Optional: `PUBMED_API_KEY` (faster rate limit), `SEMANTIC_SCHOLAR_API_KEY` (source skipped without it).

Cost guardrails already in code: writer/tagger/verifier limits default to 100/100/500 per run,
Haiku model, max_tokens 400/768. LLM spend is bounded per run regardless of discovery volume.

## 3. Ranked refactor plan (pain × risk)

Type A = pure refactor, verified output-identical. Type B = intentional behavior change, own commit + test.

| # | Item | Type |
|---|---|---|
| 1 | `researcher.py`: four near-identical `run_pubmed/run_semantic_scholar/run_arxiv/run_rss` functions → one source-driven path | A |
| 2 | `tagger.py`: `tag_paper` monolith (LLM call + JSON parse + filtering + thresholds interleaved) → linear extract→validate→threshold flow | A |
| 3 | Duplicated `.env`-walking loader copy-pasted in `run_pipeline.py`, `writer.py`, `tagger.py`, `citation_updater.py` → one `utils/env.py` | A |
| 4 | Dead code: `queries.paper_exists_by_title_hash` is a no-op stub (always `False`), so normalizer's "duplicate title" rejection can never fire | A (removal) |
| 5 | `api_server.py` + Railway trigger workflow superseded by direct Actions run | B (Phase 1) |

## 4. Bugs found (NOT silently fixed — queued for Phase 3, each type B)

1. **`PubMedClient.search()` ignores `days_back`.** The "daily" crawl re-searches all of
   2018→now on every run (123 queries × retmax 50) and relies on dedup to discard
   re-discoveries. Works, but wastes API quota and tens of minutes of runtime per run.
   Fix: `reldate`/`datetype` incremental window.
2. **RSS dates crash inserts.** `rss_client` passes `entry.published` through raw
   (RFC-822, e.g. `"Mon, 09 Jun 2026…"`). `normalizer._parse_date` fails → no age gate, and
   `_normalize_paper` truncates to `"Mon, 09 Ju"` → Postgres date insert error → queue item
   `failed`. Every non-Crossref RSS paper is lost.
3. **`writer.py --retry-failed` is fragile.** It deletes failed enrichments, then re-fetches
   `get_papers_without_enrichment(limit=len(ids)+10)` and filters — papers beyond that limit
   window are silently not retried.
4. **No retry/backoff on PubMed / Semantic Scholar / Crossref HTTP calls** (arXiv has it).
   One transient 5xx loses that query's batch for the run.
5. **N+1 dedup roundtrips:** researcher makes up to 2 Supabase queries per discovered paper
   (thousands per run). Functional, but slow and a reliability surface. (Perf-only; may stay
   out of scope.)
6. **`cost_tracker.get_session_total()`** measures "session" from the log file's mtime, which
   is the time of the *last* write — it effectively counts only the final entry. Not on the
   pipeline path (used by /cost), low priority.

## 5. Verification harness

Characterization tests (no network, mock-based) added in Phase 0 — they pin current behavior
so every Phase 2 refactor is auto-checkable:

- `tests/test_researcher.py` — dedup truth table, queue side effects, per-source
  found/queued/skipped accounting, `main()` source routing incl. the missing-S2-key skip.
- `tests/test_tagger.py` — `_extract_json`, `_parse_sample_size`, `_determine_status`
  threshold matrix, `tag_paper` golden outputs (enum filtering, confidence drops, error
  paths), `main()` mode routing (normal / --backfill-dimensions / --retag-all).
- `tests/test_writer.py` — trim/phrase helpers, `generate_summary` clean + retry + give-up
  paths with token accounting.

Baseline before any change: 45 passed (test_normalizer, test_verifier, test_sources).
