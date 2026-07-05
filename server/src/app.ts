// Express app definition, kept separate from index.ts's listen() call so
// tests can exercise it directly (e.g. via supertest) without binding a port.

import express, { type Express } from 'express';
import { createProfileSync, linkByCode, pushProfile, requestNewCode, type SyncableProfile } from './store.js';

function isSyncableProfile(value: unknown): value is SyncableProfile {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { id?: unknown }).id === 'string' &&
    (value as { id: string }).id.length > 0
  );
}

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/sync/create', (req, res) => {
    const profile: unknown = req.body?.profile;
    if (!isSyncableProfile(profile)) {
      res.status(400).json({ error: 'profile with an id is required' });
      return;
    }
    const result = createProfileSync(profile);
    res.json(result);
  });

  app.post('/api/sync/link', (req, res) => {
    const linkCode: unknown = req.body?.linkCode;
    if (typeof linkCode !== 'string' || !linkCode.trim()) {
      res.status(400).json({ error: 'linkCode is required' });
      return;
    }
    const result = linkByCode(linkCode);
    if (!result) {
      res.status(404).json({ error: 'Invalid or expired code' });
      return;
    }
    res.json(result);
  });

  app.post('/api/sync/code', (req, res) => {
    const deviceToken = req.header('x-device-token');
    if (!deviceToken) {
      res.status(401).json({ error: 'device token required' });
      return;
    }
    const result = requestNewCode(deviceToken);
    if (!result) {
      res.status(401).json({ error: 'invalid device token' });
      return;
    }
    res.json(result);
  });

  app.post('/api/sync/push', (req, res) => {
    const deviceToken = req.header('x-device-token');
    const profile: unknown = req.body?.profile;
    if (!deviceToken) {
      res.status(401).json({ error: 'device token required' });
      return;
    }
    if (!isSyncableProfile(profile)) {
      res.status(400).json({ error: 'profile with an id is required' });
      return;
    }
    const ok = pushProfile(deviceToken, profile);
    if (!ok) {
      res.status(403).json({ error: 'invalid device token for this profile' });
      return;
    }
    res.json({ ok: true });
  });

  return app;
}
