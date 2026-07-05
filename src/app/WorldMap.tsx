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
}

function LevelTile({
  level,
  status,
  stars,
  onSelectLevel,
}: {
  level: Level;
  status: 'locked' | 'unlocked' | 'completed';
  stars: 0 | 1 | 2 | 3;
  onSelectLevel: (level: Level) => void;
}) {
  const { t } = useTranslation(['levels', 'ui']);
  const isIconTier = level.tier === 'icon';
  const label = isIconTier || !level.titleKey ? `#${level.order}` : t(level.titleKey);

  return (
    <button
      type="button"
      className={`level-tile level-tile--${status}`}
      disabled={status === 'locked'}
      onClick={() => onSelectLevel(level)}
      title={t(`ui:levelStatus.${status}`)}
    >
      <span className="level-tile__order">{label}</span>
      {status === 'completed' && (
        <span className="level-tile__stars" aria-label={`${stars} stars`}>
          {'⭐'.repeat(stars)}
        </span>
      )}
      {status === 'locked' && (
        <span className="level-tile__lock" aria-hidden="true">
          {'\u{1F512}'}
        </span>
      )}
    </button>
  );
}

export function WorldMap({ profile, onSelectLevel, onSwitchProfile }: WorldMapProps) {
  const { t } = useTranslation(['common', 'levels']);
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
        <button type="button" className="btn btn-secondary" onClick={onSwitchProfile}>
          {t('nav.backToProfiles')}
        </button>
      </header>

      <h1>{t('nav.worldMapTitle')}</h1>

      {worlds.map((world) => (
        <section key={world.id} className="world-section">
          <h2>{t(world.titleKey)}</h2>
          <div className="level-grid">
            {world.levels.map((level) => (
              <LevelTile
                key={level.id}
                level={level}
                status={statusMap[level.id] ?? 'locked'}
                stars={profile.progress[level.id]?.stars ?? 0}
                onSelectLevel={onSelectLevel}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
