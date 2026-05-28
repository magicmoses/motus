import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const timestamp = new Date().toISOString()

  // --- Supabase checks (parallel) ---
  let supabaseStatus: 'connected' | 'error' = 'error'
  let supabaseError: string | null = null
  let papers_count = 0
  let enrichments_count = 0
  let latest_paper: string | null = null
  let latest_enrichment: string | null = null
  let latest_enrichment_status: string | null = null
  let queue: Record<string, number> = {}

  try {
    const supabase = await createClient()

    const [papersCount, enrichmentsCount, latestPaper, latestEnrichment, queueRows] =
      await Promise.all([
        supabase.from('papers').select('*', { count: 'exact', head: true }),
        supabase.from('enrichments').select('*', { count: 'exact', head: true }),
        supabase
          .from('papers')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('enrichments')
          .select('created_at, enrichment_status')
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        supabase.from('ingestion_queue').select('status').limit(500),
      ])

    const firstError =
      papersCount.error ??
      enrichmentsCount.error ??
      queueRows.error

    if (firstError) throw firstError

    supabaseStatus = 'connected'
    papers_count = papersCount.count ?? 0
    enrichments_count = enrichmentsCount.count ?? 0
    latest_paper = latestPaper.data?.created_at ?? null
    latest_enrichment = latestEnrichment.data?.created_at ?? null
    latest_enrichment_status = latestEnrichment.data?.enrichment_status ?? null

    for (const row of queueRows.data ?? []) {
      const s = row.status ?? 'unknown'
      queue[s] = (queue[s] ?? 0) + 1
    }
  } catch (e) {
    supabaseError = String(e)
  }

  // --- Pipeline inference ---
  // If papers or queue rows exist, Railway wrote to Supabase at some point.
  // If latest_paper is recent (< 48 h), pipeline ran recently.
  const now = Date.now()
  const paperAge = latest_paper
    ? (now - new Date(latest_paper).getTime()) / 3_600_000
    : null
  const enrichmentAge = latest_enrichment
    ? (now - new Date(latest_enrichment).getTime()) / 3_600_000
    : null

  const pipelineEverRan = papers_count > 0 || Object.keys(queue).length > 0
  const pipelineRecentlyRan = paperAge !== null && paperAge < 48

  const railwayInference = !pipelineEverRan
    ? 'no_data — pipeline has not run yet or DB is empty'
    : pipelineRecentlyRan
    ? `active — last paper ingested ${paperAge?.toFixed(1)} h ago`
    : `idle — last paper ingested ${paperAge?.toFixed(1)} h ago`

  // --- Env check ---
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }

  return NextResponse.json({
    status: 'ok',
    timestamp,
    checks: {
      supabase: {
        status: supabaseStatus,
        ...(supabaseError ? { error: supabaseError } : {}),
        papers_count,
        enrichments_count,
        latest_paper,
        latest_enrichment,
        latest_enrichment_status,
        queue,
      },
      pipeline: {
        inference: railwayInference,
        ever_ran: pipelineEverRan,
        recently_ran: pipelineRecentlyRan,
        last_paper_hours_ago: paperAge !== null ? +paperAge.toFixed(1) : null,
        last_enrichment_hours_ago:
          enrichmentAge !== null ? +enrichmentAge.toFixed(1) : null,
      },
      env,
    },
  })
}
