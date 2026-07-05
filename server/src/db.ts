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

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS devices (
    token TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
  );

  CREATE TABLE IF NOT EXISTS link_codes (
    code TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
  );

  CREATE INDEX IF NOT EXISTS idx_devices_profile_id ON devices(profile_id);
  CREATE INDEX IF NOT EXISTS idx_link_codes_profile_id ON link_codes(profile_id);
`);
