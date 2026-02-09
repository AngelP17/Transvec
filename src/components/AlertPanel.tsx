import { useState } from 'react';
import type { Alert } from '../types';

interface AlertPanelProps {
  alerts: Alert[];
  onAlertClick: (alert: Alert) => void;
  selectedAlert: Alert | null;
  onAcknowledgeAlert?: (alertId: string) => void;
}

const severityConfig = {
  CRITICAL: {
    color: '#FF4D4F',
    bgColor: 'bg-critical/10',
    borderColor: 'border-critical/30',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" x2="12" y1="8" y2="12"/>
        <line x1="12" x2="12.01" y1="16" y2="16"/>
      </svg>
    ),
  },
  WARNING: {
    color: '#FFB000',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" x2="12" y1="9" y2="13"/>
        <line x1="12" x2="12.01" y1="17" y2="17"/>
      </svg>
    ),
  },
  INFO: {
    color: '#2D72D2',
    bgColor: 'bg-accent/10',
    borderColor: 'border-accent/30',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" x2="12" y1="16" y2="12"/>
        <line x1="12" x2="12.01" y1="8" y2="8"/>
      </svg>
    ),
  },
};

const alertTypeLabels: Record<string, string> = {
  ROUTE_DEVIATION: 'Route Deviation',
  SHOCK_THRESHOLD: 'Shock Threshold',
  TEMPERATURE_EXCURSION: 'Temperature Excursion',
  GEOFENCE_BREACH: 'Geofence Breach',
  DELAYED_ARRIVAL: 'Delayed Arrival',
  SENSOR_OFFLINE: 'Sensor Offline',
};

export default function AlertPanel({ alerts, onAlertClick, selectedAlert, onAcknowledgeAlert }: AlertPanelProps) {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  const handleAcknowledge = (e: React.MouseEvent, alertId: string) => {
    e.stopPropagation();
    setAcknowledgedIds(prev => new Set(prev).add(alertId));
    onAcknowledgeAlert?.(alertId);
  };

  const isAlertAcknowledged = (alert: Alert) => alert.acknowledged || acknowledgedIds.has(alert.id);

  const filteredAlerts = alerts.filter(alert => {
    if (filter !== 'ALL' && alert.severity !== filter) return false;
    if (!showAcknowledged && isAlertAcknowledged(alert)) return false;
    return true;
  });

  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'CRITICAL' && !a.acknowledged).length,
    warning: alerts.filter(a => a.severity === 'WARNING' && !a.acknowledged).length,
    info: alerts.filter(a => a.severity === 'INFO' && !a.acknowledged).length,
  };

  return (
    <div className="relative w-full h-full bg-void p-4 overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-bright mb-2">Alert Center</h2>
        <p className="text-text-muted text-sm">Real-time anomaly detection and incident management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <button 
          onClick={() => setFilter('ALL')}
          className={`p-4 rounded-lg border transition-all ${filter === 'ALL' ? 'bg-void-lighter border-accent' : 'bg-void-lighter/50 border-border hover:border-text-muted'}`}
        >
          <div className="text-2xl font-mono text-text-bright">{stats.total}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Total</div>
        </button>
        <button 
          onClick={() => setFilter('CRITICAL')}
          className={`p-4 rounded-lg border transition-all ${filter === 'CRITICAL' ? 'bg-critical/10 border-critical' : 'bg-void-lighter/50 border-border hover:border-critical/50'}`}
        >
          <div className="text-2xl font-mono text-critical">{stats.critical}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Critical</div>
        </button>
        <button 
          onClick={() => setFilter('WARNING')}
          className={`p-4 rounded-lg border transition-all ${filter === 'WARNING' ? 'bg-warning/10 border-warning' : 'bg-void-lighter/50 border-border hover:border-warning/50'}`}
        >
          <div className="text-2xl font-mono text-warning">{stats.warning}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Warning</div>
        </button>
        <button 
          onClick={() => setFilter('INFO')}
          className={`p-4 rounded-lg border transition-all ${filter === 'INFO' ? 'bg-accent/10 border-accent' : 'bg-void-lighter/50 border-border hover:border-accent/50'}`}
        >
          <div className="text-2xl font-mono text-accent">{stats.info}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Info</div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
            <input 
              type="checkbox" 
              checked={showAcknowledged}
              onChange={(e) => setShowAcknowledged(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-void-lighter text-accent focus:ring-accent"
            />
            Show acknowledged
          </label>
        </div>
        <div className="text-sm text-text-muted">
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p>No alerts matching current filters</p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const config = severityConfig[alert.severity];
            const isSelected = selectedAlert?.id === alert.id;
            
            return (
              <div
                key={alert.id}
                onClick={() => onAlertClick(alert)}
                className={`
                  p-4 rounded-lg border cursor-pointer transition-all
                  ${config.bgColor} ${config.borderColor}
                  ${isSelected ? 'ring-2 ring-offset-2 ring-offset-void ring-accent' : ''}
                  hover:brightness-110
                `}
              >
                <div className="flex items-start gap-3">
                  <div style={{ color: config.color }}>
                    {config.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{ backgroundColor: config.color, color: '#fff' }}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-xs text-text-muted">
                        {alertTypeLabels[alert.type] || alert.type}
                      </span>
                      {isAlertAcknowledged(alert) && (
                        <span className="text-[10px] text-success flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          ACK
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-text-bright mb-2">{alert.message}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span className="font-mono">{alert.shipmentId}</span>
                      <span>•</span>
                      <span>{formatTimestamp(alert.timestamp)}</span>
                    </div>
                  </div>
                  
                  {!isAlertAcknowledged(alert) && (
                    <button 
                      onClick={(e) => handleAcknowledge(e, alert.id)}
                      className="px-3 py-1.5 bg-void-lighter border border-border rounded text-xs text-text-bright hover:bg-border transition-colors"
                    >
                      Ack
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Alert Detail Panel */}
      {selectedAlert && (
        <div className="mt-6 p-4 bg-void-lighter border border-border rounded-lg">
          <h3 className="font-bold text-text-bright mb-3">Alert Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Alert ID:</span>
              <span className="font-mono text-text-bright">{selectedAlert.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Shipment:</span>
              <span className="font-mono text-text-bright">{selectedAlert.shipmentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Type:</span>
              <span className="text-text-bright">{alertTypeLabels[selectedAlert.type]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Severity:</span>
              <span style={{ color: severityConfig[selectedAlert.severity].color }}>
                {selectedAlert.severity}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Timestamp:</span>
              <span className="font-mono text-text-bright">{selectedAlert.timestamp.toISOString()}</span>
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <button 
              onClick={() => {
                const shipment = alerts.find(a => a.id === selectedAlert.id);
                if (shipment) {
                  onAlertClick(selectedAlert);
                }
              }}
              className="flex-1 px-4 py-2 bg-accent text-white text-sm font-bold rounded hover:bg-accent-hover transition-colors"
            >
              VIEW SHIPMENT
            </button>
            <button 
              onClick={() => alert(`Running diagnostic for alert: ${selectedAlert.id}\n\nType: ${selectedAlert.type}\nSeverity: ${selectedAlert.severity}\n\nDiagnostic Results:\n• Sensor connectivity: OK\n• GPS signal: Strong\n• Data integrity: Verified\n• Recommended action: Contact carrier`)}
              className="flex-1 px-4 py-2 bg-void border border-border text-text-bright text-sm rounded hover:bg-border transition-colors"
            >
              RUN DIAGNOSTIC
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}
