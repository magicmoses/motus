import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { FeedList } from '@/components/feed/FeedList'
import { FilterBar } from '@/components/feed/FilterBar'
import type { PaperWithEnrichment } from '@/types/supabase'

interface Props {
  searchParams: Promise<{ sport?: string; topic?: string }>
}

async function PaperFeed({ sport }: { sport?: string }) {
  const supabase = await createClient()

  let query = supabase
    .from('papers')
    .select('*, enrichments(*)')
    .eq('enrichments.enrichment_status', 'auto_committed')
    .order('created_at', { ascending: false })
    .limit(20)

  if (sport) {
    query = query.contains('enrichments.sports', [sport])
  }

  const { data, error } = await query

  if (error) {
    return <p className="text-red-500">Failed to load papers.</p>
  }

  return <FeedList papers={(data ?? []) as PaperWithEnrichment[]} />
}

export default async function NewPage({ searchParams }: Props) {
  const { sport } = await searchParams

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Latest Research</h1>
      <Suspense>
        <FilterBar />
      </Suspense>
      <Suspense fallback={<p className="text-gray-400">Loading&hellip;</p>}>
        <PaperFeed sport={sport} />
      </Suspense>
    </main>
  )
}
