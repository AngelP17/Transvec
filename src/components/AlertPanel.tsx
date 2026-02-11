import { useEffect, useMemo, useRef, useState } from 'react';
import type { Alert } from '../types';

interface AlertPanelProps {
  alerts: Alert[];
  onAlertClick: (alert: Alert) => void;
  selectedAlert: Alert | null;
  onAcknowledgeAlert?: (alertId: string) => void;
  onViewShipment?: (alert: Alert) => boolean;
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
    color: '#9ca3af',
    bgColor: 'bg-white/5',
    borderColor: 'border-white/10',
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

type TriageStatus = 'UNASSIGNED' | 'ASSIGNED' | 'ESCALATED' | 'CLOSED';

const triageStyles: Record<TriageStatus, { label: string; className: string }> = {
  UNASSIGNED: { label: 'Unassigned', className: 'bg-white/10 text-white/60 border-white/10' },
  ASSIGNED: { label: 'Assigned', className: 'bg-white/10 text-white border-white/20' },
  ESCALATED: { label: 'Escalated', className: 'bg-warning/20 text-warning border-warning/40' },
  CLOSED: { label: 'Closed', className: 'bg-success/20 text-success border-success/40' },
};

const operatorPool = ['Ops Alpha', 'Ops Bravo', 'Ops Delta', 'SecOps'];

function pickAssignee(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % operatorPool.length;
  return operatorPool[index];
}

export default function AlertPanel({ alerts, onAlertClick, selectedAlert, onAcknowledgeAlert, onViewShipment }: AlertPanelProps) {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [triageMap, setTriageMap] = useState<Record<string, { status: TriageStatus; assignee?: string; updatedAt: number }>>({});
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [diagnosticReport, setDiagnosticReport] = useState<string | null>(null);

  useEffect(() => {
    setActionFeedback(null);
    setDiagnosticReport(null);
  }, [selectedAlert?.id]);

  const resolveTriage = (alertId: string) =>
    triageMap[alertId] || { status: 'UNASSIGNED' as TriageStatus, assignee: '', updatedAt: 0 };

  const acknowledgeAlert = (alertId: string) => {
    setAcknowledgedIds((prev) => new Set(prev).add(alertId));
    onAcknowledgeAlert?.(alertId);
  };

  const handleAcknowledge = (e: React.MouseEvent, alertId: string) => {
    e.stopPropagation();
    acknowledgeAlert(alertId);
  };

  const handleAssign = (e: React.MouseEvent, alertId: string) => {
    e.stopPropagation();
    const assignee = pickAssignee(alertId);
    setTriageMap((prev) => ({
      ...prev,
      [alertId]: {
        status: 'ASSIGNED',
        assignee,
        updatedAt: Date.now(),
      },
    }));
  };

  const handleEscalate = (e: React.MouseEvent, alertId: string) => {
    e.stopPropagation();
    const current = resolveTriage(alertId);
    setTriageMap((prev) => ({
      ...prev,
      [alertId]: {
        status: 'ESCALATED',
        assignee: current.assignee || 'SecOps',
        updatedAt: Date.now(),
      },
    }));
  };

  const handleClose = (e: React.MouseEvent, alertId: string) => {
    e.stopPropagation();
    const current = resolveTriage(alertId);
    setTriageMap((prev) => ({
      ...prev,
      [alertId]: {
        status: 'CLOSED',
        assignee: current.assignee || '',
        updatedAt: Date.now(),
      },
    }));
    acknowledgeAlert(alertId);
  };

  const isAlertAcknowledged = (alert: Alert) => {
    const triageStatus = triageMap[alert.id]?.status;
    return alert.acknowledged || acknowledgedIds.has(alert.id) || triageStatus === 'CLOSED';
  };

  const computeLiveStats = () => {
    const openAlerts = alerts.filter((alert) => !isAlertAcknowledged(alert));
    return {
      total: openAlerts.length,
      critical: openAlerts.filter((a) => a.severity === 'CRITICAL').length,
      warning: openAlerts.filter((a) => a.severity === 'WARNING').length,
      info: openAlerts.filter((a) => a.severity === 'INFO').length,
    };
  };

  const [liveStats, setLiveStats] = useState(() => computeLiveStats());
  const [deltaStats, setDeltaStats] = useState({ total: 0, critical: 0, warning: 0, info: 0 });
  const statsRef = useRef(liveStats);

  useEffect(() => {
    statsRef.current = liveStats;
  }, [liveStats]);

  useEffect(() => {
    const tick = () => {
      const next = computeLiveStats();
      const prev = statsRef.current;
      setDeltaStats({
        total: next.total - prev.total,
        critical: next.critical - prev.critical,
        warning: next.warning - prev.warning,
        info: next.info - prev.info,
      });
      setLiveStats(next);
      statsRef.current = next;
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [alerts, acknowledgedIds, triageMap]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (filter !== 'ALL' && alert.severity !== filter) return false;
      if (!showAcknowledged && isAlertAcknowledged(alert)) return false;
      return true;
    });
  }, [alerts, filter, showAcknowledged, acknowledgedIds, triageMap]);

