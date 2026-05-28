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

async function rawPing(url: string, anonKey: string) {
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      cache: 'no-store',
    })
    const body = await res.text().catch(() => '')
    return {
      http_status: res.status,
      ok: res.ok,
      body_preview: body.slice(0, 300),
    }
  } catch (e) {
    return { http_status: null, ok: false, body_preview: String(e) }
  }
}

export async function GET() {
  const timestamp = new Date().toISOString()

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl.length > 0,
    NEXT_PUBLIC_SUPABASE_URL_value: supabaseUrl.slice(0, 40) || '(empty)',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey.length > 0,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_prefix: supabaseKey.slice(0, 40) || '(empty)',
  }

  // Raw HTTP ping — diagnostic only, does NOT gate the client test below
  const ping = await rawPing(supabaseUrl, supabaseKey)

  // Always attempt Supabase client queries regardless of ping result
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

  const now = Date.now()
  const paperAge = latest_paper ? (now - new Date(latest_paper).getTime()) / 3_600_000 : null
  const enrichmentAge = latest_enrichment ? (now - new Date(latest_enrichment).getTime()) / 3_600_000 : null
  const paperAgeStr = paperAge !== null ? `${paperAge.toFixed(1)} h ago` : 'unknown'
  const pipelineEverRan = papers_count > 0
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
        latest_paper,
        latest_enrichment,
        latest_enrichment_status,
        queue,
      },
      ping,
      pipeline: {
        inference: !pipelineEverRan
          ? 'no_data'
          : pipelineRecentlyRan
          ? `active — last paper ${paperAgeStr}`
          : `idle — last paper ${paperAgeStr}`,
        ever_ran: pipelineEverRan,
        recently_ran: pipelineRecentlyRan,
        last_paper_hours_ago: paperAge !== null ? +paperAge.toFixed(1) : null,
        last_enrichment_hours_ago: enrichmentAge !== null ? +enrichmentAge.toFixed(1) : null,
      },
      env,
    },
  })
}
