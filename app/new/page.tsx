import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { toFeedPaper } from '@/lib/feed'
import { FeedList } from '@/components/feed/FeedList'
import { FilterBar } from '@/components/feed/FilterBar'
import { Pagination } from '@/components/feed/Pagination'
import { EvidenceLegend } from '@/components/feed/EvidenceLegend'

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
  sport, topic, region, search, page,
}: {
  sport?: string; topic?: string; region?: string; search?: string; page: number
}) {
  const supabase = await createClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let countQ = supabase.from('enriched_papers').select('id', { count: 'exact', head: true })
  if (sport)  countQ = countQ.contains('sports', [sport])
  if (topic)  countQ = countQ.contains('topics', [topic])
  if (region) countQ = countQ.contains('body_regions', [region])

  let dataQ = supabase.from('enriched_papers').select('*')
  if (sport)  dataQ = dataQ.contains('sports', [sport])
  if (topic)  dataQ = dataQ.contains('topics', [topic])
  if (region) dataQ = dataQ.contains('body_regions', [region])
  if (search) dataQ = dataQ.ilike('title', `%${search}%`)

  const [{ count }, { data, error }] = await Promise.all([
    countQ,
    dataQ
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .range(from, to),
  ])

  if (error) {
    return <p className="text-red-500 text-sm">Failed to load papers: {error.message}</p>
  }

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <FeedList papers={(data ?? []).map(r => toFeedPaper(r as Record<string, unknown>))} />
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/new"
        params={{ sport, topic, region, search }}
      />
      <EvidenceLegend />
    </>
  )
}

export default async function NewPage({ searchParams }: Props) {
  const { sport, topic, region, search, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Latest Research</h1>
      <p className="text-sm text-gray-500 mb-6">Papers from PubMed, Semantic Scholar, and arXiv</p>
      <Suspense>
        <FilterBar />
      </Suspense>
      <Suspense fallback={<p className="text-gray-400 text-sm">Loading&hellip;</p>}>
        <PaperFeed sport={sport} topic={topic} region={region} search={search} page={page} />
      </Suspense>
    </main>
  )
}
