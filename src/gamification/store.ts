// The gamification-facing API on top of storage/localStorage.ts's raw
// versioned read/write adapter: profile CRUD, level-completion recording
// (XP + stars + badges), and level-status lookup for the world map.

import { readStore, writeStore, type ProfileStoreV1, type Profile } from '../storage/localStorage';
import { calculateXp, evaluateNewBadges, computeLevelStatus } from './rules';
import type { Level, StarRules } from '../content/types';
import { calculateStars } from '../engine/robotGrid';

function generateId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getStore(): ProfileStoreV1 {
  return readStore();
}

export function getActiveProfile(store: ProfileStoreV1 = readStore()): Profile | null {
  return store.profiles.find((p) => p.id === store.activeProfileId) ?? null;
}

export function createProfile(name: string, avatarId: string, languagePref: 'en' | 'bg'): Profile {
  const store = readStore();
  const profile: Profile = {
    id: generateId(),
    name,
    avatarId,
    languagePref,
    createdAt: new Date().toISOString(),
    xp: 0,
    badges: [],
    progress: {},
  };
  store.profiles.push(profile);
  store.activeProfileId = profile.id;
  writeStore(store);
  return profile;
}

export function switchProfile(profileId: string): void {
  const store = readStore();
  if (store.profiles.some((p) => p.id === profileId)) {
    store.activeProfileId = profileId;
    writeStore(store);
  }
}

export function updateLanguagePref(profileId: string, languagePref: 'en' | 'bg'): void {
  const store = readStore();
  const profile = store.profiles.find((p) => p.id === profileId);
  if (profile) {
    profile.languagePref = languagePref;
    writeStore(store);
  }
}

export interface LevelAttempt {
  won: boolean;
  blocksUsed: number;
  movesUsed: number;
  timeSeconds: number;
}

export interface CompletionResult {
  profile: Profile;
  xpAwarded: number;
  stars: 0 | 1 | 2 | 3;
  newBadges: string[];
}

/** Records a successful level attempt: updates progress/stars/best-attempt, awards XP (once, on first completion), evaluates new badges. Returns null for a losing attempt or unknown profile. */
export function recordLevelCompletion(
  profileId: string,
  level: Level,
  allLevels: Level[],
  attempt: LevelAttempt,
): CompletionResult | null {
  if (!attempt.won) return null;

  const store = readStore();
  const profile = store.profiles.find((p) => p.id === profileId);
  if (!profile) return null;

  const stars = calculateStars(attempt.blocksUsed, attempt.movesUsed, level.starRules as StarRules);
  const existing = profile.progress[level.id];
  const bestStars = existing && existing.stars > stars ? existing.stars : stars;
  const isFirstCompletion = existing?.status !== 'completed';
  const bestAttempt =
    existing?.bestAttempt && existing.bestAttempt.blocksUsed <= attempt.blocksUsed
      ? existing.bestAttempt
      : { blocksUsed: attempt.blocksUsed, timeSeconds: attempt.timeSeconds };

  profile.progress[level.id] = {
    status: 'completed',
    stars: bestStars,
    bestAttempt,
    completedAt: new Date().toISOString(),
  };

  const xpAwarded = isFirstCompletion ? calculateXp(bestStars) : 0;
  profile.xp += xpAwarded;

  const newBadges = evaluateNewBadges(profile, allLevels);
  profile.badges.push(...newBadges);

  writeStore(store);
  return { profile, xpAwarded, stars: bestStars, newBadges };
}

export function getLevelStatusMap(
  profile: Profile,
  levels: Level[],
): Record<string, 'locked' | 'unlocked' | 'completed'> {
  const byWorld = new Map<string, Level[]>();
  for (const l of levels) {
    const list = byWorld.get(l.worldId) ?? [];
    list.push(l);
    byWorld.set(l.worldId, list);
  }
  const result: Record<string, 'locked' | 'unlocked' | 'completed'> = {};
  for (const l of levels) {
    result[l.id] = computeLevelStatus(l, byWorld.get(l.worldId) ?? [], profile);
  }
  return result;
}
