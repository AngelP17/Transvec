import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vwayvxcvkozxumezwqio.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_bATl6MEumny_GL_qPtlI4Q_ubu3L0r1';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const geofenceSyncUrl = import.meta.env.VITE_GEOFENCE_SYNC_URL
  || `${supabaseUrl}/functions/v1/geofence-sync`;

async function invokeGeofenceSync(body: Record<string, unknown>) {
  try {
    const { error } = await supabase.functions.invoke('geofence-sync', { body });
    if (!error) return true;
  } catch {
    // Fall through to direct fetch
  }

  try {
    const res = await fetch(geofenceSyncUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

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

export interface GeofenceRow {
  id: string;
  name: string | null;
  zone_type: string | null;
  geometry?: unknown;
  geojson?: unknown;
  polygon?: unknown;
}

export interface GeofenceInsertRow {
  name: string;
  zone_type: string;
  geojson: GeoJSON.Geometry;
}

// ============================================
// YIELDOPS / SENTINEL CROSS-SYSTEM TYPES
// ============================================

export interface AegisAgent {
  agent_id: string;
  agent_type: 'precision' | 'facility' | 'assembly';
  machine_id: string;
  status: string;
  capabilities: string[] | null;
  protocol: string;
  last_heartbeat: string | null;
  detections_24h: number;
  uptime_hours: number;
  created_at: string;
}

export interface AnomalyAlert {
  alert_id: string;
  machine_id: string;
  reading_id: string | null;
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string | null;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface DispatchDecision {
  decision_id: string;
  job_id: string;
  machine_id: string;
  decision_reason: string;
  algorithm_version: string;
  efficiency_at_dispatch: number | null;
  queue_depth_at_dispatch: number | null;
  estimated_completion: string | null;
  dispatched_at: string;
}

export interface MaintenanceLog {
  log_id: string;
  machine_id: string;
  maintenance_type: string;
  description: string | null;
  technician_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  downtime_minutes: number | null;
  parts_replaced: string[] | null;
}

export interface FacilityFFUStatus {
  ffu_id: string;
  machine_id: string;
  zone_id: string;
  airflow_velocity_mps: number;
  pressure_drop_pa: number;
  motor_rpm: number | null;
  motor_current_a: number | null;
  filter_life_percent: number | null;
  iso_class: number | null;
  particle_count_0_5um: number | null;
  status: 'normal' | 'warning' | 'critical';
  last_maintenance: string | null;
  next_scheduled_maintenance: string | null;
  recorded_at: string;
}

export interface AssemblyBonderStatus {
  bonder_id: string;
  machine_id: string;
  usg_frequency_khz: number | null;
  usg_impedance_ohms: number | null;
  bond_force_grams: number | null;
  bond_time_ms: number | null;
  capillary_temp_c: number | null;
  shear_strength_g: number | null;
  nsop_count_24h: number;
  oee_percent: number | null;
  cycle_time_ms: number | null;
  units_bonded_24h: number | null;
  status: 'normal' | 'warning' | 'critical';
  last_wire_change: string | null;
  last_capillary_change: string | null;
  recorded_at: string;
}

export interface MetrologyResult {
  result_id: string;
  lot_id: string;
  tool_id: string;
  thickness_nm: number;
  uniformity_pct: number | null;
  measured_at: string;
}

export interface VMPrediction {
  prediction_id: string;
  lot_id: string;
  tool_id: string;
  predicted_thickness_nm: number;
  confidence_score: number;
  model_version: string;
  features_used: Record<string, unknown> | null;
  actual_thickness_nm: number | null;
  prediction_error: number | null;
  created_at: string;
}

export interface RecipeAdjustment {
  adjustment_id: string;
  tool_id: string;
  lot_id: string | null;
  parameter_name: string;
  current_value: number;
  adjustment_value: number;
  new_value: number;
  reason: string | null;
  applied: boolean;
  created_at: string;
}

export interface CapacitySimulation {
  simulation_id: string;
  simulation_name: string;
  scenario_params: Record<string, unknown>;
  iterations: number;
  mean_throughput: number | null;
  p95_throughput: number | null;
  p99_throughput: number | null;
  confidence_interval: Record<string, unknown> | null;
  results_data: Record<string, unknown> | null;
  created_at: string;
}

/** Aggregated cross-system health snapshot */
export interface FabHealthSnapshot {
  agents: AegisAgent[];
  anomalyAlerts: AnomalyAlert[];
  dispatchDecisions: DispatchDecision[];
  maintenanceLogs: MaintenanceLog[];
  facilityStatus: FacilityFFUStatus[];
  bonderStatus: AssemblyBonderStatus[];
  metrologyResults: MetrologyResult[];
  vmPredictions: VMPrediction[];
  recipeAdjustments: RecipeAdjustment[];
  capacitySimulations: CapacitySimulation[];
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

export async function fetchGeofences(): Promise<GeofenceRow[]> {
  const tables = ['transvec_geofences', 'geofences'];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(200);

      if (!error && data && data.length > 0) return data as GeofenceRow[];
    } catch {
      // Try next table name
    }
  }

  return [];
}

export async function upsertGeofences(rows: GeofenceInsertRow[]): Promise<boolean> {
  if (rows.length === 0) return false;
  const tables = ['transvec_geofences', 'geofences'];

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .insert(rows);
      if (!error) return true;
    } catch {
      // Try next table name
    }
  }

  return false;
}

export async function syncGeofencesViaEdge(rows: GeofenceInsertRow[]): Promise<boolean> {
  if (rows.length === 0) return false;
  return invokeGeofenceSync({ geofences: rows });
}

export async function createTransvecAlerts(rows: Array<{
  type: string;
  severity: string;
  shipment_id: string;
  message: string;
}>): Promise<boolean> {
  if (rows.length === 0) return false;
  try {
    const { error } = await supabase
      .from('transvec_alerts')
      .insert(rows);
    return !error;
  } catch {
    return false;
  }
}

export async function createTransvecAlertsViaEdge(rows: Array<{
  type: string;
  severity: string;
  shipment_id: string;
  message: string;
}>): Promise<boolean> {
  if (rows.length === 0) return false;
  return invokeGeofenceSync({ alerts: rows });
}

// ============================================
// YIELDOPS / SENTINEL CROSS-SYSTEM FETCHERS
// ============================================

export async function fetchAegisAgents(): Promise<AegisAgent[]> {
  try {
    const { data, error } = await supabase
      .from('aegis_agents')
      .select('*')
      .order('last_heartbeat', { ascending: false });
    if (error) return [];
    return data || [];
  } catch { return []; }
}

export async function fetchAnomalyAlerts(): Promise<AnomalyAlert[]> {
  try {
    const { data, error } = await supabase
      .from('anomaly_alerts')
      .select('*')
      .eq('acknowledged', false)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return [];
    return data || [];
  } catch { return []; }
}

export async function fetchDispatchDecisions(): Promise<DispatchDecision[]> {
  try {
    const { data, error } = await supabase
      .from('dispatch_decisions')
      .select('*')
      .order('dispatched_at', { ascending: false })
      .limit(100);
    if (error) return [];
    return data || [];
  } catch { return []; }
}

export async function fetchMaintenanceLogs(): Promise<MaintenanceLog[]> {
  try {
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);
    if (error) return [];
    return data || [];
  } catch { return []; }
}

