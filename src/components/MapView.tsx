/* @refresh reset */
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  IconArrowLeft,
  IconBell,
  IconChevronDown,
  IconEye,
  IconEyeOff,
  IconMenu2,
  IconSearch,
  IconUserCircle,
  IconX,
} from '@tabler/icons-react';
import type { Shipment, Alert } from '../types';
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
  showGeofences?: boolean;
  showRoutes?: boolean;
  showBreaches?: boolean;
  focusMode: boolean;
  onFocusModeChange: (next: boolean) => void;
}

type MapStyleId = 'darkmatter' | 'satellite' | 'streets';

const MAP_STYLE_OPTIONS: Array<{ id: MapStyleId; label: string }> = [
  { id: 'darkmatter', label: 'Darkmatter' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'streets', label: 'Streets' },
];

const MAPTILER_STYLE_IDS: Record<MapStyleId, string> = {
  darkmatter: 'dataviz-dark',
  satellite: 'satellite',
  streets: 'streets-v2',
};

const FALLBACK_STYLE_DEFINITIONS: Record<MapStyleId, StyleSpecification> = {
  darkmatter: {
    version: 8,
    sources: {
      darkmatter: {
        type: 'raster',
        tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      },
    },
    layers: [{ id: 'darkmatter', type: 'raster', source: 'darkmatter' }],
  },
  satellite: {
    version: 8,
    sources: {
      satellite: {
        type: 'raster',
        tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '&copy; Esri & contributors',
      },
    },
    layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
  },
  streets: {
    version: 8,
    sources: {
      streets: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors',
      },
    },
    layers: [{ id: 'streets', type: 'raster', source: 'streets' }],
  },
};

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
  IN_TRANSIT: '#d3e2ee',
  DELIVERED: '#0F9960',
  CRITICAL: '#FF4D4F',
  DELAYED: '#FFB000',
  HELD_CUSTOMS: '#FFB000',
};

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

const cinematicEasing = (t: number) => 1 - Math.pow(1 - t, 3);

