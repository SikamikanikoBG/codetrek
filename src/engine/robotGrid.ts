// Robot-grid scenario engine — pure functions only (no DOM), easy to unit test.
// This is the only scenario implemented in the MVP; turtle-draw/sorting are
// future additions that should reuse this same "state in, state out" shape.

import type { Direction, RobotGridGoal, StarRules } from '../content/types';

export interface RobotState {
  x: number;
  y: number;
  direction: Direction;
  crashed: boolean;
}

const DIRECTION_ORDER: Direction[] = ['north', 'east', 'south', 'west'];

const DIRECTION_DELTA: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  east: { dx: 1, dy: 0 },
  south: { dx: 0, dy: 1 },
  west: { dx: -1, dy: 0 },
};

export function createInitialState(goal: RobotGridGoal): RobotState {
  return { x: goal.start.x, y: goal.start.y, direction: goal.startDirection, crashed: false };
}

export function isBlocked(goal: RobotGridGoal, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= goal.gridWidth || y >= goal.gridHeight) return true;
  return !!goal.obstacles?.some((o) => o.x === x && o.y === y);
}

/** Moves one cell forward in the current facing direction. Crashing (wall/obstacle/out-of-bounds) halts the robot in place. */
export function moveForward(state: RobotState, goal: RobotGridGoal): RobotState {
  if (state.crashed) return state;
  const { dx, dy } = DIRECTION_DELTA[state.direction];
  const nx = state.x + dx;
  const ny = state.y + dy;
  if (isBlocked(goal, nx, ny)) {
    return { ...state, crashed: true };
  }
  return { ...state, x: nx, y: ny };
}

export function turnLeft(state: RobotState): RobotState {
  if (state.crashed) return state;
  const idx = DIRECTION_ORDER.indexOf(state.direction);
  return { ...state, direction: DIRECTION_ORDER[(idx + 3) % 4] };
}

export function turnRight(state: RobotState): RobotState {
  if (state.crashed) return state;
  const idx = DIRECTION_ORDER.indexOf(state.direction);
  return { ...state, direction: DIRECTION_ORDER[(idx + 1) % 4] };
}

/** Sensing block used by conditional levels: is the cell directly ahead clear (in-bounds, no obstacle)? */
export function isPathClear(state: RobotState, goal: RobotGridGoal): boolean {
  const { dx, dy } = DIRECTION_DELTA[state.direction];
  return !isBlocked(goal, state.x + dx, state.y + dy);
}

export function checkWin(state: RobotState, goal: RobotGridGoal): boolean {
  return !state.crashed && state.x === goal.target.x && state.y === goal.target.y;
}

/**
 * Star rating for a completed run. 3 stars requires meeting the level's
 * authored budget (block count and/or move count); 2 stars for a reasonably
 * close attempt (within 2x budget); 1 star for any successful completion.
 */
export function calculateStars(blocksUsed: number, moves: number, starRules: StarRules): 1 | 2 | 3 {
  const { maxBlocks, maxMoves } = starRules.threeStar;
  const withinBlocks = maxBlocks === undefined || blocksUsed <= maxBlocks;
  const withinMoves = maxMoves === undefined || moves <= maxMoves;
  if (withinBlocks && withinMoves) return 3;

  const blocksOk = maxBlocks === undefined || blocksUsed <= maxBlocks * 2;
  const movesOk = maxMoves === undefined || moves <= maxMoves * 2;
  if (blocksOk && movesOk) return 2;

  return 1;
}
