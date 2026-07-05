// Pure request-shaping + debounce tests. Never spins up a real backend —
// global.fetch is mocked throughout, per the project's testing conventions.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSync, linkDevice, requestNewCode, pushProfile, scheduleSyncPush } from './client';
import type { Profile } from '../storage/localStorage';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'p_test1',
    name: 'Test Kid',
    avatarId: 'fox',
    languagePref: 'en',
    createdAt: '2026-07-01T00:00:00.000Z',
    xp: 30,
    badges: ['first-steps'],
    progress: {},
    ...overrides,
  };
}

function mockFetchOnce(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('createSync', () => {
  it('POSTs the profile to /api/sync/create and returns the parsed result', async () => {
    mockFetchOnce(200, { linkCode: 'ABC123', deviceToken: 'tok', profileId: 'p_test1' });
    const profile = makeProfile();

    const result = await createSync(profile);

    expect(result).toEqual({ linkCode: 'ABC123', deviceToken: 'tok', profileId: 'p_test1' });
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/sync/create');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ profile });
  });

  it('throws with the server-provided error message on failure', async () => {
    mockFetchOnce(400, { error: 'profile with an id is required' });
    await expect(createSync(makeProfile())).rejects.toThrow('profile with an id is required');
  });
});

describe('linkDevice', () => {
  it('normalizes the code to uppercase/trimmed before sending', async () => {
    mockFetchOnce(200, { profile: makeProfile(), deviceToken: 'tok2', profileId: 'p_test1' });

    await linkDevice('  abc123  ');

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/sync/link');
    expect(JSON.parse(init.body)).toEqual({ linkCode: 'ABC123' });
  });

  it('surfaces a 404 as a rejected promise', async () => {
    mockFetchOnce(404, { error: 'Invalid or expired code' });
    await expect(linkDevice('ZZZZZZ')).rejects.toThrow('Invalid or expired code');
  });
});

describe('requestNewCode', () => {
  it('sends the device token as a header, not in the body', async () => {
    mockFetchOnce(200, { linkCode: 'NEWC0D' });
    await requestNewCode('my-token');

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/sync/code');
    expect(init.headers['x-device-token']).toBe('my-token');
  });
});

describe('pushProfile', () => {
  it('sends the device token header and profile body to /api/sync/push', async () => {
    mockFetchOnce(200, { ok: true });
    const profile = makeProfile({ xp: 80 });

    await pushProfile('device-token-abc', profile);

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/sync/push');
    expect(init.headers['x-device-token']).toBe('device-token-abc');
    expect(JSON.parse(init.body)).toEqual({ profile });
  });

  it('rejects on a non-ok response', async () => {
    mockFetchOnce(403, { error: 'invalid device token for this profile' });
    await expect(pushProfile('bad-token', makeProfile())).rejects.toThrow(
      'invalid device token for this profile',
    );
  });
});

describe('scheduleSyncPush', () => {
  it('debounces rapid calls for the same profile into a single push', async () => {
    mockFetchOnce(200, { ok: true });
    const profile = makeProfile();

    scheduleSyncPush('p_test1', 'tok', profile);
    scheduleSyncPush('p_test1', 'tok', { ...profile, xp: 40 });
    scheduleSyncPush('p_test1', 'tok', { ...profile, xp: 50 });

    await vi.advanceTimersByTimeAsync(3000);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(init.body).profile.xp).toBe(50);
  });

  it('never throws even when the push fails (offline/backend down)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    expect(() => scheduleSyncPush('p_test1', 'tok', makeProfile())).not.toThrow();
    await vi.advanceTimersByTimeAsync(3000);
    // No assertion beyond "did not throw/reject unhandled" — the whole
    // point is silent failure.
  });

  it('does not cross-debounce two different profiles', async () => {
    mockFetchOnce(200, { ok: true });

    scheduleSyncPush('profile-a', 'tok-a', makeProfile({ id: 'profile-a' }));
    scheduleSyncPush('profile-b', 'tok-b', makeProfile({ id: 'profile-b' }));

    await vi.advanceTimersByTimeAsync(3000);

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
