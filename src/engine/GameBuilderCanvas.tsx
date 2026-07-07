// Arcade-screen renderer for the robot-grid scenario (DESIGN.md "Scenario
// visual styles" — the Building Games World's signature look throughout).
// Frames the same grid RobotGridCanvas draws inside a HUD/cabinet chrome: a
// live SCORE readout derived from distance traveled, the player sprite
// (robotGlyph), and a "LEVEL CLEAR" flourish on the target cell. Purely
// presentational — reuses the same RobotState/RobotGridGoal data, no new
// state/props, no effect on scoring/win-logic.

import type { RobotGridCanvasProps } from './RobotGridCanvas';
import { checkWin, type RobotState } from './robotGrid';

const CELL = 56;

const DIRECTION_ROTATION: Record<RobotState['direction'], number> = {
  north: 0,
  east: 90,
  south: 180,
  west: 270,
};

export function GameBuilderCanvas({
  goal,
  robotState,
  robotGlyph = '\u{1F916}',
  crashGlyph = '\u{1F4A5}',
  targetGlyph = '\u{1F3C6}',
  obstacleGlyph,
}: RobotGridCanvasProps) {
  const width = goal.gridWidth * CELL;
  const height = goal.gridHeight * CELL;
  const obstacleSet = new Set((goal.obstacles ?? []).map((o) => `${o.x},${o.y}`));
  // Retro "SCORE" HUD, derived from the same state/goal data rather than new
  // props/state: distance traveled from the level's start cell, in points.
  const distanceTraveled = Math.abs(robotState.x - goal.start.x) + Math.abs(robotState.y - goal.start.y);
  const score = distanceTraveled * 100;
  const cleared = checkWin(robotState, goal);

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
          className={isObstacle ? 'gb-cell gb-cell--obstacle' : isTarget ? 'gb-cell gb-cell--target' : 'gb-cell'}
        />,
      );
      if (isTarget) {
        cells.push(
          <text key={`flag-${x}-${y}`} x={x * CELL + CELL / 2} y={y * CELL + CELL / 2 + 7} className="gb-target-glyph">
            {targetGlyph}
          </text>,
        );
      }
      if (isObstacle && obstacleGlyph) {
        cells.push(
          <text
            key={`obstacle-${x}-${y}`}
            x={x * CELL + CELL / 2}
            y={y * CELL + CELL / 2 + 7}
            className="gb-obstacle-glyph"
          >
            {obstacleGlyph}
          </text>,
        );
      }
    }
  }

  const playerCx = robotState.x * CELL + CELL / 2;
  const playerCy = robotState.y * CELL + CELL / 2;

  return (
    <div className="game-builder-canvas">
      <div className="game-builder-canvas__hud">
        <span className="game-builder-canvas__hud-score">{`SCORE: ${score}`}</span>
        {cleared && <span className="game-builder-canvas__hud-clear">{'\u{1F3C6} LEVEL CLEAR'}</span>}
      </div>
      <svg
        className="game-builder-canvas__screen"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Arcade game view"
        preserveAspectRatio="xMidYMid meet"
      >
        {cells}
        <g transform={`translate(${playerCx} ${playerCy}) rotate(${DIRECTION_ROTATION[robotState.direction]})`}>
          <text
            x={0}
            y={10}
            textAnchor="middle"
            className={robotState.crashed ? 'gb-player gb-player--crashed' : 'gb-player'}
          >
            {robotState.crashed ? crashGlyph : robotGlyph}
          </text>
        </g>
      </svg>
    </div>
  );
}
