import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { GlobeGlyph, BracketsGlyph, NetworkGlyph, BellGlyph } from './SidebarGlyphs';
import type { ViewTab } from '../types';

interface SidebarIcon3DProps {
  tab: ViewTab;
  isActive: boolean;
  alertCount?: number;
  color?: string;
  fallback?: React.ReactNode;
}

// Individual icon canvas component
function IconScene({ 
  tab, 
  isActive, 
  alertCount = 0,
  color = '#2D72D2' 
}: { 
  tab: ViewTab; 
  isActive: boolean; 
  alertCount?: number;
  color?: string;
}) {
  const glyph = useMemo(() => {
    switch (tab) {
      case 'OPS':
        return <GlobeGlyph isActive={isActive} color={color} />;
      case 'ANALYTICS':
        return <BracketsGlyph isActive={isActive} color={color} />;
      case 'ONTOLOGY':
        return <NetworkGlyph isActive={isActive} color={color} />;
      case 'ALERTS':
        return <BellGlyph isActive={isActive} color={color} alertCount={alertCount} />;
      default:
        return null;
    }
  }, [tab, isActive, alertCount, color]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={50} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[2, 2, 4]} intensity={1.2} />
      <directionalLight position={[-2, -2, 2]} intensity={0.4} color="#4a9eff" />
      {glyph}
    </>
  );
}

// Main exported component - 48x48 Canvas with SVG fallback
export default function SidebarIcon3D({ 
  tab, 
  isActive, 
  alertCount = 0,
  color = '#2D72D2',
  fallback 
}: SidebarIcon3DProps) {
  
  // SVG fallbacks for each tab
  const svgFallbacks: Record<ViewTab, React.ReactNode> = {
    OPS: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
        <path d="M2 12h20"/>
      </svg>
    ),
    ANALYTICS: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    ONTOLOGY: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"/>
        <circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/>
        <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
      </svg>
    ),
    ALERTS: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
      </svg>
    ),
  };

  const finalFallback = fallback || svgFallbacks[tab];

  // Check for WebGL support
  const hasWebGL = useMemo(() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
      return false;
    }
  }, []);

  if (!hasWebGL) {
    return <>{finalFallback}</>;
  }

  return (
    <div 
      className="w-6 h-6 relative"
      style={{ 
        width: 24, 
        height: 24,
        color: isActive ? color : 'inherit'
      }}
    >
      <Canvas
        frameloop={isActive ? 'always' : 'demand'}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: 'low-power',
        }}
        camera={{ position: [0, 0, 3], fov: 50 }}
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent',
        }}
      >
        <Suspense fallback={null}>
          <IconScene 
            tab={tab} 
            isActive={isActive} 
            alertCount={alertCount}
            color={color}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
