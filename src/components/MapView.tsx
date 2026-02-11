/* @refresh reset */
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  IconAdjustments,
  IconAlertTriangle,
  IconArrowLeft,
  IconBell,
  IconChevronDown,
  IconCpu,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconMenu2,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
  IconStack2,
  IconTool,
  IconUserCircle,
  IconX,
} from '@tabler/icons-react';
import type { Shipment, Alert } from '../types';
import type { FabHealthSummary } from '../lib/dataAdapter';
import OpsIntelPanel from './OpsIntelPanel';
import AssetDossierPanel from './AssetDossierPanel';
import CarrierPerformanceIndex from './CarrierPerformanceIndex';
import MissionTimelinePanel from './MissionTimelinePanel';
import { useGeofences } from '../hooks/useGeofences';
import {
  computeBreachPoints,
  buildRouteLineFeatures,
  buildKnownCustomerGeofences,
  buildRiskZoneGeofences,
  computeGeoRiskScore,
} from '../lib/geofences';

interface MapViewProps {
  shipments: Shipment[];
  selectedShipment: Shipment | null;
  onShipmentSelect: (shipment: Shipment) => void;
  alerts: Alert[];
  liveData: boolean;
  shipmentCount: number;
  alertCount: number;
  fabHealth: FabHealthSummary | null;
  showGeofences?: boolean;
  showRoutes?: boolean;
  showBreaches?: boolean;
  focusMode: boolean;
  onFocusModeChange: (next: boolean) => void;
  onOpenAlertsTab: () => void;
  onOpenOperatorPanel: () => void;
  onOpenSettingsPanel: () => void;
  onRefresh: () => void;
  onToggleOverlays: () => void;
  onExport: () => void;
}

type MapStyleId = 'darkmatter' | 'satellite' | 'streets';

const MAP_STYLE_OPTIONS: Array<{ id: MapStyleId; label: string }> = [
  { id: 'darkmatter', label: 'Darkmatter' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'streets', label: 'Streets' },
];

const TILE_CONFIGS: Record<MapStyleId, { tiles: string[]; tileSize: number; attribution: string; bgColor: string }> = {
  darkmatter: {
    tiles: [
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    ],
    tileSize: 256,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    bgColor: '#0a0e12',
  },
  satellite: {
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    tileSize: 256,
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    bgColor: '#091018',
  },
  streets: {
    tiles: [
      'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    ],
    tileSize: 256,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    bgColor: '#e8ecf1',
  },
};

function buildBaseStyle(mode: MapStyleId): StyleSpecification {
  const cfg = TILE_CONFIGS[mode];
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: cfg.tiles,
        tileSize: cfg.tileSize,
        attribution: cfg.attribution,
      },
    },
    layers: [
      { id: 'basemap-bg', type: 'background', paint: { 'background-color': cfg.bgColor } },
      { id: 'basemap-tiles', type: 'raster', source: 'basemap' },
    ],
  };
}

const DEFAULT_YIELDOPS_BASE_URL = 'https://yield-ops-dashboard.vercel.app';
const MAP_STYLE_STORAGE_KEY = 'transvec:map-style:v1';

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, '');
}

function projectPoint(
  point: { lat: number; lng: number },
  width: number,
  height: number
) {
  const x = ((point.lng + 180) / 360) * width;
  const y = ((90 - point.lat) / 180) * height;
  return { x, y };
}

