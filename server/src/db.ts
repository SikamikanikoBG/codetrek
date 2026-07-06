// Single SQLite connection for the whole process. Path comes from DB_PATH so
// whoever wires up the Docker volume just points it there (deploy/docker-
// compose.yml sets DB_PATH=/data/codetrek.sqlite on a named volume that
// survives container recreation/Watchtower updates). Defaults to a local
// ./data folder for zero-config local dev, and supports ':memory:' for tests.

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'codetrek.sqlite');

if (DB_PATH !== ':memory:') {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// v1.0.0 replaced the anonymous link-code/device-token sync model (issue #1,
// v0.3.0) with real accounts — a household signs in once instead of
// re-linking every device with a fiddly 6-character code. The old `devices`/
// `link_codes` tables are dropped outright: confirmed empty in production
// before this migration shipped (no user ever completed a real link), so
// there's nothing to carry forward, and keeping their code paths around
// unused would just be dead weight.
db.exec(`
  DROP TABLE IF EXISTS devices;
  DROP TABLE IF EXISTS link_codes;

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_account_id ON sessions(account_id);
`);

// `profiles.account_id` is added via ALTER rather than baked into the
// CREATE TABLE above so upgrading an existing deployment's volume (which
// already has a `profiles` table from the pre-accounts schema) doesn't need
// a hand-run migration — this runs once, harmlessly, on every boot.
try {
  db.exec('ALTER TABLE profiles ADD COLUMN account_id TEXT REFERENCES accounts(id)');
} catch (err) {
  if (!(err instanceof Error) || !/duplicate column/i.test(err.message)) throw err;
}
db.exec('CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON profiles(account_id)');
