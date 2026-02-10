import type { Shipment } from '../types';

const DEFAULT_TRANSVEC_BASE_URL = 'https://transvec.vercel.app';
const DEFAULT_YIELDOPS_BASE_URL = 'https://yield-ops-dashboard.vercel.app';

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, '');
}

function resolveBaseUrl(preferred: string | undefined, fallback: string) {
  const raw = preferred?.trim() || fallback;
  return stripTrailingSlash(raw);
}

export function buildYieldOpsDeepLink(shipment: Shipment) {
  const baseUrl = resolveBaseUrl(import.meta.env.VITE_YIELDOPS_BASE_URL, DEFAULT_YIELDOPS_BASE_URL);
  const params = new URLSearchParams();
  params.set('trackingId', shipment.trackingCode);
  params.set('trackingCode', shipment.trackingCode);
  params.set('q', shipment.trackingCode);
  params.set('status', shipment.status);
  params.set('source', 'transvec');

  if (shipment.dossier?.linkedJobId) {
    params.set('jobId', shipment.dossier.linkedJobId);
    params.set('search', shipment.dossier.linkedJobId);
  } else if (shipment.dossier?.client) {
    params.set('search', shipment.dossier.client);
  }
  if (shipment.dossier?.client) {
    params.set('client', shipment.dossier.client);
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
