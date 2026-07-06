// Express app definition, kept separate from index.ts's listen() call so
// tests can exercise it directly (e.g. via supertest) without binding a port.

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { isValidUsername, isValidPassword } from './auth.js';
import { createRateLimiter } from './rateLimiter.js';
import {
  registerAccount,
  loginAccount,
  getAccountBySession,
  deleteSession,
  changePassword,
  deleteAccount,
  listProfilesForAccount,
  saveProfileForAccount,
  deleteProfileForAccount,
  type Account,
  type StoredProfile,
} from './store.js';

function isStoredProfile(value: unknown): value is StoredProfile {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { id?: unknown }).id === 'string' &&
    (value as { id: string }).id.length > 0
  );
}

interface AuthedRequest extends Request {
  account?: Account;
}

export function createApp(): Express {
  const app = express();
  // 10 attempts per 5 minutes per IP — generous for a household mistyping a
  // password, tight enough to make brute-forcing impractical against a
  // single in-process instance. Created per-app (not module-level) so tests
  // that spin up a fresh createApp() get an independent rate-limit bucket.
  const authRateLimit = createRateLimiter(10, 5 * 60 * 1000);
  app.set('trust proxy', true);
  app.use(express.json({ limit: '256kb' }));

  // Minimal, dependency-free security headers — this API is only ever
  // reached same-origin through the frontend's nginx proxy, so a full CSP/
  // CORS policy isn't load-bearing here, but these cost nothing to set.
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
    const token = req.header('x-session-token');
    const account = token ? getAccountBySession(token) : null;
    if (!account) {
      res.status(401).json({ error: 'sign in required' });
      return;
    }
    req.account = account;
    next();
  }

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/auth/register', async (req, res) => {
    if (!authRateLimit(req.ip ?? 'unknown')) {
      res.status(429).json({ error: 'too many attempts — try again in a few minutes' });
      return;
    }
    const { username, password } = req.body ?? {};
    if (!isValidUsername(username)) {
      res.status(400).json({ error: 'username must be 3-24 characters (letters, numbers, _ or -)' });
      return;
    }
    if (!isValidPassword(password)) {
      res.status(400).json({ error: 'password must be at least 8 characters' });
      return;
    }
    const result = await registerAccount(username, password);
    if (result === 'username-taken') {
      res.status(409).json({ error: 'that username is already taken' });
      return;
    }
    res.status(201).json(result);
  });

  app.post('/api/auth/login', async (req, res) => {
    if (!authRateLimit(req.ip ?? 'unknown')) {
      res.status(429).json({ error: 'too many attempts — try again in a few minutes' });
      return;
    }
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'username and password are required' });
      return;
    }
    const result = await loginAccount(username, password);
    if (!result) {
      res.status(401).json({ error: 'incorrect username or password' });
      return;
    }
    res.json(result);
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = req.header('x-session-token');
    if (token) deleteSession(token);
    res.status(204).end();
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ account: req.account });
  });

  app.post('/api/auth/change-password', requireAuth, async (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== 'string') {
      res.status(400).json({ error: 'current password is required' });
      return;
    }
    if (!isValidPassword(newPassword)) {
      res.status(400).json({ error: 'new password must be at least 8 characters' });
      return;
    }
    const ok = await changePassword(req.account!.id, currentPassword, newPassword);
    if (!ok) {
      res.status(401).json({ error: 'current password is incorrect' });
      return;
    }
    res.json({ ok: true });
  });

  app.delete('/api/auth/account', requireAuth, (req: AuthedRequest, res) => {
    deleteAccount(req.account!.id);
    res.status(204).end();
  });

  app.get('/api/profiles', requireAuth, (req: AuthedRequest, res) => {
    res.json({ profiles: listProfilesForAccount(req.account!.id) });
  });

  app.put('/api/profiles/:id', requireAuth, (req: AuthedRequest, res) => {
    const profile: unknown = req.body?.profile;
    if (!isStoredProfile(profile) || profile.id !== req.params.id) {
      res.status(400).json({ error: 'profile with a matching id is required' });
      return;
    }
    const ok = saveProfileForAccount(req.account!.id, profile);
    if (!ok) {
      res.status(403).json({ error: 'this profile belongs to a different account' });
      return;
    }
    res.json({ ok: true });
  });

  app.delete('/api/profiles/:id', requireAuth, (req: AuthedRequest, res) => {
    const ok = deleteProfileForAccount(req.account!.id, req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'profile not found' });
      return;
    }
    res.status(204).end();
  });

  return app;
}
