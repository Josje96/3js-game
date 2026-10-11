// Copies the runtime-relevant parts of the KayKit packs (glTF + textures only,
// no fbx/obj) from ./assets into ./public/models so Vite can serve them.
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const src = join(root, 'assets');
const out = join(root, 'public', 'models');

const copies = [
  ['KayKit_Dungeon_Pack_1.1_FREE/Assets/gltf', 'dungeon'],
  ['KayKit_BlockBits_1.0_FREE/Assets/gltf', 'blocks'],
  ['KayKit_Adventurers_2.0_FREE/Assets/gltf', 'items'],
  ['KayKit_Adventurers_2.0_FREE/Characters/gltf', 'characters'],
  ['KayKit_Adventurers_2.0_FREE/Animations/gltf/Rig_Medium', 'anims'],
  ['generated', 'anims'], // our own clips, made by `npm run make-anims` (tools/blender)
];

let n = 0;
for (const [from, to] of copies) {
  const dir = join(src, from);
  if (!existsSync(dir)) { console.warn(`[sync-assets] missing ${from}`); continue; }
  mkdirSync(join(out, to), { recursive: true });
  for (const f of readdirSync(dir)) {
    if (!/\.(gltf|glb|bin|png)$/i.test(f)) continue;
    cpSync(join(dir, f), join(out, to, f));
    n++;
  }
}
console.log(`[sync-assets] ${n} files -> public/models`);
