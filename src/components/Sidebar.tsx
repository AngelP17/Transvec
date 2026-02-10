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
  onOpenOperator: () => void;
  isOperatorOpen?: boolean;
}

const navItems: { id: ViewTab; label: string; sublabel: string; icon: React.ReactNode }[] = [
  { id: 'OPS', label: 'OPS', sublabel: 'Operational Grid', icon: <IconRadar className="w-5 h-5" /> },
  { id: 'ANALYTICS', label: 'ANALYTICS', sublabel: 'Workbook', icon: <IconTimelineEvent className="w-5 h-5" /> },
  { id: 'ONTOLOGY', label: 'ONTOLOGY', sublabel: 'Graph Core', icon: <IconBinaryTree2 className="w-5 h-5" /> },
  { id: 'ALERTS', label: 'ALERTS', sublabel: 'Incident Desk', icon: <IconAlertTriangle className="w-5 h-5" /> },
];

export default function Sidebar({ activeTab, onTabChange, alertCount, onOpenSettings, isSettingsOpen = false, onOpenOperator, isOperatorOpen = false }: SidebarProps) {
  return (
    <div className="w-20 sm:w-24 md:w-28 lg:w-32 flex flex-col items-center py-4 sm:py-6 border-r border-white/10 bg-black/90 relative z-40">
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_60%)] pointer-events-none" />
      {/* Logo */}
      <div className="mb-4 sm:mb-6 flex flex-col items-center gap-2">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,0,0,0.45)]">
          <IconRadar className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="text-[10px] sm:text-[12px] font-display italic tracking-[0.2em] text-white/90">Transvec</div>
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
                ? 'bg-white/5 text-white border-white/30 shadow-[0_0_18px_rgba(0,0,0,0.4)]'
                : 'text-white/50 border-white/10 hover:text-white hover:bg-white/5'
              }
            `}
            title={item.label}
          >
            <div className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${activeTab === item.id ? 'bg-black border border-white/20' : 'bg-black/60 border border-white/10'}`}>
              <span className={`${activeTab === item.id ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                {item.icon}
              </span>
            </div>
            <div className="text-[9px] sm:text-[11px] font-semibold tracking-widest text-white">{item.label}</div>
            <div className="hidden sm:block text-[10px] uppercase tracking-[0.28em] text-white/40">{item.sublabel}</div>

            {/* Active indicator */}
            {activeTab === item.id && (
              <div className="absolute -right-1 top-4 bottom-4 w-1 rounded-l bg-white/80" />
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
          className={`w-full px-3 py-3 rounded-xl flex items-center justify-center gap-2 transition-all border ${isSettingsOpen
              ? 'bg-white/5 border-white/30 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/5 border-white/10'
            }`}
          title="Settings"
        >
          <IconSettings className="w-5 h-5" />
          <span className="text-[9px] sm:text-[11px] uppercase tracking-[0.3em]">Settings</span>
        </button>

        {/* User avatar */}
        <button
          onClick={onOpenOperator}
          className={`w-full px-3 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border ${
            isOperatorOpen
              ? 'bg-white/10 border-white/40 text-white'
              : 'bg-black border-white/10 text-white hover:bg-white/5'
          }`}
          title="Operator"
        >
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center text-xs font-bold ${
              isOperatorOpen ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/10'
            }`}
          >
            AP
          </div>
          <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-white/70">Operator</div>
          <IconUser className="w-4 h-4 text-white/50 hidden sm:block" />
        </button>
      </div>
    </div>
  );
}
