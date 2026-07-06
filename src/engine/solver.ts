// BFS pathfinder over the robot-grid — pure and DOM-free like the rest of
// this engine. Not used to generate what's shown in "Show Solution" (that
// should demonstrate the concept a level teaches — loops/variables/
// conditionals — not just the shortest raw path), but a genuinely useful
// ground-truth tool for AUTHORING and validating those hand-written
// solutions: if a level's intended solution can't out-perform (or at least
// match reachability of) the shortest possible path, something's wrong
// with either the level or the authored solution.

import type { RobotGridGoal, Direction } from '../content/types';
import { moveForward, turnLeft, turnRight, checkWin, type RobotState } from './robotGrid';

export type Move = 'forward' | 'left' | 'right';

interface SearchState {
  x: number;
  y: number;
  direction: Direction;
}

function key(s: SearchState): string {
  return `${s.x},${s.y},${s.direction}`;
}

function asRobotState(s: SearchState): RobotState {
  return { ...s, crashed: false };
}

/** Shortest move/turn sequence from start to target, avoiding obstacles/
 * walls — BFS over (x, y, direction) states. Returns null if unreachable. */
export function findShortestPath(goal: RobotGridGoal): Move[] | null {
  const start: SearchState = { x: goal.start.x, y: goal.start.y, direction: goal.startDirection };
  if (checkWin(asRobotState(start), goal)) return [];

  const queue: { state: SearchState; path: Move[] }[] = [{ state: start, path: [] }];
  const visited = new Set<string>([key(start)]);

  while (queue.length > 0) {
    const { state, path } = queue.shift()!;
    const candidates: [Move, RobotState][] = [
      ['forward', moveForward(asRobotState(state), goal)],
      ['left', turnLeft(asRobotState(state))],
      ['right', turnRight(asRobotState(state))],
    ];
    for (const [move, next] of candidates) {
      if (next.crashed) continue;
      const nextState: SearchState = { x: next.x, y: next.y, direction: next.direction };
      if (checkWin(next, goal)) return [...path, move];
      const k = key(nextState);
      if (visited.has(k)) continue;
      visited.add(k);
      queue.push({ state: nextState, path: [...path, move] });
    }
  }
  return null;
}
