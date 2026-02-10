import type {
  Shipment,
  Carrier,
  Sensor,
  TelemetryReading,
  NotebookCell,
  Alert,
  JourneyLeg,
  OntologyNode,
  OntologyEdge,
  ShipmentDossier
} from '../types';

// Mock Carriers
export const mockCarriers: Carrier[] = [
  { id: 'c1', carrierId: 'FEDEX-PRI', name: 'FedEx Priority', type: 'PLANE', rating: 4.8, activeShipments: 4 },
  { id: 'c2', carrierId: 'MAERSK-SC', name: 'Maersk Semiconductor', type: 'SHIP', rating: 4.6, activeShipments: 2 },
  { id: 'c3', carrierId: 'XPO-SEC', name: 'XPO Secure Logistics', type: 'TRUCK', rating: 4.5, activeShipments: 6 },
  { id: 'c4', carrierId: 'DHL-EXP', name: 'DHL Express', type: 'PLANE', rating: 4.7, activeShipments: 5 },
  { id: 'c5', carrierId: 'EVERGRN', name: 'Evergreen Marine', type: 'SHIP', rating: 4.4, activeShipments: 1 },
];

const carrierById = Object.fromEntries(mockCarriers.map((carrier) => [carrier.id, carrier.name]));

function buildDossier(input: {
  trackingCode: string;
  client: string;
  contents: string;
  route: string;
  mode: ShipmentDossier['mode'];
  carrierId: string;
  statusLabel?: string;
  flags?: string[];
  operator: ShipmentDossier['operator'];
  vehicle: ShipmentDossier['vehicle'];
  custody: ShipmentDossier['chainOfCustody'];
  records: ShipmentDossier['records'];
}): ShipmentDossier {
  return {
    linkedJobId: `YO-${input.trackingCode}`,
    client: input.client,
    contents: input.contents,
    carrier: carrierById[input.carrierId] || 'Logistics Partner',
    route: input.route,
    mode: input.mode,
    operator: input.operator,
    vehicle: input.vehicle,
    statusLabel: input.statusLabel,
    chainOfCustody: input.custody,
    records: input.records,
    flags: input.flags || [],
  };
}

function baseRecords(prefix: string): ShipmentDossier['records'] {
  return [
    { id: `${prefix}-COC`, name: 'Chain of Custody', status: 'VERIFIED' },
    { id: `${prefix}-TEMP`, name: 'Temp Calibration', status: 'VERIFIED' },
    { id: `${prefix}-SEC`, name: 'Security Seal', status: 'PENDING' },
  ];
}

function baseCustody(origin: string, destination: string): ShipmentDossier['chainOfCustody'] {
  return [
    { time: 'T-18h', event: `Released from ${origin}`, actor: 'YieldOps Vault', status: 'ok' },
    { time: 'T-6h', event: 'Carrier handoff', actor: 'Secure Ops', status: 'ok' },
    { time: 'T-1h', event: `Inbound scan ${destination}`, actor: 'Destination Gate', status: 'warn' },
  ];
}

const operatorFedEx = { id: 'OP-FDX-217', company: 'FedEx Priority', role: 'Air Ops', rating: '4.8' };
const operatorDHL = { id: 'OP-DHL-412', company: 'DHL Express', role: 'Air Ops', rating: '4.7' };
const operatorMaersk = { id: 'OP-MSK-991', company: 'Maersk Semiconductor', role: 'Sea Ops', rating: '4.6' };
const operatorEvergreen = { id: 'OP-EVG-301', company: 'Evergreen Marine', role: 'Sea Ops', rating: '4.4' };
const operatorXpo = { id: 'OP-XPO-602', company: 'XPO Secure Logistics', role: 'Ground Ops', rating: '4.5' };

const vehicleAir = { id: 'AC-78F', model: 'Boeing 777F', maintenance: 'Green' };
const vehicleSea = { id: 'VSL-42', model: 'Ultra Large Container', maintenance: 'Amber' };
const vehicleLand = { id: 'TRK-9X', model: 'Secure Reefer', maintenance: 'Green' };

