import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import { Mesh, ShaderMaterial, BackSide, AdditiveBlending } from 'three';
import { GLOBE, COLORS } from './constants';
import type { GPUProfile } from './types';

// Atmosphere Fresnel shader
const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform vec3 uColor;
  void main() {
    float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    gl_FragColor = vec4(uColor, intensity * 0.6);
  }
`;

interface GlobeSceneProps {
  gpu: GPUProfile;
  mapCenter?: { lat: number; lng: number };
}

export default function GlobeScene({ gpu, mapCenter }: GlobeSceneProps) {
  const globeRef = useRef<Mesh>(null);
  const atmosphereRef = useRef<Mesh>(null);
  const segments = gpu.globeSegments;

  const atmosphereMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        uniforms: {
          uColor: { value: COLORS.accent },
        },
        blending: AdditiveBlending,
        side: BackSide,
        transparent: true,
        depthWrite: false,
      }),
    []
  );

  useFrame((_, delta) => {
    if (globeRef.current) {
      // Slow auto-rotation
      globeRef.current.rotation.y += GLOBE.rotationSpeed * delta * 60;

      // Nudge rotation toward map center if provided
      if (mapCenter) {
        const targetY = (-mapCenter.lng * Math.PI) / 180;
        globeRef.current.rotation.y +=
          (targetY - globeRef.current.rotation.y) * 0.02;
      }
    }
    if (atmosphereRef.current && globeRef.current) {
      atmosphereRef.current.rotation.copy(globeRef.current.rotation);
    }
  });

  return (
    <group>
      {/* Ambient lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 3, 5]} intensity={0.8} color="#b0c4de" />
      <directionalLight position={[-3, -1, -2]} intensity={0.2} color="#2D72D2" />

      {/* Globe sphere */}
      <Sphere ref={globeRef} args={[GLOBE.radius, segments, segments]}>
        <meshStandardMaterial
          color="#0a1628"
          emissive="#0d1f3c"
          emissiveIntensity={0.3}
          roughness={0.9}
          metalness={0.1}
          wireframe={false}
        />
      </Sphere>

      {/* Wireframe overlay for grid lines */}
      <Sphere args={[GLOBE.radius + 0.003, segments / 2, segments / 2]}>
        <meshBasicMaterial
          color="#1a3a5c"
          wireframe
          transparent
          opacity={0.12}
        />
      </Sphere>

      {/* Atmosphere glow */}
      <Sphere
        ref={atmosphereRef}
        args={[GLOBE.radius * GLOBE.atmosphereScale, segments / 2, segments / 2]}
        material={atmosphereMaterial}
      />
    </group>
  );
}
