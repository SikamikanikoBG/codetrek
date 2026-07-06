import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listProfiles, saveProfile, deleteProfile, scheduleProfilePush } from './profilesApi';
import type { Profile } from '../storage/localStorage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function fakeProfile(id: string): Profile {
  return {
    id,
    name: 'Kid',
    avatarId: 'fox',
    languagePref: 'en',
    createdAt: '2026-01-01T00:00:00.000Z',
    xp: 0,
    badges: [],
    progress: {},
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('listProfiles/saveProfile/deleteProfile', () => {
  it('listProfiles sends the session token and returns the profiles array', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ profiles: [fakeProfile('p_1')] }));
    const profiles = await listProfiles('tok');
    expect(profiles).toHaveLength(1);
    expect(profiles[0].id).toBe('p_1');

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/profiles');
    expect((init!.headers as Record<string, string>)['x-session-token']).toBe('tok');
  });

  it('saveProfile PUTs to /api/profiles/:id with the profile body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));
    await saveProfile('tok', fakeProfile('p_2'));
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/profiles/p_2');
    expect(init!.method).toBe('PUT');
    expect(JSON.parse(init!.body as string).profile.id).toBe('p_2');
  });

  it('deleteProfile issues a DELETE to /api/profiles/:id', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteProfile('tok', 'p_3');
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/profiles/p_3');
    expect(init!.method).toBe('DELETE');
  });

  it('saveProfile throws with the server error message on failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: 'this profile belongs to a different account' }, 403));
    await expect(saveProfile('tok', fakeProfile('p_4'))).rejects.toThrow('this profile belongs to a different account');
  });
});

describe('scheduleProfilePush', () => {
  it('debounces repeated pushes for the same profile into a single request', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }));

    scheduleProfilePush('tok', fakeProfile('p_5'));
    await vi.advanceTimersByTimeAsync(1000);
    scheduleProfilePush('tok', { ...fakeProfile('p_5'), xp: 50 });
    await vi.advanceTimersByTimeAsync(3000);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(init!.body as string).profile.xp).toBe(50);
  });

  it('never throws even when the push fails (offline/backend down)', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    expect(() => scheduleProfilePush('tok', fakeProfile('p_6'))).not.toThrow();
    await vi.advanceTimersByTimeAsync(3000);
  });
});
