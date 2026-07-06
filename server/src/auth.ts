// Password hashing (scrypt, Node's built-in — no extra native dependency
// alongside better-sqlite3) and session-token utilities. Node's documented
// scrypt defaults (N=16384, r=8, p=1) are used as-is; a per-account random
// salt means two accounts with the same password never produce the same
// hash, and timingSafeEqual on verification avoids a timing side-channel.

import crypto from 'node:crypto';

const KEY_LENGTH = 64;
const SESSION_TOKEN_BYTES = 32;

export interface PasswordHash {
  salt: string;
  hash: string;
}

export function hashPassword(password: string): Promise<PasswordHash> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) reject(err);
      else resolve({ salt, hash: derivedKey.toString('hex') });
    });
  });
}

export function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      const expected = Buffer.from(expectedHash, 'hex');
      if (expected.length !== derivedKey.length) {
        resolve(false);
        return;
      }
      resolve(crypto.timingSafeEqual(expected, derivedKey));
    });
  });
}

export function generateSessionToken(): string {
  return crypto.randomBytes(SESSION_TOKEN_BYTES).toString('hex');
}

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,24}$/;

/** Household-scale accounts: a username, not an email — no SMTP/verification
 * infra needed for a self-hosted, small-audience product. */
export function isValidUsername(value: unknown): value is string {
  return typeof value === 'string' && USERNAME_RE.test(value);
}

export function isValidPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 200;
}
