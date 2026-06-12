# Motus

> Personalized sports science discovery for endurance athletes.

Research index + LLM enrichment + injury & body-region exploration — built with Claude Code.

---

## What this is

A lightweight platform connecting endurance athletes with current sports science research.

**Not** an AI coach. **Not** a training app. A **research intelligence layer**.

Core features:
- Evidence-based paper discovery via PubMed + Semantic Scholar
- LLM-generated summaries (factual, source-grounded, no coaching language)
- Injury Risk Explorer + Research Roulette for body-region-based discovery
- Personalized feed by sport, distance, interests
- Save papers to custom research lists

Target athletes: runners, cyclists, rowers, Hyrox athletes, skiers, inline skaters.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, Tailwind, shadcn/ui |
| Backend | Supabase (Postgres, Auth, Storage) |
| Worker | Python ingestion pipeline |
| AI | Anthropic API (structured outputs) |
| Deploy | Vercel (frontend) + GitHub Actions (pipeline) |

---

## Claude Code setup

This project is structured as a Claude Code showcase:

```
.claude/
  agents/          — code-generator, code-reviewer, refactor-worker, data-acquisition
  commands/        — /ingest, /enrich, /verify, /deploy, /seed, /parallel-feature, /explore-source
  skills/          — ingestion-pipeline, enrichment, anatomy-mapping, data-model,
                     frontend-patterns, research-knowledge
  settings.json    — permissions + hooks
```

Key patterns demonstrated:
- Lean CLAUDE.md (~60 lines, high signal only)
- On-demand skill loading (domain knowledge separate from session context)
- Subagents with clear role separation + worktree isolation
- Deterministic hooks (pytest on Python write, tsc on TSX write)
- Slash commands for every inner-loop workflow
- Parallel feature development via git worktrees

---

## Getting started

```bash
# Clone and enter
git clone <repo>
cd motus

# Frontend
cd apps/web && npm install && npm run dev

# Worker
cd apps/worker && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Supabase (local)
supabase start

# Seed initial data
# In Claude Code: /seed
```

---

## Pipeline

```
PubMed / Semantic Scholar / RSS
→ Discovery Queue
→ Normalization + Deduplication
→ Lightweight Research Index
→ LLM Enrichment (Writer + Tagger)
→ Verification
→ Postgres → Next.js Frontend
```

No fulltext storage. No paywalled content. Scientific references + own enrichment only.

---

## Deploy

Branch strategy:
- `feature/*` → worktree development
- `main` → reviewed, tested code
- `deploy` → production (Vercel watches this branch; the pipeline runs from `main` via GitHub Actions)
