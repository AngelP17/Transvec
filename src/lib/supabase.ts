import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vwayvxcvkozxumezwqio.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_bATl6MEumny_GL_qPtlI4Q_ubu3L0r1';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// TYPES
// ============================================

export interface YieldOpsMachine {
  machine_id: string;
  name: string;
  type: string;
  status: 'IDLE' | 'RUNNING' | 'DOWN' | 'MAINTENANCE';
  efficiency_rating: number;
  location_zone: string;
  current_wafer_count: number;
  total_wafers_processed: number;
  last_maintenance: string;
  created_at: string;
  updated_at: string;
}

export interface YieldOpsJob {
  job_id: string;
  job_name: string;
  wafer_count: number;
  priority_level: number;
  status: 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  recipe_type: string;
  assigned_machine_id: string | null;
  is_hot_lot: boolean;
  customer_tag: string;
  deadline: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface AegisIncident {
  incident_id: string;
  machine_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  incident_type: string;
  message: string;
  detected_value: number;
  threshold_value: number;
  action_taken: string;
  action_status: string;
  action_zone: string;
  agent_type: string;
  z_score: number;
  rate_of_change: number;
  resolved: boolean;
  resolved_at: string | null;
  operator_notes: string | null;
  created_at: string;
}

export interface SensorReading {
  reading_id: string;
  machine_id: string;
  temperature: number;
  vibration: number;
  pressure: number | null;
  power_consumption: number | null;
  is_anomaly: boolean;
  anomaly_score: number | null;
  recorded_at: string;
  agent_type: string | null;
  airflow_mps: number | null;
  particles_0_5um: number | null;
  pressure_diff_pa: number | null;
  usg_impedance: number | null;
  bond_time_ms: number | null;
  shear_strength_g: number | null;
}

export interface KnowledgeGraphNodeRow {
  node_id: string;
  label: string;
  node_type: string;
  color: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface KnowledgeGraphEdgeRow {
  edge_id: string;
  source_id: string;
  target_id: string;
  relation: string;
  weight: number | null;
  created_at: string;
}

export interface TransvecShipmentRow {
  id: string;
  tracking_code: string;
  status: string;
  origin_id: string | null;
  destination_id: string | null;
  current_location_lat: number | null;
  current_location_lng: number | null;
  carrier_id: string | null;
  wafer_lot_ids: string[] | null;
  sensor_ids: string[] | null;
  shock: number | null;
  temperature: number | null;
  humidity: number | null;
  vibration: number | null;
  eta: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransvecAlertRow {
  id: string;
  type: string;
  severity: string;
  shipment_id: string | null;
  message: string | null;
  acknowledged: boolean;
  created_at: string;
}

// ============================================
// FETCH FUNCTIONS
// ============================================

export async function fetchMachines(): Promise<YieldOpsMachine[]> {
  try {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchActiveJobs(): Promise<YieldOpsJob[]> {
  try {
    const { data, error } = await supabase
      .from('production_jobs')
      .select('*')
      .in('status', ['QUEUED', 'RUNNING', 'PENDING'])
      .order('priority_level', { ascending: true })
      .order('created_at', { ascending: false });
    
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchActiveIncidents(): Promise<AegisIncident[]> {
  try {
    const { data, error } = await supabase
      .from('aegis_incidents')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchLatestSensorReadings(machineIds: string[]): Promise<Record<string, SensorReading>> {
  if (machineIds.length === 0) return {};
  
  try {
    const { data, error } = await supabase
      .from('sensor_readings')
      .select('*')
      .in('machine_id', machineIds)
      .order('recorded_at', { ascending: false });
    
    if (error) return {};
    
    const latestByMachine: Record<string, SensorReading> = {};
    data?.forEach(reading => {
      if (!latestByMachine[reading.machine_id]) {
        latestByMachine[reading.machine_id] = reading;
      }
    });
    
    return latestByMachine;
  } catch {
    return {};
  }
}

export async function resolveIncident(incidentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('aegis_incidents')
      .update({ 
        resolved: true, 
        resolved_at: new Date().toISOString() 
      })
      .eq('incident_id', incidentId);
    
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

export async function fetchKnowledgeGraphNodes(): Promise<KnowledgeGraphNodeRow[]> {
  try {
    const { data, error } = await supabase
      .from('kg_nodes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchKnowledgeGraphEdges(): Promise<KnowledgeGraphEdgeRow[]> {
  try {
    const { data, error } = await supabase
      .from('kg_edges')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchTransvecShipments(): Promise<TransvecShipmentRow[]> {
  try {
    const { data, error } = await supabase
      .from('transvec_shipments')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500);

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchTransvecAlerts(): Promise<TransvecAlertRow[]> {
  try {
    const { data, error } = await supabase
      .from('transvec_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function acknowledgeTransvecAlert(alertId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('transvec_alerts')
      .update({ acknowledged: true })
      .eq('id', alertId);

    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

// ============================================
// SUBSCRIPTIONS
// ============================================

export function subscribeToMachines(callback: (payload: any) => void) {
  return supabase
    .channel('machines')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'machines' }, callback)
    .subscribe();
}

export function subscribeToJobs(callback: (payload: any) => void) {
  return supabase
    .channel('jobs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'production_jobs' }, callback)
    .subscribe();
}

export function subscribeToIncidents(callback: (payload: any) => void) {
  return supabase
    .channel('incidents')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'aegis_incidents' }, callback)
    .subscribe();
}
