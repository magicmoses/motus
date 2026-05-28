import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function serializeError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'object' && e !== null) {
    const pg = e as Record<string, unknown>
    const code = typeof pg.code === 'string' ? pg.code : ''
    const message = typeof pg.message === 'string' ? pg.message : ''
    const hint = typeof pg.hint === 'string' ? pg.hint : ''
    return [code, message, hint].filter(Boolean).join(' — ') || JSON.stringify(e)
  }
  return String(e)
}

type TableName = 'papers' | 'enrichments' | 'ingestion_queue' | 'saves' | 'users'

async function countWhere(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: TableName,
  column: string,
  value: string
): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: false })
    .eq(column, value)
    .limit(0)
  return count ?? 0
}

export async function GET() {
  const timestamp = new Date().toISOString()

  let supabaseStatus: 'connected' | 'error' = 'error'
  let supabaseError: string | null = null
  let papers_count = 0
  let enrichments_count = 0
  let papers_without_enrichment = 0
  let latest_paper: string | null = null
  let latest_enrichment: string | null = null
  let enrichment_breakdown: Record<string, number> = {}
  let queue_breakdown: Record<string, number> = {}

  try {
    const supabase = await createClient()

    const [papersRes, enrichmentsRes] = await Promise.all([
      supabase.from('papers').select('*', { count: 'exact', head: false }).limit(0),
      supabase.from('enrichments').select('*', { count: 'exact', head: false }).limit(0),
    ])

    if (papersRes.error) throw papersRes.error
    if (enrichmentsRes.error) throw enrichmentsRes.error

    supabaseStatus = 'connected'
    papers_count = papersRes.count ?? 0
    enrichments_count = enrichmentsRes.count ?? 0
    papers_without_enrichment = papers_count - enrichments_count

    const [latestPaper, latestEnrichment] = await Promise.all([
      supabase.from('papers').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('enrichments').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    latest_paper = latestPaper.data?.created_at ?? null
    latest_enrichment = latestEnrichment.data?.created_at ?? null

    // Enrichment status breakdown
    const enrichmentStatuses = ['pending', 'processing', 'auto_committed', 'needs_review', 'flagged', 'failed']
    const enrichmentCounts = await Promise.all(
      enrichmentStatuses.map(s => countWhere(supabase, 'enrichments', 'enrichment_status', s))
    )
    enrichmentStatuses.forEach((s, i) => {
      if (enrichmentCounts[i] > 0) enrichment_breakdown[s] = enrichmentCounts[i]
    })

    // Queue status breakdown
    const queueStatuses = ['pending', 'processing', 'done', 'failed']
    const queueCounts = await Promise.all(
      queueStatuses.map(s => countWhere(supabase, 'ingestion_queue', 'status', s))
    )
    queueStatuses.forEach((s, i) => {
      if (queueCounts[i] > 0) queue_breakdown[s] = queueCounts[i]
    })
  } catch (e) {
    supabaseError = serializeError(e)
  }

  const now = Date.now()
  const paperAge = latest_paper ? (now - new Date(latest_paper).getTime()) / 3_600_000 : null
  const enrichmentAge = latest_enrichment ? (now - new Date(latest_enrichment).getTime()) / 3_600_000 : null
  const paperAgeStr = paperAge !== null ? `${paperAge.toFixed(1)} h ago` : 'unknown'
  const pipelineRecentlyRan = paperAge !== null && paperAge < 48

  return NextResponse.json({
    status: 'ok',
    timestamp,
    checks: {
      supabase: {
        status: supabaseStatus,
        ...(supabaseError ? { error: supabaseError } : {}),
        papers_count,
        enrichments_count,
        papers_without_enrichment,
        latest_paper,
        latest_enrichment,
        enrichment_breakdown,
        queue_breakdown,
      },
      pipeline: {
        inference: papers_count === 0
          ? 'no_data'
          : pipelineRecentlyRan
          ? `active — last paper ${paperAgeStr}`
          : `idle — last paper ${paperAgeStr}`,
        recently_ran: pipelineRecentlyRan,
        last_paper_hours_ago: paperAge !== null ? +paperAge.toFixed(1) : null,
        last_enrichment_hours_ago: enrichmentAge !== null ? +enrichmentAge.toFixed(1) : null,
      },
      env: {
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    },
  })
}
