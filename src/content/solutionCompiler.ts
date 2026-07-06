// Compiles the SolutionStep DSL into Blockly's workspace JSON serialization
// format — the shape verified empirically against a real Blockly workspace
// (see content/solutions.test.ts) rather than assumed from memory: repeat
// blocks take TIMES/DO inputs, controls_if needs `extraState: {hasElse}`
// plus IF0/DO0/ELSE inputs to get an else branch, and variable fields
// reference a variable by id, declared once in the workspace-level
// `variables` array.

import type { SolutionStep } from './solutionTypes';

interface BlockJson {
  type: string;
  fields?: Record<string, unknown>;
  inputs?: Record<string, { block: BlockJson }>;
  extraState?: unknown;
  next?: { block: BlockJson };
}

function chain(blocks: BlockJson[]): BlockJson | undefined {
  if (blocks.length === 0) return undefined;
  const [first, ...rest] = blocks;
  const restChained = chain(rest);
  return restChained ? { ...first, next: { block: restChained } } : first;
}

function compileStep(step: SolutionStep, varIds: Record<string, string>): BlockJson {
  switch (step.kind) {
    case 'forward':
      return { type: 'move_forward' };
    case 'left':
      return { type: 'turn_left' };
    case 'right':
      return { type: 'turn_right' };
    case 'setVariable':
      return {
        type: 'variables_set',
        fields: { VAR: { id: varIds[step.name] } },
        inputs: { VALUE: { block: { type: 'math_number', fields: { NUM: step.value } } } },
      };
    case 'repeat': {
      const timesBlock: BlockJson =
        typeof step.times === 'number'
          ? { type: 'math_number', fields: { NUM: step.times } }
          : { type: 'variables_get', fields: { VAR: { id: varIds[step.times.variable] } } };
      const body = chain(step.body.map((s) => compileStep(s, varIds)));
      return {
        type: 'controls_repeat_ext',
        inputs: { TIMES: { block: timesBlock }, ...(body ? { DO: { block: body } } : {}) },
      };
    }
    case 'if': {
      const thenBody = chain(step.then.map((s) => compileStep(s, varIds)));
      const elseBody = step.else ? chain(step.else.map((s) => compileStep(s, varIds))) : undefined;
      return {
        type: 'controls_if',
        ...(elseBody ? { extraState: { hasElse: true } } : {}),
        inputs: {
          IF0: { block: { type: 'path_ahead_clear' } },
          ...(thenBody ? { DO0: { block: thenBody } } : {}),
          ...(elseBody ? { ELSE: { block: elseBody } } : {}),
        },
      };
    }
  }
}

function collectVariableNames(steps: SolutionStep[], into: Set<string>): void {
  for (const step of steps) {
    if (step.kind === 'setVariable') into.add(step.name);
    if (step.kind === 'repeat') {
      if (typeof step.times !== 'number') into.add(step.times.variable);
      collectVariableNames(step.body, into);
    }
    if (step.kind === 'if') {
      collectVariableNames(step.then, into);
      if (step.else) collectVariableNames(step.else, into);
    }
  }
}

/** Compiles a solution's steps into the JSON shape `Blockly.serialization.
 * workspaces.load()` expects. */
export function compileSolutionToWorkspaceJson(steps: SolutionStep[]): object {
  const varNames = new Set<string>();
  collectVariableNames(steps, varNames);
  const variables = Array.from(varNames).map((name) => ({ name, id: `solution_var_${name}` }));
  const varIds = Object.fromEntries(variables.map((v) => [v.name, v.id]));

  const topBlock = chain(steps.map((s) => compileStep(s, varIds)));
  return {
    blocks: { languageVersion: 0, blocks: topBlock ? [{ ...topBlock, x: 0, y: 0 }] : [] },
    variables,
  };
}
