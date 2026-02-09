import { IconAlertTriangle, IconDatabase, IconDownload, IconStack2, IconMap2, IconActivity, IconRefresh, IconCpu, IconShieldCheck, IconTool } from '@tabler/icons-react';
import type { ViewTab } from '../types';
import type { FabHealthSummary } from '../lib/dataAdapter';

interface SystemStatusPanelProps {
  activeTab: ViewTab;
  liveData: boolean;
  shipmentCount: number;
  alertCount: number;
  fabHealth: FabHealthSummary | null;
  onRefresh: () => void;
  onToggleOverlays: () => void;
  onExport: () => void;
}

const TAB_COPY: Record<ViewTab, { title: string; subtitle: string; icon: React.ReactNode }> = {
  OPS: {
    title: 'Operational Status',
    subtitle: 'Live geospatial monitoring',
    icon: <IconMap2 className="w-4 h-4 text-accent" />,
  },
  ANALYTICS: {
    title: 'Analytics Status',
    subtitle: 'Simulation + telemetry fusion',
    icon: <IconActivity className="w-4 h-4 text-accent" />,
  },
  ONTOLOGY: {
    title: 'Graph Status',
    subtitle: 'Entity resolution and links',
    icon: <IconDatabase className="w-4 h-4 text-accent" />,
  },
  ALERTS: {
    title: 'Alert Status',
    subtitle: 'Incident response queue',
    icon: <IconAlertTriangle className="w-4 h-4 text-accent" />,
  },
};

function HealthDot({ status }: { status: 'ok' | 'warn' | 'critical' }) {
  const color = status === 'ok' ? 'bg-success' : status === 'warn' ? 'bg-warning' : 'bg-critical';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />;
}

