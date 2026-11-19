import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

export const DATA_DIR = path.resolve(
  PROJECT_ROOT,
  process.env.DATA_DIR || './data'
);
export const DB_PATH = path.join(DATA_DIR, 'shuka.db');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const LARGE_DIR = path.join(UPLOADS_DIR, 'large');
export const THUMB_DIR = path.join(UPLOADS_DIR, 'thumb');
export const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
export const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export function ensureDataDirs() {
  for (const dir of [DATA_DIR, UPLOADS_DIR, LARGE_DIR, THUMB_DIR, BACKUPS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let dbInstance = null;

export function openDatabase(dbPath = DB_PATH) {
  ensureDataDirs();
  const db = new Database(dbPath);
  // Required SQLite pragmas on every connection
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  return db;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = openDatabase(DB_PATH);
  }
  return dbInstance;
}

export function runMigrations(db = getDb()) {
  db.pragma('foreign_keys = ON');
  const currentVersion = db.pragma('user_version', { simple: true });
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort();

  const applied = [];
  for (const file of files) {
    const version = Number.parseInt(file.split('_')[0], 10);
    if (version > currentVersion) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      db.exec('BEGIN IMMEDIATE');
      try {
        db.exec(sql);
        db.pragma(`user_version = ${version}`);
        db.exec('COMMIT');
        applied.push(file);
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    }
  }
  return applied;
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
