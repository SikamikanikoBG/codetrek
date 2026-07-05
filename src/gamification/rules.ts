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
    check: (profile, levels) => {
      const worldLevels = levels.filter((l) => l.worldId === 'world-1');
      if (worldLevels.length === 0) return false;
      return worldLevels.every((l) => profile.progress[l.id]?.status === 'completed');
    },
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