function buildRoutePreviewImage(
  shipment: Shipment,
  options?: { width?: number; height?: number; bright?: boolean }
) {
  const width = Math.max(180, Math.round(options?.width ?? 560));
  const height = Math.max(90, Math.round(options?.height ?? 180));
  const bright = options?.bright ?? false;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const bg = ctx.createLinearGradient(0, 0, width, height);
  if (bright) {
    bg.addColorStop(0, '#dbe7f3');
    bg.addColorStop(1, '#8ea2b5');
  } else {
    bg.addColorStop(0, '#0d1119');
    bg.addColorStop(1, '#04070b');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = bright ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += Math.round(width / 8)) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += Math.round(height / 4)) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const start = projectPoint(shipment.origin.location, width, height);
  const end = projectPoint(shipment.destination.location, width, height);
  const current = projectPoint(shipment.currentLocation || shipment.origin.location, width, height);

  ctx.strokeStyle = bright ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = bright ? '#111827' : '#d1d5db';
  ctx.beginPath();
  ctx.arc(start.x, start.y, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(end.x, end.y, 3, 0, Math.PI * 2);
  ctx.fill();

  const markerColor = statusColors[shipment.status] || '#e5e7eb';
  ctx.fillStyle = markerColor;
  ctx.beginPath();
  ctx.arc(current.x, current.y, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = bright ? '#ffffff' : '#111827';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(current.x, current.y, 7, 0, Math.PI * 2);
  ctx.stroke();

  return canvas.toDataURL('image/jpeg', 0.85);
}

// Status colors
const statusColors: Record<string, string> = {
  SCHEDULED: '#8a9ba8',
  IN_TRANSIT: '#c3c7ce',
  DELIVERED: '#0F9960',
  CRITICAL: '#FF4D4F',
  DELAYED: '#FFB000',
  HELD_CUSTOMS: '#FFB000',
};

function HealthDot({ status }: { status: 'ok' | 'warn' | 'critical' }) {
  const color = status === 'ok' ? 'bg-success' : status === 'warn' ? 'bg-warning' : 'bg-critical';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />;
}

function parseCoordinates(input: string) {
  const match = input.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
  if (Math.abs(first) > 90 && Math.abs(second) <= 90) {
    return { lat: second, lng: first };
  }
  return { lat: first, lng: second };
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const haversine =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

const cinematicEasing = (t: number) => 1 - Math.pow(1 - t, 3);

export default function MapView({
  shipments,
  selectedShipment,
  onShipmentSelect,
  alerts,
  liveData,
  shipmentCount,
  alertCount,
  fabHealth,
  showGeofences = true,
  showRoutes = true,
  showBreaches = true,
  focusMode,
  onFocusModeChange,
  onOpenAlertsTab,
  onOpenOperatorPanel,
  onOpenSettingsPanel,
  onRefresh,
  onToggleOverlays,
  onExport,
}: MapViewProps) {
  const yieldOpsHref = `${stripTrailingSlash(import.meta.env.VITE_YIELDOPS_BASE_URL || DEFAULT_YIELDOPS_BASE_URL)}/?source=transvec`;
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const clickPopup = useRef<maplibregl.Popup | null>(null);
  const mapMotionFrame = useRef<number | null>(null);
  const liveCaptureInterval = useRef<number | null>(null);
  const hasAutoFramedRef = useRef(false);
  const appliedStyleIdRef = useRef<MapStyleId | null>(null);
  const styleEpochRef = useRef(0);
  const styleReadyEpochRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleReady, setIsStyleReady] = useState(false);
  const [styleVersion, setStyleVersion] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapStyleId, setMapStyleId] = useState<MapStyleId>(() => {
    if (typeof window === 'undefined') return 'darkmatter';
    const stored = window.localStorage.getItem(MAP_STYLE_STORAGE_KEY);
    if (stored === 'darkmatter' || stored === 'satellite' || stored === 'streets') {
      return stored;
    }
    return 'darkmatter';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [isRightRailOpen, setIsRightRailOpen] = useState(true);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [liveCaptureImage, setLiveCaptureImage] = useState<string | null>(null);
  const [isOperatorMenuOpen, setIsOperatorMenuOpen] = useState(false);
  const operatorMenuRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  }, []);
  const toggleFocusMode = useCallback(() => onFocusModeChange(!focusMode), [focusMode, onFocusModeChange]);
  const normalizedSearchTerm = normalizeSearch(searchTerm);

  const filteredShipments = useMemo(() => {
    if (!normalizedSearchTerm) return shipments;
    return shipments.filter((shipment) => {
      const haystack = [
        shipment.trackingCode,
        shipment.status,
        shipment.statusLabel,
        shipment.carrierId,
        shipment.origin.name,
        shipment.destination.name,
        shipment.dossier?.client,
        shipment.dossier?.contents,
        shipment.dossier?.operator?.company,
        shipment.dossier?.vehicle?.model,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearchTerm);
    });
  }, [shipments, normalizedSearchTerm]);

  const effectiveShipments = normalizedSearchTerm ? filteredShipments : shipments;
  const filteredAlerts = useMemo(() => {
    if (!normalizedSearchTerm) return alerts;
    const shipmentIds = new Set(filteredShipments.map((shipment) => shipment.id));
    return alerts.filter((alert) => shipmentIds.has(alert.shipmentId));
  }, [alerts, filteredShipments, normalizedSearchTerm]);
  const effectiveAlerts = normalizedSearchTerm ? filteredAlerts : alerts;

  const { geofences } = useGeofences(effectiveShipments);

  const styleDefinition = useMemo(() => {
    return buildBaseStyle(mapStyleId);
  }, [mapStyleId]);

  const setMapStyle = useCallback((nextStyle: MapStyleId, announce = false) => {
    if (nextStyle === mapStyleId) return;
    setMapStyleId(nextStyle);
    if (announce) {
      const label = MAP_STYLE_OPTIONS.find((option) => option.id === nextStyle)?.label || nextStyle;
      showToast(`Switched to ${label}`);
    }
  }, [mapStyleId, showToast]);

  const rotateMapBy = useCallback((delta: number) => {
    if (!map.current) return;
    const nextBearing = map.current.getBearing() + delta;
    map.current.rotateTo(nextBearing, {
      duration: 450,
      easing: cinematicEasing,
      essential: true,
    });
  }, []);

  const resetMapOrientation = useCallback(() => {
    if (!map.current) return;
    map.current.easeTo({
      bearing: 0,
      pitch: 45,
      duration: 480,
      easing: cinematicEasing,
      essential: true,
    });
  }, []);

  const handleShareOps = useCallback(async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(window.location.href);
      showToast('URL copied to clipboard');
    } catch {
      showToast('Unable to copy URL on this browser');
    }
  }, [showToast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MAP_STYLE_STORAGE_KEY, mapStyleId);
  }, [mapStyleId]);

  const markStyleReady = useCallback(() => {
    if (!map.current) return;
    const style = map.current.getStyle();
    if (!style || !Array.isArray(style.layers)) return;
    const currentEpoch = styleEpochRef.current;
    if (styleReadyEpochRef.current === currentEpoch) {
      setIsStyleReady(true);
      return;
    }
    styleReadyEpochRef.current = currentEpoch;
    setIsStyleReady(true);
    setStyleVersion((current) => current + 1);
  }, []);

  const deviationGeoJson = useMemo(() => {
    const features = effectiveAlerts
      .filter((alert) => alert.type === 'ROUTE_DEVIATION' || alert.type === 'GEOFENCE_BREACH')
      .map((alert) => {
        const shipment = effectiveShipments.find((item) => item.id === alert.shipmentId);
        if (!shipment?.currentLocation) return null;
        return {
          type: 'Feature',
          properties: {
            severity: alert.severity,
            shipmentId: shipment.id,
            trackingCode: shipment.trackingCode,
          },
          geometry: {
            type: 'Point',
            coordinates: [shipment.currentLocation.lng, shipment.currentLocation.lat],
          },
        };
      })
      .filter(Boolean);

    return {
      type: 'FeatureCollection',
      features,
    } as GeoJSON.FeatureCollection;
  }, [effectiveAlerts, effectiveShipments]);

  const breachGeoJson = useMemo(() => {
    const features = computeBreachPoints(effectiveShipments, geofences);
    return {
      type: 'FeatureCollection',
      features,
    } as GeoJSON.FeatureCollection;
  }, [effectiveShipments, geofences]);

  const routeGeoJson = useMemo(() => buildRouteLineFeatures(effectiveShipments), [effectiveShipments]);
  const knownCustomerGeoJson = useMemo(() => {
    const geos = buildKnownCustomerGeofences(effectiveShipments);
    if (!geos) {
      return { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection;
    }
    return geos as GeoJSON.FeatureCollection;
  }, [effectiveShipments]);
  const riskZoneGeoJson = useMemo(() => buildRiskZoneGeofences(), []);

  const shipmentsWithLocation = useMemo(
    () => effectiveShipments.filter((shipment) => Boolean(shipment.currentLocation)),
    [effectiveShipments]
  );
  const focusShipment = useMemo(
    () => {
      if (selectedShipment) {
        const match = shipmentsWithLocation.find((shipment) => shipment.id === selectedShipment.id);
        if (match) return selectedShipment;
      }
      return shipmentsWithLocation[0] || null;
    },
    [selectedShipment, shipmentsWithLocation]
  );
  const focusRisk = useMemo(() => computeGeoRiskScore(focusShipment?.currentLocation), [focusShipment]);
  const visibleSelectedShipment = useMemo(() => {
    if (!selectedShipment) return null;
    if (!normalizedSearchTerm) return selectedShipment;
    return filteredShipments.find((shipment) => shipment.id === selectedShipment.id) || null;
  }, [selectedShipment, normalizedSearchTerm, filteredShipments]);

  const locationMatches = useMemo(() => {
    const query = normalizeSearch(locationQuery);
    if (!query) return [];
    return shipmentsWithLocation.filter((shipment) => {
      const haystack = [
        shipment.origin.name,
        shipment.destination.name,
        shipment.trackingCode,
        shipment.statusLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [locationQuery, shipmentsWithLocation]);

  const flyToLocation = useCallback((lng: number, lat: number, zoom = 5) => {
    if (!map.current) return;
    map.current.flyTo({
      center: [lng, lat],
      zoom,
      pitch: 45,
      bearing: -20,
      speed: 0.9,
      curve: 1.4,
      duration: 1400,
      easing: cinematicEasing,
      essential: true,
    });
  }, []);

  const easeFocusToPoint = useCallback((lng: number, lat: number) => {
    if (!map.current) return;
    const currentZoom = map.current.getZoom();
    map.current.easeTo({
      center: [lng, lat],
      zoom: Math.max(currentZoom, 4.9),
      pitch: 45,
      bearing: -20,
      duration: 720,
      easing: cinematicEasing,
      essential: true,
    });
  }, []);

  const handleShipmentFocus = useCallback((shipment: Shipment) => {
    onShipmentSelect(shipment);
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && !focusMode) {
      setIsRightRailOpen(false);
    }
  }, [focusMode, onShipmentSelect]);

  const showShipmentPopup = useCallback((shipment: Shipment, lng: number, lat: number) => {
    if (!map.current) return;
    const telemetry = shipment.telemetry;
    const statusLabel = (shipment.statusLabel || shipment.status).replace(/_/g, ' ');

    if (!clickPopup.current) {
      clickPopup.current = new maplibregl.Popup({
        offset: 18,
        closeButton: false,
        closeOnMove: false,
        maxWidth: 'none',
      });
    }

    clickPopup.current
      .setLngLat([lng, lat])
      .setHTML(`
        <div style="font-family:'Instrument Sans',sans-serif;width:min(320px,calc(100vw - 64px));color:#e5e7eb">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
            <div style="font-weight:700;font-size:13px;letter-spacing:0.03em;max-width:65%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${shipment.trackingCode}</div>
            <div style="font-size:10px;padding:2px 8px;border:1px solid rgba(255,255,255,0.15);border-radius:999px;max-width:35%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${statusLabel}</div>
          </div>
          <div style="font-size:11px;color:#9aa3ad;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${shipment.origin.name} → ${shipment.destination.name}</div>
          <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:6px;border-radius:8px">Shock<br/><strong>${(telemetry.shock ?? 0).toFixed(2)} G</strong></div>
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:6px;border-radius:8px">Temp<br/><strong>${(telemetry.temperature ?? 0).toFixed(1)} °C</strong></div>
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:6px;border-radius:8px">Humidity<br/><strong>${Math.round(telemetry.humidity ?? 0)} %</strong></div>
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:6px;border-radius:8px">Vibration<br/><strong>${Math.round(telemetry.vibration ?? 0)} Hz</strong></div>
          </div>
        </div>
      `)
      .addTo(map.current);
  }, []);

  const handleLocationSubmit = useCallback((event: FormEvent) => {
    event.preventDefault();
    if (!locationQuery.trim()) return;
    const coords = parseCoordinates(locationQuery);
    if (coords) {
      flyToLocation(coords.lng, coords.lat, 9);
      return;
    }
    const match = locationMatches[0];
    if (match) {
      handleShipmentFocus(match);
    }
  }, [locationQuery, locationMatches, flyToLocation, handleShipmentFocus]);

  const resultShipments = useMemo(
    () => (normalizedSearchTerm ? filteredShipments : shipmentsWithLocation),
    [normalizedSearchTerm, filteredShipments, shipmentsWithLocation]
  );
  const displayedResults = useMemo(() => resultShipments.slice(0, 6), [resultShipments]);
  const isBrightPreview = mapStyleId !== 'darkmatter';
  const liveCaptureFallback = useMemo(() => {
    if (!focusShipment) return null;
    return buildRoutePreviewImage(focusShipment, { width: 720, height: 360, bright: isBrightPreview });
  }, [focusShipment, isBrightPreview, styleVersion]);

  const overlayPalette = useMemo(() => {
    const isSatellite = mapStyleId === 'satellite';
    const isStreets = mapStyleId === 'streets';
    const isBright = isSatellite || isStreets;
    return {
      isBright,
      geofenceFill: isBright ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.04)',
      geofenceLine: isBright ? '#111827' : '#a3b0bf',
      knownFill: isBright ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
      knownLine: isBright ? '#1f2937' : '#e5e7eb',
      riskFill: isBright ? 'rgba(255,77,79,0.2)' : 'rgba(255,77,79,0.12)',
      riskLine: isBright ? '#ff9a9a' : '#ff6b6b',
      routeOpacity: isBright ? 0.85 : 0.55,
      routeColors: {
        TRUCK: isBright ? '#111827' : '#cbd5e1',
        TRAIN: isBright ? '#1f2937' : '#a3b0bf',
        AIR: isBright ? '#0f172a' : '#f8fafc',
        SEA: isBright ? '#1f2937' : '#e2e8f0',
      },
      heatmapOpacity: isBright ? 0.85 : 0.65,
    };
  }, [mapStyleId]);

  const overlaysEnabled = !focusMode;
  const geofencesEnabled = overlaysEnabled && showGeofences;
  const routesEnabled = overlaysEnabled && showRoutes;
  const breachesEnabled = overlaysEnabled && showBreaches;
  const deviationsEnabled = overlaysEnabled;
  const showUiOverlays = !focusMode;
  const hasShipmentDetailOpen = Boolean(selectedShipment);
  const agentStatus = fabHealth
    ? (fabHealth.agentsOffline > 0 ? 'warn' : 'ok')
    : 'ok';
  const agentsOnline = fabHealth?.agentsOnline ?? 0;
  const agentCount = fabHealth?.agentCount ?? 0;
  const detections24h = fabHealth?.totalDetections24h ?? 0;
  const dispatchCount = fabHealth?.dispatchCount ?? 0;
  const pendingRecipeAdjustments = fabHealth?.pendingRecipeAdjustments ?? 0;

  const getOverlayInsertBeforeId = useCallback((mapInstance: maplibregl.Map) => {
    const layers = mapInstance.getStyle().layers || [];
    const labelLayer = layers.find((layer) => layer.type === 'symbol' && (layer.layout as any)?.['text-field']);
    return labelLayer?.id;
  }, []);

  const getFirstNonBasemapLayerId = useCallback((mapInstance: maplibregl.Map) => {
    const layers = mapInstance.getStyle().layers || [];
    const first = layers.find((layer) => layer.id !== 'basemap-bg' && layer.id !== 'basemap-tiles');
    return first?.id;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mobileMedia = window.matchMedia('(max-width: 1023px)');
    const syncMobile = () => setIsMobileLayout(mobileMedia.matches);
    syncMobile();
    mobileMedia.addEventListener('change', syncMobile);

    if (window.innerWidth < 1024) {
      setIsRightRailOpen(false);
    }
    const media = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsRightRailOpen(true);
      }
    };
    media.addEventListener('change', handleChange);
    return () => {
      media.removeEventListener('change', handleChange);
      mobileMedia.removeEventListener('change', syncMobile);
    };
  }, []);

  useEffect(() => {
    if (focusMode) {
      setIsRightRailOpen(true);
    }
  }, [focusMode]);

  useEffect(() => {
    if (isMobileLayout && hasShipmentDetailOpen) {
      setIsRightRailOpen(false);
    }
  }, [hasShipmentDetailOpen, isMobileLayout]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleWindowClick = (event: MouseEvent) => {
      if (!operatorMenuRef.current) return;
      if (!operatorMenuRef.current.contains(event.target as Node)) {
        setIsOperatorMenuOpen(false);
      }
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  useEffect(() => {
    const captureFromMap = () => {
      if (!map.current || !isLoaded || !isStyleReady) return;
      try {
        const canvas = map.current.getCanvas();
        const src = canvas.toDataURL('image/jpeg', 0.82);
        if (src && src.length > 64) {
          setLiveCaptureImage(src);
        }
      } catch {
        // Ignore canvas capture failures and keep fallback preview.
      }
    };

    captureFromMap();

    if (liveCaptureInterval.current) {
      window.clearInterval(liveCaptureInterval.current);
      liveCaptureInterval.current = null;
    }

    if (isLoaded && isStyleReady) {
      liveCaptureInterval.current = window.setInterval(captureFromMap, 1800);
    }

    return () => {
      if (liveCaptureInterval.current) {
        window.clearInterval(liveCaptureInterval.current);
        liveCaptureInterval.current = null;
      }
    };
  }, [isLoaded, isStyleReady, mapStyleId, focusShipment?.id, styleVersion]);

  useEffect(() => {
    if (!map.current || !isLoaded || !isStyleReady) return;
    if (hasAutoFramedRef.current) return;
    if (selectedShipment?.currentLocation) return;
    if (!shipmentsWithLocation.length) return;

    const firstLocation = shipmentsWithLocation[0].currentLocation;
    if (!firstLocation) return;

    const bounds = new maplibregl.LngLatBounds(
      [firstLocation.lng, firstLocation.lat],
      [firstLocation.lng, firstLocation.lat]
    );

    shipmentsWithLocation.forEach((shipment) => {
      if (!shipment.currentLocation) return;
      bounds.extend([shipment.currentLocation.lng, shipment.currentLocation.lat]);
    });

    const rightPadding = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 380 : 44;
    map.current.fitBounds(bounds, {
      padding: {
        top: 120,
        right: rightPadding,
        bottom: 100,
        left: 90,
      },
      minZoom: 2.5,
      maxZoom: 6,
      duration: 1300,
      essential: true,
    });
    hasAutoFramedRef.current = true;
  }, [isLoaded, isStyleReady, selectedShipment, shipmentsWithLocation]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) {
      console.log('No map container ref');
      return;
    }
    if (map.current) {
      console.log('Map already initialized');
      return;
    }

    console.log('Initializing map...');

    setIsLoaded(false);
    setIsStyleReady(false);
    setLoadError(null);

    let mapInstance: maplibregl.Map | null = null;
    let handleLoad: (() => void) | null = null;
    let handleStyleLoading: (() => void) | null = null;
    let handleStyleLoad: (() => void) | null = null;
    let handleStyleData: (() => void) | null = null;
    let handleError: ((e: ErrorEvent) => void) | null = null;

    try {
      mapInstance = new maplibregl.Map({
        container: mapContainer.current,
        style: styleDefinition,
        center: [20, 20],
        zoom: 2.8,
        minZoom: 2,
        pitch: 45,
        bearing: -20,
        antialias: true,
        maxPitch: 65,
        fadeDuration: 0,
        attributionControl: false,
      });
      map.current = mapInstance;
      appliedStyleIdRef.current = mapStyleId;

      console.log('Map instance created');

      const dragPan = mapInstance.dragPan as any;
      dragPan?.setInertiaOptions?.({
        linearity: 0.2,
        easing: cinematicEasing,
        maxSpeed: 800,
        deceleration: 2500,
      });
      const scrollZoom = mapInstance.scrollZoom as any;
      scrollZoom?.setWheelZoomRate?.(1 / 550);
      scrollZoom?.setZoomRate?.(1 / 120);
      mapInstance.dragRotate?.enable?.();
      mapInstance.touchZoomRotate?.enableRotation?.();

      // Add navigation controls
      mapInstance.addControl(
        new maplibregl.NavigationControl(),
        'top-right'
      );
      mapInstance.addControl(
        new maplibregl.AttributionControl({ compact: false }),
        'bottom-right'
      );

      handleLoad = () => {
        console.log('Map loaded successfully');
        setIsLoaded(true);
        markStyleReady();
      };

      handleStyleLoading = () => {
        setIsStyleReady(false);
        styleReadyEpochRef.current = null;
      };

      handleStyleLoad = () => {
        markStyleReady();
      };
      handleStyleData = () => {
        markStyleReady();
      };

      handleError = (e: ErrorEvent) => {
        console.error('Map error:', e);
        setLoadError('Map error: ' + (e.error?.message || 'Unknown'));
      };

      mapInstance.on('load', handleLoad);
      mapInstance.on('styleloading', handleStyleLoading);
      mapInstance.on('style.load', handleStyleLoad);
      mapInstance.on('styledata', handleStyleData);
      mapInstance.on('error', handleError);

    } catch (err: any) {
      console.error('Map initialization error:', err);
      setLoadError('Failed to initialize: ' + (err?.message || 'Unknown'));
    }

    return () => {
      appliedStyleIdRef.current = null;
      if (mapInstance) {
        if (handleLoad) mapInstance.off('load', handleLoad);
        if (handleStyleLoading) mapInstance.off('styleloading', handleStyleLoading);
        if (handleStyleLoad) mapInstance.off('style.load', handleStyleLoad);
        if (handleStyleData) mapInstance.off('styledata', handleStyleData);
        if (handleError) mapInstance.off('error', handleError);
        mapInstance.remove();
      }
      map.current = null;
      setIsLoaded(false);
      setIsStyleReady(false);
      setLoadError(null);
    };
  }, [markStyleReady]);

  // Route deviation heatmap layer
  useEffect(() => {
    if (!map.current || !isLoaded || !isStyleReady) return;
    const mapInstance = map.current;
    const sourceId = "route-deviation-source";
    const layerId = "route-deviation-heat";
    const pointLayerId = "route-deviation-points";

    if (!deviationsEnabled) {
      if (mapInstance.getLayer(pointLayerId)) mapInstance.removeLayer(pointLayerId);
      if (mapInstance.getLayer(layerId)) mapInstance.removeLayer(layerId);
      if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
      return;
    }

    const beforeId = getOverlayInsertBeforeId(mapInstance);
    const addLayer = (layer: any) => {
      if (beforeId && mapInstance.getLayer(beforeId)) {
        mapInstance.addLayer(layer, beforeId);
      } else {
        mapInstance.addLayer(layer);
      }
    };

    if (!mapInstance.getSource(sourceId)) {
      mapInstance.addSource(sourceId, {
        type: "geojson",
        data: deviationGeoJson,
      });

      addLayer({
        id: layerId,
        type: "heatmap",
        source: sourceId,
        paint: {
          "heatmap-weight": [
            "case",
            ["==", ["get", "severity"], "CRITICAL"], 1,
            ["==", ["get", "severity"], "WARNING"], 0.6,
            0.3,
          ],
          "heatmap-intensity": 1.2,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.3, "rgba(255, 176, 0, 0.35)",
            0.6, "rgba(255, 77, 79, 0.55)",
            1, "rgba(255, 77, 79, 0.85)",
          ],
          "heatmap-radius": 24,
          "heatmap-opacity": overlayPalette.heatmapOpacity,
        },
      });

      addLayer({
        id: pointLayerId,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 6,
          "circle-color": [
            "case",
            ["==", ["get", "severity"], "CRITICAL"], "#FF4D4F",
            ["==", ["get", "severity"], "WARNING"], "#FFB000",
            "#e5e7eb",
          ],
          "circle-stroke-color": overlayPalette.isBright ? "#0b0f14" : "#10161a",
          "circle-stroke-width": 1.5,
        },
      });
    } else {
      const source = mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource;
      source.setData(deviationGeoJson);
      if (mapInstance.getLayer(layerId)) {
        mapInstance.setPaintProperty(layerId, "heatmap-opacity", overlayPalette.heatmapOpacity);
      }
      if (mapInstance.getLayer(pointLayerId)) {
        mapInstance.setPaintProperty(pointLayerId, "circle-stroke-color", overlayPalette.isBright ? "#0b0f14" : "#10161a");
      }
    }
  }, [deviationGeoJson, deviationsEnabled, getOverlayInsertBeforeId, isLoaded, isStyleReady, overlayPalette, styleVersion]);

  // Geofence polygons overlay
  useEffect(() => {
    if (!map.current || !isLoaded || !isStyleReady) return;
    const mapInstance = map.current;
    const sourceId = 'geofence-polygons';
    const fillLayerId = 'geofence-fill';
    const lineLayerId = 'geofence-line';

    if (!geofencesEnabled) {
      if (mapInstance.getLayer(fillLayerId)) mapInstance.removeLayer(fillLayerId);
      if (mapInstance.getLayer(lineLayerId)) mapInstance.removeLayer(lineLayerId);
      if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
      return;
    }

    if (!geofences || geofences.features.length === 0) return;

    const beforeId = getOverlayInsertBeforeId(mapInstance);
    const addLayer = (layer: any) => {
      if (beforeId && mapInstance.getLayer(beforeId)) {
        mapInstance.addLayer(layer, beforeId);
      } else {
        mapInstance.addLayer(layer);
      }
    };

    if (!mapInstance.getSource(sourceId)) {
      mapInstance.addSource(sourceId, {
        type: 'geojson',
        data: geofences,
      });

      addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': overlayPalette.geofenceFill,
          'fill-opacity': 0.08,
        },
      });

      addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': overlayPalette.geofenceLine,
          'line-width': 1.2,
          'line-opacity': 0.6,
        },
      });
    } else {
      const source = mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource;
      source.setData(geofences);
      if (mapInstance.getLayer(fillLayerId)) {
        mapInstance.setPaintProperty(fillLayerId, 'fill-color', overlayPalette.geofenceFill);
      }
      if (mapInstance.getLayer(lineLayerId)) {
        mapInstance.setPaintProperty(lineLayerId, 'line-color', overlayPalette.geofenceLine);
      }
    }
  }, [geofences, geofencesEnabled, getOverlayInsertBeforeId, isLoaded, isStyleReady, overlayPalette, styleVersion]);

  // Known customer zones overlay
  useEffect(() => {
    if (!map.current || !isLoaded || !isStyleReady) return;
    const mapInstance = map.current;
    const sourceId = 'known-customer-zones';
    const fillLayerId = 'known-customer-fill';
    const lineLayerId = 'known-customer-line';

    if (!geofencesEnabled) {
      if (mapInstance.getLayer(fillLayerId)) mapInstance.removeLayer(fillLayerId);
      if (mapInstance.getLayer(lineLayerId)) mapInstance.removeLayer(lineLayerId);
      if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
      return;
    }

    if (!knownCustomerGeoJson || knownCustomerGeoJson.features.length === 0) return;

    const beforeId = getOverlayInsertBeforeId(mapInstance);
    const addLayer = (layer: any) => {
      if (beforeId && mapInstance.getLayer(beforeId)) {
        mapInstance.addLayer(layer, beforeId);
      } else {
        mapInstance.addLayer(layer);
      }
    };

    if (!mapInstance.getSource(sourceId)) {
      mapInstance.addSource(sourceId, {
        type: 'geojson',
        data: knownCustomerGeoJson,
      });

      addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': overlayPalette.knownFill,
          'fill-opacity': 0.1,
        },
      });

      addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': overlayPalette.knownLine,
          'line-width': 1,
          'line-opacity': 0.6,
          'line-dasharray': [1.5, 1.2],
        },
      });
    } else {
      const source = mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource;
      source.setData(knownCustomerGeoJson);
      if (mapInstance.getLayer(fillLayerId)) {
        mapInstance.setPaintProperty(fillLayerId, 'fill-color', overlayPalette.knownFill);
      }
      if (mapInstance.getLayer(lineLayerId)) {
        mapInstance.setPaintProperty(lineLayerId, 'line-color', overlayPalette.knownLine);
      }
    }
  }, [knownCustomerGeoJson, geofencesEnabled, getOverlayInsertBeforeId, isLoaded, isStyleReady, overlayPalette, styleVersion]);

  // Geo-risk zones overlay
  useEffect(() => {
    if (!map.current || !isLoaded || !isStyleReady) return;
    const mapInstance = map.current;
    const sourceId = 'geo-risk-zones';
    const fillLayerId = 'geo-risk-fill';
    const lineLayerId = 'geo-risk-line';

    if (!geofencesEnabled) {
      if (mapInstance.getLayer(fillLayerId)) mapInstance.removeLayer(fillLayerId);
      if (mapInstance.getLayer(lineLayerId)) mapInstance.removeLayer(lineLayerId);
      if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
      return;
    }

    if (!riskZoneGeoJson || riskZoneGeoJson.features.length === 0) return;

    const beforeId = getOverlayInsertBeforeId(mapInstance);
    const addLayer = (layer: any) => {
      if (beforeId && mapInstance.getLayer(beforeId)) {
        mapInstance.addLayer(layer, beforeId);
      } else {
        mapInstance.addLayer(layer);
      }
    };

    if (!mapInstance.getSource(sourceId)) {
      mapInstance.addSource(sourceId, {
        type: 'geojson',
        data: riskZoneGeoJson,
      });

      addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': overlayPalette.riskFill,
          'fill-opacity': 0.12,
        },
      });

      addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': overlayPalette.riskLine,
          'line-width': 1,
          'line-opacity': 0.7,
          'line-dasharray': [2, 1.6],
        },
      });
    } else {
      const source = mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource;
      source.setData(riskZoneGeoJson);
      if (mapInstance.getLayer(fillLayerId)) {
        mapInstance.setPaintProperty(fillLayerId, 'fill-color', overlayPalette.riskFill);
      }
      if (mapInstance.getLayer(lineLayerId)) {
        mapInstance.setPaintProperty(lineLayerId, 'line-color', overlayPalette.riskLine);
      }
    }
  }, [riskZoneGeoJson, geofencesEnabled, getOverlayInsertBeforeId, isLoaded, isStyleReady, overlayPalette, styleVersion]);

  // Geofence breach markers
  useEffect(() => {
    if (!map.current || !isLoaded || !isStyleReady) return;
    const mapInstance = map.current;
    const sourceId = 'geofence-breaches';
    const circleLayerId = 'geofence-breaches-circle';

    if (!breachesEnabled) {
      if (mapInstance.getLayer(circleLayerId)) mapInstance.removeLayer(circleLayerId);
      if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
      return;
    }

    const beforeId = getOverlayInsertBeforeId(mapInstance);
    const addLayer = (layer: any) => {
      if (beforeId && mapInstance.getLayer(beforeId)) {
        mapInstance.addLayer(layer, beforeId);
      } else {
        mapInstance.addLayer(layer);
      }
    };

    if (!mapInstance.getSource(sourceId)) {
      mapInstance.addSource(sourceId, {
        type: 'geojson',
        data: breachGeoJson,
      });

      addLayer({
        id: circleLayerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 8,
          'circle-color': [
            'case',
            ['==', ['get', 'severity'], 'CRITICAL'], '#FF4D4F',
            '#FFB000',
          ],
          'circle-opacity': 0.9,
          'circle-stroke-color': overlayPalette.isBright ? '#0b0f14' : '#0b0f14',
          'circle-stroke-width': 2,
        },
      });
    } else {
      const source = mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource;
      source.setData(breachGeoJson);
      if (mapInstance.getLayer(circleLayerId)) {
        mapInstance.setPaintProperty(circleLayerId, 'circle-stroke-color', overlayPalette.isBright ? '#0b0f14' : '#0b0f14');
      }
    }
  }, [breachGeoJson, breachesEnabled, getOverlayInsertBeforeId, isLoaded, isStyleReady, overlayPalette, styleVersion]);

  // Route path lines by mode
  useEffect(() => {
    if (!map.current || !isLoaded || !isStyleReady) return;
    const mapInstance = map.current;
    const sourceId = 'route-paths';
    const layers = [
      { id: 'route-paths-truck', mode: 'TRUCK', color: overlayPalette.routeColors.TRUCK, width: 2.2, dash: [1, 0] },
      { id: 'route-paths-train', mode: 'TRAIN', color: overlayPalette.routeColors.TRAIN, width: 2.2, dash: [1.2, 0.6] },
      { id: 'route-paths-air', mode: 'AIR', color: overlayPalette.routeColors.AIR, width: 2.6, dash: [0.5, 1.2] },
      { id: 'route-paths-sea', mode: 'SEA', color: overlayPalette.routeColors.SEA, width: 2.4, dash: [2, 1.2] },
    ];

    if (!routesEnabled) {
      layers.forEach((layer) => {
        if (mapInstance.getLayer(layer.id)) mapInstance.removeLayer(layer.id);
      });
      if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
      return;
    }

    const beforeId = getOverlayInsertBeforeId(mapInstance);
    const addLayer = (layer: any) => {
      if (beforeId && mapInstance.getLayer(beforeId)) {
        mapInstance.addLayer(layer, beforeId);
      } else {
        mapInstance.addLayer(layer);
      }
    };

    if (!mapInstance.getSource(sourceId)) {
      mapInstance.addSource(sourceId, {
        type: 'geojson',
        data: routeGeoJson,
      });

      layers.forEach((layer) => {
        addLayer({
          id: layer.id,
          type: 'line',
          source: sourceId,
          filter: ['==', ['get', 'mode'], layer.mode],
          paint: {
            'line-color': layer.color,
            'line-width': layer.width,
            'line-opacity': overlayPalette.routeOpacity,
            'line-dasharray': layer.dash as any,
          },
        });
      });
    } else {
      const source = mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource;
      source.setData(routeGeoJson);
      layers.forEach((layer) => {
        if (mapInstance.getLayer(layer.id)) {
          mapInstance.setPaintProperty(layer.id, 'line-color', layer.color);
          mapInstance.setPaintProperty(layer.id, 'line-opacity', overlayPalette.routeOpacity);
        }
      });
    }
  }, [routeGeoJson, routesEnabled, getOverlayInsertBeforeId, isLoaded, isStyleReady, overlayPalette, styleVersion]);

  // Ambient motion pass (geofences/routes/breaches/deviation heat)
  useEffect(() => {
    if (!map.current || !isLoaded || !isStyleReady) return;
    const mapInstance = map.current;
    let stopped = false;
    let lastTick = 0;
    const startedAt = performance.now();

    const animate = (now: number) => {
      if (stopped || !map.current) return;
      if (now - lastTick < 140) {
        mapMotionFrame.current = requestAnimationFrame(animate);
        return;
      }
      lastTick = now;

      const seconds = (now - startedAt) / 1000;
      const pulse = (Math.sin(seconds * 1.2) + 1) / 2;
      const slowPulse = (Math.sin(seconds * 0.55) + 1) / 2;

      if (mapInstance.getLayer('route-deviation-heat')) {
        mapInstance.setPaintProperty('route-deviation-heat', 'heatmap-intensity', 1.0 + pulse * 0.4);
        mapInstance.setPaintProperty('route-deviation-heat', 'heatmap-radius', 20 + pulse * 8);
      }
      if (mapInstance.getLayer('geofence-fill')) {
        mapInstance.setPaintProperty('geofence-fill', 'fill-opacity', 0.06 + slowPulse * 0.05);
      }
      if (mapInstance.getLayer('known-customer-fill')) {
        mapInstance.setPaintProperty('known-customer-fill', 'fill-opacity', 0.07 + slowPulse * 0.05);
      }
      if (mapInstance.getLayer('geo-risk-fill')) {
        mapInstance.setPaintProperty('geo-risk-fill', 'fill-opacity', 0.10 + pulse * 0.06);
      }
      if (mapInstance.getLayer('geofence-breaches-circle')) {
        mapInstance.setPaintProperty('geofence-breaches-circle', 'circle-radius', 7 + pulse * 2.4);
      }
      if (mapInstance.getLayer('shipment-points-halo')) {
        mapInstance.setPaintProperty('shipment-points-halo', 'circle-radius', [
          'case',
          ['get', 'isSelected'], 13.5 + pulse * 4.2,
          ['==', ['get', 'riskLevel'], 'HIGH'], 12 + slowPulse * 1.2,
          ['==', ['get', 'riskLevel'], 'MED'], 11 + slowPulse * 1,
          10 + slowPulse * 0.8,
        ]);
        mapInstance.setPaintProperty('shipment-points-halo', 'circle-color', [
          'case',
          ['get', 'isSelected'], `rgba(255,255,255,${0.2 + pulse * 0.28})`,
          ['get', 'hasCriticalAlert'], 'rgba(255,77,79,0.35)',
          ['==', ['get', 'riskLevel'], 'HIGH'], 'rgba(255,77,79,0.24)',
          ['==', ['get', 'riskLevel'], 'MED'], 'rgba(255,176,0,0.22)',
          'rgba(229,231,235,0.16)',
        ]);
      }
      if (mapInstance.getLayer('shipment-points-circle')) {
        mapInstance.setPaintProperty('shipment-points-circle', 'circle-radius', [
          'case',
          ['get', 'isSelected'], 6.7 + pulse * 1.3,
          5,
        ]);
        mapInstance.setPaintProperty('shipment-points-circle', 'circle-stroke-width', [
          'case',
          ['get', 'isSelected'], 2 + pulse * 0.9,
          1.4,
        ]);
      }

      const routeLayers = ['route-paths-truck', 'route-paths-train', 'route-paths-air', 'route-paths-sea'];
      routeLayers.forEach((layerId, index) => {
        if (!mapInstance.getLayer(layerId)) return;
        const shimmer = 0.78 + 0.22 * Math.sin(seconds * 1.1 + index * 0.9);
        mapInstance.setPaintProperty(layerId, 'line-opacity', overlayPalette.routeOpacity * shimmer);
      });

      mapMotionFrame.current = requestAnimationFrame(animate);
    };

    mapMotionFrame.current = requestAnimationFrame(animate);
    return () => {
      stopped = true;
      if (mapMotionFrame.current) {
        cancelAnimationFrame(mapMotionFrame.current);
        mapMotionFrame.current = null;
      }
    };
  }, [isLoaded, isStyleReady, overlayPalette.routeOpacity, styleVersion]);

  // Swap map tiles without tearing down the style — keeps data layers intact
  useEffect(() => {
    if (!map.current || !isLoaded) return;
    if (appliedStyleIdRef.current === mapStyleId) return;

    appliedStyleIdRef.current = mapStyleId;
    const mapInstance = map.current;
    const cfg = TILE_CONFIGS[mapStyleId];

    const source = mapInstance.getSource('basemap');
    if (source && typeof (source as any).setTiles === 'function') {
      (source as any).setTiles(cfg.tiles);
      if (typeof (source as any).reload === 'function') {
        (source as any).reload();
      }
    } else {
      // Fallback path still avoids setStyle() to prevent black-screen teardown.
      if (mapInstance.getLayer('basemap-tiles')) mapInstance.removeLayer('basemap-tiles');
      if (mapInstance.getLayer('basemap-bg')) mapInstance.removeLayer('basemap-bg');
      if (mapInstance.getSource('basemap')) mapInstance.removeSource('basemap');

      const beforeId = getFirstNonBasemapLayerId(mapInstance);
      mapInstance.addSource('basemap', {
        type: 'raster',
        tiles: cfg.tiles,
        tileSize: cfg.tileSize,
        attribution: cfg.attribution,
      });
      mapInstance.addLayer(
        { id: 'basemap-bg', type: 'background', paint: { 'background-color': cfg.bgColor } },
        beforeId
      );
      mapInstance.addLayer(
        { id: 'basemap-tiles', type: 'raster', source: 'basemap' },
        beforeId
      );
    }

    if (mapInstance.getLayer('basemap-bg')) {
      mapInstance.setPaintProperty('basemap-bg', 'background-color', cfg.bgColor);
    }
    if (mapInstance.getLayer('basemap-tiles')) {
      mapInstance.setPaintProperty('basemap-tiles', 'raster-opacity', 1);
    }
    mapInstance.triggerRepaint();
    setStyleVersion((v) => v + 1);
  }, [mapStyleId, isLoaded, getFirstNonBasemapLayerId]);

  // Shipment point layer (always-on, replaces fragile DOM markers)
  useEffect(() => {
    if (!map.current || !isLoaded || !isStyleReady) return;
    const mapInstance = map.current;
    const sourceId = 'shipment-points';
    const haloLayerId = 'shipment-points-halo';
    const layerId = 'shipment-points-circle';

    const features = effectiveShipments
      .filter((shipment) => Boolean(shipment.currentLocation))
      .map((shipment) => {
        const hasCriticalAlert = effectiveAlerts.some(
          (alert) => alert.shipmentId === shipment.id && alert.severity === 'CRITICAL' && !alert.acknowledged
        );
        const geoRisk = computeGeoRiskScore(shipment.currentLocation);
        return {
          type: 'Feature',
          properties: {
            shipmentId: shipment.id,
            trackingCode: shipment.trackingCode,
            status: shipment.status,
            hasCriticalAlert,
            isSelected: selectedShipment?.id === shipment.id,
            riskLevel: geoRisk.level,
          },
          geometry: {
            type: 'Point',
            coordinates: [shipment.currentLocation!.lng, shipment.currentLocation!.lat],
          },
        };
      });

    const data = {
      type: 'FeatureCollection',
      features,
    } as GeoJSON.FeatureCollection;

    const beforeId = getOverlayInsertBeforeId(mapInstance);
    const addLayer = (layer: any) => {
      if (beforeId && mapInstance.getLayer(beforeId)) {
        mapInstance.addLayer(layer, beforeId);
      } else {
        mapInstance.addLayer(layer);
      }
    };

    if (!mapInstance.getSource(sourceId)) {
      mapInstance.addSource(sourceId, {
        type: 'geojson',
        data,
      });

      addLayer({
        id: haloLayerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': [
            'case',
            ['get', 'isSelected'], 14,
            ['==', ['get', 'riskLevel'], 'HIGH'], 12,
            ['==', ['get', 'riskLevel'], 'MED'], 11,
            10,
          ],
          'circle-color': [
            'case',
            ['get', 'hasCriticalAlert'], 'rgba(255,77,79,0.35)',
            ['==', ['get', 'riskLevel'], 'HIGH'], 'rgba(255,77,79,0.24)',
            ['==', ['get', 'riskLevel'], 'MED'], 'rgba(255,176,0,0.22)',
            'rgba(229,231,235,0.16)',
          ],
          'circle-blur': 0.45,
        },
      });

      addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': [
            'case',
            ['get', 'isSelected'], 7,
            5,
          ],
          'circle-color': [
            'case',
            ['get', 'hasCriticalAlert'], '#FF4D4F',
            ['==', ['get', 'status'], 'DELIVERED'], '#0F9960',
            ['==', ['get', 'status'], 'HELD_CUSTOMS'], '#FFB000',
            ['==', ['get', 'status'], 'DELAYED'], '#FFB000',
            ['==', ['get', 'status'], 'CRITICAL'], '#FF4D4F',
            '#d1d5db',
          ],
          'circle-stroke-color': overlayPalette.isBright ? '#0b0f14' : '#f8fafc',
          'circle-stroke-width': [
            'case',
            ['get', 'isSelected'], 2.2,
            1.4,
          ],
        },
      });
    } else {
      const source = mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource;
      source.setData(data);
      if (mapInstance.getLayer(layerId)) {
        mapInstance.setPaintProperty(layerId, 'circle-stroke-color', overlayPalette.isBright ? '#0b0f14' : '#f8fafc');
      }
    }
  }, [effectiveAlerts, effectiveShipments, getOverlayInsertBeforeId, isLoaded, isStyleReady, overlayPalette, selectedShipment, styleVersion]);

  // Click interaction for overlay datapoints (deviations/breaches)
  useEffect(() => {
    if (!map.current || !isLoaded || !isStyleReady) return;
    const mapInstance = map.current;
    const interactiveLayers = ['shipment-points-circle', 'route-deviation-points', 'geofence-breaches-circle'].filter((layerId) =>
      Boolean(mapInstance.getLayer(layerId))
    );
    if (interactiveLayers.length === 0) return;

    const handleLayerClick = (event: any) => {
      const props = (event?.features?.[0]?.properties || {}) as Record<string, string>;
      const shipmentId = props.shipmentId;
      const trackingCode = props.trackingCode;
      const shipment = effectiveShipments.find((item) =>
        (shipmentId && item.id === shipmentId) ||
        (trackingCode && item.trackingCode === trackingCode)
      );
      if (!shipment) return;
      handleShipmentFocus(shipment);
      if (event?.lngLat && shipment.currentLocation) {
        easeFocusToPoint(event.lngLat.lng, event.lngLat.lat);
        showShipmentPopup(shipment, event.lngLat.lng, event.lngLat.lat);
      }
      showToast(`Focused ${shipment.trackingCode}`);
    };
    const handleEnter = () => {
      if (mapInstance.getCanvas()) {
        mapInstance.getCanvas().style.cursor = 'pointer';
      }
    };
    const handleLeave = () => {
      if (mapInstance.getCanvas()) {
        mapInstance.getCanvas().style.cursor = '';
      }
    };

    interactiveLayers.forEach((layerId) => {
      mapInstance.on('click', layerId, handleLayerClick);
      mapInstance.on('mouseenter', layerId, handleEnter);
      mapInstance.on('mouseleave', layerId, handleLeave);
    });
    return () => {
      interactiveLayers.forEach((layerId) => {
        mapInstance.off('click', layerId, handleLayerClick);
        mapInstance.off('mouseenter', layerId, handleEnter);
        mapInstance.off('mouseleave', layerId, handleLeave);
      });
      if (mapInstance.getCanvas()) {
        mapInstance.getCanvas().style.cursor = '';
      }
    };
  }, [easeFocusToPoint, effectiveShipments, handleShipmentFocus, isLoaded, isStyleReady, showShipmentPopup, showToast, styleVersion]);

  // Click interaction for raw map canvas (select nearest asset from any point)
  useEffect(() => {
    if (!map.current || !isLoaded || !isStyleReady) return;
    const mapInstance = map.current;

    const handleMapClick = (event: maplibregl.MapMouseEvent) => {
      const layeredFeature = mapInstance.queryRenderedFeatures(event.point, {
        layers: ['shipment-points-circle', 'route-deviation-points', 'geofence-breaches-circle'],
      });
      if (layeredFeature.length > 0) return;

      if (!shipmentsWithLocation.length) {
        showToast('No trackable assets available');
        return;
      }

      const clickedPoint = { lat: event.lngLat.lat, lng: event.lngLat.lng };
      const nearestResult = shipmentsWithLocation.reduce<{
        shipment: Shipment | null;
        distanceKm: number;
      }>(
        (best, shipment) => {
          if (!shipment.currentLocation) return best;
          const distanceKm = haversineDistanceKm(clickedPoint, shipment.currentLocation);
          if (distanceKm < best.distanceKm) {
            return { shipment, distanceKm };
          }
          return best;
        },
        { shipment: null, distanceKm: Number.POSITIVE_INFINITY }
      );

      if (!nearestResult.shipment) return;

      handleShipmentFocus(nearestResult.shipment);
      easeFocusToPoint(event.lngLat.lng, event.lngLat.lat);
      showShipmentPopup(nearestResult.shipment, event.lngLat.lng, event.lngLat.lat);
      showToast(`Selected ${nearestResult.shipment.trackingCode} - ${nearestResult.distanceKm.toFixed(1)}km away`);
    };

    mapInstance.on('click', handleMapClick);
    return () => {
      mapInstance.off('click', handleMapClick);
    };
  }, [easeFocusToPoint, handleShipmentFocus, isLoaded, isStyleReady, shipmentsWithLocation, showShipmentPopup, showToast, styleVersion]);

  // Fly to selected shipment
  useEffect(() => {
    if (map.current && selectedShipment?.currentLocation) {
      map.current.flyTo({
        center: [selectedShipment.currentLocation.lng, selectedShipment.currentLocation.lat],
        zoom: 5,
        pitch: 45,
        bearing: -20,
        speed: 0.9,
        curve: 1.4,
        duration: 1400,
        easing: cinematicEasing,
        essential: true,
      });
    }
  }, [selectedShipment]);

  return (
    <div className="w-full h-full relative">
      {/* Map Container */}
      <div
        ref={mapContainer}
        className="absolute inset-0"
        style={{ backgroundColor: '#10161a' }}
      />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.05),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(0,0,0,0.35),transparent_45%)]" />

      {/* Loading */}
      {!isLoaded && !loadError && (
        <div className="absolute inset-0 bg-void flex items-center justify-center z-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-muted font-mono text-sm">INITIALIZING MAP...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {loadError && (
        <div className="absolute inset-0 bg-void flex items-center justify-center z-20">
          <div className="text-center p-6">
            <p className="text-critical mb-4">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-accent text-white rounded"
            >
              Reload
            </button>
          </div>
        </div>
      )}

      {/* Overlays */}
      {isLoaded && (
        <>
          {showUiOverlays && (
            <div className="absolute left-4 right-4 top-4 z-20 flex flex-wrap items-start justify-between gap-3 pointer-events-none">
              <div className="flex items-center gap-3 pointer-events-auto">
                <div className="flex items-center gap-2 bg-black/80 border border-white/10 px-3 py-2 rounded-full shadow-xl">
                  <a
                    href={yieldOpsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
                    title="Open YieldOps dashboard"
                    aria-label="Open YieldOps dashboard"
                  >
                    <IconArrowLeft className="w-4 h-4 text-white" />
                  </a>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.35em] text-white/60">Project</div>
                    <div className="text-[12px] font-semibold text-white">Transvec Ops Grid</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pointer-events-auto ml-auto">
                <button
                  onClick={onOpenAlertsTab}
                  className="h-9 px-3 rounded-full bg-white/10 text-[11px] text-white/80 border border-white/10 hover:bg-white/20 transition hidden sm:inline-flex items-center gap-2"
                >
                  <IconBell className="w-4 h-4" />
                  Alerts
                </button>
                <div ref={operatorMenuRef} className="relative">
                  <button
                    onClick={() => setIsOperatorMenuOpen((open) => !open)}
                    className="flex items-center gap-2 bg-black/85 border border-white/10 px-3 py-1.5 rounded-full shadow-xl hover:bg-white/5 transition"
                  >
                    <IconUserCircle className="w-6 h-6 text-white/80" />
                    <span className="text-[11px] text-white/80 hidden sm:inline">Ops Analyst</span>
                    <IconChevronDown className="w-4 h-4 text-white/60" />
                  </button>
                  {isOperatorMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-black/95 shadow-2xl overflow-hidden">
                      <button
                        onClick={() => {
                          onOpenOperatorPanel();
                          setIsOperatorMenuOpen(false);
                        }}
                        className="w-full px-3 py-2.5 text-left text-[11px] text-white/85 hover:bg-white/10 transition"
                      >
                        Open Operator Panel
                      </button>
                      <button
                        onClick={() => {
                          onOpenAlertsTab();
                          setIsOperatorMenuOpen(false);
                        }}
                        className="w-full px-3 py-2.5 text-left text-[11px] text-white/85 hover:bg-white/10 transition border-t border-white/10"
                      >
                        Go to Alerts Tab
                      </button>
                      <button
                        onClick={() => {
                          onOpenSettingsPanel();
                          setIsOperatorMenuOpen(false);
                        }}
                        className="w-full px-3 py-2.5 text-left text-[11px] text-white/85 hover:bg-white/10 transition border-t border-white/10 flex items-center gap-2"
                      >
                        <IconAdjustments className="w-3.5 h-3.5" />
                        Open Settings
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showUiOverlays && !isRightRailOpen && (
            <button
              onClick={() => setIsRightRailOpen(true)}
              className={`absolute z-30 flex items-center gap-2 px-3 py-2 rounded-full bg-black/85 border border-white/10 text-white/80 text-[11px] shadow-xl cursor-pointer ${isMobileLayout ? 'bottom-[6.1rem] right-4' : 'top-24 right-4 lg:hidden'}`}
            >
              <IconMenu2 className="w-4 h-4" />
              Panel
            </button>
          )}



          {showUiOverlays && !hasShipmentDetailOpen && !isMobileLayout && (
            <div className="absolute bottom-4 left-4 z-10 bg-black/80 border border-white/10 p-3 rounded-lg shadow-xl pointer-events-none">
              <div className="text-[10px] font-bold tracking-[0.3em] text-white/50 mb-2">STATUS</div>
              {Object.entries(statusColors).map(([status, color]) => (
                <div key={status} className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-white">{status.replace('_', ' ')}</span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white/70" />
                <span className="text-[10px] text-white/50">KNOWN CUSTOMER ZONES</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-critical" />
                <span className="text-[10px] text-white/50">GEO RISK ZONES</span>
              </div>
            </div>
          )}

          <div
            className={`absolute z-10 border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 overflow-y-auto ${isMobileLayout
              ? 'left-3 right-3 bottom-[5.75rem] max-h-[min(62dvh,34rem)] bg-black/96 backdrop-blur-md'
              : 'right-4 top-20 w-[calc(100%-2rem)] max-w-[22rem] sm:w-80 max-h-[calc(100vh-6rem)] bg-black/85'
              } ${isRightRailOpen
                ? 'translate-y-0 translate-x-0 opacity-100 pointer-events-auto'
                : isMobileLayout
                  ? 'translate-y-[112%] opacity-0 pointer-events-none'
                  : 'translate-x-[120%] opacity-0 pointer-events-none'
              } ${isMobileLayout ? '' : 'lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto'}`}
          >
            <div className="flex items-center justify-between px-4 pt-4">
              <div className="flex items-center gap-2">
                {normalizedSearchTerm && (
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                    {filteredShipments.length} Hits
                  </span>
                )}
                <button
                  type="button"
                  onClick={toggleFocusMode}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${focusMode ? 'bg-white text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                >
                  {focusMode ? <IconEyeOff className="w-3 h-3" /> : <IconEye className="w-3 h-3" />}
                  Focus
                </button>
                <button
                  type="button"
                  onClick={() => setIsRightRailOpen(false)}
                  className={`p-1 rounded-full hover:bg-white/10 text-white/70 ${focusMode ? 'hidden' : ''} ${isMobileLayout ? '' : 'lg:hidden'}`}
                  aria-label="Close panel"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="px-4 pb-4">
              <div className="mt-4 rounded-xl border border-white/10 bg-black/60 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-white/80">
                    <IconCpu className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.28em] text-white/40">System Status</div>
                    <div className="text-[12px] font-semibold text-white">Operational Status</div>
                  </div>
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border ${liveData ? 'border-success text-success' : 'border-warning text-warning'}`}>
                    {liveData ? 'LIVE' : 'DEMO'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="inline-flex items-center gap-1 rounded border border-white/10 bg-black/60 px-2 py-1 text-white hover:bg-white/10 cursor-pointer"
                  >
                    <IconRefresh className="w-3 h-3" />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={onToggleOverlays}
                    className="inline-flex items-center gap-1 rounded border border-white/10 bg-black/60 px-2 py-1 text-white hover:bg-white/10 cursor-pointer"
                  >
                    <IconStack2 className="w-3 h-3" />
                    Overlays
                  </button>
                  <button
                    type="button"
                    onClick={onExport}
                    className="inline-flex items-center gap-1 rounded border border-white/10 bg-black/60 px-2 py-1 text-white hover:bg-white/10 cursor-pointer"
                  >
                    <IconDownload className="w-3 h-3" />
                    Export
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded-lg border border-white/10 bg-black/50 px-2 py-1.5">
                    <div className="text-white/50">Tracked</div>
                    <div className="font-mono text-white text-base">{shipmentCount}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/50 px-2 py-1.5">
                    <div className="text-white/50">Open Alerts</div>
                    <div className={`font-mono text-base ${alertCount > 0 ? 'text-critical' : 'text-success'}`}>{alertCount}</div>
                  </div>
                </div>
                <div className="mt-3 border-t border-white/10 pt-2 text-[10px]">
                  <div className="flex items-center justify-between text-white/50">
                    <div className="flex items-center gap-1.5">
                      <HealthDot status={agentStatus} />
                      <IconShieldCheck className="w-3 h-3" />
                      Sentinel
                    </div>
                    <span className="font-mono text-white">{agentsOnline}/{agentCount}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-white/45">Detections (24h)</span>
                    <span className="font-mono text-warning">{detections24h}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-white/45">Dispatch / Recipe</span>
                    <span className="font-mono text-white">{dispatchCount} / {pendingRecipeAdjustments}</span>
                  </div>
                  {fabHealth && fabHealth.openMaintenanceCount > 0 && (
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-white/50">
                        <IconTool className="w-3 h-3" />
                        Maint.
                      </div>
                      <span className="font-mono text-warning">{fabHealth.openMaintenanceCount}</span>
                    </div>
                  )}
                  {fabHealth && fabHealth.anomalyAlertCount > 0 && (
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-white/50">
                        <IconAlertTriangle className="w-3 h-3" />
                        ML Anomalies
                      </div>
                      <span className="font-mono text-warning">{fabHealth.anomalyAlertCount}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white/80">
                  <IconSearch className="w-3.5 h-3.5 text-white/60" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Quick Search"
                    className="flex-1 bg-transparent outline-none placeholder:text-white/40"
                    aria-label="Quick search shipments"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="p-1 rounded-full hover:bg-white/10 transition"
                      aria-label="Clear search"
                    >
                      <IconX className="w-3.5 h-3.5 text-white/70" />
                    </button>
                  )}
                </div>
                <form
                  onSubmit={handleLocationSubmit}
                  className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white/80"
                >
                  <IconSearch className="w-3.5 h-3.5 text-white/60" />
                  <input
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                    placeholder="Location or lat,lng"
                    className="flex-1 bg-transparent outline-none placeholder:text-white/40"
                    aria-label="Search location"
                  />
                  {locationQuery && (
                    <button
                      type="button"
                      onClick={() => setLocationQuery('')}
                      className="p-1 rounded-full hover:bg-white/10 transition"
                      aria-label="Clear location search"
                    >
                      <IconX className="w-3.5 h-3.5 text-white/70" />
                    </button>
                  )}
                </form>
              </div>
              <div className="mt-4 h-40 rounded-xl border border-white/10 bg-black/60 relative overflow-hidden">
                {(liveCaptureImage || liveCaptureFallback) && (
                  <img
                    src={liveCaptureImage || liveCaptureFallback || ''}
                    alt="Live location preview"
                    className="absolute inset-0 h-full w-full object-cover"
                    width={720}
                    height={360}
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.58),rgba(0,0,0,0.08)_45%,rgba(0,0,0,0.32))]" />
                <div className="absolute top-3 right-3 text-[9px] uppercase tracking-[0.3em] text-white/60">Live Capture</div>
                <div className="absolute bottom-3 left-3 text-[11px] text-white/80">
                  {focusShipment ? `${focusShipment.origin.name} → ${focusShipment.destination.name}` : 'Awaiting focus'}
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-white/50 uppercase tracking-[0.2em]">
                  <span>Map Style</span>
                  <span className="text-[9px] text-white/40">{mapStyleId}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => rotateMapBy(-20)}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/70 hover:bg-white/10 transition"
                  >
                    -20deg
                  </button>
                  <button
                    type="button"
                    onClick={resetMapOrientation}
                    className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/80 hover:bg-white/15 transition"
                  >
                    North
                  </button>
                  <button
                    type="button"
                    onClick={() => rotateMapBy(20)}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/70 hover:bg-white/10 transition"
                  >
                    +20deg
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {MAP_STYLE_OPTIONS.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setMapStyle(style.id, true)}
                      className={`rounded-lg border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] leading-none transition min-w-0 ${mapStyleId === style.id
                          ? 'border-white/60 bg-white text-black'
                          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-white/50">Latitude</div>
                  <div className="text-[12px] text-white font-mono">
                    {focusShipment?.currentLocation?.lat?.toFixed(4) || '—'}
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-white/50">Longitude</div>
                  <div className="text-[12px] text-white font-mono">
                    {focusShipment?.currentLocation?.lng?.toFixed(4) || '—'}
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-white/50">Status</div>
                  <div className="text-[12px] text-white font-semibold">
                    {focusShipment?.statusLabel || focusShipment?.status || 'Standby'}
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-white/50">Carrier</div>
                  <div className="text-[12px] text-white font-semibold">
                    {focusShipment?.carrierId || '—'}
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 col-span-2">
                  <div className="flex items-center justify-between text-[10px] text-white/50">
                    <span>Geo Risk</span>
                    <span className={`text-[10px] font-semibold ${focusRisk.level === 'HIGH' ? 'text-critical' : focusRisk.level === 'MED' ? 'text-warning' : 'text-white/70'
                      }`}>
                      {focusRisk.level}
                    </span>
                  </div>
                  <div className="mt-1 text-[12px] text-white font-mono">
                    {focusRisk.score > 0 ? `${Math.round(focusRisk.score)} / 100` : 'Nominal'}
                  </div>
                  <div className="text-[9px] text-white/40">
                    {focusRisk.zones.length > 0 ? focusRisk.zones.join(', ') : 'Clear corridor'}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-[10px] text-white/60 uppercase tracking-[0.2em]">
                  <span>Results</span>
                  {normalizedSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="text-[10px] text-white/60 hover:text-white/80"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="mt-2 space-y-2">
                  {displayedResults.map((shipment) => (
                    <button
                      key={shipment.id}
                      type="button"
                      onClick={() => handleShipmentFocus(shipment)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition ${selectedShipment?.id === shipment.id
                        ? 'border-white/40 bg-white/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                    >
                      {(() => {
                        const risk = computeGeoRiskScore(shipment.currentLocation);
                        return (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[11px] text-white font-semibold">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: statusColors[shipment.status] || '#8a9ba8' }}
                              />
                              {shipment.trackingCode}
                            </div>
                            <div className="flex items-center gap-2 text-[9px] text-white/60">
                              <span>{shipment.statusLabel || shipment.status}</span>
                              <span className={`px-1.5 py-0.5 rounded-full border ${risk.level === 'HIGH'
                                ? 'border-critical/60 text-critical'
                                : risk.level === 'MED'
                                  ? 'border-warning/60 text-warning'
                                  : 'border-white/20 text-white/50'
                                }`}>
                                {risk.level}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="text-[9px] text-white/50">
                        {shipment.origin.name} → {shipment.destination.name}
                      </div>
                    </button>
                  ))}
                  {displayedResults.length === 0 && (
                    <div className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-[10px] text-white/50">
                      No matching shipments found.
                    </div>
                  )}
                </div>
                {locationQuery && locationMatches.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[10px] text-white/60 uppercase tracking-[0.2em]">Location Matches</div>
                    <div className="mt-2 space-y-2">
                      {locationMatches.slice(0, 3).map((shipment) => (
                        <button
                          key={`loc-${shipment.id}`}
                          type="button"
                          onClick={() => handleShipmentFocus(shipment)}
                          className="w-full text-left px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
                        >
                          <div className="text-[10px] text-white">
                            {shipment.origin.name} → {shipment.destination.name}
                          </div>
                          <div className="text-[9px] text-white/50">{shipment.trackingCode}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { window.print(); showToast('Print dialog opened'); }}
                  className="py-2 rounded-lg bg-white/10 text-white/80 text-[11px] font-semibold hover:bg-white/20 transition"
                >
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleShareOps();
                  }}
                  className="py-2 rounded-lg bg-white text-black text-[11px] font-semibold hover:bg-white/90 transition"
                >
                  Share Ops
                </button>
              </div>
            </div>
          </div>
          {showUiOverlays && !isMobileLayout && !isRightRailOpen && !hasShipmentDetailOpen && (
            <>
              <OpsIntelPanel shipments={effectiveShipments} alerts={effectiveAlerts} />
              <CarrierPerformanceIndex shipments={effectiveShipments} alerts={effectiveAlerts} />
              <MissionTimelinePanel shipments={effectiveShipments} alerts={effectiveAlerts} />
            </>
          )}
          {showUiOverlays && !isMobileLayout && visibleSelectedShipment && !hasShipmentDetailOpen && (
            <AssetDossierPanel shipment={visibleSelectedShipment} />
          )}

          {/* Toast notification */}
          {showUiOverlays && toastMsg && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-50 bg-black/90 border border-white/20 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl animate-pulse pointer-events-none">
              {toastMsg}
            </div>
          )}
        </>
      )}
    </div>
  );
}
