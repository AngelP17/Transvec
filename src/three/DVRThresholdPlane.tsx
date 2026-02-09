import { useRef, useMemo, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { 
  Mesh, 
  DoubleSide, 
  PlaneGeometry, 
  EdgesGeometry, 
  MeshBasicMaterial,
  AdditiveBlending
} from 'three';
import type { DVRThresholdPlaneProps } from './types';

// Memoized component
const DVRThresholdPlane = memo(function DVRThresholdPlane({ 
  threshold, 
  maxValue, 
  minValue,
  color,
  breachCount 
}: DVRThresholdPlaneProps) {
  const meshRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const pulseRef = useRef(0);
  
  const range = Math.max(maxValue - minValue, 0.1);
  const normalizedThreshold = (threshold - minValue) / range;
  const yPos = normalizedThreshold * 3;
  
  // Memoized geometries
  const planeGeometry = useMemo(() => new PlaneGeometry(10, 4), []);
  const edgesGeometry = useMemo(() => new EdgesGeometry(new PlaneGeometry(10, 4)), []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      planeGeometry.dispose();
      edgesGeometry.dispose();
    };
  }, [planeGeometry, edgesGeometry]);
  
  // Breach animation
  useFrame((_, delta) => {
    if (!meshRef.current && !glowRef.current) return;
    
    if (breachCount > 0) {
      pulseRef.current += delta * 4;
      const pulseIntensity = 0.6 + Math.sin(pulseRef.current) * 0.3;
      
      if (meshRef.current) {
        const material = meshRef.current.material as MeshBasicMaterial;
        if (material) {
          material.opacity = pulseIntensity;
        }
      }
      
      if (glowRef.current) {
        const glowMaterial = glowRef.current.material as MeshBasicMaterial;
        if (glowMaterial) {
          glowMaterial.opacity = 0.2 + Math.sin(pulseRef.current * 2) * 0.1;
        }
      }
    }
  });
  
  return (
    <group position={[0, yPos, 0]}>
      {/* Main threshold plane */}
      <mesh 
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={planeGeometry}
      >
        <meshBasicMaterial
          color={color}
          transparent
          opacity={breachCount > 0 ? 0.6 : 0.3}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      
      {/* Threshold line edges */}
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color={color} linewidth={2} />
      </lineSegments>
      
      {/* Glowing effect when breached */}
      {breachCount > 0 && (
        <mesh 
          ref={glowRef}
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, 0.02, 0]}
          geometry={planeGeometry}
        >
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.2}
            side={DoubleSide}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
});

export default DVRThresholdPlane;
export type { DVRThresholdPlaneProps };
