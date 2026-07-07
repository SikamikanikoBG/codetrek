// Level-complete celebration modal (DESIGN.md "Level-complete modal" motion
// spec). Replaces the old inline `.level-complete-panel`. A genuine win gets
// the full celebration treatment (the whole card scales+fades in, then the
// sequenced star-pop, then the XP line and any badges). An assisted
// ("Build This For Me") completion reuses the exact same modal shell but
// never fakes mastery: muted/hollow stars with no pop-in, no XP line, no
// confetti, different copy — so a kid can't mistake "Buddy built it" for
// "I built it."
//
// Confetti renders HERE (nested inside .modal-backdrop, before .modal-card
// in DOM order) rather than as a page-level sibling: position:fixed
// elements only compare z-index against siblings within the SAME stacking
// context, so a fullscreen confetti canvas rendered outside .modal-backdrop
// would paint over the entire backdrop+card unit regardless of the card's
// own z-index (a real bug an earlier version of this component had).
// Nesting it here, behind the card, in the backdrop's own stacking context
// is what actually puts it "behind the celebration card" as intended.

import { useTranslation } from 'react-i18next';
import { ConfettiBurst } from './ConfettiBurst';

interface LevelCompleteModalProps {
  levelId: string;
  stars: 0 | 1 | 2 | 3;
  assisted: boolean;
  newBadges: string[];
  xpAwarded: number;
  onNextLevel: () => void;
  onBackToMap: () => void;
}

// Turns a badge id into its i18n key, e.g. 'world3-complete' -> 'world3Complete'.
// Matches ANY hyphen-then-alphanumeric (not just hyphen-then-lowercase-letter)
// so a hyphen immediately before a digit (as in the legacy 'world-1-complete'
// id) is collapsed too — '1'.toUpperCase() is still '1', so this is safe for
// both digit and letter boundaries.
function toCamel(id: string): string {
  return id.replace(/-([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function LevelCompleteModal({
  levelId,
  stars,
  assisted,
  newBadges,
  xpAwarded,
  onNextLevel,
  onBackToMap,
}: LevelCompleteModalProps) {
  const { t } = useTranslation(['ui', 'common']);

  return (
    <div className="modal-backdrop">
      {!assisted && <ConfettiBurst burstKey={levelId} className="confetti-burst--fullscreen" />}
      <div
        className={assisted ? 'modal-card' : 'modal-card modal-card--celebrate'}
        role="dialog"
        aria-modal="true"
        aria-label={assisted ? t('ui:completionModal.titleAssisted') : t('ui:completionModal.title')}
      >
        <h2>{assisted ? t('ui:completionModal.titleAssisted') : t('ui:completionModal.title')}</h2>

        <p
          className="level-complete-panel__stars"
          aria-label={assisted ? undefined : t('ui:starsEarned', { count: stars })}
          aria-hidden={assisted ? true : undefined}
        >
          {Array.from({ length: 3 }, (_, i) => {
            const earned = !assisted && i < stars;
            return (
              <span
                key={i}
                className={earned ? 'star-pop star-pop--earned' : 'star-pop star-pop--empty'}
                style={earned ? { ['--star-index' as string]: i } : undefined}
                aria-hidden="true"
              >
                {earned ? '⭐' : '☆'}
              </span>
            );
          })}
        </p>

        {assisted ? (
          <p>{t('ui:completionModal.assistedBody')}</p>
        ) : (
          xpAwarded > 0 && <p className="completion-modal__xp">{t('ui:completionModal.xpEarned', { xp: xpAwarded })}</p>
        )}

        {newBadges.map((badgeId) => (
          <p key={badgeId} className="level-complete-panel__badge">
            {'✓ '}
            {t('ui:badgeEarnedToast', { badge: t(`ui:badges.${toCamel(badgeId)}`) })}
          </p>
        ))}

        <div className="completion-modal__actions">
          <button type="button" className="btn btn-primary" onClick={onNextLevel}>
            {t('common:levelPlay.nextLevel')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onBackToMap}>
            {t('common:nav.backToMap')}
          </button>
        </div>
      </div>
    </div>
  );
}
