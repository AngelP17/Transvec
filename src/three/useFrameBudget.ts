import { useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';

const TARGET_FRAME_MS = 18; // ~55fps threshold
const SAMPLE_WINDOW = 60;  // frames to average over

export function useFrameBudget(onDegrade: () => void) {
  const frameTimes = useRef<number[]>([]);
  const hasDegraded = useRef(false);

  useFrame((_, delta) => {
    const ms = delta * 1000;
    const times = frameTimes.current;
    times.push(ms);

    if (times.length > SAMPLE_WINDOW) {
      times.shift();
    }

    if (times.length === SAMPLE_WINDOW && !hasDegraded.current) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      if (avg > TARGET_FRAME_MS) {
        hasDegraded.current = true;
        onDegrade();
      }
    }
  });

  const reset = useCallback(() => {
    frameTimes.current = [];
    hasDegraded.current = false;
  }, []);

  return { reset };
}
