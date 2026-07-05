// Declarative XP and badge rules — kept out of component code so tuning the
// economy never means hunting through UI files.

import type { Level } from '../content/types';
import type { Profile } from '../storage/localStorage';

export const XP_RULES = {
  base: 10,
  perStarBonus: 5, // extra XP per star above the first
};

export function calculateXp(stars: 0 | 1 | 2 | 3): number {
  if (stars <= 0) return 0;
  return XP_RULES.base + (stars - 1) * XP_RULES.perStarBonus;
}

export interface BadgeRule {
  id: string;
  descriptionKey: string;
  check: (profile: Profile, levels: Level[]) => boolean;
}

function countCompletedWithConcept(profile: Profile, levels: Level[], concept: string): number {
  return levels.filter((l) => {
    const entry = profile.progress[l.id];
    return entry?.status === 'completed' && l.concepts.includes(concept);
  }).length;
}

function countThreeStarLevels(profile: Profile): number {
  return Object.values(profile.progress).filter((p) => p.status === 'completed' && p.stars === 3).length;
}

function countCompletedLevels(profile: Profile): number {
  return Object.values(profile.progress).filter((p) => p.status === 'completed').length;
}

function isWorldComplete(profile: Profile, levels: Level[], worldId: string): boolean {
  const worldLevels = levels.filter((l) => l.worldId === worldId);
  if (worldLevels.length === 0) return false;
  return worldLevels.every((l) => profile.progress[l.id]?.status === 'completed');
}

export const BADGE_RULES: BadgeRule[] = [
  {
    id: 'first-steps',
    descriptionKey: 'ui:badges.firstSteps',
    check: (profile) => countCompletedLevels(profile) >= 1,
  },
  {
    id: 'loop-explorer',
    descriptionKey: 'ui:badges.loopExplorer',
    check: (profile, levels) => countCompletedWithConcept(profile, levels, 'loop') >= 3,
  },
  {
    id: 'conditional-thinker',
    descriptionKey: 'ui:badges.conditionalThinker',
    check: (profile, levels) => countCompletedWithConcept(profile, levels, 'conditional') >= 1,
  },
  {
    id: 'variable-wizard',
    descriptionKey: 'ui:badges.variableWizard',
    check: (profile, levels) => countCompletedWithConcept(profile, levels, 'variable') >= 1,
  },
  {
    id: 'perfectionist',
    descriptionKey: 'ui:badges.perfectionist',
    check: (profile) => countThreeStarLevels(profile) >= 5,
  },
  {
    id: 'world-1-complete',
    descriptionKey: 'ui:badges.world1Complete',
    check: (profile, levels) => isWorldComplete(profile, levels, 'world-1'),
  },
  {
    id: 'world-2-complete',
    descriptionKey: 'ui:badges.world2Complete',
    check: (profile, levels) => isWorldComplete(profile, levels, 'world-2'),
  },
];

/** Badge ids newly earned (not already on the profile) given current progress. Pure function — no side effects. */
export function evaluateNewBadges(profile: Profile, levels: Level[]): string[] {
  return BADGE_RULES.filter((rule) => !profile.badges.includes(rule.id) && rule.check(profile, levels)).map(
    (r) => r.id,
  );
}

/**
 * Level-gating: linear per world via `order` + prior-level completion.
 * The first level in a world is always unlocked; each subsequent level
 * unlocks only once the previous one (by order, within the same world) is
 * completed.
 */
export function computeLevelStatus(
  level: Level,
  worldLevels: Level[],
  profile: Profile,
): 'locked' | 'unlocked' | 'completed' {
  const entry = profile.progress[level.id];
  if (entry?.status === 'completed') return 'completed';

  const sorted = [...worldLevels].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((l) => l.id === level.id);
  if (idx <= 0) return 'unlocked';

  const prior = sorted[idx - 1];
  const priorEntry = profile.progress[prior.id];
  return priorEntry?.status === 'completed' ? 'unlocked' : 'locked';
}

// ---------------------------------------------------------------------------
// Progress view support — XP-derived rank, per-world completion, recent
// activity. All pure functions reading only the existing store shape
// (Profile.progress already carries `completedAt`); no new persistence.
// ---------------------------------------------------------------------------

export interface RankTier {
  labelKey: string;
  minXp: number;
}

/**
 * Rank thresholds, tuned against the level economy rather than picked
 * arbitrarily: `calculateXp(3)` (a perfect 3-star clear) awards 20 XP, and
 * v0.2 ships 21 hand-authored levels, so a profile that 3-stars everything
 * tops out around 420 XP. Five ranks spread across that range so each one is
 * reachable within a session or two of play, not a multi-week grind, while
 * still leaving the top rank ("Code Master") feeling like a real milestone.
 */
export const RANKS: RankTier[] = [
  { labelKey: 'ui:ranks.newRecruit', minXp: 0 },
  { labelKey: 'ui:ranks.apprenticeCoder', minXp: 60 },
  { labelKey: 'ui:ranks.gridStrategist', minXp: 150 },
  { labelKey: 'ui:ranks.aiWhisperer', minXp: 260 },
  { labelKey: 'ui:ranks.codeMaster', minXp: 380 },
];

export interface RankInfo {
  labelKey: string;
  index: number;
  minXp: number;
  /** XP threshold of the next rank, or null if already at the top rank. */
  nextMinXp: number | null;
}

/** Derives a profile's rank/level label from total XP against the RANKS thresholds. Pure function. */
export function getRank(xp: number): RankInfo {
  let current = RANKS[0];
  let index = 0;
  for (let i = 0; i < RANKS.length; i += 1) {
    if (xp >= RANKS[i].minXp) {
      current = RANKS[i];
      index = i;
    }
  }
  const next = RANKS[index + 1] ?? null;
  return { labelKey: current.labelKey, index, minXp: current.minXp, nextMinXp: next ? next.minXp : null };
}

export interface WorldCompletion {
  worldId: string;
  completedLevels: number;
  totalLevels: number;
  starsEarned: number;
  maxStars: number;
}

/** Completion summary for one World's levels: X/Y levels done, stars collected out of the max possible (3 per level). */
export function getWorldCompletion(profile: Profile, worldLevels: Level[]): WorldCompletion {
  let completedLevels = 0;
  let starsEarned = 0;
  for (const level of worldLevels) {
    const entry = profile.progress[level.id];
    if (entry?.status === 'completed') {
      completedLevels += 1;
      starsEarned += entry.stars;
    }
  }
  return {
    worldId: worldLevels[0]?.worldId ?? '',
    completedLevels,
    totalLevels: worldLevels.length,
    starsEarned,
    maxStars: worldLevels.length * 3,
  };
}

export interface RecentActivityEntry {
  levelId: string;
  worldId: string;
  stars: 0 | 1 | 2 | 3;
  completedAt: string;
}

/** Last `limit` completed levels (newest first) for the recent-activity list. Pure — takes all levels so worldId can be resolved per entry. */
export function getRecentActivity(profile: Profile, allLevels: Level[], limit = 5): RecentActivityEntry[] {
  const byId = new Map(allLevels.map((l) => [l.id, l]));
  return Object.entries(profile.progress)
    .filter(([, entry]) => entry.status === 'completed' && !!entry.completedAt)
    .map(([levelId, entry]) => ({
      levelId,
      worldId: byId.get(levelId)?.worldId ?? '',
      stars: entry.stars,
      completedAt: entry.completedAt as string,
    }))
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, limit);
}
