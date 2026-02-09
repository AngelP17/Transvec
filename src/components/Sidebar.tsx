import {
  IconAlertTriangle,
  IconBinaryTree2,
  IconRadar,
  IconSettings,
  IconTimelineEvent,
  IconUser,
} from '@tabler/icons-react';
import type { ViewTab } from '../types';

interface SidebarProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  alertCount: number;
  onOpenSettings: () => void;
  isSettingsOpen?: boolean;
}

const navItems: { id: ViewTab; label: string; sublabel: string; icon: React.ReactNode }[] = [
  { id: 'OPS', label: 'OPS', sublabel: 'Operational Grid', icon: <IconRadar className="w-5 h-5" /> },
  { id: 'ANALYTICS', label: 'ANALYTICS', sublabel: 'Workbook', icon: <IconTimelineEvent className="w-5 h-5" /> },
  { id: 'ONTOLOGY', label: 'ONTOLOGY', sublabel: 'Graph Core', icon: <IconBinaryTree2 className="w-5 h-5" /> },
  { id: 'ALERTS', label: 'ALERTS', sublabel: 'Incident Desk', icon: <IconAlertTriangle className="w-5 h-5" /> },
];

export default function Sidebar({ activeTab, onTabChange, alertCount, onOpenSettings, isSettingsOpen = false }: SidebarProps) {
  return (
    <div className="w-20 sm:w-24 md:w-28 lg:w-32 flex flex-col items-center py-4 sm:py-6 border-r border-border bg-void-light/95 relative z-30">
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(45,114,210,0.18),transparent_60%)] pointer-events-none" />
      {/* Logo */}
      <div className="mb-4 sm:mb-6 flex flex-col items-center gap-2">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-void border border-border flex items-center justify-center text-accent shadow-[0_0_20px_rgba(45,114,210,0.18)]">
          <IconRadar className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="text-[10px] sm:text-[12px] font-display italic tracking-[0.2em] text-text-bright">Transvec</div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 flex flex-col gap-2 sm:gap-3 w-full px-2 sm:px-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`
              w-full px-2 sm:px-3 py-2 sm:py-3 rounded-xl flex flex-col items-center gap-1.5 sm:gap-2 transition-all relative group border
              ${activeTab === item.id
                ? 'bg-accent/15 text-text-bright border-accent/50 shadow-[0_0_18px_rgba(45,114,210,0.25)]'
                : 'text-text-muted border-border/40 hover:text-text-bright hover:bg-void-lighter/80'
              }
            `}
            title={item.label}
          >
            <div className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${activeTab === item.id ? 'bg-void border border-accent/40' : 'bg-void-light border border-border'}`}>
              <span className={`${activeTab === item.id ? 'text-accent' : 'text-text-muted group-hover:text-text-bright'}`}>
                {item.icon}
              </span>
            </div>
            <div className="text-[9px] sm:text-[11px] font-semibold tracking-widest text-text-bright">{item.label}</div>
            <div className="hidden sm:block text-[10px] uppercase tracking-[0.28em] text-text-muted">{item.sublabel}</div>
            
            {/* Active indicator */}
            {activeTab === item.id && (
              <div className="absolute -right-1 top-4 bottom-4 w-1 rounded-l bg-accent" />
            )}

            {/* Alert badge */}
            {item.id === 'ALERTS' && alertCount > 0 && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-critical rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                {alertCount}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Bottom section */}
      <div className="mt-auto flex flex-col gap-2 sm:gap-3 w-full px-2 sm:px-3">
        <button
          onClick={onOpenSettings}
          className={`w-full px-3 py-3 rounded-xl flex items-center justify-center gap-2 transition-all border ${
            isSettingsOpen
              ? 'bg-void-lighter/80 border-accent/50 text-text-bright'
              : 'text-text-muted hover:text-text-bright hover:bg-void-lighter border-border/40'
          }`}
          title="Settings"
        >
          <IconSettings className="w-5 h-5" />
          <span className="text-[9px] sm:text-[11px] uppercase tracking-[0.3em]">Settings</span>
        </button>

        {/* User avatar */}
        <div className="w-full px-3 py-3 rounded-xl bg-void border border-border flex items-center justify-center gap-2 text-text-bright">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-accent to-cyan-400 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
            AP
          </div>
          <div className="hidden sm:block text-[10px] uppercase tracking-[0.3em] text-text-muted">Operator</div>
          <IconUser className="w-4 h-4 text-text-muted hidden sm:block" />
        </div>
      </div>
    </div>
  );
}
