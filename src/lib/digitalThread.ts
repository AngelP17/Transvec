import type { YieldOpsJob } from './supabase';
import type { ShipmentDossier } from '../types';

const CARRIER_RULES: Record<string, { mode: ShipmentDossier['mode']; carrier: string; route: string; origin: string; destination: string; }> = {
  Tesla: { mode: 'SEA', carrier: 'LOGI-PRIME', route: 'SEA-FREIGHT', origin: 'TPE', destination: 'LAX' },
  Apple: { mode: 'AIR', carrier: 'LOGI-AIR', route: 'AIR-FREIGHT', origin: 'TPE', destination: 'SJC' },
  Samsung: { mode: 'AIR', carrier: 'LOGI-AIR', route: 'AIR-FREIGHT', origin: 'ICN', destination: 'AUS' },
  NVIDIA: { mode: 'AIR', carrier: 'LOGI-AIR', route: 'AIR-FREIGHT', origin: 'TPE', destination: 'SJC' },
  AMD: { mode: 'SEA', carrier: 'LOGI-PRIME', route: 'SEA-FREIGHT', origin: 'KAO', destination: 'LAX' },
};

const CLIENT_ALIAS: Record<string, string> = {
  Tesla: 'CLIENT-OMEGA',
  Apple: 'CLIENT-ALPHA',
  Samsung: 'CLIENT-GOLF',
  NVIDIA: 'CLIENT-BRAVO',
  AMD: 'CLIENT-CHARLIE',
  Intel: 'CLIENT-DELTA',
};

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

export function buildShipmentDossier(job: YieldOpsJob, contents: string, statusLabel: string): ShipmentDossier {
  const rule = CARRIER_RULES[job.customer_tag] || {
    mode: 'TRUCK' as const,
    carrier: 'SCHNEIDER',
    route: 'LAND-SECURE',
    origin: 'PHX',
    destination: 'DEN',
  };

  const seed = hashString(job.job_id);
  const operator = OPERATORS[seed % OPERATORS.length];
  const vehicle = VEHICLES[seed % VEHICLES.length];

  return {
    linkedJobId: job.job_name,
    client: CLIENT_ALIAS[job.customer_tag] || job.customer_tag || 'CLIENT-UNKNOWN',
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
