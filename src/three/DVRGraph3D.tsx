import { Suspense, lazy, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { useGPUTier } from './useGPUTier';
import type { DVRGraphData } from './types';

// Lazy load the heavy 3D components
const DVRSurface = lazy(() => import('./DVRSurface'));
const DVRThresholdPlane = lazy(() => import('./DVRThresholdPlane'));
const DVRAnomalyParticles = lazy(() => import('./DVRAnomalyParticles'));

interface DVRGraph3DProps {
  data: DVRGraphData;
  width?: number;
  height?: number;
  className?: string;
}

// Calculate breach count
function calculateBreachCount(values: number[], threshold?: number): number {
  if (!threshold) return 0;
  return values.filter(v => v > threshold).length;
}

// 2D SVG fallback for low GPU tier
function SVGGraphFallback({ 
  data, 
  width, 
  height 
}: { 
  data: DVRGraphData; 
  width: number; 
  height: number;
}) {
  const { values, currentIndex, color, threshold, thresholdColor = '#FF4D4F' } = data;
  
  const max = Math.max(...values, threshold || 0) * 1.1;
  const min = Math.min(...values) * 0.9;
  const range = max - min;
  
  const padding = 5;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;
  
  const points = values.map((value, i) => {
    const x = (i / (values.length - 1)) * graphWidth + padding;
    const y = height - padding - ((value - min) / range) * graphHeight;
    return `${x},${y}`;
  }).join(' ');
  
  const currentX = (currentIndex / (values.length - 1)) * graphWidth + padding;
  
  return (
    <svg width={width} height={height} className="bg-code-bg rounded">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line
          key={t}
          x1={padding}
          y1={height - padding - t * graphHeight}
          x2={width - padding}
          y2={height - padding - t * graphHeight}
          stroke="#2b3b47"
          strokeWidth="0.5"
          opacity="0.3"
        />
      ))}
      
      {/* Threshold line */}
      {threshold && (
        <line
          x1={padding}
          y1={height - padding - ((threshold - min) / range) * graphHeight}
          x2={width - padding}
          y2={height - padding - ((threshold - min) / range) * graphHeight}
          stroke={thresholdColor}
          strokeWidth="1"
          strokeDasharray="4 2"
          opacity="0.8"
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
        cy={height - padding - ((values[currentIndex] - min) / range) * graphHeight}
        r="4"
        fill="#fff"
      />
    </svg>
  );
}

// 3D Scene component
function DVRScene({ data }: { data: DVRGraphData }) {
  const gpu = useGPUTier();
  const { values, currentIndex, color, threshold, thresholdColor = '#FF4D4F' } = data;
  
  const breachCount = useMemo(() => 
    calculateBreachCount(values, threshold),
    [values, threshold]
  );
  
  const maxValue = useMemo(() => Math.max(...values, 0.1) * 1.1, [values]);
  const minValue = useMemo(() => Math.min(...values, 0) * 0.9, [values]);
  
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 3, 8]} fov={45} />
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 7]} intensity={0.8} />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} color={color} />
      
      {/* Surface mesh */}
      <DVRSurface
        data={values}
        currentIndex={currentIndex}
        color={color}
        threshold={threshold}
        gpu={gpu}
      />
      
      {/* Threshold plane */}
      {threshold && (
        <DVRThresholdPlane
          threshold={threshold}
          maxValue={maxValue}
          minValue={minValue}
          color={thresholdColor}
          breachCount={breachCount}
        />
      )}
      
      {/* Anomaly particles */}
      {threshold && gpu.tier !== 'low' && (
        <DVRAnomalyParticles
          data={values}
          threshold={threshold}
          currentIndex={currentIndex}
          color={thresholdColor}
          gpu={gpu}
        />
      )}
      
      {/* Subtle grid floor */}
      <gridHelper args={[12, 20, '#2b3b47', '#1a2a35']} position={[0, 0, 0]} />
    </>
  );
}

export default function DVRGraph3D({ 
  data, 
  width = 350, 
  height = 120,
  className 
}: DVRGraph3DProps) {
  const gpu = useGPUTier();
  const is2DMode = gpu.dvrGraphMode === '2d';
  
  if (is2DMode) {
    return (
      <div className={className} style={{ width, height }}>
        <SVGGraphFallback data={data} width={width} height={height} />
      </div>
    );
  }
  
  return (
    <div 
      className={className}
      style={{ 
        width, 
        height, 
        background: 'transparent',
        borderRadius: '4px',
        overflow: 'hidden'
      }}
    >
      <Canvas
        frameloop="always"
        gl={{
          antialias: gpu.tier !== 'low',
          alpha: true,
          powerPreference: 'low-power',
        }}
        camera={{ position: [0, 3, 8], fov: 45 }}
        style={{
          width: '100%',
          height: '100%',
          background: '#0a1620',
        }}
      >
        <Suspense fallback={null}>
          <DVRScene data={data} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export type { DVRGraph3DProps, DVRGraphData };