// Mock Sensors
export const mockSensors: Sensor[] = [
  { id: 's1', sensorId: 'GPS-7201', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh1', lastReading: new Date() },
  { id: 's2', sensorId: 'SHK-7201', type: 'SHOCK', status: 'ACTIVE', shipmentId: 'sh1', lastReading: new Date() },
  { id: 's3', sensorId: 'TMP-7201', type: 'TEMPERATURE', status: 'ACTIVE', shipmentId: 'sh1', lastReading: new Date() },

  { id: 's4', sensorId: 'GPS-4410', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh2', lastReading: new Date() },
  { id: 's5', sensorId: 'SHK-4410', type: 'SHOCK', status: 'ACTIVE', shipmentId: 'sh2', lastReading: new Date() },
  { id: 's6', sensorId: 'TMP-4410', type: 'TEMPERATURE', status: 'ACTIVE', shipmentId: 'sh2', lastReading: new Date() },

  { id: 's7', sensorId: 'GPS-9902', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh3', lastReading: new Date() },
  { id: 's8', sensorId: 'SHK-9902', type: 'SHOCK', status: 'ERROR', shipmentId: 'sh3', lastReading: new Date(Date.now() - 3600000) },
  { id: 's9', sensorId: 'TMP-9902', type: 'TEMPERATURE', status: 'ACTIVE', shipmentId: 'sh3', lastReading: new Date() },

  { id: 's10', sensorId: 'GPS-3301', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh4', lastReading: new Date() },
  { id: 's11', sensorId: 'SHK-3301', type: 'SHOCK', status: 'ACTIVE', shipmentId: 'sh4', lastReading: new Date() },
  { id: 's12', sensorId: 'TMP-3301', type: 'TEMPERATURE', status: 'ACTIVE', shipmentId: 'sh4', lastReading: new Date() },

  { id: 's13', sensorId: 'GPS-1105', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh5', lastReading: new Date() },
  { id: 's14', sensorId: 'SHK-1105', type: 'SHOCK', status: 'ACTIVE', shipmentId: 'sh5', lastReading: new Date() },
  { id: 's15', sensorId: 'TMP-1105', type: 'TEMPERATURE', status: 'ACTIVE', shipmentId: 'sh5', lastReading: new Date() },

  { id: 's16', sensorId: 'GPS-6602', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh6', lastReading: new Date() },
  { id: 's17', sensorId: 'SHK-6602', type: 'SHOCK', status: 'ACTIVE', shipmentId: 'sh6', lastReading: new Date() },
  { id: 's18', sensorId: 'TMP-6602', type: 'TEMPERATURE', status: 'ACTIVE', shipmentId: 'sh6', lastReading: new Date() },

  { id: 's19', sensorId: 'GPS-8801', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh7', lastReading: new Date() },

  { id: 's20', sensorId: 'GPS-2205', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh8', lastReading: new Date() },
  { id: 's21', sensorId: 'SHK-2205', type: 'SHOCK', status: 'ACTIVE', shipmentId: 'sh8', lastReading: new Date() },
  { id: 's22', sensorId: 'TMP-2205', type: 'TEMPERATURE', status: 'ACTIVE', shipmentId: 'sh8', lastReading: new Date() },

  { id: 's23', sensorId: 'GPS-5501', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh9', lastReading: new Date() },
  { id: 's24', sensorId: 'SHK-5501', type: 'SHOCK', status: 'ACTIVE', shipmentId: 'sh9', lastReading: new Date() },
  { id: 's25', sensorId: 'TMP-5501', type: 'TEMPERATURE', status: 'ACTIVE', shipmentId: 'sh9', lastReading: new Date() },

  { id: 's26', sensorId: 'GPS-1102', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh10', lastReading: new Date() },
  { id: 's27', sensorId: 'SHK-1102', type: 'SHOCK', status: 'ACTIVE', shipmentId: 'sh10', lastReading: new Date() },
  { id: 's28', sensorId: 'TMP-1102', type: 'TEMPERATURE', status: 'ACTIVE', shipmentId: 'sh10', lastReading: new Date() },

  { id: 's29', sensorId: 'GPS-0011', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh11', lastReading: new Date() },
  { id: 's29b', sensorId: 'SHK-0011', type: 'SHOCK', status: 'ACTIVE', shipmentId: 'sh11', lastReading: new Date() },
  { id: 's29c', sensorId: 'TMP-0011', type: 'TEMPERATURE', status: 'ACTIVE', shipmentId: 'sh11', lastReading: new Date() },

  { id: 's30', sensorId: 'GPS-3312', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh12', lastReading: new Date() },
  { id: 's31', sensorId: 'SHK-3312', type: 'SHOCK', status: 'ACTIVE', shipmentId: 'sh12', lastReading: new Date() },

  { id: 's32', sensorId: 'GPS-7713', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh13', lastReading: new Date() },
  { id: 's33', sensorId: 'SHK-7713', type: 'SHOCK', status: 'ACTIVE', shipmentId: 'sh13', lastReading: new Date() },
  { id: 's34', sensorId: 'TMP-7713', type: 'TEMPERATURE', status: 'ACTIVE', shipmentId: 'sh13', lastReading: new Date() },

  { id: 's35', sensorId: 'GPS-9914', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh14', lastReading: new Date() },
  { id: 's36', sensorId: 'TMP-9914', type: 'TEMPERATURE', status: 'ERROR', shipmentId: 'sh14', lastReading: new Date(Date.now() - 7200000) },

  { id: 's37', sensorId: 'GPS-6615', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh15', lastReading: new Date() },
  { id: 's38', sensorId: 'SHK-6615', type: 'SHOCK', status: 'ACTIVE', shipmentId: 'sh15', lastReading: new Date() },
  { id: 's39', sensorId: 'TMP-6615', type: 'TEMPERATURE', status: 'ACTIVE', shipmentId: 'sh15', lastReading: new Date() },

  { id: 's40', sensorId: 'GPS-4416', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh16', lastReading: new Date() },
  { id: 's41', sensorId: 'SHK-4416', type: 'SHOCK', status: 'ACTIVE', shipmentId: 'sh16', lastReading: new Date() },

  { id: 's42', sensorId: 'GPS-2217', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh17', lastReading: new Date() },
  { id: 's43', sensorId: 'SHK-2217', type: 'SHOCK', status: 'ACTIVE', shipmentId: 'sh17', lastReading: new Date() },
  { id: 's44', sensorId: 'TMP-2217', type: 'TEMPERATURE', status: 'ACTIVE', shipmentId: 'sh17', lastReading: new Date() },

  { id: 's45', sensorId: 'GPS-1818', type: 'GPS', status: 'ACTIVE', shipmentId: 'sh18', lastReading: new Date() },
  { id: 's46', sensorId: 'SHK-1818', type: 'SHOCK', status: 'ACTIVE', shipmentId: 'sh18', lastReading: new Date() },
  { id: 's47', sensorId: 'TMP-1818', type: 'TEMPERATURE', status: 'ACTIVE', shipmentId: 'sh18', lastReading: new Date() },
];

// Generate telemetry history for DVR
export const generateTelemetryHistory = (_shipmentId: string, points: number = 100): TelemetryReading[] => {
  const history: TelemetryReading[] = [];
  const baseLat = 24.5 + Math.random() * 10;
  const baseLng = 120.5 + Math.random() * 20;

  for (let i = 0; i < points; i++) {
    const timestamp = new Date(Date.now() - (points - i) * 60000);
    const progress = i / points;

    let shock = 0.2 + Math.random() * 0.3;
    if (i === 67) shock = 4.2;
    if (i === 45) shock = 2.8;

    history.push({
      timestamp,
      location: {
        lat: baseLat + progress * 5 + Math.sin(i * 0.1) * 0.5,
        lng: baseLng + progress * 10 + Math.cos(i * 0.1) * 0.5,
      },
      shock,
      temperature: 22 + Math.sin(i * 0.05) * 3 + (i > 80 ? 6 : 0),
      humidity: 45 + Math.random() * 10,
      vibration: 20 + Math.random() * 15 + (i === 67 ? 100 : 0),
    });
  }

  return history;
};

// Mock Shipments — 18 globally distributed
export const mockShipments: Shipment[] = [
  // 1. TSMC Hsinchu -> Apple Cupertino (AIR, IN_TRANSIT, mid-Pacific)
  {
    id: 'sh1',
    trackingCode: 'AIR-7201-TSM',
    status: 'IN_TRANSIT',
    origin: { id: 'zone-a', name: 'TSMC Fab 18 Hsinchu', type: 'FACTORY', location: { lat: 24.7742, lng: 121.0106 } },
    destination: { id: 'client-apple', name: 'Apple Cupertino', type: 'CUSTOMER', location: { lat: 37.3346, lng: -122.0090 } },
    currentLocation: { lat: 38.5, lng: -172.0 },
    carrierId: 'c1',
    routeId: 'r-tpe-sfo-1',
    waferLotIds: ['LOT-3NM-A001', 'LOT-3NM-A002'],
    sensorIds: ['GPS-7201', 'SHK-7201', 'TMP-7201'],
    dossier: buildDossier({
      trackingCode: 'AIR-7201-TSM',
      client: 'Apple',
      contents: '3nm logic wafers (A-series)',
      route: 'TPE → ANC → MEM → SFO → Cupertino',
      mode: 'AIR',
      carrierId: 'c1',
      operator: operatorFedEx,
      vehicle: vehicleAir,
      custody: baseCustody('TSMC Hsinchu', 'Apple Cupertino'),
      records: baseRecords('APL-7201'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 38.5, lng: -172.0 },
      shock: 0.3,
      temperature: 21.5,
      humidity: 38,
      vibration: 22,
    },
  },
  // 2. Samsung Pyeongtaek -> Qualcomm San Diego (SEA, IN_TRANSIT, near Hawaii)
  {
    id: 'sh2',
    trackingCode: 'SEA-4410-SAM',
    status: 'IN_TRANSIT',
    origin: { id: 'zone-c', name: 'Samsung Pyeongtaek', type: 'FACTORY', location: { lat: 37.0745, lng: 127.0094 } },
    destination: { id: 'client-qcom', name: 'Qualcomm San Diego', type: 'CUSTOMER', location: { lat: 32.8975, lng: -117.1965 } },
    currentLocation: { lat: 28.5, lng: -155.8 },
    carrierId: 'c2',
    routeId: 'r-icn-lax-1',
    waferLotIds: ['LOT-4NM-S001', 'LOT-4NM-S002', 'LOT-4NM-S003'],
    sensorIds: ['GPS-4410', 'SHK-4410', 'TMP-4410'],
    dossier: buildDossier({
      trackingCode: 'SEA-4410-SAM',
      client: 'Qualcomm',
      contents: '4nm Snapdragon wafers',
      route: 'BUS → SHA → NGB → LAX → San Diego',
      mode: 'SEA',
      carrierId: 'c2',
      operator: operatorMaersk,
      vehicle: vehicleSea,
      custody: baseCustody('Samsung Pyeongtaek', 'Qualcomm San Diego'),
      records: baseRecords('QCOM-4410'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 28.5, lng: -155.8 },
      shock: 0.1,
      temperature: 26.2,
      humidity: 72,
      vibration: 5,
    },
  },
  // 3. TSMC Kaohsiung -> NVIDIA Santa Clara (AIR, CRITICAL, near Anchorage)
  {
    id: 'sh3',
    trackingCode: 'AIR-9902-TSM',
    status: 'CRITICAL',
    origin: { id: 'zone-b', name: 'TSMC Fab 22 Kaohsiung', type: 'FACTORY', location: { lat: 22.6273, lng: 120.3014 } },
    destination: { id: 'client-nvda', name: 'NVIDIA Santa Clara', type: 'CUSTOMER', location: { lat: 37.3708, lng: -122.0375 } },
    currentLocation: { lat: 61.2, lng: -149.9 },
    carrierId: 'c1',
    routeId: 'r-kao-sfo-1',
    waferLotIds: ['LOT-3NM-N001'],
    sensorIds: ['GPS-9902', 'SHK-9902', 'TMP-9902'],
    dossier: buildDossier({
      trackingCode: 'AIR-9902-TSM',
      client: 'NVIDIA',
      contents: '3nm GPU compute dies',
      route: 'KHH → ANC → SJC → Santa Clara',
      mode: 'AIR',
      carrierId: 'c1',
      statusLabel: 'Thermal Excursion',
      flags: ['Shock anomaly', 'Thermal excursion'],
      operator: operatorFedEx,
      vehicle: vehicleAir,
      custody: baseCustody('TSMC Kaohsiung', 'NVIDIA Santa Clara'),
      records: baseRecords('NVDA-9902'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 61.2, lng: -149.9 },
      shock: 4.1,
      temperature: 28.5,
      humidity: 35,
      vibration: 110,
    },
  },
  // 4. Intel Leixlip Ireland -> Intel Ocotillo AZ (AIR, IN_TRANSIT, over Atlantic)
  {
    id: 'sh4',
    trackingCode: 'AIR-3301-INT',
    status: 'IN_TRANSIT',
    origin: { id: 'zone-m', name: 'Intel Leixlip Ireland', type: 'FACTORY', location: { lat: 53.2798, lng: -6.3520 } },
    destination: { id: 'zone-g', name: 'Intel Ocotillo AZ', type: 'CUSTOMER', location: { lat: 33.4152, lng: -111.8315 } },
    currentLocation: { lat: 47.0, lng: -38.0 },
    carrierId: 'c4',
    routeId: 'r-dub-phx-1',
    waferLotIds: ['LOT-7NM-I001', 'LOT-7NM-I002'],
    sensorIds: ['GPS-3301', 'SHK-3301', 'TMP-3301'],
    dossier: buildDossier({
      trackingCode: 'AIR-3301-INT',
      client: 'Intel (Ocotillo)',
      contents: '7nm process test wafers',
      route: 'DUB → JFK → PHX',
      mode: 'AIR',
      carrierId: 'c4',
      operator: operatorDHL,
      vehicle: vehicleAir,
      custody: baseCustody('Intel Leixlip', 'Intel Ocotillo'),
      records: baseRecords('INT-3301'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 47.0, lng: -38.0 },
      shock: 0.5,
      temperature: 22.0,
      humidity: 42,
      vibration: 18,
    },
  },
  // 5. Infineon Dresden -> Bosch Reutlingen (TRUCK, IN_TRANSIT, southern Germany)
  {
    id: 'sh5',
    trackingCode: 'TRK-1105-INF',
    status: 'IN_TRANSIT',
    origin: { id: 'zone-k', name: 'Infineon Dresden', type: 'FACTORY', location: { lat: 51.0504, lng: 13.7373 } },
    destination: { id: 'client-bosch', name: 'Bosch Reutlingen', type: 'CUSTOMER', location: { lat: 48.4917, lng: 9.2078 } },
    currentLocation: { lat: 49.8, lng: 11.5 },
    carrierId: 'c3',
    routeId: 'r-drs-reu-1',
    waferLotIds: ['LOT-40NM-F001'],
    sensorIds: ['GPS-1105', 'SHK-1105', 'TMP-1105'],
    dossier: buildDossier({
      trackingCode: 'TRK-1105-INF',
      client: 'Bosch',
      contents: 'Automotive power ICs',
      route: 'Dresden → Nuremberg → Reutlingen',
      mode: 'TRUCK',
      carrierId: 'c3',
      operator: operatorXpo,
      vehicle: vehicleLand,
      custody: baseCustody('Infineon Dresden', 'Bosch Reutlingen'),
      records: baseRecords('BOS-1105'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 49.8, lng: 11.5 },
      shock: 0.2,
      temperature: 20.0,
      humidity: 50,
      vibration: 30,
    },
  },
  // 6. GlobalFoundries Singapore -> NXP Eindhoven (SEA, DELAYED, Indian Ocean)
  {
    id: 'sh6',
    trackingCode: 'SEA-6602-GFS',
    status: 'DELAYED',
    origin: { id: 'zone-f', name: 'GlobalFoundries Singapore', type: 'FACTORY', location: { lat: 1.3521, lng: 103.8198 } },
    destination: { id: 'client-nxp', name: 'NXP Eindhoven', type: 'CUSTOMER', location: { lat: 51.4231, lng: 5.4623 } },
    currentLocation: { lat: 8.2, lng: 89.4 },
    carrierId: 'c5',
    routeId: 'r-sin-ehv-1',
    waferLotIds: ['LOT-14NM-GF01', 'LOT-14NM-GF02'],
    sensorIds: ['GPS-6602', 'SHK-6602', 'TMP-6602'],
    dossier: buildDossier({
      trackingCode: 'SEA-6602-GFS',
      client: 'NXP',
      contents: 'Automotive MCU wafers',
      route: 'SIN → SZX → CAN → SHA → RTM → Eindhoven',
      mode: 'SEA',
      carrierId: 'c5',
      statusLabel: 'Weather Delay',
      flags: ['Temp excursion'],
      operator: operatorEvergreen,
      vehicle: vehicleSea,
      custody: baseCustody('GF Singapore', 'NXP Eindhoven'),
      records: baseRecords('NXP-6602'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 8.2, lng: 89.4 },
      shock: 0.1,
      temperature: 29.8,
      humidity: 78,
      vibration: 4,
    },
  },
  // 7. Intel Leixlip Ireland -> Apple Cupertino (AIR, SCHEDULED, still at origin)
  {
    id: 'sh7',
    trackingCode: 'AIR-8801-INT',
    status: 'SCHEDULED',
    origin: { id: 'zone-m', name: 'Intel Leixlip Ireland', type: 'FACTORY', location: { lat: 53.2798, lng: -6.3520 } },
    destination: { id: 'client-apple', name: 'Apple Cupertino', type: 'CUSTOMER', location: { lat: 37.3346, lng: -122.0090 } },
    currentLocation: { lat: 53.2798, lng: -6.3520 },
    carrierId: 'c4',
    routeId: 'r-dub-sfo-2',
    waferLotIds: [],
    sensorIds: ['GPS-8801'],
    dossier: buildDossier({
      trackingCode: 'AIR-8801-INT',
      client: 'Apple',
      contents: 'Foundry qualification lots',
      route: 'DUB → HKG → TPE → SFO',
      mode: 'AIR',
      carrierId: 'c4',
      operator: operatorDHL,
      vehicle: vehicleAir,
      custody: baseCustody('Intel Leixlip', 'Apple Cupertino'),
      records: baseRecords('APL-8801'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 53.2798, lng: -6.3520 },
      shock: 0.0,
      temperature: 17.0,
      humidity: 60,
      vibration: 0,
    },
  },
  // 8. TSMC Hsinchu -> AMD San Jose (AIR, DELIVERED)
  {
    id: 'sh8',
    trackingCode: 'AIR-2205-TSM',
    status: 'DELIVERED',
    origin: { id: 'zone-a', name: 'TSMC Fab 18 Hsinchu', type: 'FACTORY', location: { lat: 24.7742, lng: 121.0106 } },
    destination: { id: 'client-amd', name: 'AMD San Jose', type: 'CUSTOMER', location: { lat: 37.3741, lng: -121.9630 } },
    currentLocation: { lat: 37.3741, lng: -121.9630 },
    carrierId: 'c1',
    routeId: 'r-tpe-sjc-1',
    waferLotIds: ['LOT-5NM-A001'],
    sensorIds: ['GPS-2205', 'SHK-2205', 'TMP-2205'],
    dossier: buildDossier({
      trackingCode: 'AIR-2205-TSM',
      client: 'AMD',
      contents: '5nm CPU chiplets',
      route: 'TPE → ANC → SJC',
      mode: 'AIR',
      carrierId: 'c1',
      statusLabel: 'Delivered',
      operator: operatorFedEx,
      vehicle: vehicleAir,
      custody: baseCustody('TSMC Hsinchu', 'AMD San Jose'),
      records: baseRecords('AMD-2205'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 37.3741, lng: -121.9630 },
      shock: 0.1,
      temperature: 20.5,
      humidity: 42,
      vibration: 0,
    },
  },
  // 9. Samsung Giheung -> Bosch Reutlingen (TRAIN, IN_TRANSIT, central Europe)
  {
    id: 'sh9',
    trackingCode: 'TRN-5501-SAM',
    status: 'IN_TRANSIT',
    origin: { id: 'zone-d', name: 'Samsung Giheung', type: 'FACTORY', location: { lat: 36.9940, lng: 126.7828 } },
    destination: { id: 'client-bosch', name: 'Bosch Reutlingen', type: 'CUSTOMER', location: { lat: 48.4917, lng: 9.2078 } },
    currentLocation: { lat: 51.3, lng: 12.4 },
    carrierId: 'c3',
    routeId: 'r-icn-reu-1',
    waferLotIds: ['LOT-12NM-S001'],
    sensorIds: ['GPS-5501', 'SHK-5501', 'TMP-5501'],
    dossier: buildDossier({
      trackingCode: 'TRN-5501-SAM',
      client: 'Bosch',
      contents: 'Automotive MCU wafers',
      route: 'ICN → Busan → Munich → Reutlingen',
      mode: 'TRAIN',
      carrierId: 'c3',
      operator: operatorXpo,
      vehicle: vehicleLand,
      custody: baseCustody('Samsung Giheung', 'Bosch Reutlingen'),
      records: baseRecords('BOS-5501'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 51.3, lng: 12.4 },
      shock: 0.2,
      temperature: 16.5,
      humidity: 52,
      vibration: 18,
    },
  },
  // 10. Intel Kiryat Gat -> Intel Ronler Acres OR (AIR, HELD_CUSTOMS, JFK)
  {
    id: 'sh10',
    trackingCode: 'AIR-1102-INT',
    status: 'HELD_CUSTOMS',
    origin: { id: 'zone-n', name: 'Intel Kiryat Gat Israel', type: 'FACTORY', location: { lat: 31.8969, lng: 34.8116 } },
    destination: { id: 'zone-h', name: 'Intel Ronler Acres OR', type: 'CUSTOMER', location: { lat: 45.5152, lng: -122.6784 } },
    currentLocation: { lat: 40.6413, lng: -73.7781 },
    carrierId: 'c4',
    routeId: 'r-tlv-pdx-1',
    waferLotIds: ['LOT-10NM-K001'],
    sensorIds: ['GPS-1102', 'SHK-1102', 'TMP-1102'],
    dossier: buildDossier({
      trackingCode: 'AIR-1102-INT',
      client: 'Intel (Ronler Acres)',
      contents: '10nm fab lots',
      route: 'TLV → JFK → PDX',
      mode: 'AIR',
      carrierId: 'c4',
      statusLabel: 'Customs Hold',
      flags: ['Customs hold'],
      operator: operatorDHL,
      vehicle: vehicleAir,
      custody: baseCustody('Intel Kiryat Gat', 'Intel Ronler Acres'),
      records: baseRecords('INT-1102'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 40.6413, lng: -73.7781 },
      shock: 0.2,
      temperature: 23.0,
      humidity: 50,
      vibration: 0,
    },
  },
  // 11. Intel Ocotillo AZ -> MediaTek Hsinchu (AIR, IN_TRANSIT, mid-Pacific)
  {
    id: 'sh11',
    trackingCode: 'AIR-0011-INT',
    status: 'IN_TRANSIT',
    origin: { id: 'zone-g', name: 'Intel Ocotillo AZ', type: 'FACTORY', location: { lat: 33.4152, lng: -111.8315 } },
    destination: { id: 'client-mtk', name: 'MediaTek Hsinchu', type: 'CUSTOMER', location: { lat: 24.8066, lng: 120.9686 } },
    currentLocation: { lat: 34.2, lng: -154.6 },
    carrierId: 'c4',
    routeId: 'r-phx-tpe-ifs-1',
    waferLotIds: ['LOT-7NM-I010'],
    sensorIds: ['GPS-0011', 'SHK-0011', 'TMP-0011'],
    dossier: buildDossier({
      trackingCode: 'AIR-0011-INT',
      client: 'MediaTek',
      contents: 'Foundry qualification wafers',
      route: 'PHX → MEM → ANC → TPE → Hsinchu',
      mode: 'AIR',
      carrierId: 'c4',
      operator: operatorDHL,
      vehicle: vehicleAir,
      custody: baseCustody('Intel Ocotillo', 'MediaTek Hsinchu'),
      records: baseRecords('MTK-0011'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 34.2, lng: -154.6 },
      shock: 0.2,
      temperature: 18.0,
      humidity: 42,
      vibration: 12,
    },
  },
  // 12. GlobalFoundries Malta NY -> GM Detroit (TRUCK, IN_TRANSIT)
  {
    id: 'sh12',
    trackingCode: 'TRK-3312-GFM',
    status: 'IN_TRANSIT',
    origin: { id: 'zone-i', name: 'GlobalFoundries Malta NY', type: 'FACTORY', location: { lat: 42.9420, lng: -73.8707 } },
    destination: { id: 'client-gm', name: 'GM Detroit Tech Center', type: 'CUSTOMER', location: { lat: 42.4845, lng: -83.2568 } },
    currentLocation: { lat: 41.1, lng: -77.7 },
    carrierId: 'c3',
    routeId: 'r-mlt-det-1',
    waferLotIds: ['LOT-12NM-GM01'],
    sensorIds: ['GPS-3312', 'SHK-3312'],
    dossier: buildDossier({
      trackingCode: 'TRK-3312-GFM',
      client: 'GM',
      contents: 'Automotive MCU lots',
      route: 'Malta → Harrisburg → Detroit',
      mode: 'TRUCK',
      carrierId: 'c3',
      operator: operatorXpo,
      vehicle: vehicleLand,
      custody: baseCustody('GF Malta', 'GM Detroit'),
      records: baseRecords('GM-3312'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 41.1, lng: -77.7 },
      shock: 0.3,
      temperature: 21.5,
      humidity: 48,
      vibration: 28,
    },
  },
  // 13. Samsung Pyeongtaek -> Apple Cupertino (AIR, IN_TRANSIT, east of Hokkaido)
  {
    id: 'sh13',
    trackingCode: 'AIR-7713-SAM',
    status: 'IN_TRANSIT',
    origin: { id: 'zone-c', name: 'Samsung Pyeongtaek', type: 'FACTORY', location: { lat: 37.0745, lng: 127.0094 } },
    destination: { id: 'client-apple', name: 'Apple Cupertino', type: 'CUSTOMER', location: { lat: 37.3346, lng: -122.0090 } },
    currentLocation: { lat: 42.0, lng: 145.0 },
    carrierId: 'c1',
    routeId: 'r-icn-sfo-2',
    waferLotIds: ['LOT-4NM-S001', 'LOT-4NM-S002'],
    sensorIds: ['GPS-7713', 'SHK-7713', 'TMP-7713'],
    dossier: buildDossier({
      trackingCode: 'AIR-7713-SAM',
      client: 'Apple',
      contents: '4nm mobile SoC wafers',
      route: 'ICN → ANC → SFO',
      mode: 'AIR',
      carrierId: 'c1',
      operator: operatorFedEx,
      vehicle: vehicleAir,
      custody: baseCustody('Samsung Pyeongtaek', 'Apple Cupertino'),
      records: baseRecords('APL-7713'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 42.0, lng: 145.0 },
      shock: 0.4,
      temperature: 21.5,
      humidity: 38,
      vibration: 20,
    },
  },
  // 14. Samsung Pyeongtaek -> GM Detroit (SEA, IN_TRANSIT, Arabian Sea)
  {
    id: 'sh14',
    trackingCode: 'SEA-9914-SAM',
    status: 'IN_TRANSIT',
    origin: { id: 'zone-c', name: 'Samsung Pyeongtaek', type: 'FACTORY', location: { lat: 37.0745, lng: 127.0094 } },
    destination: { id: 'client-gm', name: 'GM Detroit Tech Center', type: 'CUSTOMER', location: { lat: 42.4845, lng: -83.2568 } },
    currentLocation: { lat: 12.0, lng: 72.0 },
    carrierId: 'c2',
    routeId: 'r-icn-det-1',
    waferLotIds: ['LOT-8NM-S001'],
    sensorIds: ['GPS-9914', 'TMP-9914'],
    dossier: buildDossier({
      trackingCode: 'SEA-9914-SAM',
      client: 'GM',
      contents: 'Automotive power ICs',
      route: 'ICN → SIN → RTM → Detroit',
      mode: 'SEA',
      carrierId: 'c2',
      operator: operatorMaersk,
      vehicle: vehicleSea,
      custody: baseCustody('Samsung Pyeongtaek', 'GM Detroit'),
      records: baseRecords('GM-9914'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 12.0, lng: 72.0 },
      shock: 0.05,
      temperature: 31.2,
      humidity: 76,
      vibration: 3,
    },
  },
  // 15. TSMC Hsinchu -> Qualcomm San Diego (AIR, DELAYED, Anchorage layover)
  {
    id: 'sh15',
    trackingCode: 'AIR-6615-TSM',
    status: 'DELAYED',
    origin: { id: 'zone-a', name: 'TSMC Fab 18 Hsinchu', type: 'FACTORY', location: { lat: 24.7742, lng: 121.0106 } },
    destination: { id: 'client-qcom', name: 'Qualcomm San Diego', type: 'CUSTOMER', location: { lat: 32.8975, lng: -117.1965 } },
    currentLocation: { lat: 61.1743, lng: -149.9964 },
    carrierId: 'c1',
    routeId: 'r-tpe-san-1',
    waferLotIds: ['LOT-5NM-Q001', 'LOT-5NM-Q002'],
    sensorIds: ['GPS-6615', 'SHK-6615', 'TMP-6615'],
    dossier: buildDossier({
      trackingCode: 'AIR-6615-TSM',
      client: 'Qualcomm',
      contents: '5nm modem wafers',
      route: 'TPE → PVG → ANC → SAN',
      mode: 'AIR',
      carrierId: 'c1',
      statusLabel: 'Delay: Weather',
      flags: ['Weather delay'],
      operator: operatorFedEx,
      vehicle: vehicleAir,
      custody: baseCustody('TSMC Hsinchu', 'Qualcomm San Diego'),
      records: baseRecords('QCOM-6615'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 61.1743, lng: -149.9964 },
      shock: 0.2,
      temperature: -2.0,
      humidity: 25,
      vibration: 0,
    },
  },
  // 16. Infineon Dresden -> NXP Eindhoven (TRAIN, IN_TRANSIT, central Germany)
  {
    id: 'sh16',
    trackingCode: 'TRN-4416-INF',
    status: 'IN_TRANSIT',
    origin: { id: 'zone-k', name: 'Infineon Dresden', type: 'FACTORY', location: { lat: 51.0504, lng: 13.7373 } },
    destination: { id: 'client-nxp', name: 'NXP Eindhoven', type: 'CUSTOMER', location: { lat: 51.4231, lng: 5.4623 } },
    currentLocation: { lat: 51.2, lng: 9.5 },
    carrierId: 'c3',
    routeId: 'r-drs-ehv-1',
    waferLotIds: ['LOT-28NM-N001'],
    sensorIds: ['GPS-4416', 'SHK-4416'],
    dossier: buildDossier({
      trackingCode: 'TRN-4416-INF',
      client: 'NXP',
      contents: 'Automotive MCU wafers',
      route: 'Dresden → Frankfurt → Eindhoven',
      mode: 'TRAIN',
      carrierId: 'c3',
      operator: operatorXpo,
      vehicle: vehicleLand,
      custody: baseCustody('Infineon Dresden', 'NXP Eindhoven'),
      records: baseRecords('NXP-4416'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 51.2, lng: 9.5 },
      shock: 0.15,
      temperature: 18.0,
      humidity: 52,
      vibration: 10,
    },
  },
  // 17. Intel Ocotillo AZ -> GM Detroit (TRUCK, IN_TRANSIT, New Mexico)
  {
    id: 'sh17',
    trackingCode: 'TRK-2217-INT',
    status: 'IN_TRANSIT',
    origin: { id: 'zone-g', name: 'Intel Ocotillo AZ', type: 'FACTORY', location: { lat: 33.4152, lng: -111.8315 } },
    destination: { id: 'client-gm', name: 'GM Detroit Tech Center', type: 'CUSTOMER', location: { lat: 42.4845, lng: -83.2568 } },
    currentLocation: { lat: 32.3, lng: -106.7 },
    carrierId: 'c3',
    routeId: 'r-phx-det-1',
    waferLotIds: ['LOT-7NM-GM01', 'LOT-7NM-GM02'],
    sensorIds: ['GPS-2217', 'SHK-2217', 'TMP-2217'],
    dossier: buildDossier({
      trackingCode: 'TRK-2217-INT',
      client: 'GM',
      contents: 'Automotive control wafers',
      route: 'Phoenix → El Paso → Detroit',
      mode: 'TRUCK',
      carrierId: 'c3',
      operator: operatorXpo,
      vehicle: vehicleLand,
      custody: baseCustody('Intel Ocotillo', 'GM Detroit'),
      records: baseRecords('GM-2217'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 32.3, lng: -106.7 },
      shock: 0.4,
      temperature: 35.0,
      humidity: 15,
      vibration: 32,
    },
  },
  // 18. Samsung Giheung -> NVIDIA Santa Clara (AIR, IN_TRANSIT, over Bering Sea)
  {
    id: 'sh18',
    trackingCode: 'AIR-1818-SAM',
    status: 'IN_TRANSIT',
    origin: { id: 'zone-d', name: 'Samsung Giheung', type: 'FACTORY', location: { lat: 36.9940, lng: 126.7828 } },
    destination: { id: 'client-nvda', name: 'NVIDIA Santa Clara', type: 'CUSTOMER', location: { lat: 37.3708, lng: -122.0375 } },
    currentLocation: { lat: 52.0, lng: 178.0 },
    carrierId: 'c4',
    routeId: 'r-icn-sjc-1',
    waferLotIds: ['LOT-5NM-NV01'],
    sensorIds: ['GPS-1818', 'SHK-1818', 'TMP-1818'],
    dossier: buildDossier({
      trackingCode: 'AIR-1818-SAM',
      client: 'NVIDIA',
      contents: '5nm accelerator wafers',
      route: 'ICN → ANC → SJC',
      mode: 'AIR',
      carrierId: 'c4',
      operator: operatorDHL,
      vehicle: vehicleAir,
      custody: baseCustody('Samsung Giheung', 'NVIDIA Santa Clara'),
      records: baseRecords('NVDA-1818'),
    }),
    telemetry: {
      timestamp: new Date(),
      location: { lat: 52.0, lng: 178.0 },
      shock: 0.3,
      temperature: 20.0,
      humidity: 40,
      vibration: 19,
    },
  },
];

// Mock Notebook Cells
export const mockNotebookCells: NotebookCell[] = [
  {
    id: 'cell1',
    type: 'MARKDOWN',
    content: `### Shock Anomaly Detection

Running Isolation Forest algorithm on real-time telemetry from 842 active shipments across the TSMC-Samsung-Intel logistics network.

**Objective:** Identify shipments experiencing G-forces outside 3 standard deviations for their route type.`,
  },
  {
    id: 'cell2',
    type: 'CODE',
    language: 'python',
    content: `# Import Logistics Analytics Library
import transvec.analytics as ta
from sklearn.ensemble import IsolationForest

# Fetch active shipment telemetry for Trans-Pacific routes
shipments = ta.get_shipments(route="TRANS-PACIFIC-AIR")

# Detect anomalies in shock sensor data
model = IsolationForest(contamination=0.05)
anomalies = model.fit_predict(shipments[['shock_g', 'vibration_hz']])

# Highlight critical failures on map
ta.visualize_map(anomalies, color='red')`,
    output: `[SYSTEM] Analyzed 842 active shipments.
[DETECTED] 3 Anomalies found:
 > AIR-9902-TSM (Shock: 4.1G - Critical) - Near Anchorage, AK
 > SEA-6602-GFS (Temp: 30.5C - Warning) - South China Sea
 > AIR-6615-TSM (Delayed: Weather hold) - Anchorage layover`,
  },
  {
    id: 'cell3',
    type: 'MARKDOWN',
    content: `### ETA Prediction Model

Running linear regression on port congestion data vs. current vessel speed to estimate arrival at Port of Los Angeles.`,
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
 > SEA-4410-SAM: ETA 2.3 days (95% confidence)
 > SEA-9914-SAM: ETA 8.1 days (87% confidence)
 > SEA-6602-GFS: ETA 4.5 days (72% confidence - delayed)`,
  },
];

// Mock Alerts
export const mockAlerts: Alert[] = [
  {
    id: 'a1',
    type: 'SHOCK_THRESHOLD',
    severity: 'CRITICAL',
    shipmentId: 'sh3',
    message: 'AIR-9902-TSM shock at 4.1G near Anchorage -- exceeds 3G threshold',
    timestamp: new Date(Date.now() - 1800000),
    acknowledged: false,
  },
  {
    id: 'a2',
    type: 'TEMPERATURE_EXCURSION',
    severity: 'CRITICAL',
    shipmentId: 'sh6',
    message: 'SEA-6602-GFS temperature at 29.8C in Indian Ocean -- exceeds 25C limit',
    timestamp: new Date(Date.now() - 3600000),
    acknowledged: false,
  },
  {
    id: 'a3',
    type: 'DELAYED_ARRIVAL',
    severity: 'WARNING',
    shipmentId: 'sh15',
    message: 'AIR-6615-TSM delayed at Anchorage -- weather hold',
    timestamp: new Date(Date.now() - 3600000),
    acknowledged: false,
  },
  {
    id: 'a4',
    type: 'GEOFENCE_BREACH',
    severity: 'WARNING',
    shipmentId: 'sh10',
    message: 'AIR-1102-INT held at JFK customs -- extended processing',
    timestamp: new Date(Date.now() - 7200000),
    acknowledged: false,
  },
  {
    id: 'a5',
    type: 'SENSOR_OFFLINE',
    severity: 'WARNING',
    shipmentId: 'sh14',
    message: 'SEA-9914-SAM temperature sensor offline in Indian Ocean for 2 hours',
    timestamp: new Date(Date.now() - 5400000),
    acknowledged: true,
  },
  {
    id: 'a6',
    type: 'TEMPERATURE_EXCURSION',
    severity: 'INFO',
    shipmentId: 'sh17',
    message: 'TRK-2217-INT temp at 35C in New Mexico desert -- within tolerance',
    timestamp: new Date(Date.now() - 1200000),
    acknowledged: false,
  },
  {
    id: 'a7',
    type: 'ROUTE_DEVIATION',
    severity: 'WARNING',
    shipmentId: 'sh2',
    message: 'SEA-4410-SAM drifted 18nm north of assigned lane near Hawaii',
    timestamp: new Date(Date.now() - 4200000),
    acknowledged: false,
  },
  {
    id: 'a8',
    type: 'ROUTE_DEVIATION',
    severity: 'CRITICAL',
    shipmentId: 'sh18',
    message: 'AIR-1818-SAM forced off corridor over Bering Sea -- storm avoidance',
    timestamp: new Date(Date.now() - 2700000),
    acknowledged: false,
  },
  {
    id: 'a9',
    type: 'DELAYED_ARRIVAL',
    severity: 'WARNING',
    shipmentId: 'sh4',
    message: 'AIR-3301-INT Atlantic headwinds -- ETA slipping by 4h',
    timestamp: new Date(Date.now() - 3000000),
    acknowledged: true,
  },
];

// Mock Journey Legs
export const mockJourneyLegs: JourneyLeg[] = [
  {
    id: 'leg1',
    type: 'AIR',
    carrier: 'FedEx Priority',
    trackingCode: 'AIR-7201-TSM',
    origin: 'TPE (Taipei Taoyuan)',
    destination: 'ANC (Anchorage)',
    status: 'COMPLETE',
    startTime: new Date(Date.now() - 86400000 * 2),
    endTime: new Date(Date.now() - 86400000 * 1.5),
    duration: 660,
  },
  {
    id: 'leg2',
    type: 'AIR',
    carrier: 'FedEx Priority',
    trackingCode: 'AIR-7201-TSM',
    origin: 'ANC (Anchorage)',
    destination: 'MEM (Memphis)',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 86400000 * 1.5),
    duration: 300,
  },
  {
    id: 'leg2b',
    type: 'AIR',
    carrier: 'FedEx Priority',
    trackingCode: 'AIR-7201-TSM',
    origin: 'MEM (Memphis)',
    destination: 'SFO (San Francisco)',
    status: 'SCHEDULED',
    duration: 270,
  },
  {
    id: 'leg3',
    type: 'LAND',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'AIR-7201-TSM',
    origin: 'SFO Cargo Terminal',
    destination: 'Apple Cupertino',
    status: 'SCHEDULED',
    duration: 90,
  },
  {
    id: 'leg4',
    type: 'SEA',
    carrier: 'Maersk Semiconductor',
    trackingCode: 'SEA-4410-SAM',
    origin: 'BUS (Busan)',
    destination: 'SHA (Shanghai)',
    status: 'COMPLETE',
    startTime: new Date(Date.now() - 86400000 * 6),
    endTime: new Date(Date.now() - 86400000 * 5.5),
    duration: 1440,
  },
  {
    id: 'leg4b',
    type: 'SEA',
    carrier: 'Maersk Semiconductor',
    trackingCode: 'SEA-4410-SAM',
    origin: 'SHA (Shanghai)',
    destination: 'NGB (Ningbo-Zhoushan)',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 86400000 * 5.4),
    duration: 960,
  },
  {
    id: 'leg4c',
    type: 'SEA',
    carrier: 'Maersk Semiconductor',
    trackingCode: 'SEA-4410-SAM',
    origin: 'NGB (Ningbo-Zhoushan)',
    destination: 'LAX (Los Angeles)',
    status: 'SCHEDULED',
    duration: 7200,
  },
  {
    id: 'leg5',
    type: 'LAND',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'SEA-4410-SAM',
    origin: 'Port of LA',
    destination: 'Qualcomm San Diego',
    status: 'SCHEDULED',
    duration: 180,
  },
  {
    id: 'leg6',
    type: 'AIR',
    carrier: 'FedEx Priority',
    trackingCode: 'AIR-9902-TSM',
    origin: 'KHH (Kaohsiung)',
    destination: 'ANC (Anchorage)',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 86400000 * 1.2),
    duration: 540,
  },
  {
    id: 'leg7',
    type: 'AIR',
    carrier: 'FedEx Priority',
    trackingCode: 'AIR-9902-TSM',
    origin: 'ANC (Anchorage)',
    destination: 'SJC (San Jose)',
    status: 'SCHEDULED',
    duration: 360,
  },
  {
    id: 'leg8',
    type: 'AIR',
    carrier: 'DHL Express',
    trackingCode: 'AIR-3301-INT',
    origin: 'DUB (Dublin)',
    destination: 'JFK (New York)',
    status: 'COMPLETE',
    startTime: new Date(Date.now() - 86400000 * 2.1),
    endTime: new Date(Date.now() - 86400000 * 1.6),
    duration: 420,
  },
  {
    id: 'leg9',
    type: 'AIR',
    carrier: 'DHL Express',
    trackingCode: 'AIR-3301-INT',
    origin: 'JFK (New York)',
    destination: 'PHX (Phoenix)',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 86400000 * 1.5),
    duration: 330,
  },
  {
    id: 'leg10',
    type: 'LAND',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'TRK-1105-INF',
    origin: 'Dresden',
    destination: 'Nuremberg',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 3600000 * 6),
    duration: 240,
  },
  {
    id: 'leg11',
    type: 'LAND',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'TRK-1105-INF',
    origin: 'Nuremberg',
    destination: 'Reutlingen',
    status: 'SCHEDULED',
    duration: 200,
  },
  {
    id: 'leg12',
    type: 'SEA',
    carrier: 'Evergreen Marine',
    trackingCode: 'SEA-6602-GFS',
    origin: 'SIN (Singapore)',
    destination: 'SZX (Shenzhen)',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 86400000 * 4),
    duration: 2880,
  },
  {
    id: 'leg12b',
    type: 'SEA',
    carrier: 'Evergreen Marine',
    trackingCode: 'SEA-6602-GFS',
    origin: 'SZX (Shenzhen)',
    destination: 'CAN (Guangzhou)',
    status: 'SCHEDULED',
    duration: 720,
  },
  {
    id: 'leg12c',
    type: 'SEA',
    carrier: 'Evergreen Marine',
    trackingCode: 'SEA-6602-GFS',
    origin: 'CAN (Guangzhou)',
    destination: 'SHA (Shanghai)',
    status: 'SCHEDULED',
    duration: 1440,
  },
  {
    id: 'leg13',
    type: 'LAND',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'SEA-6602-GFS',
    origin: 'Shanghai Port',
    destination: 'Beijing',
    status: 'SCHEDULED',
    duration: 420,
  },
  {
    id: 'leg14',
    type: 'AIR',
    carrier: 'DHL Express',
    trackingCode: 'AIR-8801-INT',
    origin: 'AMS (Amsterdam)',
    destination: 'HKG (Hong Kong)',
    status: 'SCHEDULED',
    duration: 720,
  },
  {
    id: 'leg15',
    type: 'AIR',
    carrier: 'DHL Express',
    trackingCode: 'AIR-8801-INT',
    origin: 'HKG (Hong Kong)',
    destination: 'TPE (Taipei)',
    status: 'SCHEDULED',
    duration: 120,
  },
  {
    id: 'leg16',
    type: 'AIR',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'AIR-2205-TSM',
    origin: 'TPE (Taipei Taoyuan)',
    destination: 'SJC (San Jose)',
    status: 'COMPLETE',
    startTime: new Date(Date.now() - 86400000 * 2),
    endTime: new Date(Date.now() - 86400000 * 1),
    duration: 960,
  },
  {
    id: 'leg17',
    type: 'LAND',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'TRN-5501-SAM',
    origin: 'Busan',
    destination: 'Munich',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 3600000 * 4),
    duration: 180,
  },
  {
    id: 'leg18',
    type: 'LAND',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'TRN-5501-SAM',
    origin: 'Munich',
    destination: 'Reutlingen',
    status: 'SCHEDULED',
    duration: 220,
  },
  {
    id: 'leg19',
    type: 'AIR',
    carrier: 'DHL Express',
    trackingCode: 'AIR-1102-INT',
    origin: 'TLV (Tel Aviv)',
    destination: 'JFK (New York)',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 86400000 * 1.1),
    duration: 600,
  },
  {
    id: 'leg20',
    type: 'AIR',
    carrier: 'DHL Express',
    trackingCode: 'AIR-1102-INT',
    origin: 'JFK (New York)',
    destination: 'PDX (Portland)',
    status: 'SCHEDULED',
    duration: 360,
  },
  {
    id: 'leg21',
    type: 'AIR',
    carrier: 'DHL Express',
    trackingCode: 'AIR-0011-INT',
    origin: 'PHX (Phoenix)',
    destination: 'MEM (Memphis)',
    status: 'COMPLETE',
    startTime: new Date(Date.now() - 3600000 * 12),
    endTime: new Date(Date.now() - 3600000 * 10),
    duration: 180,
  },
  {
    id: 'leg21b',
    type: 'AIR',
    carrier: 'DHL Express',
    trackingCode: 'AIR-0011-INT',
    origin: 'MEM (Memphis)',
    destination: 'ANC (Anchorage)',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 3600000 * 9),
    duration: 420,
  },
  {
    id: 'leg21c',
    type: 'AIR',
    carrier: 'DHL Express',
    trackingCode: 'AIR-0011-INT',
    origin: 'ANC (Anchorage)',
    destination: 'TPE (Taipei Taoyuan)',
    status: 'SCHEDULED',
    duration: 560,
  },
  {
    id: 'leg21d',
    type: 'LAND',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'AIR-0011-INT',
    origin: 'TPE Cargo Terminal',
    destination: 'MediaTek Hsinchu',
    status: 'SCHEDULED',
    duration: 90,
  },
  {
    id: 'leg22',
    type: 'LAND',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'TRK-3312-GFM',
    origin: 'Malta',
    destination: 'Harrisburg',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 3600000 * 8),
    duration: 360,
  },
  {
    id: 'leg23',
    type: 'LAND',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'TRK-3312-GFM',
    origin: 'Harrisburg',
    destination: 'Detroit',
    status: 'SCHEDULED',
    duration: 150,
  },
  {
    id: 'leg24',
    type: 'AIR',
    carrier: 'FedEx Priority',
    trackingCode: 'AIR-7713-SAM',
    origin: 'ICN (Incheon)',
    destination: 'SEA (Seattle)',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 3600000 * 10),
    duration: 600,
  },
  {
    id: 'leg25',
    type: 'LAND',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'AIR-7713-SAM',
    origin: 'SEA Cargo',
    destination: 'Mountain View',
    status: 'SCHEDULED',
    duration: 180,
  },
  {
    id: 'leg26',
    type: 'SEA',
    carrier: 'Maersk Semiconductor',
    trackingCode: 'SEA-9914-SAM',
    origin: 'RTM (Rotterdam)',
    destination: 'SIN (Singapore)',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 86400000 * 10),
    duration: 14400,
  },
  {
    id: 'leg27',
    type: 'SEA',
    carrier: 'Maersk Semiconductor',
    trackingCode: 'SEA-9914-SAM',
    origin: 'SIN (Singapore)',
    destination: 'BUS (Busan)',
    status: 'SCHEDULED',
    duration: 7200,
  },
  {
    id: 'leg28',
    type: 'AIR',
    carrier: 'FedEx Priority',
    trackingCode: 'AIR-6615-TSM',
    origin: 'TPE (Taipei Taoyuan)',
    destination: 'PVG (Shanghai Pudong)',
    status: 'COMPLETE',
    startTime: new Date(Date.now() - 86400000 * 2),
    endTime: new Date(Date.now() - 86400000 * 1.9),
    duration: 150,
  },
  {
    id: 'leg29',
    type: 'AIR',
    carrier: 'FedEx Priority',
    trackingCode: 'AIR-6615-TSM',
    origin: 'PVG (Shanghai Pudong)',
    destination: 'ANC (Anchorage)',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 86400000 * 1.2),
    duration: 600,
  },
  {
    id: 'leg29b',
    type: 'AIR',
    carrier: 'FedEx Priority',
    trackingCode: 'AIR-6615-TSM',
    origin: 'ANC (Anchorage)',
    destination: 'LAX (Los Angeles)',
    status: 'SCHEDULED',
    duration: 330,
  },
  {
    id: 'leg30',
    type: 'LAND',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'AIR-6615-TSM',
    origin: 'LAX Cargo',
    destination: 'Qualcomm San Diego',
    status: 'SCHEDULED',
    duration: 120,
  },
  {
    id: 'leg31',
    type: 'LAND',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'TRN-4416-INF',
    origin: 'Dresden',
    destination: 'Frankfurt',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 3600000 * 5),
    duration: 300,
  },
  {
    id: 'leg32',
    type: 'LAND',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'TRN-4416-INF',
    origin: 'Frankfurt',
    destination: 'Eindhoven',
    status: 'SCHEDULED',
    duration: 240,
  },
  {
    id: 'leg33',
    type: 'LAND',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'TRK-2217-INT',
    origin: 'Phoenix',
    destination: 'El Paso',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 3600000 * 4),
    duration: 300,
  },
  {
    id: 'leg34',
    type: 'LAND',
    carrier: 'XPO Secure Logistics',
    trackingCode: 'TRK-2217-INT',
    origin: 'El Paso',
    destination: 'Austin',
    status: 'SCHEDULED',
    duration: 360,
  },
  {
    id: 'leg35',
    type: 'AIR',
    carrier: 'DHL Express',
    trackingCode: 'AIR-1818-SAM',
    origin: 'ICN (Incheon)',
    destination: 'ANC (Anchorage)',
    status: 'IN_TRANSIT',
    startTime: new Date(Date.now() - 3600000 * 9),
    duration: 560,
  },
  {
    id: 'leg36',
    type: 'AIR',
    carrier: 'DHL Express',
    trackingCode: 'AIR-1818-SAM',
    origin: 'ANC (Anchorage)',
    destination: 'SEA (Seattle)',
    status: 'SCHEDULED',
    duration: 210,
  },
];

// Mock Ontology Graph Data
export const mockOntologyNodes: OntologyNode[] = [
  {
    id: 'factory1',
    type: 'factory',
    data: {
      label: 'TSMC Fab 18 Hsinchu',
      properties: { location: 'Taiwan', capacity: '100k wafers/month' }
    },
    position: { x: 100, y: 100 },
  },
  {
    id: 'wafer1',
    type: 'waferLot',
    data: {
      label: 'LOT-3NM-A001',
      properties: { process: '3nm', value: '$2.5M', quantity: 500 }
    },
    position: { x: 300, y: 100 },
  },
  {
    id: 'shipment1',
    type: 'shipment',
    data: {
      label: 'AIR-7201-TSM',
      properties: { status: 'In Transit', eta: '2 days' }
    },
    position: { x: 500, y: 100 },
  },
  {
    id: 'carrier1',
    type: 'carrier',
    data: {
      label: 'FedEx Priority',
      properties: { type: 'Air', rating: 4.8 }
    },
    position: { x: 700, y: 50 },
  },
  {
    id: 'route1',
    type: 'route',
    data: {
      label: 'TPE -> ANC -> SFO -> Apple Cupertino',
      properties: { distance: '12,500 km', duration: '5 days' }
    },
    position: { x: 700, y: 150 },
  },
  {
    id: 'sensor1',
    type: 'sensor',
    data: {
      label: 'SHK-7201',
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
