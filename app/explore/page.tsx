import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { toFeedPaper } from '@/lib/feed'
import { FeedList } from '@/components/feed/FeedList'
import { Pagination } from '@/components/feed/Pagination'
import { EvidenceLegend } from '@/components/feed/EvidenceLegend'
import { BodyMap } from '@/components/anatomy/BodyMap'

const PAGE_SIZE = 20

interface Props {
  searchParams: Promise<{
    region?: string
    page?: string
  }>
}

async function RegionFeed({ region, page }: { region?: string; page: number }) {
  if (!region) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Select a body region above to filter papers
      </p>
    )
  }

  const supabase = await createClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const [{ count }, { data, error }] = await Promise.all([
    supabase
      .from('enriched_papers')
      .select('id', { count: 'exact', head: true })
      .contains('body_regions', [region]),
    supabase
      .from('enriched_papers')
      .select('*')
      .contains('body_regions', [region])
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
        basePath="/explore"
        params={{ region }}
      />
      <EvidenceLegend />
    </>
  )
}

export default async function ExplorePage({ searchParams }: Props) {
  const { region, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Explore by Body Region</h1>
      <p className="text-sm text-gray-500 mb-6">Navigate anatomy to find relevant research</p>
      <Suspense>
        <BodyMap />
      </Suspense>
      <Suspense fallback={<p className="text-gray-400 text-sm">Loading&hellip;</p>}>
        <RegionFeed region={region} page={page} />
      </Suspense>
    </main>
  )
}
