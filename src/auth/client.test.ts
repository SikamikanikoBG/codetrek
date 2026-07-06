// Mocks fetch directly rather than hitting a real server — this module's
// job is just building the right request and surfacing the right error, not
// re-testing the server (server/src/app.test.ts already covers that).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { register, login, logout, me, changePassword, deleteAccount, AuthApiError } from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('register/login', () => {
  it('register posts username/password and returns the account + token', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ account: { id: 'acct_1', username: 'alex' }, sessionToken: 'tok' }, 201),
    );
    const result = await register('alex', 'correct-horse');
    expect(result.account.username).toBe('alex');
    expect(result.sessionToken).toBe('tok');

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/auth/register');
    expect(JSON.parse(init!.body as string)).toEqual({ username: 'alex', password: 'correct-horse' });
  });

  it('login throws AuthApiError with the server message on 401', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: 'incorrect username or password' }, 401));
    await expect(login('alex', 'wrong')).rejects.toMatchObject({
      message: 'incorrect username or password',
      status: 401,
    });
  });

  it('falls back to a generic message when the error response is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('<html>oops</html>', { status: 500 }));
    await expect(login('alex', 'whatever1')).rejects.toBeInstanceOf(AuthApiError);
  });
});

describe('session-authenticated calls', () => {
  it('me() sends the session token header and returns the account', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ account: { id: 'acct_1', username: 'alex' } }));
    const account = await me('tok');
    expect(account.username).toBe('alex');

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init!.headers as Record<string, string>)['x-session-token']).toBe('tok');
  });

  it('me() throws a 401 AuthApiError on an invalid/expired session', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: 'sign in required' }, 401));
    await expect(me('bad-token')).rejects.toMatchObject({ status: 401 });
  });

  it('logout posts with the session token', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    await logout('tok');
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/auth/logout');
    expect((init!.headers as Record<string, string>)['x-session-token']).toBe('tok');
  });

  it('changePassword sends current and new password', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));
    await changePassword('tok', 'old-pass', 'new-pass');
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(init!.body as string)).toEqual({ currentPassword: 'old-pass', newPassword: 'new-pass' });
  });

  it('deleteAccount issues a DELETE with the session token', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteAccount('tok');
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/auth/account');
    expect(init!.method).toBe('DELETE');
  });

  it('deleteAccount throws on a failed request', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(deleteAccount('tok')).rejects.toBeInstanceOf(AuthApiError);
  });
});
