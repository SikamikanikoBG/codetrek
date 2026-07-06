import { describe, it, expect } from 'vitest';
import { CONCEPTS, getConceptInfo, findUnseenConcepts } from './concepts';
import { getAllLevels } from './manifest';

describe('CONCEPTS registry', () => {
  it('has an entry for every concept id referenced by any level', () => {
    const allLevels = getAllLevels();
    const usedIds = new Set(allLevels.flatMap((l) => l.concepts));
    for (const id of usedIds) {
      expect(getConceptInfo(id), `missing ConceptInfo for level concept "${id}"`).not.toBeNull();
    }
  });

  it('returns null for an unknown concept id rather than throwing', () => {
    expect(getConceptInfo('not-a-real-concept')).toBeNull();
  });
});

describe('findUnseenConcepts', () => {
  it('returns concepts in level order, skipping ones already seen', () => {
    const result = findUnseenConcepts(['loop', 'conditional'], ['loop']);
    expect(result.map((c) => c.id)).toEqual(['conditional']);
  });

  it('returns an empty array when every concept has already been seen', () => {
    expect(findUnseenConcepts(['sequence'], ['sequence'])).toEqual([]);
  });

  it('treats an empty seen list (e.g. a pre-Buddy profile) as nothing seen yet', () => {
    const result = findUnseenConcepts(['sequence', 'turn'], []);
    expect(result.map((c) => c.id)).toEqual(['sequence', 'turn']);
  });

  it('silently ignores an unknown concept id instead of throwing', () => {
    const result = findUnseenConcepts(['sequence', 'not-a-real-concept'], []);
    expect(result.map((c) => c.id)).toEqual(['sequence']);
  });
});

describe('CONCEPTS content completeness', () => {
  it('every concept has at least one demo glyph', () => {
    for (const info of Object.values(CONCEPTS)) {
      expect(info.demoGlyphs.length).toBeGreaterThan(0);
    }
  });
});
