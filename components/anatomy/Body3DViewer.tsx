'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

const RUNNING_COLORS = {
  primary: '#ff4444',
  secondary: '#ff8844',
  stabilizer: '#ffbb44',
}

const RUNNING_MUSCLES = {
  quads: { label: 'Quads', emphasis: 'primary', y: -0.2, x: 0 },
  calves: { label: 'Calves', emphasis: 'primary', y: -0.5, x: 0 },
  core: { label: 'Core', emphasis: 'primary', y: 0, x: 0 },
  glutes: { label: 'Glutes', emphasis: 'secondary', y: -0.15, x: 0 },
  hamstrings: { label: 'Hamstrings', emphasis: 'secondary', y: -0.35, x: 0 },
  hip_flexors: { label: 'Hip Flexors', emphasis: 'secondary', y: -0.05, x: 0 },
  lower_back: { label: 'Lower Back', emphasis: 'stabilizer', y: 0.05, x: 0 },
  achilles: { label: 'Achilles', emphasis: 'stabilizer', y: -0.65, x: 0 },
}

function Body() {
  return (
    <group>
      {/* Head */}
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshStandardMaterial color="#999999" metalness={0.1} roughness={0.8} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 0.08]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.1} roughness={0.8} />
      </mesh>

      {/* Torso - Core (primary) */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.16, 0.28, 0.1]} />
        <meshStandardMaterial
          color={RUNNING_COLORS.primary}
          emissive={RUNNING_COLORS.primary}
          emissiveIntensity={0.2}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Lower back (stabilizer) */}
      <mesh position={[0, 0, 0.09]}>
        <boxGeometry args={[0.15, 0.15, 0.08]} />
        <meshStandardMaterial
          color={RUNNING_COLORS.stabilizer}
          emissive={RUNNING_COLORS.stabilizer}
          emissiveIntensity={0.2}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Left Quad (primary) */}
      <mesh position={[-0.1, -0.15, -0.06]}>
        <boxGeometry args={[0.09, 0.22, 0.09]} />
        <meshStandardMaterial
          color={RUNNING_COLORS.primary}
          emissive={RUNNING_COLORS.primary}
          emissiveIntensity={0.2}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Right Quad (primary) */}
      <mesh position={[0.1, -0.15, -0.06]}>
        <boxGeometry args={[0.09, 0.22, 0.09]} />
        <meshStandardMaterial
          color={RUNNING_COLORS.primary}
          emissive={RUNNING_COLORS.primary}
          emissiveIntensity={0.2}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Left Hamstring (secondary) */}
      <mesh position={[-0.1, -0.15, 0.07]}>
        <boxGeometry args={[0.09, 0.18, 0.09]} />
        <meshStandardMaterial
          color={RUNNING_COLORS.secondary}
          emissive={RUNNING_COLORS.secondary}
          emissiveIntensity={0.2}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Right Hamstring (secondary) */}
      <mesh position={[0.1, -0.15, 0.07]}>
        <boxGeometry args={[0.09, 0.18, 0.09]} />
        <meshStandardMaterial
          color={RUNNING_COLORS.secondary}
          emissive={RUNNING_COLORS.secondary}
          emissiveIntensity={0.2}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Left Calf (primary) */}
      <mesh position={[-0.1, -0.38, -0.02]}>
        <boxGeometry args={[0.08, 0.16, 0.08]} />
        <meshStandardMaterial
          color={RUNNING_COLORS.primary}
          emissive={RUNNING_COLORS.primary}
          emissiveIntensity={0.2}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Right Calf (primary) */}
      <mesh position={[0.1, -0.38, -0.02]}>
        <boxGeometry args={[0.08, 0.16, 0.08]} />
        <meshStandardMaterial
          color={RUNNING_COLORS.primary}
          emissive={RUNNING_COLORS.primary}
          emissiveIntensity={0.2}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Shoulders (gray - other) */}
      <mesh position={[-0.13, 0.15, 0]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#888888" metalness={0.1} roughness={0.8} />
      </mesh>
      <mesh position={[0.13, 0.15, 0]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#888888" metalness={0.1} roughness={0.8} />
      </mesh>

      {/* Muscle Labels */}
      {Object.entries(RUNNING_MUSCLES).map(([key, muscle]) => (
        <Html
          key={key}
          position={[muscle.x, muscle.y, 0.5]}
          distanceFactor={1.5}
          className="pointer-events-none select-none"
        >
          <div
            className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap pointer-events-auto cursor-pointer
              ${
                muscle.emphasis === 'primary'
                  ? 'bg-red-500 text-white'
                  : muscle.emphasis === 'secondary'
                    ? 'bg-orange-500 text-white'
                    : 'bg-yellow-500 text-gray-900'
              }
            `}
          >
            {muscle.label}
          </div>
        </Html>
      ))}
    </group>
  );
}

interface Body3DViewerProps {
  sport?: string;
}

export function Body3DViewer({ sport = 'running' }: Body3DViewerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);

  const handleRegionSelect = (region: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (region) {
      next.set('region', region);
      next.delete('page');
    } else {
      next.delete('region');
      next.delete('page');
    }
    router.push(`${pathname}?${next.toString()}`);
  };

  const handleMuscleHover = (muscle: string | null) => {
    setHoveredMuscle(muscle);
    if (muscle) {
      handleRegionSelect(muscle);
    }
  };

  const muscleInfo = hoveredMuscle
    ? RUNNING_MUSCLES[hoveredMuscle as keyof typeof RUNNING_MUSCLES]
    : null;

  return (
    <div className="flex gap-0 h-screen w-full bg-gray-50">
      {/* 3D Canvas */}
      <div className="w-2/3 bg-gradient-to-br from-slate-900 to-slate-800 relative">
        <Canvas camera={{ position: [0, 0, 1.2], fov: 50 }} className="w-full h-full">
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 10, 7]} intensity={0.9} />
          <pointLight position={[-5, 5, 5]} intensity={0.5} />
          <Body />
          <OrbitControls
            autoRotate={false}
            enableZoom={true}
            enablePan={true}
            enableRotate={true}
            dampingFactor={0.05}
          />
        </Canvas>

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-black/70 text-white text-xs rounded-lg p-3 space-y-1">
          <div className="font-semibold mb-2">Running Emphasis</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span>Primary (90%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded" />
            <span>Secondary (70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded" />
            <span>Stabilizer (50%)</span>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs rounded-lg p-3">
          <div>Drag to rotate • Scroll to zoom</div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="w-1/3 bg-white border-l border-gray-200 overflow-y-auto p-6 flex flex-col">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {muscleInfo ? muscleInfo.label : 'Hover a muscle'}
        </h2>

        {muscleInfo && (
          <div className="space-y-4 flex-1">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Running Emphasis</h3>
              <p className="text-sm text-gray-600">
                {muscleInfo.emphasis === 'primary'
                  ? 'Primary mover (90% stress)'
                  : muscleInfo.emphasis === 'secondary'
                    ? 'Secondary mover (70% stress)'
                    : 'Stabilizer (50% stress)'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Research Papers</h3>
              <p className="text-xs text-gray-500 italic">
                Papers matching this region load when you select it
              </p>
            </div>

            <button
              onClick={() => handleRegionSelect(hoveredMuscle)}
              className="mt-auto px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors w-full"
            >
              View Papers for {muscleInfo.label}
            </button>
          </div>
        )}

        {!muscleInfo && (
          <div className="text-gray-500 text-sm flex-1 flex items-center justify-center">
            Hover over muscle labels to learn more about their role in running
          </div>
        )}
      </div>
    </div>
  );
}
