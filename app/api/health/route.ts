import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { count, error } = await supabase
      .from('papers')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    return NextResponse.json({
      status: 'ok',
      supabase: 'connected',
      papers_count: count ?? 0,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: 'ok',
      supabase: 'error',
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 200 })
  }
}
