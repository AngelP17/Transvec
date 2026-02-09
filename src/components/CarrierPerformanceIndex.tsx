import { IconArrowUpRight, IconChevronRight } from '@tabler/icons-react';
import type { Alert, Shipment } from '../types';

interface CarrierPerformanceIndexProps {
  shipments: Shipment[];
  alerts: Alert[];
}

function sparkline(values: number[]) {
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 60;
      const y = 18 - (value / max) * 16;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width="64" height="20" viewBox="0 0 64 20" className="text-accent">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

export default function CarrierPerformanceIndex({ shipments, alerts }: CarrierPerformanceIndexProps) {
  const byCarrier = shipments.reduce<Record<string, { count: number; anomalies: number; avgShock: number }>>(
    (acc, shipment) => {
      const key = shipment.carrierId || 'unknown';
      if (!acc[key]) {
        acc[key] = { count: 0, anomalies: 0, avgShock: 0 };
      }
      acc[key].count += 1;
      acc[key].avgShock += shipment.telemetry.shock || 0;
      acc[key].anomalies += alerts.filter((alert) => alert.shipmentId === shipment.id).length;
      return acc;
    },
    {}
  );

  const carriers = Object.entries(byCarrier)
    .map(([carrier, stats]) => ({
      carrier,
      count: stats.count,
      anomalies: stats.anomalies,
      avgShock: stats.count ? stats.avgShock / stats.count : 0,
      trend: [
        stats.count * 0.6,
        stats.count * 0.8,
        stats.count * 0.7,
        stats.count * 0.9,
        stats.count * 0.75,
      ],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return (
    <div className="absolute right-4 top-[360px] z-10 w-72 bg-void-lighter/90 border border-border rounded-xl shadow-2xl backdrop-blur">
      <div className="px-4 py-3 border-b border-border/80">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-text-muted">Carrier Index</p>
            <p className="text-[12px] font-semibold text-text-bright">Performance Matrix</p>
          </div>
          <IconArrowUpRight className="w-4 h-4 text-success" />
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {carriers.length === 0 && (
          <p className="text-[9px] text-text-muted">No carrier telemetry available.</p>
        )}
        {carriers.map((carrier) => (
          <div key={carrier.carrier} className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-text-bright font-semibold">{carrier.carrier}</div>
              <div className="text-[9px] text-text-muted font-mono">
                {carrier.count} active • shock {carrier.avgShock.toFixed(2)}g
              </div>
            </div>
            <div className="flex items-center gap-2">
              {sparkline(carrier.trend)}
              <IconChevronRight className="w-4 h-4 text-text-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
