import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  fetchMachines, 
  fetchActiveJobs, 
  fetchActiveIncidents,
  fetchTransvecShipments,
  fetchTransvecAlerts,
  fetchLatestSensorReadings,
  resolveIncident,
  acknowledgeTransvecAlert,
  subscribeToMachines,
  subscribeToJobs,
  subscribeToIncidents,
} from '../lib/supabase';
import { 
  transformJobToShipment, 
  transformIncidentToAlert,
  transformTransvecShipmentToShipment,
  transformTransvecAlertToAlert,
} from '../lib/dataAdapter';
import type { Shipment, Alert } from '../types';

interface UseSupabaseDataReturn {
  shipments: Shipment[];
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  useMockFallback: boolean;
  acknowledgeAlertById: (alertId: string) => Promise<boolean>;
  refreshData: () => void;
}

export function useSupabaseData(): UseSupabaseDataReturn {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockFallback, setUseMockFallback] = useState(false);
  
  const isInitialLoad = useRef(true);
  const lastFetchTime = useRef(0);

  const loadData = useCallback(async (isBackground = false) => {
    const now = Date.now();
    if (!isBackground && now - lastFetchTime.current < 3000) return;
    lastFetchTime.current = now;

    if (!isBackground || isInitialLoad.current) setLoading(true);
    setError(null);

    try {
      const [machines, jobs, incidents, transvecShipments, transvecAlerts] = await Promise.all([
        fetchMachines(),
        fetchActiveJobs(),
        fetchActiveIncidents(),
        fetchTransvecShipments(),
        fetchTransvecAlerts(),
      ]);

      const hasData = machines.length > 0 || jobs.length > 0 || transvecShipments.length > 0;

      if (hasData) {
        const machineIdsWithJobs = new Set(jobs.map(j => j.assigned_machine_id).filter(Boolean));
        const sensorReadings = await fetchLatestSensorReadings(Array.from(machineIdsWithJobs) as string[]);

        const transformedShipments = jobs.map(job => {
          const machine = machines.find(m => m.machine_id === job.assigned_machine_id) || null;
          const sensor = machine ? sensorReadings[machine.machine_id] : null;
          return transformJobToShipment(job, machine, sensor);
        });

        const directShipments = transvecShipments.map(transformTransvecShipmentToShipment);
        const transformedAlerts = incidents.map(transformIncidentToAlert).concat(
          transvecAlerts.map(transformTransvecAlertToAlert)
        );

        const mergedShipments = [...directShipments, ...transformedShipments];
        const uniqueShipments = new Map(mergedShipments.map((shipment) => [shipment.id, shipment]));
        setShipments(Array.from(uniqueShipments.values()));
        setAlerts(transformedAlerts);
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

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const interval = setInterval(() => loadData(true), 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (useMockFallback) return;
    const machinesSub = subscribeToMachines(() => loadData(true));
    const jobsSub = subscribeToJobs(() => loadData(true));
    const incidentsSub = subscribeToIncidents(() => loadData(true));
    return () => { 
      machinesSub.unsubscribe(); 
      jobsSub.unsubscribe();
      incidentsSub.unsubscribe();
    };
  }, [useMockFallback, loadData]);

  return { 
    shipments, 
    alerts, 
    loading, 
    error, 
    useMockFallback, 
    acknowledgeAlertById, 
    refreshData: () => loadData(false) 
  };
}
