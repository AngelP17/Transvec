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
  isMobileLayout?: boolean;
}

const navItems: { id: ViewTab; label: string; sublabel: string; icon: React.ReactNode }[] = [
  { id: 'OPS', label: 'OPS', sublabel: 'Operational Grid', icon: <IconRadar className="w-5 h-5" /> },
  { id: 'ANALYTICS', label: 'ANALYTICS', sublabel: 'Workbook', icon: <IconTimelineEvent className="w-5 h-5" /> },
  { id: 'ONTOLOGY', label: 'ONTOLOGY', sublabel: 'Graph Core', icon: <IconBinaryTree2 className="w-5 h-5" /> },
  { id: 'ALERTS', label: 'ALERTS', sublabel: 'Incident Desk', icon: <IconAlertTriangle className="w-5 h-5" /> },
];

export default function Sidebar({
  activeTab,
  onTabChange,
  alertCount,
  onOpenSettings,
  isSettingsOpen = false,
  onOpenOperator,
  isOperatorOpen = false,
  isMobileLayout = false,
}: SidebarProps) {
  return (
    <div className={`
      z-40 flex items-center bg-black/90
      ${isMobileLayout
        ? 'fixed bottom-0 left-0 right-0 h-20 border-t border-white/10 px-2'
        : 'relative order-1 h-auto w-24 flex-col justify-start border-r border-white/10 px-0 py-6 md:w-28 lg:w-32'
      }
    `}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_60%)] ${isMobileLayout ? 'hidden' : 'block'}`} />
      {/* Logo */}
      <div className={`${isMobileLayout ? 'hidden' : 'mb-6 flex flex-col items-center gap-2'}`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black text-white shadow-[0_0_20px_rgba(0,0,0,0.45)] sm:h-12 sm:w-12">
          <IconRadar className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="text-[10px] sm:text-[12px] font-display italic tracking-[0.2em] text-white/90">Transvec</div>
      </div>

      {/* Navigation Items */}
      <div className={`
        flex flex-1 items-center overflow-x-auto px-1
        ${isMobileLayout ? 'gap-1' : 'flex-col gap-3 px-3'}
      `}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`
              relative flex flex-col items-center rounded-xl border px-2 transition-all group cursor-pointer
              ${isMobileLayout ? 'min-w-[4.25rem] flex-1 gap-1 py-2' : 'w-full min-w-0 gap-2 px-3 py-3'}
              ${activeTab === item.id
                ? 'bg-white/5 text-white border-white/30 shadow-[0_0_18px_rgba(0,0,0,0.4)]'
                : 'text-white/50 border-white/10 hover:text-white hover:bg-white/5'
              }
            `}
            title={item.label}
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isMobileLayout ? '' : 'sm:h-10 sm:w-10'} ${activeTab === item.id ? 'bg-black border border-white/20' : 'bg-black/60 border border-white/10'}`}>
              <span className={`${activeTab === item.id ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                {item.icon}
              </span>
            </div>
            <div className={`text-[8px] font-semibold tracking-[0.16em] text-white ${isMobileLayout ? '' : 'sm:text-[11px] sm:tracking-widest'}`}>{item.label}</div>
            <div className={`${isMobileLayout ? 'hidden' : 'hidden sm:block text-[10px] uppercase tracking-[0.28em] text-white/40'}`}>{item.sublabel}</div>

            {/* Active indicator */}
            {activeTab === item.id && (
              <div className={`absolute bg-white/80 ${isMobileLayout ? '-top-1 left-4 right-4 h-1 rounded-b' : '-right-1 bottom-4 top-4 w-1 rounded-l'}`} />
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
      <div className={`${isMobileLayout ? 'ml-2 flex items-center gap-2' : 'mt-auto flex w-full flex-col gap-3 px-3'}`}>
        <button
          onClick={onOpenSettings}
          className={`${isMobileLayout ? 'h-10 w-10 rounded-lg px-0 py-0' : 'w-full rounded-xl px-3 py-3'} flex items-center justify-center gap-2 transition-all border cursor-pointer ${isSettingsOpen
              ? 'bg-white/5 border-white/30 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/5 border-white/10'
            }`}
          title="Settings"
        >
          <IconSettings className="w-5 h-5" />
          <span className={`${isMobileLayout ? 'hidden' : 'text-[9px] sm:text-[11px] uppercase tracking-[0.3em]'}`}>Settings</span>
        </button>

        {/* User avatar */}
        <button
          onClick={onOpenOperator}
          className={`${isMobileLayout ? 'h-10 w-10 rounded-lg px-0 py-0' : 'w-full rounded-xl px-3 py-3'} flex items-center justify-center gap-2 transition-colors border cursor-pointer ${
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
          <div className={`${isMobileLayout ? 'hidden' : 'text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-white/70'}`}>Operator</div>
          <IconUser className={`w-4 h-4 text-white/50 ${isMobileLayout ? 'hidden' : 'block'}`} />
        </button>
      </div>
    </div>
  );
}
