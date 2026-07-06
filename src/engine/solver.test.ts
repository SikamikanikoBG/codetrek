import { describe, it, expect } from 'vitest';
import { findShortestPath } from './solver';
import type { RobotGridGoal } from '../content/types';

describe('findShortestPath', () => {
  it('returns an empty path when already on the target', () => {
    const goal: RobotGridGoal = {
      gridWidth: 3,
      gridHeight: 1,
      start: { x: 1, y: 0 },
      startDirection: 'east',
      target: { x: 1, y: 0 },
    };
    expect(findShortestPath(goal)).toEqual([]);
  });

  it('finds a straight line', () => {
    const goal: RobotGridGoal = {
      gridWidth: 4,
      gridHeight: 1,
      start: { x: 0, y: 0 },
      startDirection: 'east',
      target: { x: 3, y: 0 },
    };
    expect(findShortestPath(goal)).toEqual(['forward', 'forward', 'forward']);
  });

  it('turns to reach a target not straight ahead', () => {
    const goal: RobotGridGoal = {
      gridWidth: 3,
      gridHeight: 3,
      start: { x: 0, y: 0 },
      startDirection: 'east',
      target: { x: 0, y: 2 },
    };
    const path = findShortestPath(goal);
    expect(path).not.toBeNull();
    // Facing east, needs to turn to face south then move twice (or an
    // equivalent-length route) — exact turn choice isn't asserted, just
    // that it's a valid, minimal-length solution.
    expect(path!.length).toBe(3);
  });

  it('routes around an obstacle', () => {
    const goal: RobotGridGoal = {
      gridWidth: 3,
      gridHeight: 2,
      start: { x: 0, y: 0 },
      startDirection: 'east',
      target: { x: 2, y: 0 },
      obstacles: [{ x: 1, y: 0 }],
    };
    const path = findShortestPath(goal);
    expect(path).not.toBeNull();
    expect(path!.filter((m) => m === 'forward').length).toBeGreaterThanOrEqual(3);
  });

  it('returns null when the target is unreachable', () => {
    const goal: RobotGridGoal = {
      gridWidth: 3,
      gridHeight: 1,
      start: { x: 0, y: 0 },
      startDirection: 'east',
      target: { x: 2, y: 0 },
      obstacles: [{ x: 1, y: 0 }],
    };
    expect(findShortestPath(goal)).toBeNull();
  });
});
