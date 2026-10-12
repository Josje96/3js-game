# Family Dungeon — handover

What's in the game and how it plays. **For how the code works and how to change it safely, read
`AGENTS.md`.** What's next: `todo.md`. Last updated **2026-10-11** (round 3, branch `round-3`).

## State
- `bun run check` passes: lint, 50 tests, build. Versions: `PROTOCOL_VERSION 16`, `SAVE_VERSION 9`
  (saves from v5 upgrade automatically; v5 and v9 fixtures are tested). **Everyone must refresh**
  after this update, and the host's save upgrades itself on load.
- Checked in headless Chrome: every place renders without errors, a guest joins over real WebRTC.
- Not yet checked: two real devices on the home Wi-Fi, game balance, and how slow tablets run.

## The game now
| Area | What's there |
|---|---|
| **Pebble Town** | Castle walls and towers, the Family Fort, market square with canopy stalls: Shopkeeper, Blacksmith (forge) next to her, Pet Keeper, Decorator (appears after the King Slime). Fountain, benches, cottages, lamps that light at dusk, villagers walking, 7 townsfolk to talk to (E). The healing spring is a real pond — fully water, wade in — with fairies, flowers and a halo of magic around the edge. Training yard: dummy + harmless practice slime, hay bales. Three dungeon entrances (each with a signpost); locked ones are chained, and the chains break in a little cutscene the first time you visit town after unlocking. |
| **Family Fort** | A shared hall plus a private room per family member (a bed with their name and quilt colour; whoever claims a bed claims the room). Wardrobe, mirror and family chest in the hall. Decorate from the Decorator: furniture (family pool — but you can only place pieces in your own room or the hall), wall colours and floors for the whole fort *or* just your own room (B at home = build mode: E place, R turn, X pick up). |
| **Dungeons** | Old Mine → Sunken Ruins → Shadow Keep, 100 floors each, 10 biomes each, boss every 10 floors. Finishing floor 100 unlocks the next. Enemies scale with total depth, so each dungeon is harder. Elevator every 5 floors. |
| **Day & night** | 10-minute days. Warnings at 1 min and 30 s (with chimes); the sky turns to dusk. At nightfall anyone outside the fort faints and loses half their gold; a "Day N" night screen shows. The day also ends when everyone online is in bed (Stardew style). |
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
Enter chat · M sound · F3 stats · Esc menu. Gamepad: A attack, B roll, X interact, Y potion, LB spell, RB feed.

## Running it
`bun install`, then `bun run dev`. Saves live in the host's browser (localStorage); back up with Esc → Download save file.
Don't open `dist/index.html` from disk; use `bun run build` + `bun run preview`, or upload `dist/` to a static host.

## Decisions made this round (see git log for details)
- **Hair carve fixed twice over**: first the skin-swatch/window fix (below), then the scalp ball —
  it used to be sized from the head mesh (hair included) so it leaned over the eyes from the
  three-quarter camera; it now plugs only the top of the skull, behind the eye plane (`scalpOf` in
  cosmetics.js).
- **Dungeons unlock on 100-floor completions** (kept after discussion): beat all floors of one
  dungeon and the next one's chains break. The King Slime only summons the Decorator.
- **Private rooms**: room = bed slot index; ownership lives in `save.house.beds`, styles in
  `save.house.roomStyles` (both keyed the same way). `roomIndexAt` in shared/locations.js decides
  which room a cell belongs to; the map's `rooms` list must cover every `B` bed slot (tested).
- **Forge recipes for deep ores**: blueprints gate on the depth where their ore actually spawns
  (`FORGE_RECIPES` in shared/items.js); a rules test enforces that, and caught two old recipes
  (silverbow/slimewand) gating a floor before their ore existed.
- **Props are Blender-built**: `bun run make-props` regenerates `assets/generated/props/*.glb`; the
  .glb files are committed so CI tests see them. Dungeons pick flavour props per theme
  (`THEME_PROPS` in shared/mapgen.js); re-rocked room cells must keep the floor connected (flood
  fill undoes them) and boss arenas are never touched.
- **Effects are generated too** (no audio files anywhere). Everything routes through the music's
  master gain, so the Esc-menu volume slider and M cover effects as well.
