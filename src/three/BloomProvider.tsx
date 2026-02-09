import { EffectComposer, Bloom } from '@react-three/postprocessing';
import type { GPUProfile } from './types';

interface BloomProviderProps {
  gpu: GPUProfile;
}

export default function BloomProvider({ gpu }: BloomProviderProps) {
  if (!gpu.enableBloom) return null;

  const intensity = gpu.tier === 'high' ? 0.5 : 0.3;

  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.6}
        luminanceSmoothing={0.9}
        intensity={intensity}
        mipmapBlur
      />
    </EffectComposer>
  );
}
