'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const RUNNING_MUSCLES = {
  quads: { label: 'Quads', emphasis: 'primary', color: '#ff4444', description: 'Primary knee extensor (90% stress)' },
  hamstrings: { label: 'Hamstrings', emphasis: 'secondary', color: '#ff8844', description: 'Secondary hip extensor (70% stress)' },
  glutes: { label: 'Glutes', emphasis: 'secondary', color: '#ff8844', description: 'Hip drive & power (70% stress)' },
  calves: { label: 'Calves', emphasis: 'primary', color: '#ff4444', description: 'Ankle propulsion (90% stress)' },
  core: { label: 'Core', emphasis: 'primary', color: '#ff4444', description: 'Stability & efficiency (90% stress)' },
  hip_flexors: { label: 'Hip Flexors', emphasis: 'secondary', color: '#ff8844', description: 'Knee drive (70% stress)' },
  lower_back: { label: 'Lower Back', emphasis: 'stabilizer', color: '#ffbb44', description: 'Posture & stability (50% stress)' },
  achilles: { label: 'Achilles', emphasis: 'stabilizer', color: '#ffbb44', description: 'Tendon & force transmission (50% stress)' },
}

function AnatomyDiagram({ hoveredMuscle, onMuscleHover }: { hoveredMuscle: string | null; onMuscleHover: (m: string | null) => void }) {
  return (
    <svg viewBox="0 0 300 600" className="w-full h-full" style={{ maxWidth: '100%' }}>
      {/* Background */}
      <defs>
        <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#f5f5f5', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#efefef', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Head */}
      <circle cx="150" cy="50" r="25" fill="#d4a574" stroke="#999" strokeWidth="1.5" opacity="0.6" />

      {/* Neck */}
      <rect x="140" y="75" width="20" height="20" fill="#d4a574" stroke="#999" strokeWidth="1" opacity="0.5" />

      {/* Torso/Core */}
      <g
        onClick={() => onMuscleHover('core')}
        onMouseEnter={() => onMuscleHover('core')}
        onMouseLeave={() => onMuscleHover(null)}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      >
        <rect
          x="110"
          y="100"
          width="80"
          height="100"
          fill={hoveredMuscle === 'core' ? RUNNING_MUSCLES.core.color : '#ff4444'}
          stroke={hoveredMuscle === 'core' ? '#cc0000' : '#999'}
          strokeWidth={hoveredMuscle === 'core' ? '2.5' : '1.5'}
          opacity={hoveredMuscle === 'core' ? 0.9 : 0.6}
          rx="4"
        />
        {hoveredMuscle === 'core' && (
          <text x="150" y="155" textAnchor="middle" fontSize="12" fontWeight="600" fill="#fff">
            Core
          </text>
        )}
      </g>

      {/* Lower Back */}
      <g
        onClick={() => onMuscleHover('lower_back')}
        onMouseEnter={() => onMuscleHover('lower_back')}
        onMouseLeave={() => onMuscleHover(null)}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      >
        <rect
          x="110"
          y="210"
          width="80"
          height="30"
          fill={hoveredMuscle === 'lower_back' ? RUNNING_MUSCLES.lower_back.color : '#ffbb44'}
          stroke={hoveredMuscle === 'lower_back' ? '#cc8800' : '#999'}
          strokeWidth={hoveredMuscle === 'lower_back' ? '2.5' : '1.5'}
          opacity={hoveredMuscle === 'lower_back' ? 0.9 : 0.5}
          rx="3"
        />
      </g>

      {/* Left Quad */}
      <g
        onClick={() => onMuscleHover('quads')}
        onMouseEnter={() => onMuscleHover('quads')}
        onMouseLeave={() => onMuscleHover(null)}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      >
        <rect
          x="60"
          y="260"
          width="50"
          height="90"
          fill={hoveredMuscle === 'quads' ? RUNNING_MUSCLES.quads.color : '#ff4444'}
          stroke={hoveredMuscle === 'quads' ? '#cc0000' : '#999'}
          strokeWidth={hoveredMuscle === 'quads' ? '2.5' : '1.5'}
          opacity={hoveredMuscle === 'quads' ? 0.9 : 0.6}
          rx="4"
        />
      </g>

      {/* Right Quad */}
      <g
        onClick={() => onMuscleHover('quads')}
        onMouseEnter={() => onMuscleHover('quads')}
        onMouseLeave={() => onMuscleHover(null)}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      >
        <rect
          x="190"
          y="260"
          width="50"
          height="90"
          fill={hoveredMuscle === 'quads' ? RUNNING_MUSCLES.quads.color : '#ff4444'}
          stroke={hoveredMuscle === 'quads' ? '#cc0000' : '#999'}
          strokeWidth={hoveredMuscle === 'quads' ? '2.5' : '1.5'}
          opacity={hoveredMuscle === 'quads' ? 0.9 : 0.6}
          rx="4"
        />
      </g>

      {/* Left Hamstring */}
      <g
        onClick={() => onMuscleHover('hamstrings')}
        onMouseEnter={() => onMuscleHover('hamstrings')}
        onMouseLeave={() => onMuscleHover(null)}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      >
        <rect
          x="60"
          y="360"
          width="50"
          height="70"
          fill={hoveredMuscle === 'hamstrings' ? RUNNING_MUSCLES.hamstrings.color : '#ff8844'}
          stroke={hoveredMuscle === 'hamstrings' ? '#cc6600' : '#999'}
          strokeWidth={hoveredMuscle === 'hamstrings' ? '2.5' : '1.5'}
          opacity={hoveredMuscle === 'hamstrings' ? 0.9 : 0.5}
          rx="4"
        />
      </g>

      {/* Right Hamstring */}
      <g
        onClick={() => onMuscleHover('hamstrings')}
        onMouseEnter={() => onMuscleHover('hamstrings')}
        onMouseLeave={() => onMuscleHover(null)}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      >
        <rect
          x="190"
          y="360"
          width="50"
          height="70"
          fill={hoveredMuscle === 'hamstrings' ? RUNNING_MUSCLES.hamstrings.color : '#ff8844'}
          stroke={hoveredMuscle === 'hamstrings' ? '#cc6600' : '#999'}
          strokeWidth={hoveredMuscle === 'hamstrings' ? '2.5' : '1.5'}
          opacity={hoveredMuscle === 'hamstrings' ? 0.9 : 0.5}
          rx="4"
        />
      </g>

      {/* Left Calf */}
      <g
        onClick={() => onMuscleHover('calves')}
        onMouseEnter={() => onMuscleHover('calves')}
        onMouseLeave={() => onMuscleHover(null)}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      >
        <rect
          x="65"
          y="450"
          width="40"
          height="70"
          fill={hoveredMuscle === 'calves' ? RUNNING_MUSCLES.calves.color : '#ff4444'}
          stroke={hoveredMuscle === 'calves' ? '#cc0000' : '#999'}
          strokeWidth={hoveredMuscle === 'calves' ? '2.5' : '1.5'}
          opacity={hoveredMuscle === 'calves' ? 0.9 : 0.6}
          rx="3"
        />
      </g>

      {/* Right Calf */}
      <g
        onClick={() => onMuscleHover('calves')}
        onMouseEnter={() => onMuscleHover('calves')}
        onMouseLeave={() => onMuscleHover(null)}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      >
        <rect
          x="195"
          y="450"
          width="40"
          height="70"
          fill={hoveredMuscle === 'calves' ? RUNNING_MUSCLES.calves.color : '#ff4444'}
          stroke={hoveredMuscle === 'calves' ? '#cc0000' : '#999'}
          strokeWidth={hoveredMuscle === 'calves' ? '2.5' : '1.5'}
          opacity={hoveredMuscle === 'calves' ? 0.9 : 0.6}
          rx="3"
        />
      </g>

      {/* Achilles - simplified */}
      <g
        onClick={() => onMuscleHover('achilles')}
        onMouseEnter={() => onMuscleHover('achilles')}
        onMouseLeave={() => onMuscleHover(null)}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      >
        <rect
          x="130"
          y="535"
          width="40"
          height="20"
          fill={hoveredMuscle === 'achilles' ? RUNNING_MUSCLES.achilles.color : '#ffbb44'}
          stroke={hoveredMuscle === 'achilles' ? '#cc8800' : '#999'}
          strokeWidth={hoveredMuscle === 'achilles' ? '2.5' : '1.5'}
          opacity={hoveredMuscle === 'achilles' ? 0.9 : 0.5}
          rx="2"
        />
      </g>

      {/* Hip area - for hip flexors and glutes reference */}
      <g
        onClick={() => onMuscleHover('hip_flexors')}
        onMouseEnter={() => onMuscleHover('hip_flexors')}
        onMouseLeave={() => onMuscleHover(null)}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      >
        <circle
          cx="130"
          cy="245"
          r="15"
          fill={hoveredMuscle === 'hip_flexors' ? RUNNING_MUSCLES.hip_flexors.color : '#ff8844'}
          stroke={hoveredMuscle === 'hip_flexors' ? '#cc6600' : '#999'}
          strokeWidth={hoveredMuscle === 'hip_flexors' ? '2.5' : '1.5'}
          opacity={hoveredMuscle === 'hip_flexors' ? 0.9 : 0.4}
        />
      </g>

      <g
        onClick={() => onMuscleHover('glutes')}
        onMouseEnter={() => onMuscleHover('glutes')}
        onMouseLeave={() => onMuscleHover(null)}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      >
        <circle
          cx="170"
          cy="245"
          r="15"
          fill={hoveredMuscle === 'glutes' ? RUNNING_MUSCLES.glutes.color : '#ff8844'}
          stroke={hoveredMuscle === 'glutes' ? '#cc6600' : '#999'}
          strokeWidth={hoveredMuscle === 'glutes' ? '2.5' : '1.5'}
          opacity={hoveredMuscle === 'glutes' ? 0.9 : 0.4}
        />
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

  const handleMuscleHover = (muscle: string | null) => {
    setHoveredMuscle(muscle);
  };

  const muscleInfo = hoveredMuscle
    ? RUNNING_MUSCLES[hoveredMuscle as keyof typeof RUNNING_MUSCLES]
    : null;

  return (
    <div className="flex gap-6 h-screen w-full bg-white p-8">
      {/* Left: Anatomy Diagram */}
      <div className="w-1/3 flex flex-col">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Running Anatomy</h2>
          <p className="text-sm text-gray-500 mt-1">Hover over muscles to explore</p>
        </div>
        <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 flex items-center justify-center shadow-sm border border-gray-200">
          <AnatomyDiagram hoveredMuscle={hoveredMuscle} onMuscleHover={handleMuscleHover} />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ff4444' }} />
            <span className="text-gray-700">Primary (90%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ff8844' }} />
            <span className="text-gray-700">Secondary (70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ffbb44' }} />
            <span className="text-gray-700">Stabilizer (50%)</span>
          </div>
        </div>
      </div>

      {/* Right: Info Panel */}
      <div className="w-2/3 bg-gray-50 rounded-xl p-8 border border-gray-200 flex flex-col">
        {muscleInfo ? (
          <>
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: muscleInfo.color }}
                />
                <h3 className="text-3xl font-bold text-gray-900">{muscleInfo.label}</h3>
              </div>
              <p className="text-gray-600">{muscleInfo.description}</p>
            </div>

            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-3">Research & Training</h4>
              <p className="text-sm text-gray-600 mb-4">
                Discover peer-reviewed studies and training insights for {muscleInfo.label.toLowerCase()}.
              </p>
              <button
                onClick={() => handleMuscleSelect(hoveredMuscle!)}
                className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Papers for {muscleInfo.label}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Explore Running Anatomy</h3>
            <p className="text-gray-600 text-sm max-w-xs">
              Hover over any muscle group to learn about its role in running and access related research
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
