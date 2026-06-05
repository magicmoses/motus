'use client'

import { useState } from 'react'
import Link from 'next/link'

interface PreventionStrategy {
  name: string
  effectiveness: number // percentage reduction
  implementation: string
}

interface Injury {
  id: string
  name: string
  riskLevel: 'high' | 'medium' | 'low'
  mechanism: string // 1-2 sentences
  preventionStrategies: PreventionStrategy[]
  relatedPaperCount: number
}

// Injury to body_region mapping for searching papers
const INJURY_TO_REGION: Record<string, string> = {
  "Runner's Knee": 'knee',
  'Plantar Fasciitis': 'foot',
  'Shin Splints': 'calves',
  'IT Band Syndrome': 'knee',
  'Achilles Tendinopathy': 'achilles',
}

// Temp data — senare aus Supabase
const RUNNING_INJURIES: Injury[] = [
  {
    id: '1',
    name: "Runner's Knee",
    riskLevel: 'high',
    mechanism: 'Repetitive stress on the patellofemoral joint from overuse or muscle imbalances.',
    preventionStrategies: [
      { name: 'Strengthen quadriceps', effectiveness: 23, implementation: '3x/week for 8 weeks' },
      { name: 'Gait retraining', effectiveness: 18, implementation: 'Work with coach on technique' },
      { name: 'Gradual mileage increase', effectiveness: 15, implementation: '+10% per week max' },
    ],
    relatedPaperCount: 47,
  },
  {
    id: '2',
    name: 'Plantar Fasciitis',
    riskLevel: 'high',
    mechanism: 'Inflammation of the tissue under the foot from repetitive strain or tight calf muscles.',
    preventionStrategies: [
      { name: 'Calf stretching', effectiveness: 25, implementation: '2x/day, 30 sec holds' },
      { name: 'Foot strengthening', effectiveness: 20, implementation: '3x/week exercises' },
      { name: 'Proper footwear', effectiveness: 16, implementation: 'Supportive arch' },
    ],
    relatedPaperCount: 52,
  },
  {
    id: '3',
    name: 'Shin Splints',
    riskLevel: 'medium',
    mechanism: 'Tibial stress from repetitive impact, often from sudden increases in training volume.',
    preventionStrategies: [
      { name: 'Gradual volume increase', effectiveness: 30, implementation: 'Follow 10% rule' },
      { name: 'Strength training', effectiveness: 22, implementation: '2x/week lower leg' },
      { name: 'Recovery emphasis', effectiveness: 18, implementation: 'Easy days between hard runs' },
    ],
    relatedPaperCount: 38,
  },
  {
    id: '4',
    name: 'IT Band Syndrome',
    riskLevel: 'medium',
    mechanism: 'Tightness in the iliotibial band causing friction at the knee during running.',
    preventionStrategies: [
      { name: 'Hip strengthening', effectiveness: 28, implementation: '3x/week glute exercises' },
      { name: 'Foam rolling', effectiveness: 20, implementation: 'Daily, 1–2 min per side' },
      { name: 'Running form assessment', effectiveness: 17, implementation: 'Video analysis' },
    ],
    relatedPaperCount: 41,
  },
  {
    id: '5',
    name: 'Achilles Tendinopathy',
    riskLevel: 'medium',
    mechanism: 'Tendon stress from overuse, poor flexibility, or sudden increases in intensity.',
    preventionStrategies: [
      { name: 'Eccentric strengthening', effectiveness: 32, implementation: '3x/week, 3 sets' },
      { name: 'Calf flexibility work', effectiveness: 24, implementation: 'Daily stretching' },
      { name: 'Gradual load increase', effectiveness: 19, implementation: 'Progressive overload' },
    ],
    relatedPaperCount: 35,
  },
]

export function InjuryRiskExplorerSection() {
  const [injuries, setInjuries] = useState<Injury[]>(RUNNING_INJURIES)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-50 border-red-200'
      case 'medium':
        return 'bg-yellow-50 border-yellow-200'
      case 'low':
        return 'bg-green-50 border-green-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <span className="text-lg">🔴</span>
      case 'medium':
        return <span className="text-lg">🟡</span>
      case 'low':
        return <span className="text-lg">🟢</span>
      default:
        return <span className="text-lg">⚪</span>
    }
  }

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Common Running Injuries</h2>
        <p className="text-gray-600">
          Learn about injury risks for runners and evidence-based prevention strategies. Data from peer-reviewed research.
        </p>
      </div>

      {/* Injuries List */}
      <div className="space-y-4">
        {injuries.map((injury) => (
          <div
            key={injury.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${getRiskColor(injury.riskLevel)}`}
            onClick={() => setExpandedId(expandedId === injury.id ? null : injury.id)}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3 flex-1">
                <div className="flex-shrink-0">{getRiskBadge(injury.riskLevel)}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{injury.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{injury.mechanism}</p>
                </div>
              </div>
              <button
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-xl"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedId(expandedId === injury.id ? null : injury.id)
                }}
              >
                {expandedId === injury.id ? '−' : '+'}
              </button>
            </div>

            {/* Expanded Content */}
            {expandedId === injury.id && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 animate-in fade-in duration-200">
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-3">Prevention Strategies</h4>
                  <div className="space-y-2">
                    {injury.preventionStrategies.map((strategy, idx) => (
                      <div key={idx} className="bg-white rounded p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900 text-sm">{strategy.name}</span>
                          <span className="text-xs font-semibold text-blue-600">
                            {strategy.effectiveness}% reduction
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{strategy.implementation}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <Link
                    href={`/new?sport=running&region=${INJURY_TO_REGION[injury.name]}`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View {injury.relatedPaperCount} research papers →
                  </Link>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-900">
          <strong>Note:</strong> This information is educational and based on peer-reviewed research. Not a substitute for medical advice. Consult a healthcare provider for injury diagnosis and treatment.
        </p>
      </div>
    </div>
  )
}
