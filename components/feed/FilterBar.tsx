'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import type { SportName } from '@/types/supabase'

const SPORTS: { value: SportName; label: string }[] = [
  { value: 'running',   label: 'Running' },
  { value: 'cycling',   label: 'Cycling' },
  { value: 'rowing',    label: 'Rowing' },
  { value: 'skiing',    label: 'Skiing' },
  { value: 'triathlon', label: 'Triathlon' },
  { value: 'hyrox',     label: 'Hyrox' },
]

const MOVEMENT_PRACTICES: { value: string; label: string }[] = [
  { value: 'martial_arts',  label: 'Martial Arts' },
  { value: 'mind_body',     label: 'Mind-Body' },
  { value: 'yoga_pilates',  label: 'Yoga & Pilates' },
]

const RUNNING_DISTANCES: { value: string; label: string }[] = [
  { value: 'marathon',      label: 'Marathon' },
  { value: 'half_marathon', label: 'Half Marathon' },
  { value: 'ultramarathon', label: 'Ultra' },
  { value: 'trail_running', label: 'Trail' },
  { value: '5k_10k',        label: '5K / 10K' },
]

const DIMENSIONS: { value: string; label: string }[] = [
  { value: 'female_athlete',       label: "Women's Health" },
  { value: 'masters_longevity',    label: 'Masters & Longevity' },
  { value: 'supplements',          label: 'Supplements' },
  { value: 'technology_wearables', label: 'Tech & Wearables' },
  { value: 'ai_ml_research',       label: 'AI / ML' },
  { value: 'para_sport',           label: 'Para Sport' },
]

const TOPICS_QUICK: { value: string; label: string }[] = [
  { value: 'vo2max',      label: 'VO2max' },
  { value: 'hrv',         label: 'HRV' },
  { value: 'lactate',     label: 'Lactate' },
  { value: 'intervals',   label: 'Intervals' },
  { value: 'strength',    label: 'Strength' },
  { value: 'sleep',       label: 'Sleep' },
  { value: 'prevention',  label: 'Prevention' },
]

const TOPICS_EXTENDED: { value: string; label: string }[] = [
  { value: 'biomechanics',    label: 'Biomechanics' },
  { value: 'pacing',          label: 'Pacing' },
  { value: 'periodization',   label: 'Periodization' },
  { value: 'altitude',        label: 'Altitude' },
  { value: 'fatigue',         label: 'Fatigue' },
  { value: 'overtraining',    label: 'Overtraining' },
  { value: 'active_recovery', label: 'Recovery' },
  { value: 'carbohydrates',   label: 'Carbs' },
  { value: 'protein',         label: 'Protein' },
  { value: 'hydration',       label: 'Hydration' },
  { value: 'heat_performance',label: 'Heat' },
  { value: 'cardiac_output',  label: 'Cardiac Output' },
  { value: 'gut_health',      label: 'Gut Health' },
  { value: 'tendon',          label: 'Tendon' },
  { value: 'psychology',      label: 'Psychology' },
  { value: 'pacing_strategy', label: 'Pacing Strategy' },
  { value: 'pain_tolerance',  label: 'Pain Tolerance' },
]

const QUICK_VALUES = new Set(TOPICS_QUICK.map(t => t.value))

export function FilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()
  const [showAllTopics, setShowAllTopics] = useState(false)

  const activeSport    = params.get('sport')
  const activeMovement = params.get('movement') ?? ''
  const activeTopic    = params.get('topic') ?? ''
  const activeDimension = params.get('dimension') ?? ''
  const urlSearch      = params.get('search') ?? ''

  const [searchInput, setSearchInput] = useState(urlSearch)
  useEffect(() => { setSearchInput(urlSearch) }, [urlSearch])

  // Auto-expand topic list if the active topic is in the extended set
  useEffect(() => {
    if (activeTopic && !QUICK_VALUES.has(activeTopic)) setShowAllTopics(true)
  }, [activeTopic])

  const hasFilters = !!(activeSport || activeMovement || activeTopic || activeDimension || urlSearch || params.get('region'))

  function updateParams(updates: Record<string, string>) {
    const next = new URLSearchParams(params.toString())
    for (const [key, val] of Object.entries(updates)) {
      if (val) next.set(key, val)
      else next.delete(key)
    }
    next.delete('page')
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }

  function toggleSport(sport: SportName) {
    updateParams({ sport: activeSport === sport ? '' : sport })
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ search: searchInput })
  }

  const visibleTopics = showAllTopics
    ? [...TOPICS_QUICK, ...TOPICS_EXTENDED]
    : TOPICS_QUICK

  return (
    <div className="space-y-3 pb-5">

      {/* Row 1 — Discipline: endurance sports · movement practices */}
      <div className="flex flex-wrap items-center gap-2">
        {SPORTS.map(({ value, label }) => (
          <Badge
            key={value}
            variant={activeSport === value ? 'default' : 'outline'}
            className="cursor-pointer select-none"
            onClick={() => toggleSport(value)}
          >
            {label}
          </Badge>
        ))}
        <span className="text-gray-300 select-none px-0.5">·</span>
        {MOVEMENT_PRACTICES.map(({ value, label }) => (
          <Badge
            key={value}
            variant={activeMovement === value ? 'default' : 'outline'}
            className={`cursor-pointer select-none ${
              activeMovement === value
                ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600'
                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
            }`}
            onClick={() => updateParams({ movement: activeMovement === value ? '' : value })}
          >
            {label}
          </Badge>
        ))}
      </div>

      {/* Row 2 — Running distances (conditional) */}
      {activeSport === 'running' && (
        <div className="flex flex-wrap items-center gap-2 pl-1">
          <span className="text-xs text-gray-400 shrink-0">Distance:</span>
          {RUNNING_DISTANCES.map(({ value, label }) => (
            <Badge
              key={value}
              variant={activeTopic === value ? 'default' : 'outline'}
              className="cursor-pointer select-none text-xs"
              onClick={() => updateParams({ topic: activeTopic === value ? '' : value })}
            >
              {label}
            </Badge>
          ))}
        </div>
      )}

      {/* Row 3 — Research focus */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400 shrink-0">Research focus:</span>
        {DIMENSIONS.map(({ value, label }) => (
          <Badge
            key={value}
            variant={activeDimension === value ? 'default' : 'outline'}
            className={`cursor-pointer select-none text-xs ${
              activeDimension === value
                ? 'bg-violet-600 hover:bg-violet-700 border-violet-600'
                : 'border-violet-200 text-violet-700 hover:bg-violet-50'
            }`}
            onClick={() => updateParams({ dimension: activeDimension === value ? '' : value })}
          >
            {label}
          </Badge>
        ))}
      </div>

      {/* Row 4 — Search + topic chips + clear */}
      <form onSubmit={handleSearchSubmit} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search papers…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onBlur={() => updateParams({ search: searchInput })}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-700 placeholder-gray-400"
          />
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setShowAllTopics(false); router.push(pathname) }}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-700 border border-gray-200 rounded-md transition-colors whitespace-nowrap"
            >
              × Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {visibleTopics.map(({ value, label }) => (
            <Badge
              key={value}
              variant={activeTopic === value ? 'default' : 'outline'}
              className="cursor-pointer select-none text-xs"
              onClick={() => updateParams({ topic: activeTopic === value ? '' : value })}
            >
              {label}
            </Badge>
          ))}
          <button
            type="button"
            onClick={() => setShowAllTopics(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-1"
          >
            {showAllTopics ? 'Less ▴' : 'More ▾'}
          </button>
        </div>
      </form>

    </div>
  )
}
