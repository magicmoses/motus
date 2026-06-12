# /deploy

Merge main to deploy branch — triggers Vercel (frontend). The pipeline runs
from `main` via GitHub Actions (daily-pipeline.yml) and is not part of deploy.

## Pre-deploy checklist
1. Confirm all tests pass: `cd apps/worker && pytest` + `cd apps/web && npx vitest run`
2. Confirm no TypeScript errors: `cd apps/web && npx tsc --noEmit`
3. Confirm no pending migrations: `supabase db diff`

## Steps
1. `git checkout deploy`
2. `git merge main --no-ff -m "deploy: <brief description>"`
3. `git push origin deploy`

## Post-deploy
- Check the latest Daily Pipeline run: `gh run list --workflow=daily-pipeline.yml`
- Check Vercel deployment status in dashboard
- Run smoke test: hit /api/health endpoint
- Confirm latest papers visible in feed

## Rollback
`git revert HEAD` on deploy branch + push
