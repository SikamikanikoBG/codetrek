// Exercises the sync API end to end against an in-memory SQLite DB (forced
// via test-setup.ts) — no file I/O, no real network. All tests in this file
// share ONE in-memory DB (module-level singleton in db.ts), so each test
// uses its own distinct profile id to avoid cross-test interference.

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

const app = createApp();

describe('GET /api/health', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('sync API', () => {
  it('create returns a link code and device token', async () => {
    const res = await request(app)
      .post('/api/sync/create')
      .send({ profile: { id: 'p_1', name: 'Kid', xp: 10 } });

    expect(res.status).toBe(200);
    expect(res.body.linkCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(typeof res.body.deviceToken).toBe('string');
    expect(res.body.deviceToken.length).toBeGreaterThan(20);
    expect(res.body.profileId).toBe('p_1');
  });

  it('create rejects a profile without an id', async () => {
    const res = await request(app).post('/api/sync/create').send({ profile: { name: 'No id' } });
    expect(res.status).toBe(400);
  });

  it('link with a valid code returns the stored profile state and a NEW device token', async () => {
    const created = await request(app)
      .post('/api/sync/create')
      .send({ profile: { id: 'p_2', name: 'Kid Two', xp: 42, badges: ['first-steps'] } });

    const linkRes = await request(app).post('/api/sync/link').send({ linkCode: created.body.linkCode });

    expect(linkRes.status).toBe(200);
    expect(linkRes.body.profile).toEqual({ id: 'p_2', name: 'Kid Two', xp: 42, badges: ['first-steps'] });
    expect(linkRes.body.deviceToken).not.toBe(created.body.deviceToken);
    expect(linkRes.body.profileId).toBe('p_2');
  });

  it('link is case-insensitive and trims whitespace', async () => {
    const created = await request(app)
      .post('/api/sync/create')
      .send({ profile: { id: 'p_3', name: 'Kid Three' } });

    const linkRes = await request(app)
      .post('/api/sync/link')
      .send({ linkCode: `  ${created.body.linkCode.toLowerCase()}  ` });

    expect(linkRes.status).toBe(200);
    expect(linkRes.body.profileId).toBe('p_3');
  });

  it('rejects an invalid link code', async () => {
    const res = await request(app).post('/api/sync/link').send({ linkCode: 'ZZZZZZ' });
    expect(res.status).toBe(404);
  });

  it('a link code is single-use — a second redemption is rejected', async () => {
    const created = await request(app)
      .post('/api/sync/create')
      .send({ profile: { id: 'p_4', name: 'Kid Four' } });

    const first = await request(app).post('/api/sync/link').send({ linkCode: created.body.linkCode });
    expect(first.status).toBe(200);

    const second = await request(app).post('/api/sync/link').send({ linkCode: created.body.linkCode });
    expect(second.status).toBe(404);
  });

  it('push with a valid device token updates the stored state', async () => {
    const created = await request(app)
      .post('/api/sync/create')
      .send({ profile: { id: 'p_5', name: 'Kid Five', xp: 0 } });

    const pushRes = await request(app)
      .post('/api/sync/push')
      .set('x-device-token', created.body.deviceToken)
      .send({ profile: { id: 'p_5', name: 'Kid Five', xp: 50 } });

    expect(pushRes.status).toBe(200);
    expect(pushRes.body.ok).toBe(true);

    // A second device links in and should see the pushed state, not the
    // original create-time state.
    const newCode = await request(app)
      .post('/api/sync/code')
      .set('x-device-token', created.body.deviceToken)
      .send({});
    const linkRes = await request(app).post('/api/sync/link').send({ linkCode: newCode.body.linkCode });
    expect(linkRes.body.profile.xp).toBe(50);
  });

  it('push requires a device token', async () => {
    const res = await request(app)
      .post('/api/sync/push')
      .send({ profile: { id: 'p_6', name: 'Kid Six' } });
    expect(res.status).toBe(401);
  });

  it('push rejects an unknown/invalid device token', async () => {
    const res = await request(app)
      .post('/api/sync/push')
      .set('x-device-token', 'not-a-real-token')
      .send({ profile: { id: 'p_7', name: 'Kid Seven' } });
    expect(res.status).toBe(403);
  });

  it("push rejects a token that doesn't belong to the profile id it's trying to update", async () => {
    const created = await request(app)
      .post('/api/sync/create')
      .send({ profile: { id: 'p_8', name: 'Kid Eight' } });

    const res = await request(app)
      .post('/api/sync/push')
      .set('x-device-token', created.body.deviceToken)
      .send({ profile: { id: 'someone-elses-profile', name: 'Hijack' } });

    expect(res.status).toBe(403);
  });

  it('requesting a new code without a device token is rejected', async () => {
    const res = await request(app).post('/api/sync/code').send({});
    expect(res.status).toBe(401);
  });
});
