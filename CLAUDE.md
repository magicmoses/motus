# Motus

## What this is
Personalized sports science discovery for endurance athletes (hobby & elite).
Research index + LLM enrichment + 3D anatomy navigation.
NOT an AI coach. NOT a training app. A research intelligence layer.

## Stack
- Frontend: Next.js 15, Tailwind, shadcn/ui, React Three Fiber
- Backend: Supabase (Postgres, Auth, Storage, Cron)
- Worker: Python (ingestion pipeline)
- AI: Anthropic API (structured outputs, deterministic prompting)
- Deploy: Vercel (frontend); pipeline runs via GitHub Actions (daily-pipeline.yml)
- CI: GitHub Actions

## Architecture — 4-Stage Pipeline
1. Researcher — discovers papers via PubMed / Semantic Scholar / RSS
2. Writer — generates short evidence-based summaries (Anthropic API)
3. Tagger — extracts sports, muscle groups, topics, evidence level
4. Verifier — checks DOI, deduplication, valid sources, sane tags

## Critical constraints
- Store ONLY: DOI, title, abstract, authors, journal, source_url, published_at + enrichment
- NEVER store: full PDFs, publisher HTML, paywalled content
- No LangChain, no vector DB, no RAG, no autonomous agents
- Deterministic pipeline stages — not agentic loops
- KISS: lightweight, deployable, maintainable

## Mandatory skill reads before build
Before ANY implementation, read ALL of these files completely in this order:
1. Read .claude/skills/data-model/SKILL.md
2. Read .claude/skills/research-knowledge/SKILL.md
3. Read .claude/skills/ingestion-pipeline/SKILL.md
4. Read .claude/skills/enrichment/SKILL.md
5. Read .claude/skills/frontend-patterns/SKILL.md
6. Read .claude/skills/anatomy-mapping/SKILL.md

Also read all agent definitions:
7. Read .claude/agents/code-generator.md
8. Read .claude/agents/code-reviewer.md
9. Read .claude/agents/refactor-worker.md
10. Read .claude/agents/data-acquisition.md

And all relevant commands:
11. Read .claude/commands/plan.md
12. Read .claude/commands/doctor.md
13. Read .claude/commands/cost.md

Do not start implementing until all 13 files are read.
Confirm with: "All skill files read. Ready to build."

## Domain skills (load on demand)
- Ingestion work → ingestion-pipeline
- LLM prompts / tagging → enrichment
- 3D anatomy / body regions → anatomy-mapping
- DB schema / migrations → data-model
- React components / feed UI → frontend-patterns
- API queries / search terms → research-knowledge
- Cost tracking → cost (via /cost command + logs/pipeline_costs.jsonl)

## Parallel development workflow
- Feature work → always in a worktree: `claude --worktree feature/<name>`
- 2–4 subagents max (sweet spot)
- Agents: code-generator (build), code-reviewer (review), refactor-worker (cleanup)
- data-acquisition agent for API testing during development
- Deploy branch: merge only reviewed, tested code

## Branch → Deploy flow
`feature/*` → (review) → `main` → (tested) → `deploy`
Vercel watches `deploy` branch. The pipeline runs from `main` via GitHub Actions.

## Context hygiene
- /compact before switching to a new major task
- /cost after long sessions
- /clear when context is polluted or task fully done
- Never @-include full files in CLAUDE.md — reference paths instead
- /plan before any non-trivial implementation
- /doctor at start of every new session
- /memory before /compact to persist state
- /strategy when making architecture decisions

## Commit style
Conventional Commits: feat:, fix:, chore:, docs:, pipeline:, data:

## Testing
- Python worker: pytest (apps/worker/tests/)
- Frontend: vitest + playwright for critical paths
