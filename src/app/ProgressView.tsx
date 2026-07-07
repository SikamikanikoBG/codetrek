// Progress/stats screen (DESIGN.md "Progress view (new)"). Reads entirely
// from the existing gamification store/rules — no new persistence. Every
// stat here is a pure derivation over the profile already loaded in App.

import { useTranslation } from 'react-i18next';
import { worlds, getAllLevels } from '../content/manifest';
import { BADGE_RULES, getRank, getWorldCompletion, getRecentActivity } from '../gamification/rules';
import type { Profile } from '../storage/localStorage';

interface ProgressViewProps {
  profile: Profile;
  onBack: () => void;
}

// Small built-in glyph per badge — icon-first per PRODUCT.md's "show, don't
// tell" principle, kept to simple emoji (no mascot illustrations).
const BADGE_ICONS: Record<string, string> = {
  'first-steps': '\u{1F463}', // footprints
  'loop-explorer': '\u{1F501}', // repeat
  'conditional-thinker': '\u{1F500}', // twisted arrows
  'variable-wizard': '\u{1F9EE}', // abacus
  perfectionist: '\u{2B50}', // star
  'world-1-complete': '\u{1F916}', // robot
  'world-2-complete': '\u{1F9EA}', // test tube
  'world3-complete': '\u{1F4BB}', // laptop
  'world4-complete': '\u{1F3AE}', // game controller
};

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export function ProgressView({ profile, onBack }: ProgressViewProps) {
  const { t, i18n } = useTranslation(['common', 'levels', 'ui']);
  const allLevels = getAllLevels();
  const rank = getRank(profile.xp);
  const recentActivity = getRecentActivity(profile, allLevels, 6);

  return (
    <div className="progress-view">
      <header className="progress-view__header">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          {t('nav.backToWorldMap')}
        </button>
        <h1>{t('ui:progress.title')}</h1>
      </header>

      <section className="progress-panel progress-panel--rank">
        <div className="progress-rank__xp">{t('ui:progress.totalXp', { xp: profile.xp })}</div>
        <div className="progress-rank__label">{t(rank.labelKey)}</div>
        {rank.nextMinXp !== null ? (
          <>
            <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100}>
              <div
                className="progress-bar__fill"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(((profile.xp - rank.minXp) / (rank.nextMinXp - rank.minXp)) * 100),
                  )}%`,
                }}
              />
            </div>
            <p className="progress-rank__next">
              {t('ui:progress.nextRank', { xp: Math.max(0, rank.nextMinXp - profile.xp) })}
            </p>
          </>
        ) : (
          <p className="progress-rank__next progress-rank__next--top">{t('ui:progress.topRank')}</p>
        )}
      </section>

      <section className="progress-panel">
        <h2>{t('ui:progress.badges')}</h2>
        <div className="badge-gallery">
          {BADGE_RULES.map((badge) => {
            const earned = profile.badges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={earned ? 'badge-tile badge-tile--earned' : 'badge-tile badge-tile--locked'}
              >
                <span className="badge-tile__icon" aria-hidden="true">
                  {BADGE_ICONS[badge.id] ?? '\u{1F3C5}'}
                </span>
                {earned ? (
                  <span className="badge-tile__status badge-tile__status--earned" aria-hidden="true">
                    {'✓'}
                  </span>
                ) : (
                  <span className="badge-tile__status badge-tile__status--locked" aria-hidden="true">
                    {'\u{1F512}'}
                  </span>
                )}
                <span className="badge-tile__desc">
                  {earned ? t(badge.descriptionKey) : t('ui:progress.badgeLocked')}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="progress-panel">
        <h2>{t('ui:progress.worldProgress')}</h2>
        <div className="world-progress-list">
          {worlds.map((world) => {
            const completion = getWorldCompletion(profile, world.levels);
            const pct =
              completion.totalLevels === 0
                ? 0
                : Math.round((completion.completedLevels / completion.totalLevels) * 100);
            return (
              <div key={world.id} className="world-progress-row" style={{ ['--row-color' as string]: `var(${world.colorVar})` }}>
                <span className="world-progress-row__icon" aria-hidden="true">
                  {world.icon}
                </span>
                <div className="world-progress-row__body">
                  <div className="world-progress-row__title">{t(world.titleKey)}</div>
                  <div className="progress-bar progress-bar--world">
                    <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="world-progress-row__stats">
                    <span>
                      {t('ui:progress.levelsCompleted', {
                        completed: completion.completedLevels,
                        total: completion.totalLevels,
                      })}
                    </span>
                    <span>
                      {t('ui:progress.starsCollected', { stars: completion.starsEarned, max: completion.maxStars })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="progress-panel">
        <h2>{t('ui:progress.recentActivity')}</h2>
        {recentActivity.length === 0 ? (
          <p className="progress-empty">{t('ui:progress.noActivity')}</p>
        ) : (
          <ul className="recent-activity-list">
            {recentActivity.map((entry) => (
              <li key={entry.levelId} className="recent-activity-item">
                <span className="recent-activity-item__level">{entry.levelId}</span>
                <span className="recent-activity-item__stars" aria-label={`${entry.stars} stars`}>
                  {'⭐'.repeat(entry.stars)}
                </span>
                <span className="recent-activity-item__date">
                  {t('ui:progress.completedOn', { date: formatDate(entry.completedAt, i18n.language) })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
