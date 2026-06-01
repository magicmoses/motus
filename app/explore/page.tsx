import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { toFeedPaper } from '@/lib/feed'
import { FeedList } from '@/components/feed/FeedList'
import { Pagination } from '@/components/feed/Pagination'
import { EvidenceLegend } from '@/components/feed/EvidenceLegend'
import { BodyMap } from '@/components/anatomy/BodyMap'
import { RegionPaperPreview } from '@/components/anatomy/RegionPaperPreview'
import { SortToggle } from '@/components/anatomy/SortToggle'

type SortOption = 'newest' | 'best'

const PAGE_SIZE = 20

interface Props {
  searchParams: Promise<{
    region?: string
    sort?: string
    page?: string
  }>
}

async function RegionFeed({ region, sort, page }: { region?: string; sort: SortOption; page: number }) {
  if (!region) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Select a body region above to browse papers
      </p>
    )
  }

  const supabase = await createClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let dataQ = supabase
    .from('enriched_papers')
    .select('*')
    .contains('body_regions', [region])

  if (sort === 'best') {
    dataQ = dataQ
      .order('citation_count', { ascending: false, nullsFirst: false })
      .order('evidence_level', { ascending: true, nullsFirst: false })
      .order('published_at', { ascending: false, nullsFirst: false })
  } else {
    dataQ = dataQ
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
  }

  const [countRes, { data, error }] = await Promise.all([
    supabase
      .from('enriched_papers')
      .select('id', { count: 'exact', head: true })
      .contains('body_regions', [region]),
    dataQ.range(from, to),
  ])

  if (error || countRes.error) {
    return <p className="text-red-500 text-sm">Failed to load papers: {(error ?? countRes.error)!.message}</p>
  }

  const total = countRes.count ?? 0
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
        params={{ region, sort }}
      />
      <EvidenceLegend />
    </>
  )
}

export default async function ExplorePage({ searchParams }: Props) {
  const { region, sort: sortParam, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const sort: SortOption = sortParam === 'best' ? 'best' : 'newest'

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold">Explore by Body Region</h1>
        {region && (
          <Suspense>
            <SortToggle sort={sort} />
          </Suspense>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">Navigate anatomy to find relevant research</p>

      <div className="flex gap-6 mb-8">
        <Suspense>
          <BodyMap />
        </Suspense>
        {region ? (
          <div className="flex-1 min-w-0 pt-1">
            <Suspense fallback={<p className="text-xs text-gray-400">Loading papers…</p>}>
              <RegionPaperPreview region={region} sort={sort} />
            </Suspense>
          </div>
        ) : (
          <div className="flex-1 min-w-0 pt-1 flex items-center">
            <p className="text-xs text-gray-400 leading-relaxed">
              Click a highlighted region on the body map to preview relevant papers.
            </p>
          </div>
        )}
      </div>

      <Suspense fallback={<p className="text-gray-400 text-sm">Loading&hellip;</p>}>
        <RegionFeed region={region} sort={sort} page={page} />
      </Suspense>
    </main>
  )
}
