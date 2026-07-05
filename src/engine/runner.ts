// Bridges Blockly-generated JavaScript to the robot-grid engine via
// JS-Interpreter (Neil Fraser's sandboxed, steppable ECMAScript interpreter —
// the same approach Google's own Blockly Games use). Generated code calls
// moveForward/turnLeft/turnRight/isPathClear, which are exposed as native
// functions bound to a mutable RobotState; highlightBlock(id) is injected via
// javascriptGenerator.STATEMENT_PREFIX so we can animate/highlight the
// currently-executing block during stepped playback.

import Interpreter from 'js-interpreter';
import type { RobotGridGoal } from '../content/types';
import {
  createInitialState,
  moveForward,
  turnLeft,
  turnRight,
  isPathClear,
  checkWin,
  type RobotState,
} from './robotGrid';

export interface ExecutionStep {
  state: RobotState;
  highlightBlockId?: string;
}

export interface ExecutionResult {
  steps: ExecutionStep[];
  finalState: RobotState;
  won: boolean;
  crashed: boolean;
  error?: string;
}

const MAX_INTERPRETER_STEPS = 20000;
const MAX_LOOP_ITERATIONS = 5000;

/** Runs Blockly-generated JS to completion against a robot-grid goal, capturing every intermediate state for stepped playback. */
export function runProgram(code: string, goal: RobotGridGoal): ExecutionResult {
  let state = createInitialState(goal);
  const steps: ExecutionStep[] = [{ state }];
  let error: string | undefined;
  let loopGuard = 0;

  function initApi(interpreter: Interpreter, globalObject: unknown) {
    interpreter.setProperty(
      globalObject,
      'moveForward',
      interpreter.createNativeFunction(() => {
        state = moveForward(state, goal);
        steps.push({ state });
      }),
    );
    interpreter.setProperty(
      globalObject,
      'turnLeft',
      interpreter.createNativeFunction(() => {
        state = turnLeft(state);
        steps.push({ state });
      }),
    );
    interpreter.setProperty(
      globalObject,
      'turnRight',
      interpreter.createNativeFunction(() => {
        state = turnRight(state);
        steps.push({ state });
      }),
    );
    interpreter.setProperty(
      globalObject,
      'isPathClear',
      interpreter.createNativeFunction(() => isPathClear(state, goal)),
    );
    interpreter.setProperty(
      globalObject,
      'highlightBlock',
      interpreter.createNativeFunction((id: string) => {
        steps.push({ state, highlightBlockId: id });
      }),
    );
    interpreter.setProperty(
      globalObject,
      'checkLoopTrap',
      interpreter.createNativeFunction(() => {
        loopGuard += 1;
        if (loopGuard > MAX_LOOP_ITERATIONS) {
          throw new Error('Infinite loop detected — check your repeat blocks.');
        }
      }),
    );
  }

  try {
    const interpreter = new Interpreter(code, initApi);
    let stepsRun = 0;
    let more = true;
    while (more) {
      more = interpreter.step();
      stepsRun += 1;
      if (stepsRun > MAX_INTERPRETER_STEPS) {
        error = 'Program took too long to run (possible infinite loop).';
        break;
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return {
    steps,
    finalState: state,
    won: !error && checkWin(state, goal),
    crashed: state.crashed,
    error,
  };
}
