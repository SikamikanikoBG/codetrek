import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getStore, createProfile, switchProfile } from '../gamification/store';
import { writeStore, type Profile } from '../storage/localStorage';
import { setSyncMeta } from '../storage/syncMeta';
import { linkDevice } from '../sync/client';
import { AVATARS, avatarGlyph, MAX_PROFILES } from './avatars';
import { setActiveLanguage } from './i18n';

interface ProfilePickerProps {
  onProfileSelected: (profile: Profile) => void;
}

export function ProfilePicker({ onProfileSelected }: ProfilePickerProps) {
  const { t } = useTranslation('common');
  const [store, setStore] = useState(() => getStore());
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState(AVATARS[0].id);
  const [languagePref, setLanguagePref] = useState<'en' | 'bg'>('en');
  const [error, setError] = useState<string | null>(null);

  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkCodeInput, setLinkCodeInput] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const canCreateMore = store.profiles.length < MAX_PROFILES;

  function handleSelectExisting(profile: Profile) {
    switchProfile(profile.id);
    setActiveLanguage(profile.languagePref);
    onProfileSelected(profile);
  }

  function handleCreate() {
    if (!name.trim()) {
      setError(t('profilePicker.nameRequired'));
      return;
    }
    const profile = createProfile(name.trim(), avatarId, languagePref);
    setActiveLanguage(languagePref);
    setStore(getStore());
    onProfileSelected(profile);
  }

  async function handleLinkSubmit() {
    if (!linkCodeInput.trim()) {
      setLinkError(t('profilePicker.linkCodeRequired'));
      return;
    }
    setLinkBusy(true);
    setLinkError(null);
    try {
      const result = await linkDevice(linkCodeInput);
      const current = getStore();
      const existingIndex = current.profiles.findIndex((p) => p.id === result.profile.id);
      if (existingIndex >= 0) {
        current.profiles[existingIndex] = result.profile;
      } else if (current.profiles.length < MAX_PROFILES) {
        current.profiles.push(result.profile);
      } else {
        setLinkError(t('profilePicker.maxProfilesReached'));
        setLinkBusy(false);
        return;
      }
      current.activeProfileId = result.profile.id;
      writeStore(current);
      setSyncMeta(result.profile.id, { deviceToken: result.deviceToken });

      setActiveLanguage(result.profile.languagePref);
      setStore(getStore());
      setShowLinkForm(false);
      setLinkCodeInput('');
      onProfileSelected(result.profile);
    } catch {
      setLinkError(t('profilePicker.linkError'));
    } finally {
      setLinkBusy(false);
    }
  }

  return (
    <div className="profile-picker">
      <h1>{t('profilePicker.title')}</h1>

      {store.profiles.length > 0 && (
        <div className="profile-picker__existing">
          {store.profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className="profile-card"
              onClick={() => handleSelectExisting(profile)}
            >
              <span className="profile-card__avatar" aria-hidden="true">
                {avatarGlyph(profile.avatarId)}
              </span>
              <span className="profile-card__name">{profile.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="profile-picker__link">
        <button type="button" className="btn btn-secondary" onClick={() => setShowLinkForm((s) => !s)}>
          {t('profilePicker.linkDevice')}
        </button>
        {showLinkForm && (
          <div className="profile-picker__link-form">
            <label className="flabel" htmlFor="link-code-input">
              {t('profilePicker.linkCodeLabel')}
            </label>
            <input
              id="link-code-input"
              type="text"
              value={linkCodeInput}
              placeholder={t('profilePicker.linkCodePlaceholder')}
              onChange={(e) => setLinkCodeInput(e.target.value)}
            />
            {linkError && <p className="profile-picker__error">{linkError}</p>}
            <button type="button" className="btn btn-primary" onClick={handleLinkSubmit} disabled={linkBusy}>
              {linkBusy ? t('profilePicker.linking') : t('profilePicker.linkButton')}
            </button>
          </div>
        )}
      </div>

      {canCreateMore ? (
        <div className="profile-picker__create">
          <label className="flabel" htmlFor="profile-name-input">
            {t('profilePicker.namePlaceholder')}
          </label>
          <input
            id="profile-name-input"
            type="text"
            value={name}
            placeholder={t('profilePicker.namePlaceholder')}
            onChange={(e) => setName(e.target.value)}
          />

          <p className="flabel">{t('profilePicker.chooseAvatar')}</p>
          <div className="avatar-grid">
            {AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                className={avatar.id === avatarId ? 'avatar-choice avatar-choice--selected' : 'avatar-choice'}
                onClick={() => setAvatarId(avatar.id)}
                aria-pressed={avatar.id === avatarId}
                aria-label={avatar.id}
              >
                {avatar.glyph}
              </button>
            ))}
          </div>

          <p className="flabel">{t('profilePicker.languageLabel')}</p>
          <div className="language-choice">
            <button
              type="button"
              className={languagePref === 'en' ? 'lang-btn lang-btn--selected' : 'lang-btn'}
              onClick={() => setLanguagePref('en')}
            >
              {t('language.en')}
            </button>
            <button
              type="button"
              className={languagePref === 'bg' ? 'lang-btn lang-btn--selected' : 'lang-btn'}
              onClick={() => setLanguagePref('bg')}
            >
              {t('language.bg')}
            </button>
          </div>

          {error && <p className="profile-picker__error">{error}</p>}

          <button type="button" className="btn btn-primary" onClick={handleCreate}>
            {t('profilePicker.createProfile')}
          </button>
        </div>
      ) : (
        <p className="profile-picker__error">{t('profilePicker.maxProfilesReached')}</p>
      )}
    </div>
  );
}
