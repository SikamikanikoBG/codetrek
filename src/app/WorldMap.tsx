import { useTranslation } from 'react-i18next';
import { worlds, getAllLevels } from '../content/manifest';
import { getLevelStatusMap } from '../gamification/store';
import type { Level } from '../content/types';
import type { Profile } from '../storage/localStorage';
import { avatarGlyph } from './avatars';

interface WorldMapProps {
  profile: Profile;
  onSelectLevel: (level: Level) => void;
  onSwitchProfile: () => void;
  onShowProgress: () => void;
  onOpenAccount: () => void;
}

function LevelTile({
  level,
  status,
  stars,
  tileIndex,
  onSelectLevel,
}: {
  level: Level;
  status: 'locked' | 'unlocked' | 'completed';
  stars: 0 | 1 | 2 | 3;
  tileIndex: number;
  onSelectLevel: (level: Level) => void;
}) {
  const { t } = useTranslation(['levels', 'ui']);
  const isIconTier = level.tier === 'icon';
  const label = isIconTier || !level.titleKey ? `#${level.order}` : t(level.titleKey);

  return (
    <button
      type="button"
      className={`level-tile level-tile--${status}`}
      style={{ ['--tile-index' as string]: tileIndex }}
      disabled={status === 'locked'}
      onClick={() => onSelectLevel(level)}
      title={t(`ui:levelStatus.${status}`)}
    >
      <span className="level-tile__order">{label}</span>
      {status === 'completed' && (
        <span className="level-tile__badge level-tile__badge--completed" aria-label={`${stars} stars`}>
          {'✓ '}
          {'⭐'.repeat(stars)}
        </span>
      )}
      {status === 'locked' && (
        <span className="level-tile__badge level-tile__badge--locked" aria-hidden="true">
          {'\u{1F512}'}
        </span>
      )}
    </button>
  );
}

export function WorldMap({ profile, onSelectLevel, onSwitchProfile, onShowProgress, onOpenAccount }: WorldMapProps) {
  const { t } = useTranslation(['common', 'levels', 'auth']);
  const allLevels = getAllLevels();
  const statusMap = getLevelStatusMap(profile, allLevels);

  return (
    <div className="world-map">
      <header className="world-map__header">
        <div className="world-map__profile">
          <span aria-hidden="true">{avatarGlyph(profile.avatarId)}</span>
          <span>{profile.name}</span>
          <span className="xp-pill">{profile.xp} XP</span>
        </div>
        <div className="world-map__actions">
          <button type="button" className="btn btn-secondary" onClick={onShowProgress}>
            {t('nav.progress')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onSwitchProfile}>
            {t('nav.backToProfiles')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onOpenAccount}>
            {t('auth:account.openLink')}
          </button>
        </div>
      </header>

      <h1>{t('nav.worldMapTitle')}</h1>

      {worlds.map((world) => (
        <section
          key={world.id}
          className="world-band"
          style={
            {
              '--world-color': `var(${world.colorVar})`,
              '--world-tint': `var(${world.colorVar}-tint)`,
              '--world-border': `var(${world.colorVar}-border)`,
            } as Record<string, string>
          }
        >
          <h2 className="world-band__title">
            <span className="world-band__icon" aria-hidden="true">
              {world.icon}
            </span>
            {t(world.titleKey)}
          </h2>
          <div className="level-grid">
            {world.levels.map((level, index) => (
              <LevelTile
                key={level.id}
                level={level}
                status={statusMap[level.id] ?? 'locked'}
                stars={profile.progress[level.id]?.stars ?? 0}
                tileIndex={index}
                onSelectLevel={onSelectLevel}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
