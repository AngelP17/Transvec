import { useMemo, useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Color } from 'three';
import { GLOBE, STATUS_COLORS, COLORS, getGreatCirclePoints } from './constants';
import type { ArcData } from './types';

interface ShipmentArcsProps {
  arcs: ArcData[];
  selectedId: string | null;
}

interface ArcLineProps {
  arc: ArcData;
  isSelected: boolean;
}

// Memoized individual arc line
const ArcLine = memo(function ArcLine({ arc, isSelected }: ArcLineProps) {
  const dashRef = useRef(0);

  // Memoized points calculation
  const points = useMemo(
    () => getGreatCirclePoints(arc.origin, arc.destination, GLOBE.radius, 60),
    [arc.origin, arc.destination]
  );

  // Memoized color calculation
  const color = useMemo(() => {
    const c = STATUS_COLORS[arc.status] || COLORS.accent;
    return isSelected ? new Color(c).lerp(new Color('#ffffff'), 0.3) : c;
  }, [arc.status, isSelected]);

  useFrame((_, delta) => {
    dashRef.current += delta * 0.5;
  });

  return (
    <Line
      points={points}
      color={color}
      lineWidth={isSelected ? 2.5 : 1.5}
      transparent
      opacity={isSelected ? 0.95 : 0.6}
      dashed
      dashSize={0.08}
      gapSize={0.04}
      dashOffset={-dashRef.current}
    />
  );
});

// Memoized to prevent re-renders when parent updates
const ShipmentArcs = memo(function ShipmentArcs({ arcs, selectedId }: ShipmentArcsProps) {
  return (
    <group>
      {arcs.map((arc) => (
        <ArcLine 
          key={arc.id} 
          arc={arc} 
          isSelected={arc.id === selectedId} 
        />
      ))}
    </group>
  );
});

export default ShipmentArcs;
