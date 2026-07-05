# Design

## Visual Theme

**Mood**: a sunlit maker's workshop — wood-and-primary-color toy blocks, garden-fresh "grow" energy rather than corporate eco-green. Scratch-like playful craft: candy-bright but deliberate, hand-crafted warmth, feels like a well-made toy.

**Color strategy**: Full palette. This product now spans multiple themed Worlds (Robots, AI, more to come) plus a shared app chrome — each World gets its own identity color on top of the base system, the way Scratch color-codes block categories.

### Core tokens (OKLCH)

```css
:root {
  /* Base surface (light) */
  --bg: oklch(1 0 0);                    /* pure white canvas — let color live in brand/accents */
  --surface: oklch(0.96 0.012 145);      /* bg pulled toward ink, faint green family */
  --surface-raised: oklch(0.99 0.006 145);
  --ink: oklch(0.22 0.02 145);           /* body text, ≥7:1 vs bg */
  --muted: oklch(0.48 0.02 145);         /* secondary text, ≥3.5:1 vs bg */
  --border: oklch(0.88 0.02 145);

  /* Brand */
  --primary: oklch(0.62 0.16 145);       /* grass green — brand chrome, primary actions */
  --primary-ink: oklch(1 0 0);           /* white text on primary (saturated mid-L fill) */
  --accent: oklch(0.72 0.19 55);         /* warm amber — XP/reward/celebration moments only */
  --accent-ink: oklch(0.18 0.02 55);

  /* Status (never color-alone — always paired with icon/shape per accessibility principle) */
  --success: oklch(0.60 0.15 150);
  --danger: oklch(0.58 0.19 25);
  --locked: oklch(0.70 0.01 145);

  /* World/domain identity colors — add one per new World, keep L 0.55-0.65 / C 0.15-0.19 */
  --world-robots: oklch(0.58 0.16 250);   /* blue */
  --world-ai: oklch(0.58 0.18 300);       /* violet */

  --shadow-sm: 0 2px 4px oklch(0.22 0.02 145 / 0.08);
  --shadow-md: 0 6px 16px oklch(0.22 0.02 145 / 0.12);
}

:root[data-theme="dark"], @media (prefers-color-scheme: dark) {
  --bg: oklch(0.09 0 0);
  --surface: oklch(0.15 0.015 145);
  --surface-raised: oklch(0.19 0.015 145);
  --ink: oklch(0.95 0.01 145);
  --muted: oklch(0.72 0.02 145);
  --border: oklch(0.30 0.02 145);
  --primary: oklch(0.68 0.16 145);
  --primary-ink: oklch(0.09 0 0);
  --accent: oklch(0.76 0.18 55);
  --accent-ink: oklch(0.12 0.02 55);
}
```

Text-on-fill rule: any saturated mid-L fill (primary, accent, world colors, status pills) gets white/near-white text — never dark text on these, per Helmholtz-Kohlrausch. Only pale (L>0.85) or neutral fills get dark text.

Colorblind-safe rule: locked/unlocked/completed and correct/incorrect states pair color with a distinct icon/shape (lock glyph, checkmark, star count) — never color alone.

## Typography

- **Display/headings**: Fredoka (rounded, bold, characterful — carries the "friendly toy" personality). Self-hosted via `@fontsource/fredoka`, weights 500/600/700.
- **Body/UI**: Atkinson Hyperlegible (humanist, exceptionally legible at small sizes — deliberate contrast axis against the rounded display face, and a genuine accessibility win for a mixed-reading-level audience). Self-hosted via `@fontsource/atkinson-hyperlegible`, weights 400/700.
- Scale: display clamp(2rem, 5vw, 3.5rem) for hero moments only (world map title), h2 ~1.5rem, body 1rem-1.125rem (kids need slightly larger body text than adult products).
- Display letter-spacing: -0.02em max (Fredoka is already rounded/friendly, don't tighten further).
- `text-wrap: balance` on all headings.

## Layout

- Flexbox for the linear flows (profile picker, level-play controls); CSS Grid for the World map and level grids (`repeat(auto-fit, minmax(120px, 1fr))`), and the new Progress view's stat/badge grids.
- No nested cards. World map: world "chapters" as full-bleed colored bands (using each world's identity color at low-opacity tint), not stacked cards-in-cards.
- z-index scale: `--z-dropdown: 10; --z-sticky: 20; --z-modal-backdrop: 30; --z-modal: 40; --z-toast: 50;`

## Motion

- Level unlock: scale+fade in with ease-out-quint, ~350ms, staggered 40ms per tile when a batch unlocks.
- Star earn: each star pops in sequence (not simultaneous) with a small overshoot-free scale (ease-out-back is too bouncy per the no-bounce rule — use ease-out-quart with a brief scale 0.8→1.05→1.0 via two-step transition, not a spring library).
- XP toast: slides up from bottom (mobile) / in from the side (desktop), auto-dismiss with a progress-bar wipe.
- Confetti/celebration on level-complete: canvas-based particle burst, respects `prefers-reduced-motion` (falls back to a static badge fade-in, no motion).
- All motion wrapped in `@media (prefers-reduced-motion: reduce)` fallbacks — crossfade or instant.

## Components

- **Buttons**: `.btn` base (rounded-lg, 44px min tap target already in place — keep), `.btn-primary` (filled primary, white text), `.btn-accent` (filled amber, for celebratory CTAs only, e.g. "Claim reward"), `.btn-secondary` (outline).
- **World band**: full-width section per World, tinted with that world's identity color at ~8% opacity background + the world's icon/glyph, containing its level-tile grid.
- **Level tile**: square, icon or emoji for icon-tier, icon+short label for block-tier; locked state shows a lock glyph (not just dimmed color); completed shows checkmark + star count as text "3★" not color alone.
- **Progress view (new)**: per-profile stats — total XP with a level/rank derived from XP thresholds, badge gallery (earned vs. locked-silhouette for unearned), per-World completion bars (X/Y levels, stars collected out of max), simple recent-activity list (last N levels completed with date).
- **Blockly chrome**: keep Blockly's own canvas/toolbox untouched functionally; wrap it in a `--surface-raised` panel with `--border`, rounded corners matching the rest of the system (Blockly's own theme can be customized via its Theme API to use `--primary` for block category colors where sensible — don't fight Blockly's rendering, frame it).

## Anti-patterns to avoid (project-specific)

- No gradient text anywhere (XP numbers, world titles — solid color + weight for emphasis).
- No side-stripe borders on level tiles or badges.
- No generic clip-art mascot — if a mascot/character is used, keep it to simple geometric/iconographic shapes consistent with the rounded display type, not a cartoon illustration.
