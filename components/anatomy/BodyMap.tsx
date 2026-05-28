'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

type View = 'front' | 'back'
interface Rect { x: number; y: number; w: number; h: number; rx?: number }
interface Region { id: string; label: string; rects: Rect[] }

const FRONT: Region[] = [
  { id: 'neck',          label: 'Neck',          rects: [{ x: 43, y: 29, w: 14, h: 9,  rx: 4 }] },
  { id: 'shoulders',     label: 'Shoulders',     rects: [{ x: 19, y: 38, w: 15, h: 13, rx: 5 }, { x: 66, y: 38, w: 15, h: 13, rx: 5 }] },
  { id: 'lats',          label: 'Lats',          rects: [{ x: 19, y: 50, w: 15, h: 27, rx: 4 }, { x: 66, y: 50, w: 15, h: 27, rx: 4 }] },
  { id: 'grip_forearms', label: 'Forearms',      rects: [{ x: 14, y: 77, w: 12, h: 30, rx: 4 }, { x: 74, y: 77, w: 12, h: 30, rx: 4 }] },
  { id: 'core',          label: 'Core',          rects: [{ x: 34, y: 37, w: 32, h: 45, rx: 4 }] },
  { id: 'hip_flexors',   label: 'Hip Flexors',   rects: [{ x: 34, y: 82, w: 15, h: 16, rx: 4 }, { x: 51, y: 82, w: 15, h: 16, rx: 4 }] },
  { id: 'hip_abductors', label: 'Hip Abductors', rects: [{ x: 21, y: 83, w: 14, h: 18, rx: 4 }, { x: 65, y: 83, w: 14, h: 18, rx: 4 }] },
  { id: 'quads',         label: 'Quads',         rects: [{ x: 33, y: 101, w: 17, h: 44, rx: 4 }, { x: 50, y: 101, w: 17, h: 44, rx: 4 }] },
  { id: 'it_band',       label: 'IT Band',       rects: [{ x: 22, y: 102, w: 12, h: 43, rx: 3 }, { x: 66, y: 102, w: 12, h: 43, rx: 3 }] },
  { id: 'knees',         label: 'Knees',         rects: [{ x: 33, y: 145, w: 17, h: 11, rx: 5 }, { x: 50, y: 145, w: 17, h: 11, rx: 5 }] },
  { id: 'calves',        label: 'Calves',        rects: [{ x: 33, y: 157, w: 16, h: 36, rx: 4 }, { x: 51, y: 157, w: 16, h: 36, rx: 4 }] },
  { id: 'ankles',        label: 'Ankles',        rects: [{ x: 33, y: 193, w: 16, h: 9,  rx: 4 }, { x: 51, y: 193, w: 16, h: 9,  rx: 4 }] },
  { id: 'foot',          label: 'Foot',          rects: [{ x: 29, y: 202, w: 20, h: 9,  rx: 3 }, { x: 51, y: 202, w: 20, h: 9,  rx: 3 }] },
]

const BACK: Region[] = [
  { id: 'neck',       label: 'Neck',        rects: [{ x: 43, y: 29, w: 14, h: 9,  rx: 4 }] },
  { id: 'lower_back', label: 'Lower Back',  rects: [{ x: 33, y: 67, w: 34, h: 20, rx: 4 }] },
  { id: 'glutes',     label: 'Glutes',      rects: [{ x: 31, y: 87, w: 38, h: 20, rx: 5 }] },
  { id: 'hamstrings', label: 'Hamstrings',  rects: [{ x: 33, y: 107, w: 17, h: 42, rx: 4 }, { x: 50, y: 107, w: 17, h: 42, rx: 4 }] },
  { id: 'achilles',   label: 'Achilles',    rects: [{ x: 35, y: 191, w: 13, h: 14, rx: 4 }, { x: 52, y: 191, w: 13, h: 14, rx: 4 }] },
]

function BodySilhouette() {
  return (
    <g fill="#f1f5f9" stroke="#e2e8f0" strokeWidth={1.5}>
      <circle cx={50} cy={16} r={13} />
      <rect x={44} y={28} width={12} height={10} rx={2} />
      <rect x={34} y={37} width={32} height={50} rx={5} />
      <rect x={30} y={85} width={40} height={17} rx={4} />
      <rect x={19} y={37} width={15} height={43} rx={5} />
      <rect x={66} y={37} width={15} height={43} rx={5} />
      <rect x={14} y={74} width={12} height={34} rx={4} />
      <rect x={74} y={74} width={12} height={34} rx={4} />
      <rect x={32} y={102} width={18} height={46} rx={5} />
      <rect x={50} y={102} width={18} height={46} rx={5} />
      <rect x={32} y={148} width={18} height={48} rx={5} />
      <rect x={50} y={148} width={18} height={48} rx={5} />
      <rect x={29} y={196} width={21} height={10} rx={3} />
      <rect x={50} y={196} width={21} height={10} rx={3} />
    </g>
  )
}

export function BodyMap() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()
  const [view, setView] = useState<View>('front')
  const [hovered, setHovered] = useState<string | null>(null)

  const activeRegion = params.get('region') ?? ''
  const regions = view === 'front' ? FRONT : BACK

  const displayLabel =
    hovered ? regions.find(r => r.id === hovered)?.label
    : activeRegion ? regions.find(r => r.id === activeRegion)?.label
    : null

  function handleRegionClick(id: string) {
    const next = new URLSearchParams(params.toString())
    if (activeRegion === id) {
      next.delete('region')
    } else {
      next.set('region', id)
      next.delete('page')
    }
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }

  function regionFill(id: string) {
    if (id === activeRegion) return '#3b82f6'
    if (id === hovered) return '#93c5fd'
    return '#dbeafe'
  }

  function regionStroke(id: string) {
    if (id === activeRegion) return '#1d4ed8'
    if (id === hovered) return '#3b82f6'
    return '#bfdbfe'
  }

  function regionOpacity(id: string) {
    if (id === activeRegion) return 0.85
    if (id === hovered) return 0.75
    return 0.45
  }

  return (
    <div className="pb-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Body Region</span>
        <div className="flex rounded-md overflow-hidden border border-gray-200 text-xs">
          {(['front', 'back'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 capitalize transition-colors ${
                view === v ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-5 items-start">
        <svg
          viewBox="0 0 100 215"
          width={90}
          height={193}
          className="shrink-0"
          style={{ userSelect: 'none' }}
        >
          <BodySilhouette />
          {regions.map((region) =>
            region.rects.map((rect, i) => (
              <rect
                key={`${region.id}-${i}`}
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.h}
                rx={rect.rx}
                fill={regionFill(region.id)}
                stroke={regionStroke(region.id)}
                strokeWidth={0.8}
                fillOpacity={regionOpacity(region.id)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(region.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleRegionClick(region.id)}
              />
            ))
          )}
        </svg>

        <div className="flex-1 pt-1 space-y-3">
          <div className="min-h-[2rem]">
            {displayLabel ? (
              <p className="text-sm font-medium text-gray-900">{displayLabel}</p>
            ) : (
              <p className="text-xs text-gray-400 leading-snug">Hover a region to preview, click to filter</p>
            )}
          </div>

          {activeRegion && (
            <button
              onClick={() => {
                const next = new URLSearchParams(params.toString())
                next.delete('region')
                next.delete('page')
                startTransition(() => router.push(`${pathname}?${next.toString()}`))
              }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              × Clear region
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
