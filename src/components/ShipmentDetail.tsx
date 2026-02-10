import { mockJourneyLegs, mockSensors, mockCarriers } from '../data/mockData';
import { computeEtaBand } from '../lib/etaBands';
import type { Shipment } from '../types';

interface ShipmentDetailProps {
  shipment: Shipment;
  onClose: () => void;
  onOpenDVR: () => void;
}

const statusColors: Record<string, string> = {
  SCHEDULED: '#8a9ba8',
  IN_TRANSIT: '#2D72D2',
  DELIVERED: '#0F9960',
  CRITICAL: '#FF4D4F',
  DELAYED: '#FFB000',
  HELD_CUSTOMS: '#FFB000',
};

export default function ShipmentDetail({ shipment, onClose, onOpenDVR }: ShipmentDetailProps) {
  const sensors = mockSensors.filter(s => s.shipmentId === shipment.id);
  const journeyLegs = mockJourneyLegs.filter(leg => leg.trackingCode === shipment.trackingCode);
  const etaBand = computeEtaBand(shipment);

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[400px] bg-void-lighter border-l border-border shadow-2xl z-20 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-void-lighter border-b border-border p-4 z-10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-text-bright">{shipment.trackingCode}</h2>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-border rounded text-text-muted hover:text-text-bright transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <span 
            className="px-2 py-0.5 rounded text-xs font-bold"
            style={{ 
              backgroundColor: `${statusColors[shipment.status]}20`,
              color: statusColors[shipment.status]
            }}
          >
            {shipment.status.replace('_', ' ')}
          </span>
          <span className="text-xs text-text-muted">
            {shipment.origin.name} → {shipment.destination.name}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Digital Thread */}
        {shipment.dossier && (
          <section>
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Digital Thread</h3>
            <div className="bg-code-bg border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">YieldOps Job</span>
                <span className="font-mono text-accent">{shipment.dossier.linkedJobId}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Client</span>
                <span className="text-text-bright">{shipment.dossier.client}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Contents</span>
                <span className="text-text-bright">{shipment.dossier.contents}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Carrier</span>
                <span className="text-text-bright">{shipment.dossier.carrier}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Route</span>
                <span className="text-text-bright">{shipment.dossier.route}</span>
              </div>
            </div>
          </section>
        )}

        {/* ETA Confidence */}
        <section>
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">ETA Confidence Band</h3>
          <div className="bg-code-bg border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Lower Bound</span>
              <span className="font-mono text-text-bright">{etaBand.lowHours}h</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Most Likely</span>
              <span className="font-mono text-accent">{etaBand.midHours}h</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Upper Bound</span>
              <span className="font-mono text-text-bright">{etaBand.highHours}h</span>
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] text-text-muted">
                <span>Confidence</span>
                <span className="font-mono text-text-bright">{Math.round(etaBand.confidence * 100)}%</span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${etaBand.confidence * 100}%` }}
                />
              </div>
            </div>
          </div>
        </section>
        {/* Current Telemetry */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Live Telemetry</h3>
            <button 
              onClick={onOpenDVR}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/30 rounded text-xs text-accent hover:bg-accent/20 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              OPEN DVR
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <TelemetryCard 
              label="Shock"
              value={shipment.telemetry.shock?.toFixed(2) || '0.00'}
              unit="G"
              status={shipment.telemetry.shock && shipment.telemetry.shock > 3 ? 'critical' : 'normal'}
              icon="📳"
            />
            <TelemetryCard 
              label="Temperature"
              value={shipment.telemetry.temperature?.toFixed(1) || '0.0'}
              unit="°C"
              status={shipment.telemetry.temperature && shipment.telemetry.temperature > 25 ? 'warning' : 'normal'}
              icon="🌡️"
            />
            <TelemetryCard 
              label="Humidity"
              value={shipment.telemetry.humidity?.toFixed(0) || '0'}
              unit="%"
              status="normal"
              icon="💧"
            />
            <TelemetryCard 
              label="Vibration"
              value={shipment.telemetry.vibration?.toFixed(0) || '0'}
              unit="Hz"
              status={shipment.telemetry.vibration && shipment.telemetry.vibration > 100 ? 'warning' : 'normal'}
              icon="〰️"
            />
          </div>
        </section>

        {/* GPS Location */}
        <section>
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Current Location</h3>
          <div className="bg-code-bg border border-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span className="text-sm text-text-bright">GPS Coordinates</span>
            </div>
            {shipment.currentLocation ? (
              <div className="font-mono text-sm text-text-muted">
                <div>Lat: {shipment.currentLocation.lat.toFixed(6)}</div>
                <div>Lng: {shipment.currentLocation.lng.toFixed(6)}</div>
              </div>
            ) : (
              <div className="text-sm text-text-muted">Location unavailable</div>
            )}
          </div>
        </section>

        {/* Journey Timeline */}
        <section>
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Multi-Modal Journey</h3>
          <div className="space-y-3">
            {journeyLegs.length === 0 && (
              <div className="text-sm text-text-muted">No journey legs recorded yet.</div>
            )}
            {journeyLegs.map((leg, index) => (
              <div key={leg.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm
                    ${leg.status === 'COMPLETE' ? 'bg-success/20 text-success' : 'bg-accent/20 text-accent'}
                  `}>
                    {leg.type === 'AIR' && '✈️'}
                    {leg.type === 'SEA' && '🚢'}
                    {leg.type === 'LAND' && '🚛'}
                  </div>
                  {index < journeyLegs.length - 1 && (
                    <div className="w-0.5 h-full bg-border mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-bright">{leg.carrier}</span>
                    <span className={`
                      text-xs px-2 py-0.5 rounded
                      ${leg.status === 'COMPLETE' ? 'bg-success/20 text-success' : 'bg-accent/20 text-accent'}
                    `}>
                      {leg.status}
                    </span>
                  </div>
                  <div className="text-sm text-text-muted">{leg.trackingCode}</div>
                  <div className="text-xs text-text-muted mt-1">
                    {leg.origin} → {leg.destination}
                  </div>
                  {leg.duration && (
                    <div className="text-xs text-text-muted">
                      Duration: {Math.floor(leg.duration / 60)}h {leg.duration % 60}m
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sensors */}
        <section>
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Active Sensors</h3>
          <div className="space-y-2">
            {sensors.map(sensor => (
              <div key={sensor.id} className="flex items-center justify-between bg-code-bg border border-border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className={`
                    w-2 h-2 rounded-full
                    ${sensor.status === 'ACTIVE' ? 'bg-success animate-pulse' : sensor.status === 'ERROR' ? 'bg-critical' : 'bg-text-muted'}
                  `} />
                  <span className="text-sm text-text-bright">{sensor.sensorId}</span>
                </div>
                <span className={`
                  text-xs px-2 py-0.5 rounded
                  ${sensor.status === 'ACTIVE' ? 'bg-success/20 text-success' : sensor.status === 'ERROR' ? 'bg-critical/20 text-critical' : 'bg-text-muted/20 text-text-muted'}
                `}>
                  {sensor.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Wafer Lots */}
        <section>
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Wafer Lots</h3>
          <div className="space-y-2">
            {shipment.waferLotIds.map((lotId) => (
              <div key={lotId} className="flex items-center justify-between bg-code-bg border border-border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💎</span>
                  <div>
                    <div className="text-sm text-text-bright">{lotId}</div>
                    <div className="text-xs text-text-muted">3nm Process Node</div>
                  </div>
                </div>
                <span className="text-sm font-mono text-success">$2.5M</span>
              </div>
            ))}
          </div>
        </section>

        {/* Actions */}
        <section>
          <div className="flex gap-2">
            <ContactCarrierButton shipment={shipment} />
            <DownloadReportButton shipment={shipment} />
          </div>
        </section>
      </div>
    </div>
  );
}

function ContactCarrierButton({ shipment }: { shipment: Shipment }) {
  const carrier = mockCarriers.find(c => c.id === shipment.carrierId);
  const carrierName = carrier?.name || 'Unknown Carrier';
  
  return (
    <button 
      onClick={() => alert(`Contacting carrier for ${shipment.trackingCode}...\n\nCarrier: ${carrierName}\nPhone: +1 (555) 0123-4567\nEmail: dispatch@${carrierName.toLowerCase().replace(/\s/g, '')}.log`)}
      className="flex-1 px-4 py-2 bg-accent text-white text-sm font-bold rounded hover:bg-accent-hover transition-colors"
    >
      CONTACT CARRIER
    </button>
  );
}

function DownloadReportButton({ shipment }: { shipment: Shipment }) {
  const carrier = mockCarriers.find(c => c.id === shipment.carrierId);
  
  return (
    <button 
      onClick={() => {
        const reportData = {
          shipmentId: shipment.id,
          trackingCode: shipment.trackingCode,
          carrier: carrier?.name || 'Unknown',
          origin: shipment.origin.name,
          destination: shipment.destination.name,
          status: shipment.status,
          telemetry: shipment.telemetry,
          generatedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${shipment.trackingCode}_report_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }}
      className="flex-1 px-4 py-2 bg-void border border-border text-text-bright text-sm rounded hover:bg-border transition-colors"
    >
      DOWNLOAD REPORT
    </button>
  );
}

interface TelemetryCardProps {
  label: string;
  value: string;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  icon: string;
}

function TelemetryCard({ label, value, unit, status, icon }: TelemetryCardProps) {
  const statusColors = {
    normal: 'border-border',
    warning: 'border-warning/50 bg-warning/5',
    critical: 'border-critical/50 bg-critical/5',
  };

  const valueColors = {
    normal: 'text-text-bright',
    warning: 'text-warning',
    critical: 'text-critical',
  };

  return (
    <div className={`bg-code-bg border ${statusColors[status]} rounded-lg p-3`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="text-sm">{icon}</span>
      </div>
      <div className={`text-xl font-mono font-bold ${valueColors[status]}`}>
        {value}
        <span className="text-sm text-text-muted ml-1">{unit}</span>
      </div>
    </div>
  );
}
