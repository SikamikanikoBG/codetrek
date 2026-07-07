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
  /** True when this run was produced by "Build This For Me" rather than the
   * kid's own solution. Forces 0 stars/XP and blocks badge credit for this
   * attempt (see recordLevelCompletion). */
  assisted: boolean;
}

export interface CompletionResult {
  profile: Profile;
  xpAwarded: number;
  stars: 0 | 1 | 2 | 3;
  newBadges: string[];
  /** Whether the level's progress entry is (still) flagged assisted after
   * this attempt — see the precedence rule in recordLevelCompletion. */
  assisted: boolean;
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

  // An assisted ("Build This For Me") run never earns real stars — skip
  // calculateStars entirely rather than let blocksUsed/movesUsed produce a
  // real-looking star count for a level the kid didn't actually solve.
  const stars: 0 | 1 | 2 | 3 = attempt.assisted
    ? 0
    : calculateStars(attempt.blocksUsed, attempt.movesUsed, level.starRules as StarRules);
  const existing = profile.progress[level.id];
  const bestStars = existing && existing.stars > stars ? existing.stars : stars;
  // XP is awarded once, on the first GENUINE completion — not merely the
  // first completion ever. An assisted run already marks status 'completed'
  // (so the level unlocks the next one / shows as seen on the world map),
  // but it must not consume the "first completion" XP slot: a kid who later
  // solves the same level for real still deserves real XP. `existing.assisted`
  // absent (pre-existing saved profiles from before this field existed) is
  // treated as falsy/genuine, same migration-safety rule as elsewhere.
  const isFirstGenuineCompletion = existing?.status !== 'completed' || existing?.assisted === true;
  const bestAttempt =
    existing?.bestAttempt && existing.bestAttempt.blocksUsed <= attempt.blocksUsed
      ? existing.bestAttempt
      : { blocksUsed: attempt.blocksUsed, timeSeconds: attempt.timeSeconds };
  // Once a level has been genuinely completed for real, a later assisted
  // rerun must never flip it back to assisted. "Genuine" means assisted is
  // NOT strictly true — this must also cover profiles saved before the
  // `assisted` field existed (status 'completed', assisted undefined), not
  // just an explicit `assisted: false`, or a pre-existing 3-star completion
  // would get silently reclassified as assisted (and dropped from every
  // badge count) the moment "Build This For Me" is used on it again.
  const wasGenuine = existing?.status === 'completed' && existing.assisted !== true;
  const nextAssisted = wasGenuine ? false : attempt.assisted;

  profile.progress[level.id] = {
    status: 'completed',
    stars: bestStars,
    bestAttempt,
    completedAt: new Date().toISOString(),
    assisted: nextAssisted,
  };

  const xpAwarded = isFirstGenuineCompletion ? calculateXp(bestStars) : 0;
  profile.xp += xpAwarded;

  const newBadges = evaluateNewBadges(profile, allLevels);
  profile.badges.push(...newBadges);

  writeStore(store);
  notifyProfileChanged(profile);
  return { profile, xpAwarded, stars: bestStars, newBadges, assisted: nextAssisted };
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
