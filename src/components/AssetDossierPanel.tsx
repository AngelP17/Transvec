import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClock,
  IconDatabase,
  IconFileText,
  IconId,
  IconLink,
  IconPlane,
  IconShip,
  IconSteeringWheel,
  IconTrain,
  IconTruck,
} from '@tabler/icons-react';
import type { Shipment } from '../types';

interface AssetDossierPanelProps {
  shipment: Shipment;
}

export default function AssetDossierPanel({ shipment }: AssetDossierPanelProps) {
  const dossier = shipment.dossier;
  if (!dossier) return null;

  const modeIcon = dossier.mode === 'AIR'
    ? <IconPlane className="w-4 h-4 text-accent" />
    : dossier.mode === 'TRAIN'
      ? <IconTrain className="w-4 h-4 text-accent" />
      : dossier.mode === 'SEA'
        ? <IconShip className="w-4 h-4 text-accent" />
        : <IconTruck className="w-4 h-4 text-accent" />;

  return (
    <div className="absolute top-4 left-4 z-20 w-80 bg-void-lighter/95 backdrop-blur border border-border rounded-sm shadow-2xl">
      <div className="p-3 border-b border-border bg-void-lighter">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {modeIcon}
              <span className="font-mono font-bold text-sm text-text-bright tracking-wide">
                {shipment.trackingCode}
              </span>
            </div>
            <div className="text-[10px] text-text-muted font-mono">
              {shipment.origin.name} <span className="mx-1 text-text-muted">→</span> {shipment.destination.name}
            </div>
          </div>
          <div className={`px-2 py-0.5 text-[10px] font-bold rounded-sm border ${
            shipment.status === 'CRITICAL'
              ? 'border-critical/40 text-critical bg-critical/10'
              : shipment.status === 'DELAYED'
                ? 'border-warning/40 text-warning bg-warning/10'
                : 'border-accent/40 text-accent bg-accent/10'
          }`}>
            {dossier.statusLabel || shipment.status}
          </div>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-border bg-void">
        <div className="flex items-center gap-2 text-[10px]">
          <IconLink className="w-3 h-3 text-accent" />
          <span className="text-text-muted">UPSTREAM SOURCE:</span>
          <span className="font-mono text-accent underline decoration-dotted cursor-pointer hover:text-text-bright">
            {dossier.linkedJobId}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-text-muted">
          <IconDatabase className="w-3 h-3" />
          <span>{dossier.client} // {dossier.contents}</span>
        </div>
      </div>

      <div className="p-3 border-b border-border">
        <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-2">Operator Identity</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <IconId className="w-4 h-4 text-text-muted mt-0.5" />
            <div>
              <div className="text-[11px] text-text-bright font-mono">{dossier.operator.id}</div>
              <div className="text-[9px] text-text-muted">{dossier.operator.company}</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <IconSteeringWheel className="w-4 h-4 text-text-muted mt-0.5" />
            <div>
              <div className="text-[11px] text-text-bright font-mono">{dossier.vehicle.id}</div>
              <div className="text-[9px] text-text-muted">{dossier.vehicle.model}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 border-b border-border bg-void-lighter/40">
        <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-2">Custody Log</div>
        <div className="space-y-3 relative ml-1.5">
          <div className="absolute top-1 bottom-1 left-0.5 w-[1px] bg-border" />
          {dossier.chainOfCustody.map((log) => (
            <div key={`${log.time}-${log.event}`} className="relative pl-4 flex justify-between items-start">
              <div className={`absolute left-[-2px] top-1 w-1.5 h-1.5 rounded-full border border-void ${
                log.status === 'warn' ? 'bg-warning' : 'bg-accent'
              }`} />
              <div>
                <div className="text-[10px] font-medium text-text-bright">{log.event}</div>
                <div className="text-[9px] text-text-muted font-mono">{log.actor}</div>
              </div>
              <div className="text-[9px] font-mono text-text-muted">{log.time}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3">
        <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-2">Compliance Records</div>
        <div className="space-y-1">
          {dossier.records.map((doc) => (
            <div key={doc.id} className="flex justify-between items-center p-1.5 bg-void border border-border rounded-sm hover:border-text-muted transition-colors">
              <div className="flex items-center gap-2">
                <IconFileText className="w-4 h-4 text-accent" />
                <div className="text-[10px] text-text-bright">{doc.name}</div>
              </div>
              <div className="flex items-center gap-1">
                {doc.status === 'VERIFIED'
                  ? <IconCircleCheck className="w-3 h-3 text-success" />
                  : <IconClock className="w-3 h-3 text-warning" />}
                <span className="text-[9px] font-mono text-text-muted">{doc.id}</span>
              </div>
            </div>
          ))}
        </div>

        {dossier.flags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {dossier.flags.map((flag) => (
              <span key={flag} className="px-2 py-1 bg-warning/10 border border-warning/40 text-warning text-[9px] font-semibold rounded-sm flex items-center gap-1">
                <IconAlertTriangle className="w-3 h-3" />
                {flag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
