import type {
  YieldOpsMachine, YieldOpsJob, AegisIncident, SensorReading,
  AnomalyAlert, MaintenanceLog, DispatchDecision,
  FabHealthSnapshot,
} from './supabase';
import type { Shipment, Alert } from '../types';
import { buildShipmentDossier } from './digitalThread';

// Zone to location mapping — keys match DB `machines.location_zone` values (ZONE_A format)
const ZONE_LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  // Asia-Pacific Foundries (ZONE_A–F map to DB machines)
  'ZONE_A': { lat: 24.7742, lng: 121.0106, name: 'TSMC Fab 18 Hsinchu' },
  'ZONE_B': { lat: 22.6273, lng: 120.3014, name: 'TSMC Fab 22 Kaohsiung' },
  'ZONE_C': { lat: 37.0745, lng: 127.0094, name: 'Samsung Pyeongtaek' },
  'ZONE_D': { lat: 36.9940, lng: 126.7828, name: 'Samsung Giheung' },
  'ZONE_E': { lat: 33.1161, lng: 131.1875, name: 'Micron Hiroshima' },
  'ZONE_F': { lat: 1.3521, lng: 103.8198, name: 'GlobalFoundries Singapore' },
  // North America (ZONE_G–H map to DB machines)
  'ZONE_G': { lat: 33.4152, lng: -111.8315, name: 'Intel Ocotillo AZ' },
  'ZONE_H': { lat: 45.5152, lng: -122.6784, name: 'Intel Ronler Acres OR' },
  // Expansion zones (for mock data and future DB growth)
  'ZONE_I': { lat: 42.9420, lng: -73.8707, name: 'GlobalFoundries Malta NY' },
  'ZONE_J': { lat: 30.3958, lng: -97.7301, name: 'Samsung Austin TX' },
  'ZONE_K': { lat: 51.0504, lng: 13.7373, name: 'Infineon Dresden' },
  'ZONE_L': { lat: 51.4416, lng: 5.4697, name: 'ASML Veldhoven' },
  'ZONE_M': { lat: 53.2798, lng: -6.3520, name: 'Intel Leixlip Ireland' },
  'ZONE_N': { lat: 31.8969, lng: 34.8116, name: 'Intel Kiryat Gat Israel' },
};

// Descriptive location IDs used in transvec_shipments origin_id/destination_id
const DESCRIPTIVE_LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  'tsmc-hsinchu': { lat: 24.7742, lng: 121.0106, name: 'TSMC Fab 18 Hsinchu' },
  'tsmc-kaohsiung': { lat: 22.6273, lng: 120.3014, name: 'TSMC Fab 22 Kaohsiung' },
  'samsung-pyeongtaek': { lat: 37.0745, lng: 127.0094, name: 'Samsung Pyeongtaek' },
  'samsung-giheung': { lat: 36.9940, lng: 126.7828, name: 'Samsung Giheung' },
  'samsung-austin': { lat: 30.3958, lng: -97.7301, name: 'Samsung Austin TX' },
  'intel-oregon': { lat: 45.5152, lng: -122.6784, name: 'Intel Ronler Acres OR' },
  'intel-arizona': { lat: 33.4152, lng: -111.8315, name: 'Intel Ocotillo AZ' },
  'intel-ireland': { lat: 53.2798, lng: -6.3520, name: 'Intel Leixlip Ireland' },
  'intel-israel': { lat: 31.8969, lng: 34.8116, name: 'Intel Kiryat Gat Israel' },
  'globalfoundries-malta': { lat: 42.9420, lng: -73.8707, name: 'GlobalFoundries Malta NY' },
  'globalfoundries-singapore': { lat: 1.3521, lng: 103.8198, name: 'GlobalFoundries Singapore' },
  'micron-hiroshima': { lat: 33.1161, lng: 131.1875, name: 'Micron Hiroshima' },
  'infineon-dresden': { lat: 51.0504, lng: 13.7373, name: 'Infineon Dresden' },
  'asml-veldhoven': { lat: 51.4416, lng: 5.4697, name: 'ASML Veldhoven' },
  'amd-austin': { lat: 30.2241, lng: -97.7500, name: 'AMD Austin' },
  'tesla-texas': { lat: 30.2241, lng: -97.7500, name: 'Tesla Austin' },
  'nvidia-california': { lat: 37.3708, lng: -122.0375, name: 'NVIDIA Santa Clara' },
  'microsoft-washington': { lat: 47.6205, lng: -122.3493, name: 'Microsoft Redmond' },
  'apple-cupertino': { lat: 37.3346, lng: -122.0090, name: 'Apple Cupertino' },
  'qualcomm-sandiego': { lat: 32.8975, lng: -117.1965, name: 'Qualcomm San Diego' },
  'broadcom-irvine': { lat: 33.6297, lng: -117.7149, name: 'Broadcom Irvine' },
  'google-mountainview': { lat: 37.4009, lng: -122.1120, name: 'Google Mountain View' },
  'mediatek-hsinchu': { lat: 24.8066, lng: 120.9686, name: 'MediaTek Hsinchu' },
  'nxp-eindhoven': { lat: 51.4231, lng: 5.4623, name: 'NXP Eindhoven' },
};

