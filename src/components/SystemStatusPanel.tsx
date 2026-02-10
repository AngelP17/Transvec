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
  focusMode?: boolean;
}

const TAB_COPY: Record<ViewTab, { title: string; subtitle: string; icon: React.ReactNode }> = {
  OPS: {
    title: 'Operational Status',
    subtitle: 'Live geospatial monitoring',
    icon: <IconMap2 className="w-4 h-4 text-white/80" />,
  },
  ANALYTICS: {
    title: 'Analytics Status',
    subtitle: 'Simulation + telemetry fusion',
    icon: <IconActivity className="w-4 h-4 text-white/80" />,
  },
  ONTOLOGY: {
    title: 'Graph Status',
    subtitle: 'Entity resolution and links',
    icon: <IconDatabase className="w-4 h-4 text-white/80" />,
  },
  ALERTS: {
    title: 'Alert Status',
    subtitle: 'Incident response queue',
    icon: <IconAlertTriangle className="w-4 h-4 text-white/80" />,
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
  focusMode = false,
}: SystemStatusPanelProps) {
  if (focusMode && activeTab === 'OPS') {
    return null;
  }
  const copy = TAB_COPY[activeTab];
  const panelPosition = 'left-4 top-24 w-[min(16rem,calc(100%-6rem))] sm:w-64';
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
  const agentsOnline = fabHealth?.agentsOnline ?? 0;
  const agentCount = fabHealth?.agentCount ?? 0;
  const detections24h = fabHealth?.totalDetections24h ?? 0;
  const dispatchCount = fabHealth?.dispatchCount ?? 0;
  const pendingRecipeAdjustments = fabHealth?.pendingRecipeAdjustments ?? 0;

  return (
    <div className={`absolute ${panelPosition} max-h-[calc(100vh-7.5rem)] overflow-y-auto z-30 rounded-xl border border-white/10 bg-black/75 shadow-xl px-4 py-3`}>
      <div className="flex items-center gap-2">
        <span className="text-white/80">{copy.icon}</span>
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">System Status</div>
          <div className="text-sm font-semibold text-white">{copy.title}</div>
          <div className="text-[11px] text-white/50">{copy.subtitle}</div>
        </div>
        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border ${liveData ? 'border-success text-success' : 'border-warning text-warning'}`}>
          {liveData ? 'LIVE' : 'DEMO'}
        </span>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-white/60">
        <button
          onClick={onRefresh}
          className="flex items-center gap-1 px-2 py-1 rounded border border-white/10 bg-black/60 hover:bg-white/5 text-white"
        >
          <IconRefresh className="w-3 h-3" />
          Refresh
        </button>
        <button
          onClick={onToggleOverlays}
          disabled={!isOps}
          className={`flex items-center gap-1 px-2 py-1 rounded border ${isOps
            ? 'border-white/10 bg-black/60 hover:bg-white/5 text-white'
            : 'border-white/10 bg-black/30 text-white/30 cursor-not-allowed'
            }`}
          title={isOps ? 'Toggle map overlays' : 'Overlays available in OPS'}
        >
          <IconStack2 className="w-3 h-3" />
          Overlays
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-1 px-2 py-1 rounded border border-white/10 bg-black/60 hover:bg-white/5 text-white"
        >
          <IconDownload className="w-3 h-3" />
          Export
        </button>
      </div>

      {/* Core stats */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
        <div className="rounded-lg border border-white/10 bg-black/60 px-3 py-2">
          <div className="text-white/50">Tracked Assets</div>
          <div className="font-mono text-white text-lg">{shipmentCount}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/60 px-3 py-2">
          <div className="text-white/50">Open Alerts</div>
          <div className={`font-mono text-lg ${alertCount > 0 ? 'text-critical' : 'text-success'}`}>{alertCount}</div>
        </div>
      </div>

      {/* Cross-system health — Sentinel / YieldOps interconnect */}
      {activeTab === 'OPS' && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="text-[9px] uppercase tracking-[0.3em] text-white/40 mb-2 flex items-center gap-1.5">
            <IconCpu className="w-3 h-3 text-white/70" />
            Fab Interconnect
          </div>

          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <div className="flex items-center gap-1.5 text-white/50">
              <HealthDot status={agentStatus} />
              <IconShieldCheck className="w-3 h-3" />
              Sentinel Agents
            </div>
            <span className="font-mono text-white">
              {agentsOnline}/{agentCount}
              <span className="text-white/40 ml-1">online</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="text-white/40 ml-4">Detections (24h)</span>
            <span className="font-mono text-warning">{detections24h}</span>
          </div>

          {/* Anomaly alerts */}
          {fabHealth && fabHealth.anomalyAlertCount > 0 && (
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <div className="flex items-center gap-1.5 text-white/50">
                <HealthDot status={fabHealth.anomalyAlertCount > 5 ? 'critical' : 'warn'} />
                <IconAlertTriangle className="w-3 h-3" />
                ML Anomalies
              </div>
              <span className="font-mono text-warning">{fabHealth.anomalyAlertCount}</span>
            </div>
          )}

          {/* Facility FFU */}
          {fabHealth && (fabHealth.facilityWarnings > 0 || fabHealth.facilityCritical > 0 || fabHealth.avgFilterLife > 0) && (
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <div className="flex items-center gap-1.5 text-white/50">
                <HealthDot status={facilityStatus} />
                Cleanroom FFU
              </div>
              <span className="font-mono text-white">
                {fabHealth.avgFilterLife > 0 ? `${fabHealth.avgFilterLife.toFixed(0)}% filter` : '—'}
              </span>
            </div>
          )}

          {/* Assembly bonders */}
          {fabHealth && (fabHealth.bonderWarnings > 0 || fabHealth.bonderCritical > 0 || fabHealth.avgOEE > 0) && (
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <div className="flex items-center gap-1.5 text-white/50">
                <HealthDot status={assemblyStatus} />
                Assembly OEE
              </div>
              <span className="font-mono text-white">
                {fabHealth.avgOEE > 0 ? `${fabHealth.avgOEE.toFixed(1)}%` : '—'}
              </span>
            </div>
          )}

          {/* Maintenance */}
          {fabHealth && fabHealth.openMaintenanceCount > 0 && (
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <div className="flex items-center gap-1.5 text-white/50">
                <HealthDot status="warn" />
                <IconTool className="w-3 h-3" />
                Active Maint.
              </div>
              <span className="font-mono text-warning">
                {fabHealth.openMaintenanceCount}
                {fabHealth.totalDowntimeMinutes > 0 && (
                  <span className="text-white/40 ml-1">({fabHealth.totalDowntimeMinutes}m)</span>
                )}
              </span>
            </div>
          )}

          {/* VM Predictions + Metrology */}
          {fabHealth && (fabHealth.vmPredictionCount > 0 || fabHealth.metrologyCount > 0) && (
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span className="text-white/40 ml-4">Quality (VM/Metro)</span>
              <span className="font-mono text-white">
                {fabHealth.avgConfidence > 0 ? `${(fabHealth.avgConfidence * 100).toFixed(0)}% conf` : '—'}
              </span>
            </div>
          )}

          {/* Dispatch + Recipe */}
          <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/40 ml-4">Dispatch / Recipe</span>
              <span className="font-mono text-white">
                {dispatchCount} / {pendingRecipeAdjustments} pending
              </span>
            </div>

          {/* Capacity Simulation */}
          {fabHealth && fabHealth.simulationCount > 0 && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/40 ml-4">Capacity Sim</span>
              <span className="font-mono text-white">
                {fabHealth.meanThroughput != null ? `${fabHealth.meanThroughput.toFixed(0)} wph` : '---'}
                {fabHealth.p95Throughput != null && (
                  <span className="text-white/40 ml-1">(p95: {fabHealth.p95Throughput.toFixed(0)})</span>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
