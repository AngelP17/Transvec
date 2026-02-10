import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { generateTelemetryHistory } from '../data/mockData';
import type { Shipment, TelemetryReading } from '../types';
import { useGPUTier } from '../three/useGPUTier';

// Lazy load the 3D graph component
const DVRGraph3D = lazy(() => import('../three/DVRGraph3D'));

interface DVRTimelineProps {
  shipment: Shipment;
  onClose: () => void;
}

export default function DVRTimeline({ shipment, onClose }: DVRTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showGraphs, setShowGraphs] = useState(true);
  
  const gpu = useGPUTier();
  const use3DGraphs = gpu.dvrGraphMode === '3d';
  
  const telemetryHistory = useRef<TelemetryReading[]>(generateTelemetryHistory(shipment.id, 200));
  const totalPoints = telemetryHistory.current.length;
  const currentData = telemetryHistory.current[currentIndex];
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Playback control
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= totalPoints - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 100 / playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, totalPoints]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentIndex(parseInt(e.target.value));
    setIsPlaying(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Find events (anomalies)
  const events = telemetryHistory.current
    .map((data, index) => {
      if (data.shock && data.shock > 3) {
        return { index, type: 'SHOCK', value: data.shock, data };
      }
      if (data.temperature && data.temperature > 25) {
        return { index, type: 'TEMP', value: data.temperature, data };
      }
      if (data.vibration && data.vibration > 100) {
        return { index, type: 'VIBRATION', value: data.vibration, data };
      }
      return null;
    })
    .filter(Boolean) as Array<{ index: number; type: string; value: number; data: TelemetryReading }>;

  // Graph data for 3D graphs
  const shockGraphData = {
    values: telemetryHistory.current.map(d => d.shock || 0),
    timestamps: telemetryHistory.current.map(d => d.timestamp),
    currentIndex,
    label: 'Shock (G)',
    color: '#2D72D2',
    threshold: 3,
    thresholdColor: '#FF4D4F',
    unit: 'G',
  };

  const tempGraphData = {
    values: telemetryHistory.current.map(d => d.temperature || 0),
    timestamps: telemetryHistory.current.map(d => d.timestamp),
    currentIndex,
    label: 'Temperature (°C)',
    color: '#0F9960',
    threshold: 25,
    thresholdColor: '#FFB000',
    unit: '°C',
  };

  const vibrationGraphData = {
    values: telemetryHistory.current.map(d => d.vibration || 0),
    timestamps: telemetryHistory.current.map(d => d.timestamp),
    currentIndex,
    label: 'Vibration (Hz)',
    color: '#c678dd',
    unit: 'Hz',
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 lg:p-8">
      <div className="w-full max-w-6xl bg-void-lighter border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-void">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-text-bright">Environmental DVR</h2>
              <p className="text-xs sm:text-sm text-text-muted truncate">{shipment.trackingCode} • Playback Mode</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-4">
            {/* GPU Tier indicator */}
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-code-bg text-xs text-text-muted">
              <span className={`w-2 h-2 rounded-full ${
                gpu.tier === 'high' ? 'bg-success' : 
                gpu.tier === 'medium' ? 'bg-warning' : 'bg-critical'
              }`} />
              {gpu.tier.toUpperCase()}
            </div>

            {/* Speed Control */}
            <div className="hidden sm:flex items-center gap-2 bg-code-bg rounded-lg p-1">
              {[0.5, 1, 2, 4].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    playbackSpeed === speed 
                      ? 'bg-accent text-white' 
                      : 'text-text-muted hover:text-text-bright'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setShowGraphs(!showGraphs)}
              className={`p-2 rounded-lg border transition-colors ${
                showGraphs ? 'bg-accent/20 border-accent text-accent' : 'border-border text-text-muted'
              }`}
              title="Toggle Graphs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" x2="18" y1="20" y2="10"/>
                <line x1="12" x2="12" y1="20" y2="4"/>
                <line x1="6" x2="6" y1="20" y2="14"/>
              </svg>
            </button>
            
            <button 
              onClick={onClose}
              className="p-2 hover:bg-border rounded-lg text-text-muted hover:text-text-bright transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left: Map View (Simplified) */}
          <div className="flex-1 relative bg-black">
            <div className="absolute inset-0 grid-pattern opacity-30" />
            
            {/* Current Position Indicator */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="w-6 h-6 bg-accent rounded-full border-2 border-white shadow-lg animate-pulse-glow" />
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <div className="bg-void-lighter border border-border rounded-lg px-3 py-1.5 text-sm">
                    <span className="text-text-muted">Lat: </span>
                    <span className="font-mono text-text-bright">{currentData?.location.lat.toFixed(4)}</span>
                    <span className="text-text-muted ml-3">Lng: </span>
                    <span className="font-mono text-text-bright">{currentData?.location.lng.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Route Path Visualization */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <path
                d={telemetryHistory.current
                  .slice(0, currentIndex + 1)
                  .map((d, i) => `${i === 0 ? 'M' : 'L'} ${50 + (d.location.lng - telemetryHistory.current[0].location.lng) * 100} ${50 + (d.location.lat - telemetryHistory.current[0].location.lat) * 100}`)
                  .join(' ')}
                fill="none"
                stroke="#2D72D2"
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.6"
              />
            </svg>
          </div>

          {/* Right: Graphs */}
          {showGraphs && (
            <div className="w-full lg:w-[420px] border-t lg:border-t-0 lg:border-l border-border bg-void p-3 sm:p-4 space-y-4 overflow-auto">
              {/* Current Values */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-code-bg border border-border rounded-lg p-3">
                  <div className="text-xs text-text-muted mb-1">Shock</div>
                  <div className={`text-2xl font-mono font-bold ${currentData?.shock && currentData.shock > 3 ? 'text-critical' : 'text-text-bright'}`}>
                    {currentData?.shock?.toFixed(2) || '0.00'}
                    <span className="text-sm text-text-muted ml-1">G</span>
                  </div>
                </div>
                <div className="bg-code-bg border border-border rounded-lg p-3">
                  <div className="text-xs text-text-muted mb-1">Temperature</div>
                  <div className={`text-2xl font-mono font-bold ${currentData?.temperature && currentData.temperature > 25 ? 'text-warning' : 'text-text-bright'}`}>
                    {currentData?.temperature?.toFixed(1) || '0.0'}
                    <span className="text-sm text-text-muted ml-1">°C</span>
                  </div>
                </div>
              </div>

              {/* 3D/SVG Graphs */}
              <div className="space-y-4">
                {/* Shock Graph */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-muted">Shock (G)</span>
                    <span className="text-xs font-mono" style={{ color: '#2D72D2' }}>
                      {shockGraphData.values[currentIndex]?.toFixed(2)}
                    </span>
                  </div>
                  {use3DGraphs ? (
                    <Suspense fallback={
                      <SVGGraph 
                        label="Shock (G)"
                        data={telemetryHistory.current.map(d => d.shock || 0)}
                        currentIndex={currentIndex}
                        color="#2D72D2"
                        threshold={3}
                        thresholdColor="#FF4D4F"
                      />
                    }>
                      <DVRGraph3D 
                        data={shockGraphData}
                        width={380}
                        height={100}
                        className="rounded"
                      />
                    </Suspense>
                  ) : (
                    <SVGGraph 
                      label="Shock (G)"
                      data={telemetryHistory.current.map(d => d.shock || 0)}
                      currentIndex={currentIndex}
                      color="#2D72D2"
                      threshold={3}
                      thresholdColor="#FF4D4F"
                    />
                  )}
                </div>

                {/* Temperature Graph */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-muted">Temperature (°C)</span>
                    <span className="text-xs font-mono" style={{ color: '#0F9960' }}>
                      {tempGraphData.values[currentIndex]?.toFixed(1)}
                    </span>
                  </div>
                  {use3DGraphs ? (
                    <Suspense fallback={
                      <SVGGraph 
                        label="Temperature (°C)"
                        data={telemetryHistory.current.map(d => d.temperature || 0)}
                        currentIndex={currentIndex}
                        color="#0F9960"
                        threshold={25}
                        thresholdColor="#FFB000"
                      />
                    }>
                      <DVRGraph3D 
                        data={tempGraphData}
                        width={380}
                        height={100}
                        className="rounded"
                      />
                    </Suspense>
                  ) : (
                    <SVGGraph 
                      label="Temperature (°C)"
                      data={telemetryHistory.current.map(d => d.temperature || 0)}
                      currentIndex={currentIndex}
                      color="#0F9960"
                      threshold={25}
                      thresholdColor="#FFB000"
                    />
                  )}
                </div>

                {/* Vibration Graph */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-muted">Vibration (Hz)</span>
                    <span className="text-xs font-mono" style={{ color: '#c678dd' }}>
                      {vibrationGraphData.values[currentIndex]?.toFixed(0)}
                    </span>
                  </div>
                  {use3DGraphs ? (
                    <Suspense fallback={
                      <SVGGraph 
                        label="Vibration (Hz)"
                        data={telemetryHistory.current.map(d => d.vibration || 0)}
                        currentIndex={currentIndex}
                        color="#c678dd"
                      />
                    }>
                      <DVRGraph3D 
                        data={vibrationGraphData}
                        width={380}
                        height={100}
                        className="rounded"
                      />
                    </Suspense>
                  ) : (
                    <SVGGraph 
                      label="Vibration (Hz)"
                      data={telemetryHistory.current.map(d => d.vibration || 0)}
                      currentIndex={currentIndex}
                      color="#c678dd"
                    />
                  )}
                </div>
              </div>

              {/* Event Log */}
              <div>
                <h4 className="text-sm font-bold text-text-muted mb-2">Event Log</h4>
                <div className="space-y-1 max-h-32 overflow-auto">
                  {events.length === 0 ? (
                    <div className="text-sm text-text-muted">No events detected</div>
                  ) : (
                    events.map((event, i) => (
                      <div 
                        key={i}
                        className={`text-xs p-2 rounded ${
                          currentIndex >= event.index ? 'bg-void-lighter' : 'opacity-50'
                        }`}
                      >
                        <span className={`
                          px-1.5 py-0.5 rounded text-[10px] font-bold
                          ${event.type === 'SHOCK' ? 'bg-critical text-white' : ''}
                          ${event.type === 'TEMP' ? 'bg-warning text-black' : ''}
                          ${event.type === 'VIBRATION' ? 'bg-accent text-white' : ''}
                        `}>
                          {event.type}
                        </span>
                        <span className="ml-2 text-text-bright">{event.value.toFixed(2)}</span>
                        <span className="ml-2 text-text-muted">{formatTime(event.data.timestamp)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Control */}
        <div className="border-t border-border bg-void p-4">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center text-white hover:bg-accent-hover transition-colors"
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              )}
            </button>

            {/* Skip Buttons */}
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 10))}
              className="p-2 hover:bg-border rounded text-text-muted hover:text-text-bright transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/>
              </svg>
            </button>
            <button
              onClick={() => setCurrentIndex(Math.min(totalPoints - 1, currentIndex + 10))}
              className="p-2 hover:bg-border rounded text-text-muted hover:text-text-bright transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>
              </svg>
            </button>

            {/* Timeline Slider */}
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={totalPoints - 1}
                value={currentIndex}
                onChange={handleSliderChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-text-muted mt-1">
                <span>{formatTime(telemetryHistory.current[0].timestamp)}</span>
                <span className="font-mono text-accent">{formatTime(currentData.timestamp)}</span>
                <span>{formatTime(telemetryHistory.current[totalPoints - 1].timestamp)}</span>
              </div>
            </div>

            {/* Progress */}
            <div className="text-right">
              <div className="text-sm font-mono text-text-bright">
                {currentIndex + 1} / {totalPoints}
              </div>
      <div className="text-xs text-text-muted">
                {((currentIndex / (totalPoints - 1)) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SVGGraphProps {
  label: string;
  data: number[];
  currentIndex: number;
  color: string;
  threshold?: number;
  thresholdColor?: string;
}

function SVGGraph({ data, currentIndex, color, threshold, thresholdColor }: SVGGraphProps) {
  const max = Math.max(...data, threshold || 0) * 1.1;
  const min = Math.min(...data) * 0.9;
  const range = max - min;
  
  const width = 380;
  const height = 80;
  const padding = 5;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const currentX = (currentIndex / (data.length - 1)) * (width - padding * 2) + padding;

  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="bg-code-bg rounded">
        {/* Threshold line */}
        {threshold && (
          <line
            x1={padding}
            y1={height - padding - ((threshold - min) / range) * (height - padding * 2)}
            x2={width - padding}
            y2={height - padding - ((threshold - min) / range) * (height - padding * 2)}
            stroke={thresholdColor}
            strokeWidth="1"
            strokeDasharray="4 2"
          />
        )}
        
        {/* Data line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
        />
        
        {/* Current position indicator */}
        <line
          x1={currentX}
          y1={padding}
          x2={currentX}
          y2={height - padding}
          stroke="#fff"
          strokeWidth="1"
          opacity="0.6"
        />
        <circle
          cx={currentX}
          cy={height - padding - ((data[currentIndex] - min) / range) * (height - padding * 2)}
          r="4"
          fill="#fff"
        />
      </svg>
    </div>
  );
}
