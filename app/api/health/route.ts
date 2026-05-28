import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function serializeError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'object' && e !== null) {
    const pg = e as Record<string, unknown>
    const code = typeof pg.code === 'string' ? pg.code : ''
    const message = typeof pg.message === 'string' ? pg.message : ''
    const hint = typeof pg.hint === 'string' ? pg.hint : ''
    const details = typeof pg.details === 'string' ? pg.details : ''
    return JSON.stringify({ code, message, hint, details })
  }
  return String(e)
}

async function rawPing(url: string, anonKey: string): Promise<'reachable' | 'paused' | 'auth_error' | 'unreachable'> {
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) return 'reachable'
    if (res.status === 503) return 'paused'
    if (res.status === 401 || res.status === 403) return 'auth_error'
    return 'unreachable'
  } catch {
    return 'unreachable'
  }
}

export async function GET() {
  const timestamp = new Date().toISOString()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  // Env sanity
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl.length > 0,
    NEXT_PUBLIC_SUPABASE_URL_prefix: supabaseUrl.slice(0, 30) || '(empty)',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey.length > 0,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_prefix: supabaseKey.slice(0, 20) || '(empty)',
  }

  // Raw HTTP ping — tells us if project is paused or key is wrong before even using the client
  const ping = await rawPing(supabaseUrl, supabaseKey)

  let supabaseStatus: 'connected' | 'error' = 'error'
  let supabaseError: string | null = null
  let papers_count = 0
  let enrichments_count = 0
  let latest_paper: string | null = null
  let latest_enrichment: string | null = null
  let latest_enrichment_status: string | null = null
  let queue: Record<string, number> | string = {}

  if (ping === 'reachable') {
    try {
      const supabase = await createClient()

      const [papersCount, enrichmentsCount] = await Promise.all([
        supabase.from('papers').select('*', { count: 'exact', head: true }),
        supabase.from('enrichments').select('*', { count: 'exact', head: true }),
      ])

      if (papersCount.error) throw papersCount.error
      if (enrichmentsCount.error) throw enrichmentsCount.error

      supabaseStatus = 'connected'
      papers_count = papersCount.count ?? 0
      enrichments_count = enrichmentsCount.count ?? 0

      const [latestPaper, latestEnrichment] = await Promise.all([
        supabase.from('papers').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('enrichments').select('created_at, enrichment_status').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])

      latest_paper = latestPaper.data?.created_at ?? null
      latest_enrichment = latestEnrichment.data?.created_at ?? null
      latest_enrichment_status = latestEnrichment.data?.enrichment_status ?? null

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
  } else {
    supabaseError = `ping=${ping} — ${ping === 'paused' ? 'project is paused (resume in Supabase dashboard)' : ping === 'auth_error' ? 'invalid anon key' : 'project unreachable'}`
  }

  // Pipeline inference
  const now = Date.now()
  const paperAge = latest_paper ? (now - new Date(latest_paper).getTime()) / 3_600_000 : null
  const enrichmentAge = latest_enrichment ? (now - new Date(latest_enrichment).getTime()) / 3_600_000 : null
  const paperAgeStr = paperAge !== null ? `${paperAge.toFixed(1)} h ago` : 'unknown'
  const pipelineEverRan = papers_count > 0
  const pipelineRecentlyRan = paperAge !== null && paperAge < 48

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
        ping,
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
      env,
    },
  })
}
