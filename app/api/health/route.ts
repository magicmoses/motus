import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function serializeError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'object' && e !== null) {
    const pg = e as Record<string, unknown>
    if (pg.message) return `${pg.code ?? 'error'}: ${pg.message}${pg.hint ? ` (${pg.hint})` : ''}`
    return JSON.stringify(e)
  }
  return String(e)
}

export async function GET() {
  const timestamp = new Date().toISOString()

  let supabaseStatus: 'connected' | 'error' = 'error'
  let supabaseError: string | null = null
  let papers_count = 0
  let enrichments_count = 0
  let latest_paper: string | null = null
  let latest_enrichment: string | null = null
  let latest_enrichment_status: string | null = null
  let queue: Record<string, number> | string = {}

  try {
    const supabase = await createClient()

    // Core connectivity: count queries (work on empty tables, fail if DB unreachable or RLS blocks)
    const [papersCount, enrichmentsCount] = await Promise.all([
      supabase.from('papers').select('*', { count: 'exact', head: true }),
      supabase.from('enrichments').select('*', { count: 'exact', head: true }),
    ])

    if (papersCount.error) throw papersCount.error
    if (enrichmentsCount.error) throw enrichmentsCount.error

    supabaseStatus = 'connected'
    papers_count = papersCount.count ?? 0
    enrichments_count = enrichmentsCount.count ?? 0

    // Latest rows — use maybeSingle() so empty tables return null, not an error
    const [latestPaper, latestEnrichment] = await Promise.all([
      supabase
        .from('papers')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('enrichments')
        .select('created_at, enrichment_status')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    latest_paper = latestPaper.data?.created_at ?? null
    latest_enrichment = latestEnrichment.data?.created_at ?? null
    latest_enrichment_status = latestEnrichment.data?.enrichment_status ?? null

    // Queue — anon key may be RLS-blocked; treat gracefully
    const queueRows = await supabase.from('ingestion_queue').select('status').limit(500)
    if (queueRows.error) {
      queue = `access_denied: ${serializeError(queueRows.error)}`
    } else {
      const counts: Record<string, number> = {}
      for (const row of queueRows.data ?? []) {
        const s = row.status ?? 'unknown'
        counts[s] = (counts[s] ?? 0) + 1
      }
      queue = counts
    }
  } catch (e) {
    supabaseError = serializeError(e)
  }

  // Pipeline inference
  const now = Date.now()
  const paperAge = latest_paper
    ? (now - new Date(latest_paper).getTime()) / 3_600_000
    : null
  const enrichmentAge = latest_enrichment
    ? (now - new Date(latest_enrichment).getTime()) / 3_600_000
    : null

  const pipelineEverRan = papers_count > 0
  const pipelineRecentlyRan = paperAge !== null && paperAge < 48

  const paperAgeStr = paperAge !== null ? `${paperAge.toFixed(1)} h ago` : 'unknown'
  const pipelineInference = !pipelineEverRan
    ? 'no_data — pipeline has not run yet or DB is empty'
    : pipelineRecentlyRan
    ? `active — last paper ${paperAgeStr}`
    : `idle — last paper ${paperAgeStr}`

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
        inference: pipelineInference,
        ever_ran: pipelineEverRan,
        recently_ran: pipelineRecentlyRan,
        last_paper_hours_ago: paperAge !== null ? +paperAge.toFixed(1) : null,
        last_enrichment_hours_ago: enrichmentAge !== null ? +enrichmentAge.toFixed(1) : null,
      },
      env: {
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    },
  })
}
