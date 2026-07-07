// purchaseHint is the one place XP acts as a spendable currency rather than
// a one-way score — worth its own focused coverage beyond rules.test.ts's
// pure hintCost check.

import { describe, it, expect, beforeEach } from 'vitest';
import { createProfile, purchaseHint, unlockedHintCount, getStore, recordLevelCompletion, type LevelAttempt } from './store';
import { writeStore, STORAGE_KEY_NAME } from '../storage/localStorage';
import type { Level } from '../content/types';

beforeEach(() => {
  window.localStorage.removeItem(STORAGE_KEY_NAME);
});

function makeLevel(overrides: Partial<Level> = {}): Level {
  return {
    id: 'w1-l01',
    worldId: 'world-1',
    order: 1,
    tier: 'icon',
    scenario: 'robot-grid',
    toolboxRef: 'icon',
    goal: {
      gridWidth: 4,
      gridHeight: 1,
      start: { x: 0, y: 0 },
      startDirection: 'east',
      target: { x: 3, y: 0 },
    },
    starRules: { threeStar: { maxBlocks: 3 } },
    concepts: [],
    hints: [],
    ...overrides,
  };
}

function makeAttempt(overrides: Partial<LevelAttempt> = {}): LevelAttempt {
  return { won: true, blocksUsed: 3, movesUsed: 3, timeSeconds: 5, assisted: false, ...overrides };
}

function giveXp(profileId: string, xp: number): void {
  const store = getStore();
  const profile = store.profiles.find((p) => p.id === profileId)!;
  profile.xp = xp;
  writeStore(store);
}

describe('purchaseHint', () => {
  it('unlocks the first hint and deducts its cost from XP', () => {
    const profile = createProfile('Kid', 'fox', 'en');
    giveXp(profile.id, 20);

    const result = purchaseHint(profile.id, 'w1-l05');
    expect(result).toEqual({ ok: true, newXp: 15 });
    expect(unlockedHintCount(getStore().profiles[0], 'w1-l05')).toBe(1);
  });

  it('the second hint costs more than the first', () => {
    const profile = createProfile('Kid', 'fox', 'en');
    giveXp(profile.id, 20);

    purchaseHint(profile.id, 'w1-l05'); // costs 5, leaves 15
    const second = purchaseHint(profile.id, 'w1-l05'); // costs 10
    expect(second).toEqual({ ok: true, newXp: 5 });
    expect(unlockedHintCount(getStore().profiles[0], 'w1-l05')).toBe(2);
  });

  it('refuses the purchase (and changes nothing) when XP is insufficient', () => {
    const profile = createProfile('Kid', 'fox', 'en');
    giveXp(profile.id, 3);

    const result = purchaseHint(profile.id, 'w1-l05');
    expect(result).toEqual({ ok: false, reason: 'insufficient-xp' });
    expect(getStore().profiles[0].xp).toBe(3);
    expect(unlockedHintCount(getStore().profiles[0], 'w1-l05')).toBe(0);
  });

  it('tracks unlocked hints independently per level', () => {
    const profile = createProfile('Kid', 'fox', 'en');
    giveXp(profile.id, 20);

    purchaseHint(profile.id, 'w1-l05');
    expect(unlockedHintCount(getStore().profiles[0], 'w1-l05')).toBe(1);
    expect(unlockedHintCount(getStore().profiles[0], 'w1-l06')).toBe(0);
  });

  it('a hint, once bought, is never re-charged — unlockedHintCount just reflects what was purchased', () => {
    const profile = createProfile('Kid', 'fox', 'en');
    giveXp(profile.id, 5);
    purchaseHint(profile.id, 'w1-l05');
    expect(getStore().profiles[0].xp).toBe(0);
    expect(unlockedHintCount(getStore().profiles[0], 'w1-l05')).toBe(1);
  });
});

