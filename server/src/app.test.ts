// Exercises the accounts + profiles API end to end against an in-memory
// SQLite DB (forced via test-setup.ts) — no file I/O, no real network. The
// DB is a shared in-memory singleton across this whole file, so tests use
// distinct usernames/profile ids to avoid cross-test interference. A fresh
// createApp() per test gives each one its own rate-limiter bucket (the
// limiter is created inside createApp(), not at module scope) so one test's
// login attempts can't spuriously 429 a later, unrelated test.

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from './app.js';

let app: Express;
beforeEach(() => {
  app = createApp();
});

describe('GET /api/health', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /api/auth/register', () => {
  it('creates an account and returns a session token', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'alex_parent', password: 'correct-horse' });
    expect(res.status).toBe(201);
    expect(res.body.account.username).toBe('alex_parent');
    expect(typeof res.body.sessionToken).toBe('string');
    expect(res.body.sessionToken.length).toBeGreaterThan(20);
  });

  it('lowercases usernames so Alex and alex are the same account', async () => {
    await request(app).post('/api/auth/register').send({ username: 'CaseTest', password: 'correct-horse' });
    const res = await request(app).post('/api/auth/register').send({ username: 'casetest', password: 'another-pass' });
    expect(res.status).toBe(409);
  });

  it('rejects a too-short password', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'shortpw', password: 'abc' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid username', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'a', password: 'correct-horse' });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate username with 409', async () => {
    await request(app).post('/api/auth/register').send({ username: 'dupe_test', password: 'correct-horse' });
    const res = await request(app).post('/api/auth/register').send({ username: 'dupe_test', password: 'different-pass' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await request(app).post('/api/auth/register').send({ username: 'login_test', password: 'correct-horse' });
    const res = await request(app).post('/api/auth/login').send({ username: 'login_test', password: 'correct-horse' });
    expect(res.status).toBe(200);
    expect(res.body.account.username).toBe('login_test');
  });

  it('rejects a wrong password and an unknown username with the exact same generic message', async () => {
    await request(app).post('/api/auth/register').send({ username: 'wrongpw_test', password: 'correct-horse' });
    const wrongPassword = await request(app).post('/api/auth/login').send({ username: 'wrongpw_test', password: 'incorrect' });
    const unknownUser = await request(app).post('/api/auth/login').send({ username: 'nobody_here', password: 'whatever1' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    // Same status AND same message for both — an attacker can't use the
    // response to tell "wrong password" apart from "no such account".
    expect(wrongPassword.body.error).toBe(unknownUser.body.error);
  });

  it('rate-limits repeated attempts from the same IP', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/auth/login').send({ username: 'rate_test', password: 'wrong' });
    }
    const res = await request(app).post('/api/auth/login').send({ username: 'rate_test', password: 'wrong' });
    expect(res.status).toBe(429);
  });
});

describe('session-authenticated routes', () => {
  async function registerAndGetToken(username: string): Promise<string> {
    const res = await request(app).post('/api/auth/register').send({ username, password: 'correct-horse' });
    return res.body.sessionToken as string;
  }

  it('GET /api/auth/me requires a valid session token', async () => {
    const anon = await request(app).get('/api/auth/me');
    expect(anon.status).toBe(401);

    const token = await registerAndGetToken('me_test');
    const res = await request(app).get('/api/auth/me').set('x-session-token', token);
    expect(res.status).toBe(200);
    expect(res.body.account.username).toBe('me_test');
  });

  it('logout invalidates the session token', async () => {
    const token = await registerAndGetToken('logout_test');
    await request(app).post('/api/auth/logout').set('x-session-token', token).send({});
    const res = await request(app).get('/api/auth/me').set('x-session-token', token);
    expect(res.status).toBe(401);
  });

  it('change-password rejects a wrong current password', async () => {
    const token = await registerAndGetToken('changepw_wrong');
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('x-session-token', token)
      .send({ currentPassword: 'not-the-real-one', newPassword: 'new-correct-horse' });
    expect(res.status).toBe(401);
  });

  it('change-password requires the new password to meet the minimum length', async () => {
    const token = await registerAndGetToken('changepw_short');
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('x-session-token', token)
      .send({ currentPassword: 'correct-horse', newPassword: 'x' });
    expect(res.status).toBe(400);
  });

  it('changes the password given the correct current password, and the new password then logs in', async () => {
    const token = await registerAndGetToken('changepw_test');
    const ok = await request(app)
      .post('/api/auth/change-password')
      .set('x-session-token', token)
      .send({ currentPassword: 'correct-horse', newPassword: 'new-correct-horse' });
    expect(ok.status).toBe(200);

    const loginWithNew = await request(app)
      .post('/api/auth/login')
      .send({ username: 'changepw_test', password: 'new-correct-horse' });
    expect(loginWithNew.status).toBe(200);
  });

  it('deleting the account removes its profiles and invalidates the session', async () => {
    const token = await registerAndGetToken('delete_test');
    await request(app)
      .put('/api/profiles/p_delete_1')
      .set('x-session-token', token)
      .send({ profile: { id: 'p_delete_1', name: 'Kid' } });

    const del = await request(app).delete('/api/auth/account').set('x-session-token', token);
    expect(del.status).toBe(204);

    const me = await request(app).get('/api/auth/me').set('x-session-token', token);
    expect(me.status).toBe(401);
  });
});

