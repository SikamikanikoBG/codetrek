// The single read/write adapter for CodeTrek's client-side state. Everything
// lives in one versioned localStorage key so future schema changes can
// migrate in one place instead of scattered call sites.

const STORAGE_KEY = 'codetrek:profiles:v1';

export interface ProfileProgressEntry {
  status: 'locked' | 'unlocked' | 'completed';
  stars: 0 | 1 | 2 | 3;
  bestAttempt?: { blocksUsed: number; timeSeconds: number };
  completedAt?: string;
}

export interface DailyChallengeState {
  lastPlayedDate: string;
  streak: number;
}

export interface Profile {
  id: string;
  name: string;
  avatarId: string;
  languagePref: 'en' | 'bg';
  createdAt: string;
  xp: number;
  badges: string[];
  progress: Record<string, ProfileProgressEntry>;
  dailyChallenge?: DailyChallengeState;
}

export interface ProfileStoreV1 {
  version: 1;
  activeProfileId: string | null;
  profiles: Profile[];
}

function emptyStore(): ProfileStoreV1 {
  return { version: 1, activeProfileId: null, profiles: [] };
}

let memoryFallback: ProfileStoreV1 | null = null;

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

export function readStore(): ProfileStoreV1 {
  if (!hasLocalStorage()) {
    return memoryFallback ?? emptyStore();
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyStore();
  try {
    const parsed = JSON.parse(raw) as ProfileStoreV1;
    if (parsed.version !== 1) {
      // No prior versions exist yet; a future migration step would go here.
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

export function writeStore(store: ProfileStoreV1): void {
  if (!hasLocalStorage()) {
    memoryFallback = store;
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export const STORAGE_KEY_NAME = STORAGE_KEY;
