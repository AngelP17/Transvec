import type { Shipment, GeofenceFeatureCollection, GeoLocation } from '../types';

type Mode = Shipment['dossier'] extends { mode: infer M } ? M : 'TRUCK' | 'TRAIN' | 'AIR' | 'SEA';

type GeoPolygonGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function toDeg(value: number) {
  return (value * 180) / Math.PI;
}

function interpolateGreatCircle(origin: GeoLocation, destination: GeoLocation, steps: number) {
  const lat1 = toRad(origin.lat);
  const lon1 = toRad(origin.lng);
  const lat2 = toRad(destination.lat);
  const lon2 = toRad(destination.lng);

  const delta = 2 * Math.asin(Math.sqrt(
    Math.sin((lat2 - lat1) / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
  ));

  if (delta === 0) return [origin, destination];

  const points: GeoLocation[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const A = Math.sin((1 - t) * delta) / Math.sin(delta);
    const B = Math.sin(t * delta) / Math.sin(delta);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);
    points.push({ lat: toDeg(lat), lng: toDeg(lon) });
  }

  return points;
}

function buildRoutePathPoints(origin: GeoLocation, destination: GeoLocation, mode: Mode) {
  if (mode === 'AIR' || mode === 'SEA') {
    const steps = mode === 'AIR' ? 18 : 22;
    return interpolateGreatCircle(origin, destination, steps);
  }

  const steps = mode === 'TRAIN' ? 8 : 6;
  const points: GeoLocation[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    points.push({
      lat: origin.lat + (destination.lat - origin.lat) * t,
      lng: origin.lng + (destination.lng - origin.lng) * t,
    });
  }
  return points;
}

function pointToSegmentDistanceKm(point: GeoLocation, a: GeoLocation, b: GeoLocation) {
  const meanLat = (a.lat + b.lat + point.lat) / 3;
  const kmPerDegLat = 111.32;
  const kmPerDegLon = 111.32 * Math.cos(toRad(meanLat));

  const ax = (a.lng - point.lng) * kmPerDegLon;
  const ay = (a.lat - point.lat) * kmPerDegLat;
  const bx = (b.lng - point.lng) * kmPerDegLon;
  const by = (b.lat - point.lat) * kmPerDegLat;

  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.sqrt(ax * ax + ay * ay);

  const t = clamp(-(ax * dx + ay * dy) / lengthSq, 0, 1);
  const projX = ax + dx * t;
  const projY = ay + dy * t;
  return Math.sqrt(projX * projX + projY * projY);
}

function pointToPolylineDistanceKm(point: GeoLocation, line: GeoLocation[]) {
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < line.length - 1; i += 1) {
    const dist = pointToSegmentDistanceKm(point, line[i], line[i + 1]);
    if (dist < min) min = dist;
  }
  return min;
}

function buildRouteCorridor(origin: GeoLocation, destination: GeoLocation, mode: Mode = 'TRUCK') {
  const meanLat = (origin.lat + destination.lat) / 2;
  const kmPerDegLat = 111.32;
  const kmPerDegLon = 111.32 * Math.cos(toRad(meanLat));

  const dxDeg = destination.lng - origin.lng;
  const dyDeg = destination.lat - origin.lat;

  const dxKm = dxDeg * kmPerDegLon;
  const dyKm = dyDeg * kmPerDegLat;
  const lengthKm = Math.max(Math.sqrt(dxKm * dxKm + dyKm * dyKm), 1);

  const baseWidthKm = clamp(lengthKm * 0.08, 35, 140);
  const modeWidthMultiplier: Record<Mode, number> = {
    TRUCK: 1.1,
    TRAIN: 0.75,
    AIR: 2.4,
    SEA: 2.8,
  };
  const corridorWidthKm = baseWidthKm * (modeWidthMultiplier[mode] || 1);
  const halfWidthKm = corridorWidthKm / 2;
  const extendKm = clamp(corridorWidthKm * 0.6, 20, 180);

  const ux = dxKm / lengthKm;
  const uy = dyKm / lengthKm;

  const px = -uy;
  const py = ux;

  const offsetLng = (px * halfWidthKm) / kmPerDegLon;
  const offsetLat = (py * halfWidthKm) / kmPerDegLat;

  const extendLng = (ux * extendKm) / kmPerDegLon;
  const extendLat = (uy * extendKm) / kmPerDegLat;

  const start = { lng: origin.lng - extendLng, lat: origin.lat - extendLat };
  const end = { lng: destination.lng + extendLng, lat: destination.lat + extendLat };

  const p1: [number, number] = [start.lng + offsetLng, start.lat + offsetLat];
  const p2: [number, number] = [end.lng + offsetLng, end.lat + offsetLat];
  const p3: [number, number] = [end.lng - offsetLng, end.lat - offsetLat];
  const p4: [number, number] = [start.lng - offsetLng, start.lat - offsetLat];

  return {
    type: 'Polygon',
    coordinates: [[p1, p2, p3, p4, p1]],
  } as GeoJSON.Polygon;
}

