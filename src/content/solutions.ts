// One hand-authored, idiomatic solution per level — uses the SAME concept
// each level teaches (a "loop" level's solution has a repeat block, not a
// flat run of moves) rather than just the shortest possible path. Every
// entry here is validated end-to-end in solutions.test.ts: compiled to real
// Blockly blocks, code-generated through the actual javascriptGenerator,
// and run through the actual win-check — so a wrong turn or an off-by-one
// repeat count fails CI, not just a hand trace.

import type { LevelSolution } from './solutionTypes';

export const SOLUTIONS: Record<string, LevelSolution> = {
  'w1-l01': { levelId: 'w1-l01', steps: [{ kind: 'forward' }, { kind: 'forward' }, { kind: 'forward' }] },

  'w1-l02': {
    levelId: 'w1-l02',
    steps: [
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'right' },
      { kind: 'forward' },
      { kind: 'forward' },
    ],
  },

  'w1-l03': {
    levelId: 'w1-l03',
    steps: [
      { kind: 'right' },
      { kind: 'forward' },
      { kind: 'left' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
    ],
  },

  'w1-l04': {
    levelId: 'w1-l04',
    steps: [
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'right' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
    ],
  },

  'w1-l05': { levelId: 'w1-l05', steps: [{ kind: 'repeat', times: 7, body: [{ kind: 'forward' }] }] },

  'w1-l06': {
    levelId: 'w1-l06',
    steps: [
      {
        kind: 'repeat',
        times: 4,
        body: [{ kind: 'forward' }, { kind: 'right' }, { kind: 'forward' }, { kind: 'left' }],
      },
    ],
  },

  'w1-l07': {
    levelId: 'w1-l07',
    steps: [
      { kind: 'setVariable', name: 'steps', value: 9 },
      { kind: 'repeat', times: { variable: 'steps' }, body: [{ kind: 'forward' }] },
    ],
  },

  'w1-l08': {
    levelId: 'w1-l08',
    steps: [
      { kind: 'forward' },
      {
        kind: 'if',
        then: [{ kind: 'forward' }],
        else: [
          { kind: 'right' },
          { kind: 'forward' },
          { kind: 'left' },
          { kind: 'forward' },
          { kind: 'forward' },
          { kind: 'left' },
          { kind: 'forward' },
          { kind: 'right' },
          { kind: 'forward' },
        ],
      },
    ],
  },

  'w1-l09': {
    levelId: 'w1-l09',
    steps: [
      { kind: 'repeat', times: 2, body: [{ kind: 'forward' }] },
      { kind: 'if', then: [{ kind: 'forward' }], else: [{ kind: 'right' }] },
      { kind: 'repeat', times: 5, body: [{ kind: 'forward' }] },
      { kind: 'left' },
      { kind: 'repeat', times: 3, body: [{ kind: 'forward' }] },
    ],
  },

  'w1-l10': {
    levelId: 'w1-l10',
    steps: [
      { kind: 'setVariable', name: 'steps', value: 11 },
      { kind: 'repeat', times: { variable: 'steps' }, body: [{ kind: 'forward' }] },
    ],
  },

  'w1-l11': {
    levelId: 'w1-l11',
    steps: [
      { kind: 'forward' },
      {
        kind: 'if',
        then: [{ kind: 'forward' }],
        else: [{ kind: 'left' }, { kind: 'forward' }, { kind: 'forward' }, { kind: 'right' }],
      },
      { kind: 'repeat', times: 5, body: [{ kind: 'forward' }] },
      { kind: 'right' },
      { kind: 'repeat', times: 2, body: [{ kind: 'forward' }] },
    ],
  },

  'w1-l12': {
    levelId: 'w1-l12',
    steps: [
      { kind: 'setVariable', name: 'steps', value: 2 },
      { kind: 'repeat', times: { variable: 'steps' }, body: [{ kind: 'forward' }] },
      { kind: 'if', then: [{ kind: 'forward' }], else: [{ kind: 'right' }] },
      { kind: 'repeat', times: 7, body: [{ kind: 'forward' }] },
      { kind: 'left' },
      { kind: 'repeat', times: 5, body: [{ kind: 'forward' }] },
    ],
  },

  'w2-l01': { levelId: 'w2-l01', steps: [{ kind: 'forward' }, { kind: 'forward' }, { kind: 'forward' }] },

  'w2-l02': {
    levelId: 'w2-l02',
    steps: [
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'right' },
      { kind: 'forward' },
      { kind: 'forward' },
    ],
  },

  'w2-l03': {
    levelId: 'w2-l03',
    steps: [
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'right' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
    ],
  },

  'w2-l04': { levelId: 'w2-l04', steps: [{ kind: 'repeat', times: 8, body: [{ kind: 'forward' }] }] },

  'w2-l05': {
    levelId: 'w2-l05',
    steps: [
      {
        kind: 'repeat',
        times: 5,
        body: [{ kind: 'forward' }, { kind: 'right' }, { kind: 'forward' }, { kind: 'left' }],
      },
    ],
  },

  'w2-l06': {
    levelId: 'w2-l06',
    steps: [
      { kind: 'setVariable', name: 'steps', value: 10 },
      { kind: 'repeat', times: { variable: 'steps' }, body: [{ kind: 'forward' }] },
    ],
  },

  'w2-l07': {
    levelId: 'w2-l07',
    steps: [
      { kind: 'forward' },
      {
        kind: 'if',
        then: [{ kind: 'forward' }],
        else: [
          { kind: 'right' },
          { kind: 'forward' },
          { kind: 'left' },
          { kind: 'forward' },
          { kind: 'forward' },
          { kind: 'left' },
          { kind: 'forward' },
          { kind: 'right' },
          { kind: 'forward' },
        ],
      },
    ],
  },

  'w2-l08': {
    levelId: 'w2-l08',
    steps: [
      { kind: 'repeat', times: 6, body: [{ kind: 'forward' }] },
      { kind: 'if', then: [{ kind: 'forward' }], else: [{ kind: 'right' }] },
      { kind: 'repeat', times: 6, body: [{ kind: 'forward' }] },
    ],
  },

  'w2-l09': {
    levelId: 'w2-l09',
    steps: [
      { kind: 'setVariable', name: 'steps', value: 2 },
      { kind: 'repeat', times: { variable: 'steps' }, body: [{ kind: 'forward' }] },
      { kind: 'if', then: [{ kind: 'forward' }], else: [{ kind: 'right' }] },
      { kind: 'repeat', times: 8, body: [{ kind: 'forward' }] },
      { kind: 'left' },
      { kind: 'repeat', times: 6, body: [{ kind: 'forward' }] },
    ],
  },

  // --- World-2 extension (w2-l10..l12) — same shapes as w1-l10..l12. ---
  'w2-l10': {
    levelId: 'w2-l10',
    steps: [
      { kind: 'setVariable', name: 'steps', value: 11 },
      { kind: 'repeat', times: { variable: 'steps' }, body: [{ kind: 'forward' }] },
    ],
  },

  'w2-l11': {
    levelId: 'w2-l11',
    steps: [
      { kind: 'forward' },
      {
        kind: 'if',
        then: [{ kind: 'forward' }],
        else: [{ kind: 'left' }, { kind: 'forward' }, { kind: 'forward' }, { kind: 'right' }],
      },
      { kind: 'repeat', times: 5, body: [{ kind: 'forward' }] },
      { kind: 'right' },
      { kind: 'repeat', times: 2, body: [{ kind: 'forward' }] },
    ],
  },

  'w2-l12': {
    levelId: 'w2-l12',
    steps: [
      { kind: 'setVariable', name: 'steps', value: 2 },
      { kind: 'repeat', times: { variable: 'steps' }, body: [{ kind: 'forward' }] },
      { kind: 'if', then: [{ kind: 'forward' }], else: [{ kind: 'right' }] },
      { kind: 'repeat', times: 7, body: [{ kind: 'forward' }] },
      { kind: 'left' },
      { kind: 'repeat', times: 5, body: [{ kind: 'forward' }] },
    ],
  },

  // --- World-3 "Computers" — mirrors w1-l01..l12's exact shapes, reskinned. ---
  'w3-l01': { levelId: 'w3-l01', steps: [{ kind: 'forward' }, { kind: 'forward' }, { kind: 'forward' }] },

  'w3-l02': {
    levelId: 'w3-l02',
    steps: [
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'right' },
      { kind: 'forward' },
      { kind: 'forward' },
    ],
  },

  'w3-l03': {
    levelId: 'w3-l03',
    steps: [
      { kind: 'right' },
      { kind: 'forward' },
      { kind: 'left' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
    ],
  },

  'w3-l04': {
    levelId: 'w3-l04',
    steps: [
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'right' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
    ],
  },

  'w3-l05': { levelId: 'w3-l05', steps: [{ kind: 'repeat', times: 7, body: [{ kind: 'forward' }] }] },

  'w3-l06': {
    levelId: 'w3-l06',
    steps: [
      {
        kind: 'repeat',
        times: 4,
        body: [{ kind: 'forward' }, { kind: 'right' }, { kind: 'forward' }, { kind: 'left' }],
      },
    ],
  },

  'w3-l07': {
    levelId: 'w3-l07',
    steps: [
      { kind: 'setVariable', name: 'steps', value: 9 },
      { kind: 'repeat', times: { variable: 'steps' }, body: [{ kind: 'forward' }] },
    ],
  },

  'w3-l08': {
    levelId: 'w3-l08',
    steps: [
      { kind: 'forward' },
      {
        kind: 'if',
        then: [{ kind: 'forward' }],
        else: [
          { kind: 'right' },
          { kind: 'forward' },
          { kind: 'left' },
          { kind: 'forward' },
          { kind: 'forward' },
          { kind: 'left' },
          { kind: 'forward' },
          { kind: 'right' },
          { kind: 'forward' },
        ],
      },
    ],
  },

  'w3-l09': {
    levelId: 'w3-l09',
    steps: [
      { kind: 'repeat', times: 2, body: [{ kind: 'forward' }] },
      { kind: 'if', then: [{ kind: 'forward' }], else: [{ kind: 'right' }] },
      { kind: 'repeat', times: 5, body: [{ kind: 'forward' }] },
      { kind: 'left' },
      { kind: 'repeat', times: 3, body: [{ kind: 'forward' }] },
    ],
  },

  'w3-l10': {
    levelId: 'w3-l10',
    steps: [
      { kind: 'setVariable', name: 'steps', value: 11 },
      { kind: 'repeat', times: { variable: 'steps' }, body: [{ kind: 'forward' }] },
    ],
  },

  'w3-l11': {
    levelId: 'w3-l11',
    steps: [
      { kind: 'forward' },
      {
        kind: 'if',
        then: [{ kind: 'forward' }],
        else: [{ kind: 'left' }, { kind: 'forward' }, { kind: 'forward' }, { kind: 'right' }],
      },
      { kind: 'repeat', times: 5, body: [{ kind: 'forward' }] },
      { kind: 'right' },
      { kind: 'repeat', times: 2, body: [{ kind: 'forward' }] },
    ],
  },

  'w3-l12': {
    levelId: 'w3-l12',
    steps: [
      { kind: 'setVariable', name: 'steps', value: 2 },
      { kind: 'repeat', times: { variable: 'steps' }, body: [{ kind: 'forward' }] },
      { kind: 'if', then: [{ kind: 'forward' }], else: [{ kind: 'right' }] },
      { kind: 'repeat', times: 7, body: [{ kind: 'forward' }] },
      { kind: 'left' },
      { kind: 'repeat', times: 5, body: [{ kind: 'forward' }] },
    ],
  },

  // --- World-4 "Building Games" — mirrors w1-l01..l12's exact shapes, reskinned. ---
  'w4-l01': { levelId: 'w4-l01', steps: [{ kind: 'forward' }, { kind: 'forward' }, { kind: 'forward' }] },

  'w4-l02': {
    levelId: 'w4-l02',
    steps: [
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'right' },
      { kind: 'forward' },
      { kind: 'forward' },
    ],
  },

  'w4-l03': {
    levelId: 'w4-l03',
    steps: [
      { kind: 'right' },
      { kind: 'forward' },
      { kind: 'left' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
    ],
  },

  'w4-l04': {
    levelId: 'w4-l04',
    steps: [
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'right' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
      { kind: 'forward' },
    ],
  },

  'w4-l05': { levelId: 'w4-l05', steps: [{ kind: 'repeat', times: 7, body: [{ kind: 'forward' }] }] },

  'w4-l06': {
    levelId: 'w4-l06',
    steps: [
      {
        kind: 'repeat',
        times: 4,
        body: [{ kind: 'forward' }, { kind: 'right' }, { kind: 'forward' }, { kind: 'left' }],
      },
    ],
  },

  'w4-l07': {
    levelId: 'w4-l07',
    steps: [
      { kind: 'setVariable', name: 'steps', value: 9 },
      { kind: 'repeat', times: { variable: 'steps' }, body: [{ kind: 'forward' }] },
    ],
  },

  'w4-l08': {
    levelId: 'w4-l08',
    steps: [
      { kind: 'forward' },
      {
        kind: 'if',
        then: [{ kind: 'forward' }],
        else: [
          { kind: 'right' },
          { kind: 'forward' },
          { kind: 'left' },
          { kind: 'forward' },
          { kind: 'forward' },
          { kind: 'left' },
          { kind: 'forward' },
          { kind: 'right' },
          { kind: 'forward' },
        ],
      },
    ],
  },

  'w4-l09': {
    levelId: 'w4-l09',
    steps: [
      { kind: 'repeat', times: 2, body: [{ kind: 'forward' }] },
      { kind: 'if', then: [{ kind: 'forward' }], else: [{ kind: 'right' }] },
      { kind: 'repeat', times: 5, body: [{ kind: 'forward' }] },
      { kind: 'left' },
      { kind: 'repeat', times: 3, body: [{ kind: 'forward' }] },
    ],
  },

  'w4-l10': {
    levelId: 'w4-l10',
    steps: [
      { kind: 'setVariable', name: 'steps', value: 11 },
      { kind: 'repeat', times: { variable: 'steps' }, body: [{ kind: 'forward' }] },
    ],
  },

  'w4-l11': {
    levelId: 'w4-l11',
    steps: [
      { kind: 'forward' },
      {
        kind: 'if',
        then: [{ kind: 'forward' }],
        else: [{ kind: 'left' }, { kind: 'forward' }, { kind: 'forward' }, { kind: 'right' }],
      },
      { kind: 'repeat', times: 5, body: [{ kind: 'forward' }] },
      { kind: 'right' },
      { kind: 'repeat', times: 2, body: [{ kind: 'forward' }] },
    ],
  },

  'w4-l12': {
    levelId: 'w4-l12',
    steps: [
      { kind: 'setVariable', name: 'steps', value: 2 },
      { kind: 'repeat', times: { variable: 'steps' }, body: [{ kind: 'forward' }] },
      { kind: 'if', then: [{ kind: 'forward' }], else: [{ kind: 'right' }] },
      { kind: 'repeat', times: 7, body: [{ kind: 'forward' }] },
      { kind: 'left' },
      { kind: 'repeat', times: 5, body: [{ kind: 'forward' }] },
    ],
  },
};

export function getSolution(levelId: string): LevelSolution | null {
  return SOLUTIONS[levelId] ?? null;
}
