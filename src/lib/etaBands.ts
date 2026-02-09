import type { Shipment } from '../types';

export interface EtaBand {
  lowHours: number;
  midHours: number;
  highHours: number;
  confidence: number;
}

export function computeEtaBand(shipment: Shipment): EtaBand {
  const now = Date.now();
  const etaMs = shipment.eta ? shipment.eta.getTime() - now : 1000 * 60 * 60 * 18;
  const midHours = Math.max(2, Math.round(etaMs / (1000 * 60 * 60)));
  const variance = shipment.status === 'CRITICAL' ? 0.4 : shipment.status === 'DELAYED' ? 0.3 : 0.2;
  const lowHours = Math.max(1, Math.round(midHours * (1 - variance)));
  const highHours = Math.max(lowHours + 1, Math.round(midHours * (1 + variance)));
  const confidence = shipment.status === 'CRITICAL' ? 0.55 : shipment.status === 'DELAYED' ? 0.65 : 0.8;

  return { lowHours, midHours, highHours, confidence };
}
