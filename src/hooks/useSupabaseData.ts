import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchMachines,
  fetchActiveJobs,
  fetchActiveIncidents,
  fetchTransvecShipments,
  fetchTransvecAlerts,
  fetchLatestSensorReadings,
  fetchGeofences,
  fetchFabHealthSnapshot,
  createTransvecAlerts,
  createTransvecAlertsViaEdge,
  resolveIncident,
  acknowledgeTransvecAlert,
  subscribeToMachines,
  subscribeToJobs,
  subscribeToIncidents,
  subscribeToAnomalyAlerts,
  subscribeToMaintenanceLogs,
  subscribeToTransvecShipments,
  subscribeToTransvecAlerts,
  subscribeToGeofences,
  isSupabaseConfigured,
} from '../lib/supabase';
import {
  transformJobToShipment,
  transformIncidentToAlert,
  transformTransvecShipmentToShipment,
  transformTransvecAlertToAlert,
  transformAnomalyAlertToAlert,
  transformMaintenanceLogToAlert,
  enrichShipmentWithDispatch,
  computeFabHealthSummary,
} from '../lib/dataAdapter';
import type { FabHealthSummary } from '../lib/dataAdapter';
import { buildAutoGeofences, computeBreachPoints } from '../lib/geofences';
import type { Shipment, Alert } from '../types';

const OPS_CACHE_KEY = 'transvec:ops-cache:v1';
const OPS_CACHE_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

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

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

interface OpsCachePayload {
  savedAt: number;
  shipments: Shipment[];
  alerts: Array<Omit<Alert, 'timestamp'> & { timestamp: string }>;
  fabHealth: FabHealthSummary | null;
}

function readOpsCache(): { shipments: Shipment[]; alerts: Alert[]; fabHealth: FabHealthSummary | null } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(OPS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OpsCachePayload;
    if (!parsed || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > OPS_CACHE_MAX_AGE_MS) return null;

    const shipments = Array.isArray(parsed.shipments)
      ? parsed.shipments.map((shipment) => ({
        ...shipment,
        eta: shipment.eta ? new Date(shipment.eta) : undefined,
        telemetry: {
          ...shipment.telemetry,
          timestamp: new Date(shipment.telemetry.timestamp),
        },
      }))
      : [];

    const alerts = Array.isArray(parsed.alerts)
      ? parsed.alerts.map((alert) => ({
        ...alert,
        timestamp: new Date(alert.timestamp),
      }))
      : [];

    return { shipments, alerts, fabHealth: parsed.fabHealth || null };
  } catch {
    return null;
  }
}

