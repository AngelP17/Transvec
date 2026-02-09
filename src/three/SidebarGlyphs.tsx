import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Shape,
  ExtrudeGeometry,
  Mesh,
  Group,
  Vector2,
  LatheGeometry,
} from 'three';

// Globe Glyph (OPS) - wireframe sphere + meridians
interface GlobeGlyphProps {
  isActive: boolean;
  color: string;
}

const GlobeGlyph = memo(function GlobeGlyph({ isActive, color }: GlobeGlyphProps) {
  const groupRef = useRef<Group>(null);
  const pulseRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    // Slow rotation when active
    groupRef.current.rotation.y += delta * 0.3;
    groupRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
    
    if (isActive) {
      pulseRef.current += delta * 4;
      const pulse = 1 + Math.sin(pulseRef.current) * 0.05;
      groupRef.current.scale.setScalar(pulse);
    } else {
      groupRef.current.scale.setScalar(1);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main sphere wireframe */}
      <mesh>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.6} />
      </mesh>
      
      {/* Equator ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.02, 8, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      
      {/* Prime meridian ring */}
      <mesh>
        <torusGeometry args={[1, 0.02, 8, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
    </group>
  );
});

// Brackets Glyph (ANALYTICS) - extruded </> shapes
interface BracketsGlyphProps {
  isActive: boolean;
  color: string;
}

const BracketsGlyph = memo(function BracketsGlyph({ isActive, color }: BracketsGlyphProps) {
  const leftRef = useRef<Mesh>(null);
  const rightRef = useRef<Mesh>(null);
  const floatRef = useRef(0);

  const { leftGeometry, rightGeometry } = useMemo(() => {
    const createBracketShape = (isRight: boolean): Shape => {
      const shape = new Shape();
      const w = 0.25;
      const h = 0.8;
      const t = 0.12;
      
      if (isRight) {
        // Right bracket >
        shape.moveTo(-w, -h);
        shape.lineTo(-w + t, -h);
        shape.lineTo(w, 0);
        shape.lineTo(-w + t, h);
        shape.lineTo(-w, h);
        shape.lineTo(-t, 0);
        shape.closePath();
      } else {
        // Left bracket <
        shape.moveTo(w, -h);
        shape.lineTo(w - t, -h);
        shape.lineTo(-w, 0);
        shape.lineTo(w - t, h);
        shape.lineTo(w, h);
        shape.lineTo(t, 0);
        shape.closePath();
      }
      return shape;
    };

    const extrudeSettings = {
      depth: 0.15,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    };

    return {
      leftGeometry: new ExtrudeGeometry(createBracketShape(false), extrudeSettings),
      rightGeometry: new ExtrudeGeometry(createBracketShape(true), extrudeSettings),
    };
  }, []);

  useFrame((_, delta) => {
    floatRef.current += delta * 2;
    
    if (leftRef.current && rightRef.current) {
      // Floating animation when active
      const floatY = isActive ? Math.sin(floatRef.current) * 0.1 : 0;
      
      leftRef.current.position.y = floatY;
      leftRef.current.position.x = -0.35;
      leftRef.current.rotation.z = isActive ? Math.sin(floatRef.current * 0.5) * 0.1 : 0;
      
      rightRef.current.position.y = -floatY;
      rightRef.current.position.x = 0.35;
      rightRef.current.rotation.z = isActive ? -Math.sin(floatRef.current * 0.5) * 0.1 : 0;
      
      // Center the geometry
      leftRef.current.geometry.center();
      rightRef.current.geometry.center();
    }
  });

  return (
    <group scale={0.8}>
      <mesh ref={leftRef} geometry={leftGeometry}>
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={isActive ? 0.4 : 0.1}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      <mesh ref={rightRef} geometry={rightGeometry}>
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={isActive ? 0.4 : 0.1}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
    </group>
  );
});

// Network Glyph (ONTOLOGY) - 3 spheres + connecting lines
interface NetworkGlyphProps {
  isActive: boolean;
  color: string;
}

const NetworkGlyph = memo(function NetworkGlyph({ isActive, color }: NetworkGlyphProps) {
  const groupRef = useRef<Group>(null);
  const rotationRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    rotationRef.current += delta * 0.5;
    
    if (isActive) {
      // Rotate the entire network
      groupRef.current.rotation.y = rotationRef.current;
      groupRef.current.rotation.z = Math.sin(rotationRef.current * 0.5) * 0.1;
    }
  });

  const positions = useMemo(() => [
    [0, 0.6, 0] as [number, number, number],
    [-0.5, -0.3, 0] as [number, number, number],
    [0.5, -0.3, 0] as [number, number, number],
  ], []);

  const linePoints = useMemo(() => [
    [positions[0], positions[1]],
    [positions[1], positions[2]],
    [positions[2], positions[0]],
  ], [positions]);

  return (
    <group ref={groupRef}>
      {/* Connection lines */}
      {linePoints.map((points, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                points[0][0], points[0][1], points[0][2],
                points[1][0], points[1][1], points[1][2],
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={color} transparent opacity={0.6} linewidth={2} />
        </line>
      ))}
      
      {/* Nodes */}
      {positions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={isActive ? 0.5 : 0.2}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
});

// Bell Glyph (ALERTS) - lathe geometry with swing animation
interface BellGlyphProps {
  isActive: boolean;
  color: string;
  alertCount?: number;
}

const BellGlyph = memo(function BellGlyph({ isActive, color, alertCount = 0 }: BellGlyphProps) {
  const bellRef = useRef<Group>(null);
  const clapperRef = useRef<Mesh>(null);
  const swingRef = useRef(0);

  const bellGeometry = useMemo(() => {
    const points: Vector2[] = [];
    // Create bell profile
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = 0.3 + t * 0.4 * (1 - t * 0.3);
      const y = t * 0.8;
      points.push(new Vector2(x, y));
    }
    // Add inner curve
    for (let i = 20; i >= 0; i--) {
      const t = i / 20;
      const x = (0.3 + t * 0.4 * (1 - t * 0.3)) * 0.85;
      const y = t * 0.8 + 0.05;
      points.push(new Vector2(x, y));
    }
    return new LatheGeometry(points, 32);
  }, []);

  useFrame((_, delta) => {
    if (!bellRef.current) return;
    
    if (isActive || alertCount > 0) {
      swingRef.current += delta * 8;
      const swingAngle = Math.sin(swingRef.current) * 0.15;
      bellRef.current.rotation.z = swingAngle;
      
      if (clapperRef.current) {
        clapperRef.current.rotation.z = swingAngle * 1.2;
        clapperRef.current.position.x = Math.sin(swingRef.current) * 0.1;
      }
    } else {
      // Gentle return to center
      bellRef.current.rotation.z *= 0.95;
    }
  });

  const criticalColor = '#FF4D4F';
  const displayColor = alertCount > 0 ? criticalColor : color;

  return (
    <group ref={bellRef} position={[0, -0.1, 0]}>
      {/* Bell body */}
      <mesh geometry={bellGeometry} rotation={[0, 0, Math.PI]}>
        <meshStandardMaterial 
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={isActive ? 0.3 : 0.1}
          roughness={0.2}
          metalness={0.9}
          side={2}
        />
      </mesh>
      
      {/* Bell top */}
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial 
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={isActive ? 0.4 : 0.15}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>
      
      {/* Clapper (the ball inside) */}
      <mesh ref={clapperRef} position={[0, -0.15, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial 
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
});

export { GlobeGlyph, BracketsGlyph, NetworkGlyph, BellGlyph };
