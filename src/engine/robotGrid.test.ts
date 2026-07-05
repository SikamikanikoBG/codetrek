import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  moveForward,
  turnLeft,
  turnRight,
  isPathClear,
  checkWin,
  calculateStars,
} from './robotGrid';
import type { RobotGridGoal } from '../content/types';

const straightGoal: RobotGridGoal = {
  gridWidth: 4,
  gridHeight: 1,
  start: { x: 0, y: 0 },
  startDirection: 'east',
  target: { x: 3, y: 0 },
};

describe('robotGrid engine', () => {
  it('moves forward in the facing direction', () => {
    const state = createInitialState(straightGoal);
    const moved = moveForward(state, straightGoal);
    expect(moved).toEqual({ x: 1, y: 0, direction: 'east', crashed: false });
  });

  it('crashes when moving out of bounds', () => {
    const state = createInitialState({ ...straightGoal, start: { x: 3, y: 0 } });
    const moved = moveForward(state, straightGoal);
    expect(moved.crashed).toBe(true);
    // crashed robot no longer advances on further moves
    const stillCrashed = moveForward(moved, straightGoal);
    expect(stillCrashed).toBe(moved);
  });

  it('crashes when moving into an obstacle', () => {
    const goal: RobotGridGoal = { ...straightGoal, obstacles: [{ x: 1, y: 0 }] };
    const state = createInitialState(goal);
    const moved = moveForward(state, goal);
    expect(moved.crashed).toBe(true);
  });

  it('turnLeft/turnRight cycle through all four directions', () => {
    const state = createInitialState(straightGoal); // facing east
    expect(turnLeft(state).direction).toBe('north');
    expect(turnRight(state).direction).toBe('south');
    // four right turns return to the original direction
    let s = state;
    for (let i = 0; i < 4; i += 1) s = turnRight(s);
    expect(s.direction).toBe('east');
  });

  it('turning does nothing once crashed', () => {
    const crashedState = { x: 0, y: 0, direction: 'east' as const, crashed: true };
    expect(turnLeft(crashedState)).toBe(crashedState);
    expect(turnRight(crashedState)).toBe(crashedState);
  });

  it('isPathClear reflects obstacles and bounds ahead', () => {
    const goal: RobotGridGoal = { ...straightGoal, obstacles: [{ x: 1, y: 0 }] };
    const state = createInitialState(goal);
    expect(isPathClear(state, goal)).toBe(false);

    const clearGoal: RobotGridGoal = { ...straightGoal };
    expect(isPathClear(createInitialState(clearGoal), clearGoal)).toBe(true);
  });

  it('checkWin requires reaching the target without crashing', () => {
    const goal = straightGoal;
    const winningState = { x: 3, y: 0, direction: 'east' as const, crashed: false };
    expect(checkWin(winningState, goal)).toBe(true);

    const crashedAtTarget = { ...winningState, crashed: true };
    expect(checkWin(crashedAtTarget, goal)).toBe(false);

    const notAtTarget = { x: 2, y: 0, direction: 'east' as const, crashed: false };
    expect(checkWin(notAtTarget, goal)).toBe(false);
  });

  it('calculateStars: within budget earns 3 stars', () => {
    expect(calculateStars(3, 3, { threeStar: { maxBlocks: 3 } })).toBe(3);
  });

  it('calculateStars: within 2x budget earns 2 stars', () => {
    expect(calculateStars(5, 5, { threeStar: { maxBlocks: 3 } })).toBe(2);
  });

  it('calculateStars: beyond 2x budget still earns 1 star for completion', () => {
    expect(calculateStars(10, 10, { threeStar: { maxBlocks: 3 } })).toBe(1);
  });

  it('calculateStars: no budget defined always awards 3 stars for any completion', () => {
    expect(calculateStars(50, 50, { threeStar: {} })).toBe(3);
  });
});
