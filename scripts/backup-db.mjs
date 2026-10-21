import 'dotenv/config';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, 'data'));
const dbPath = path.join(dataDir, 'haatbazar.sqlite');
const backupRoot = path.join(dataDir, 'backups');
if (!fs.existsSync(dbPath)) throw new Error(`Database not found: ${dbPath}`);
fs.mkdirSync(backupRoot, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const targetDir = path.join(backupRoot, stamp);
fs.mkdirSync(targetDir, { recursive: true });
const db = new Database(dbPath, { readonly: true, fileMustExist: true });
try { await db.backup(path.join(targetDir, 'haatbazar.sqlite')); } finally { db.close(); }
const uploads = path.join(dataDir, 'uploads');
if (fs.existsSync(uploads)) fs.cpSync(uploads, path.join(targetDir, 'uploads'), { recursive: true });
const dirs = fs.readdirSync(backupRoot, { withFileTypes: true }).filter(x => x.isDirectory()).map(x => x.name).sort().reverse();
for (const old of dirs.slice(14)) fs.rmSync(path.join(backupRoot, old), { recursive: true, force: true });
console.log(`Backup created: ${targetDir}`);
