import { describe, it, expect } from 'vitest';
import { calculateXp, evaluateNewBadges, computeLevelStatus, BADGE_RULES } from './rules';
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
});
