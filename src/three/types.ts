export type GPUTier = 'high' | 'medium' | 'low';

export interface GPUProfile {
  tier: GPUTier;
  maxParticles: number;
  enableBloom: boolean;
  enableParticleFlow: boolean;
  globeSegments: number;
  use3DSidebarIcons: boolean;
  dvrGraphMode: '3d' | '2d';
}

export interface GlobePoint {
  lat: number;
  lng: number;
  color: string;
  size: number;
  id: string;
  status: string;
}

export interface ArcData {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  color: string;
  id: string;
  status: string;
}

// DVR Graph types
export interface DVRGraphData {
  values: number[];
  timestamps: Date[];
  threshold?: number;
  currentIndex: number;
  label: string;
  color: string;
  thresholdColor?: string;
  unit?: string;
}

export interface DVRSurfaceProps {
  data: number[];
  currentIndex: number;
  color: string;
  threshold?: number;
  thresholdColor?: string;
  gpu: GPUProfile;
}

export interface DVRThresholdPlaneProps {
  threshold: number;
  maxValue: number;
  minValue: number;
  color: string;
  breachCount: number;
}

export interface DVRAnomalyParticlesProps {
  data: number[];
  threshold: number;
  currentIndex: number;
  color: string;
  gpu: GPUProfile;
}
