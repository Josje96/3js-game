# Family Dungeon — handover guide

Everything you need to pick this project back up: where it stands, how it works, and how
to change it without breaking anyone's saves. Last updated **2026-10-11**.

> **Most important thing first: this folder is not under version control.** There is no
> history to roll back to if a change goes wrong. Before the next round of changes, run:
>
> ```sh
> cd ~/projects/family-multiplayer-game
> git init && git add -A && git commit -m "Family Dungeon as of 2026-10-11"
> ```
>
> `.gitignore` already leaves out `node_modules/`, `dist/` and `public/models/`.

Companion files: `claude.md` (short rules for an AI assistant working on the code),
`plan.md` (feature checklist and ideas for next).

---

## 1. Where we are

A co-op 3D dungeon crawler for one family, playable in the browser. One person **hosts**
(the world runs in their browser tab and is saved there); everyone else **joins** with a
5-letter code. It's in a playable, tested state:

- **17 automated tests pass** (`npm test`) and the production build works (`npm run build`).
- Every feature was checked in a headless browser with screenshots.
- **Not yet done:** testing with two *real* devices over the network (only same-machine
  tests so far), a real playtest of the difficulty balance, and listening to the music
  (it's confirmed to make sound, not confirmed to sound nice).
- Current versions (in `src/shared/config.js`): `PROTOCOL_VERSION = 7`, `SAVE_VERSION = 5`.
  Everyone must be on the same version, so after any update **everyone refreshes**.

### What's in the game

| Area | What's there |
|---|---|
| **Family Fort** (home) | Bed (heal everyone + pets, save, next day), **wardrobe** (outfit / hat / cape / back item / cape dye), **mirror** (hair, hair colour, face extras, skin tone; real reflection), family chest (placeholder). |
| **Pebble Town** | Shop (Gear / Fashion tabs, sell loot), **Pet Keeper** stall (adopt pets, revive fainted ones), **forge + blacksmith** (make weapons from blueprints), **healing spring** pond (full heal for 5 gold), mine entrance with elevator, sealed gate to the Sunken Ruins. Painted grass, animated water, low-poly swaying trees. |
| **The Old Mine** | 40 floors in 4 biomes of 10: Old Mine → Frost Caverns → Mushroom Grotto → Lava Depths. Boss on every 10th floor (King Slime, Frost Giant, Mushroom King, Lava Dragon). Beating one opens a ladder to the next biome. Elevator stops at floor 1 and every 5th floor you've reached. Floors reshuffle every day. |
| **Sunken Ruins** | Opens after the King Slime. 10 floors, purple/black slimes, bats, spiders, Slime Emperor boss. Still mostly placeholder. |
| **Enemies** | Slimes (green/blue/red/purple/black/ice), bats, fire bats, yetis, walking mushrooms, spiders (pounce), fire imps (throw fireballs), magma golems, plus the bosses. |
| **Your character** | Levels + XP bar, 2 skill points per level (Strength / Dexterity / Magic / Vitality). Class only sets starting points + starter weapon. Gear bag: own many weapons and shields, equip any. Dodge roll with brief invulnerability. |
| **Combat** | Melee weapons (sword, axe…), ranged (bows / crossbows shoot arrows, staff / wand / spellbook shoot magic bolts). Shields give a % chance to block a hit. |
| **Loot** | Ore from rocks, gold, potions, breakable barrels, chests. Weapons/shields drop (better deeper). Blueprints drop from chests and bosses. |
| **Pets** | 20 species including **Maple the apricot Maltipoo** (free, always named Maple). Pets follow you, fight, level up, have health (bar over their head + in the HUD), faint at 0 hp (revive at the Pet Keeper for gold), evolve at levels 10 and 20, and get a new look every 5 levels. |
| **Other** | Generative background music per area (M to mute, volume in the Esc menu), chat, gamepad support, buy confirmations, damage numbers. |

### Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Move | WASD / arrow keys | left stick |
| Attack | Space / J / left click | A |
| Dodge roll | Shift / K | B |
| Interact (shops, bed, wardrobe…) | E / F | X |
| Drink a potion | Q | Y |
| Character sheet (skills, gear) | C / I | Back |
| Pets | P | — |
| Chat | Enter | — |
| Music on/off | M | — |
| Menu (save, quit) | Esc | Start |
| Zoom | mouse wheel | — |

---

## 2. How to run it

```sh
cd ~/projects/family-multiplayer-game
npm install          # only needed once (or after changing package.json)
npm run dev          # starts the game on the home network
```

The dev server prints addresses. On **this computer** use `http://localhost:5173`. On
**other family devices** use the network one, e.g. `http://192.168.0.22:5173`.

- **Host a world:** type a name, pick a class, *New world → Create & play*. The invite code
  appears top-right; others type it in *Join family*.
- **Saves live in the host's browser** (localStorage). Back them up with *Esc → Download save
  file*, or the ⬇ button on the title screen; restore with *Import save file*.
- **Don't open `dist/index.html` by double-clicking** — browsers block the game from a
  `file://` address. Use `npm run dev`, or `npm run build` + `npm run preview`.
- **Test two players on one computer, no network:** open `http://localhost:5173/?net=tabs` (host)
  and, in another tab, `http://localhost:5173/?net=tabs&profile=2&join=CODE`.
- **Developer console:** `window.game.client` and (on the host) `window.game.server`.
  Handy: `window.game.server.save.gold = 9999; window.game.server.broadcastWorld()`.

Other commands: `npm test` (headless rule tests), `npm run build` (static site in `dist/`,
uploadable to itch.io etc.), `npm run make-anims` (regenerate attack animations with Blender),
`/lab.html` (animation viewer).

---

## 3. How it works

### The big picture

```
 Host's browser tab                              Guest's browser tab
┌──────────────────────────────────────┐        ┌─────────────────────────┐
│ GameServer  (the real game: rules,   │◀──────▶│ GameClient (draws,      │
│   hp, loot, enemies, pets, saves)    │ WebRTC │   moves you, sends      │
│      ▲ in-memory pair                │ PeerJS │   "I attacked" etc.)    │
│ GameClient (the host's own view)     │        └─────────────────────────┘
└──────────────────────────────────────┘
```

- The **host's tab runs the authoritative server** (`src/server/GameServer.js`). If the
  host closes the tab, the world stops (guests get disconnected; progress up to the last
  autosave/sleep is kept).
- The host plays through the *same* connection interface as guests (an in-memory pair),
  so solo and multiplayer use one code path.
- **Clients own their own movement** (feels instant); the **server owns everything else**
  (health, gold, loot, XP, enemy AI, pets, saves). Clients send *intents*
  (`attack`, `buy`, `equip`…); the server decides and sends back results.
- **Levels are not sent over the network.** Every map is generated identically on every
  machine from `(location key, seed)`. Only moving/changing things ("entities") are synced.

### Folders

| Folder | What lives there | Rule |
|---|---|---|
| `src/shared/` | Game rules and data used by host *and* clients: config, items, enemies, biomes, maps, floor generator, pets, progression, collision, seeded RNG. | **Pure JavaScript only** — no three.js, no DOM, no `Math.random` in anything that shapes a map. The tests import these directly. |
| `src/server/` | `GameServer.js` (all rules + message handlers), `LiveLocation.js` (one active place: its entities, enemy AI, pet AI, projectiles), `saves.js` (save format + upgrades). | Runs only on the host. |
| `src/net/` | `transports.js`: PeerJS (WebRTC), BroadcastChannel (`?net=tabs`) and in-memory connections, all shaped `{ send, onMessage, onClose, close }`. | |
| `src/client/` | Everything you see/hear: `GameClient.js` (message handling, your movement, camera), `LocationView.js` (static scenery per location), `views.js` (characters, slimes, rocks, drops, projectiles), `enemies.js` (non-slime enemy models), `pets.js` (pet models + pet view), `cosmetics.js` (hats, wings, hair, faces), `nature.js` (grass, water, trees), `music.js`, `hud.js` (all HTML menus), `input.js`, `assets.js` (model loading). | Never decides game outcomes. |
| `src/main.js` | Title screen, profile (name/class/look in localStorage), starting a host or joining. | |
| `test/sim.test.js` | Headless tests of maps + server rules. | Run `npm test` after any change. |
| `assets/` | KayKit model packs (CC0) + `generated/Rig_Medium_Combat.glb`. Copied into `public/models/` by `npm run dev/build`. | |
| `tools/blender/` | Script that generates attack animations. | |

### Where each feature lives

| Feature | Rules / data | Server logic | What you see |
|---|---|---|---|
| Items, weapons, shields, shop stock, drop tables, forge recipes | `shared/items.js` | `GameServer` `on_buy`, `gainGear`, `dropGear`, `on_forge` | `hud.js` shop / forge / character sheet |
| Enemies, biomes, bosses | `shared/dungeons.js` (`ENEMIES`, `DUNGEONS`, `makeEnemy`) | `LiveLocation.tickSlime` (AI), `GameServer.hitSlime`, `bossDefeated` | `client/enemies.js` (bodies), `views.js` `SlimeView` |
| Floor generation | `shared/mapgen.js` | — | `LocationView.buildIndoor` + biome `THEMES` |
| Town / fort layouts | `shared/maps.js` (ASCII art), `shared/props.js` | `on_interact` | `LocationView` |
| Levels, skills, damage formula | `shared/progression.js` | `addXp`, `shareXp`, `on_spend` | XP bar + character sheet in `hud.js` |
| Pets | `shared/pets.js` | `spawnPet`, `petXp`, `damagePet`, `on_revivePet`, `LiveLocation.tickPet` | `client/pets.js`, pet screen in `hud.js` |
| Wardrobe / mirror / fashion | `shared/config.js` (`HATS`, `CAPES`, `BACKS`, `DYES`, `HAIRS`, `HAIR_COLORS`, `FACES`, `SKINS`, `cleanLook`) | `on_wardrobe`, `on_buyStyle` | `client/cosmetics.js`, `CharacterView.setLook` |
| Saves | `server/saves.js` (`newSave`, `newPlayerRecord`, `migrate`) | `persist`, `writeRecord` | title screen in `main.js` |
| Music | — | — | `client/music.js` (`MOODS`, `moodFor`) |

### Network messages (for reference)

- **Client → server** (each handled by `on_<name>` in `GameServer.js`): `hello`, `move`,
  `attack`, `roll`, `interact`, `use`, `buy`, `sell`, `buyStyle`, `equip`, `spend`, `forge`,
  `buyPet`, `pickPet`, `renamePet`, `revivePet`, `wardrobe`, `elevator`, `chat`.
- **Server → client:** `welcome`, `kicked`, `world` (day, gold, flags), `self` (your hp, level,
  gear, pets…), `enter` (new location + seed + entities), `snap` (20×/second entity updates),
  `roster`, `toast`, `chat`, `ui` (open a menu: shop / forge / pets / wardrobe / mirror /
  elevator), `fx` (one-off effects: damage numbers, level-ups, evolutions, debris…).

### Entities (things that move or change)

All synced entities live in a `LiveLocation`: `rock`, `slime` (**every enemy**, slimes came
first), `barrel`, `chest`, `drop`, `ladder`, `shot` (arrows, magic bolts, enemy fireballs),
`pet`. Fields starting with `_` stay on the server and are never sent. Dungeon floors are
thrown away when the last player leaves.

### The save file (host's localStorage, also the downloadable .json)

```
{ version, id, name, seed, day, gold, flags: { mineCleared, frostCleared, ... },
  dungeons: { mine: { deepest }, ruins: { deepest } },
  house: { level, storage },
  players: { <playerId>: {
      name, cls, look: { hat, cape, back, dye, hair, hairColor, face, skin },
      level, xp, points, stats: { str, dex, int, vit }, hp, maxHp,
      weapon, shield, gear: [...], blueprints: [...], inventory: { potion: 2, copper: 5, ... },
      closet: ['hat:crown', ...], pets: [{ id, species, name, level, xp, hp, fainted }], pet } } }
```

A player's id lives in *their own* browser (profile), so the same person keeps their
character across worlds and devices only if they use the same browser.

---

## 4. How to make changes safely

### The checklist (every change)

1. **Back up first.** Commit with git (see the top of this file). For extra safety, download
   each world's save file (*Esc → Download save file*) before big changes.
2. **Keep rules in `shared/` or `server/`, visuals in `client/`.** The server decides; the
   client draws. Never put game outcomes (damage, loot, gold) in client code.
3. **Maps must stay deterministic.** Anything that shapes a level (walls, rocks, enemy
   placement) uses the seeded `rng` / `rand`, never `Math.random`. `Math.random` is fine for
   loot rolls on the server and for visual sparkle on the client.
4. **Changed what messages contain?** Bump `PROTOCOL_VERSION` in `shared/config.js`.
   Mismatched players get a polite "refresh both browsers".
5. **Changed what a save contains** (new field on the world or a player)? Bump `SAVE_VERSION`
   **and** add a line to `migrate()` in `server/saves.js` that fills in the field for old
   saves (`rec.newThing ??= defaultValue`). Also add it to `newPlayerRecord` / `newSave` and to
   `writeRecord` + the player object in `onHello` in `GameServer.js`. Never delete or rename a
   save field without migrating it.
6. **Run `npm test`.** Add a test in `test/sim.test.js` for new rules (copy a nearby test: they
   create a `GameServer`, connect a `fakeClient`, and assert on what happens).
7. **Look at it.** `npm run dev`, play the change, check the browser console (F12) for red
   errors. Try it on a second device if it touches networking.
8. **Everyone refreshes** after an update.

### Gotchas that have already bitten us

- **Family devices use plain `http://192.168…`**, which browsers treat as insecure: `crypto.randomUUID()`,
  `navigator.clipboard` and similar don't exist there. The whole title screen once broke
  because of this. Always provide a fallback.
- **The Vite dev server sometimes serves a stale file** after edits (a "X is not defined" error
  that makes no sense). Save the file again, or restart `npm run dev`, and hard-refresh (Ctrl+Shift+R).
- **Arrival points sit next to the exit back.** `PORTAL_GRACE` (in `GameServer.js`) stops players
  walking straight back out; keep it if you add new portals.
- **Portals must touch exactly one walkable cell** (the tests enforce it).
- **Floor tiles are 0.05 tall**, so anything flat drawn on a dungeon floor must sit above y = 0.05.
- **Character parts** (head, cape, helmet…) are separate meshes named `<Model>_<Part>` (e.g.
  `Knight_Cape`, `RogueHooded_Mask`); bones like `handslot.r` lose their dot (`handslotr`).

### Recipes for common changes

**Change a number (prices, damage, XP, speeds).** Almost all tunables are data:
`shared/config.js` (player speed, roll timing, spring cost, attack range…),
`shared/items.js` (weapon damage/prices, shop stock, drop tiers, forge recipes),
`shared/dungeons.js` (enemy hp/damage/speed/gold, which enemies per biome),
`shared/progression.js` (XP curve, HP per level, skill effects),
`shared/pets.js` (pet prices, attack, health, revive cost, evolution levels).
Changing numbers doesn't need a version bump.

**Add a weapon or shield.** Add an entry to `ITEMS` in `shared/items.js` (`kind: 'weapon'` with
`damage`, `swing` and optionally `ranged: 'arrow' | 'magic'`, or `kind: 'shield'` with `block`),
pointing `model` at a file in `public/models/items/` (optionally `tint` to recolour). Then add
it to `SHOP_STOCK`, a `DROP_TIERS` list, or `FORGE_RECIPES` (+ give it `forged: true`).

**Add an enemy.** Add it to `ENEMIES` in `shared/dungeons.js` (hp, damage, speed, gold, `ai`:
`chase` / `flutter` / `pounce` / `shooter`). If it isn't a slime, give it a `body` and write a
builder for that body in `BODIES` in `client/enemies.js` (plus a case in `MobView.update` to
animate it). Then list it in a biome's `enemies(floor)`.

**Add a biome.** Add an entry to a dungeon's `biomes` list in `shared/dungeons.js` (name,
theme, enemies, ores, boss with a new `flag`). Floors and bosses follow automatically. For its
look, add a theme to `THEMES` in `client/LocationView.js` (tint, background, decoration kind)
and a music mood in `client/music.js`.

