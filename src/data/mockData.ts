import type { 
  Shipment, 
  Carrier, 
  Sensor, 
  TelemetryReading, 
  NotebookCell, 
  Alert,
  JourneyLeg,
  OntologyNode,
  OntologyEdge
} from '../types';

// Mock Carriers
export const mockCarriers: Carrier[] = [
  { id: 'c1', carrierId: 'LOGI-AIR-01', name: 'Logistics Air Group', type: 'PLANE', rating: 4.8, activeShipments: 42 },
  { id: 'c2', carrierId: 'LOGI-SEA-01', name: 'Logistics Maritime', type: 'SHIP', rating: 4.6, activeShipments: 18 },
  { id: 'c3', carrierId: 'LOGI-LAND-01', name: 'Logistics Ground', type: 'TRUCK', rating: 4.5, activeShipments: 67 },
  { id: 'c4', carrierId: 'LOGI-AIR-02', name: 'Logistics Air Group II', type: 'PLANE', rating: 4.7, activeShipments: 31 },
  { id: 'c5', carrierId: 'LOGI-SEA-02', name: 'Logistics Maritime II', type: 'SHIP', rating: 4.4, activeShipments: 24 },
];

// Mock Sensors
export const mockSensors: Sensor[] = [
  { id: 's1', sensorId: 'GPS-8842', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh1', lastReading: new Date() },
  { id: 's2', sensorId: 'SHK-8842', type: 'SHOCK', status: 'ACTIVE', shipmentId: 'sh1', lastReading: new Date() },
  { id: 's3', sensorId: 'TMP-8842', type: 'TEMPERATURE', status: 'ACTIVE', shipmentId: 'sh1', lastReading: new Date() },
  { id: 's4', sensorId: 'VIB-8842', type: 'VIBRATION', status: 'ACTIVE', shipmentId: 'sh1', lastReading: new Date() },
  { id: 's5', sensorId: 'HUM-8842', type: 'HUMIDITY', status: 'ACTIVE', shipmentId: 'sh1', lastReading: new Date() },
  { id: 's6', sensorId: 'GPS-9911', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh2', lastReading: new Date() },
  { id: 's7', sensorId: 'SHK-9911', type: 'SHOCK', status: 'ERROR', shipmentId: 'sh2', lastReading: new Date(Date.now() - 3600000) },
];

// Generate telemetry history for DVR
export const generateTelemetryHistory = (_shipmentId: string, points: number = 100): TelemetryReading[] => {
  const history: TelemetryReading[] = [];
  const baseLat = 24.5 + Math.random() * 10;
  const baseLng = 120.5 + Math.random() * 20;
  
  for (let i = 0; i < points; i++) {
    const timestamp = new Date(Date.now() - (points - i) * 60000);
    const progress = i / points;
    
    // Simulate shock spikes at certain points
    let shock = 0.2 + Math.random() * 0.3;
    if (i === 67) shock = 4.2; // Critical shock event
    if (i === 45) shock = 2.8; // Warning shock
    
    history.push({
      timestamp,
      location: {
        lat: baseLat + progress * 5 + Math.sin(i * 0.1) * 0.5,
        lng: baseLng + progress * 10 + Math.cos(i * 0.1) * 0.5,
      },
      shock,
      temperature: 22 + Math.sin(i * 0.05) * 3 + (i > 80 ? 6 : 0), // Temperature spike at end
      humidity: 45 + Math.random() * 10,
      vibration: 20 + Math.random() * 15 + (i === 67 ? 100 : 0), // Vibration spike with shock
    });
  }
  
  return history;
};

// Mock Shipments
export const mockShipments: Shipment[] = [
  {
    id: 'sh1',
    trackingCode: 'TRK-8842-FAB-A',
    status: 'IN_TRANSIT',
    origin: { id: 'loc1', name: 'FAB-ALPHA-18', type: 'FACTORY', location: { lat: 24.7742, lng: 121.0106 } },
    destination: { id: 'loc2', name: 'CLIENT-OMEGA-04', type: 'CUSTOMER', location: { lat: 30.2224, lng: -97.6170 } },
    currentLocation: { lat: 33.4484, lng: -112.0740 }, // Phoenix, AZ
    carrierId: 'c3',
    routeId: 'r1',
    waferLotIds: ['wl1', 'wl2'],
    sensorIds: ['s1', 's2', 's3', 's4', 's5'],
    telemetry: {
      timestamp: new Date(),
      location: { lat: 33.4484, lng: -112.0740 },
      shock: 0.4,
      temperature: 23.5,
      humidity: 48,
      vibration: 25,
    },
  },
  {
    id: 'sh2',
    trackingCode: 'TRK-9911-FAB-C',
    status: 'CRITICAL',
    origin: { id: 'loc3', name: 'FAB-CHARLIE-07', type: 'FACTORY', location: { lat: 45.5152, lng: -122.6784 } },
    destination: { id: 'loc4', name: 'CLIENT-BRAVO-12', type: 'CUSTOMER', location: { lat: 37.3541, lng: -121.9552 } },
    currentLocation: { lat: 40.7608, lng: -111.8910 }, // Salt Lake City
    carrierId: 'c3',
    routeId: 'r2',
    waferLotIds: ['wl3'],
    sensorIds: ['s6', 's7'],
    telemetry: {
      timestamp: new Date(),
      location: { lat: 40.7608, lng: -111.8910 },
      shock: 1.2,
      temperature: 24.0,
      humidity: 42,
      vibration: 35,
    },
  },
  {
    id: 'sh3',
    trackingCode: 'SEA-4002-FAB-D',
    status: 'IN_TRANSIT',
    origin: { id: 'loc5', name: 'FAB-DELTA-05', type: 'FACTORY', location: { lat: 36.9940, lng: 126.7828 } },
    destination: { id: 'loc6', name: 'CLIENT-ALPHA-01', type: 'CUSTOMER', location: { lat: 37.3230, lng: -122.0322 } },
    currentLocation: { lat: 34.0522, lng: -118.2437 }, // Los Angeles Port
    carrierId: 'c2',
    routeId: 'r3',
    waferLotIds: ['wl4', 'wl5', 'wl6'],
    sensorIds: ['s8', 's9', 's10'],
    telemetry: {
      timestamp: new Date(),
      location: { lat: 34.0522, lng: -118.2437 },
      shock: 0.1,
      temperature: 28.0,
      humidity: 65,
      vibration: 5,
    },
  },
];

// Mock Notebook Cells
export const mockNotebookCells: NotebookCell[] = [
  {
    id: 'cell1',
    type: 'MARKDOWN',
    content: `### Shock Anomaly Detection

Running Isolation Forest algorithm on real-time telemetry from 842 active shipments across the FAB-ALPHA logistics network.

**Objective:** Identify shipments experiencing G-forces outside 3 standard deviations for their route type.`,
  },
  {
    id: 'cell2',
    type: 'CODE',
    language: 'python',
    content: `# Import Logistics Analytics Library
import transvec.analytics as ta
from sklearn.ensemble import IsolationForest

# Fetch active shipment telemetry for FAB-ALPHA Loop
shipments = ta.get_shipments(route="FAB-ALPHA-LAX")

# Detect anomalies in shock sensor data
model = IsolationForest(contamination=0.05)
anomalies = model.fit_predict(shipments[['shock_g', 'vibration_hz']])

# Highlight critical failures on map
ta.visualize_map(anomalies, color='red')`,
    output: `[SYSTEM] Analyzed 842 active shipments.
[DETECTED] 3 Anomalies found:
 > TRK-8842 (Shock: 4.2G - Critical) - I-10, Arizona
 > TRK-9911 (Vibration: 120Hz - Warning) - Salt Lake City
 > SEA-4002 (Temp: 28°C - Critical) - PORT-WEST-01`,
  },
  {
    id: 'cell3',
    type: 'MARKDOWN',
    content: `### ETA Prediction Model

Running linear regression on port congestion data vs. current vessel speed to estimate arrival at PORT-WEST-01.`,
  },
  {
    id: 'cell4',
    type: 'CODE',
    language: 'python',
    content: `# ETA Prediction using port congestion data
import transvec.predictions as tp

# Get current vessel positions and port congestion
vessels = tp.get_active_vessels(destination="LAX")
congestion = tp.get_port_congestion("LAX")

# Predict ETAs
predictions = tp.predict_eta(
    vessels=vessels,
    congestion_factor=congestion.index,
    model='ensemble'
)

# Display results
predictions.show()`,
    output: `[PREDICTION] ETA Analysis Complete:
 > SEA-4002: ETA 2.3 days (95% confidence)
 > SEA-4101: ETA 3.1 days (87% confidence)
 > SEA-3892: ETA 4.5 days (72% confidence - delayed)`,
  },
];

// Mock Alerts
export const mockAlerts: Alert[] = [
  {
    id: 'a1',
    type: 'SHOCK_THRESHOLD',
    severity: 'CRITICAL',
    shipmentId: 'sh1',
    message: 'Shipment TRK-8842 experienced 4.2G shock - exceeds 3G threshold',
    timestamp: new Date(Date.now() - 1800000),
    acknowledged: false,
  },
  {
    id: 'a2',
    type: 'TEMPERATURE_EXCURSION',
    severity: 'CRITICAL',
    shipmentId: 'sh3',
    message: 'SEA-4002 temperature at 28°C - exceeds 25°C limit for 15 minutes',
    timestamp: new Date(Date.now() - 3600000),
    acknowledged: false,
  },
  {
    id: 'a3',
    type: 'SENSOR_OFFLINE',
    severity: 'WARNING',
    shipmentId: 'sh2',
    message: 'SHK-9911 shock sensor offline for 1 hour',
    timestamp: new Date(Date.now() - 3600000),
    acknowledged: true,
  },
  {
    id: 'a4',
    type: 'DELAYED_ARRIVAL',
    severity: 'WARNING',
    shipmentId: 'sh3',
    message: 'SEA-4002 delayed - PORT-WEST-01 congestion',
    timestamp: new Date(Date.now() - 7200000),
    acknowledged: false,
  },
];

// Mock Journey Legs
export const mockJourneyLegs: JourneyLeg[] = [
  {
    id: 'leg1',
    type: 'AIR',
    carrier: 'Logistics Air Group',
    trackingCode: 'FX-1842',
    origin: 'TPE (Taipei)',
    destination: 'ANC (Anchorage)',
    status: 'COMPLETE',
    startTime: new Date(Date.now() - 86400000 * 2),
    endTime: new Date(Date.now() - 86400000 * 1.5),
    duration: 720,
  },
  {
    id: 'leg2',
    type: 'AIR',
    carrier: 'Logistics Air Group',
    trackingCode: 'FX-1842',
    origin: 'ANC (Anchorage)',
    destination: 'MEM (Memphis)',
    status: 'COMPLETE',
    startTime: new Date(Date.now() - 86400000 * 1.5),
    endTime: new Date(Date.now() - 86400000),
    duration: 480,
  },
  {
    id: 'leg3',
    type: 'LAND',
    carrier: 'Logistics Ground',
    trackingCode: 'TRK-8842',
    origin: 'MEM (Memphis)',
    destination: 'CLIENT-OMEGA-04',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 86400000),
  },
];

// Mock Ontology Graph Data
export const mockOntologyNodes: OntologyNode[] = [
  {
    id: 'factory1',
    type: 'factory',
    data: { 
      label: 'FAB-ALPHA-18',
      properties: { location: 'Taiwan', capacity: '100k wafers/month' }
    },
    position: { x: 100, y: 100 },
  },
  {
    id: 'wafer1',
    type: 'waferLot',
    data: { 
      label: 'FAB-ALPHA-3NM-2024-001',
      properties: { process: '3nm', value: '$2.5M', quantity: 500 }
    },
    position: { x: 300, y: 100 },
  },
  {
    id: 'shipment1',
    type: 'shipment',
    data: { 
      label: 'TRK-8842',
      properties: { status: 'In Transit', eta: '2 days' }
    },
    position: { x: 500, y: 100 },
  },
  {
    id: 'carrier1',
    type: 'carrier',
    data: { 
      label: 'Logistics Ground',
      properties: { type: 'Land', rating: 4.5 }
    },
    position: { x: 700, y: 50 },
  },
  {
    id: 'route1',
    type: 'route',
    data: { 
      label: 'PAC-01 → PORT-WEST-01 → HUB-DELTA-03',
      properties: { distance: '12,500 km', duration: '5 days' }
    },
    position: { x: 700, y: 150 },
  },
  {
    id: 'sensor1',
    type: 'sensor',
    data: { 
      label: 'SHK-8842',
      properties: { type: 'Shock', status: 'Active' }
    },
    position: { x: 500, y: 250 },
  },
];

export const mockOntologyEdges: OntologyEdge[] = [
  { id: 'e1', source: 'factory1', target: 'wafer1', label: 'ORIGINATES' },
  { id: 'e2', source: 'wafer1', target: 'shipment1', label: 'PART_OF' },
  { id: 'e3', source: 'shipment1', target: 'carrier1', label: 'CARRIED_BY' },
  { id: 'e4', source: 'shipment1', target: 'route1', label: 'FOLLOWS' },
  { id: 'e5', source: 'shipment1', target: 'sensor1', label: 'MONITORED_BY' },
];

// Statistics for dashboard
export const mockStats = {
  totalShipments: 842,
  inTransit: 567,
  delivered: 245,
  critical: 12,
  warning: 34,
  activeSensors: 2847,
  offlineSensors: 23,
  avgShock: 0.34,
  avgTemp: 22.8,
};
