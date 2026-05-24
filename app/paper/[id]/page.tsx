import { createClient } from '@/lib/supabase/server'
import { EvidenceBadge } from '@/components/feed/EvidenceBadge'
import { Badge } from '@/components/ui/badge'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PaperPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: paper } = await supabase
    .from('papers')
    .select('*, enrichments(*)')
    .eq('id', id)
    .single()

  if (!paper) notFound()

  const enrichment = paper.enrichments?.[0] ?? null
  const sports: string[] = enrichment?.sports ?? []
  const topics: string[] = enrichment?.topics ?? []

  function formatDate(d: string | null) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-2 flex items-center gap-2 flex-wrap">
        <EvidenceBadge level={enrichment?.evidence_level ?? null} />
        {sports.map((s) => (
          <Badge key={s} variant="outline" className="capitalize">{s.replace('_', ' ')}</Badge>
        ))}
      </div>

      <h1 className="text-2xl font-bold mb-1">{paper.title}</h1>

      <p className="text-sm text-gray-500 mb-6">
        {paper.journal && <span>{paper.journal}</span>}
        {paper.journal && paper.published_at && <span className="mx-1">&middot;</span>}
        {paper.published_at && <span>{formatDate(paper.published_at)}</span>}
        {paper.authors && paper.authors.length > 0 && (
          <span> &middot; {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''}</span>
        )}
      </p>

      {enrichment?.summary && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-blue-900 mb-1">Summary</p>
          <p className="text-sm text-blue-800">{enrichment.summary}</p>
        </div>
      )}

      {paper.abstract && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-1">Abstract</p>
          <p className="text-sm text-gray-600 leading-relaxed">{paper.abstract}</p>
        </div>
      )}

      {topics.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Topics</p>
          <div className="flex flex-wrap gap-1">
            {topics.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs capitalize">{t.replace('_', ' ')}</Badge>
            ))}
          </div>
        </div>
      )}

      {paper.source_url && (
        <a
          href={paper.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          View source &rarr;
        </a>
      )}
    </main>
  )
}
