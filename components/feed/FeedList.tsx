import type { PaperWithEnrichment } from '@/types/supabase'
import { FeedCard } from './FeedCard'

export function FeedList({ papers }: { papers: PaperWithEnrichment[] }) {
  if (papers.length === 0) {
    return (
      <p className="text-center text-gray-500 py-12">No papers found.</p>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {papers.map((paper) => (
        <FeedCard key={paper.id} paper={paper} />
      ))}
    </div>
  )
}
