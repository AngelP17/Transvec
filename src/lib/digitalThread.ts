import type { YieldOpsJob } from './supabase';
import type { ShipmentDossier } from '../types';

const CARRIER_RULES: Array<{ mode: ShipmentDossier['mode']; carrier: string; route: string; origin: string; destination: string; }> = [
  { mode: 'SEA', carrier: 'LOGI-PRIME', route: 'SEA-FREIGHT', origin: 'TPE', destination: 'LAX' },
  { mode: 'AIR', carrier: 'LOGI-AIR', route: 'AIR-FREIGHT', origin: 'TPE', destination: 'SJC' },
  { mode: 'AIR', carrier: 'LOGI-AIR', route: 'AIR-FREIGHT', origin: 'ICN', destination: 'AUS' },
  { mode: 'SEA', carrier: 'LOGI-PRIME', route: 'SEA-FREIGHT', origin: 'KAO', destination: 'LAX' },
  { mode: 'TRUCK', carrier: 'SECURE-LOGIX', route: 'LAND-SECURE', origin: 'PHX', destination: 'DEN' },
  { mode: 'TRAIN', carrier: 'IRONLINE', route: 'RAIL-SECURE', origin: 'CHI', destination: 'NYC' },
];

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

const OPERATORS = [
  { id: 'OP-9921', company: 'LOGISTICS-PRIME-LLC', role: 'L5_HAZMAT_DRIVER', rating: 'A+' },
  { id: 'OP-1187', company: 'AURORA-TRANSIT', role: 'HAZMAT_ESCORT', rating: 'A' },
  { id: 'OP-7742', company: 'ION-FREIGHT', role: 'SECURE_OPERATOR', rating: 'A-' },
];

const VEHICLES = [
  { id: 'UNIT-TRK-882', model: 'AUTONOMOUS-RIG-V4', maintenance: 'CLEAR' },
  { id: 'UNIT-TRN-441', model: 'CONTAINMENT-RAIL-X2', maintenance: 'DUE' },
  { id: 'UNIT-AIR-109', model: 'CARGO-AIRFRAME-9', maintenance: 'CLEAR' },
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
  if (!tag) return 'CLIENT-UNKNOWN';
  const index = hashString(tag) % CLIENT_CODES.length;
  return CLIENT_CODES[index] || 'CLIENT-UNKNOWN';
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
