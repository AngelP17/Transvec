// Core object types for the Ontology Graph
export interface WaferLot {
  id: string;
  lotId: string;
  processNode: string; // e.g., "3nm", "5nm"
  fabLocation: string;
  value: number; // Dollar value
  status: 'IN_PRODUCTION' | 'READY_FOR_SHIPMENT' | 'IN_TRANSIT' | 'DELIVERED';
}

export interface Shipment {
  id: string;
  trackingCode: string;
  status: ShipmentStatus;
  origin: Location;
  destination: Location;
  currentLocation?: GeoLocation;
  eta?: Date;
  carrierId: string;
  routeId: string;
  waferLotIds: string[];
  sensorIds: string[];
  telemetry: TelemetryReading;
  clientTag?: string;
  contents?: string;
  statusLabel?: string;
  dossier?: ShipmentDossier;
}

export type ShipmentStatus = 
  | 'SCHEDULED'
  | 'IN_TRANSIT'
  | 'HELD_CUSTOMS'
  | 'DELIVERED'
  | 'DELAYED'
  | 'CRITICAL';

export interface Carrier {
  id: string;
  carrierId: string;
  name: string;
  type: 'TRUCK' | 'SHIP' | 'PLANE';
  rating: number;
  activeShipments: number;
}

export interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  carrierId: string;
}

export interface Route {
  id: string;
  routeId: string;
  origin: string;
  destination: string;
  waypoints: GeoLocation[];
  distance: number; // km
  estimatedDuration: number; // hours
}

export interface Sensor {
  id: string;
  sensorId: string;
  type: SensorType;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  shipmentId?: string;
  lastReading?: Date;
}

export type SensorType = 'GPS' | 'SHOCK' | 'TEMPERATURE' | 'HUMIDITY' | 'VIBRATION';

export interface TelemetryReading {
  timestamp: Date;
  location: GeoLocation;
  shock?: number; // G-force
  temperature?: number; // Celsius
  humidity?: number; // Percentage
  vibration?: number; // Hz
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface Location {
  id: string;
  name: string;
  type: 'FACTORY' | 'PORT' | 'DISTRIBUTION_CENTER' | 'CUSTOMER';
  location: GeoLocation;
}

export interface Factory extends Location {
  type: 'FACTORY';
  isoCertification: string;
  productionCapacity: number;
}

// Notebook cell types
export interface NotebookCell {
  id: string;
  type: 'CODE' | 'MARKDOWN';
  content: string;
  output?: string;
  language?: 'python' | 'sql' | 'javascript';
}

// Alert types
export interface Alert {
  id: string;
  type: AlertType;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  shipmentId: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  source?: 'aegis' | 'transvec';
}

export interface ShipmentDossier {
  linkedJobId: string;
  client: string;
  contents: string;
  carrier: string;
  route: string;
  mode: 'TRUCK' | 'TRAIN' | 'AIR' | 'SEA';
  operator: {
    id: string;
    company: string;
    role: string;
    rating: string;
  };
  vehicle: {
    id: string;
    model: string;
    maintenance: string;
  };
  statusLabel?: string;
  chainOfCustody: Array<{ time: string; event: string; actor: string; status: 'ok' | 'warn' }>;
  records: Array<{ id: string; name: string; status: 'VERIFIED' | 'PENDING' }>;
  flags: string[];
}

export type GeofenceFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, {
  id?: string;
  name?: string;
  type?: string;
}>;

export type AlertType = 
  | 'ROUTE_DEVIATION'
  | 'SHOCK_THRESHOLD'
  | 'TEMPERATURE_EXCURSION'
  | 'GEOFENCE_BREACH'
  | 'DELAYED_ARRIVAL'
  | 'SENSOR_OFFLINE';

// Geofence types
export interface Geofence {
  id: string;
  name: string;
  type: 'AUTHORIZED_ROUTE' | 'RESTRICTED' | 'CHECKPOINT' | 'PROXIMITY' | 'HAZARD';
  geometry: GeoPolygon;
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

// Graph node types for React Flow
export interface OntologyNode {
  id: string;
  type: 'waferLot' | 'shipment' | 'carrier' | 'route' | 'sensor' | 'factory';
  data: {
    label: string;
    properties: Record<string, unknown>;
  };
  position: { x: number; y: number };
}

export interface OntologyEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
}

// Knowledge graph types (RAG/NLP graph)
export interface KnowledgeGraphNode {
  data: {
    id: string;
    label: string;
    type: string;
    color: string;
    metadata?: Record<string, unknown>;
  };
}

export interface KnowledgeGraphEdge {
  data: {
    source: string;
    target: string;
    label: string;
    weight: number;
  };
}

export interface KnowledgeGraphData {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  stats: {
    node_count: number;
    edge_count: number;
    zone_summary?: Record<string, unknown>;
    bottlenecks?: unknown[];
  };
}

// Multi-modal journey leg
export interface JourneyLeg {
  id: string;
  type: 'AIR' | 'SEA' | 'LAND';
  carrier: string;
  trackingCode: string;
  origin: string;
  destination: string;
  status: 'SCHEDULED' | 'IN_TRANSIT' | 'COMPLETE';
  startTime?: Date;
  endTime?: Date;
  duration?: number; // minutes
}

// DVR playback state
export interface DVRState {
  isPlaying: boolean;
  currentIndex: number;
  totalPoints: number;
  playbackSpeed: number;
  currentData?: TelemetryReading;
}

// Navigation tabs
export type ViewTab = 'OPS' | 'ANALYTICS' | 'ONTOLOGY' | 'ALERTS';
