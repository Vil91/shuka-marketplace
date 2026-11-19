import 'dotenv/config';
import path from 'node:path';
import { getDb, BACKUPS_DIR, ensureDataDirs, closeDb } from './db.js';

export function runBackup(db = getDb()) {
  ensureDataDirs();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(BACKUPS_DIR, `shuka-backup-${stamp}.db`);
  // SQLite VACUUM INTO creates a clean, consistent snapshot without locking readers
  const escaped = target.replace(/'/g, "''");
  db.exec(`VACUUM INTO '${escaped}'`);
  return target;
}

if (process.argv[1] && process.argv[1].endsWith('backup.js')) {
  const file = runBackup();
  console.log(`Backup written to ${file}`);
  closeDb();
}
