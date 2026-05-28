import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { FeedList } from '@/components/feed/FeedList'
import { FilterBar } from '@/components/feed/FilterBar'
import type { PaperWithEnrichment } from '@/types/supabase'

interface Props {
  searchParams: Promise<{
    sport?: string
    topic?: string
    region?: string
    search?: string
  }>
}

async function PersonalizedFeed({
  sport,
  topic,
  region,
  search,
}: {
  sport?: string
  topic?: string
  region?: string
  search?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('papers')
    .select('*, enrichments!inner(*)')
    .eq('enrichments.enrichment_status', 'auto_committed')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(20)

  if (sport) query = query.contains('enrichments.sports', [sport])
  if (topic) query = query.contains('enrichments.topics', [topic])
  if (region) query = query.contains('enrichments.body_regions', [region])
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, error } = await query

  if (error) {
    return <p className="text-red-500 text-sm">Failed to load papers: {error.message}</p>
  }

  return <FeedList papers={(data ?? []) as PaperWithEnrichment[]} />
}

export default async function ForYouPage({ searchParams }: Props) {
  const { sport, topic, region, search } = await searchParams

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">For You</h1>
      <p className="text-sm text-gray-500 mb-6">
        Personalization by sport and interests coming soon — use the filters below in the meantime
      </p>
      <Suspense>
        <FilterBar />
      </Suspense>
      <Suspense fallback={<p className="text-gray-400 text-sm">Loading&hellip;</p>}>
        <PersonalizedFeed sport={sport} topic={topic} region={region} search={search} />
      </Suspense>
    </main>
  )
}