// Transit hub codes (airports + seaports)
const CODE_LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  // Asia-Pacific
  TPE: { lat: 25.0330, lng: 121.5654, name: 'Taipei Taoyuan Intl' },
  KAO: { lat: 22.5726, lng: 120.3462, name: 'Kaohsiung Port' },
  ICN: { lat: 37.4602, lng: 126.4407, name: 'Incheon Intl' },
  NRT: { lat: 35.7720, lng: 140.3929, name: 'Narita Cargo Hub' },
  SIN: { lat: 1.3644, lng: 103.9915, name: 'Singapore Changi' },
  PVG: { lat: 31.1443, lng: 121.8083, name: 'Shanghai Pudong' },
  // North America
  LAX: { lat: 33.9416, lng: -118.4085, name: 'Port of Los Angeles' },
  SFO: { lat: 37.6213, lng: -122.3790, name: 'SFO Cargo Terminal' },
  AUS: { lat: 30.1975, lng: -97.6664, name: 'Austin Bergstrom' },
  PHX: { lat: 33.4342, lng: -112.0116, name: 'Phoenix Sky Harbor' },
  JFK: { lat: 40.6413, lng: -73.7781, name: 'JFK Cargo Hub' },
  ORD: { lat: 41.9742, lng: -87.9073, name: "Chicago O'Hare Cargo" },
  // Europe
  AMS: { lat: 52.3105, lng: 4.7683, name: 'Amsterdam Schiphol' },
  FRA: { lat: 50.0379, lng: 8.5622, name: 'Frankfurt Cargo Hub' },
  DUB: { lat: 53.4264, lng: -6.2499, name: 'Dublin Airport' },
  RTM: { lat: 51.8854, lng: 4.2925, name: 'Port of Rotterdam' },
  // Middle East
  TLV: { lat: 32.0004, lng: 34.8706, name: 'Ben Gurion Intl' },
};

const DEFAULT_LOCATION = { lat: 24.7742, lng: 121.0106, name: 'TSMC Fab 18 Hsinchu' };

const STATUS_MAP: Record<string, string> = {
  'PENDING': 'SCHEDULED',
  'QUEUED': 'IN_TRANSIT',
  'RUNNING': 'IN_TRANSIT',
  'COMPLETED': 'DELIVERED',
  'FAILED': 'CRITICAL',
  'CANCELLED': 'DELAYED',
};

