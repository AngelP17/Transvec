import type {
  YieldOpsMachine, YieldOpsJob, AegisIncident, SensorReading,
  AnomalyAlert, MaintenanceLog, DispatchDecision,
  FabHealthSnapshot,
} from './supabase';
import type { Shipment, Alert } from '../types';
import { buildShipmentDossier } from './digitalThread';

// Zone to location mapping
const ZONE_LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  'ZONE A': { lat: 24.7742, lng: 121.0106, name: 'FAB-ALPHA-18' },
  'ZONE B': { lat: 37.4419, lng: -122.1430, name: 'NODE-BRAVO-12' },
  'ZONE C': { lat: 45.5152, lng: -122.6784, name: 'FAB-CHARLIE-07' },
  'ZONE D': { lat: 30.2224, lng: -97.6170, name: 'HUB-DELTA-03' },
  'ZONE E': { lat: 33.4484, lng: -112.0740, name: 'LOGISTICS-ECHO-01' },
  'ZONE F': { lat: 47.6062, lng: -122.3321, name: 'PORT-FOXTROT-04' },
  'ZONE G': { lat: 40.7128, lng: -74.0060, name: 'NODE-GOLF-22' },
  'ZONE H': { lat: 34.0522, lng: -118.2437, name: 'PORT-HOTEL-09' },
};

const CODE_LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  TPE: { lat: 25.0330, lng: 121.5654, name: 'NODE-TPE-01' },
  LAX: { lat: 33.9416, lng: -118.4085, name: 'PORT-LAX-01' },
  SJC: { lat: 37.3639, lng: -121.9289, name: 'PORT-SJC-02' },
  AUS: { lat: 30.1975, lng: -97.6664, name: 'HUB-AUS-01' },
  ICN: { lat: 37.4602, lng: 126.4407, name: 'NODE-ICN-01' },
  KAO: { lat: 22.6273, lng: 120.3014, name: 'NODE-KAO-01' },
  PHX: { lat: 33.4342, lng: -112.0116, name: 'HUB-PHX-01' },
  DEN: { lat: 39.8561, lng: -104.6737, name: 'HUB-DEN-01' },
};

const DEFAULT_LOCATION = { lat: 39.8283, lng: -98.5795, name: 'CENTRAL-HUB-00' };

const STATUS_MAP: Record<string, string> = {
  'PENDING': 'SCHEDULED',
  'QUEUED': 'IN_TRANSIT',
  'RUNNING': 'IN_TRANSIT',
  'COMPLETED': 'DELIVERED',
  'FAILED': 'CRITICAL',
  'CANCELLED': 'DELAYED',
};

const CLIENT_CODES = [
  'CLIENT-ALPHA',
  'CLIENT-BRAVO',
  'CLIENT-CHARLIE',
  'CLIENT-DELTA',
  'CLIENT-ECHO',
  'CLIENT-FOXTROT',
  'CLIENT-GOLF',
  'CLIENT-HOTEL',
  'CLIENT-INDIA',
  'CLIENT-JULIET',
  'CLIENT-OMEGA',
];

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function sanitizeClientTag(tag: string | null) {
  if (!tag) return 'CLIENT-UNKNOWN';
  const index = hashString(tag) % CLIENT_CODES.length;
  return CLIENT_CODES[index] || 'CLIENT-UNKNOWN';
}

function resolveLocationFromId(id: string | null) {
  if (!id) return null;
  const normalized = id.trim().toUpperCase();

  if (ZONE_LOCATIONS[normalized]) return ZONE_LOCATIONS[normalized];
  if (CODE_LOCATIONS[normalized]) return CODE_LOCATIONS[normalized];

  const zoneMatch = Object.values(ZONE_LOCATIONS).find(
    (location) => location.name.toUpperCase() === normalized
  );
  if (zoneMatch) return zoneMatch;

  const codeMatch = Object.values(CODE_LOCATIONS).find(
    (location) => location.name.toUpperCase() === normalized
  );
  if (codeMatch) return codeMatch;

  return null;
}

