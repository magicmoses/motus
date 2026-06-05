'use client'

import { useState } from 'react'
import { ResearchRouletteSection } from '@/components/explore/ResearchRouletteSection'
import { InjuryRiskExplorerSection } from '@/components/explore/InjuryRiskExplorerSection'

type TabType = 'roulette' | 'injury-risk'

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<TabType>('roulette')

  return (
    <main className="w-full bg-white">
      {/* Header */}
      <div className="border-b bg-white sticky top-14 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Explore Research</h1>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('roulette')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'roulette'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Research Roulette
            </button>
            <button
              onClick={() => setActiveTab('injury-risk')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'injury-risk'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Injury Prevention
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'roulette' && <ResearchRouletteSection />}
        {activeTab === 'injury-risk' && <InjuryRiskExplorerSection />}
      </div>
    </main>
  )
}