  const stats = liveStats;
  const renderDelta = (delta: number, tone: 'neutral' | 'critical' | 'warning') => {
    if (delta === 0) {
      return <span className="text-[9px] text-white/30">—</span>;
    }
    const isUp = delta > 0;
    const base =
      tone === 'critical' ? 'text-critical' : tone === 'warning' ? 'text-warning' : 'text-white/70';
    return (
      <span className={`text-[9px] font-semibold ${base}`}>
        {isUp ? '+' : ''}
        {delta}
      </span>
    );
  };
  const selectedTriage = selectedAlert ? resolveTriage(selectedAlert.id) : null;

  const runDiagnostic = (alert: Alert) => {
    const now = new Date().toISOString();
    const severityWeight = alert.severity === 'CRITICAL' ? 0.96 : alert.severity === 'WARNING' ? 0.82 : 0.74;
    const sensorSignal = alert.type === 'SENSOR_OFFLINE' ? 'DEGRADED' : 'STABLE';
    const geoSignal = alert.type === 'GEOFENCE_BREACH' || alert.type === 'ROUTE_DEVIATION' ? 'OUT_OF_CORRIDOR' : 'IN_CORRIDOR';
    const recommendation =
      alert.severity === 'CRITICAL'
        ? 'Escalate to SecOps and dispatch carrier contact immediately.'
        : alert.severity === 'WARNING'
          ? 'Assign operator and monitor next telemetry window.'
          : 'Log for trend analysis and continue monitoring.';

    setDiagnosticReport(
      `[DIAGNOSTIC] ${alert.id}
[TIMESTAMP] ${now}
[SHIPMENT] ${alert.shipmentId}
[SEVERITY] ${alert.severity}
[ALERT TYPE] ${alertTypeLabels[alert.type] || alert.type}
[SIGNAL] Sensor=${sensorSignal} | Route=${geoSignal}
[CONFIDENCE] ${(severityWeight * 100).toFixed(0)}%
[RECOMMENDATION] ${recommendation}`
    );
  };