function progressFromShipmentStatus(status: string) {
  switch (status) {
    case 'SCHEDULED':
      return 0.1;
    case 'IN_TRANSIT':
      return 0.55;
    case 'DELIVERED':
      return 1;
    case 'DELAYED':
    case 'HELD_CUSTOMS':
      return 0.4;
    case 'CRITICAL':
      return 0.6;
    default:
      return 0.5;
  }
}

// Transform YieldOps job to shipment
export function transformJobToShipment(job: YieldOpsJob, machine: YieldOpsMachine | null, sensor: SensorReading | null): Shipment {
  const zoneKey = machine?.location_zone || 'ZONE E';
  const origin = ZONE_LOCATIONS[zoneKey] || DEFAULT_LOCATION;
  const dest = getDestinationForCustomer(job.customer_tag);
  const current = interpolateLocation(origin, dest, job.status);

  const contents = `${job.wafer_count}x ${job.recipe_type} WAFERS`;
  const statusLabel = job.status === 'RUNNING'
    ? 'Awaiting Pickup'
    : job.status === 'COMPLETED'
      ? 'In Transit'
      : job.status === 'FAILED'
        ? 'Critical'
        : 'Scheduled';

  const dossier = buildShipmentDossier(job, contents, statusLabel);

  return {
    id: job.job_id,
    trackingCode: job.job_name.replace(/\s+/g, '-').toUpperCase(),
    status: (STATUS_MAP[job.status] || 'SCHEDULED') as any,
    origin: {
      id: `origin-${zoneKey}`,
      name: origin.name,
      type: 'FACTORY',
      location: origin,
    },
    destination: {
      id: `dest-${job.customer_tag || 'customer'}`,
      name: dest.name,
      type: 'CUSTOMER',
      location: dest,
    },
    currentLocation: current,
    carrierId: dossier.carrier || machine?.machine_id || 'carrier-1',
    routeId: dossier.route || `route-${zoneKey}`,
    waferLotIds: [`LOT-${job.job_id.slice(0, 8)}`],
    sensorIds: ['GPS-001', 'SHK-001', 'TMP-001'],
    telemetry: {
      timestamp: new Date(),
      location: current,
      shock: sensor?.vibration || Math.random() * 2,
      temperature: sensor?.temperature || 22 + Math.random() * 5,
      humidity: 40 + Math.random() * 20,
      vibration: sensor?.vibration || 15 + Math.random() * 20,
    },
    eta: job.deadline ? new Date(job.deadline) : undefined,
    clientTag: sanitizeClientTag(job.customer_tag),
    contents,
    statusLabel,
    dossier,
  };
}

// Transform Aegis incident to Transvec alert
export function transformIncidentToAlert(incident: AegisIncident): Alert {
  const severityMap: Record<string, 'CRITICAL' | 'WARNING' | 'INFO'> = {
    'critical': 'CRITICAL',
    'high': 'WARNING',
    'medium': 'WARNING',
    'low': 'INFO',
  };

  const typeMap: Record<string, string> = {
    'thermal_runaway': 'TEMPERATURE_EXCURSION',
    'bearing_failure': 'SHOCK_THRESHOLD',
    'filter_clog': 'GEOFENCE_BREACH',
    'vibration_anomaly': 'SHOCK_THRESHOLD',
    'power_surge': 'SENSOR_OFFLINE',
  };

  return {
    id: incident.incident_id,
    type: (typeMap[incident.incident_type] || 'ROUTE_DEVIATION') as any,
    severity: severityMap[incident.severity] || 'WARNING',
    shipmentId: incident.machine_id,
    message: `${incident.message} (Z-score: ${incident.z_score?.toFixed(2) || 'N/A'})`,
    timestamp: new Date(incident.created_at),
    acknowledged: incident.resolved,
    source: 'aegis',
  };
}

