// Per-concept teaching metadata — the vocabulary Buddy (src/app/Buddy.tsx)
// draws on for "new skill" intros and stuck-detection explain-offers. One
// entry per distinct string ever used in a Level's `concepts` array (see
// content/types.ts) — kept as a closed union so a typo in level content
// fails typecheck rather than silently rendering nothing.

export type ConceptId = 'sequence' | 'turn' | 'loop' | 'conditional' | 'variable' | 'obstacle-avoidance';

export interface ConceptInfo {
  id: ConceptId;
  /** i18n key (namespace `buddy`) for the short display title. */
  titleKey: string;
  /** i18n key (namespace `buddy`) for the one-paragraph kid-friendly explanation. */
  explainKey: string;
  /** Emoji sequence for the animated mini-demo (ConceptDemo) — plays in order, then loops. */
  demoGlyphs: string[];
}

export const CONCEPTS: Record<ConceptId, ConceptInfo> = {
  sequence: {
    id: 'sequence',
    titleKey: 'buddy:concepts.sequence.title',
    explainKey: 'buddy:concepts.sequence.explain',
    demoGlyphs: ['👣', '👣', '👣', '🏁'],
  },
  turn: {
    id: 'turn',
    titleKey: 'buddy:concepts.turn.title',
    explainKey: 'buddy:concepts.turn.explain',
    demoGlyphs: ['🧭', '↩️', '👣'],
  },
  loop: {
    id: 'loop',
    titleKey: 'buddy:concepts.loop.title',
    explainKey: 'buddy:concepts.loop.explain',
    demoGlyphs: ['🔁', '👣', '👣', '👣'],
  },
  conditional: {
    id: 'conditional',
    titleKey: 'buddy:concepts.conditional.title',
    explainKey: 'buddy:concepts.conditional.explain',
    demoGlyphs: ['❓', '↔️', '👣'],
  },
  variable: {
    id: 'variable',
    titleKey: 'buddy:concepts.variable.title',
    explainKey: 'buddy:concepts.variable.explain',
    demoGlyphs: ['📦', '3️⃣', '👣'],
  },
  'obstacle-avoidance': {
    id: 'obstacle-avoidance',
    titleKey: 'buddy:concepts.obstacleAvoidance.title',
    explainKey: 'buddy:concepts.obstacleAvoidance.explain',
    demoGlyphs: ['🧱', '❓', '↩️'],
  },
};

export function getConceptInfo(id: string): ConceptInfo | null {
  return Object.prototype.hasOwnProperty.call(CONCEPTS, id) ? CONCEPTS[id as ConceptId] : null;
}

/** Given a level's concepts and a profile's already-seen set, returns the
 * ones the profile has never been introduced to yet, in level order. */
export function findUnseenConcepts(levelConcepts: string[], seenConcepts: string[]): ConceptInfo[] {
  const seen = new Set(seenConcepts);
  const result: ConceptInfo[] = [];
  for (const id of levelConcepts) {
    if (seen.has(id)) continue;
    const info = getConceptInfo(id);
    if (info) result.push(info);
  }
  return result;
}
