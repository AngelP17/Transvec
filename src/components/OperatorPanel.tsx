import { IconX, IconUser, IconClipboard, IconDownload, IconWifi, IconDatabase } from '@tabler/icons-react';
import { useState } from 'react';

interface OperatorPanelProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab: string;
    isUsingLiveData: boolean;
}

function InfoRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-b-0">
            <span className="text-xs text-text-muted">{label}</span>
            <span className={`text-xs font-semibold ${accent ? 'text-white' : 'text-text-bright'}`}>{value}</span>
        </div>
    );
}

export default function OperatorPanel({ isOpen, onClose, activeTab, isUsingLiveData }: OperatorPanelProps) {
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const sessionId = `TVX-${Date.now().toString(36).toUpperCase()}`;
    const sessionStart = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 2000);
    };

    const handleCopySessionId = () => {
        navigator.clipboard.writeText(sessionId).then(() => showToast('Session ID copied'));
    };

    const handleExportLog = () => {
        const log = {
            operator: 'AP',
            role: 'Ops Analyst',
            session: sessionId,
            activeTab,
            dataSource: isUsingLiveData ? 'Live' : 'Demo',
            exportedAt: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session_${sessionId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Session log exported');
    };

    const panelWidthClass = 'w-[min(360px,calc(100vw-1rem))]';

    return (
        <div className={`absolute inset-y-0 right-0 ${panelWidthClass} border-l border-border bg-void/95 backdrop-blur-xl shadow-2xl z-40 transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm font-bold text-white">
                        AP
                    </div>
                    <div>
                        <div className="text-sm font-semibold tracking-wider text-text-bright">OPERATOR</div>
                        <div className="text-[11px] uppercase tracking-[0.3em] text-text-muted">Profile</div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded border border-border text-text-muted hover:text-text-bright hover:bg-void-lighter"
                    aria-label="Close operator panel"
                >
                    <IconX className="w-4 h-4" />
                </button>
            </div>

            <div className="px-5 py-4 space-y-6 overflow-y-auto h-full">
                {/* Operator Identity */}
                <section className="bg-void-lighter/70 border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <IconUser className="w-4 h-4 text-white/70" />
                        <div className="text-xs font-semibold tracking-wider text-text-bright">IDENTITY</div>
                    </div>
                    <InfoRow label="Operator" value="Angel P." />
                    <InfoRow label="Role" value="Ops Analyst" />
                    <InfoRow label="Company" value="Transvec Logistics" />
                    <InfoRow label="Clearance" value="Full Access" accent />
                </section>

                {/* Session Info */}
                <section className="bg-void-lighter/70 border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <IconWifi className="w-4 h-4 text-white/70" />
                        <div className="text-xs font-semibold tracking-wider text-text-bright">SESSION</div>
                    </div>
                    <InfoRow label="Session ID" value={sessionId} />
                    <InfoRow label="Started" value={sessionStart} />
                    <InfoRow label="Active Tab" value={activeTab} />
                    <InfoRow label="Data Source" value={isUsingLiveData ? 'Live' : 'Demo'} accent />
                </section>

                {/* System */}
                <section className="bg-void-lighter/70 border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <IconDatabase className="w-4 h-4 text-white/70" />
                        <div className="text-xs font-semibold tracking-wider text-text-bright">SYSTEM</div>
                    </div>
                    <InfoRow label="Environment" value="Production" />
                    <InfoRow label="Supabase" value="Connected" accent />
                    <InfoRow label="Edge Functions" value="Active" accent />
                    <InfoRow label="Version" value="v2.4.1" />
                </section>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleExportLog}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-void-lighter/70 text-text-bright text-xs font-semibold hover:bg-white/5 transition"
                    >
                        <IconDownload className="w-4 h-4" />
                        Export Log
                    </button>
                    <button
                        onClick={handleCopySessionId}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-void-lighter/70 text-text-bright text-xs font-semibold hover:bg-white/5 transition"
                    >
                        <IconClipboard className="w-4 h-4" />
                        Copy ID
                    </button>
                </div>
            </div>

            {/* Toast */}
            {toastMsg && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 text-black text-xs font-semibold px-4 py-2 rounded-full shadow-xl animate-pulse">
                    {toastMsg}
                </div>
            )}
        </div>
    );
}
