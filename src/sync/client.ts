// Thin fetch wrapper around the codetrek-api sync endpoints (server/src/
// app.ts). Always same-origin '/api/...' — a reverse proxy (nginx in
// production, Vite's dev server proxy locally, see vite.config.ts) routes
// this to the backend container, so this module never hardcodes a host.
//
// Every call here is best-effort: offline/backend-down failures must never
// break local gameplay. Callers that want fire-and-forget behavior should
// use scheduleSyncPush() rather than awaiting pushProfile() directly.

import type { Profile } from '../storage/localStorage';
import { createKeyedDebouncer } from './debounce';

const API_BASE = '/api/sync';
const PUSH_DEBOUNCE_MS = 2500;

export interface CreateSyncResult {
  linkCode: string;
  deviceToken: string;
  profileId: string;
}

export interface LinkDeviceResult {
  profile: Profile;
  deviceToken: string;
  profileId: string;
}

export interface NewCodeResult {
  linkCode: string;
}

class SyncApiError extends Error {}

async function postJson<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Sync request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // Response wasn't JSON — keep the generic message.
    }
    throw new SyncApiError(message);
  }
  return (await res.json()) as T;
}

/** "Enable sync" — uploads the current profile state and gets back a
 * link code (for other devices) and a device token (for this device). */
export function createSync(profile: Profile): Promise<CreateSyncResult> {
  return postJson<CreateSyncResult>('/create', { profile });
}

/** "Link this device" — redeems a link code for the server's copy of that
 * profile plus a brand new device token for this device. */
export function linkDevice(rawCode: string): Promise<LinkDeviceResult> {
  return postJson<LinkDeviceResult>('/link', { linkCode: rawCode.trim().toUpperCase() });
}

/** Mints a fresh link code for an already-linked profile (e.g. to add a
 * third device) — requires this device's token, not just the old code. */
export function requestNewCode(deviceToken: string): Promise<NewCodeResult> {
  return postJson<NewCodeResult>('/code', {}, { 'x-device-token': deviceToken });
}

/** Pushes the latest profile state up, authorized by this device's token.
 * Prefer scheduleSyncPush() from normal app code — this is the awaited,
 * throwing version for the "Enable sync" panel's own explicit actions. */
export function pushProfile(deviceToken: string, profile: Profile): Promise<void> {
  return postJson<{ ok: true }>('/push', { profile }, { 'x-device-token': deviceToken }).then(() => undefined);
}

const pushDebouncer = createKeyedDebouncer(PUSH_DEBOUNCE_MS);

/** Opportunistically pushes a linked profile's latest state a short debounce
 * after the last change (so a burst of level completions collapses into one
 * request). Never throws — failures (offline, backend down) are swallowed;
 * the next meaningful change naturally retries with fresher state. */
export function scheduleSyncPush(profileId: string, deviceToken: string, profile: Profile): void {
  pushDebouncer.schedule(profileId, () => {
    void pushProfile(deviceToken, profile).catch(() => {
      // Fail silently — see module doc comment.
    });
  });
}

export const _internal = { pushDebouncer, PUSH_DEBOUNCE_MS };