function getDestinationForCustomer(customerTag: string | null) {
  const locations = [
    { lat: 37.3318, lng: -122.0312, name: 'CLIENT-ALPHA' },
    { lat: 37.3541, lng: -121.9552, name: 'CLIENT-BRAVO' },
    { lat: 37.3861, lng: -122.0839, name: 'CLIENT-CHARLIE' },
    { lat: 45.5152, lng: -122.6784, name: 'CLIENT-DELTA' },
    { lat: 37.4220, lng: -122.0841, name: 'CLIENT-ECHO' },
    { lat: 47.6062, lng: -122.3321, name: 'CLIENT-FOXTROT' },
    { lat: 30.2224, lng: -97.6170, name: 'CLIENT-GOLF' },
    { lat: 43.6150, lng: -116.2023, name: 'CLIENT-HOTEL' },
    { lat: 33.0198, lng: -117.0834, name: 'CLIENT-INDIA' },
    { lat: 32.7157, lng: -117.1611, name: 'CLIENT-JULIET' },
    { lat: 37.4947, lng: -121.9446, name: 'CLIENT-OMEGA' },
  ];

  if (!customerTag) return { lat: 39.7392, lng: -104.9903, name: 'CLIENT-UNKNOWN' };
  const index = hashString(customerTag) % locations.length;
  return locations[index] || { lat: 39.7392, lng: -104.9903, name: 'CLIENT-UNKNOWN' };
}

function interpolateLocation(origin: { lat: number; lng: number }, dest: { lat: number; lng: number }, status: string) {
  let progress = 0.5;
  switch (status) {
    case 'PENDING': progress = 0; break;
    case 'QUEUED': progress = 0.25; break;
    case 'RUNNING': progress = 0.5 + Math.random() * 0.3; break;
    case 'COMPLETED': progress = 1; break;
  }

  return {
    lat: origin.lat + (dest.lat - origin.lat) * progress,
    lng: origin.lng + (dest.lng - origin.lng) * progress,
  };
}

// Transform Transvec shipment row to Shipment
export function transformTransvecShipmentToShipment(row: {
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
}): Shipment {
  const originResolved = resolveLocationFromId(row.origin_id) || DEFAULT_LOCATION;
  const destinationResolved = resolveLocationFromId(row.destination_id) || DEFAULT_LOCATION;

  const currentLocation = row.current_location_lat !== null && row.current_location_lng !== null
    ? { lat: row.current_location_lat, lng: row.current_location_lng }
    : {
      lat: originResolved.lat + (destinationResolved.lat - originResolved.lat) * progressFromShipmentStatus(row.status),
      lng: originResolved.lng + (destinationResolved.lng - originResolved.lng) * progressFromShipmentStatus(row.status),
    };

  return {
    id: row.id,
    trackingCode: row.tracking_code,
    status: (row.status || 'SCHEDULED') as any,
    origin: {
      id: row.origin_id || 'origin',
      name: originResolved.name,
      type: 'FACTORY',
      location: originResolved,
    },
    destination: {
      id: row.destination_id || 'destination',
      name: destinationResolved.name,
      type: 'CUSTOMER',
      location: destinationResolved,
    },
    currentLocation,
    carrierId: row.carrier_id || 'carrier-unknown',
    routeId: `route-${row.origin_id || 'default'}`,
    waferLotIds: row.wafer_lot_ids || [],
    sensorIds: row.sensor_ids || [],
    telemetry: {
      timestamp: new Date(),
      location: currentLocation || originResolved,
      shock: row.shock || undefined,
      temperature: row.temperature || undefined,
      humidity: row.humidity || undefined,
      vibration: row.vibration || undefined,
    },
    eta: row.eta ? new Date(row.eta) : undefined,
  };
}

// Transform Transvec alert row to Alert
export function transformTransvecAlertToAlert(row: {
  id: string;
  type: string;
  severity: string;
  shipment_id: string | null;
  message: string | null;
  acknowledged: boolean;
  created_at: string;
}): Alert {
  const severityMap: Record<string, 'CRITICAL' | 'WARNING' | 'INFO'> = {
    CRITICAL: 'CRITICAL',
    HIGH: 'WARNING',
    MEDIUM: 'WARNING',
    LOW: 'INFO',
  };

  return {
    id: row.id,
    type: (row.type || 'ROUTE_DEVIATION') as any,
    severity: severityMap[row.severity] || 'WARNING',
    shipmentId: row.shipment_id || 'unknown',
    message: row.message || 'Alert triggered',
    timestamp: new Date(row.created_at),
    acknowledged: row.acknowledged,
    source: 'transvec',
  };
}

