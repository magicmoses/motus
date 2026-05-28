import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { FeedList } from '@/components/feed/FeedList'
import { FilterBar } from '@/components/feed/FilterBar'
import { Pagination } from '@/components/feed/Pagination'
import type { PaperWithEnrichment } from '@/types/supabase'

const PAGE_SIZE = 20

interface Props {
  searchParams: Promise<{
    sport?: string
    topic?: string
    region?: string
    search?: string
    page?: string
  }>
}

async function PaperFeed({
  sport,
  topic,
  region,
  search,
  page,
}: {
  sport?: string
  topic?: string
  region?: string
  search?: string
  page: number
}) {
  const supabase = await createClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Count and data queries run in parallel with identical filters
  let countQ = supabase
    .from('papers')
    .select('*, enrichments!inner(*)', { count: 'exact', head: true })
    .eq('enrichments.enrichment_status', 'auto_committed')
  if (sport) countQ = countQ.contains('enrichments.sports', [sport])
  if (topic) countQ = countQ.contains('enrichments.topics', [topic])
  if (region) countQ = countQ.contains('enrichments.body_regions', [region])
  if (search) countQ = countQ.ilike('title', `%${search}%`)

  let dataQ = supabase
    .from('papers')
    .select('*, enrichments!inner(*)')
    .eq('enrichments.enrichment_status', 'auto_committed')
  if (sport) dataQ = dataQ.contains('enrichments.sports', [sport])
  if (topic) dataQ = dataQ.contains('enrichments.topics', [topic])
  if (region) dataQ = dataQ.contains('enrichments.body_regions', [region])
  if (search) dataQ = dataQ.ilike('title', `%${search}%`)

  const [{ count }, { data, error }] = await Promise.all([
    countQ,
    dataQ.order('published_at', { ascending: false, nullsFirst: false }).range(from, to),
  ])

  if (error) {
    return <p className="text-red-500 text-sm">Failed to load papers: {error.message}</p>
  }

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <FeedList papers={(data ?? []) as PaperWithEnrichment[]} />
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/new"
        params={{ sport, topic, region, search }}
      />
    </>
  )
}

export default async function NewPage({ searchParams }: Props) {
  const { sport, topic, region, search, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10))

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Latest Research</h1>
      <p className="text-sm text-gray-500 mb-6">New papers from PubMed, Semantic Scholar, and arXiv</p>
      <Suspense>
        <FilterBar />
      </Suspense>
      <Suspense fallback={<p className="text-gray-400 text-sm">Loading&hellip;</p>}>
        <PaperFeed sport={sport} topic={topic} region={region} search={search} page={page} />
      </Suspense>
    </main>
  )
}
