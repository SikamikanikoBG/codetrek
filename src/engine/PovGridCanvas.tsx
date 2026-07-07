// First-person / POV renderer for the robot-grid scenario (DESIGN.md
// "Scenario visual styles" — used on a few advanced/late levels per World for
// a difficulty-signaling change of pace). Presentational only: it reads the
// exact same RobotState/RobotGridGoal data RobotGridCanvas does, reusing
// isBlocked/DIRECTION_DELTA from robotGrid.ts, and never affects
// scoring/win-logic. Stylized converging-corridor perspective, still
// SVG-based for bundle-size/consistency with the rest of the app — no 3D
// engine.

import type { RobotGridCanvasProps } from './RobotGridCanvas';
import { isBlocked, DIRECTION_DELTA } from './robotGrid';
import type { RobotGridGoal } from '../content/types';
import type { RobotState } from './robotGrid';

const VIEW_W = 400;
const VIEW_H = 280;
const CENTER_X = VIEW_W / 2;
const CENTER_Y = VIEW_H / 2;
const VANISH_HALF_W = 26;
const VANISH_HALF_H = 20;
// How many cells ahead get their own receding "ring" — a difficulty-scoped
// viewing distance, not a hard engine limit (distanceToTargetAhead below
// still looks arbitrarily far for the target glow).
const MAX_RINGS = 4;

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Linear interpolation between the full viewport (t=0) and the small
 * vanishing-point rect (t=1) — the geometry behind the converging corridor. */
function ringRect(t: number): Rect {
  const halfW = VIEW_W / 2 - (VIEW_W / 2 - VANISH_HALF_W) * t;
  const halfH = VIEW_H / 2 - (VIEW_H / 2 - VANISH_HALF_H) * t;
  return {
    left: CENTER_X - halfW,
    right: CENTER_X + halfW,
    top: CENTER_Y - halfH,
    bottom: CENTER_Y + halfH,
  };
}

interface AheadCell {
  x: number;
  y: number;
  blocked: boolean;
}

/** Walks forward from the robot's current cell in its current facing
 * direction, up to MAX_RINGS cells, stopping early at the first blocked
 * (wall/obstacle/out-of-bounds) cell. */
function aheadCells(state: RobotState, goal: RobotGridGoal): AheadCell[] {
  const { dx, dy } = DIRECTION_DELTA[state.direction];
  const cells: AheadCell[] = [];
  let x = state.x;
  let y = state.y;
  for (let i = 0; i < MAX_RINGS; i += 1) {
    x += dx;
    y += dy;
    const blocked = isBlocked(goal, x, y);
    cells.push({ x, y, blocked });
    if (blocked) break;
  }
  return cells;
}

/** Distance to the target if it lies straight ahead on the current facing
 * line with nothing blocking the view before it; null otherwise. */
function distanceToTargetAhead(state: RobotState, goal: RobotGridGoal): number | null {
  const { dx, dy } = DIRECTION_DELTA[state.direction];
  if (dx === 0 && dy === 0) return null;
  let x = state.x;
  let y = state.y;
  let dist = 0;
  // isBlocked always returns true once we step outside the grid, so this
  // loop is bounded by the grid's own dimensions.
  for (;;) {
    x += dx;
    y += dy;
    dist += 1;
    if (isBlocked(goal, x, y)) return null;
    if (x === goal.target.x && y === goal.target.y) return dist;
  }
}

export function PovGridCanvas({
  goal,
  robotState,
  crashGlyph = '\u{1F4A5}',
  targetGlyph = '\u{1F3C1}',
  obstacleGlyph,
}: RobotGridCanvasProps) {
  const outer = ringRect(0);
  const vanish = ringRect(1);
  const cells = aheadCells(robotState, goal);
  const blockedAhead = cells.length > 0 && cells[cells.length - 1].blocked;
  const targetDistance = blockedAhead ? null : distanceToTargetAhead(robotState, goal);

  const rings = cells.map((cell, i) => ({ ...ringRect((i + 1) / (MAX_RINGS + 1)), blocked: cell.blocked }));
  const lastRing = rings[rings.length - 1];

  return (
    <svg
      className="pov-grid-canvas"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label="First-person robot view"
      preserveAspectRatio="xMidYMid meet"
    >
      <polygon
        className="pov-ceiling"
        points={`${outer.left},${outer.top} ${outer.right},${outer.top} ${vanish.right},${vanish.top} ${vanish.left},${vanish.top}`}
      />
      <polygon
        className="pov-floor"
        points={`${outer.left},${outer.bottom} ${outer.right},${outer.bottom} ${vanish.right},${vanish.bottom} ${vanish.left},${vanish.bottom}`}
      />
      <polygon
        className="pov-wall-left"
        points={`${outer.left},${outer.top} ${vanish.left},${vanish.top} ${vanish.left},${vanish.bottom} ${outer.left},${outer.bottom}`}
      />
      <polygon
        className="pov-wall-right"
        points={`${outer.right},${outer.top} ${vanish.right},${vanish.top} ${vanish.right},${vanish.bottom} ${outer.right},${outer.bottom}`}
      />

      {rings.map((ring, i) => (
        <rect
          key={`ring-${i}`}
          className="pov-ring"
          x={ring.left}
          y={ring.top}
          width={ring.right - ring.left}
          height={ring.bottom - ring.top}
        />
      ))}

      {lastRing?.blocked && (
        <g>
          <rect
            className="pov-wall-block"
            x={lastRing.left}
            y={lastRing.top}
            width={lastRing.right - lastRing.left}
            height={lastRing.bottom - lastRing.top}
          />
          <text
            className="pov-obstacle-glyph"
            x={(lastRing.left + lastRing.right) / 2}
            y={(lastRing.top + lastRing.bottom) / 2 + 8}
          >
            {obstacleGlyph ?? '\u{1F9F1}'}
          </text>
        </g>
      )}

      {!blockedAhead && targetDistance !== null && (
        <text
          className="pov-target-glyph"
          x={CENTER_X}
          y={vanish.bottom - 2}
          style={{ fontSize: `${Math.max(14, 34 - targetDistance * 3)}px` }}
        >
          {targetGlyph}
        </text>
      )}

      {robotState.crashed && (
        <text className="pov-crash-glyph" x={CENTER_X} y={CENTER_Y + 16}>
          {crashGlyph}
        </text>
      )}
    </svg>
  );
}