**Add a pet species.** Add it to `PET_SPECIES` in `shared/pets.js` (price, atk, three form
names) and to `LOOKS` in `client/pets.js` (pick a `shape`: quad / round / bird / bee / snail,
colours, ears, tail…), plus an emoji in `PET_ICONS` in `client/hud.js`.

**Add a hat, back item, dye, hairstyle or face extra.** Add it to the right table in
`shared/config.js`; give it a `price` to sell it in the Fashion shop (no price = free).
If it's new geometry, write a builder in `client/cosmetics.js` (`HAT_BUILDERS`,
`BACK_BUILDERS`, `HAIR_BUILDERS`, `FACE_BUILDERS`).

**Add something to town or the fort.** Draw it into the ASCII map in `shared/maps.js` with a
new letter, map that letter in `LEGEND` to a prop, and define the prop in `shared/props.js`
(model or `build`, `radius` if it blocks, `interact` + `prompt` if you can use it). Handle the
`interact` value in `GameServer.on_interact`; if it opens a menu, send `{ t: 'ui', kind }` and
handle that kind in `GameClient.openUi` + a new `open…` method in `hud.js`. `npm test` checks
the maps are still connected.

**Add a new message.** Client: `this.conn.send({ t: 'myThing', ... })`. Server: add
`on_myThing(p, msg)` to `GameServer` — **validate everything** (does the player own it, are
they in the right place, can they afford it). Bump `PROTOCOL_VERSION`.

