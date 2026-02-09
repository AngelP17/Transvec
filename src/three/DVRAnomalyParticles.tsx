import { useRef, useMemo, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { 
  InstancedMesh, 
  SphereGeometry, 
  MeshBasicMaterial, 
  Object3D,
  Color,
  Vector3
} from 'three';
import type { DVRAnomalyParticlesProps } from './types';

const tempObject = new Object3D();
const tempColor = new Color();
const tempPosition = new Vector3();

// Find breach indices where value exceeds threshold
function findBreachIndices(data: number[], threshold: number): number[] {
  return data
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => value > threshold)
    .map(({ index }) => index);
}

// Memoized component
const DVRAnomalyParticles = memo(function DVRAnomalyParticles({ 
  data, 
  threshold, 
  currentIndex,
  color,
  gpu 
}: DVRAnomalyParticlesProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const timeRef = useRef(0);
  
  // Find breach points
  const breachIndices = useMemo(() => {
    if (!threshold || gpu.tier === 'low') return [];
    return findBreachIndices(data, threshold);
  }, [data, threshold, gpu.tier]);
  
  // Particle count based on GPU tier
  const particleCount = useMemo(() => {
    switch (gpu.tier) {
      case 'high': return breachIndices.length * 8;
      case 'medium': return breachIndices.length * 4;
      case 'low': return 0;
      default: return breachIndices.length * 4;
    }
  }, [breachIndices.length, gpu.tier]);
  
  // Memoized geometry and material
  const geometry = useMemo(() => new SphereGeometry(0.04, 8, 8), []);
  const material = useMemo(() => new MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.9,
  }), [color]);
  
  // Initialize particle positions around breach points
  const particleData = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => {
      const breachIndex = breachIndices[Math.floor(i / 8)] || breachIndices[0] || 0;
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.1 + Math.random() * 0.3;
      const speed = 0.5 + Math.random() * 1.5;
      return { breachIndex, angle, radius, speed };
    });
  }, [particleCount, breachIndices]);
  
  const maxValue = useMemo(() => Math.max(...data, 0.1) * 1.1, [data]);
  const minValue = useMemo(() => Math.min(...data, 0) * 0.9, [data]);
  const range = Math.max(maxValue - minValue, 0.1);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);
  
  useFrame((_, delta) => {
    if (!meshRef.current || particleCount === 0) return;
    
    timeRef.current += delta;
    
    const width = 10;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = particleData[i];
      if (!particle) continue;
      
      const progress = particle.breachIndex / (data.length - 1);
      const xPos = (progress * width) - width / 2;
      
      const value = data[particle.breachIndex];
      const normalizedValue = (value - minValue) / range;
      const baseY = normalizedValue * 3;
      
      // Orbiting particles around breach point
      const orbitTime = timeRef.current * particle.speed + particle.angle;
      const orbitRadius = particle.radius * (1 + Math.sin(timeRef.current * 2) * 0.2);
      
      const offsetX = Math.cos(orbitTime) * orbitRadius * 0.5;
      const offsetY = Math.sin(orbitTime * 1.3) * orbitRadius;
      const offsetZ = Math.sin(orbitTime * 0.7) * orbitRadius;
      
      tempPosition.set(xPos + offsetX, baseY + offsetY, offsetZ);
      tempObject.position.copy(tempPosition);
      
      // Scale pulses when near current index
      const isNearCurrent = Math.abs(particle.breachIndex - currentIndex) < 10;
      const scale = isNearCurrent 
        ? 1.5 + Math.sin(timeRef.current * 8) * 0.5 
        : 0.8 + Math.sin(timeRef.current * 2) * 0.2;
      tempObject.scale.setScalar(scale);
      
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
      
      // Color intensity based on proximity to current index
      const intensity = isNearCurrent ? 1 : 0.5;
      tempColor.set(color);
      tempColor.multiplyScalar(intensity);
      meshRef.current.setColorAt(i, tempColor);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });
  
  if (particleCount === 0) return null;
  
  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, particleCount]}
      frustumCulled={false}
    />
  );
});

export default DVRAnomalyParticles;
export type { DVRAnomalyParticlesProps };
