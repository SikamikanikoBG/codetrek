// The authoritative check for every hand-authored solution in solutions.ts:
// compiles the DSL to real Blockly blocks, generates JavaScript through the
// SAME javascriptGenerator the app uses, and runs it through the SAME
// runner/win-check LevelPlay does. A wrong turn or an off-by-one repeat
// count fails here, not in a parent's hands.

import { describe, it, expect } from 'vitest';
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { registerBlocklyExtensions } from '../blockly/blocks';
import { getAllLevels } from './manifest';
import { getSolution } from './solutions';
import { compileSolutionToWorkspaceJson } from './solutionCompiler';
import { runProgram } from '../engine/runner';

registerBlocklyExtensions();

describe('SOLUTIONS completeness', () => {
  it('has a solution for every level in the manifest', () => {
    const allLevels = getAllLevels();
    const missing = allLevels.filter((l) => !getSolution(l.id)).map((l) => l.id);
    expect(missing).toEqual([]);
  });
});

describe('every level solution actually wins', () => {
  const allLevels = getAllLevels();

  it.each(allLevels.map((l) => [l.id, l] as const))('%s', (_id, level) => {
    const solution = getSolution(level.id);
    expect(solution, `no solution authored for ${level.id}`).not.toBeNull();

    const workspace = new Blockly.Workspace();
    try {
      const json = compileSolutionToWorkspaceJson(solution!.steps);
      Blockly.serialization.workspaces.load(json, workspace);
      const code = javascriptGenerator.workspaceToCode(workspace);
      const result = runProgram(code, level.goal);

      expect(result.error, `${level.id} errored: ${result.error}`).toBeUndefined();
      expect(result.crashed, `${level.id} crashed`).toBe(false);
      expect(result.won, `${level.id} did not reach the target`).toBe(true);
    } finally {
      workspace.dispose();
    }
  });
});
