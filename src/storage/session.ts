// The signed-in account's session — a SEPARATE localStorage key from
// ProfileStoreV1 (codetrek:profiles:v1), same reasoning as the sync-era
// syncMeta.ts it replaces: keeping auth bookkeeping out of the profile
// shape means signing in/out can never touch a profile's actual XP/badges/
// progress. Household-level (one session, not one per kid profile) since
// accounts are a household concept, not a per-kid one.

const STORAGE_KEY = 'codetrek:session:v1';

export interface Session {
  token: string;
  username: string;
}

let memoryFallback: Session | null = null;

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

export function getSession(): Session | null {
  if (!hasLocalStorage()) return memoryFallback;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  if (!hasLocalStorage()) {
    memoryFallback = session;
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  memoryFallback = null;
  if (!hasLocalStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export const SESSION_STORAGE_KEY_NAME = STORAGE_KEY;
