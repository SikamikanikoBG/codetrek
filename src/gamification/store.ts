// The gamification-facing API on top of storage/localStorage.ts's raw
// versioned read/write adapter: profile CRUD, level-completion recording
// (XP + stars + badges), and level-status lookup for the world map.

import { readStore, writeStore, type ProfileStoreV1, type Profile } from '../storage/localStorage';
import { calculateXp, evaluateNewBadges, computeLevelStatus, hintCost } from './rules';
import type { Level, StarRules } from '../content/types';
import { calculateStars } from '../engine/robotGrid';
import { notifyProfileChanged } from '../sync/hooks';

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
  notifyProfileChanged(profile);
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
    notifyProfileChanged(profile);
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
  notifyProfileChanged(profile);
  return { profile, xpAwarded, stars: bestStars, newBadges };
}

/** Marks the given concept ids as introduced for this profile so Buddy's
 * new-skill intro doesn't repeat them. No-ops for an unknown profile. */
export function markConceptsSeen(profileId: string, conceptIds: string[]): void {
  if (conceptIds.length === 0) return;
  const store = readStore();
  const profile = store.profiles.find((p) => p.id === profileId);
  if (!profile) return;
  const seen = new Set(profile.seenConcepts ?? []);
  for (const id of conceptIds) seen.add(id);
  profile.seenConcepts = Array.from(seen);
  writeStore(store);
  notifyProfileChanged(profile);
}

export type PurchaseHintResult = { ok: true; newXp: number } | { ok: false; reason: 'insufficient-xp' };

/** Number of hints already unlocked (bought) for this level — 0 if the
 * profile has never spent XP on this level's hints yet. */
export function unlockedHintCount(profile: Profile, levelId: string): number {
  return profile.purchasedHints?.[levelId] ?? 0;
}

/** Spends XP to unlock the NEXT locked hint for a level (hints unlock in
 * order — you can't skip ahead to hint 2 without buying hint 1). XP spent
 * is permanent: a hint stays unlocked for that profile+level forever, it's
 * never re-charged. Returns 'insufficient-xp' without changing anything if
 * the profile can't afford it. */
export function purchaseHint(profileId: string, levelId: string): PurchaseHintResult {
  const store = readStore();
  const profile = store.profiles.find((p) => p.id === profileId);
  if (!profile) return { ok: false, reason: 'insufficient-xp' };

  const alreadyUnlocked = unlockedHintCount(profile, levelId);
  const cost = hintCost(alreadyUnlocked);
  if (profile.xp < cost) return { ok: false, reason: 'insufficient-xp' };

  profile.xp -= cost;
  profile.purchasedHints = { ...profile.purchasedHints, [levelId]: alreadyUnlocked + 1 };
  writeStore(store);
  notifyProfileChanged(profile);
  return { ok: true, newXp: profile.xp };
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
