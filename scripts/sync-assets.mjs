// Copies the runtime-relevant parts of the KayKit packs (glTF + textures only,
// no fbx/obj) from ./assets into ./public/models so Vite can serve them.
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ASSET_SOURCES } from './asset-map.mjs';

const root = new URL('..', import.meta.url).pathname;
const src = join(root, 'assets');
const out = join(root, 'public', 'models');

const copies = ASSET_SOURCES;

let n = 0;
for (const [from, to] of copies) {
  const dir = join(src, from);
  if (!existsSync(dir)) { console.warn(`[sync-assets] missing ${from}`); continue; }
  mkdirSync(join(out, to), { recursive: true });
  for (const f of readdirSync(dir)) {
    if (!/\.(gltf|glb|bin|png|jpg)$/i.test(f)) continue;
    cpSync(join(dir, f), join(out, to, f));
    n++;
  }
}
console.log(`[sync-assets] ${n} files -> public/models`);