const CLIENT_CODES = [
  'Apple',
  'NVIDIA',
  'AMD',
  'Qualcomm',
  'Broadcom',
  'Intel',
  'MediaTek',
  'Marvell',
  'Tesla',
  'Google',
  'Microsoft',
  'Amazon',
  'Bosch',
  'NXP',
  'Sony',
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
  if (!tag) return 'Unknown Client';
  // Try direct customer destination match first
  const upper = tag.toUpperCase();
  if (CUSTOMER_DESTINATIONS[upper]) return CUSTOMER_DESTINATIONS[upper].name;
  const index = hashString(tag) % CLIENT_CODES.length;
  return CLIENT_CODES[index] || 'Unknown Client';
}

function resolveLocationFromId(id: string | null) {
  if (!id) return null;
  const trimmed = id.trim();
  const lower = trimmed.toLowerCase();
  const upper = trimmed.toUpperCase();

  // Check descriptive IDs first (e.g. "tsmc-hsinchu", "nvidia-california")
  if (DESCRIPTIVE_LOCATIONS[lower]) return DESCRIPTIVE_LOCATIONS[lower];

  // Check zone keys (e.g. "ZONE_A")
  if (ZONE_LOCATIONS[upper]) return ZONE_LOCATIONS[upper];

  // Check transit hub codes (e.g. "TPE", "LAX")
  if (CODE_LOCATIONS[upper]) return CODE_LOCATIONS[upper];

  // Fuzzy match against zone/code/descriptive location names
  const allLocations = [
    ...Object.values(DESCRIPTIVE_LOCATIONS),
    ...Object.values(ZONE_LOCATIONS),
    ...Object.values(CODE_LOCATIONS),
  ];
  const nameMatch = allLocations.find(
    (loc) => loc.name.toUpperCase() === upper
  );
  if (nameMatch) return nameMatch;

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
  const zoneKey = machine?.location_zone || 'ZONE_A';
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

// Direct mapping from DB customer_tag to real client destinations
const CUSTOMER_DESTINATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  APPLE: { lat: 37.3346, lng: -122.0090, name: 'Apple Cupertino' },
  NVIDIA: { lat: 37.3708, lng: -122.0375, name: 'NVIDIA Santa Clara' },
  AMD: { lat: 37.3741, lng: -121.9630, name: 'AMD San Jose' },
  QUALCOMM: { lat: 32.8975, lng: -117.1965, name: 'Qualcomm San Diego' },
  BROADCOM: { lat: 33.6297, lng: -117.7149, name: 'Broadcom Irvine' },
  INTEL: { lat: 45.5231, lng: -122.6765, name: 'Intel Hillsboro' },
  GOOGLE: { lat: 37.4009, lng: -122.1120, name: 'Google Mountain View' },
  SAMSUNG: { lat: 30.3958, lng: -97.7301, name: 'Samsung Austin' },
  MEDIATEK: { lat: 24.8066, lng: 120.9686, name: 'MediaTek Hsinchu' },
  NXP: { lat: 51.4231, lng: 5.4623, name: 'NXP Eindhoven' },
  MICRON: { lat: 43.6150, lng: -116.2023, name: 'Micron Boise' },
  ONSEMI: { lat: 33.4484, lng: -112.0740, name: 'ON Semi Phoenix' },
  TI: { lat: 32.9900, lng: -96.7500, name: 'TI Dallas' },
  ST: { lat: 46.2200, lng: 6.1500, name: 'STMicro Geneva' },
  ADI: { lat: 42.5600, lng: -71.1700, name: 'Analog Devices Wilmington' },
  XILINX: { lat: 37.3741, lng: -121.9630, name: 'Xilinx San Jose' },
  NORDIC: { lat: 63.4305, lng: 10.3951, name: 'Nordic Semi Trondheim' },
  SKYWORKS: { lat: 33.6297, lng: -117.7149, name: 'Skyworks Irvine' },
  CIRRUS: { lat: 30.2672, lng: -97.7431, name: 'Cirrus Logic Austin' },
  REALTEK: { lat: 24.8066, lng: 120.9686, name: 'Realtek Hsinchu' },
  MAXIM: { lat: 37.3741, lng: -121.9630, name: 'Maxim San Jose' },
  MPS: { lat: 37.3741, lng: -121.9630, name: 'MPS San Jose' },
  INTERSIL: { lat: 33.6297, lng: -117.7149, name: 'Intersil Irvine' },
  AMAZON: { lat: 45.5945, lng: -121.1787, name: 'Amazon AWS Oregon' },
  MICROSOFT: { lat: 47.6205, lng: -122.3493, name: 'Microsoft Redmond' },
};

