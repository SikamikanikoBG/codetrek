// Wires the pure tiering logic in gamification/stuckDetector.ts into a live
// level-play session: ticks elapsed time, and lets LevelPlay report each Run
// outcome. Resets automatically whenever `levelId` changes.

import { useEffect, useRef, useState } from 'react';
import { computeStuckTier, type StuckTier } from '../gamification/stuckDetector';

const TICK_MS = 5_000;

export interface StuckDetectorApi {
  tier: StuckTier;
  /** Call once per non-winning Run/Step outcome with a short signature for
   * that outcome (e.g. 'crashed', 'not-there', or an error message) so
   * repeated identical failures are recognized as a streak. */
  reportAttempt: (outcomeSignature: string) => void;
  /** Call on a winning outcome — clears advice immediately. */
  reportSuccess: () => void;
  /** Dismiss whatever tier is currently showing without losing attempt history. */
  dismiss: () => void;
}

export function useStuckDetector(levelId: string): StuckDetectorApi {
  const attemptsRef = useRef(0);
  const errorStreakRef = useRef(0);
  const lastSignatureRef = useRef<string | null>(null);
  const startRef = useRef(Date.now());
  const dismissedTierRef = useRef<StuckTier>(0);
  const [tier, setTier] = useState<StuckTier>(0);

  useEffect(() => {
    attemptsRef.current = 0;
    errorStreakRef.current = 0;
    lastSignatureRef.current = null;
    dismissedTierRef.current = 0;
    startRef.current = Date.now();
    setTier(0);

    const interval = setInterval(() => {
      const next = computeStuckTier({
        attempts: attemptsRef.current,
        elapsedMs: Date.now() - startRef.current,
        errorStreak: errorStreakRef.current,
      });
      if (next > dismissedTierRef.current) setTier(next);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [levelId]);

  function recompute() {
    dismissedTierRef.current = 0;
    setTier(
      computeStuckTier({
        attempts: attemptsRef.current,
        elapsedMs: Date.now() - startRef.current,
        errorStreak: errorStreakRef.current,
      }),
    );
  }

  return {
    tier,
    reportAttempt: (outcomeSignature: string) => {
      attemptsRef.current += 1;
      errorStreakRef.current = lastSignatureRef.current === outcomeSignature ? errorStreakRef.current + 1 : 1;
      lastSignatureRef.current = outcomeSignature;
      recompute();
    },
    reportSuccess: () => {
      dismissedTierRef.current = 3;
      setTier(0);
    },
    dismiss: () => {
      dismissedTierRef.current = tier;
    },
  };
}
