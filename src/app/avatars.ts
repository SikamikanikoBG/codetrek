// Small built-in avatar set — no image uploads, no auth. Emoji glyphs keep
// the bundle tiny and render consistently without shipping image assets.
export interface Avatar {
  id: string;
  glyph: string;
}

export const AVATARS: Avatar[] = [
  { id: 'fox', glyph: '\u{1F98A}' },
  { id: 'robot', glyph: '\u{1F916}' },
  { id: 'cat', glyph: '\u{1F431}' },
  { id: 'astronaut', glyph: '\u{1F9D1}‍\u{1F680}' },
  { id: 'dinosaur', glyph: '\u{1F996}' },
  { id: 'unicorn', glyph: '\u{1F984}' },
  { id: 'owl', glyph: '\u{1F989}' },
  { id: 'dragon', glyph: '\u{1F409}' },
];

export function avatarGlyph(avatarId: string): string {
  return AVATARS.find((a) => a.id === avatarId)?.glyph ?? '\u{1F642}';
}

export const MAX_PROFILES = 4;
