import { describe, it, expect } from 'vitest';
import {
  calculateXp,
  evaluateNewBadges,
  computeLevelStatus,
  BADGE_RULES,
  getRank,
  RANKS,
  getWorldCompletion,
  getRecentActivity,
} from './rules';
import type { Level } from '../content/types';
import type { Profile } from '../storage/localStorage';

function makeLevel(overrides: Partial<Level>): Level {
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

function makeProfile(overrides: Partial<Profile>): Profile {
  return {
    id: 'p1',
    name: 'Kid',
    avatarId: 'fox',
    languagePref: 'en',
    createdAt: new Date().toISOString(),
    xp: 0,
    badges: [],
    progress: {},
    ...overrides,
  };
}

describe('calculateXp', () => {
  it('awards no XP for zero stars', () => {
    expect(calculateXp(0)).toBe(0);
  });

  it('awards base XP for 1 star, increasing per extra star', () => {
    expect(calculateXp(1)).toBe(10);
    expect(calculateXp(2)).toBe(15);
    expect(calculateXp(3)).toBe(20);
  });
});

describe('computeLevelStatus (linear per-world gating)', () => {
  const l1 = makeLevel({ id: 'w1-l01', order: 1 });
  const l2 = makeLevel({ id: 'w1-l02', order: 2 });
  const l3 = makeLevel({ id: 'w1-l03', order: 3 });
  const worldLevels = [l1, l2, l3];

  it('the first level in a world is always unlocked', () => {
    const profile = makeProfile({});
    expect(computeLevelStatus(l1, worldLevels, profile)).toBe('unlocked');
  });

  it('a later level is locked until the prior one is completed', () => {
    const profile = makeProfile({});
    expect(computeLevelStatus(l2, worldLevels, profile)).toBe('locked');
  });

  it('completing a level unlocks the next one', () => {
    const profile = makeProfile({
      progress: { 'w1-l01': { status: 'completed', stars: 3 } },
    });
    expect(computeLevelStatus(l2, worldLevels, profile)).toBe('unlocked');
    expect(computeLevelStatus(l3, worldLevels, profile)).toBe('locked');
  });

  it('a completed level reports completed regardless of order', () => {
    const profile = makeProfile({
      progress: { 'w1-l02': { status: 'completed', stars: 1 } },
    });
    expect(computeLevelStatus(l2, worldLevels, profile)).toBe('completed');
  });
});

describe('evaluateNewBadges', () => {
  it('awards first-steps after one completed level', () => {
    const level = makeLevel({ id: 'w1-l01', concepts: ['sequence'] });
    const profile = makeProfile({
      progress: { 'w1-l01': { status: 'completed', stars: 2 } },
    });
    const newBadges = evaluateNewBadges(profile, [level]);
    expect(newBadges).toContain('first-steps');
  });

  it('does not re-award a badge already on the profile', () => {
    const level = makeLevel({ id: 'w1-l01', concepts: ['sequence'] });
    const profile = makeProfile({
      badges: ['first-steps'],
      progress: { 'w1-l01': { status: 'completed', stars: 2 } },
    });
    const newBadges = evaluateNewBadges(profile, [level]);
    expect(newBadges).not.toContain('first-steps');
  });

  it('awards loop-explorer only once 3 loop levels are completed', () => {
    const levels = [
      makeLevel({ id: 'a', concepts: ['loop'] }),
      makeLevel({ id: 'b', concepts: ['loop'] }),
      makeLevel({ id: 'c', concepts: ['loop'] }),
    ];
    const twoDone = makeProfile({
      progress: {
        a: { status: 'completed', stars: 1 },
        b: { status: 'completed', stars: 1 },
      },
    });
    expect(evaluateNewBadges(twoDone, levels)).not.toContain('loop-explorer');

    const threeDone = makeProfile({
      progress: {
        a: { status: 'completed', stars: 1 },
        b: { status: 'completed', stars: 1 },
        c: { status: 'completed', stars: 1 },
      },
    });
    expect(evaluateNewBadges(threeDone, levels)).toContain('loop-explorer');
  });

  it('every declared badge rule id is unique', () => {
    const ids = BADGE_RULES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('awards world-2-complete only once every World: AI Lab level is completed', () => {
    const levels = [
      makeLevel({ id: 'w2-l01', worldId: 'world-2', order: 1 }),
      makeLevel({ id: 'w2-l02', worldId: 'world-2', order: 2 }),
    ];
    const partial = makeProfile({
      progress: { 'w2-l01': { status: 'completed', stars: 2 } },
    });
    expect(evaluateNewBadges(partial, levels)).not.toContain('world-2-complete');

    const complete = makeProfile({
      progress: {
        'w2-l01': { status: 'completed', stars: 2 },
        'w2-l02': { status: 'completed', stars: 1 },
      },
    });
    expect(evaluateNewBadges(complete, levels)).toContain('world-2-complete');
  });

  it('does not award a world-complete badge when that world has no levels', () => {
    const profile = makeProfile({});
    expect(evaluateNewBadges(profile, [])).not.toContain('world-1-complete');
    expect(evaluateNewBadges(profile, [])).not.toContain('world-2-complete');
  });
});

describe('getRank (XP-derived rank/level label)', () => {
  it('starts at the first rank with zero XP', () => {
    expect(getRank(0)).toEqual({ labelKey: RANKS[0].labelKey, index: 0, minXp: 0, nextMinXp: RANKS[1].minXp });
  });

  it('stays on the current rank until its XP threshold is met', () => {
    const justBelow = getRank(RANKS[1].minXp - 1);
    expect(justBelow.index).toBe(0);
  });

  it('advances exactly at a threshold', () => {
    const atThreshold = getRank(RANKS[1].minXp);
    expect(atThreshold.index).toBe(1);
    expect(atThreshold.labelKey).toBe(RANKS[1].labelKey);
  });

  it('reports no next rank once at the top tier', () => {
    const topRank = getRank(RANKS[RANKS.length - 1].minXp + 1000);
    expect(topRank.index).toBe(RANKS.length - 1);
    expect(topRank.nextMinXp).toBeNull();
  });
});

describe('getWorldCompletion', () => {
  const levels = [
    makeLevel({ id: 'w1-l01', worldId: 'world-1', order: 1 }),
    makeLevel({ id: 'w1-l02', worldId: 'world-1', order: 2 }),
    makeLevel({ id: 'w1-l03', worldId: 'world-1', order: 3 }),
  ];

  it('reports 0/N with zero stars for a fresh profile', () => {
    const profile = makeProfile({});
    expect(getWorldCompletion(profile, levels)).toEqual({
      worldId: 'world-1',
      completedLevels: 0,
      totalLevels: 3,
      starsEarned: 0,
      maxStars: 9,
    });
  });

  it('counts completed levels and summed stars', () => {
    const profile = makeProfile({
      progress: {
        'w1-l01': { status: 'completed', stars: 3 },
        'w1-l02': { status: 'completed', stars: 2 },
      },
    });
    const result = getWorldCompletion(profile, levels);
    expect(result.completedLevels).toBe(2);
    expect(result.starsEarned).toBe(5);
    expect(result.maxStars).toBe(9);
  });
});

describe('getRecentActivity', () => {
  const levels = [
    makeLevel({ id: 'w1-l01', worldId: 'world-1', order: 1 }),
    makeLevel({ id: 'w2-l01', worldId: 'world-2', order: 1 }),
  ];

  it('returns completed levels newest-first, resolving worldId from the level list', () => {
    const profile = makeProfile({
      progress: {
        'w1-l01': { status: 'completed', stars: 3, completedAt: '2026-01-01T00:00:00.000Z' },
        'w2-l01': { status: 'completed', stars: 1, completedAt: '2026-02-01T00:00:00.000Z' },
      },
    });
    const activity = getRecentActivity(profile, levels);
    expect(activity.map((a) => a.levelId)).toEqual(['w2-l01', 'w1-l01']);
    expect(activity[0].worldId).toBe('world-2');
  });

  it('excludes locked/unlocked entries and entries missing completedAt', () => {
    const profile = makeProfile({
      progress: {
        'w1-l01': { status: 'unlocked', stars: 0 },
        'w2-l01': { status: 'completed', stars: 2 }, // no completedAt (shouldn't happen, but must not crash)
      },
    });
    expect(getRecentActivity(profile, levels)).toEqual([]);
  });

  it('respects the limit', () => {
    const profile = makeProfile({
      progress: {
        'w1-l01': { status: 'completed', stars: 1, completedAt: '2026-01-01T00:00:00.000Z' },
        'w2-l01': { status: 'completed', stars: 1, completedAt: '2026-01-02T00:00:00.000Z' },
      },
    });
    expect(getRecentActivity(profile, levels, 1)).toHaveLength(1);
  });
});
