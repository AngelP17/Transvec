import { useState, lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import SettingsPanel from './components/SettingsPanel';
import OperatorPanel from './components/OperatorPanel';
import SystemStatusPanel from './components/SystemStatusPanel';
import { useSupabaseData } from './hooks/useSupabaseData';
import { mockShipments, mockAlerts } from './data/mockData';
import type { ViewTab, Shipment, Alert } from './types';
const CodeWorkbook = lazy(() => import('./components/CodeWorkbook'));
const OntologyGraph = lazy(() => import('./components/OntologyGraph'));
const AlertPanel = lazy(() => import('./components/AlertPanel'));
const ShipmentDetail = lazy(() => import('./components/ShipmentDetail'));
const DVRTimeline = lazy(() => import('./components/DVRTimeline'));

// Loading overlay - non-disruptive, appears on top of existing content
function DataLoadingIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-void-lighter/90 backdrop-blur border border-border px-3 py-2 rounded-lg shadow-xl transition-opacity duration-300">
      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-text-muted">Syncing...</span>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>('OPS');
  const [isWorkbookOpen, setIsWorkbookOpen] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showDVR, setShowDVR] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [operatorOpen, setOperatorOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showBreaches, setShowBreaches] = useState(true);
  const handledDeepLinkRef = useRef<string | null>(null);

  // Fetch data from Supabase
  const {
    shipments,
    alerts,
    loading,
    error,
    useMockFallback,
    fabHealth,
    acknowledgeAlertById,
    refreshData
  } = useSupabaseData();

  // Mark initial load as complete after first data fetch
  useEffect(() => {
    if (!loading && !initialLoadComplete) {
      setInitialLoadComplete(true);
    }
  }, [loading, initialLoadComplete]);

  useEffect(() => {
    if (activeTab !== 'OPS' && focusMode) {
      setFocusMode(false);
    }
  }, [activeTab, focusMode]);

  useEffect(() => {
    if (focusMode) {
      setSettingsOpen(false);
      setOperatorOpen(false);
      setShowDVR(false);
    }
  }, [focusMode]);

  // Merge mock data + Supabase data (Supabase takes precedence on collisions)
  const hasLiveShipments = shipments.length > 0 && !useMockFallback;
  const hasLiveAlerts = alerts.length > 0 && !useMockFallback;

  const effectiveShipments = useMemo(() => (
    Array.from(
      new Map(
        [...mockShipments, ...shipments].map((shipment) => [shipment.id, shipment])
      ).values()
    )
  ), [shipments]);
  const effectiveAlerts = useMemo(() => (
    Array.from(
      new Map(
        [...mockAlerts, ...alerts].map((alert) => [alert.id, alert])
      ).values()
    )
  ), [alerts]);
  const isUsingLiveData = hasLiveShipments || hasLiveAlerts;
  const isHybridMode = isUsingLiveData && (mockShipments.length > 0 || mockAlerts.length > 0);
  const isOpsFocusMode = focusMode && activeTab === 'OPS';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!effectiveShipments.length) return;
    const { search } = window.location;
    if (!search || handledDeepLinkRef.current === search) return;

    const params = new URLSearchParams(search);
    const trackingId = params.get('trackingId') || params.get('trackingCode') || params.get('track') || '';
    const jobId = params.get('jobId') || params.get('linkedJobId') || '';
    const query = params.get('q') || params.get('search') || '';
    const status = params.get('status') || '';

    const exact = effectiveShipments.find((shipment) => {
      const trackingMatch = trackingId && shipment.trackingCode.toLowerCase() === trackingId.toLowerCase();
      const jobMatch = jobId && shipment.dossier?.linkedJobId?.toLowerCase() === jobId.toLowerCase();
      const idMatch = trackingId && shipment.id.toLowerCase() === trackingId.toLowerCase();
      return trackingMatch || jobMatch || idMatch;
    });

    const fuzzyQuery = (trackingId || jobId || query).toLowerCase().trim();
    const fuzzy = !exact && fuzzyQuery
      ? effectiveShipments.find((shipment) => {
        const haystack = [
          shipment.id,
          shipment.trackingCode,
          shipment.dossier?.linkedJobId,
          shipment.status,
          shipment.statusLabel,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const statusMatches = !status || shipment.status.toLowerCase() === status.toLowerCase();
        return statusMatches && haystack.includes(fuzzyQuery);
      })
      : null;

    const targetShipment = exact || fuzzy;
    if (!targetShipment) {
      handledDeepLinkRef.current = search;
      return;
    }

    setActiveTab('OPS');
    setFocusMode(false);
    setSelectedAlert(null);
    setSelectedShipment(targetShipment);
    handledDeepLinkRef.current = search;
  }, [effectiveShipments]);

  const handleAlertClick = (alert: Alert) => {
    setSelectedAlert(alert);
    const shipment = effectiveShipments.find(s => s.id === alert.shipmentId);
    if (shipment) {
      setSelectedShipment(shipment);
    }
  };

  const handleShipmentSelect = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setSelectedAlert(null);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    const success = await acknowledgeAlertById(alertId);
    if (success && selectedAlert?.id === alertId) {
      setSelectedAlert(null);
    }
  };

  const handleToggleOverlays = () => {
    const next = !(showGeofences && showRoutes && showBreaches);
    setShowGeofences(next);
    setShowRoutes(next);
    setShowBreaches(next);
  };

  const handleExport = () => {
    const payload = {
      tab: activeTab,
      timestamp: new Date().toISOString(),
      shipments: effectiveShipments,
      alerts: effectiveAlerts,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transvec_${activeTab.toLowerCase()}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-full bg-void text-text-bright overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alertCount={effectiveAlerts.filter(a => !a.acknowledged).length}
        onOpenSettings={() => { setSettingsOpen((prev) => !prev); setOperatorOpen(false); setFocusMode(false); }}
        isSettingsOpen={settingsOpen}
        onOpenOperator={() => { setOperatorOpen((prev) => !prev); setSettingsOpen(false); setFocusMode(false); }}
        isOperatorOpen={operatorOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden" style={{ height: '100%' }}>
        {/* Map / Visualization Area */}
        <div
          className={`flex-1 relative transition-all duration-300 ${isWorkbookOpen && activeTab === 'ANALYTICS' ? 'w-1/2' : 'w-full'}`}
          style={{ minHeight: 0, height: '100%' }}
        >

          {/* Loading indicator - non-intrusive */}
          {!isOpsFocusMode && <DataLoadingIndicator visible={loading && initialLoadComplete} />}

          {/* Error indicator */}
          {!isOpsFocusMode && error && (
            <div className="absolute top-4 right-4 z-50 bg-critical/20 border border-critical/50 px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-critical text-sm">{error}</span>
                <button
                  onClick={refreshData}
                  className="text-accent text-sm hover:underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Data source indicator */}
          {!isOpsFocusMode && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-void-lighter/90 border border-border px-3 py-1.5 rounded-lg">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isUsingLiveData ? 'bg-success animate-pulse' : 'bg-warning'}`} />
                <span className="text-[10px] text-text-muted uppercase tracking-wider">
                  {isUsingLiveData ? (isHybridMode ? 'Live + Demo' : 'Live Data') : 'Demo Mode'}
                </span>
              </div>
            </div>
          )}

          <SystemStatusPanel
            activeTab={activeTab}
            liveData={isUsingLiveData}
            shipmentCount={effectiveShipments.length}
            alertCount={effectiveAlerts.filter(a => !a.acknowledged).length}
            fabHealth={fabHealth}
            onRefresh={refreshData}
            onToggleOverlays={handleToggleOverlays}
            onExport={handleExport}
            focusMode={focusMode}
          />

          {activeTab === 'OPS' && (
            <MapView
              shipments={effectiveShipments}
              selectedShipment={selectedShipment}
              onShipmentSelect={handleShipmentSelect}
              alerts={effectiveAlerts}
              showGeofences={showGeofences}
              showRoutes={showRoutes}
              showBreaches={showBreaches}
              focusMode={focusMode}
              onFocusModeChange={setFocusMode}
            />
          )}

          {activeTab === 'ANALYTICS' && (
            <div className="absolute inset-0 flex items-center justify-center bg-void-light/60">
              <div className="w-[560px] border border-border bg-void/90 rounded-2xl p-6 shadow-2xl">
                <div className="text-xs uppercase tracking-[0.4em] text-text-muted mb-2">Analytics Workspace</div>
                <div className="text-xl font-semibold text-text-bright mb-4">Telemetry & Forecast Console</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-xl border border-border bg-void-lighter/70 p-4">
                    <div className="text-[11px] uppercase tracking-[0.3em] text-text-muted">Active Streams</div>
                    <div className="text-2xl font-mono text-text-bright mt-2">{effectiveShipments.length}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-void-lighter/70 p-4">
                    <div className="text-[11px] uppercase tracking-[0.3em] text-text-muted">Open Alerts</div>
                    <div className="text-2xl font-mono text-critical mt-2">{effectiveAlerts.filter(a => !a.acknowledged).length}</div>
                  </div>
                  {fabHealth && fabHealth.simulationCount > 0 && (
                    <div className="rounded-xl border border-border bg-void-lighter/70 p-4 col-span-2">
                      <div className="text-[11px] uppercase tracking-[0.3em] text-text-muted">Capacity Simulation</div>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <div>
                          <div className="text-text-bright font-semibold">{fabHealth.latestSimulationName || 'Capacity Forecast'}</div>
                          <div className="text-[11px] text-text-muted">
                            {fabHealth.simulationCount} model runs
                          </div>
                        </div>
                        <div className="text-right font-mono text-text-bright">
                          {fabHealth.meanThroughput != null ? `${fabHealth.meanThroughput.toFixed(0)} wph` : '—'}
                          {fabHealth.p95Throughput != null && (
                            <div className="text-[11px] text-text-muted">p95 {fabHealth.p95Throughput.toFixed(0)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="col-span-2 rounded-xl border border-border bg-void-lighter/70 p-4 text-xs text-text-muted">
                    Use the workbook drawer below to run queries, simulations, and anomaly scans in real time.
                  </div>
                </div>
              </div>
            </div>
          )}

          <Suspense fallback={null}>
            {activeTab === 'ONTOLOGY' && (
              <OntologyGraph
                shipments={effectiveShipments}
                onNodeSelect={(node) => {
                  if (node.type === 'shipment') {
                    const shipment = effectiveShipments.find(s => s.trackingCode === node.data.label);
                    if (shipment) handleShipmentSelect(shipment);
                  }
                }}
              />
            )}
          </Suspense>

          <Suspense fallback={null}>
            {activeTab === 'ALERTS' && (
              <AlertPanel
                alerts={effectiveAlerts}
                onAlertClick={handleAlertClick}
                selectedAlert={selectedAlert}
                onAcknowledgeAlert={handleAcknowledgeAlert}
              />
            )}
          </Suspense>

          {/* Toggle Workbook Button */}
          {activeTab === 'ANALYTICS' && !isWorkbookOpen && (
            <button
              onClick={() => setIsWorkbookOpen(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-void-lighter border border-border rounded-l-lg p-2 text-accent hover:bg-border transition-colors z-10"
              title="Open Code Workbook"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <line x1="9" x2="15" y1="3" y2="3" />
                <line x1="9" x2="15" y1="21" y2="21" />
              </svg>
            </button>
          )}
        </div>

        {/* Code Workbook Panel */}
        <Suspense fallback={null}>
          {activeTab === 'ANALYTICS' && isWorkbookOpen && (
            <CodeWorkbook
              onClose={() => setIsWorkbookOpen(false)}
              selectedShipment={selectedShipment}
            />
          )}
        </Suspense>

        {/* Shipment Detail Panel */}
          <Suspense fallback={null}>
          {selectedShipment && activeTab === 'OPS' && !isOpsFocusMode && (
            <ShipmentDetail
              shipment={selectedShipment}
              onClose={() => setSelectedShipment(null)}
              onOpenDVR={() => setShowDVR(true)}
            />
          )}
        </Suspense>

        {/* DVR Timeline Modal */}
          <Suspense fallback={null}>
          {showDVR && selectedShipment && !isOpsFocusMode && (
            <DVRTimeline
              shipment={selectedShipment}
              onClose={() => setShowDVR(false)}
            />
          )}
        </Suspense>

        <SettingsPanel
          isOpen={settingsOpen && !isOpsFocusMode}
          onClose={() => setSettingsOpen(false)}
          showGeofences={showGeofences}
          showRoutes={showRoutes}
          showBreaches={showBreaches}
          onToggleGeofences={() => setShowGeofences((prev) => !prev)}
          onToggleRoutes={() => setShowRoutes((prev) => !prev)}
          onToggleBreaches={() => setShowBreaches((prev) => !prev)}
        />

        <OperatorPanel
          isOpen={operatorOpen && !isOpsFocusMode}
          onClose={() => setOperatorOpen(false)}
          activeTab={activeTab}
          isUsingLiveData={isUsingLiveData}
        />
      </div>
    </div>
  );
}

export default App;
