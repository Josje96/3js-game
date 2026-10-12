# Family Dungeon — handover

What's in the game and how it plays. **For how the code works and how to change it safely, read
`AGENTS.md`.** What's next: `todo.md`. Last updated **2026-10-11** (round 3, branch `round-3`).

## State
- `bun run check` passes: lint, 49 tests, build. Versions: `PROTOCOL_VERSION 15`, `SAVE_VERSION 8`
  (saves from v5 upgrade automatically; a v5 fixture is tested). Round 3 changed neither.
- Checked in headless Chrome: every place renders without errors, a guest joins over real WebRTC.
- Not yet checked: two real devices on the home Wi-Fi, game balance, and how slow tablets run.

## The game now
| Area | What's there |
|---|---|
| **Pebble Town** | Castle walls and towers, the Family Fort, market square with canopy stalls: Shopkeeper, Blacksmith (forge) next to her, Pet Keeper, Decorator (appears after the King Slime). Fountain, benches, cottages, lamps that light at dusk, villagers walking, 7 townsfolk to talk to (E). Healing spring with fairies and flowers. Training yard: dummy + harmless practice slime. Three dungeon entrances; locked ones are chained, and the chains break in a little cutscene the first time you visit town after unlocking. |
| **Family Fort** | Bigger. A bed per family member (name + quilt colour). Wardrobe, mirror, family chest. Decorate with furniture, wall colours and floors from the Decorator (B at home = build mode: E place, R turn, X pick up). |
| **Dungeons** | Old Mine → Sunken Ruins → Shadow Keep, 100 floors each, 10 biomes each, boss every 10 floors. Finishing floor 100 unlocks the next. Enemies scale with total depth, so each dungeon is harder. Elevator every 5 floors. |
| **Day & night** | 10-minute days. Warnings at 1 min and 30 s; the sky turns to dusk. At nightfall anyone outside the fort faints and loses half their gold; a "Day N" night screen shows. The day also ends when everyone online is in bed (Stardew style). |
| **Money** | Each player has their own gold. Shop tabs: Weapons, Shields, Armor, Food & potions, Fashion, Sell (loot and spare gear). New gear tier every 20 levels. Pet treats at the Pet Keeper. The forge also makes blueprint gear from deep ores (mythril, obsidian, starstone) — mining down is the cheap path to late gear. |
| **Characters** | New hairstyles replace the outfit's own hair; fancy clothes (suit & tie, tuxedo, ball gown, royal robe, Sunday best); armor shows as a breastplate + shoulder pads. Low health = you flash red and the screen edges pulse. |
| **Combat** | Area spell (R, once a minute) is bigger (radius 7.5) with a rune-circle shockwave. |
| **Pets** | 20 species shaped like their animals; a new accessory every 5 levels, evolve at 10/20. G feeds the best-fitting treat. |
| **Sound** | Generative music *and* effects (client/sfx.js): hits, coins, rocks, the forge clang, chains breaking, night chimes, level-up fanfares. M mutes everything; one volume slider. |
| **Dungeon flavour** | Rooms have personalities (pillars, cave outcrops, alcoves, great halls, wide corridors) and each biome scatters generated props — mine carts, rails, stalagmites, crystals, bone piles; Pebble Town has hay bales, market crates and signposts. |
| **Online** | Positions travel on a fast unreliable WebRTC lane and are interpolated, so guests shouldn't stutter. Esc menu: graphics High/Medium/Fast; F3 shows fps/ping. |

## Controls
WASD move · Space/click attack · Shift roll · E interact · Q eat/drink (smallest heal that's enough) · G feed pet ·
R area spell (rotate in build mode) · B build mode at home · X pick up furniture · C character · P pets ·
Enter chat · M music · F3 stats · Esc menu. Gamepad: A attack, B roll, X interact, Y potion, LB spell, RB feed.

## Running it
`bun install`, then `bun run dev`. Saves live in the host's browser (localStorage); back up with Esc → Download save file.
Don't open `dist/index.html` from disk; use `bun run build` + `bun run preview`, or upload `dist/` to a static host.

## Decisions made this round (see git log for details)
- **Hair carve fixed** (the bug where hair covered the eyes): skin matching now includes the shadowed
  skin swatch, and the face-keep window is tight around the measured eye/brow band of each outfit
  (`FACE_HI_PER_OUTFIT` in cosmetics.js — add an entry if a new outfit's face sits elsewhere). The
  Barbarian keeps his whole beard under any hairstyle.
- **Forge recipes for deep ores**: blueprints gate on the depth where their ore actually spawns
  (`FORGE_RECIPES` in shared/items.js); a rules test enforces that, and caught two old recipes
  (silverbow/slimewand) gating a floor before their ore existed.
- **Props are Blender-built**: `bun run make-props` regenerates `assets/generated/props/*.glb`; the
  .glb files are committed so CI tests see them. Dungeons pick flavour props per theme
  (`THEME_PROPS` in shared/mapgen.js); re-rocked room cells must keep the floor connected (flood
  fill undoes them) and boss arenas are never touched.
- **Effects are generated too** (no audio files anywhere). Everything routes through the music's
  master gain, so the Esc-menu volume slider and M cover effects as well.