export default function MapView({
  shipments,
  selectedShipment,
  onShipmentSelect,
  alerts,
  showGeofences = true,
  showRoutes = true,
  showBreaches = true,
  focusMode,
  onFocusModeChange,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const driftFrame = useRef<number | null>(null);
  const styleReadyFrame = useRef<number | null>(null);
  const liveCaptureInterval = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleReady, setIsStyleReady] = useState(false);
  const [styleVersion, setStyleVersion] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapStyleId, setMapStyleId] = useState<MapStyleId>('darkmatter');
  const [searchTerm, setSearchTerm] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'results' | 'similar'>('results');
  const [isRightRailOpen, setIsRightRailOpen] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [liveCaptureImage, setLiveCaptureImage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  }, []);
  const toggleFocusMode = useCallback(() => onFocusModeChange(!focusMode), [focusMode, onFocusModeChange]);
  const mapTilerKey = import.meta.env.VITE_MAPTILER_KEY;
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
    if (!mapTilerKey) return structuredClone(FALLBACK_STYLE_DEFINITIONS[mapStyleId]);
    return `https://api.maptiler.com/maps/${MAPTILER_STYLE_IDS[mapStyleId]}/style.json?key=${mapTilerKey}`;
  }, [mapStyleId, mapTilerKey]);

  const setMapStyle = useCallback((nextStyle: MapStyleId, announce = false) => {
    if (nextStyle === mapStyleId) return;
    setMapStyleId(nextStyle);
    if (announce) {
      const label = MAP_STYLE_OPTIONS.find((option) => option.id === nextStyle)?.label || nextStyle;
      showToast(`Switched to ${label}`);
    }
  }, [mapStyleId, showToast]);

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

  const handleShipmentFocus = useCallback((shipment: Shipment) => {
    onShipmentSelect(shipment);
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && !focusMode) {
      setIsRightRailOpen(false);
    }
  }, [focusMode, onShipmentSelect]);

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
  const similarShipments = useMemo(() => {
    if (!focusShipment) return shipmentsWithLocation.slice(0, 3);
    const pool = shipmentsWithLocation.filter((shipment) => shipment.id !== focusShipment.id);
    const byCarrier = pool.filter((shipment) => shipment.carrierId === focusShipment.carrierId);
    const byStatus = pool.filter((shipment) => shipment.status === focusShipment.status && shipment.carrierId !== focusShipment.carrierId);
    const remainder = pool.filter((shipment) => shipment.carrierId !== focusShipment.carrierId && shipment.status !== focusShipment.status);
    return [...byCarrier, ...byStatus, ...remainder].slice(0, 3);
  }, [focusShipment, shipmentsWithLocation]);
  const similarPreviewImages = useMemo(() => {
    const entries = similarShipments.map((shipment) => [
      shipment.id,
      buildRoutePreviewImage(shipment, { width: 560, height: 180, bright: isBrightPreview }),
    ] as const);
    return Object.fromEntries(entries);
  }, [similarShipments, isBrightPreview, styleVersion]);

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

  const getOverlayInsertBeforeId = useCallback((mapInstance: maplibregl.Map) => {
    const layers = mapInstance.getStyle().layers || [];
    const labelLayer = layers.find((layer) => layer.type === 'symbol' && (layer.layout as any)?.['text-field']);
    return labelLayer?.id;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
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
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (focusMode) {
      setIsRightRailOpen(true);
    }
  }, [focusMode]);

  useEffect(() => {
    if (!map.current || !isLoaded) return;
    const mapInstance = map.current;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      const isInteracting =
        mapInstance.isMoving() ||
        mapInstance.isRotating() ||
        mapInstance.isZooming() ||
        (mapInstance as any).isPitching?.();

      if (!isInteracting) {
        const bearing = mapInstance.getBearing();
        mapInstance.setBearing(bearing + delta * 0.003);
      }

      driftFrame.current = requestAnimationFrame(tick);
    };

    driftFrame.current = requestAnimationFrame(tick);
    return () => {
      if (driftFrame.current) {
        cancelAnimationFrame(driftFrame.current);
        driftFrame.current = null;
      }
    };
  }, [isLoaded]);

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
        zoom: 1.8,
        pitch: 45,
        bearing: -20,
        antialias: true,
        maxPitch: 65,
        fadeDuration: 0,
      });
      map.current = mapInstance;

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

      // Add navigation controls
      mapInstance.addControl(
        new maplibregl.NavigationControl(),
        'top-right'
      );

      handleLoad = () => {
        console.log('Map loaded successfully');
        setIsLoaded(true);
      };

      handleStyleLoading = () => {
        setIsStyleReady(false);
      };

      handleStyleLoad = () => {
        if (mapInstance?.isStyleLoaded()) {
          setIsStyleReady(true);
          setStyleVersion((current) => current + 1);
        }
      };
      handleStyleData = () => {
        if (mapInstance?.isStyleLoaded()) {
          setIsStyleReady(true);
          setStyleVersion((current) => current + 1);
        }
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
  }, []);

  // Route deviation heatmap layer
  useEffect(() => {
    if (!map.current || !isLoaded || !isStyleReady || !map.current.isStyleLoaded()) return;
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
    if (!map.current || !isLoaded || !isStyleReady || !map.current.isStyleLoaded()) return;
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
    if (!map.current || !isLoaded || !isStyleReady || !map.current.isStyleLoaded()) return;
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
    if (!map.current || !isLoaded || !isStyleReady || !map.current.isStyleLoaded()) return;
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
    if (!map.current || !isLoaded || !isStyleReady || !map.current.isStyleLoaded()) return;
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
    if (!map.current || !isLoaded || !isStyleReady || !map.current.isStyleLoaded()) return;
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

  // Swap map style without animation
  useEffect(() => {
    if (!map.current) return;
    setIsStyleReady(false);
    setLoadError(null);
    map.current.setStyle(styleDefinition, { diff: false });

    const startedAt = Date.now();
    const waitForStyleReady = () => {
      if (!map.current) return;
      if (map.current.isStyleLoaded()) {
        setIsStyleReady(true);
        setStyleVersion((current) => current + 1);
        styleReadyFrame.current = null;
        return;
      }
      if (Date.now() - startedAt > 7000) {
        styleReadyFrame.current = null;
        return;
      }
      styleReadyFrame.current = requestAnimationFrame(waitForStyleReady);
    };
    styleReadyFrame.current = requestAnimationFrame(waitForStyleReady);

    return () => {
      if (styleReadyFrame.current) {
        cancelAnimationFrame(styleReadyFrame.current);
        styleReadyFrame.current = null;
      }
    };
  }, [styleDefinition]);

  // Add/update markers
  useEffect(() => {
    if (!map.current || !isLoaded || !isStyleReady || !map.current.isStyleLoaded()) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    effectiveShipments.forEach(shipment => {
      if (!shipment.currentLocation) return;

      const hasCriticalAlert = effectiveAlerts.some(
        a => a.shipmentId === shipment.id && a.severity === 'CRITICAL' && !a.acknowledged
      );
      const color = hasCriticalAlert ? '#FF4D4F' : statusColors[shipment.status] || '#8a9ba8';
      const isSelected = selectedShipment?.id === shipment.id;
      const geoRisk = computeGeoRiskScore(shipment.currentLocation);
      const markerTheme = overlayPalette.isBright ? ' is-bright' : ' is-dark';

      const el = document.createElement('div');
      el.className = `map-marker${isSelected ? ' is-selected' : ''}${hasCriticalAlert ? ' is-critical' : ''}${geoRisk.level === 'HIGH' ? ' risk-high' : geoRisk.level === 'MED' ? ' risk-med' : ''
        }${markerTheme}`;
      el.style.setProperty('--marker-color', color);

      el.addEventListener('click', () => onShipmentSelect(shipment));

      const marker = new maplibregl.Marker(el)
        .setLngLat([shipment.currentLocation.lng, shipment.currentLocation.lat])
        .addTo(map.current!);

      const popup = new maplibregl.Popup({ offset: 25, closeButton: false })
        .setHTML(`
          <div style="font-family: sans-serif; min-width: 180px;">
            <div style="font-weight: bold; font-size: 14px;">${shipment.trackingCode}</div>
            <div style="font-size: 12px; color: #666;">${shipment.origin.name} → ${shipment.destination.name}</div>
            <div style="font-size: 12px; margin-top: 4px; color: ${color};">${shipment.status}</div>
          </div>
        `);

      marker.setPopup(popup);
      markers.current.push(marker);
    });
  }, [effectiveShipments, selectedShipment, effectiveAlerts, isLoaded, isStyleReady, onShipmentSelect, overlayPalette, styleVersion]);

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
            <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between gap-3 pointer-events-none">
              <div className="flex items-center gap-3 pointer-events-auto">
                <div className="flex items-center gap-2 bg-black/80 border border-white/10 px-3 py-2 rounded-full shadow-xl">
                  <button className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition">
                    <IconArrowLeft className="w-4 h-4 text-white" />
                  </button>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.35em] text-white/60">Project</div>
                    <div className="text-[12px] font-semibold text-white">Transvec Ops Grid</div>
                  </div>
                  <form
                    onSubmit={(event) => event.preventDefault()}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-[11px] text-white/80"
                  >
                    <IconSearch className="w-3.5 h-3.5" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Quick Search"
                      className="bg-transparent outline-none placeholder:text-white/50 w-36"
                      aria-label="Quick search shipments"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="p-1 rounded-full hover:bg-white/20 transition"
                        aria-label="Clear search"
                      >
                        <IconX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </form>
                </div>
                <div className="hidden md:flex items-center gap-2 text-[10px] text-white/70">
                  <span className="px-2 py-1 rounded-full bg-white/10">Click to go back</span>
                  <span className="px-2 py-1 rounded-full bg-white/5">Hold for history</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pointer-events-auto">
                <form
                  onSubmit={handleLocationSubmit}
                  className="hidden lg:flex items-center gap-2 bg-black/85 border border-white/10 px-4 py-2 rounded-full text-[11px] text-white/80 shadow-xl"
                >
                  <IconSearch className="w-4 h-4" />
                  <input
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                    placeholder="Search location or lat,lng"
                    className="bg-transparent outline-none placeholder:text-white/40 w-44"
                    aria-label="Search location"
                  />
                  {locationQuery && (
                    <button
                      type="button"
                      onClick={() => setLocationQuery('')}
                      className="p-1 rounded-full hover:bg-white/10 transition"
                      aria-label="Clear location search"
                    >
                      <IconX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </form>
                <button
                  onClick={() => showToast('Alerts panel available in sidebar → ALERTS tab')}
                  className="h-9 px-3 rounded-full bg-white/10 text-[11px] text-white/80 border border-white/10 hover:bg-white/20 transition hidden sm:inline-flex items-center gap-2"
                >
                  <IconBell className="w-4 h-4" />
                  Alerts
                </button>
                <button
                  onClick={() => showToast('Operator profile available in sidebar')}
                  className="flex items-center gap-2 bg-black/85 border border-white/10 px-3 py-1.5 rounded-full shadow-xl hover:bg-white/5 transition"
                >
                  <IconUserCircle className="w-6 h-6 text-white/80" />
                  <span className="text-[11px] text-white/80 hidden sm:inline">Ops Analyst</span>
                  <IconChevronDown className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>
          )}

          {showUiOverlays && !isRightRailOpen && (
            <button
              onClick={() => setIsRightRailOpen(true)}
              className="lg:hidden absolute top-24 right-4 z-30 flex items-center gap-2 px-3 py-2 rounded-full bg-black/80 border border-white/10 text-white/80 text-[11px] shadow-xl"
            >
              <IconMenu2 className="w-4 h-4" />
              Panel
            </button>
          )}



          {showUiOverlays && (
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
            className={`absolute top-20 right-4 z-10 w-[min(92vw,22rem)] sm:w-80 bg-black/85 border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 max-h-[calc(100vh-6rem)] overflow-y-auto ${isRightRailOpen
              ? 'translate-x-0 opacity-100 pointer-events-auto'
              : 'translate-x-[120%] opacity-0 pointer-events-none'
              } lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto`}
          >
            <div className="flex items-center justify-between px-4 pt-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('results')}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${activeTab === 'results'
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                >
                  Results
                </button>
                <button
                  onClick={() => setActiveTab('similar')}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${activeTab === 'similar'
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                >
                  Similar Images
                </button>
              </div>
              <div className="flex items-center gap-2">
                {normalizedSearchTerm && (
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                    {filteredShipments.length} Hits
                  </span>
                )}
                <button
                  onClick={toggleFocusMode}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${focusMode ? 'bg-white text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                >
                  {focusMode ? <IconEyeOff className="w-3 h-3" /> : <IconEye className="w-3 h-3" />}
                  Focus
                </button>
                <button className="text-[10px] uppercase tracking-[0.2em] text-white/60 hidden sm:inline">
                  Beta
                </button>
                <button
                  onClick={() => setIsRightRailOpen(false)}
                  className={`lg:hidden p-1 rounded-full hover:bg-white/10 text-white/70 ${focusMode ? 'hidden' : ''}`}
                  aria-label="Close panel"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="px-4 pb-4">
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
                  {MAP_STYLE_OPTIONS.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setMapStyle(style.id, true)}
                      className={`rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] transition ${mapStyleId === style.id
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
              {activeTab === 'results' ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] text-white/60 uppercase tracking-[0.2em]">
                    <span>Results</span>
                    {normalizedSearchTerm && (
                      <button
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
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="text-[10px] text-white/60 uppercase tracking-[0.2em]">Similar routes</div>
                  {similarShipments.map((shipment) => {
                    const preview = similarPreviewImages[shipment.id] || null;
                    return (
                      <button
                        key={`similar-${shipment.id}`}
                        onClick={() => handleShipmentFocus(shipment)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 overflow-hidden text-left hover:bg-white/10 transition"
                      >
                        <div className="relative h-20 bg-black/70">
                          {preview && (
                            <img
                              src={preview}
                              alt={`${shipment.trackingCode} route preview`}
                              className="absolute inset-0 h-full w-full object-cover"
                              width={560}
                              height={180}
                              loading="lazy"
                            />
                          )}
                          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.82),transparent_70%)]" />
                          <div className="absolute bottom-2 left-2 text-[10px] font-semibold text-white">
                            {shipment.trackingCode}
                          </div>
                        </div>
                        <div className="px-3 py-2 text-[10px] text-white/75">
                          <div>{shipment.origin.name} → {shipment.destination.name}</div>
                          <div className="text-white/50">{shipment.statusLabel || shipment.status}</div>
                        </div>
                      </button>
                    );
                  })}
                  {similarShipments.length === 0 && (
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-white/50">
                      No similar routes found.
                    </div>
                  )}
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => { window.print(); showToast('Print dialog opened'); }}
                  className="py-2 rounded-lg bg-white/10 text-white/80 text-[11px] font-semibold hover:bg-white/20 transition"
                >
                  Export PDF
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); showToast('URL copied to clipboard'); }}
                  className="py-2 rounded-lg bg-white text-black text-[11px] font-semibold hover:bg-white/90 transition"
                >
                  Share Ops
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-white/50">
                <span>How did we do?</span>
                <div className="flex gap-2">
                  <button className="w-7 h-7 rounded-full bg-white/10">🙂</button>
                  <button className="w-7 h-7 rounded-full bg-white/10">😐</button>
                  <button className="w-7 h-7 rounded-full bg-white/10">😕</button>
                </div>
              </div>
            </div>
          </div>
          {showUiOverlays && !isRightRailOpen && (
            <>
              <OpsIntelPanel shipments={effectiveShipments} alerts={effectiveAlerts} />
              <CarrierPerformanceIndex shipments={effectiveShipments} alerts={effectiveAlerts} />
              <MissionTimelinePanel shipments={effectiveShipments} alerts={effectiveAlerts} />
            </>
          )}
          {showUiOverlays && visibleSelectedShipment && <AssetDossierPanel shipment={visibleSelectedShipment} />}

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
