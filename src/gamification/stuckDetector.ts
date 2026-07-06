// Pure tiering logic for "is this kid stuck?" — kept free of React/timers so
// it's cheap to unit test. useStuckDetector (below) is the only thing that
// touches wall-clock time and wires this into a level-play session.

export interface StuckSignal {
  /** Non-winning Run attempts so far this level session. */
  attempts: number;
  /** Milliseconds since the level session started. */
  elapsedMs: number;
  /** Consecutive attempts that ended in the exact same outcome signature. */
  errorStreak: number;
}

/** 0 = no advice yet. 1 = gentle nudge to just try something. 2 = surface the
 * level's own hint. 3 = offer to explain the underlying concept. */
export type StuckTier = 0 | 1 | 2 | 3;

const IDLE_NUDGE_MS = 25_000;
const HINT_AT_ATTEMPTS = 2;
const EXPLAIN_AT_ATTEMPTS = 4;
const EXPLAIN_AT_ERROR_STREAK = 3;

export function computeStuckTier(signal: StuckSignal): StuckTier {
  if (signal.attempts >= EXPLAIN_AT_ATTEMPTS || signal.errorStreak >= EXPLAIN_AT_ERROR_STREAK) return 3;
  if (signal.attempts >= HINT_AT_ATTEMPTS) return 2;
  if (signal.attempts === 0 && signal.elapsedMs >= IDLE_NUDGE_MS) return 1;
  return 0;
}
