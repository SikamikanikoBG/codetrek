// Account-scoped profile storage on the server (server/src/app.ts's
// /api/profiles routes). Every call takes the session token explicitly
// (rather than reaching into storage/session.ts itself) so callers decide
// whether a push/pull should happen at all — this module stays a pure API
// client, not a place where sync policy lives.

import type { Profile } from '../storage/localStorage';
import { createKeyedDebouncer } from '../sync/debounce';

const API_BASE = '/api/profiles';
const PUSH_DEBOUNCE_MS = 2500;

class ProfilesApiError extends Error {}

async function request<T>(path: string, sessionToken: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken, ...init?.headers },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // Response wasn't JSON — keep the generic message.
    }
    throw new ProfilesApiError(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function listProfiles(sessionToken: string): Promise<Profile[]> {
  const data = await request<{ profiles: Profile[] }>('', sessionToken);
  return data.profiles;
}

export function saveProfile(sessionToken: string, profile: Profile): Promise<void> {
  return request<void>(`/${profile.id}`, sessionToken, { method: 'PUT', body: JSON.stringify({ profile }) });
}

export function deleteProfile(sessionToken: string, profileId: string): Promise<void> {
  return request<void>(`/${profileId}`, sessionToken, { method: 'DELETE' });
}

const pushDebouncer = createKeyedDebouncer(PUSH_DEBOUNCE_MS);

/** Opportunistically pushes a profile's latest state a short debounce after
 * the last change (so a burst of level completions collapses into one
 * request). Never throws — failures (offline, backend down) are swallowed;
 * the next meaningful change naturally retries with fresher state. */
export function scheduleProfilePush(sessionToken: string, profile: Profile): void {
  pushDebouncer.schedule(profile.id, () => {
    void saveProfile(sessionToken, profile).catch(() => {
      // Fail silently — see module doc comment.
    });
  });
}

export const _internal = { pushDebouncer, PUSH_DEBOUNCE_MS };