// Fallback global destinations for unknown customer tags
const FALLBACK_DESTINATIONS = [
  { lat: 37.3346, lng: -122.0090, name: 'Apple Cupertino' },
  { lat: 37.3708, lng: -122.0375, name: 'NVIDIA Santa Clara' },
  { lat: 32.8975, lng: -117.1965, name: 'Qualcomm San Diego' },
  { lat: 24.8066, lng: 120.9686, name: 'MediaTek Hsinchu' },
  { lat: 51.4231, lng: 5.4623, name: 'NXP Eindhoven' },
  { lat: 46.2200, lng: 6.1500, name: 'STMicro Geneva' },
  { lat: 35.4437, lng: 139.3711, name: 'Sony Atsugi' },
  { lat: 48.4917, lng: 9.2078, name: 'Bosch Reutlingen' },
  { lat: 43.6150, lng: -116.2023, name: 'Micron Boise' },
  { lat: 47.6205, lng: -122.3493, name: 'Microsoft Redmond' },
  { lat: 30.2241, lng: -97.7500, name: 'Tesla Austin' },
  { lat: 63.4305, lng: 10.3951, name: 'Nordic Semi Trondheim' },
];

function getDestinationForCustomer(customerTag: string | null) {
  if (!customerTag) return FALLBACK_DESTINATIONS[0];

  // Try direct match (case-insensitive)
  const upper = customerTag.toUpperCase();
  if (CUSTOMER_DESTINATIONS[upper]) return CUSTOMER_DESTINATIONS[upper];

  // Hash-based fallback for unknown tags
  const index = hashString(customerTag) % FALLBACK_DESTINATIONS.length;
  return FALLBACK_DESTINATIONS[index];
}

function interpolateLocation(origin: { lat: number; lng: number }, dest: { lat: number; lng: number }, status: string) {
  let progress = 0.5;
  switch (status) {
    case 'PENDING': progress = 0; break;
    case 'QUEUED': progress = 0.25; break;
    case 'RUNNING': progress = 0.5 + Math.random() * 0.3; break;
    case 'COMPLETED': progress = 1; break;
  }

  // Handle antimeridian wrapping for trans-Pacific routes
  let lngDelta = dest.lng - origin.lng;
  if (lngDelta > 180) lngDelta -= 360;
  if (lngDelta < -180) lngDelta += 360;

  let lng = origin.lng + lngDelta * progress;
  if (lng > 180) lng -= 360;
  if (lng < -180) lng += 360;

  return {
    lat: origin.lat + (dest.lat - origin.lat) * progress,
    lng,
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
  simulationCount: number;
  latestSimulationName: string | null;
  meanThroughput: number | null;
  p95Throughput: number | null;
}

export function computeFabHealthSummary(snapshot: FabHealthSnapshot): FabHealthSummary {
  const { agents, anomalyAlerts, dispatchDecisions, maintenanceLogs,
    facilityStatus, bonderStatus, metrologyResults, vmPredictions,
    recipeAdjustments, capacitySimulations } = snapshot;

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
    simulationCount: capacitySimulations?.length ?? 0,
    latestSimulationName: capacitySimulations?.[0]?.simulation_name ?? null,
    meanThroughput: capacitySimulations?.[0]?.mean_throughput ?? null,
    p95Throughput: capacitySimulations?.[0]?.p95_throughput ?? null,
  };
}
