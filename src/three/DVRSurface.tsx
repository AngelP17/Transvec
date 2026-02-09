import { useRef, useMemo, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, DoubleSide, BufferGeometry, Float32BufferAttribute, Color } from 'three';
import type { DVRSurfaceProps } from './types';

// Helper to create ribbon mesh geometry from 1D data
function createRibbonGeometry(
  data: number[],
  currentIndex: number,
  segments: number
): { geometry: BufferGeometry; maxValue: number; minValue: number } {
  const width = 10;
  const depth = 4;
  
  const maxValue = Math.max(...data, 0.1) * 1.1;
  const minValue = Math.min(...data, 0) * 0.9;
  const range = maxValue - minValue || 1;
  
  const vertices: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  const colorLow = new Color('#0F9960');
  const colorMid = new Color('#2D72D2');
  const colorHigh = new Color('#FF4D4F');
  const tempColor = new Color();
  
  // Create grid of vertices
  const xCount = Math.min(data.length, segments);
  const zCount = 10; // Depth segments
  
  for (let x = 0; x < xCount; x++) {
    const dataIndex = Math.floor((x / (xCount - 1)) * (data.length - 1));
    const value = data[dataIndex];
    const normalizedValue = (value - minValue) / range;
    
    for (let z = 0; z < zCount; z++) {
      const xPos = (x / (xCount - 1)) * width - width / 2;
      const zPos = (z / (zCount - 1)) * depth - depth / 2;
      
      // Height based on data value with slight falloff toward edges
      const edgeFactor = 1 - Math.abs(zPos / depth) * 0.3;
      const yPos = normalizedValue * 3 * edgeFactor;
      
      vertices.push(xPos, yPos, zPos);
      
      // UVs
      uvs.push(x / (xCount - 1), z / (zCount - 1));
      
      // Vertex color based on height and current position
      const isCurrentRegion = Math.abs(dataIndex - currentIndex) < 5;
      
      if (normalizedValue > 0.7) {
        tempColor.copy(colorHigh);
      } else if (normalizedValue > 0.4) {
        tempColor.copy(colorMid);
      } else {
        tempColor.copy(colorLow);
      }
      
      if (isCurrentRegion) {
        tempColor.lerp(new Color('#ffffff'), 0.3);
      }
      
      colors.push(tempColor.r, tempColor.g, tempColor.b);
      
      // Simple normal calculation (pointing up)
      normals.push(0, 1, 0);
    }
  }
  
  // Create indices
  for (let x = 0; x < xCount - 1; x++) {
    for (let z = 0; z < zCount - 1; z++) {
      const a = x * zCount + z;
      const b = x * zCount + (z + 1);
      const c = (x + 1) * zCount + z;
      const d = (x + 1) * zCount + (z + 1);
      
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }
  
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return { geometry, maxValue, minValue };
}

// Memoized component
const DVRSurface = memo(function DVRSurface({ 
  data, 
  currentIndex, 
  color, 
  gpu 
}: DVRSurfaceProps) {
  const meshRef = useRef<Mesh>(null);
  const wireframeRef = useRef<Mesh>(null);
  const scanLineRef = useRef<Mesh>(null);
  
  // LOD: Adjust segments based on GPU tier
  const segments = useMemo(() => {
    switch (gpu.tier) {
      case 'high': return 100;
      case 'medium': return 60;
      case 'low': return 30;
      default: return 60;
    }
  }, [gpu.tier]);
  
  const { geometry } = useMemo(
    () => createRibbonGeometry(data, currentIndex, segments),
    [data, currentIndex, segments]
  );
  
  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);
  
  // Scan line animation
  useFrame(() => {
    if (!scanLineRef.current) return;
    const progress = currentIndex / (data.length - 1);
    scanLineRef.current.position.x = (progress * 10) - 5;
  });
  
  return (
    <group>
      {/* Main surface */}
      <mesh 
        ref={meshRef} 
        geometry={geometry}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          vertexColors
          side={DoubleSide}
          roughness={0.4}
          metalness={0.3}
          wireframe={false}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Wireframe overlay for tech look */}
      {gpu.tier !== 'low' && (
        <mesh ref={wireframeRef} geometry={geometry}>
          <meshBasicMaterial
            color={color}
            wireframe
            transparent
            opacity={0.15}
          />
        </mesh>
      )}
      
      {/* Scan line indicator */}
      <mesh ref={scanLineRef} position={[0, 0, 0]}>
        <planeGeometry args={[0.05, 4.2]} />
        <meshBasicMaterial 
          color="#ffffff" 
          transparent 
          opacity={0.8}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
});

export default DVRSurface;
export type { DVRSurfaceProps };
