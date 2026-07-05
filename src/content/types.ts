// Level content model — see plan §"Level content model".
// Icon-tier levels reference NO i18n strings by schema (not convention):
// titleKey/hints are optional so a pre-reader's experience can't silently
// break on a missing translation.

export type Tier = 'icon' | 'block-text' | 'python'; // 'python' unused until Phase 2

export type Scenario = 'robot-grid' | 'turtle-draw' | 'sorting'; // only 'robot-grid' implemented in MVP

export type Direction = 'north' | 'east' | 'south' | 'west';

export interface GridCell {
  x: number;
  y: number;
}

export interface RobotGridGoal {
  gridWidth: number;
  gridHeight: number;
  start: GridCell;
  startDirection: Direction;
  target: GridCell;
  obstacles?: GridCell[];
}

export interface StarRules {
  threeStar: {
    maxBlocks?: number;
    maxMoves?: number;
  };
}

export interface Level {
  id: string;
  worldId: string;
  order: number;
  tier: Tier;
  scenario: Scenario;
  titleKey?: string;
  toolboxRef: string;
  startingWorkspace?: string;
  goal: RobotGridGoal;
  starRules: StarRules;
  concepts: string[];
  hints: string[];
}

export interface World {
  id: string;
  order: number;
  titleKey: string;
  levels: Level[];
}
