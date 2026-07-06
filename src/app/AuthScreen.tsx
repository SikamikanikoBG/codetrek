// The household account gate — the very first screen anyone sees, before
// any kid profile exists. One account per household (not per kid): sign in
// once on a device, then the existing profile picker/world map/level-play
// flow is unchanged. Mirrors ProfilePicker's own EN/BG toggle pattern since
// no profile (and therefore no languagePref) exists yet at this point.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { register, login, AuthApiError, type AuthResult } from '../auth/client';
import { setActiveLanguage, type SupportedLanguage } from './i18n';

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,24}$/;

interface AuthScreenProps {
  onAuthenticated: (result: AuthResult) => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const { t, i18n } = useTranslation('auth');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleLanguageChange(lang: SupportedLanguage) {
    setActiveLanguage(lang);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (!USERNAME_RE.test(username)) {
        setError(t('errors.usernameInvalid'));
        return;
      }
      if (password.length < 8) {
        setError(t('errors.passwordTooShort'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('errors.passwordMismatch'));
        return;
      }
    }

    setBusy(true);
    try {
      const result = mode === 'register' ? await register(username, password) : await login(username, password);
      onAuthenticated(result);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profile-picker auth-screen">
      <div className="language-choice auth-screen__lang">
        <button
          type="button"
          className={i18n.language === 'en' ? 'lang-btn lang-btn--selected' : 'lang-btn'}
          onClick={() => handleLanguageChange('en')}
        >
          {t('common:language.en')}
        </button>
        <button
          type="button"
          className={i18n.language === 'bg' ? 'lang-btn lang-btn--selected' : 'lang-btn'}
          onClick={() => handleLanguageChange('bg')}
        >
          {t('common:language.bg')}
        </button>
      </div>

      <h1>{t('gate.title')}</h1>
      <p className="auth-screen__subtitle">{t('gate.subtitle')}</p>

      <form className="auth-screen__form" onSubmit={handleSubmit}>
        <label className="flabel" htmlFor="auth-username">
          {t('usernameLabel')}
        </label>
        <input
          id="auth-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {mode === 'register' && <p className="auth-screen__hint">{t('usernameHint')}</p>}

        <label className="flabel" htmlFor="auth-password">
          {t('passwordLabel')}
        </label>
        <input
          id="auth-password"
          type="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === 'register' && <p className="auth-screen__hint">{t('passwordHint')}</p>}

        {mode === 'register' && (
          <>
            <label className="flabel" htmlFor="auth-confirm-password">
              {t('confirmPasswordLabel')}
            </label>
            <input
              id="auth-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </>
        )}

        {error && <p className="profile-picker__error">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? t(`${mode}.submitting`) : t(`${mode}.submit`)}
        </button>
      </form>

      <p className="auth-screen__switch">
        {t(`${mode}.switchPrompt`)}{' '}
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
        >
          {t(`${mode}.switchLink`)}
        </button>
      </p>
    </div>
  );
}
