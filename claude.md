# Family Dungeon — notes for Claude

A small co-op dungeon crawler for one family: a 40-floor mine in 4 biomes (boss every 10 floors),
a town with shops / forge / pet stall, and the family fort. three.js + Vite, multiplayer over WebRTC (PeerJS).

**Read `HANDOFF.md` first**: current state, file map, save format, message list, and step-by-step
recipes for adding items / enemies / biomes / pets / props. `plan.md` = done list + ideas.
This folder is NOT a git repo yet — suggest `git init` + a commit before making changes.

## Commands
- `npm run dev` — dev server on the LAN (`--host`); syncs assets first
- `npm test` — headless sim tests (map gen, server rules; 17 tests). Run after every change.
- `npm run build` — static build in `dist/` (relative base, works on itch.io / any static host)
- Two players in one browser, no network: open `/?net=tabs` (host) and `/?net=tabs&profile=2&join=CODE`.
- Dev console: `window.game.client` / `window.game.server` (server only on the host).
- `/lab.html` — animation lab: every class + weapon playing any clip, with a scrubber.
- `npm run make-anims` — regenerate attack clips with Blender (Flatpak `org.blender.Blender`).

## Architecture
- `src/shared/` — pure JS, no three/DOM. Runs on host and clients. Seeded RNG, config, items,
  dungeon defs, ASCII maps, floor generator, layout builder, collision.
- `src/server/` — `GameServer` is authoritative and runs **in the host's browser tab**.
  `LiveLocation` = a location with players in it (entities, enemy AI, pet AI, projectiles).
  `saves.js` = localStorage saves + `migrate()` for old saves.
- `src/net/transports.js` — every connection is `{ send, onMessage, onClose, close }`.
  The host's own player uses an in-memory pair, so solo play and multiplayer share one code path.
- `src/client/` — rendering and input only. `GameClient` renders whatever location the server
  says we're in; `LocationView` builds static geometry (instanced) from a layout; `views.js` = entities;
  `enemies.js` / `pets.js` / `cosmetics.js` / `nature.js` = procedural models; `hud.js` = all menus.

## Key rules
- Layouts are deterministic from `(locationKey, seed)`. The server sends the seed in `enter`; clients
  rebuild walls/props locally. Only dynamic entities (rocks, slimes, barrels, drops, chests, ladders,
  shots, pets) are synced.
  Anything that affects the layout must use the seeded rng, never `Math.random`.
- Dungeon seeds = `hash(worldSeed, key, day)` → floors reshuffle after sleeping.
- Clients own their own movement; the host owns everything else (hp, loot, gold, progression).
- `move` messages carry `epoch` (bumped on every travel) so stale positions from the previous location are dropped.
- Portals must touch exactly one walkable cell (tests enforce this).
- Entity fields starting with `_` are server-only and never sent.
- Bump `PROTOCOL_VERSION` when messages change; bump `SAVE_VERSION` + add to `migrate()` when the save shape changes.
- Family devices open the game at `http://<lan-ip>:5173`, which is NOT a secure context: avoid
  `crypto.randomUUID`, `navigator.clipboard` etc. without a fallback (they're undefined there).
- Cosmetics (`look`: outfit, hat, cape, hair, face…) are visuals: the server only validates (`cleanLook`)
  and relays them. Projectiles (`shot` entities) are sent once with their velocity; clients fly them locally.
- Pets are real `type: 'pet'` server entities (follow, fight, take damage, faint); their record
  `{ id, species, name, level, xp, hp, fainted }` lives in the owner's save.
- Enemies are all `type: 'slime'` entities (slimes came first); `ENEMIES[variant]` in shared/dungeons.js
  gives the AI style and the client `body`. Pets are `type: 'pet'` entities owned by a player.
- Arrivals ignore portals for `PORTAL_GRACE` seconds (otherwise you walk straight back up the stairs).
- Rules/numbers live in `src/shared/` (config, items, dungeons, progression, pets); visuals never decide outcomes.
- Every new client→server message gets an `on_<name>` handler in `GameServer` that validates ownership,
  location and gold before doing anything.
- Floor tiles are 0.05 tall: flat things on dungeon floors go above y = 0.05.
- Verify visual changes in the running game (`npm run dev`), not just the tests.

## Assets
KayKit packs (CC0) in `assets/`; `scripts/sync-assets.mjs` copies glTF/textures to `public/models/`
(gitignored). Model ids are `folder/name`, e.g. `dungeon/wall`. Dungeon tiles are 4×4 units, walls 4 tall,
BlockBits blocks 2 units, characters ~2.5 tall. Character animations come from `anims/Rig_Medium_*`
(shared skeleton). The free pack has no attacks, so `tools/blender/make_attacks.py` generates
`assets/generated/Rig_Medium_Combat.glb` (Attack_Slash / Chop / Stab / Cast). Poses are written as
"aim the arm this way with the weapon pointing that way" in Blender world axes (-Y forward, -X right,
+Z up); every clip starts/ends on Idle_A. Each weapon's `swing` in items.js picks the clip; `SWING_COOLDOWN`
sets attack rate (animation speed follows it) and `SWING_IMPACT` is when the server applies the hit.
GLTFLoader strips dots from node names: bone `handslot.r` is `handslotr` in three.js.
