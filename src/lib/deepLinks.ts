import type { Shipment } from '../types';

const DEFAULT_TRANSVEC_BASE_URL = 'https://transvec.vercel.app';
const DEFAULT_YIELDOPS_BASE_URL = 'http://localhost:3000';

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, '');
}

function resolveBaseUrl(preferred: string | undefined, fallback: string) {
  const raw = preferred?.trim() || fallback;
  return stripTrailingSlash(raw);
}

export function buildYieldOpsDeepLink(shipment: Shipment) {
  const baseUrl = resolveBaseUrl(import.meta.env.VITE_YIELDOPS_BASE_URL, DEFAULT_YIELDOPS_BASE_URL);
  const params = new URLSearchParams({
    trackingId: shipment.trackingCode,
    status: shipment.status,
    source: 'transvec',
  });

  if (shipment.dossier?.linkedJobId) {
    params.set('jobId', shipment.dossier.linkedJobId);
  }

  return `${baseUrl}/?${params.toString()}`;
}

export function buildTransvecDeepLink(trackingId: string, status?: string) {
  const baseUrl = resolveBaseUrl(import.meta.env.VITE_TRANSVEC_BASE_URL, DEFAULT_TRANSVEC_BASE_URL);
  const params = new URLSearchParams({
    trackingId,
    source: 'yieldops',
  });
  if (status) {
    params.set('status', status);
  }
  return `${baseUrl}/?${params.toString()}`;
}

