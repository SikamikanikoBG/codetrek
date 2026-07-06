// Buddy: the on-fly teaching companion. Purely presentational — LevelPlay
// decides WHEN to show it (new-concept intro, stuck-detector tiers) and
// passes what to say; Buddy just renders the mascot + speech bubble + an
// optional animated mini-demo of the concept in question.
//
// Mascot is a hand-coded SVG (no asset pipeline) so it inherits the app's
// OKLCH tokens via plain CSS `var()` — unlike Blockly's internal theme
// (BlocklyEditor.tsx), this SVG goes through the normal CSS cascade, so
// var() works here with no pixel-readback normalization needed.

import type { ReactNode } from 'react';
import { getConceptInfo } from '../content/concepts';
import { useTranslation } from 'react-i18next';

/** Renders a concept's "how to use this block" steps as a numbered list —
 * deliberately several concrete steps rather than one summary sentence, so
 * a stuck parent (per feedback: "even for me the variables are hard to
 * understand") gets something to actually try, not just a definition. */
export function ConceptSteps({ stepsKey }: { stepsKey: string }) {
  const { t } = useTranslation('buddy');
  const steps = t(stepsKey, { returnObjects: true }) as unknown as string[];
  if (!Array.isArray(steps)) return null;
  return (
    <ol className="concept-steps">
      {steps.map((step, i) => (
        <li key={i}>{step}</li>
      ))}
    </ol>
  );
}

export type BuddyMood = 'idle' | 'thinking' | 'happy' | 'curious';

interface BuddyMascotProps {
  mood: BuddyMood;
}

function BuddyMascot({ mood }: BuddyMascotProps) {
  return (
    <svg
      className={`buddy-mascot buddy-mascot--${mood}`}
      viewBox="0 0 100 100"
      width="64"
      height="64"
      aria-hidden="true"
    >
      <circle className="buddy-mascot__antenna-wire" cx="50" cy="18" r="0" />
      <line x1="50" y1="10" x2="50" y2="22" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <circle className="buddy-mascot__antenna-tip" cx="50" cy="8" r="5" fill="var(--accent)" />
      <rect x="20" y="22" width="60" height="52" rx="18" fill="var(--primary)" />
      <circle className="buddy-mascot__eye" cx="38" cy="46" r="7" fill="var(--surface-raised)" />
      <circle className="buddy-mascot__eye" cx="62" cy="46" r="7" fill="var(--surface-raised)" />
      <circle cx="38" cy="46" r="3" fill="var(--ink)" />
      <circle cx="62" cy="46" r="3" fill="var(--ink)" />
      {mood === 'happy' ? (
        <path d="M34 60 Q50 72 66 60" stroke="var(--surface-raised)" strokeWidth="4" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M36 62 Q50 66 64 62" stroke="var(--surface-raised)" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
      <rect x="12" y="40" width="8" height="20" rx="4" fill="var(--primary)" />
      <rect x="80" y="40" width="8" height="20" rx="4" fill="var(--primary)" />
    </svg>
  );
}

interface ConceptDemoProps {
  glyphs: string[];
}

/** Tiny looping animation: the concept's glyph sequence lights up in order,
 * pauses, then repeats. Respects prefers-reduced-motion via CSS (App.css)
 * by disabling the animation and just showing every glyph at full opacity. */
function ConceptDemo({ glyphs }: ConceptDemoProps) {
  return (
    <div className="concept-demo" aria-hidden="true">
      {glyphs.map((glyph, i) => (
        <span key={i} className="concept-demo__glyph" style={{ ['--demo-index' as string]: i, ['--demo-count' as string]: glyphs.length }}>
          {glyph}
        </span>
      ))}
    </div>
  );
}

export interface BuddyAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

interface BuddyProps {
  mood: BuddyMood;
  message: ReactNode;
  conceptId?: string;
  actions?: BuddyAction[];
  onDismiss?: () => void;
  /** Distinguishes the ambient in-scenario bubble from the focused
   * pre-puzzle "new skill" card, which gets a dimmed backdrop. */
  variant?: 'inline' | 'focused';
}

export function Buddy({ mood, message, conceptId, actions, onDismiss, variant = 'inline' }: BuddyProps) {
  const { t } = useTranslation('buddy');
  const concept = conceptId ? getConceptInfo(conceptId) : null;

  const card = (
    <div className={`buddy buddy--${variant}`} role="status">
      <BuddyMascot mood={mood} />
      <div className="buddy__bubble">
        {onDismiss && variant === 'inline' && (
          <button type="button" className="buddy__close" onClick={onDismiss} aria-label={t('nudge.dismiss')}>
            ×
          </button>
        )}
        <div className="buddy__message">{message}</div>
        {concept && <ConceptDemo glyphs={concept.demoGlyphs} />}
        {actions && actions.length > 0 && (
          <div className="buddy__actions">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={action.primary ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (variant === 'focused') {
    return <div className="buddy-backdrop">{card}</div>;
  }
  return card;
}
