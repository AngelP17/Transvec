import type { YieldOpsJob } from './supabase';
import type { ShipmentDossier } from '../types';

const CARRIER_RULES: Array<{ mode: ShipmentDossier['mode']; carrier: string; route: string; origin: string; destination: string; }> = [
  { mode: 'SEA', carrier: 'Maersk Semiconductor', route: 'PACIFIC-EXPRESS', origin: 'KAO', destination: 'LAX' },
  { mode: 'AIR', carrier: 'FedEx Priority', route: 'TRANS-PACIFIC-AIR', origin: 'TPE', destination: 'SFO' },
  { mode: 'AIR', carrier: 'UPS Express Critical', route: 'KOREA-US-AIR', origin: 'ICN', destination: 'AUS' },
  { mode: 'SEA', carrier: 'Evergreen Marine', route: 'ASIA-EUROPE-SEA', origin: 'PVG', destination: 'RTM' },
  { mode: 'TRUCK', carrier: 'XPO Secure Logistics', route: 'US-SOUTHWEST-LAND', origin: 'PHX', destination: 'SFO' },
  { mode: 'TRAIN', carrier: 'DB Cargo Europe', route: 'EUROPE-RAIL', origin: 'AMS', destination: 'FRA' },
  { mode: 'AIR', carrier: 'DHL Express', route: 'EUROPE-US-AIR', origin: 'FRA', destination: 'JFK' },
  { mode: 'SEA', carrier: 'Yang Ming Marine', route: 'TAIWAN-US-SEA', origin: 'KAO', destination: 'LAX' },
];

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

const OPERATORS = [
  { id: 'OPS-4821', company: 'FedEx Custom Critical', role: 'Senior Logistics Operator', rating: 'A+' },
  { id: 'OPS-2294', company: 'DHL Semiconductor Services', role: 'Hazmat Transport Lead', rating: 'A' },
  { id: 'OPS-7153', company: 'XPO Secure Logistics', role: 'Cleanroom Freight Specialist', rating: 'A-' },
];

const VEHICLES = [
  { id: 'FDX-777F-882', model: 'Boeing 777F Freighter', maintenance: 'CLEAR' },
  { id: 'MSK-G-441', model: 'Maersk G-Class Container', maintenance: 'DUE' },
  { id: 'XPO-SEC-109', model: 'Volvo FH16 Climate-Controlled', maintenance: 'CLEAR' },
];

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function sanitizeClient(tag: string | null) {
  if (!tag) return 'Unknown Client';
  const index = hashString(tag) % CLIENT_CODES.length;
  return CLIENT_CODES[index] || 'Unknown Client';
}

export function buildShipmentDossier(job: YieldOpsJob, contents: string, statusLabel: string): ShipmentDossier {
  const ruleIndex = job.customer_tag ? hashString(job.customer_tag) % CARRIER_RULES.length : 0;
  const rule = CARRIER_RULES[ruleIndex] || CARRIER_RULES[0];

  const seed = hashString(job.job_id);
  const operator = OPERATORS[seed % OPERATORS.length];
  const vehicle = VEHICLES[seed % VEHICLES.length];

  return {
    linkedJobId: job.job_name,
    client: sanitizeClient(job.customer_tag),
    contents,
    carrier: rule.carrier,
    route: `${rule.route} (${rule.origin}→${rule.destination})`,
    mode: rule.mode,
    operator,
    vehicle,
    statusLabel,
    chainOfCustody: [
      { time: '08:00', event: 'PICKUP_SCAN', actor: 'DISPATCH', status: 'ok' },
      { time: '09:15', event: 'HANDOFF_BROKER', actor: rule.carrier, status: 'ok' },
      { time: '10:30', event: 'TELEMETRY_CHECK', actor: 'SENSOR_NET', status: statusLabel.toLowerCase().includes('critical') ? 'warn' : 'ok' },
    ],
    records: [
      { id: 'BOL-7732', name: 'BILL_OF_LADING.pdf', status: 'VERIFIED' },
      { id: 'CUST-992', name: 'CUSTOMS_DEC_V2.pdf', status: 'PENDING' },
    ],
    flags: statusLabel.includes('Critical') ? ['SENSOR ALERT'] : [],
  };
}
