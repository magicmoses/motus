import Link from 'next/link'
import type { PaperWithEnrichment } from '@/types/supabase'
import { EvidenceBadge } from './EvidenceBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function truncate(text: string | null, maxWords: number): string {
  if (!text) return ''
  const words = text.split(' ')
  if (words.length <= maxWords) return text
  return words.slice(0, maxWords).join(' ') + '…'
}

export function FeedCard({ paper }: { paper: PaperWithEnrichment }) {
  const enrichment = paper.enrichments?.[0] ?? null
  const sports: string[] = enrichment?.sports ?? []

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/paper/${paper.id}`}
            className="font-semibold text-gray-900 hover:text-blue-700 leading-snug line-clamp-2"
          >
            {paper.title}
          </Link>
          <EvidenceBadge level={enrichment?.evidence_level ?? null} />
        </div>
        <p className="text-xs text-gray-500">
          {paper.journal && <span>{paper.journal}</span>}
          {paper.journal && paper.published_at && <span className="mx-1">&middot;</span>}
          {paper.published_at && <span>{formatDate(paper.published_at)}</span>}
        </p>
      </CardHeader>
      <CardContent>
        {enrichment?.summary && (
          <p className="text-sm text-gray-700 mb-3">
            {truncate(enrichment.summary, 60)}
          </p>
        )}
        {sports.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sports.map((sport) => (
              <Badge key={sport} variant="outline" className="text-xs capitalize">
                {sport.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
