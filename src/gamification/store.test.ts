// purchaseHint is the one place XP acts as a spendable currency rather than
// a one-way score — worth its own focused coverage beyond rules.test.ts's
// pure hintCost check.

import { describe, it, expect, beforeEach } from 'vitest';
import { createProfile, purchaseHint, unlockedHintCount, getStore } from './store';
import { writeStore, STORAGE_KEY_NAME } from '../storage/localStorage';

beforeEach(() => {
  window.localStorage.removeItem(STORAGE_KEY_NAME);
});

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