export async function fetchFacilityFFUStatus(): Promise<FacilityFFUStatus[]> {
  try {
    const { data, error } = await supabase
      .from('facility_ffu_status')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(100);
    if (error) return [];
    return data || [];
  } catch { return []; }
}

export async function fetchAssemblyBonderStatus(): Promise<AssemblyBonderStatus[]> {
  try {
    const { data, error } = await supabase
      .from('assembly_bonder_status')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(50);
    if (error) return [];
    return data || [];
  } catch { return []; }
}

export async function fetchMetrologyResults(): Promise<MetrologyResult[]> {
  try {
    const { data, error } = await supabase
      .from('metrology_results')
      .select('*')
      .order('measured_at', { ascending: false })
      .limit(100);
    if (error) return [];
    return data || [];
  } catch { return []; }
}

export async function fetchVMPredictions(): Promise<VMPrediction[]> {
  try {
    const { data, error } = await supabase
      .from('vm_predictions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return [];
    return data || [];
  } catch { return []; }
}

export async function fetchRecipeAdjustments(): Promise<RecipeAdjustment[]> {
  try {
    const { data, error } = await supabase
      .from('recipe_adjustments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return [];
    return data || [];
  } catch { return []; }
}

export async function fetchCapacitySimulations(): Promise<CapacitySimulation[]> {
  try {
    const { data, error } = await supabase
      .from('capacity_simulations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) return [];
    return data || [];
  } catch { return []; }
}

/** Fetch the full health snapshot in a single parallel call */
export async function fetchFabHealthSnapshot(): Promise<FabHealthSnapshot> {
  const [
    agents, anomalyAlerts, dispatchDecisions, maintenanceLogs,
    facilityStatus, bonderStatus, metrologyResults, vmPredictions,
    recipeAdjustments, capacitySimulations,
  ] = await Promise.all([
    fetchAegisAgents(),
    fetchAnomalyAlerts(),
    fetchDispatchDecisions(),
    fetchMaintenanceLogs(),
    fetchFacilityFFUStatus(),
    fetchAssemblyBonderStatus(),
    fetchMetrologyResults(),
    fetchVMPredictions(),
    fetchRecipeAdjustments(),
    fetchCapacitySimulations(),
  ]);
  return {
    agents, anomalyAlerts, dispatchDecisions, maintenanceLogs,
    facilityStatus, bonderStatus, metrologyResults, vmPredictions,
    recipeAdjustments, capacitySimulations,
  };
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

export function subscribeToAnomalyAlerts(callback: (payload: any) => void) {
  return supabase
    .channel('anomaly_alerts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'anomaly_alerts' }, callback)
    .subscribe();
}

export function subscribeToMaintenanceLogs(callback: (payload: any) => void) {
  return supabase
    .channel('maintenance_logs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_logs' }, callback)
    .subscribe();
}
