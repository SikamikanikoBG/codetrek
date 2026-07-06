// Data access layer over SQLite. Two concerns: accounts (register/login/
// sessions) and profiles (an opaque JSON blob per kid profile, scoped to the
// account that owns it — this backend never interprets the CodeTrek profile
// shape itself, see src/storage/localStorage.ts on the client for that).

import crypto from 'node:crypto';
import { db } from './db.js';
import { hashPassword, verifyPassword, generateSessionToken } from './auth.js';

const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days — a household device stays signed in

export interface Account {
  id: string;
  username: string;
}

export interface StoredProfile {
  id: string;
  [key: string]: unknown;
}

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function createSession(accountId: string): string {
  const token = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
  db.prepare('INSERT INTO sessions (token, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    token,
    accountId,
    now.toISOString(),
    expiresAt,
  );
  return token;
}

export type RegisterResult = { account: Account; sessionToken: string } | 'username-taken';

export async function registerAccount(username: string, password: string): Promise<RegisterResult> {
  const normalized = username.toLowerCase();
  const existing = db.prepare('SELECT id FROM accounts WHERE username = ?').get(normalized);
  if (existing) return 'username-taken';

  const { salt, hash } = await hashPassword(password);
  const id = generateId('acct');
  db.prepare(
    'INSERT INTO accounts (id, username, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, normalized, salt, hash, nowIso());

  return { account: { id, username: normalized }, sessionToken: createSession(id) };
}

export async function loginAccount(username: string, password: string): Promise<{ account: Account; sessionToken: string } | null> {
  const row = db.prepare('SELECT id, username, password_salt, password_hash FROM accounts WHERE username = ?').get(
    username.toLowerCase(),
  ) as { id: string; username: string; password_salt: string; password_hash: string } | undefined;
  if (!row) return null;

  const ok = await verifyPassword(password, row.password_salt, row.password_hash);
  if (!ok) return null;

  return { account: { id: row.id, username: row.username }, sessionToken: createSession(row.id) };
}

export function getAccountBySession(sessionToken: string): Account | null {
  const row = db
    .prepare(
      `SELECT accounts.id as id, accounts.username as username, sessions.expires_at as expiresAt
       FROM sessions JOIN accounts ON accounts.id = sessions.account_id
       WHERE sessions.token = ?`,
    )
    .get(sessionToken) as { id: string; username: string; expiresAt: string } | undefined;
  if (!row) return null;
  if (row.expiresAt < new Date().toISOString()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(sessionToken);
    return null;
  }
  return { id: row.id, username: row.username };
}

export function deleteSession(sessionToken: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(sessionToken);
}

/** Requires the CURRENT password, not just a valid session — a shared
 * household device left signed in shouldn't let anyone lock the parent out
 * by changing the password without knowing it. Returns false (no change
 * made) if currentPassword doesn't match. */
export async function changePassword(accountId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  const row = db.prepare('SELECT password_salt, password_hash FROM accounts WHERE id = ?').get(accountId) as
    | { password_salt: string; password_hash: string }
    | undefined;
  if (!row) return false;

  const ok = await verifyPassword(currentPassword, row.password_salt, row.password_hash);
  if (!ok) return false;

  const { salt, hash } = await hashPassword(newPassword);
  db.prepare('UPDATE accounts SET password_salt = ?, password_hash = ? WHERE id = ?').run(salt, hash, accountId);
  return true;
}

/** Deletes the account and everything it owns — sessions and profiles. A
 * household wants to be able to actually walk away with their data gone,
 * not just log out. */
export function deleteAccount(accountId: string): void {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM profiles WHERE account_id = ?').run(accountId);
    db.prepare('DELETE FROM sessions WHERE account_id = ?').run(accountId);
    db.prepare('DELETE FROM accounts WHERE id = ?').run(accountId);
  });
  tx();
}

export function listProfilesForAccount(accountId: string): StoredProfile[] {
  const rows = db.prepare('SELECT state FROM profiles WHERE account_id = ?').all(accountId) as { state: string }[];
  return rows.map((r) => JSON.parse(r.state) as StoredProfile);
}

/** Upserts a profile's state under this account. A profile id already owned
 * by a DIFFERENT account is rejected outright — an account can create new
 * profile ids or update its own, never take over another account's profile
 * by guessing (or reusing a stale) id. */
export function saveProfileForAccount(accountId: string, profile: StoredProfile): boolean {
  const existing = db.prepare('SELECT account_id FROM profiles WHERE id = ?').get(profile.id) as
    | { account_id: string | null }
    | undefined;
  if (existing && existing.account_id !== accountId) return false;

  const now = nowIso();
  const state = JSON.stringify(profile);
  db.prepare(
    `INSERT INTO profiles (id, account_id, state, created_at, updated_at)
     VALUES (@id, @accountId, @state, @now, @now)
     ON CONFLICT(id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at, account_id = excluded.account_id`,
  ).run({ id: profile.id, accountId, state, now });
  return true;
}

export function deleteProfileForAccount(accountId: string, profileId: string): boolean {
  const result = db.prepare('DELETE FROM profiles WHERE id = ? AND account_id = ?').run(profileId, accountId);
  return result.changes > 0;
}
