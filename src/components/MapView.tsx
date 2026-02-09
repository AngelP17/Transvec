import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Shipment, Alert } from '../types';
import OpsIntelPanel from './OpsIntelPanel';
import AssetDossierPanel from './AssetDossierPanel';
import CarrierPerformanceIndex from './CarrierPerformanceIndex';
import MissionTimelinePanel from './MissionTimelinePanel';

interface MapViewProps {
  shipments: Shipment[];
  selectedShipment: Shipment | null;
  onShipmentSelect: (shipment: Shipment) => void;
  alerts: Alert[];
}

// Status colors
const statusColors: Record<string, string> = {
  SCHEDULED: '#8a9ba8',
  IN_TRANSIT: '#2D72D2',
  DELIVERED: '#0F9960',
  CRITICAL: '#FF4D4F',
  DELAYED: '#FFB000',
  HELD_CUSTOMS: '#FFB000',
};

export default function MapView({ shipments, selectedShipment, onShipmentSelect, alerts }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleReady, setIsStyleReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapStyleId, setMapStyleId] = useState<'darkmatter' | 'satellite' | 'streets'>('darkmatter');
  const mapTilerKey = import.meta.env.VITE_MAPTILER_KEY;

  const styleUrl = useMemo(() => {
    if (!mapTilerKey) return 'https://demotiles.maplibre.org/style.json';
    return `https://api.maptiler.com/maps/${mapStyleId}/style.json?key=${mapTilerKey}`;
  }, [mapStyleId, mapTilerKey]);

  const deviationGeoJson = useMemo(() => {
    const features = alerts
      .filter((alert) => alert.type === 'ROUTE_DEVIATION' || alert.type === 'GEOFENCE_BREACH')
      .map((alert) => {
        const shipment = shipments.find((item) => item.id === alert.shipmentId);
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

    return {\n      type: 'FeatureCollection',\n      features,\n    } as GeoJSON.FeatureCollection;\n  }, [alerts, shipments]);

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
    let handleStyleData: (() => void) | null = null;
    let handleError: ((e: ErrorEvent) => void) | null = null;

    try {
      mapInstance = new maplibregl.Map({
        container: mapContainer.current,
        style: styleUrl,
        center: [-95, 35],
        zoom: 3,
        fadeDuration: 0,
      });
      map.current = mapInstance;

      console.log('Map instance created');

      // Add navigation controls
      mapInstance.addControl(
        new maplibregl.NavigationControl(),
        'top-right'
      );

      handleLoad = () => {
        console.log('Map loaded successfully');
        setIsLoaded(true);
        setIsStyleReady(true);
      };

      handleStyleLoading = () => {
        setIsStyleReady(false);
      };

      handleStyleData = () => {
        if (mapInstance?.isStyleLoaded()) {
          setIsStyleReady(true);
        }
      };

      handleError = (e: ErrorEvent) => {
        console.error('Map error:', e);
        setLoadError('Map error: ' + (e.error?.message || 'Unknown'));
      };

      mapInstance.on('load', handleLoad);
      mapInstance.on('styleloading', handleStyleLoading);
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
    if (!map.current || !isLoaded || !isStyleReady) return;
    const mapInstance = map.current;
    const sourceId = 'route-deviation-source';
    const layerId = 'route-deviation-heat';
    const pointLayerId = 'route-deviation-points';

    if (!mapInstance.getSource(sourceId)) {
      mapInstance.addSource(sourceId, {\n        type: 'geojson',\n        data: deviationGeoJson,\n      });\n\n      mapInstance.addLayer({\n        id: layerId,\n        type: 'heatmap',\n        source: sourceId,\n        paint: {\n          'heatmap-weight': [\n            'case',\n            ['==', ['get', 'severity'], 'CRITICAL'], 1,\n            ['==', ['get', 'severity'], 'WARNING'], 0.6,\n            0.3,\n          ],\n          'heatmap-intensity': 1.2,\n          'heatmap-color': [\n            'interpolate',\n            ['linear'],\n            ['heatmap-density'],\n            0, 'rgba(0,0,0,0)',\n            0.3, 'rgba(255, 176, 0, 0.3)',\n            0.6, 'rgba(255, 77, 79, 0.5)',\n            1, 'rgba(255, 77, 79, 0.8)',\n          ],\n          'heatmap-radius': 24,\n          'heatmap-opacity': 0.65,\n        },\n      });\n\n      mapInstance.addLayer({\n        id: pointLayerId,\n        type: 'circle',\n        source: sourceId,\n        paint: {\n          'circle-radius': 6,\n          'circle-color': [\n            'case',\n            ['==', ['get', 'severity'], 'CRITICAL'], '#FF4D4F',\n            ['==', ['get', 'severity'], 'WARNING'], '#FFB000',\n            '#2D72D2',\n          ],\n          'circle-stroke-color': '#10161a',\n          'circle-stroke-width': 1.5,\n        },\n      });\n    } else {\n      const source = mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource;\n      source.setData(deviationGeoJson);\n    }\n  }, [deviationGeoJson, isLoaded, isStyleReady]);

  // Swap map style without animation
  useEffect(() => {
    if (!map.current || !mapTilerKey) return;
    setIsStyleReady(false);
    setLoadError(null);
    map.current.setStyle(styleUrl, { diff: false });
  }, [mapTilerKey, styleUrl]);

  // Add/update markers
  useEffect(() => {
    if (!map.current || !isLoaded || !isStyleReady || !map.current.isStyleLoaded()) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    shipments.forEach(shipment => {
      if (!shipment.currentLocation) return;

      const hasCriticalAlert = alerts.some(
        a => a.shipmentId === shipment.id && a.severity === 'CRITICAL' && !a.acknowledged
      );
      const color = hasCriticalAlert ? '#FF4D4F' : statusColors[shipment.status] || '#8a9ba8';
      const isSelected = selectedShipment?.id === shipment.id;

      const el = document.createElement('div');
      el.style.cssText = `
        width: 20px;
        height: 20px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        transform: ${isSelected ? 'scale(1.3)' : 'scale(1)'};
        transition: none;
      `;
      
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
  }, [shipments, selectedShipment, alerts, isLoaded, isStyleReady, onShipmentSelect]);

  // Jump to selected shipment (no animation)
  useEffect(() => {
    if (map.current && selectedShipment?.currentLocation) {
      map.current.jumpTo({
        center: [selectedShipment.currentLocation.lng, selectedShipment.currentLocation.lat],
        zoom: 8,
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
          <div className="absolute top-4 right-4 z-10 bg-void-lighter/90 border border-border p-1 rounded-lg shadow-xl">
            <div className="flex items-center gap-1">
              {[
                { id: 'darkmatter', label: 'Darkmatter' },
                { id: 'satellite', label: 'Satellite' },
                { id: 'streets', label: 'Streets' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setMapStyleId(style.id as 'darkmatter' | 'satellite' | 'streets')}
                  className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wider rounded transition-colors ${
                    mapStyleId === style.id
                      ? 'bg-accent text-white'
                      : 'text-text-muted hover:text-text-bright hover:bg-border'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
          <div className="absolute top-4 left-4 z-10 bg-void-lighter/90 border border-border p-3 rounded-lg shadow-xl pointer-events-none">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] text-text-muted mb-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              LIVE FEED
            </div>
            <div className="text-xl font-mono text-text-bright">{shipments.length * 137} ASSETS</div>
            <div className="text-[10px] text-text-muted tracking-wider">TRACKED IN REAL-TIME</div>
          </div>

          <div className="absolute bottom-4 left-4 z-10 bg-void-lighter/90 border border-border p-3 rounded-lg shadow-xl pointer-events-none">
            <div className="text-[10px] font-bold tracking-[0.3em] text-text-muted mb-2">STATUS</div>
            {Object.entries(statusColors).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-text-bright">{status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>

          <OpsIntelPanel shipments={shipments} alerts={alerts} />
          <CarrierPerformanceIndex shipments={shipments} alerts={alerts} />
          <MissionTimelinePanel shipments={shipments} alerts={alerts} />
          {selectedShipment && <AssetDossierPanel shipment={selectedShipment} />}
        </>
      )}
    </div>
  );
}
