// Level content model — see plan §"Level content model".
// Icon-tier levels reference NO i18n strings by schema (not convention):
// titleKey/hints are optional so a pre-reader's experience can't silently
// break on a missing translation.

export type Tier = 'icon' | 'block-text' | 'python'; // 'python' unused until Phase 2

export type Scenario = 'robot-grid' | 'turtle-draw' | 'sorting'; // only 'robot-grid' implemented in MVP

/** Which scenario renderer draws the right-hand panel. Engine/goal/solution
 * stay identical across styles — this is presentation only. 'top-down' (the
 * original bird's-eye grid) is the default when omitted, so every level
 * authored before this field existed keeps rendering exactly as before. */
export type VisualStyle = 'top-down' | 'pov' | 'game-builder';

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
  /** Defaults to 'top-down' when omitted. */
  visualStyle?: VisualStyle;
}

export interface World {
  id: string;
  order: number;
  titleKey: string;
  /** CSS custom property carrying this World's identity color, e.g. '--world-robots'. */
  colorVar: string;
  /** Single emoji glyph identifying the World in nav/bands — never a mascot illustration. */
  icon: string;
  levels: Level[];
}
