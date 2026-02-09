import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import GlobeScene from './GlobeScene';
import ShipmentPoints from './ShipmentPoints';
import ShipmentArcs from './ShipmentArcs';
import ParticleFlow from './ParticleFlow';
import BloomProvider from './BloomProvider';
import { useGPUTier } from './useGPUTier';
import type { Shipment } from '../types';
import type { GlobePoint, ArcData, GPUProfile } from './types';

interface GlobeOverlayProps {
  shipments: Shipment[];
  selectedShipment: Shipment | null;
  opacity?: number;
}

function GlobeContent({
  points,
  arcs,
  selectedId,
  gpu,
}: {
  points: GlobePoint[];
  arcs: ArcData[];
  selectedId: string | null;
  gpu: GPUProfile;
}) {
  return (
    <>
      <GlobeScene gpu={gpu} />
      <ShipmentPoints points={points} selectedId={selectedId} />
      <ShipmentArcs arcs={arcs} selectedId={selectedId} />
      {gpu.enableParticleFlow && (
        <ParticleFlow arcs={arcs} maxParticles={gpu.maxParticles} />
      )}
      <BloomProvider gpu={gpu} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={0.3}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.8}
      />
    </>
  );
}

export default function GlobeOverlay({
  shipments,
  selectedShipment,
  opacity = 1,
}: GlobeOverlayProps) {
  const gpu = useGPUTier();

  const points: GlobePoint[] = useMemo(
    () =>
      shipments
        .filter((s) => s.currentLocation)
        .map((s) => ({
          lat: s.currentLocation!.lat,
          lng: s.currentLocation!.lng,
          color: s.status === 'CRITICAL' ? '#FF4D4F' : '#2D72D2',
          size: s.status === 'CRITICAL' ? 1.5 : 1.0,
          id: s.id,
          status: s.status,
        })),
    [shipments]
  );

  const arcs: ArcData[] = useMemo(
    () =>
      shipments
        .filter((s) => s.origin.location && s.destination.location)
        .map((s) => ({
          origin: { lat: s.origin.location.lat, lng: s.origin.location.lng },
          destination: { lat: s.destination.location.lat, lng: s.destination.location.lng },
          color: s.status === 'CRITICAL' ? '#FF4D4F' : '#2D72D2',
          id: s.id,
          status: s.status,
        })),
    [shipments]
  );

  return (
    <div
      className="absolute inset-0 z-[1]"
      style={{
        opacity,
        pointerEvents: 'none',
        transition: 'opacity 0.5s ease',
      }}
    >
      <Canvas
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 5.5], fov: 42 }}
        style={{ background: 'transparent' }}
        frameloop="always"
        dpr={[1, 1.5]}
      >
        <GlobeContent
          points={points}
          arcs={arcs}
          selectedId={selectedShipment?.id || null}
          gpu={gpu}
        />
      </Canvas>
    </div>
  );
}
