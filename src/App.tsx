import { useEffect, useState } from 'react';
import { ProfilePicker } from './app/ProfilePicker';
import { WorldMap } from './app/WorldMap';
import { LevelPlay } from './app/LevelPlay';
import { ProgressView } from './app/ProgressView';
import { getStore, getActiveProfile } from './gamification/store';
import { setActiveLanguage } from './app/i18n';
import type { Profile } from './storage/localStorage';
import type { Level } from './content/types';
import './App.css';

type Screen = 'profile' | 'map' | 'play' | 'progress';

function App() {
  const [screen, setScreen] = useState<Screen>('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [level, setLevel] = useState<Level | null>(null);

  // On boot, resume the previously active profile (if any) instead of
  // always forcing the picker — but language always follows THAT profile's
  // languagePref, never the browser.
  useEffect(() => {
    const store = getStore();
    const active = getActiveProfile(store);
    if (active) {
      setActiveLanguage(active.languagePref);
      setProfile(active);
      setScreen('map');
    }
  }, []);

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
    <WorldMap
      profile={profile}
      onSelectLevel={handleSelectLevel}
      onSwitchProfile={handleSwitchProfile}
      onShowProgress={handleShowProgress}
    />
  );
}

export default App;
