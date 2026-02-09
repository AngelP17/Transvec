/* @refresh reset */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchGeofences, upsertGeofences, syncGeofencesViaEdge } from '../lib/supabase';
import { buildAutoGeofences } from '../lib/geofences';
import type { GeofenceFeatureCollection, Shipment } from '../types';

function normalizeGeoJson(value: unknown): GeoJSON.Geometry | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as GeoJSON.Geometry;
      return parsed;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object' && 'type' in (value as object)) {
    return value as GeoJSON.Geometry;
  }
  return null;
}

export function useGeofences(shipments: Shipment[] = []) {
  const [geofences, setGeofences] = useState<GeofenceFeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const autoGeofences = useMemo(() => buildAutoGeofences(shipments), [shipments]);
  const hasPersistedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const rows = await fetchGeofences();
      const features = rows
        .map((row) => {
          const geom = normalizeGeoJson(row.geojson || row.geometry || row.polygon);
          if (!geom) return null;
          return {
            type: 'Feature',
            geometry: geom,
            properties: {
              id: row.id,
              name: row.name || 'GEOFENCE',
              type: row.zone_type || 'AUTHORIZED',
            },
          } as GeoJSON.Feature<GeoJSON.Geometry, { id?: string; name?: string; type?: string }>;
        })
        .filter(Boolean) as GeofenceFeatureCollection['features'];

      if (features.length === 0) {
        setGeofences(autoGeofences);
        if (autoGeofences && !hasPersistedRef.current) {
          const rows = autoGeofences.features
            .filter((feature) => feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon'))
            .map((feature) => ({
              name: feature.properties?.name || 'AUTO-GEOFENCE',
              zone_type: feature.properties?.type || 'AUTHORIZED_ROUTE',
              geojson: feature.geometry,
            }));
          if (rows.length > 0) {
            const persisted = await syncGeofencesViaEdge(rows);
            const fallback = !persisted ? await upsertGeofences(rows) : true;
            if (persisted || fallback) hasPersistedRef.current = true;
          }
        }
      } else {
        setGeofences({ type: 'FeatureCollection', features });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load geofences');
      setGeofences(autoGeofences);
    } finally {
      setLoading(false);
    }
  }, [autoGeofences]);

  useEffect(() => {
    void load();
  }, [load]);

  return { geofences, loading, error, refresh: load };
}
