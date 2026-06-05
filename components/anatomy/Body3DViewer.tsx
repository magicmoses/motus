'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const RUNNING_MUSCLES = {
  quads: { label: 'Quadriceps', emphasis: 'primary', description: 'Primary knee extensor — 90% stress' },
  hamstrings: { label: 'Hamstrings', emphasis: 'secondary', description: 'Hip & knee flexion — 70% stress' },
  glutes: { label: 'Glutes', emphasis: 'secondary', description: 'Hip extension & power — 70% stress' },
  calves: { label: 'Calves', emphasis: 'primary', description: 'Ankle plantarflexion — 90% stress' },
  core: { label: 'Core', emphasis: 'primary', description: 'Stability & efficiency — 90% stress' },
  hip_flexors: { label: 'Hip Flexors', emphasis: 'secondary', description: 'Knee drive & stride — 70% stress' },
  lower_back: { label: 'Lower Back', emphasis: 'stabilizer', description: 'Posture & stability — 50% stress' },
  achilles: { label: 'Achilles', emphasis: 'stabilizer', description: 'Force transmission — 50% stress' },
}

const COLORS = {
  primary: '#2563eb',      // Apple blue
  secondary: '#7c3aed',    // Purple accent
  stabilizer: '#f59e0b',   // Amber
  neutral: '#e5e7eb',      // Light gray
  hover: '#1e40af',        // Darker blue
}

