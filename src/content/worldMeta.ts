// Per-world visual/identity metadata — kept separate from hand-authored level
// JSON so a World's display order/color/icon can be tuned without touching
// every level file. `colorVar` follows DESIGN.md's `--world-<domain>` CSS
// custom-property naming convention: add one entry here (and the matching
// token in src/index.css) whenever a new World is introduced.

export interface WorldMeta {
  order: number;
  colorVar: string; // CSS custom property name, e.g. '--world-robots'
  icon: string; // single emoji glyph — simple/iconographic, never a mascot
  /** Optional reskin of the robot-grid renderer's target glyph for this
   * World's narrative (e.g. AI Lab's "data point" instead of a finish flag).
   * The engine/renderer are shared — this is presentation only. */
  targetGlyph?: string;
}

export const WORLD_META: Record<string, WorldMeta> = {
  'world-1': { order: 0, colorVar: '--world-robots', icon: '\u{1F916}' }, // 🤖 Robots
  'world-2': { order: 1, colorVar: '--world-ai', icon: '\u{1F9EA}', targetGlyph: '\u{1F4CA}' }, // 🧪 AI Lab, 📊 data point
};

const FALLBACK_META: WorldMeta = { order: 99, colorVar: '--world-robots', icon: '\u{1F310}' };

export function getWorldMeta(worldId: string): WorldMeta {
  return WORLD_META[worldId] ?? FALLBACK_META;
}
