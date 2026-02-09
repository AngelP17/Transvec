import { useRef, useMemo, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import { BufferAttribute, Points as ThreePoints, BufferGeometry } from 'three';
import { GLOBE, COLORS, getGreatCirclePoints } from './constants';
import type { ArcData } from './types';

interface ParticleFlowProps {
  arcs: ArcData[];
  maxParticles: number;
}

// Memoized to prevent re-renders
const ParticleFlow = memo(function ParticleFlow({ arcs, maxParticles }: ParticleFlowProps) {
  const pointsRef = useRef<ThreePoints>(null);
  const geometryRef = useRef<BufferGeometry | null>(null);

  const particlesPerArc = Math.max(1, Math.floor(maxParticles / Math.max(arcs.length, 1)));

  // Memoized particle data calculation
  const { positions, offsets, arcPaths } = useMemo(() => {
    const allPositions = new Float32Array(maxParticles * 3);
    const allOffsets = new Float32Array(maxParticles);
    const paths: [number, number, number][][] = [];

    let idx = 0;
    for (const arc of arcs) {
      const path = getGreatCirclePoints(arc.origin, arc.destination, GLOBE.radius + 0.01, 80);
      paths.push(path);

      for (let p = 0; p < particlesPerArc && idx < maxParticles; p++) {
        const t = p / particlesPerArc;
        const pathIdx = Math.floor(t * (path.length - 1));
        const point = path[pathIdx];

        allPositions[idx * 3] = point[0];
        allPositions[idx * 3 + 1] = point[1];
        allPositions[idx * 3 + 2] = point[2];
        allOffsets[idx] = t;
        idx++;
      }
    }

    return { positions: allPositions, offsets: allOffsets, arcPaths: paths };
  }, [arcs, maxParticles, particlesPerArc]);

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
    };
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;

    const posAttr = pointsRef.current.geometry.getAttribute('position') as BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    let idx = 0;
    for (let a = 0; a < arcPaths.length; a++) {
      const path = arcPaths[a];
      for (let p = 0; p < particlesPerArc && idx < maxParticles; p++) {
        offsets[idx] = (offsets[idx] + delta * 0.15) % 1.0;
        const pathIdx = Math.floor(offsets[idx] * (path.length - 1));
        const point = path[Math.min(pathIdx, path.length - 1)];

        posArray[idx * 3] = point[0];
        posArray[idx * 3 + 1] = point[1];
        posArray[idx * 3 + 2] = point[2];
        idx++;
      }
    }

    posAttr.needsUpdate = true;
  });

  if (arcs.length === 0 || maxParticles === 0) return null;

  return (
    <Points ref={pointsRef} limit={maxParticles}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          count={maxParticles}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <PointMaterial
        color={COLORS.accent}
        size={0.012}
        sizeAttenuation
        transparent
        opacity={0.7}
        depthWrite={false}
        toneMapped={false}
      />
    </Points>
  );
});

export default ParticleFlow;
