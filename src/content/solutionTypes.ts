// A small DSL for "Show Solution": describes a correct, idiomatic program
// for a level using the SAME primitives its concepts teach (a level tagged
// "loop" gets a repeat block in its solution, not N flat forward blocks) —
// authored by hand per level, then validated end-to-end (compiled to real
// Blockly blocks, code-generated, and run against the level's own win
// condition) by content/solutions.test.ts. Deliberately doesn't support
// procedures/functions — no shipped level teaches that concept yet.

export type SolutionStep =
  | { kind: 'forward' }
  | { kind: 'left' }
  | { kind: 'right' }
  | { kind: 'repeat'; times: number | { variable: string }; body: SolutionStep[] }
  | { kind: 'setVariable'; name: string; value: number }
  | { kind: 'if'; then: SolutionStep[]; else?: SolutionStep[] };

export interface LevelSolution {
  levelId: string;
  steps: SolutionStep[];
}
