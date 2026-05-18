---
name: ingestion-pipeline
description: >
  Use when working on paper discovery, normalization, deduplication,
  or any of the 4 pipeline stages (Researcher, Writer, Tagger, Verifier).
  Also load when debugging ingestion failures or adding new data sources.
---

# Ingestion Pipeline

## Flow
```
PubMed API / Semantic Scholar / RSS / alphaXiv
→ Discovery Queue
→ Normalization + Deduplication
→ Lightweight Research Index (papers table)
→ LLM Enrichment (Writer + Tagger)
→ Verification
→ Postgres (enrichments table)
```

## Stage 1 — Researcher
File: apps/worker/pipeline/researcher.py
Discovers new papers from configured sources.
Outputs: raw paper dicts to discovery queue (Supabase table: ingestion_queue)

## Source Routing Logic
researcher.py routes papers to the best available source automatically:

  1. PubMed first — stable IDs, best metadata, most complete abstracts
  2. Semantic Scholar fallback — if PubMed returns no results for query
  3. alphaXiv last resort — preprints only, flag with source_name='alphaxiv'

Routing decision logged per paper in ingestion_queue.source field.
Never fetch the same DOI from multiple sources — dedup before routing.

## Stage 2 — Normalizer
File: apps/worker/pipeline/normalizer.py
Deduplicates by DOI first, title-hash fallback.
Rejects: abstract < 80 words, no DOI + no stable URL, published < 2018.
Outputs: normalized rows to papers table.

## Stage 3 — Writer + Tagger
Files: apps/worker/pipeline/writer.py, tagger.py
LLM enrichment via Anthropic API (structured outputs).
Prompts live in: apps/worker/prompts/ — never inline in code.
Max summary: 120 words. Tone: factual, no coaching language.
Outputs: enrichments table rows.

## Stage 4 — Verifier
File: apps/worker/pipeline/verifier.py
Checks: DOI format, duplicate, summary length, ≥1 sport tag, evidence level.
Rejects invalid rows, logs reason.

## Normalization rules
- Deduplicate by DOI first, title-hash fallback
- Reject if abstract < 80 words
- Reject if no DOI and no stable source URL
- Normalize published_at to ISO 8601

## Policy Gates (Verifier)
Hard reject (paper deleted from queue):
  - Abstract null or < 80 words
  - No DOI and no stable source URL
  - published_at < 2018
  - Duplicate DOI already in papers table

Soft reject (stored, excluded from feed, status = 'flagged'):
  - Summary > 150 words after retry
  - All confidence scores < 0.60
  - No sport tag assigned
  - Evidence level null

Auto-commit (status = 'auto_committed'):
  - All confidence scores ≥ 0.85
  - Summary ≤ 120 words
  - ≥ 1 sport tag
  - Evidence level assigned

## LLM call structure
Use Anthropic API with response_format: json_schema.
Max tokens: 400 per paper.
Always source-grounded — summary must reflect abstract content only.
Model: claude-haiku-4-5-20251001 for cost efficiency at scale.

## Evidence levels
1 = RCT / Meta-analysis
2 = Cohort study
3 = Case study / Expert opinion
4 = Mechanistic / Review

## Key files
apps/worker/
  pipeline/
    researcher.py
    normalizer.py
    writer.py
    tagger.py
    verifier.py
  prompts/
    writer_system.txt
    tagger_system.txt
  db/
    queries.py
  tests/
    test_normalizer.py
    test_verifier.py
