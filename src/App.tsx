import { useState, lazy, Suspense, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
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
  
  // Fetch data from Supabase
  const { 
    shipments, 
    alerts, 
    loading, 
    error, 
    useMockFallback,
    acknowledgeAlertById,
    refreshData 
  } = useSupabaseData();

  // Mark initial load as complete after first data fetch
  useEffect(() => {
    if (!loading && !initialLoadComplete) {
      setInitialLoadComplete(true);
    }
  }, [loading, initialLoadComplete]);

  // Use mock data as base, overlay Supabase data when available
  // This prevents UI from disappearing during load
  const effectiveShipments = shipments.length > 0 ? shipments : mockShipments;
  const effectiveAlerts = alerts.length > 0 ? alerts : mockAlerts;
  const isUsingLiveData = shipments.length > 0 && !useMockFallback;

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

  return (
    <div className="flex h-screen w-full bg-void text-text-bright overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alertCount={effectiveAlerts.filter(a => !a.acknowledged).length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden" style={{ height: '100%' }}>
        {/* Map / Visualization Area */}
        <div 
          className={`flex-1 relative transition-all duration-300 ${isWorkbookOpen && activeTab === 'ANALYTICS' ? 'w-1/2' : 'w-full'}`}
          style={{ minHeight: 0, height: '100%' }}
        >
          
          {/* Loading indicator - non-intrusive */}
          <DataLoadingIndicator visible={loading && initialLoadComplete} />
          
          {/* Error indicator */}
          {error && (
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
          <div className="absolute bottom-4 right-4 z-50 bg-void-lighter/90 border border-border px-3 py-1.5 rounded-lg">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isUsingLiveData ? 'bg-success animate-pulse' : 'bg-warning'}`} />
              <span className="text-[10px] text-text-muted uppercase tracking-wider">
                {isUsingLiveData ? 'Live Data' : 'Demo Mode'}
              </span>
            </div>
          </div>

          {activeTab === 'OPS' && (
            <MapView
              shipments={effectiveShipments}
              selectedShipment={selectedShipment}
              onShipmentSelect={handleShipmentSelect}
              alerts={effectiveAlerts}
            />
          )}

            {activeTab === 'ONTOLOGY' && (
              <OntologyGraph
                onNodeSelect={(node) => {
                  if (node.type === 'shipment') {
                    const shipment = effectiveShipments.find(s => s.trackingCode === node.data.label);
                    if (shipment) handleShipmentSelect(shipment);
                  }
                }}
              />
            )}

            {activeTab === 'ALERTS' && (
              <AlertPanel
                alerts={effectiveAlerts}
                onAlertClick={handleAlertClick}
                selectedAlert={selectedAlert}
                onAcknowledgeAlert={handleAcknowledgeAlert}
              />
            )}

          {/* Toggle Workbook Button */}
          {activeTab === 'ANALYTICS' && !isWorkbookOpen && (
            <button
              onClick={() => setIsWorkbookOpen(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-void-lighter border border-border rounded-l-lg p-2 text-accent hover:bg-border transition-colors z-10"
              title="Open Code Workbook"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <line x1="9" x2="15" y1="3" y2="3"/>
                <line x1="9" x2="15" y1="21" y2="21"/>
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
          {selectedShipment && activeTab === 'OPS' && (
            <ShipmentDetail
              shipment={selectedShipment}
              onClose={() => setSelectedShipment(null)}
              onOpenDVR={() => setShowDVR(true)}
            />
          )}
        </Suspense>

        {/* DVR Timeline Modal */}
        <Suspense fallback={null}>
          {showDVR && selectedShipment && (
            <DVRTimeline
              shipment={selectedShipment}
              onClose={() => setShowDVR(false)}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}

export default App;