// ============================================
// CROSS-SYSTEM TRANSFORMS (YieldOps / Sentinel → Transvec)
// ============================================

/** Transform ML anomaly alerts into the Transvec alert stream */
export function transformAnomalyAlertToAlert(a: AnomalyAlert): Alert {
  const severityMap: Record<string, 'CRITICAL' | 'WARNING' | 'INFO'> = {
    CRITICAL: 'CRITICAL',
    HIGH: 'WARNING',
    MEDIUM: 'WARNING',
    LOW: 'INFO',
  };
  const typeMap: Record<string, string> = {
    temperature: 'TEMPERATURE_EXCURSION',
    vibration: 'SHOCK_THRESHOLD',
    pressure: 'SENSOR_OFFLINE',
    particles: 'GEOFENCE_BREACH',
    airflow: 'ROUTE_DEVIATION',
  };
  const alertTypeKey = Object.keys(typeMap).find(k => a.alert_type.toLowerCase().includes(k));

  return {
    id: a.alert_id,
    type: (alertTypeKey ? typeMap[alertTypeKey] : 'SENSOR_OFFLINE') as Alert['type'],
    severity: severityMap[a.severity] || 'WARNING',
    shipmentId: a.machine_id,
    message: a.description || `Anomaly: ${a.alert_type} (${a.severity})`,
    timestamp: new Date(a.created_at),
    acknowledged: a.acknowledged,
    source: 'aegis',
  };
}

/** Transform maintenance events into alerts so operators see them in the timeline */
export function transformMaintenanceLogToAlert(log: MaintenanceLog): Alert {
  const isActive = !log.completed_at;
  return {
    id: log.log_id,
    type: 'DELAYED_ARRIVAL' as Alert['type'],
    severity: isActive ? 'WARNING' : 'INFO',
    shipmentId: log.machine_id,
    message: `Maintenance: ${log.maintenance_type}${log.description ? ` — ${log.description}` : ''}${log.downtime_minutes ? ` (${log.downtime_minutes}min downtime)` : ''}`,
    timestamp: new Date(log.started_at || log.completed_at || Date.now()),
    acknowledged: !isActive,
    source: 'aegis',
  };
}