function pointInRing(point: [number, number], ring: [number, number][]) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isPointInPolygon(point: GeoLocation, geometry: GeoJSON.Geometry | null | undefined) {
  if (!geometry) return false;
  const coords: [number, number] = [point.lng, point.lat];

  if (geometry.type === 'Polygon') {
    const polygon = geometry as GeoJSON.Polygon;
    if (!polygon.coordinates.length) return false;
    if (!pointInRing(coords, polygon.coordinates[0])) return false;
    return polygon.coordinates.slice(1).every((ring) => !pointInRing(coords, ring));
  }

  if (geometry.type === 'MultiPolygon') {
    const multi = geometry as GeoJSON.MultiPolygon;
    return multi.coordinates.some((polygon) => {
      if (!polygon.length) return false;
      if (!pointInRing(coords, polygon[0])) return false;
      return polygon.slice(1).every((ring) => !pointInRing(coords, ring));
    });
  }

  return false;
}

export function buildAutoGeofences(shipments: Shipment[]): GeofenceFeatureCollection | null {
  if (!shipments.length) return null;

  const routes = new Map<string, { origin: GeoLocation; destination: GeoLocation; name: string; mode: Mode }>();

  shipments.forEach((shipment) => {
    const origin = shipment.origin?.location;
    const destination = shipment.destination?.location;
    if (!origin || !destination) return;

    const key = shipment.routeId || `${shipment.origin.id}-${shipment.destination.id}`;
    if (routes.has(key)) return;

    routes.set(key, {
      origin,
      destination,
      name: `ROUTE-${shipment.trackingCode}`,
      mode: shipment.dossier?.mode || 'TRUCK',
    });
  });

  if (routes.size === 0) return null;

  const features: GeofenceFeatureCollection['features'] = [];
  let index = 1;

  routes.forEach((route, key) => {
    const geometry = buildRouteCorridor(route.origin, route.destination, route.mode);
    const feature: GeoJSON.Feature<GeoPolygonGeometry, { id?: string; name?: string; type?: string }> = {
      type: 'Feature',
      geometry,
      properties: {
        id: key,
        name: route.name || `ROUTE-${index}`,
        type: `AUTHORIZED_${route.mode}`,
      },
    };
    features.push(feature);
    index += 1;
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function buildRouteLineFeatures(shipments: Shipment[]) {
  if (!shipments.length) return { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection;

  const routes = new Map<string, { origin: GeoLocation; destination: GeoLocation; mode: Mode }>();
  shipments.forEach((shipment) => {
    const origin = shipment.origin?.location;
    const destination = shipment.destination?.location;
    if (!origin || !destination) return;
    const key = shipment.routeId || `${shipment.origin.id}-${shipment.destination.id}`;
    if (routes.has(key)) return;
    routes.set(key, {
      origin,
      destination,
      mode: shipment.dossier?.mode || 'TRUCK',
    });
  });

  const features: GeoJSON.Feature[] = [];
  routes.forEach((route, key) => {
    const points = buildRoutePathPoints(route.origin, route.destination, route.mode);
    const geometry: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: points.map((point) => [point.lng, point.lat]),
    };
    features.push({
      type: 'Feature',
      geometry,
      properties: {
        id: key,
        mode: route.mode,
      },
    });
  });

  return {
    type: 'FeatureCollection',
    features,
  } as GeoJSON.FeatureCollection;
}

export function computeBreachPoints(shipments: Shipment[], geofences: GeofenceFeatureCollection | null) {
  if (!geofences || geofences.features.length === 0) return [] as GeoJSON.Feature[];

  const polygonFeatures = geofences.features.filter((feature) =>
    feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')
  );
  if (polygonFeatures.length === 0) return [] as GeoJSON.Feature[];

  return shipments
    .map((shipment) => {
      if (!shipment.currentLocation) return null;
      const routeTag = shipment.dossier?.mode ? `AUTHORIZED_${shipment.dossier.mode}` : null;
      const candidatePolygons = routeTag
        ? polygonFeatures.filter((feature) => feature.properties?.type === routeTag)
        : polygonFeatures;
      const targetPolygons = candidatePolygons.length > 0 ? candidatePolygons : polygonFeatures;

      const insideAny = targetPolygons.some((feature) =>
        isPointInPolygon(shipment.currentLocation!, feature.geometry)
      );

      const mode = shipment.dossier?.mode || 'TRUCK';
      const routePoints = shipment.origin?.location && shipment.destination?.location
        ? buildRoutePathPoints(shipment.origin.location, shipment.destination.location, mode)
        : null;
      const distanceToRoute = routePoints
        ? pointToPolylineDistanceKm(shipment.currentLocation, routePoints)
        : Number.POSITIVE_INFINITY;

      const maxDistanceKm: Record<Mode, number> = {
        TRUCK: 35,
        TRAIN: 22,
        AIR: 160,
        SEA: 220,
      };
      const maxDistance = maxDistanceKm[mode] || 35;

      if (insideAny || distanceToRoute <= maxDistance) return null;

      return {
        type: 'Feature',
        properties: {
          shipmentId: shipment.id,
          trackingCode: shipment.trackingCode,
          severity: shipment.status === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
          mode,
        },
        geometry: {
          type: 'Point',
          coordinates: [shipment.currentLocation.lng, shipment.currentLocation.lat],
        },
      } as GeoJSON.Feature;
    })
    .filter(Boolean) as GeoJSON.Feature[];
}
