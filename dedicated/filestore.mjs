// Saves on disk for the dedicated server: the same getItem/setItem/removeItem a browser's
// localStorage has (so SaveStore works unchanged), one file per key in a folder.
// Writes go to a temporary file first and are then renamed over the old one, so a crash or a
// power cut mid-save never leaves a half-written world. World saves also keep rolling backups.
import { mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, existsSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const BACKUP_EVERY_MS = 10 * 60 * 1000; // at most one backup of a world every 10 minutes...
const BACKUPS_KEPT = 24;                // ...keeping the newest 24 (four hours of play)

export class FileStorage {
  constructor(dir) {
    this.dir = dir;
    this.backups = join(dir, 'backups');
    mkdirSync(this.backups, { recursive: true });
  }

  file(key) {
    return join(this.dir, `${key.replace(/[^\w.-]+/g, '_')}.json`);
  }

  getItem(key) {
    try { return readFileSync(this.file(key), 'utf8'); } catch { return null; }
  }

  setItem(key, value) {
    const file = this.file(key);
    if (key.startsWith('fdg.save.')) this.backup(key, file);
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, String(value));
    renameSync(tmp, file);
  }

  removeItem(key) {
    rmSync(this.file(key), { force: true });
  }

  /** Copy the world as it was before this write into backups/, now and then. */
  backup(key, file) {
    if (!existsSync(file)) return;
    const name = key.replace(/[^\w.-]+/g, '_');
    const old = readdirSync(this.backups).filter((f) => f.startsWith(`${name}@`)).sort();
    const newest = old.at(-1);
    if (newest && Date.now() - statSync(join(this.backups, newest)).mtimeMs < BACKUP_EVERY_MS) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    copyFileSync(file, join(this.backups, `${name}@${stamp}.json`));
    for (const f of old.slice(0, Math.max(0, old.length + 1 - BACKUPS_KEPT))) rmSync(join(this.backups, f), { force: true });
  }
}
