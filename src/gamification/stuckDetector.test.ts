import { describe, it, expect } from 'vitest';
import { computeStuckTier } from './stuckDetector';

describe('computeStuckTier', () => {
  it('gives no advice for a fresh level with no attempts yet', () => {
    expect(computeStuckTier({ attempts: 0, elapsedMs: 0, errorStreak: 0 })).toBe(0);
  });

  it('nudges after being idle with zero attempts for a while', () => {
    expect(computeStuckTier({ attempts: 0, elapsedMs: 24_000, errorStreak: 0 })).toBe(0);
    expect(computeStuckTier({ attempts: 0, elapsedMs: 25_000, errorStreak: 0 })).toBe(1);
  });

  it('does not idle-nudge once the kid has actually attempted a run', () => {
    expect(computeStuckTier({ attempts: 1, elapsedMs: 30_000, errorStreak: 1 })).not.toBe(1);
  });

  it('surfaces the hint after 2 failed attempts', () => {
    expect(computeStuckTier({ attempts: 1, elapsedMs: 5_000, errorStreak: 1 })).toBe(0);
    expect(computeStuckTier({ attempts: 2, elapsedMs: 5_000, errorStreak: 1 })).toBe(2);
    expect(computeStuckTier({ attempts: 3, elapsedMs: 5_000, errorStreak: 1 })).toBe(2);
  });

  it('offers the concept explanation after 4 failed attempts', () => {
    expect(computeStuckTier({ attempts: 4, elapsedMs: 5_000, errorStreak: 1 })).toBe(3);
  });

  it('jumps straight to the explanation offer on a 3-in-a-row identical failure, even with few attempts', () => {
    expect(computeStuckTier({ attempts: 3, elapsedMs: 5_000, errorStreak: 3 })).toBe(3);
  });

  it('never regresses tier just because time keeps passing after attempts are already high', () => {
    const tierAt10s = computeStuckTier({ attempts: 4, elapsedMs: 10_000, errorStreak: 4 });
    const tierAt10min = computeStuckTier({ attempts: 4, elapsedMs: 600_000, errorStreak: 4 });
    expect(tierAt10s).toBe(3);
    expect(tierAt10min).toBe(3);
  });
});
