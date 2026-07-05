import { describe, it, expect } from 'vitest';
import { worlds, getAllLevels, getWorld, getLevel } from './manifest';

// These tests exercise the REAL hand-authored content (worlds/*/*.json via
// import.meta.glob), not fixtures — they act as a regression guard so
// authoring a new level/world can't silently break the manifest's
// invariants (unique ids, valid gating order, schema rules per types.ts).

describe('content manifest — world/level structure', () => {
  it('ships at least two Worlds (Robots + AI Lab) for v0.2', () => {
    expect(worlds.length).toBeGreaterThanOrEqual(2);
    expect(worlds.map((w) => w.id)).toEqual(expect.arrayContaining(['world-1', 'world-2']));
  });

  it('ships 20+ levels total across all Worlds', () => {
    expect(getAllLevels().length).toBeGreaterThanOrEqual(20);
  });

  it('every World has a comparable level count (8-12 levels)', () => {
    for (const world of worlds) {
      expect(world.levels.length).toBeGreaterThanOrEqual(8);
      expect(world.levels.length).toBeLessThanOrEqual(12);
    }
  });

  it('every level id is globally unique', () => {
    const ids = getAllLevels().map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each World carries identity metadata (colorVar/icon) and titleKey', () => {
    for (const world of worlds) {
      expect(world.colorVar).toMatch(/^--world-/);
      expect(world.icon.length).toBeGreaterThan(0);
      expect(world.titleKey).toBe(`levels:worlds.${world.id}.title`);
    }
  });

  it('Worlds are ordered Robots before AI Lab (per WORLD_META order)', () => {
    expect(worlds.map((w) => w.id)).toEqual(['world-1', 'world-2']);
  });

  it("each World's levels are sorted by ascending order with no gaps in gating sequence", () => {
    for (const world of worlds) {
      const orders = world.levels.map((l) => l.order);
      const sorted = [...orders].sort((a, b) => a - b);
      expect(orders).toEqual(sorted);
      expect(new Set(orders).size).toBe(orders.length);
    }
  });

  it('icon-tier levels carry no titleKey/hints by schema (pre-reader safety, not just convention)', () => {
    for (const level of getAllLevels()) {
      if (level.tier === 'icon') {
        expect(level.titleKey).toBeUndefined();
        expect(level.hints).toEqual([]);
      }
    }
  });

  it('block-text-tier levels in this content set are fully localized (titleKey + hints present)', () => {
    for (const level of getAllLevels()) {
      if (level.tier === 'block-text') {
        expect(level.titleKey).toBeTruthy();
        expect(level.hints.length).toBeGreaterThan(0);
      }
    }
  });

  it('getWorld/getLevel resolve real content', () => {
    expect(getWorld('world-2')?.id).toBe('world-2');
    expect(getLevel('world-2', 'w2-l01')?.id).toBe('w2-l01');
    expect(getLevel('world-2', 'does-not-exist')).toBeUndefined();
  });
});