/** Enrich a transformed shipment with dispatch decision context */
export function enrichShipmentWithDispatch(
  shipment: Shipment,
  decisions: DispatchDecision[],
): Shipment {
  const decision = decisions.find(d => d.job_id === shipment.id);
  if (!decision || !shipment.dossier) return shipment;

  const enrichedDossier = {
    ...shipment.dossier,
    chainOfCustody: [
      {
        time: new Date(decision.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        event: `TOC_DISPATCH (${decision.algorithm_version})`,
        actor: 'DISPATCH_ENGINE',
        status: 'ok' as const,
      },
      {
        time: new Date(decision.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        event: decision.decision_reason,
        actor: `EFF:${(decision.efficiency_at_dispatch ?? 0).toFixed(2)} Q:${decision.queue_depth_at_dispatch ?? 0}`,
        status: 'ok' as const,
      },
      ...shipment.dossier.chainOfCustody,
    ],
  };

  return { ...shipment, dossier: enrichedDossier };
}

/** Summary stats from the full FabHealthSnapshot for display in panels */
export interface FabHealthSummary {
  agentCount: number;
  agentsByType: Record<string, number>;
  agentsOnline: number;
  agentsOffline: number;
  totalDetections24h: number;
  anomalyAlertCount: number;
  anomalyBySeverity: Record<string, number>;
  openMaintenanceCount: number;
  totalDowntimeMinutes: number;
  facilityWarnings: number;
  facilityCritical: number;
  avgFilterLife: number;
  bonderWarnings: number;
  bonderCritical: number;
  avgOEE: number;
  metrologyCount: number;
  avgUniformity: number;
  vmPredictionCount: number;
  avgConfidence: number;
  avgPredictionError: number;
  pendingRecipeAdjustments: number;
  dispatchCount: number;
}

export function computeFabHealthSummary(snapshot: FabHealthSnapshot): FabHealthSummary {
  const { agents, anomalyAlerts, dispatchDecisions, maintenanceLogs,
    facilityStatus, bonderStatus, metrologyResults, vmPredictions,
    recipeAdjustments } = snapshot;

  // Agents
  const agentsByType: Record<string, number> = {};
  let agentsOnline = 0;
  let totalDetections24h = 0;
  agents.forEach(a => {
    agentsByType[a.agent_type] = (agentsByType[a.agent_type] || 0) + 1;
    if (a.status === 'active') agentsOnline++;
    totalDetections24h += a.detections_24h;
  });

  // Anomaly alerts
  const anomalyBySeverity: Record<string, number> = {};
  anomalyAlerts.forEach(a => {
    anomalyBySeverity[a.severity] = (anomalyBySeverity[a.severity] || 0) + 1;
  });

  // Maintenance
  const openMaintenance = maintenanceLogs.filter(m => !m.completed_at);
  const totalDowntime = maintenanceLogs.reduce((s, m) => s + (m.downtime_minutes || 0), 0);

  // Facility FFU
  const facilityWarnings = facilityStatus.filter(f => f.status === 'warning').length;
  const facilityCritical = facilityStatus.filter(f => f.status === 'critical').length;
  const filterLifeValues = facilityStatus.map(f => f.filter_life_percent).filter(Boolean) as number[];
  const avgFilterLife = filterLifeValues.length > 0
    ? filterLifeValues.reduce((s, v) => s + v, 0) / filterLifeValues.length : 0;

  // Assembly bonders
  const bonderWarnings = bonderStatus.filter(b => b.status === 'warning').length;
  const bonderCritical = bonderStatus.filter(b => b.status === 'critical').length;
  const oeeValues = bonderStatus.map(b => b.oee_percent).filter(Boolean) as number[];
  const avgOEE = oeeValues.length > 0
    ? oeeValues.reduce((s, v) => s + v, 0) / oeeValues.length : 0;

  // Metrology
  const uniformityValues = metrologyResults.map(m => m.uniformity_pct).filter(Boolean) as number[];
  const avgUniformity = uniformityValues.length > 0
    ? uniformityValues.reduce((s, v) => s + v, 0) / uniformityValues.length : 0;

  // VM Predictions
  const confValues = vmPredictions.map(v => v.confidence_score);
  const avgConfidence = confValues.length > 0
    ? confValues.reduce((s, v) => s + v, 0) / confValues.length : 0;
  const errValues = vmPredictions.map(v => v.prediction_error).filter(Boolean) as number[];
  const avgPredictionError = errValues.length > 0
    ? errValues.reduce((s, v) => s + v, 0) / errValues.length : 0;

  // Recipe adjustments
  const pendingRecipe = recipeAdjustments.filter(r => !r.applied).length;

  return {
    agentCount: agents.length,
    agentsByType,
    agentsOnline,
    agentsOffline: agents.length - agentsOnline,
    totalDetections24h,
    anomalyAlertCount: anomalyAlerts.length,
    anomalyBySeverity,
    openMaintenanceCount: openMaintenance.length,
    totalDowntimeMinutes: totalDowntime,
    facilityWarnings,
    facilityCritical,
    avgFilterLife,
    bonderWarnings,
    bonderCritical,
    avgOEE,
    metrologyCount: metrologyResults.length,
    avgUniformity,
    vmPredictionCount: vmPredictions.length,
    avgConfidence,
    avgPredictionError,
    pendingRecipeAdjustments: pendingRecipe,
    dispatchCount: dispatchDecisions.length,
  };
}
