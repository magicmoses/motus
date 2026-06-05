'use client'

import Link from 'next/link'

interface Paper {
  id: string
  title: string
  summary: string
  sport: string[]
  body_regions: string[]
  evidence_level: string
  doi?: string
}

interface ResultCardProps {
  paper: Paper
  onSpinAgain: () => void
}

const EVIDENCE_COLORS: Record<string, string> = {
  'meta-analysis': 'bg-green-100 text-green-800',
  'rct': 'bg-blue-100 text-blue-800',
  'cohort': 'bg-yellow-100 text-yellow-800',
  'case-report': 'bg-gray-100 text-gray-800',
}

export function ResultCard({ paper, onSpinAgain }: ResultCardProps) {
  const badgeClass = EVIDENCE_COLORS[paper.evidence_level] || 'bg-gray-100 text-gray-800'

  return (
    <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8">
        {/* Header with celebration */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-2xl font-bold text-gray-900 flex-1">{paper.title}</h3>
            <span className="text-2xl ml-4">🎉</span>
          </div>
          <p className="text-gray-600">You discovered something interesting!</p>
        </div>

        {/* Summary */}
        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed">{paper.summary}</p>
        </div>

        {/* Metadata */}
        <div className="mb-6 flex flex-wrap gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
            {paper.evidence_level.replace('-', ' ').toUpperCase()}
          </span>
          {paper.sport && paper.sport[0] && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
              {paper.sport[0]}
            </span>
          )}
          {paper.body_regions && paper.body_regions[0] && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
              {paper.body_regions[0]}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <Link
            href={`/paper/${paper.id}`}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors text-center"
          >
            Read Full Paper
          </Link>
          <button
            onClick={onSpinAgain}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Spin Again
          </button>
        </div>
      </div>
    </div>
  )
}