### Ideas already written down (see `plan.md`)

Shared family chest, fort upgrades, sound effects, proper Sunken Ruins content, touch controls
for tablets, hosting the built game on itch.io, real skeleton enemies from the KayKit pack.

---

## 5. Known limitations and open questions

- **Balance is untested.** Enemy strength, XP per level, prices and pet power are first guesses.
- **Not tested on two real devices** over the network yet (only same-computer tabs + headless).
- The world lives in the host's tab; if it closes, everyone is disconnected.
- PeerJS uses a free public server to connect players and no TURN relay, so some strict
  networks (school/office Wi-Fi) can't connect. Home Wi-Fi is fine.
- **Mirror:** new hair sits on top of the model's built-in hair, which can peek out (the Knight's
  blond fringe, the Mage's long black hair). Hats sit on top of hair — choose hat "None" in the
  wardrobe to show a hairstyle. Skin tones can only darken/tint, so there's no lighter option.
- Pets can't be hurt by your own attacks, never get lost permanently (they hop back to you if
  they fall far behind), and fight in real time rather than in turn-based battles.
- The wardrobe's "outfit" is the same thing as the class shown to others, but it doesn't change
  your skills — those live in your save.
- The family chest in the fort is still a placeholder.

## 6. How we got here (this session, 2026-10-11)

1. Fixed *Create & play* doing nothing on family devices (`crypto.randomUUID` missing on http).
2. Fixed your own character's animations not playing.
3. Added textured grass, moving water, generative music, the wardrobe.
4. Breakable barrels, pit-and-ladder way down, more outfits/buying, ranged attacks, healing
   spring, pet stall.
5. Fixed the ladder dropping you next to the up-stairs and bouncing you back to town; added dodge
   roll, levels/skills, gear bag + weapon drops, blueprints + forge, cooler trees, 4 biomes with
   new enemies and bosses, 20 pets that fight and evolve (including Maple), buy confirmations,
   the level-up bar.
6. Pets: a new look every 5 levels, health bars, fainting + paid revival. The mirror.
