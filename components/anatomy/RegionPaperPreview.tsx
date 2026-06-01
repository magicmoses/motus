import { createClient } from '@/lib/supabase/server'
import { EvidenceBadge } from '@/components/feed/EvidenceBadge'

const REGION_LABELS: Record<string, string> = {
  calves: 'Calves', quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes',
  core: 'Core', lower_back: 'Lower Back', hip_flexors: 'Hip Flexors',
  hip_abductors: 'Hip Abductors', knees: 'Knees', achilles: 'Achilles',
  shoulders: 'Shoulders', neck: 'Neck', grip_forearms: 'Forearms',
  ankles: 'Ankles', it_band: 'IT Band', foot: 'Foot', lats: 'Lats',
}

type SortOption = 'newest' | 'best'

interface Props {
  region: string
  sort: SortOption
}

export async function RegionPaperPreview({ region, sort }: Props) {
  const supabase = await createClient()

  let q = supabase
    .from('enriched_papers')
    .select('id, title, evidence_level, sports, published_at, citation_count')
    .contains('body_regions', [region])

  if (sort === 'best') {
    q = q
      .order('citation_count', { ascending: false, nullsFirst: false })
      .order('evidence_level', { ascending: true, nullsFirst: false })
      .order('published_at', { ascending: false, nullsFirst: false })
  } else {
    q = q
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('evidence_level', { ascending: true, nullsFirst: false })
  }

  const [{ count }, { data }] = await Promise.all([
    supabase
      .from('enriched_papers')
      .select('id', { count: 'exact', head: true })
      .contains('body_regions', [region]),
    q.limit(4),
  ])

  const label = REGION_LABELS[region] ?? region
  const total = count ?? 0
  const papers = (data ?? []) as Array<{
    id: string; title: string; evidence_level: number | null
    sports: string[] | null; published_at: string | null; citation_count: number | null
  }>

  if (papers.length === 0) {
    return (
      <p className="text-xs text-gray-400 py-2">
        No papers indexed for {label} yet.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {label} — {total} paper{total !== 1 ? 's' : ''}
      </p>
      <ul className="space-y-2">
        {papers.map((p) => (
          <li key={p.id}>
            <a
              href={`/paper/${p.id}`}
              className="block group"
            >
              <p className="text-xs font-medium text-gray-800 group-hover:text-blue-600 leading-snug line-clamp-2">
                {p.title}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {p.evidence_level && (
                  <EvidenceBadge level={p.evidence_level as 1 | 2 | 3 | 4} />
                )}
                {p.citation_count != null && (
                  <span className="text-[10px] text-gray-400">
                    {p.citation_count.toLocaleString()} citations
                  </span>
                )}
                {Array.isArray(p.sports) && p.sports.slice(0, 2).map((s: string) => (
                  <span key={s} className="text-[10px] text-gray-400 capitalize">
                    {s.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </a>
          </li>
        ))}
      </ul>
      {total > 4 && (
        <a
          href={`/explore?region=${region}`}
          className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
        >
          See all {total} papers →
        </a>
      )}
    </div>
  )
}
