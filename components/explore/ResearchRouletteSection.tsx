'use client'

import { useState, useEffect } from 'react'
import { WheelComponent } from './wheel/WheelComponent'
import { ResultCard } from './ResultCard'
import { createClient } from '@/lib/supabase/client'

interface Paper {
  id: string
  title: string
  summary: string
  sport: string[]
  body_regions: string[]
  evidence_level: string
  abstract?: string
  doi?: string
}

export function ResearchRouletteSection() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [resultPaper, setResultPaper] = useState<Paper | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPapers()
  }, [])

  async function loadPapers() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('enriched_papers')
        .select('id, title, summary, body_regions, evidence_level, abstract, doi')
        .limit(12)
        .order('published_at', { ascending: false })

      if (error) throw error
      // Map data to Paper type
      const papers = (data || []).map((p: any) => ({
        ...p,
        sport: p.body_regions ? ['running'] : ['running'], // Default to running for now
      }))
      setPapers(papers as Paper[])
    } catch (error) {
      console.error('Failed to load papers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSpin = (selectedPaper: Paper) => {
    setIsSpinning(true)
    // Simulate spin animation duration
    setTimeout(() => {
      setResultPaper(selectedPaper)
      setIsSpinning(false)
    }, 3000)
  }

  const handleSpinAgain = () => {
    setResultPaper(null)
    // Reload papers for fresh spin
    loadPapers()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Loading papers...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Discover Your Next Paper</h2>
        <p className="text-gray-600">Spin the wheel to find a random research paper. Let serendipity guide your learning.</p>
      </div>

      {/* Wheel Section */}
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-80 h-80">
          <WheelComponent papers={papers} onSpin={handleSpin} isSpinning={isSpinning} />
        </div>
      </div>

      {/* Spin Button */}
      <div className="flex justify-center">
        <button
          onClick={() => handleSpin(papers[Math.floor(Math.random() * papers.length)])}
          disabled={isSpinning || papers.length === 0}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSpinning ? 'Spinning...' : 'Spin the Wheel'}
        </button>
      </div>

      {/* Result */}
      {resultPaper && !isSpinning && (
        <div className="flex justify-center">
          <ResultCard paper={resultPaper} onSpinAgain={handleSpinAgain} />
        </div>
      )}
    </div>
  )
}
