// Guards the v0.2 content expansion (World: AI Lab + Progress view) against
// silently corrupting or losing an existing MVP (v0.1) profile's progress.
// No schema/version bump was needed for v0.2 — Profile/ProfileStoreV1 are
// unchanged, and existing progress is keyed by level id (e.g. "w1-l06"),
// which didn't change even though World: Robots' levels were retitled. This
// test simulates exactly that: a v1 blob written before World: AI Lab
// existed, read back after the update.

import { describe, it, expect, beforeEach } from 'vitest';
import { readStore, writeStore, STORAGE_KEY_NAME, type ProfileStoreV1 } from './localStorage';
import { getAllLevels } from '../content/manifest';
import { getLevelStatusMap } from '../gamification/store';

function legacyV01Store(): ProfileStoreV1 {
  return {
    version: 1,
    activeProfileId: 'p_legacy',
    profiles: [
      {
        id: 'p_legacy',
        name: 'Existing Kid',
        avatarId: 'fox',
        languagePref: 'en',
        createdAt: '2026-06-01T00:00:00.000Z',
        xp: 95,
        badges: ['first-steps', 'loop-explorer'],
        progress: {
          'w1-l01': { status: 'completed', stars: 3, completedAt: '2026-06-01T00:05:00.000Z' },
          'w1-l02': { status: 'completed', stars: 2, completedAt: '2026-06-01T00:10:00.000Z' },
          'w1-l03': { status: 'unlocked', stars: 0 },
        },
      },
    ],
  };
}

beforeEach(() => {
  window.localStorage.removeItem(STORAGE_KEY_NAME);
});

describe('v0.1 -> v0.2 localStorage compatibility (no version bump, no migration needed)', () => {
  it('reads a pre-existing v1 blob byte-for-byte without loss', () => {
    const legacy = legacyV01Store();
    window.localStorage.setItem(STORAGE_KEY_NAME, JSON.stringify(legacy));

    const read = readStore();
    expect(read).toEqual(legacy);
  });

  it("preserves an existing profile's XP, badges, and per-level progress after the content expansion", () => {
    writeStore(legacyV01Store());
    const store = readStore();
    const profile = store.profiles[0];

    expect(profile.xp).toBe(95);
    expect(profile.badges).toEqual(['first-steps', 'loop-explorer']);
    expect(profile.progress['w1-l01']).toEqual({
      status: 'completed',
      stars: 3,
      completedAt: '2026-06-01T00:05:00.000Z',
    });
  });

  it('computes level status for the NEW World (AI Lab) as freshly unlocked/locked, never crashing on unknown levels', () => {
    writeStore(legacyV01Store());
    const profile = readStore().profiles[0];
    const allLevels = getAllLevels();

    const statusMap = getLevelStatusMap(profile, allLevels);

    // World: Robots progress carries over exactly as it was.
    expect(statusMap['w1-l01']).toBe('completed');
    expect(statusMap['w1-l03']).toBe('unlocked');

    // World: AI Lab levels are new to this profile — first level unlocked,
    // the rest locked — not "completed", not thrown away, not crashing.
    expect(statusMap['w2-l01']).toBe('unlocked');
    expect(statusMap['w2-l02']).toBe('locked');
  });
});
