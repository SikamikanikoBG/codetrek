import { useEffect, useState } from 'react';
import { ProfilePicker } from './app/ProfilePicker';
import { WorldMap } from './app/WorldMap';
import { LevelPlay } from './app/LevelPlay';
import { ProgressView } from './app/ProgressView';
import { AuthScreen } from './app/AuthScreen';
import { AccountPanel } from './app/AccountPanel';
import { getStore, getActiveProfile } from './gamification/store';
import { readStore, writeStore } from './storage/localStorage';
import { getSession, setSession, clearSession, type Session } from './storage/session';
import { me, logout, AuthApiError, type AuthResult } from './auth/client';
import { listProfiles, saveProfile } from './auth/profilesApi';
import { setActiveLanguage } from './app/i18n';
import type { Profile } from './storage/localStorage';
import type { Level } from './content/types';
import './App.css';

type Screen = 'profile' | 'map' | 'play' | 'progress';
type AuthStatus = 'checking' | 'signed-out' | 'signed-in';

/** Pulls the account's server-side profiles down (new device, existing
 * account) and pushes any local-only profiles up (a device that already had
 * profiles before this login — including anyone upgrading from a pre-1.0.0
 * install that never had accounts at all). Id-based and additive only:
 * never overwrites a profile that exists on both sides. */
async function mergeServerProfiles(serverProfiles: Profile[], sessionToken: string): Promise<void> {
  const local = readStore();
  const serverIds = new Set(serverProfiles.map((p) => p.id));
  let changed = false;

  for (const serverProfile of serverProfiles) {
    if (!local.profiles.some((p) => p.id === serverProfile.id)) {
      local.profiles.push(serverProfile);
      changed = true;
    }
  }
  if (changed) writeStore(local);

  for (const localProfile of local.profiles) {
    if (!serverIds.has(localProfile.id)) {
      await saveProfile(sessionToken, localProfile).catch(() => {
        // Offline or backend hiccup — the normal debounced push (sync/
        // hooks.ts) will retry on the next profile mutation regardless.
      });
    }
  }
}

function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [session, setSessionState] = useState<Session | null>(null);
  const [showAccountPanel, setShowAccountPanel] = useState(false);

  const [screen, setScreen] = useState<Screen>('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [level, setLevel] = useState<Level | null>(null);

  function resumeActiveProfile() {
    const store = getStore();
    const active = getActiveProfile(store);
    if (active) {
      setActiveLanguage(active.languagePref);
      setProfile(active);
      setScreen('map');
    }
  }

  useEffect(() => {
    const stored = getSession();
    if (!stored) {
      setAuthStatus('signed-out');
      return;
    }

    me(stored.token)
      .then(async (account) => {
        setSessionState({ token: stored.token, username: account.username });
        setAuthStatus('signed-in');
        try {
          const serverProfiles = await listProfiles(stored.token);
          await mergeServerProfiles(serverProfiles, stored.token);
        } catch {
          // Reachable enough to validate the session but the profile pull
          // itself failed — fall back to whatever's cached locally rather
          // than blocking the app.
        }
        resumeActiveProfile();
      })
      .catch((err) => {
        if (err instanceof AuthApiError && err.status === 401) {
          // Session actively rejected (expired/logged out elsewhere/account
          // deleted) — back to the sign-in gate.
          clearSession();
          setAuthStatus('signed-out');
          return;
        }
        // Network failure (offline, backend briefly down): trust the
        // cached session and cached local profiles rather than locking a
        // family out of their own kid's saved progress over a WiFi hiccup.
        setSessionState(stored);
        setAuthStatus('signed-in');
        resumeActiveProfile();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAuthenticated(result: AuthResult) {
    setSession({ token: result.sessionToken, username: result.account.username });
    setSessionState({ token: result.sessionToken, username: result.account.username });
    try {
      const serverProfiles = await listProfiles(result.sessionToken);
      await mergeServerProfiles(serverProfiles, result.sessionToken);
    } catch {
      // Just-created/just-logged-in session with no reachable profile list
      // yet — proceed with whatever's local (usually nothing, for a brand
      // new account).
    }
    setAuthStatus('signed-in');
    resumeActiveProfile();
  }

  function resetToSignedOut() {
    clearSession();
    setSessionState(null);
    setAuthStatus('signed-out');
    setProfile(null);
    setLevel(null);
    setScreen('profile');
    setShowAccountPanel(false);
  }

  function handleLogout() {
    if (session) void logout(session.token).catch(() => undefined);
    resetToSignedOut();
  }

  function handleAccountDeleted() {
    writeStore({ version: 1, activeProfileId: null, profiles: [] });
    resetToSignedOut();
  }

  function handleProfileSelected(selected: Profile) {
    setProfile(selected);
    setScreen('map');
  }

  function handleSelectLevel(selectedLevel: Level) {
    setLevel(selectedLevel);
    setScreen('play');
  }

  function refreshProfile(current: Profile | null): Profile | null {
    if (!current) return null;
    const store = getStore();
    return store.profiles.find((p) => p.id === current.id) ?? current;
  }

  function handleBackToMap() {
    setProfile((current) => refreshProfile(current));
    setScreen('map');
  }

  function handleNextLevel(nextLevel: Level | null) {
    setProfile((current) => refreshProfile(current));
    if (nextLevel) {
      setLevel(nextLevel);
      setScreen('play');
    } else {
      setScreen('map');
    }
  }

  function handleSwitchProfile() {
    setProfile(null);
    setLevel(null);
    setScreen('profile');
  }

  function handleShowProgress() {
    setProfile((current) => refreshProfile(current));
    setScreen('progress');
  }

  if (authStatus === 'checking') {
    return null;
  }

  if (authStatus === 'signed-out') {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  if (screen === 'profile' || !profile) {
    return <ProfilePicker onProfileSelected={handleProfileSelected} />;
  }

  if (screen === 'play' && level) {
    return (
      <LevelPlay level={level} profile={profile} onBackToMap={handleBackToMap} onNextLevel={handleNextLevel} />
    );
  }

  if (screen === 'progress') {
    return <ProgressView profile={profile} onBack={handleBackToMap} />;
  }

  return (
    <>
      <WorldMap
        profile={profile}
        onSelectLevel={handleSelectLevel}
        onSwitchProfile={handleSwitchProfile}
        onShowProgress={handleShowProgress}
        onOpenAccount={() => setShowAccountPanel(true)}
      />
      {showAccountPanel && session && (
        <AccountPanel
          username={session.username}
          sessionToken={session.token}
          onClose={() => setShowAccountPanel(false)}
          onLogout={handleLogout}
          onAccountDeleted={handleAccountDeleted}
        />
      )}
    </>
  );
}

export default App;