  return (
    <div className="relative w-full h-full bg-[#0b0f14] p-3 sm:p-4 lg:p-6 overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-white/40">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Incident Desk
        </div>
        <h2 className="text-2xl font-semibold text-white mt-2">Alert Center</h2>
        <p className="text-white/50 text-sm">Real-time anomaly detection and response routing</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <button
          onClick={() => setFilter('ALL')}
          className={`p-4 rounded-xl border transition-all text-left ${filter === 'ALL' ? 'bg-white/5 border-white/30' : 'bg-black/40 border-white/10 hover:border-white/30'}`}
        >
          <div className="flex items-center justify-between">
            <div className="text-2xl font-mono text-white">{stats.total}</div>
            <div className={`${deltaStats.total !== 0 ? 'animate-pulse' : ''}`}>
              {renderDelta(deltaStats.total, 'neutral')}
            </div>
          </div>
          <div className="mt-1 text-[10px] text-white/40 uppercase tracking-wider">Open</div>
        </button>
        <button
          onClick={() => setFilter('CRITICAL')}
          className={`p-4 rounded-xl border transition-all text-left ${filter === 'CRITICAL' ? 'bg-critical/10 border-critical' : 'bg-black/40 border-white/10 hover:border-critical/50'}`}
        >
          <div className="flex items-center justify-between">
            <div className="text-2xl font-mono text-critical">{stats.critical}</div>
            <div className={`${deltaStats.critical !== 0 ? 'animate-pulse' : ''}`}>
              {renderDelta(deltaStats.critical, 'critical')}
            </div>
          </div>
          <div className="mt-1 text-[10px] text-white/40 uppercase tracking-wider">Critical</div>
        </button>
        <button
          onClick={() => setFilter('WARNING')}
          className={`p-4 rounded-xl border transition-all text-left ${filter === 'WARNING' ? 'bg-warning/10 border-warning' : 'bg-black/40 border-white/10 hover:border-warning/50'}`}
        >
          <div className="flex items-center justify-between">
            <div className="text-2xl font-mono text-warning">{stats.warning}</div>
            <div className={`${deltaStats.warning !== 0 ? 'animate-pulse' : ''}`}>
              {renderDelta(deltaStats.warning, 'warning')}
            </div>
          </div>
          <div className="mt-1 text-[10px] text-white/40 uppercase tracking-wider">Warning</div>
        </button>
        <button
          onClick={() => setFilter('INFO')}
          className={`p-4 rounded-xl border transition-all text-left ${filter === 'INFO' ? 'bg-white/5 border-white/30' : 'bg-black/40 border-white/10 hover:border-white/30'}`}
        >
          <div className="flex items-center justify-between">
            <div className="text-2xl font-mono text-white">{stats.info}</div>
            <div className={`${deltaStats.info !== 0 ? 'animate-pulse' : ''}`}>
              {renderDelta(deltaStats.info, 'neutral')}
            </div>
          </div>
          <div className="mt-1 text-[10px] text-white/40 uppercase tracking-wider">Info</div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showAcknowledged}
              onChange={(e) => setShowAcknowledged(e.target.checked)}
              className="w-4 h-4 rounded border-white/30 bg-black/60 text-white focus:ring-white/40"
            />
            Show acknowledged
          </label>
        </div>
        <div className="text-xs sm:text-sm text-white/50">
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
            const triage = resolveTriage(alert.id);
            const triageStyle = triageStyles[triage.status];
            const isAcknowledged = isAlertAcknowledged(alert);
            
