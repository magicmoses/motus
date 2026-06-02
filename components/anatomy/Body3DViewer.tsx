'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'

// Running muscle color scheme
const RUNNING_COLORS = {
  primary: '#ff4444',    // Bright red: quads, calves, core
  secondary: '#ff8844',  // Orange: glutes, hamstrings, hip_flexors
  stabilizer: '#ffbb44', // Yellow: lower_back, ankles, achilles
}

// Muscle groups for running (for labeling)
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

// Determine if mesh is part of running muscles
function getMuscleCategory(
  position: THREE.Vector3
): { category: 'primary' | 'secondary' | 'stabilizer' | 'other'; name?: string } {
  // Y-axis: head=high, feet=low
  // Z-axis: front=negative, back=positive

  // Lower body
  if (position.y < -0.1) {
    if (position.z < -0.05) {
      return { category: 'primary', name: 'quads' }; // Quads zone
    }
    if (position.z > 0.05) {
      return { category: 'secondary', name: 'hamstrings' }; // Hamstrings zone
    }
    if (Math.abs(position.x) > 0.08) {
      return { category: 'secondary', name: 'hip_flexors' }; // Sides
    }
  }

  // Core area
  if (position.y > -0.1 && position.y < 0.15) {
    if (Math.abs(position.z) < 0.08) {
      return { category: 'primary', name: 'core' }; // Core/abs
    }
    if (position.z > 0.08) {
      return { category: 'stabilizer', name: 'lower_back' }; // Lower back zone
    }
  }

  // Very low (feet/ankles)
  if (position.y < -0.55) {
    return { category: 'stabilizer', name: 'achilles' };
  }

  return { category: 'other' };
}

function Model({ onMeshHover }: { onMeshHover: (name: string | null) => void }) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/myology.glb');

  useEffect(() => {
    const colorMap = new Map<THREE.Mesh, string>();

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.geometry.boundingBox) {
          child.geometry.computeBoundingBox();
        }

        if (child.geometry.boundingBox) {
          const center = new THREE.Vector3();
          child.geometry.boundingBox.getCenter(center);
          const { category } = getMuscleCategory(center);

          // Color logic: running muscles in color, others in gray
          const colorHex =
            category === 'primary'
              ? RUNNING_COLORS.primary
              : category === 'secondary'
                ? RUNNING_COLORS.secondary
                : category === 'stabilizer'
                  ? RUNNING_COLORS.stabilizer
                  : '#aaaaaa'; // Gray for non-running muscles

          if (child.material) {
            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];
            materials.forEach((mat) => {
              if (
                mat instanceof THREE.MeshStandardMaterial ||
                mat instanceof THREE.MeshPhongMaterial
              ) {
                mat.color.setStyle(colorHex);
                mat.emissive.setStyle(
                  category !== 'other' ? colorHex : '#000000'
                );
                mat.emissiveIntensity = category !== 'other' ? 0.2 : 0;
              }
            });
          }
        }

      }
    });

  }, [scene]);

  return (
    <group ref={group}>
      <primitive object={scene} scale={1} position={[0, 0, 0]} />

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
            onMouseEnter={() => onMeshHover(key)}
            onMouseLeave={() => onMeshHover(null)}
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
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const activeRegion = params.get('region');

  useEffect(() => {
    setSelectedRegion(activeRegion);
  }, [activeRegion]);

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
      {/* 3D Canvas - 2/3 width */}
      <div className="w-2/3 bg-gradient-to-br from-slate-900 to-slate-800 relative">
        <Canvas
          camera={{ position: [0, 0, 1.2], fov: 50 }}
          className="w-full h-full"
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 10, 7]} intensity={0.9} />
          <pointLight position={[-5, 5, 5]} intensity={0.5} />

          <Model onMeshHover={handleMuscleHover} />

          {/* Simple orbit controls - no auto-rotate, smooth interaction */}
          <OrbitControls
            autoRotate={false}
            enableZoom={true}
            enablePan={true}
            enableRotate={true}
            dampingFactor={0.05}
          />
        </Canvas>

        {/* Legend - top left */}
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
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded" />
            <span>Other</span>
          </div>
        </div>

        {/* Controls hint - bottom left */}
        <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs rounded-lg p-3">
          <div>Drag to rotate • Scroll to zoom</div>
        </div>
      </div>

      {/* Info Panel - 1/3 width */}
      <div className="w-1/3 bg-white border-l border-gray-200 overflow-y-auto p-6 flex flex-col">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {muscleInfo ? muscleInfo.label : 'Hover a muscle'}
        </h2>

        {muscleInfo && (
          <div className="space-y-4 flex-1">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Running Emphasis
              </h3>
              <p className="text-sm text-gray-600">
                {muscleInfo.emphasis === 'primary'
                  ? 'Primary mover (90% stress)'
                  : muscleInfo.emphasis === 'secondary'
                    ? 'Secondary mover (70% stress)'
                    : 'Stabilizer (50% stress)'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Research Papers
              </h3>
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
