// Per-device sync metadata — deliberately a SEPARATE localStorage key from
// ProfileStoreV1 (codetrek:profiles:v1) rather than a new field bolted onto
// Profile. This is live production data on real devices already; keeping
// the sync bookkeeping (device token, last-shown link code) out of the
// existing profile shape means enabling/disabling sync can never corrupt or
// even touch a profile's actual XP/badges/progress.

const STORAGE_KEY = 'codetrek:sync:v1';

export interface SyncMetaEntry {
  /** This device's opaque token — authorizes pushes for this profile id. */
  deviceToken: string;
  /** Last link code shown for this profile, so the UI can redisplay it
   * without minting a needless new one on every render. */
  lastLinkCode?: string;
}

interface SyncMetaStoreV1 {
  version: 1;
  byProfileId: Record<string, SyncMetaEntry>;
}

function emptyStore(): SyncMetaStoreV1 {
  return { version: 1, byProfileId: {} };
}

let memoryFallback: SyncMetaStoreV1 | null = null;

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function readAll(): SyncMetaStoreV1 {
  if (!hasLocalStorage()) {
    return memoryFallback ?? emptyStore();
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyStore();
  try {
    const parsed = JSON.parse(raw) as SyncMetaStoreV1;
    if (parsed.version !== 1) return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

function writeAll(store: SyncMetaStoreV1): void {
  if (!hasLocalStorage()) {
    memoryFallback = store;
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Null means "never enabled sync on this device" — the normal case for
 * most profiles/families, per PRODUCT.md keeping this optional/unobtrusive. */
export function getSyncMeta(profileId: string): SyncMetaEntry | null {
  return readAll().byProfileId[profileId] ?? null;
}

export function setSyncMeta(profileId: string, entry: SyncMetaEntry): void {
  const store = readAll();
  store.byProfileId[profileId] = entry;
  writeAll(store);
}

export function clearSyncMeta(profileId: string): void {
  const store = readAll();
  delete store.byProfileId[profileId];
  writeAll(store);
}

export const SYNC_STORAGE_KEY_NAME = STORAGE_KEY;
