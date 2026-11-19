import 'dotenv/config';
import { getDb, runMigrations, closeDb, DB_PATH } from './db.js';

const db = getDb();
const applied = runMigrations(db);
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((r) => r.name);

console.log(`Database: ${DB_PATH}`);
console.log(`Migrations applied: ${applied.length ? applied.join(', ') : 'none (up to date)'}`);
console.log(`Tables (${tables.length}): ${tables.join(', ')}`);
closeDb();
