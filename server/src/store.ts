// Data access layer over SQLite. Profile state is stored as an opaque JSON
// blob — this backend never interprets the CodeTrek profile shape, it just
// persists whatever the client sends, keyed by the client-generated profile
// id. That keeps the frontend's ProfileStoreV1 shape (src/storage/
// localStorage.ts) free to evolve without a server-side migration.

import { db } from './db.js';
import { generateLinkCode, generateDeviceToken } from './codes.js';

const LINK_CODE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface SyncableProfile {
  id: string;
  [key: string]: unknown;
}

export interface CreateResult {
  linkCode: string;
  deviceToken: string;
  profileId: string;
}

export interface LinkResult {
  profile: SyncableProfile;
  deviceToken: string;
  profileId: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function issueLinkCode(profileId: string): string {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LINK_CODE_TTL_MS).toISOString();

  // Astronomically unlikely to collide with another still-live code, but
  // guard against it rather than assume.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateLinkCode();
    const existing = db
      .prepare('SELECT code FROM link_codes WHERE code = ? AND used_at IS NULL AND expires_at > ?')
      .get(code, now.toISOString());
    if (existing) continue;
    db.prepare(
      'INSERT OR REPLACE INTO link_codes (code, profile_id, created_at, expires_at, used_at) VALUES (?, ?, ?, ?, NULL)',
    ).run(code, profileId, now.toISOString(), expiresAt);
    return code;
  }
  throw new Error('Could not allocate a unique link code');
}

/** "Enable sync" on a device: upserts the profile state, mints a device
 * token for THIS device, and issues a fresh link code to hand to another
 * device. */
export function createProfileSync(profile: SyncableProfile): CreateResult {
  const now = nowIso();
  const state = JSON.stringify(profile);

  db.prepare(
    `INSERT INTO profiles (id, state, created_at, updated_at)
     VALUES (@id, @state, @now, @now)
     ON CONFLICT(id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`,
  ).run({ id: profile.id, state, now });

  const deviceToken = generateDeviceToken();
  db.prepare('INSERT INTO devices (token, profile_id, created_at) VALUES (?, ?, ?)').run(
    deviceToken,
    profile.id,
    now,
  );

  const linkCode = issueLinkCode(profile.id);

  return { linkCode, deviceToken, profileId: profile.id };
}

/** A linked device asking for a fresh code to hand to a THIRD device.
 * Requires an existing device token — a stranger who only ever saw an old
 * (now-consumed) link code cannot mint a new one. */
export function requestNewCode(deviceToken: string): { linkCode: string } | null {
  const device = db.prepare('SELECT profile_id FROM devices WHERE token = ?').get(deviceToken) as
    | { profile_id: string }
    | undefined;
  if (!device) return null;
  return { linkCode: issueLinkCode(device.profile_id) };
}

/** "Link this device": redeems a link code for the current server-side
 * profile state plus a brand new device token. Codes are single-use (marked
 * used_at) and time-limited, so an old code seen once can't silently
 * re-link/overwrite a profile later — only the per-device token (returned
 * here) authorizes subsequent pushes. */
export function linkByCode(rawCode: string): LinkResult | null {
  const code = rawCode.trim().toUpperCase();
  const now = new Date().toISOString();

  const row = db.prepare('SELECT code, profile_id, expires_at, used_at FROM link_codes WHERE code = ?').get(code) as
    | { code: string; profile_id: string; expires_at: string; used_at: string | null }
    | undefined;
  if (!row) return null;
  if (row.used_at) return null;
  if (row.expires_at < now) return null;

  const profileRow = db.prepare('SELECT state FROM profiles WHERE id = ?').get(row.profile_id) as
    | { state: string }
    | undefined;
  if (!profileRow) return null;

  db.prepare('UPDATE link_codes SET used_at = ? WHERE code = ?').run(now, row.code);

  const deviceToken = generateDeviceToken();
  db.prepare('INSERT INTO devices (token, profile_id, created_at) VALUES (?, ?, ?)').run(
    deviceToken,
    row.profile_id,
    now,
  );

  return {
    profile: JSON.parse(profileRow.state) as SyncableProfile,
    deviceToken,
    profileId: row.profile_id,
  };
}

/** Opportunistic push from an already-linked device. The token must belong
 * to the profile it claims to update — knowing a profile id alone (e.g. from
 * a stale code) is not enough to overwrite it. */
export function pushProfile(deviceToken: string, profile: SyncableProfile): boolean {
  const device = db.prepare('SELECT profile_id FROM devices WHERE token = ?').get(deviceToken) as
    | { profile_id: string }
    | undefined;
  if (!device) return false;
  if (device.profile_id !== profile.id) return false;

  const now = nowIso();
  db.prepare('UPDATE profiles SET state = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(profile),
    now,
    profile.id,
  );
  return true;
}