function AnatomyDiagram({
  hoveredMuscle,
  onMuscleHover,
  view = 'front'
}: {
  hoveredMuscle: string | null
  onMuscleHover: (m: string | null) => void
  view?: 'front' | 'back'
}) {
  const isFront = view === 'front'

  return (
    <svg viewBox="0 0 200 500" className="w-full h-full" style={{ maxWidth: '100%' }}>
      {/* Define gradients */}
      <defs>
        <linearGradient id="muscleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: COLORS.primary, stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: COLORS.primary, stopOpacity: 0.6 }} />
        </linearGradient>
        <filter id="highlight" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
        </filter>
      </defs>

      {/* Head */}
      <circle cx="100" cy="35" r="18" fill={COLORS.neutral} stroke="#cbd5e1" strokeWidth="1" />

      {/* Neck */}
      <rect x="92" y="52" width="16" height="18" fill={COLORS.neutral} stroke="#cbd5e1" strokeWidth="0.5" />

      {/* CORE / ABS */}
      <g
        onClick={() => onMuscleHover('core')}
        onMouseEnter={() => onMuscleHover('core')}
        onMouseLeave={() => onMuscleHover(null)}
        className="cursor-pointer transition-all duration-200"
        style={{
          opacity: hoveredMuscle && hoveredMuscle !== 'core' ? 0.4 : 1,
        }}
      >
        <path
          d={isFront ?
            "M 85 75 Q 82 90 82 110 L 82 140 Q 82 145 87 145 L 113 145 Q 118 145 118 140 L 118 110 Q 118 90 115 75 Z" :
            "M 85 75 Q 82 90 82 110 L 82 130 L 118 130 L 118 110 Q 118 90 115 75 Z"
          }
          fill={hoveredMuscle === 'core' ? COLORS.primary : COLORS.neutral}
          stroke={hoveredMuscle === 'core' ? COLORS.hover : '#d1d5db'}
          strokeWidth={hoveredMuscle === 'core' ? '1.5' : '0.5'}
          className="transition-all duration-150"
        />
      </g>

      {/* LOWER BACK (back view only) */}
      {!isFront && (
        <g
          onClick={() => onMuscleHover('lower_back')}
          onMouseEnter={() => onMuscleHover('lower_back')}
          onMouseLeave={() => onMuscleHover(null)}
          className="cursor-pointer transition-all duration-200"
          style={{
            opacity: hoveredMuscle && hoveredMuscle !== 'lower_back' ? 0.4 : 1,
          }}
        >
          <path
            d="M 80 140 Q 78 155 78 170 L 122 170 Q 122 155 120 140 Z"
            fill={hoveredMuscle === 'lower_back' ? COLORS.stabilizer : COLORS.neutral}
            stroke={hoveredMuscle === 'lower_back' ? '#d97706' : '#d1d5db'}
            strokeWidth={hoveredMuscle === 'lower_back' ? '1.5' : '0.5'}
            className="transition-all duration-150"
          />
        </g>
      )}

      {/* GLUTES (back view only) */}
      {!isFront && (
        <g
          onClick={() => onMuscleHover('glutes')}
          onMouseEnter={() => onMuscleHover('glutes')}
          onMouseLeave={() => onMuscleHover(null)}
          className="cursor-pointer transition-all duration-200"
          style={{
            opacity: hoveredMuscle && hoveredMuscle !== 'glutes' ? 0.4 : 1,
          }}
        >
          <ellipse cx="75" cy="190" rx="15" ry="25" fill={hoveredMuscle === 'glutes' ? COLORS.secondary : COLORS.neutral} stroke={hoveredMuscle === 'glutes' ? '#6d28d9' : '#d1d5db'} strokeWidth={hoveredMuscle === 'glutes' ? '1.5' : '0.5'} className="transition-all duration-150" />
          <ellipse cx="125" cy="190" rx="15" ry="25" fill={hoveredMuscle === 'glutes' ? COLORS.secondary : COLORS.neutral} stroke={hoveredMuscle === 'glutes' ? '#6d28d9' : '#d1d5db'} strokeWidth={hoveredMuscle === 'glutes' ? '1.5' : '0.5'} className="transition-all duration-150" />
        </g>
      )}

      {/* HIP FLEXORS (front view only) */}
      {isFront && (
        <g
          onClick={() => onMuscleHover('hip_flexors')}
          onMouseEnter={() => onMuscleHover('hip_flexors')}
          onMouseLeave={() => onMuscleHover(null)}
          className="cursor-pointer transition-all duration-200"
          style={{
            opacity: hoveredMuscle && hoveredMuscle !== 'hip_flexors' ? 0.4 : 1,
          }}
        >
          <circle cx="70" cy="155" r="10" fill={hoveredMuscle === 'hip_flexors' ? COLORS.secondary : COLORS.neutral} stroke={hoveredMuscle === 'hip_flexors' ? '#6d28d9' : '#d1d5db'} strokeWidth={hoveredMuscle === 'hip_flexors' ? '1.5' : '0.5'} className="transition-all duration-150" />
          <circle cx="130" cy="155" r="10" fill={hoveredMuscle === 'hip_flexors' ? COLORS.secondary : COLORS.neutral} stroke={hoveredMuscle === 'hip_flexors' ? '#6d28d9' : '#d1d5db'} strokeWidth={hoveredMuscle === 'hip_flexors' ? '1.5' : '0.5'} className="transition-all duration-150" />
        </g>
      )}

      {/* LEFT QUAD */}
      <g
        onClick={() => onMuscleHover('quads')}
        onMouseEnter={() => onMuscleHover('quads')}
        onMouseLeave={() => onMuscleHover(null)}
        className="cursor-pointer transition-all duration-200"
        style={{
          opacity: hoveredMuscle && hoveredMuscle !== 'quads' ? 0.4 : 1,
        }}
      >
        <path
          d="M 68 160 Q 65 190 63 230 L 85 235 Q 87 190 90 160 Z"
          fill={hoveredMuscle === 'quads' ? COLORS.primary : COLORS.neutral}
          stroke={hoveredMuscle === 'quads' ? COLORS.hover : '#d1d5db'}
          strokeWidth={hoveredMuscle === 'quads' ? '1.5' : '0.5'}
          className="transition-all duration-150"
        />
      </g>

      {/* RIGHT QUAD */}
      <g
        onClick={() => onMuscleHover('quads')}
        onMouseEnter={() => onMuscleHover('quads')}
        onMouseLeave={() => onMuscleHover(null)}
        className="cursor-pointer transition-all duration-200"
        style={{
          opacity: hoveredMuscle && hoveredMuscle !== 'quads' ? 0.4 : 1,
        }}
      >
        <path
          d="M 132 160 Q 135 190 137 230 L 115 235 Q 113 190 110 160 Z"
          fill={hoveredMuscle === 'quads' ? COLORS.primary : COLORS.neutral}
          stroke={hoveredMuscle === 'quads' ? COLORS.hover : '#d1d5db'}
          strokeWidth={hoveredMuscle === 'quads' ? '1.5' : '0.5'}
          className="transition-all duration-150"
        />
      </g>

      {/* LEFT HAMSTRING (back view) */}
      {!isFront && (
        <g
          onClick={() => onMuscleHover('hamstrings')}
          onMouseEnter={() => onMuscleHover('hamstrings')}
          onMouseLeave={() => onMuscleHover(null)}
          className="cursor-pointer transition-all duration-200"
          style={{
            opacity: hoveredMuscle && hoveredMuscle !== 'hamstrings' ? 0.4 : 1,
          }}
        >
          <path
            d="M 68 220 Q 65 250 63 285 L 85 285 Q 87 250 90 220 Z"
            fill={hoveredMuscle === 'hamstrings' ? COLORS.secondary : COLORS.neutral}
            stroke={hoveredMuscle === 'hamstrings' ? '#6d28d9' : '#d1d5db'}
            strokeWidth={hoveredMuscle === 'hamstrings' ? '1.5' : '0.5'}
            className="transition-all duration-150"
          />
        </g>
      )}

      {/* RIGHT HAMSTRING (back view) */}
      {!isFront && (
        <g
          onClick={() => onMuscleHover('hamstrings')}
          onMouseEnter={() => onMuscleHover('hamstrings')}
          onMouseLeave={() => onMuscleHover(null)}
          className="cursor-pointer transition-all duration-200"
          style={{
            opacity: hoveredMuscle && hoveredMuscle !== 'hamstrings' ? 0.4 : 1,
          }}
        >
          <path
            d="M 132 220 Q 135 250 137 285 L 115 285 Q 113 250 110 220 Z"
            fill={hoveredMuscle === 'hamstrings' ? COLORS.secondary : COLORS.neutral}
            stroke={hoveredMuscle === 'hamstrings' ? '#6d28d9' : '#d1d5db'}
            strokeWidth={hoveredMuscle === 'hamstrings' ? '1.5' : '0.5'}
            className="transition-all duration-150"
          />
        </g>
      )}

      {/* LEFT CALF */}
      <g
        onClick={() => onMuscleHover('calves')}
        onMouseEnter={() => onMuscleHover('calves')}
        onMouseLeave={() => onMuscleHover(null)}
        className="cursor-pointer transition-all duration-200"
        style={{
          opacity: hoveredMuscle && hoveredMuscle !== 'calves' ? 0.4 : 1,
        }}
      >
        <path
          d="M 68 300 Q 67 330 67 365 L 85 365 Q 85 330 86 300 Z"
          fill={hoveredMuscle === 'calves' ? COLORS.primary : COLORS.neutral}
          stroke={hoveredMuscle === 'calves' ? COLORS.hover : '#d1d5db'}
          strokeWidth={hoveredMuscle === 'calves' ? '1.5' : '0.5'}
          className="transition-all duration-150"
        />
      </g>

      {/* RIGHT CALF */}
      <g
        onClick={() => onMuscleHover('calves')}
        onMouseEnter={() => onMuscleHover('calves')}
        onMouseLeave={() => onMuscleHover(null)}
        className="cursor-pointer transition-all duration-200"
        style={{
          opacity: hoveredMuscle && hoveredMuscle !== 'calves' ? 0.4 : 1,
        }}
      >
        <path
          d="M 132 300 Q 133 330 133 365 L 115 365 Q 115 330 114 300 Z"
          fill={hoveredMuscle === 'calves' ? COLORS.primary : COLORS.neutral}
          stroke={hoveredMuscle === 'calves' ? COLORS.hover : '#d1d5db'}
          strokeWidth={hoveredMuscle === 'calves' ? '1.5' : '0.5'}
          className="transition-all duration-150"
        />
      </g>

      {/* ACHILLES */}
      <g
        onClick={() => onMuscleHover('achilles')}
        onMouseEnter={() => onMuscleHover('achilles')}
        onMouseLeave={() => onMuscleHover(null)}
        className="cursor-pointer transition-all duration-200"
        style={{
          opacity: hoveredMuscle && hoveredMuscle !== 'achilles' ? 0.4 : 1,
        }}
      >
        <rect x="85" y="375" width="30" height="20" fill={hoveredMuscle === 'achilles' ? COLORS.stabilizer : COLORS.neutral} stroke={hoveredMuscle === 'achilles' ? '#d97706' : '#d1d5db'} strokeWidth={hoveredMuscle === 'achilles' ? '1.5' : '0.5'} rx="3" className="transition-all duration-150" />
      </g>
    </svg>
  )
}

