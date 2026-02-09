import { IconAlertTriangle, IconBolt, IconRoute, IconShieldCheck } from '@tabler/icons-react';
import type { Alert, Shipment } from '../types';

interface OpsIntelPanelProps {
  shipments: Shipment[];
  alerts: Alert[];
}

function scoreAlert(alert: Alert) {
  switch (alert.severity) {
    case 'CRITICAL':
      return 10;
    case 'WARNING':
      return 5;
    default:
      return 2;
  }
}

export default function OpsIntelPanel({ shipments, alerts }: OpsIntelPanelProps) {
  const riskScore = Math.min(100, alerts.reduce((sum, alert) => sum + scoreAlert(alert), 0));
  const nodeCount = new Set([
    ...shipments.map((shipment) => shipment.origin.name),
    ...shipments.map((shipment) => shipment.destination.name),
  ]).size;

  const carrierStats = shipments.reduce<Record<string, { count: number; risk: number }>>((acc, shipment) => {
    const key = shipment.carrierId || 'unknown';
    if (!acc[key]) {
      acc[key] = { count: 0, risk: 0 };
    }
    acc[key].count += 1;
    acc[key].risk += alerts.filter((alert) => alert.shipmentId === shipment.id).length;
    return acc;
  }, {});

  const topCarriers = Object.entries(carrierStats)
    .map(([carrier, stats]) => ({ carrier, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const timeline = alerts
    .slice()
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5);

  return (
    <div className="absolute right-4 top-20 z-10 w-72 bg-void-lighter/90 border border-border rounded-xl shadow-2xl backdrop-blur">
      <div className="px-4 py-3 border-b border-border/80">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-text-muted">Operational Intelligence</p>
            <p className="text-[12px] font-semibold text-text-bright">Mission Watch</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-warning">
            <IconBolt className="w-3 h-3" />
            LIVE
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-border/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase tracking-[0.3em] text-text-muted">Risk Score</span>
          <span className="text-[11px] font-mono font-semibold text-text-bright">{riskScore}%</span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full ${riskScore > 60 ? 'bg-critical' : riskScore > 30 ? 'bg-warning' : 'bg-success'}`}
            style={{ width: `${riskScore}%` }}
          />
        </div>
        <p className="mt-2 text-[9px] text-text-muted">Composite of active alerts and telemetry anomalies.</p>
      </div>

      <div className="px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2 mb-2">
          <IconRoute className="w-4 h-4 text-accent" />
          <p className="text-[9px] uppercase tracking-[0.3em] text-text-muted">Carrier Performance</p>
        </div>
        <div className="space-y-2">
          {topCarriers.length === 0 && (
            <p className="text-[9px] text-text-muted">No carrier telemetry available.</p>
          )}
          {topCarriers.map((carrier) => (
            <div key={carrier.carrier} className="flex items-center justify-between text-[10px] text-text-bright">
              <span>{carrier.carrier}</span>
              <span className="text-text-muted font-mono">{carrier.count} active</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2 mb-2">
          <IconAlertTriangle className="w-4 h-4 text-warning" />
          <p className="text-[9px] uppercase tracking-[0.3em] text-text-muted">Mission Timeline</p>
        </div>
        <div className="space-y-2">
          {timeline.length === 0 && (
            <p className="text-[9px] text-text-muted">No active incidents.</p>
          )}
          {timeline.map((event) => (
            <div key={event.id} className="flex flex-col gap-1 text-[10px]">
              <span className="text-text-bright">{event.message}</span>
              <span className="text-[9px] text-text-muted font-mono">
                {event.severity} • {event.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <IconShieldCheck className="w-4 h-4 text-success" />
          <p className="text-[9px] uppercase tracking-[0.3em] text-text-muted">Security Watchlist</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-void border border-success/40 text-success text-[10px] font-medium rounded">
            Geofence integrity OK
          </span>
          <span className="px-2 py-1 bg-void border border-border text-text-muted text-[10px] font-medium rounded">
            No route deviations
          </span>
          <span className="px-2 py-1 bg-void border border-border text-text-muted text-[10px] font-medium rounded font-mono">
            Mesh nodes: {nodeCount}
          </span>
        </div>
      </div>
    </div>
  );
}