describe('recordLevelCompletion — "Build This For Me" fairness', () => {
  it('an assisted completion awards 0 stars and 0 XP, and earns no badges even as the first-ever completion', () => {
    const profile = createProfile('Kid', 'fox', 'en');
    const level = makeLevel({ concepts: ['sequence'] });

    const outcome = recordLevelCompletion(profile.id, level, [level], makeAttempt({ assisted: true }));

    expect(outcome).not.toBeNull();
    expect(outcome!.stars).toBe(0);
    expect(outcome!.xpAwarded).toBe(0);
    expect(outcome!.assisted).toBe(true);
    expect(outcome!.newBadges).toEqual([]);

    const stored = getStore().profiles[0];
    expect(stored.xp).toBe(0);
    expect(stored.badges).toEqual([]);
    expect(stored.progress[level.id]).toMatchObject({ status: 'completed', stars: 0, assisted: true });
  });

  it('a genuine completion after a prior assisted one earns real stars/XP/badges normally', () => {
    const profile = createProfile('Kid', 'fox', 'en');
    const level = makeLevel({ concepts: ['sequence'] });

    recordLevelCompletion(profile.id, level, [level], makeAttempt({ assisted: true }));
    const genuine = recordLevelCompletion(profile.id, level, [level], makeAttempt({ assisted: false, blocksUsed: 3 }));

    expect(genuine).not.toBeNull();
    expect(genuine!.stars).toBe(3);
    expect(genuine!.assisted).toBe(false);
    expect(genuine!.xpAwarded).toBeGreaterThan(0);
    expect(genuine!.newBadges).toContain('first-steps');

    const stored = getStore().profiles[0];
    expect(stored.xp).toBe(genuine!.xpAwarded);
    expect(stored.progress[level.id]).toMatchObject({ status: 'completed', stars: 3, assisted: false });
  });

  it('a genuine completion is never downgraded to assisted by a later assisted rerun', () => {
    const profile = createProfile('Kid', 'fox', 'en');
    const level = makeLevel({ concepts: ['sequence'] });

    const genuine = recordLevelCompletion(profile.id, level, [level], makeAttempt({ assisted: false, blocksUsed: 3 }));
    expect(genuine!.assisted).toBe(false);
    expect(genuine!.stars).toBe(3);
    const xpAfterGenuine = getStore().profiles[0].xp;

    const rerun = recordLevelCompletion(
      profile.id,
      level,
      [level],
      makeAttempt({ assisted: true, blocksUsed: 6, movesUsed: 6 }),
    );

    expect(rerun).not.toBeNull();
    expect(rerun!.assisted).toBe(false); // stays genuine, never flips back to assisted
    expect(rerun!.stars).toBe(3); // best-stars preserved (3 beats the assisted run's 0)
    expect(rerun!.xpAwarded).toBe(0); // not a new completion — no double-dipping XP

    const stored = getStore().profiles[0];
    expect(stored.xp).toBe(xpAfterGenuine);
    expect(stored.progress[level.id]).toMatchObject({ assisted: false, stars: 3 });
  });

  it('awards world3-complete / world4-complete only once every level in that World is genuinely completed', () => {
    const profile = createProfile('Kid', 'fox', 'en');
    const w3 = makeLevel({ id: 'w3-l01', worldId: 'world-3' });
    const w4 = makeLevel({ id: 'w4-l01', worldId: 'world-4' });
    const allLevels = [w3, w4];

    const w3Outcome = recordLevelCompletion(profile.id, w3, allLevels, makeAttempt());
    expect(w3Outcome!.newBadges).toContain('world3-complete');

    const w4Outcome = recordLevelCompletion(profile.id, w4, allLevels, makeAttempt());
    expect(w4Outcome!.newBadges).toContain('world4-complete');
  });

  it('an assisted completion of every level in a World does not earn that World-complete badge', () => {
    const profile = createProfile('Kid', 'fox', 'en');
    const w4 = makeLevel({ id: 'w4-l01', worldId: 'world-4' });
    const allLevels = [w4];

    const outcome = recordLevelCompletion(profile.id, w4, allLevels, makeAttempt({ assisted: true }));
    expect(outcome!.newBadges).not.toContain('world4-complete');
  });
});