export default function SystemStatusPanel({
  activeTab,
  liveData,
  shipmentCount,
  alertCount,
  fabHealth,
  onRefresh,
  onToggleOverlays,
  onExport,
}: SystemStatusPanelProps) {
  const copy = TAB_COPY[activeTab];
  const panelPosition = activeTab === 'OPS' ? 'left-4 top-24 w-64' : 'right-4 top-4 w-72';
  const isOps = activeTab === 'OPS';

  const agentStatus = fabHealth
    ? (fabHealth.agentsOffline > 0 ? 'warn' : 'ok')
    : 'ok';
  const facilityStatus = fabHealth
    ? (fabHealth.facilityCritical > 0 ? 'critical' : fabHealth.facilityWarnings > 0 ? 'warn' : 'ok')
    : 'ok';
  const assemblyStatus = fabHealth
    ? (fabHealth.bonderCritical > 0 ? 'critical' : fabHealth.bonderWarnings > 0 ? 'warn' : 'ok')
    : 'ok';

  return (
    <div className={`absolute ${panelPosition} z-40 rounded-xl border border-border bg-void-lighter/90 backdrop-blur shadow-xl px-4 py-3`}>
      <div className="flex items-center gap-2">
        {copy.icon}
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-text-muted">System Status</div>
          <div className="text-sm font-semibold text-text-bright">{copy.title}</div>
          <div className="text-[11px] text-text-muted">{copy.subtitle}</div>
        </div>
        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border ${liveData ? 'border-success text-success' : 'border-warning text-warning'}`}>
          {liveData ? 'LIVE' : 'DEMO'}
        </span>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-text-muted">
        <button
          onClick={onRefresh}
          className="flex items-center gap-1 px-2 py-1 rounded border border-border/70 bg-void/70 hover:bg-void-lighter text-text-bright"
        >
          <IconRefresh className="w-3 h-3" />
          Refresh
        </button>
        <button
          onClick={onToggleOverlays}
          disabled={!isOps}
          className={`flex items-center gap-1 px-2 py-1 rounded border ${isOps
            ? 'border-border/70 bg-void/70 hover:bg-void-lighter text-text-bright'
            : 'border-border/40 bg-void/40 text-text-muted cursor-not-allowed'
            }`}
          title={isOps ? 'Toggle map overlays' : 'Overlays available in OPS'}
        >
          <IconStack2 className="w-3 h-3" />
          Overlays
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-1 px-2 py-1 rounded border border-border/70 bg-void/70 hover:bg-void-lighter text-text-bright"
        >
          <IconDownload className="w-3 h-3" />
          Export
        </button>
      </div>

      {/* Core stats */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
        <div className="rounded-lg border border-border/70 bg-void/70 px-3 py-2">
          <div className="text-text-muted">Tracked Assets</div>
          <div className="font-mono text-text-bright text-lg">{shipmentCount}</div>
        </div>
        <div className="rounded-lg border border-border/70 bg-void/70 px-3 py-2">
          <div className="text-text-muted">Open Alerts</div>
          <div className={`font-mono text-lg ${alertCount > 0 ? 'text-critical' : 'text-success'}`}>{alertCount}</div>
        </div>
      </div>

      {/* Cross-system health — Sentinel / YieldOps interconnect */}
      {fabHealth && (fabHealth.agentCount > 0 || fabHealth.anomalyAlertCount > 0 || fabHealth.metrologyCount > 0) && (
        <div className="mt-3 border-t border-border/60 pt-3">
          <div className="text-[9px] uppercase tracking-[0.3em] text-text-muted mb-2 flex items-center gap-1.5">
            <IconCpu className="w-3 h-3 text-accent" />
            Fab Interconnect
          </div>

          {/* Sentinel agents row */}
          {fabHealth.agentCount > 0 && (
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <div className="flex items-center gap-1.5 text-text-muted">
                <HealthDot status={agentStatus} />
                <IconShieldCheck className="w-3 h-3" />
                Sentinel Agents
              </div>
              <span className="font-mono text-text-bright">
                {fabHealth.agentsOnline}/{fabHealth.agentCount}
                <span className="text-text-muted ml-1">online</span>
              </span>
            </div>
          )}

          {/* Detections */}
          {fabHealth.totalDetections24h > 0 && (
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span className="text-text-muted ml-4">Detections (24h)</span>
              <span className="font-mono text-warning">{fabHealth.totalDetections24h}</span>
            </div>
          )}

          {/* Anomaly alerts */}
          {fabHealth.anomalyAlertCount > 0 && (
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <div className="flex items-center gap-1.5 text-text-muted">
                <HealthDot status={fabHealth.anomalyAlertCount > 5 ? 'critical' : 'warn'} />
                <IconAlertTriangle className="w-3 h-3" />
                ML Anomalies
              </div>
              <span className="font-mono text-warning">{fabHealth.anomalyAlertCount}</span>
            </div>
          )}

          {/* Facility FFU */}
          {(fabHealth.facilityWarnings > 0 || fabHealth.facilityCritical > 0 || fabHealth.avgFilterLife > 0) && (
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <div className="flex items-center gap-1.5 text-text-muted">
                <HealthDot status={facilityStatus} />
                Cleanroom FFU
              </div>
              <span className="font-mono text-text-bright">
                {fabHealth.avgFilterLife > 0 ? `${fabHealth.avgFilterLife.toFixed(0)}% filter` : '—'}
              </span>
            </div>
          )}

          {/* Assembly bonders */}
          {(fabHealth.bonderWarnings > 0 || fabHealth.bonderCritical > 0 || fabHealth.avgOEE > 0) && (
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <div className="flex items-center gap-1.5 text-text-muted">
                <HealthDot status={assemblyStatus} />
                Assembly OEE
              </div>
              <span className="font-mono text-text-bright">
                {fabHealth.avgOEE > 0 ? `${fabHealth.avgOEE.toFixed(1)}%` : '—'}
              </span>
            </div>
          )}

          {/* Maintenance */}
          {fabHealth.openMaintenanceCount > 0 && (
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <div className="flex items-center gap-1.5 text-text-muted">
                <HealthDot status="warn" />
                <IconTool className="w-3 h-3" />
                Active Maint.
              </div>
              <span className="font-mono text-warning">
                {fabHealth.openMaintenanceCount}
                {fabHealth.totalDowntimeMinutes > 0 && (
                  <span className="text-text-muted ml-1">({fabHealth.totalDowntimeMinutes}m)</span>
                )}
              </span>
            </div>
          )}

          {/* VM Predictions + Metrology */}
          {(fabHealth.vmPredictionCount > 0 || fabHealth.metrologyCount > 0) && (
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span className="text-text-muted ml-4">Quality (VM/Metro)</span>
              <span className="font-mono text-text-bright">
                {fabHealth.avgConfidence > 0 ? `${(fabHealth.avgConfidence * 100).toFixed(0)}% conf` : '—'}
              </span>
            </div>
          )}

          {/* Dispatch + Recipe */}
          {(fabHealth.dispatchCount > 0 || fabHealth.pendingRecipeAdjustments > 0) && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-text-muted ml-4">Dispatch / Recipe</span>
              <span className="font-mono text-text-bright">
                {fabHealth.dispatchCount} / {fabHealth.pendingRecipeAdjustments} pending
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
