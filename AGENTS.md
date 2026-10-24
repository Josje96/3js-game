# Family Dungeon — guide for anyone (human or AI agent) changing the code

A co-op 3D dungeon crawler for a family: three.js + Vite, run with **Bun**. One player hosts
(the authoritative server runs in their browser tab); others join with a 5-letter code over WebRTC (PeerJS).
The game is in **active development and close to live**: never break existing saves or other players' sessions.

Read this file first, then `HANDOFF.md` (what's in the game, how it plays), then `todo.md` (what's next).

## Commands
- `bun install` — once, or after package.json changes
- `bun run dev` — dev server on the LAN (http://localhost:5173, others use http://<lan-ip>:5173)
- `bun run server` — a **dedicated server** (the Minecraft way): builds the game, then runs one always-on world from
  `worlds/` on :8080 (`--world`, `--port`, `--import save.json`). Everyone opens http://<that-pc>:8080 and presses Play.
  Saves are crash-safe with rolling backups in `worlds/backups`; Ctrl+C saves and stops. See `dedicated/server.mjs`.
- `bun run check` — **run before every commit**: lint + all tests + production build
- `bun test` — tests only (`bun test --rerun-each 20` to hunt flaky ones)
- `bun tools/smoke.mjs --url http://localhost:5173` — headless Chrome: makes a world, visits places,
  screenshots to /tmp/fdg-shots, fails on any console error. `--steps file.mjs` for your own script,
  `--guest peer|tabs` adds a second player tab. Set `window.game.client.camOverride = {pos, look}` to aim the camera.
- Two players in one browser without network: `/?net=tabs` and `/?net=tabs&profile=2&join=CODE`
- Dev console: `window.game.client`, `window.game.server` (host only)

## Layout
| Folder | What | Rule |
|---|---|---|
| `src/shared/` | rules + data used by host and clients: `config.js` (tunables, looks), `items.js`, `dungeons.js`, `furniture.js`, `townsfolk.js`, `maps.js` (ASCII maps), `fort.js` (the fort, drawn per family size), `mapgen.js`, `protocol.js` (every network message) | pure JS, no DOM/three. Anything that shapes a map uses the seeded rng, never `Math.random` |
| `src/server/` | `GameServer.js` core (connections, loop, travel); `systems/*.js` one file per feature (combat, day, decor, dungeons, home, pets, progression, shop, town, wallet); `LiveLocation.js` entities + AI; `saves.js` | runs only on the host. Owns all outcomes (hp, gold, loot) |
| `src/net/transports.js` | connections `{ send, sendFast?, onMessage, onClose, close }`: in-tab, PeerJS (family code), WebSocket (`joinServer`) | `sendFast` = unreliable lane for positions |
| `dedicated/` | `server.mjs` the dedicated server (Bun: the same `GameServer`, WebSockets, serves `dist/`), `filestore.mjs` saves on disk | runs on Bun, not in a browser; `bun tools/smoke.mjs --dedicated` tests it |
| `src/client/` | rendering, input, HUD. `GameClient.js`, `LocationView.js`, `views.js`, `themes.js`, `town.js`, `decorations.js`, `furniture.js`, `pets.js` + `petkit.js`, `enemies.js`, `cosmetics.js`, `effects.js`, `icons.js`, `interp.js`, `hud.js` | never decides outcomes |
| `test/` | `bun test`; `fixtures/` = old save files that must keep loading | add a test with every rule change |

## How to make a change without breaking things
1. **Branch + commit** small, one feature per commit. Run `bun run check` first.
2. **New client→server message**: add its schema to `CLIENT_MESSAGES` in `shared/protocol.js`, an `on_<name>`
   method in a server system, and bump `PROTOCOL_VERSION` (config.js). Handlers still check ownership, location, gold.
   A test fails if a schema has no handler or vice versa.
3. **New server feature**: a new file in `src/server/systems/`, listed in `systems/index.js`. It can export
   `methods`, `interactions` (for props with `interact: 'x'`), `tick`, `onJoin`, `onLeave`, `onLocation`.
   Two systems defining the same method name throws at startup.
4. **Save shape changed** (new field on world or player): add a step to `MIGRATIONS` in `server/saves.js`, bump
   `SAVE_VERSION` to match, add the field to `newSave`/`newPlayerRecord` (+ `PLAYER_FIELDS` for player fields).
   Never edit a shipped migration, never rename/remove saved ids (items, flags, pets...). Before changing the
   format, drop a current save into `test/fixtures/save-vN.json`.
5. **Gold** only changes through `this.spend(p, n)` / `this.earn(p, n)` (systems/wallet.js). Gold is per player.
6. **Models**: any model id written in client code must be preloaded — add it to `EXTRA_MODELS` in `client/themes.js`
   (a test checks). Every biome theme needs an entry in `client/themes.js` (a test checks).
7. **Look at it — required before merging anything that touches `src/client/`**: with `bun run dev` running,
   `bun tools/smoke.mjs` must end with `no errors`, and you open the screenshots. `bun run check` cannot
   catch client crashes: tests don't load the renderer. (A null `home` in `LocationView.js` once blanked every
   dungeon floor while `check` passed; the default smoke tour would have caught it.) Changed a dungeon, biome
   or boss? Visit that floor too with a `--steps` file: `server("s.travel(me, 'mine/10', 'U')")`.
8. Everyone must refresh after an update (protocol versions must match).

## Recipes
- **Item / weapon / armor / food**: `ITEMS` in `shared/items.js`. `tier` (0–4) puts it in the shop from level `tier*20`.
- **Enemy**: `ENEMIES` in `shared/dungeons.js` (stats are for depth 1; `enemyPower` scales them). Non-slimes need a `body`
  (builders in `client/enemies.js`); `tint` recolours one, `color` colours a slime.
- **Biome**: entry in a dungeon's `biomes` in `shared/dungeons.js` + theme in `client/themes.js` (+ `deco` in
  `client/decorations.js`, mood in `client/music.js`).
- **Town / fort things**: draw a letter into `shared/maps.js`, map it in `LEGEND`, define the prop in `shared/props.js`;
  handle its `interact` in a system's `interactions`.
- **Townsperson**: `shared/townsfolk.js` + an `n` on the town map. **Furniture**: `shared/furniture.js` (+ builder in client/furniture.js).
- **Pet**: `PET_SPECIES` in `shared/pets.js` + a builder in `MODELS` in `client/pets.js`. Four-legged ones go through
  `quadruped()` (proportions + a `coat` colour function), birds through `bird()`. Pieces come from `client/petkit.js`:
  `tube` (bodies, limbs, tails; `bump` sculpts curls/feathers/scales), `leaf` (feathers, ears, fur), `eye`, then `bake()`.
  `test/pets-look.test.js` builds every species at every stage; see them all at `http://localhost:5173/tools/pet-gallery.html`.

## Gotchas
- Family devices use plain `http://192.168…`: no `crypto.randomUUID`, no `navigator.clipboard` — always fall back.
- Portals must touch exactly one walkable cell (tested). Floor tiles are 0.05 tall.
- Arrivals ignore portals for `PORTAL_GRACE` seconds.
- KayKit hair is part of the head mesh; `cosmetics.js` removes it by texture colour for new hairstyles.
- Headless Chrome renders ~10 fps: animations in screenshots lag behind real time.
