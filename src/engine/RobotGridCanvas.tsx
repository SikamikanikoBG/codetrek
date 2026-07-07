// SVG renderer for the robot-grid scenario. Pure presentational component —
// all state (robot position/direction, win/crash) is computed by
// robotGrid.ts / runner.ts and passed in as props.

import type { RobotGridGoal } from '../content/types';
import type { RobotState } from './robotGrid';

const CELL = 64;

const DIRECTION_ROTATION: Record<RobotState['direction'], number> = {
  north: 0,
  east: 90,
  south: 180,
  west: 270,
};

export interface RobotGridCanvasProps {
  goal: RobotGridGoal;
  robotState: RobotState;
  /** Glyph overrides let a World reskin the scenario narratively (e.g. AI
   * Lab's "data point" target) without touching the renderer or engine. */
  robotGlyph?: string;
  crashGlyph?: string;
  targetGlyph?: string;
  obstacleGlyph?: string;
}

export function RobotGridCanvas({
  goal,
  robotState,
  robotGlyph = '\u{1F916}',
  crashGlyph = '\u{1F4A5}',
  targetGlyph = '\u{1F3C1}',
  obstacleGlyph,
}: RobotGridCanvasProps) {
  const width = goal.gridWidth * CELL;
  const height = goal.gridHeight * CELL;
  const obstacleSet = new Set((goal.obstacles ?? []).map((o) => `${o.x},${o.y}`));

  const cells = [];
  for (let y = 0; y < goal.gridHeight; y += 1) {
    for (let x = 0; x < goal.gridWidth; x += 1) {
      const isObstacle = obstacleSet.has(`${x},${y}`);
      const isTarget = goal.target.x === x && goal.target.y === y;
      cells.push(
        <rect
          key={`${x}-${y}`}
          x={x * CELL}
          y={y * CELL}
          width={CELL}
          height={CELL}
          className={
            isObstacle ? 'grid-cell grid-cell--obstacle' : isTarget ? 'grid-cell grid-cell--target' : 'grid-cell'
          }
        />,
      );
      if (isTarget) {
        cells.push(
          <text key={`flag-${x}-${y}`} x={x * CELL + CELL / 2} y={y * CELL + CELL / 2 + 8} className="grid-flag">
            {targetGlyph}
          </text>,
        );
      }
      if (isObstacle && obstacleGlyph) {
        cells.push(
          <text key={`obstacle-${x}-${y}`} x={x * CELL + CELL / 2} y={y * CELL + CELL / 2 + 8} className="grid-obstacle-glyph">
            {obstacleGlyph}
          </text>,
        );
      }
    }
  }

  const robotCx = robotState.x * CELL + CELL / 2;
  const robotCy = robotState.y * CELL + CELL / 2;

  return (
    <svg
      className="robot-grid-canvas"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Robot grid scenario"
      preserveAspectRatio="xMidYMid meet"
    >
      {cells}
      <g transform={`translate(${robotCx} ${robotCy}) rotate(${DIRECTION_ROTATION[robotState.direction]})`}>
        <text
          x={0}
          y={12}
          textAnchor="middle"
          className={robotState.crashed ? 'grid-robot grid-robot--crashed' : 'grid-robot'}
        >
          {robotState.crashed ? crashGlyph : robotGlyph}
        </text>
      </g>
    </svg>
  );
}