function writeOpsCache(shipments: Shipment[], alerts: Alert[], fabHealth: FabHealthSummary | null) {
  if (typeof window === 'undefined') return;
  try {
    const payload: OpsCachePayload = {
      savedAt: Date.now(),
      shipments,
      alerts: alerts.map((alert) => ({
        ...alert,
        timestamp: alert.timestamp.toISOString(),
      })),
      fabHealth,
    };
    window.localStorage.setItem(OPS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore cache write failures
  }
}

interface UseSupabaseDataReturn {
  shipments: Shipment[];
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  useMockFallback: boolean;
  fabHealth: FabHealthSummary | null;
  acknowledgeAlertById: (alertId: string) => Promise<boolean>;
  refreshData: () => void;
}

export function useSupabaseData(): UseSupabaseDataReturn {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockFallback, setUseMockFallback] = useState(false);
  const [fabHealth, setFabHealth] = useState<FabHealthSummary | null>(null);
  const lastBreachDigestRef = useRef(new Set<string>());

  const isInitialLoad = useRef(true);
  const lastFetchTime = useRef(0);

  const loadData = useCallback(async (isBackground = false) => {
    const now = Date.now();
    if (!isBackground && now - lastFetchTime.current < 3000) return;
    lastFetchTime.current = now;

    if (!isBackground || isInitialLoad.current) setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      setUseMockFallback(true);
      setLoading(false);
      isInitialLoad.current = false;
      return;
    }

    try {
      const [machines, jobs, incidents, transvecShipments, transvecAlerts, geofenceRows] = await Promise.all([
        fetchMachines(),
        fetchActiveJobs(),
        fetchActiveIncidents(),
        fetchTransvecShipments(),
        fetchTransvecAlerts(),
        fetchGeofences(),
      ]);

      const hasData = machines.length > 0 || jobs.length > 0 || transvecShipments.length > 0;

      if (hasData) {
        const emptyHealthSnapshot: Awaited<ReturnType<typeof fetchFabHealthSnapshot>> = {
          agents: [],
          anomalyAlerts: [],
          maintenanceLogs: [],
          dispatchDecisions: [],
          facilityStatus: [],
          bonderStatus: [],
          metrologyResults: [],
          vmPredictions: [],
          recipeAdjustments: [],
          capacitySimulations: [],
        };
        const machineIdsWithJobs = new Set(jobs.map(j => j.assigned_machine_id).filter(Boolean));
        const [healthSnapshot, sensorReadings] = await Promise.all([
          withTimeout(fetchFabHealthSnapshot(), 1200, emptyHealthSnapshot),
          withTimeout(
            fetchLatestSensorReadings(Array.from(machineIdsWithJobs) as string[]),
            1200,
            {} as Awaited<ReturnType<typeof fetchLatestSensorReadings>>,
          ),
        ]);

        // Transform YieldOps jobs → shipments
        let transformedShipments = jobs.map(job => {
          const machine = machines.find(m => m.machine_id === job.assigned_machine_id) || null;
          const sensor = machine ? sensorReadings[machine.machine_id] : null;
          return transformJobToShipment(job, machine, sensor);
        });

        // Enrich shipments with ToC dispatch decisions
        if (healthSnapshot.dispatchDecisions.length > 0) {
          transformedShipments = transformedShipments.map(s =>
            enrichShipmentWithDispatch(s, healthSnapshot.dispatchDecisions)
          );
        }

        const directShipments = transvecShipments.map(transformTransvecShipmentToShipment);

        // Build unified alert stream from ALL sources
        const transformedAlerts: Alert[] = [
          // Aegis incidents (Sentinel)
          ...incidents.map(transformIncidentToAlert),
          // Transvec native alerts
          ...transvecAlerts.map(transformTransvecAlertToAlert),
          // ML anomaly alerts (YieldOps Sentinel)
          ...healthSnapshot.anomalyAlerts.map(transformAnomalyAlertToAlert),
          // Maintenance events as alerts
          ...healthSnapshot.maintenanceLogs
            .filter(m => !m.completed_at)  // Only active maintenance
            .map(transformMaintenanceLogToAlert),
        ];

        const mergedShipments = [...directShipments, ...transformedShipments];
        const uniqueShipments = new Map(mergedShipments.map((shipment) => [shipment.id, shipment]));
        const nextShipments = Array.from(uniqueShipments.values());

        const dbFeatures = geofenceRows
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
          .filter(Boolean) as GeoJSON.Feature[];

        type GeoFC = GeoJSON.FeatureCollection<GeoJSON.Geometry, { id?: string; name?: string; type?: string }>;
        const geofenceCollection: GeoFC | null = dbFeatures.length > 0
          ? { type: 'FeatureCollection', features: dbFeatures } as GeoFC
          : buildAutoGeofences(nextShipments);

        const breaches = computeBreachPoints(nextShipments, geofenceCollection);
        const breachAlerts = breaches.map((feature) => ({
          id: `breach-${feature.properties?.shipmentId || Math.random()}`,
          type: 'GEOFENCE_BREACH' as const,
          severity: (feature.properties?.severity || 'WARNING') as 'CRITICAL' | 'WARNING' | 'INFO',
          shipmentId: feature.properties?.shipmentId || 'unknown',
          message: `Geofence breach detected (${feature.properties?.mode || 'TRUCK'})`,
          timestamp: new Date(),
          acknowledged: false,
          source: 'transvec' as const,
        }));

        setShipments(nextShipments);
        const nextAlerts = [...transformedAlerts, ...breachAlerts];
        setAlerts(nextAlerts);

        // Compute and expose the cross-system health summary
        const nextFabHealth = computeFabHealthSummary(healthSnapshot);
        setFabHealth(nextFabHealth);
        writeOpsCache(nextShipments, nextAlerts, nextFabHealth);

        if (breachAlerts.length > 0) {
          const newRows = breachAlerts
            .filter((alert) => !lastBreachDigestRef.current.has(alert.shipmentId))
            .map((alert) => ({
              type: alert.type,
              severity: alert.severity,
              shipment_id: alert.shipmentId,
              message: alert.message,
            }));
          newRows.forEach((row) => lastBreachDigestRef.current.add(row.shipment_id));
          if (newRows.length > 0) {
            void createTransvecAlertsViaEdge(newRows).then((ok) => {
              if (!ok) void createTransvecAlerts(newRows);
            });
          }
        }
        setUseMockFallback(false);
      } else {
        setUseMockFallback(true);
      }
    } catch {
      setUseMockFallback(true);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, []);

  const acknowledgeAlertById = useCallback(async (alertId: string) => {
    if (useMockFallback) {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      return true;
    }

    const alert = alerts.find((item) => item.id === alertId);
    const success = alert?.source === 'transvec'
      ? await acknowledgeTransvecAlert(alertId)
      : await resolveIncident(alertId);
    if (success) {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    }
    return success;
  }, [useMockFallback, alerts]);

  useEffect(() => {
    const cached = readOpsCache();
    if (cached) {
      setShipments(cached.shipments);
      setAlerts(cached.alerts);
      setFabHealth(cached.fabHealth);
      setUseMockFallback(false);
      setLoading(false);
      isInitialLoad.current = false;
      void loadData(true);
      return;
    }
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => loadData(true), 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (useMockFallback) return;
    const machinesSub = subscribeToMachines(() => loadData(true));
    const jobsSub = subscribeToJobs(() => loadData(true));
    const incidentsSub = subscribeToIncidents(() => loadData(true));
    const anomalySub = subscribeToAnomalyAlerts(() => loadData(true));
    const maintenanceSub = subscribeToMaintenanceLogs(() => loadData(true));
    const transvecShipmentsSub = subscribeToTransvecShipments(() => loadData(true));
    const transvecAlertsSub = subscribeToTransvecAlerts(() => loadData(true));
    const geofenceSub = subscribeToGeofences(() => loadData(true));
    return () => {
      machinesSub.unsubscribe();
      jobsSub.unsubscribe();
      incidentsSub.unsubscribe();
      anomalySub.unsubscribe();
      maintenanceSub.unsubscribe();
      transvecShipmentsSub.unsubscribe();
      transvecAlertsSub.unsubscribe();
      geofenceSub.unsubscribe();
    };
  }, [useMockFallback, loadData]);

  return {
    shipments,
    alerts,
    loading,
    error,
    useMockFallback,
    fabHealth,
    acknowledgeAlertById,
    refreshData: () => loadData(false)
  };
}
