import { IconAlertTriangle, IconClock, IconRadar, IconRoute } from '@tabler/icons-react';
import type { Alert, Shipment } from '../types';

interface MissionTimelinePanelProps {
  shipments: Shipment[];
  alerts: Alert[];
}

const MAX_EVENTS = 8;

export default function MissionTimelinePanel({ shipments, alerts }: MissionTimelinePanelProps) {
  const shipmentEvents = shipments.map((shipment) => ({
    id: `ship-${shipment.id}`,
    time: shipment.telemetry.timestamp,
    message: `${shipment.trackingCode} ${shipment.statusLabel || shipment.status}`,
    type: 'status',
  }));

  const alertEvents = alerts.map((alert) => ({
    id: `alert-${alert.id}`,
    time: alert.timestamp,
    message: alert.message,
    type: 'alert',
  }));

  const events = [...alertEvents, ...shipmentEvents]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, MAX_EVENTS);

  return (
    <div className="absolute right-4 bottom-20 z-10 w-72 bg-void-lighter/90 border border-border rounded-xl shadow-2xl backdrop-blur">
      <div className="px-4 py-3 border-b border-border/80">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-text-muted">Mission Timeline</p>
            <p className="text-[12px] font-semibold text-text-bright">Operational Feed</p>
          </div>
          <IconRadar className="w-4 h-4 text-accent" />
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {events.length === 0 && (
          <p className="text-[9px] text-text-muted">No active mission events.</p>
        )}
        {events.map((event) => (
          <div key={event.id} className="flex items-start gap-2">
            {event.type === 'alert' ? (
              <IconAlertTriangle className="w-4 h-4 text-warning mt-0.5" />
            ) : (
              <IconRoute className="w-4 h-4 text-accent mt-0.5" />
            )}
            <div>
              <div className="text-[10px] text-text-bright">{event.message}</div>
              <div className="text-[9px] text-text-muted font-mono flex items-center gap-1">
                <IconClock className="w-3 h-3" />
                {event.time.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
