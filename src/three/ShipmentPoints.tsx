import { useRef, useMemo, memo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  InstancedMesh,
  SphereGeometry,
  MeshStandardMaterial,
  Object3D,
  Color,
} from 'three';
import { GLOBE, STATUS_COLORS, COLORS, latLngToPosition } from './constants';
import type { GlobePoint } from './types';

interface ShipmentPointsProps {
  points: GlobePoint[];
  selectedId: string | null;
}

const tempObject = new Object3D();
const tempColor = new Color();

// Memoized to prevent unnecessary re-renders when parent updates
const ShipmentPoints = memo(function ShipmentPoints({ points, selectedId }: ShipmentPointsProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const pulseRef = useRef(0);

  // Memoized geometry - reused across renders
  const geometry = useMemo(() => {
    const geo = new SphereGeometry(0.03, 16, 16);
    return geo;
  }, []);
  
  // Memoized material - reused across renders
  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({
      emissiveIntensity: 1.2,
      roughness: 0.3,
      metalness: 0.5,
      toneMapped: false,
    });
    return mat;
  }, []);

  // Explicit cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    pulseRef.current += delta * 3;
    const pulseScale = 1 + Math.sin(pulseRef.current) * 0.3;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const [x, y, z] = latLngToPosition(point.lat, point.lng, GLOBE.radius + 0.02);

      tempObject.position.set(x, y, z);

      const isSelected = point.id === selectedId;
      const isCritical = point.status === 'CRITICAL';
      const scale = isSelected ? 2.0 : isCritical ? pulseScale * 1.4 : 1.0;
      tempObject.scale.setScalar(scale);
      tempObject.updateMatrix();

      meshRef.current.setMatrixAt(i, tempObject.matrix);

      // Set instance color
      const statusColor = STATUS_COLORS[point.status] || COLORS.accent;
      tempColor.copy(statusColor);
      if (isSelected) {
        tempColor.lerp(new Color('#ffffff'), 0.3);
      }
      meshRef.current.setColorAt(i, tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, points.length]}
      frustumCulled={false}
    />
  );
});

export default ShipmentPoints;