            return (
              <div
                key={alert.id}
                onClick={() => onAlertClick(alert)}
                className={`
                  p-4 rounded-xl border cursor-pointer transition-all
                  bg-black/40 ${config.borderColor}
                  ${isSelected ? 'ring-2 ring-offset-2 ring-offset-black ring-white/30' : ''}
                  hover:border-white/30 hover:bg-black/60
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1" style={{ color: config.color }}>
                    {config.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span 
                        className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
                        style={{ backgroundColor: config.color, color: '#0b0f14' }}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-xs text-white/50">
                        {alertTypeLabels[alert.type] || alert.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold uppercase ${triageStyle.className}`}>
                        {triageStyle.label}
                      </span>
                      {isAcknowledged && (
                        <span className="text-[10px] text-green-400 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          ACK
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-white mb-2">{alert.message}</p>

                    {triage.status !== 'UNASSIGNED' && (
                      <div className="text-[10px] text-white/50 mb-2">
                        {triage.status === 'ASSIGNED' && `Assigned to ${triage.assignee || 'Ops'}`}
                        {triage.status === 'ESCALATED' && `Escalated to ${triage.assignee || 'SecOps'}`}
                        {triage.status === 'CLOSED' && 'Resolution logged and archived'}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-white/40">
                      <span className="font-mono text-white/60">{alert.shipmentId}</span>
                      <span>•</span>
                      <span>{formatTimestamp(alert.timestamp)}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {triage.status === 'UNASSIGNED' && (
                        <button
                          onClick={(e) => handleAssign(e, alert.id)}
                          className="px-3 py-1.5 rounded border border-white/15 bg-white/5 text-[10px] font-semibold text-white/80 hover:bg-white/10 transition"
                        >
                          Assign
                        </button>
                      )}
                      {triage.status === 'ASSIGNED' && (
                        <button
                          onClick={(e) => handleEscalate(e, alert.id)}
                          className="px-3 py-1.5 rounded border border-warning/40 bg-warning/10 text-[10px] font-semibold text-warning hover:bg-warning/20 transition"
                        >
                          Escalate
                        </button>
                      )}
                      {triage.status === 'ESCALATED' && (
                        <button
                          onClick={(e) => handleClose(e, alert.id)}
                          className="px-3 py-1.5 rounded border border-success/40 bg-success/10 text-[10px] font-semibold text-success hover:bg-success/20 transition"
                        >
                          Close
                        </button>
                      )}
                      {!isAcknowledged && triage.status !== 'CLOSED' && (
                        <button
                          onClick={(e) => handleAcknowledge(e, alert.id)}
                          className="px-3 py-1.5 rounded border border-white/15 bg-white/5 text-[10px] font-semibold text-white/70 hover:bg-white/10 transition"
                        >
                          Ack
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Alert Detail Panel */}
      {selectedAlert && (
        <div className="mt-6 p-3 sm:p-4 bg-black/60 border border-white/10 rounded-xl">
          <h3 className="font-semibold text-white mb-3">Alert Details</h3>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-[auto,1fr] gap-3 items-start">
              <span className="text-white/50">Alert ID:</span>
              <span className="font-mono text-white break-all text-right">{selectedAlert.id}</span>
            </div>
            <div className="grid grid-cols-[auto,1fr] gap-3 items-start">
              <span className="text-white/50">Shipment:</span>
              <span className="font-mono text-white break-all text-right">{selectedAlert.shipmentId}</span>
            </div>
            <div className="grid grid-cols-[auto,1fr] gap-3 items-start">
              <span className="text-white/50">Type:</span>
              <span className="text-white text-right">{alertTypeLabels[selectedAlert.type]}</span>
            </div>
            <div className="grid grid-cols-[auto,1fr] gap-3 items-start">
              <span className="text-white/50">Severity:</span>
              <span className="text-right" style={{ color: severityConfig[selectedAlert.severity].color }}>
                {selectedAlert.severity}
              </span>
            </div>
            {selectedTriage && (
              <div className="grid grid-cols-[auto,1fr] gap-3 items-start">
                <span className="text-white/50">Triage:</span>
                <span className={`ml-auto px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase ${triageStyles[selectedTriage.status].className}`}>
                  {triageStyles[selectedTriage.status].label}
                </span>
              </div>
            )}
            {selectedTriage?.assignee && selectedTriage.status !== 'UNASSIGNED' && (
              <div className="grid grid-cols-[auto,1fr] gap-3 items-start">
                <span className="text-white/50">Assignee:</span>
                <span className="text-white text-right">{selectedTriage.assignee}</span>
              </div>
            )}
            <div className="grid grid-cols-[auto,1fr] gap-3 items-start">
              <span className="text-white/50">Timestamp:</span>
              <span className="font-mono text-white break-all text-right">{selectedAlert.timestamp.toISOString()}</span>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button 
              onClick={() => {
                const resolved = onViewShipment?.(selectedAlert);
                if (resolved === false) {
                  setActionFeedback('No linked shipment found for this alert yet.');
                } else {
                  setActionFeedback(null);
                }
              }}
              className="flex-1 px-4 py-2 bg-white text-black text-sm font-semibold rounded hover:bg-white/90 transition-colors"
            >
              VIEW SHIPMENT
            </button>
            <button 
              onClick={() => runDiagnostic(selectedAlert)}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white/80 text-sm rounded hover:bg-white/10 transition-colors"
            >
              RUN DIAGNOSTIC
            </button>
          </div>
          {actionFeedback && (
            <div className="mt-2 text-xs text-warning">
              {actionFeedback}
            </div>
          )}
          {diagnosticReport && (
            <div className="mt-3 rounded-lg border border-white/10 bg-black/60 p-3">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-2">Diagnostic Report</div>
              <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-white/80 font-mono">{diagnosticReport}</pre>
            </div>
          )}
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
