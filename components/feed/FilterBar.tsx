'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import type { SportName } from '@/types/supabase'

const SPORTS: { value: SportName; label: string }[] = [
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'rowing', label: 'Rowing' },
  { value: 'skiing', label: 'Skiing' },
  { value: 'triathlon', label: 'Triathlon' },
  { value: 'hyrox', label: 'Hyrox' },
  { value: 'inline_skating', label: 'Inline Skating' },
]

const RUNNING_DISTANCES: { value: string; label: string }[] = [
  { value: 'marathon', label: 'Marathon' },
  { value: 'half_marathon', label: 'Half Marathon' },
  { value: 'ultramarathon', label: 'Ultra' },
  { value: 'trail_running', label: 'Trail' },
  { value: '5k_10k', label: '5K / 10K' },
]

const TOPICS = [
  { value: '', label: 'All Topics' },
  { value: 'vo2max', label: 'VO2max' },
  { value: 'hrv', label: 'HRV' },
  { value: 'lactate', label: 'Lactate' },
  { value: 'biomechanics', label: 'Biomechanics' },
  { value: 'pacing', label: 'Pacing' },
  { value: 'intervals', label: 'Intervals' },
  { value: 'strength', label: 'Strength' },
  { value: 'periodization', label: 'Periodization' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'active_recovery', label: 'Recovery' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'altitude', label: 'Altitude' },
  { value: 'carbohydrates', label: 'Carbohydrates' },
  { value: 'protein', label: 'Protein' },
  { value: 'hydration', label: 'Hydration' },
  { value: 'supplements', label: 'Supplements' },
  { value: 'prevention', label: 'Prevention' },
  { value: 'tendon', label: 'Tendon' },
  { value: 'psychology', label: 'Psychology' },
]

const BODY_REGIONS = [
  { value: '', label: 'All Regions' },
  { value: 'calves', label: 'Calves' },
  { value: 'quads', label: 'Quads' },
  { value: 'hamstrings', label: 'Hamstrings' },
  { value: 'glutes', label: 'Glutes' },
  { value: 'core', label: 'Core' },
  { value: 'lower_back', label: 'Lower Back' },
  { value: 'hip_flexors', label: 'Hip Flexors' },
  { value: 'knees', label: 'Knees' },
  { value: 'achilles', label: 'Achilles' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'lats', label: 'Lats' },
  { value: 'it_band', label: 'IT Band' },
  { value: 'ankles', label: 'Ankles' },
  { value: 'foot', label: 'Foot' },
]

const MOVEMENT_PRACTICES: { value: string; label: string }[] = [
  { value: 'martial_arts',  label: 'Martial Arts' },
  { value: 'mind_body',     label: 'Mind-Body' },
  { value: 'yoga_pilates',  label: 'Yoga & Pilates' },
]

const DIMENSIONS: { value: string; label: string }[] = [
  { value: 'female_athlete',      label: 'Women' },
  { value: 'masters_longevity',   label: 'Longevity' },
  { value: 'supplements',         label: 'Supplements' },
  { value: 'technology_wearables',label: 'Tech & Wearables' },
  { value: 'ai_ml_research',      label: 'AI / ML' },
  { value: 'para_sport',          label: 'Para Sport' },
]

const SELECT_CLASS =
  'px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-700'

export function FilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  const activeSport = params.get('sport')
  const activeMovement = params.get('movement') ?? ''
  const activeTopic = params.get('topic') ?? ''
  const activeRegion = params.get('region') ?? ''
  const activeDimension = params.get('dimension') ?? ''
  const urlSearch = params.get('search') ?? ''

  const [searchInput, setSearchInput] = useState(urlSearch)
  useEffect(() => { setSearchInput(urlSearch) }, [urlSearch])

  const hasFilters = !!(activeSport || activeMovement || activeTopic || activeRegion || activeDimension || urlSearch)

  function updateParams(updates: Record<string, string>) {
    const next = new URLSearchParams(params.toString())
    for (const [key, val] of Object.entries(updates)) {
      if (val) next.set(key, val)
      else next.delete(key)
    }
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }

  function toggleSport(sport: SportName) {
    updateParams({ sport: activeSport === sport ? '' : sport })
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ search: searchInput })
  }

  return (
    <div className="space-y-3 pb-5">
      <div className="flex flex-wrap gap-2">
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
      </div>

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

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400 shrink-0">Movement:</span>
        {MOVEMENT_PRACTICES.map(({ value, label }) => (
          <Badge
            key={value}
            variant={activeMovement === value ? 'default' : 'outline'}
            className={`cursor-pointer select-none text-xs ${activeMovement !== value ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            onClick={() => updateParams({ movement: activeMovement === value ? '' : value })}
          >
            {label}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400 shrink-0">Lens:</span>
        {DIMENSIONS.map(({ value, label }) => (
          <Badge
            key={value}
            variant={activeDimension === value ? 'default' : 'outline'}
            className={`cursor-pointer select-none text-xs ${activeDimension !== value ? 'border-violet-200 text-violet-700 hover:bg-violet-50' : 'bg-violet-600 hover:bg-violet-700'}`}
            onClick={() => updateParams({ dimension: activeDimension === value ? '' : value })}
          >
            {label}
          </Badge>
        ))}
      </div>

      <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Search papers…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onBlur={() => updateParams({ search: searchInput })}
          className="flex-1 min-w-44 px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-700 placeholder-gray-400"
        />

        <select
          value={activeTopic}
          onChange={(e) => updateParams({ topic: e.target.value })}
          className={SELECT_CLASS}
        >
          {TOPICS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          value={activeRegion}
          onChange={(e) => updateParams({ region: e.target.value })}
          className={SELECT_CLASS}
        >
          {BODY_REGIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); router.push(pathname) }}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            × Clear
          </button>
        )}
      </form>
    </div>
  )
}
