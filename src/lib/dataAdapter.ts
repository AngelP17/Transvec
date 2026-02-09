import type { YieldOpsMachine, YieldOpsJob, AegisIncident, SensorReading } from './supabase';
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

const DEFAULT_LOCATION = { lat: 39.8283, lng: -98.5795, name: 'CENTRAL-HUB-00' };

const STATUS_MAP: Record<string, string> = {
  'PENDING': 'SCHEDULED',
  'QUEUED': 'IN_TRANSIT',
  'RUNNING': 'IN_TRANSIT',
  'COMPLETED': 'DELIVERED',
  'FAILED': 'CRITICAL',
  'CANCELLED': 'DELAYED',
};

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
    clientTag: job.customer_tag || undefined,
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
  const locations: Record<string, { lat: number; lng: number; name: string }> = {
    'Apple': { lat: 37.3318, lng: -122.0312, name: 'CLIENT-ALPHA' },
    'NVIDIA': { lat: 37.3541, lng: -121.9552, name: 'CLIENT-BRAVO' },
    'AMD': { lat: 37.3861, lng: -122.0839, name: 'CLIENT-CHARLIE' },
    'Intel': { lat: 45.5152, lng: -122.6784, name: 'CLIENT-DELTA' },
    'Google': { lat: 37.4220, lng: -122.0841, name: 'CLIENT-ECHO' },
    'Amazon': { lat: 47.6062, lng: -122.3321, name: 'CLIENT-FOXTROT' },
    'Samsung': { lat: 30.2224, lng: -97.6170, name: 'CLIENT-GOLF' },
    'Micron': { lat: 43.6150, lng: -116.2023, name: 'CLIENT-HOTEL' },
    'Broadcom': { lat: 33.0198, lng: -117.0834, name: 'CLIENT-INDIA' },
    'Qualcomm': { lat: 32.7157, lng: -117.1611, name: 'CLIENT-JULIET' },
  };
  
  return locations[customerTag || ''] || { lat: 39.7392, lng: -104.9903, name: 'CLIENT-KILO' };
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
}) : Shipment {
  const origin = DEFAULT_LOCATION;
  const dest = DEFAULT_LOCATION;
  const currentLocation = row.current_location_lat !== null && row.current_location_lng !== null
    ? { lat: row.current_location_lat, lng: row.current_location_lng }
    : undefined;

  return {
    id: row.id,
    trackingCode: row.tracking_code,
    status: (row.status || 'SCHEDULED') as any,
    origin: {
      id: row.origin_id || 'origin',
      name: origin.name,
      type: 'FACTORY',
      location: origin,
    },
    destination: {
      id: row.destination_id || 'destination',
      name: dest.name,
      type: 'CUSTOMER',
      location: dest,
    },
    currentLocation,
    carrierId: row.carrier_id || 'carrier-unknown',
    routeId: `route-${row.origin_id || 'default'}`,
    waferLotIds: row.wafer_lot_ids || [],
    sensorIds: row.sensor_ids || [],
    telemetry: {
      timestamp: new Date(),
      location: currentLocation || origin,
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