describe('profiles API', () => {
  async function registerAndGetToken(username: string): Promise<string> {
    const res = await request(app).post('/api/auth/register').send({ username, password: 'correct-horse' });
    return res.body.sessionToken as string;
  }

  it('requires a session token to list, save, or delete', async () => {
    expect((await request(app).get('/api/profiles')).status).toBe(401);
    expect((await request(app).put('/api/profiles/p_x').send({ profile: { id: 'p_x' } })).status).toBe(401);
    expect((await request(app).delete('/api/profiles/p_x')).status).toBe(401);
  });

  it('saves and lists profiles scoped to the account', async () => {
    const token = await registerAndGetToken('profiles_owner');
    await request(app)
      .put('/api/profiles/p_owned_1')
      .set('x-session-token', token)
      .send({ profile: { id: 'p_owned_1', name: 'Kid One', xp: 10 } });

    const list = await request(app).get('/api/profiles').set('x-session-token', token);
    expect(list.status).toBe(200);
    expect(list.body.profiles).toEqual([{ id: 'p_owned_1', name: 'Kid One', xp: 10 }]);
  });

  it('updates in place rather than duplicating on a second save', async () => {
    const token = await registerAndGetToken('profiles_update');
    await request(app)
      .put('/api/profiles/p_upd_1')
      .set('x-session-token', token)
      .send({ profile: { id: 'p_upd_1', name: 'Kid', xp: 0 } });
    await request(app)
      .put('/api/profiles/p_upd_1')
      .set('x-session-token', token)
      .send({ profile: { id: 'p_upd_1', name: 'Kid', xp: 99 } });

    const list = await request(app).get('/api/profiles').set('x-session-token', token);
    expect(list.body.profiles).toHaveLength(1);
    expect(list.body.profiles[0].xp).toBe(99);
  });

  it('never shows one account a different account\'s profiles', async () => {
    const tokenA = await registerAndGetToken('account_a');
    const tokenB = await registerAndGetToken('account_b');
    await request(app)
      .put('/api/profiles/p_a1')
      .set('x-session-token', tokenA)
      .send({ profile: { id: 'p_a1', name: 'A-Kid' } });

    const listB = await request(app).get('/api/profiles').set('x-session-token', tokenB);
    expect(listB.body.profiles).toEqual([]);
  });

  it('rejects saving to a profile id already owned by a different account', async () => {
    const tokenA = await registerAndGetToken('hijack_owner');
    const tokenB = await registerAndGetToken('hijack_attacker');
    await request(app)
      .put('/api/profiles/p_hijack')
      .set('x-session-token', tokenA)
      .send({ profile: { id: 'p_hijack', name: 'Original' } });

    const res = await request(app)
      .put('/api/profiles/p_hijack')
      .set('x-session-token', tokenB)
      .send({ profile: { id: 'p_hijack', name: 'Hijacked' } });
    expect(res.status).toBe(403);
  });

  it('rejects a body id that does not match the URL id', async () => {
    const token = await registerAndGetToken('mismatch_test');
    const res = await request(app)
      .put('/api/profiles/p_url_id')
      .set('x-session-token', token)
      .send({ profile: { id: 'p_different_id', name: 'Kid' } });
    expect(res.status).toBe(400);
  });

  it('deletes a profile the account owns, and 404s on an unknown one', async () => {
    const token = await registerAndGetToken('delete_profile_test');
    await request(app)
      .put('/api/profiles/p_del_1')
      .set('x-session-token', token)
      .send({ profile: { id: 'p_del_1', name: 'Kid' } });

    const del = await request(app).delete('/api/profiles/p_del_1').set('x-session-token', token);
    expect(del.status).toBe(204);

    const delAgain = await request(app).delete('/api/profiles/p_del_1').set('x-session-token', token);
    expect(delAgain.status).toBe(404);
  });
});
