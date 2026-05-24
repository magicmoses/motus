import { Badge } from '@/components/ui/badge'

const COLORS: Record<number, string> = {
  1: 'bg-green-100 text-green-800 hover:bg-green-100',
  2: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  3: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  4: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
}

const LABELS: Record<number, string> = {
  1: 'RCT / Meta',
  2: 'Cohort',
  3: 'Case study',
  4: 'Mechanistic',
}

export function EvidenceBadge({ level }: { level: number | null }) {
  if (!level) return null
  return (
    <Badge className={COLORS[level] ?? COLORS[4]}>
      {LABELS[level] ?? `Level ${level}`}
    </Badge>
  )
}
