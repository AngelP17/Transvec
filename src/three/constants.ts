import { Color } from 'three';

export const COLORS = {
  accent: new Color('#2D72D2'),
  accentDim: new Color('#1a4580'),
  critical: new Color('#FF4D4F'),
  warning: new Color('#FFB000'),
  success: new Color('#0F9960'),
  void: new Color('#10161a'),
  voidLight: new Color('#141d25'),
  border: new Color('#2b3b47'),
  textBright: new Color('#d3e2ee'),
  textMuted: new Color('#8a9ba8'),
} as const;

export const STATUS_COLORS: Record<string, Color> = {
  SCHEDULED: new Color('#8a9ba8'),
  IN_TRANSIT: new Color('#2D72D2'),
  DELIVERED: new Color('#0F9960'),
  CRITICAL: new Color('#FF4D4F'),
  DELAYED: new Color('#FFB000'),
};

export const GLOBE = {
  radius: 2,
  segments: { high: 128, medium: 64, low: 32 } as Record<string, number>,
  rotationSpeed: 0.0008,
  arcHeight: 0.4,
  atmosphereScale: 1.06,
} as const;

export const PARTICLES = {
  count: { high: 3000, medium: 1500, low: 0 } as Record<string, number>,
  size: 0.015,
  speed: 0.003,
} as const;

export function latLngToPosition(
  lat: number,
  lng: number,
  radius: number
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
}

export function getGreatCirclePoints(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  radius: number,
  numPoints: number = 50,
  arcHeight: number = GLOBE.arcHeight
): [number, number, number][] {
  const points: [number, number, number][] = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat = origin.lat + (destination.lat - origin.lat) * t;
    const lng = origin.lng + (destination.lng - origin.lng) * t;

    // Parabolic lift: peaks at t=0.5
    const lift = 4 * arcHeight * t * (1 - t);
    const [x, y, z] = latLngToPosition(lat, lng, radius + lift);
    points.push([x, y, z]);
  }

  return points;
}
