import { IconX, IconDatabase, IconMap2, IconBell, IconAdjustments } from '@tabler/icons-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  showGeofences: boolean;
  showRoutes: boolean;
  showBreaches: boolean;
  onToggleGeofences: () => void;
  onToggleRoutes: () => void;
  onToggleBreaches: () => void;
}

function ToggleRow({ label, description, checked, onToggle }: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/60 last:border-b-0">
      <div>
        <div className="text-sm font-semibold text-text-bright">{label}</div>
        <div className="text-xs text-text-muted">{description}</div>
      </div>
      <button
        onClick={onToggle}
        className={`w-11 h-6 rounded-full border transition-colors ${checked ? 'bg-accent/80 border-accent' : 'bg-void border-border'}`}
        aria-pressed={checked}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );
}

export default function SettingsPanel({
  isOpen,
  onClose,
  showGeofences,
  showRoutes,
  showBreaches,
  onToggleGeofences,
  onToggleRoutes,
  onToggleBreaches,
}: SettingsPanelProps) {
  return (
    <div className={`absolute inset-y-0 right-0 w-[360px] border-l border-border bg-void/95 backdrop-blur-xl shadow-2xl z-40 transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <IconAdjustments className="w-5 h-5 text-accent" />
          <div>
            <div className="text-sm font-semibold tracking-wider text-text-bright">SYSTEM SETTINGS</div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-text-muted">Console</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded border border-border text-text-muted hover:text-text-bright hover:bg-void-lighter"
          aria-label="Close settings"
        >
          <IconX className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 py-4 space-y-6 overflow-y-auto h-full">
        <section className="bg-void-lighter/70 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <IconMap2 className="w-4 h-4 text-accent" />
            <div className="text-xs font-semibold tracking-wider text-text-bright">MAP OVERLAYS</div>
          </div>
          <ToggleRow
            label="Geofence Polygons"
            description="Display corridor boundaries and authorized zones."
            checked={showGeofences}
            onToggle={onToggleGeofences}
          />
          <ToggleRow
            label="Route Paths"
            description="Render multi-modal paths (truck/train/air/sea)."
            checked={showRoutes}
            onToggle={onToggleRoutes}
          />
          <ToggleRow
            label="Breach Markers"
            description="Highlight assets outside authorized corridors."
            checked={showBreaches}
            onToggle={onToggleBreaches}
          />
        </section>

        <section className="bg-void-lighter/70 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <IconDatabase className="w-4 h-4 text-accent" />
            <div className="text-xs font-semibold tracking-wider text-text-bright">DATA SOURCE</div>
          </div>
          <div className="text-xs text-text-muted">Supabase: yieldops-sentinel</div>
          <div className="mt-2 grid grid-cols-2 gap-3 text-[11px]">
            <div className="rounded-lg border border-border px-3 py-2">
              <div className="text-text-muted">Mode</div>
              <div className="text-text-bright font-semibold">Live + Simulated</div>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <div className="text-text-muted">Auth</div>
              <div className="text-text-bright font-semibold">Anon Key</div>
            </div>
          </div>
        </section>

        <section className="bg-void-lighter/70 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <IconBell className="w-4 h-4 text-accent" />
            <div className="text-xs font-semibold tracking-wider text-text-bright">ALERTS</div>
          </div>
          <div className="text-xs text-text-muted">Geofence breaches are written server-side via edge function.</div>
          <div className="mt-3 rounded-lg border border-border px-3 py-2 text-[11px] text-text-bright">
            Edge Function: <span className="text-accent font-semibold">geofence-sync</span>
          </div>
        </section>
      </div>
    </div>
  );
}
