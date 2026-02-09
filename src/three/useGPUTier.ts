import { useState, useEffect } from 'react';
import type { GPUTier, GPUProfile } from './types';

const PROFILES: Record<GPUTier, GPUProfile> = {
  high: {
    tier: 'high',
    maxParticles: 3000,
    enableBloom: true,
    enableParticleFlow: true,
    globeSegments: 128,
    use3DSidebarIcons: true,
    dvrGraphMode: '3d',
  },
  medium: {
    tier: 'medium',
    maxParticles: 1500,
    enableBloom: true,
    enableParticleFlow: true,
    globeSegments: 64,
    use3DSidebarIcons: true,
    dvrGraphMode: '3d',
  },
  low: {
    tier: 'low',
    maxParticles: 0,
    enableBloom: false,
    enableParticleFlow: false,
    globeSegments: 32,
    use3DSidebarIcons: false,
    dvrGraphMode: '2d',
  },
};

function detectGPUTier(): GPUTier {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'low';

    const webgl = gl as WebGLRenderingContext;
    const debugInfo = webgl.getExtension('WEBGL_debug_renderer_info');

    if (debugInfo) {
      const renderer = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();

      // Detect integrated/mobile GPUs
      const lowTierPatterns = [
        'intel hd', 'intel uhd', 'intel iris', 'mali', 'adreno',
        'powervr', 'apple gpu', 'swiftshader',
      ];

      const isLow = lowTierPatterns.some(p => renderer.includes(p));
      if (isLow) {
        // Common integrated GPUs are at least medium tier
        if (renderer.includes('iris') || renderer.includes('apple')) {
          return 'medium';
        }
        return 'low';
      }
    }

    // Check hardware concurrency as fallback
    const cores = navigator.hardwareConcurrency || 2;
    if (cores <= 2) return 'low';
    if (cores <= 4) return 'medium';

    return 'high';
  } catch {
    return 'medium';
  }
}

export function useGPUTier(): GPUProfile {
  const [profile, setProfile] = useState<GPUProfile>(PROFILES.medium);

  useEffect(() => {
    const tier = detectGPUTier();
    setProfile(PROFILES[tier]);
  }, []);

  return profile;
}

export function downgrade(current: GPUProfile): GPUProfile {
  if (current.tier === 'high') return PROFILES.medium;
  if (current.tier === 'medium') return PROFILES.low;
  return current;
}