interface Body3DViewerProps {
  sport?: string;
}

export function Body3DViewer({ sport = 'running' }: Body3DViewerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);

  const handleMuscleSelect = (muscle: string) => {
    const next = new URLSearchParams(params.toString());
    next.set('region', muscle);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  };

  const muscleInfo = hoveredMuscle
    ? RUNNING_MUSCLES[hoveredMuscle as keyof typeof RUNNING_MUSCLES]
    : null;

  const emphasisColor = muscleInfo
    ? muscleInfo.emphasis === 'primary'
      ? COLORS.primary
      : muscleInfo.emphasis === 'secondary'
        ? COLORS.secondary
        : COLORS.stabilizer
    : null;

  return (
    <div className="flex gap-8 h-screen w-full bg-white px-8 py-6">
      {/* Left: Anatomy Diagrams */}
      <div className="w-2/5 flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-900">Running Anatomy</h1>
          <p className="text-sm text-gray-500 mt-2">Hover over muscles to explore research</p>
        </div>

        <div className="flex gap-4 flex-1">
          {/* Front View */}
          <div className="flex-1 bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg p-6 flex flex-col items-center justify-center border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 font-medium mb-3 absolute top-8">FRONT</p>
            <AnatomyDiagram hoveredMuscle={hoveredMuscle} onMuscleHover={setHoveredMuscle} view="front" />
          </div>

          {/* Back View */}
          <div className="flex-1 bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg p-6 flex flex-col items-center justify-center border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 font-medium mb-3 absolute top-8">BACK</p>
            <AnatomyDiagram hoveredMuscle={hoveredMuscle} onMuscleHover={setHoveredMuscle} view="back" />
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.primary }} />
            <span className="text-gray-700">Primary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.secondary }} />
            <span className="text-gray-700">Secondary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.stabilizer }} />
            <span className="text-gray-700">Stabilizer</span>
          </div>
        </div>
      </div>

      {/* Right: Info Panel */}
      <div className="w-3/5 bg-gradient-to-br from-gray-50 to-white rounded-lg p-8 border border-gray-200 shadow-sm flex flex-col">
        {muscleInfo ? (
          <>
            <div className="mb-8 pb-8 border-b border-gray-200">
              <div className="flex items-baseline gap-3 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: emphasisColor || COLORS.primary }} />
                <h2 className="text-4xl font-bold text-gray-900">{muscleInfo.label}</h2>
              </div>
              <p className="text-gray-600 text-lg">{muscleInfo.description}</p>
            </div>

            <div className="flex-1 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">About</h3>
              <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
                <p>
                  The {muscleInfo.label.toLowerCase()} is a critical muscle group for running performance.
                  It experiences significant stress during running and is a common site of injury and adaptation.
                </p>
                <p>
                  Research shows that targeted training of this muscle group can improve running efficiency, reduce injury risk, and enhance overall performance.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Research</h3>
              <p className="text-sm text-gray-600 mb-4">
                Discover peer-reviewed studies on {muscleInfo.label.toLowerCase()} training and running performance.
              </p>
              <button
                onClick={() => handleMuscleSelect(hoveredMuscle!)}
                className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-150 shadow-sm"
              >
                View Papers: {muscleInfo.label}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2 1m2-1l-2-1m2 1v2.5" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Explore Running Anatomy</h3>
            <p className="text-gray-600 text-sm max-w-sm">
              Hover over any muscle group in the front or back views to learn about its role in running and access evidence-based research.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
