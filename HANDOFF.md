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
| **Pebble Town** | Castle walls and towers, the Family Fort, market square with canopy stalls: Shopkeeper, Blacksmith (forge) next to her, Pet Keeper, Decorator (appears after the King Slime). Fountain, benches, cottages, lamps that light at dusk, villagers walking, 7 townsfolk to talk to (E). The healing spring is a round pond you can wade into: stone banks, reeds and cattails, lily pads, fairies and flowers (no glow ring: it's meant to feel calm and safe). Cottages fill a 2x2 block of cells so their doors are taller than a person. Training yard: dummy + harmless practice slime, hay bales. Three dungeon entrances (each with a signpost); locked ones are chained, and the chains break in a little cutscene the first time you visit town after unlocking. |
| **Family Fort** | Snug: a row of small private rooms along the top (one per family member, added as people join: a bed with their name and quilt colour), one common room below (wardrobe, mirror, family chest, table), front door in the middle of the bottom wall. Small rooms (2x2 cells); the common room deepens as the fort widens, so it stays near square: 7x8 cells for 1–2 people, 10x10 for 3, 13x10 for 4. Sit on chairs, stools, sofas, armchairs and the throne (E) — and on the town's fountain benches. Wallpapers (patterned, 900–2400 gold) and a ✨ Luxury tab of furniture (1800–8000 gold). Buy at the Decorator (furniture, wall colours/wallpapers, floors — all a family pool; buying puts nothing up). At home, B = build mode: 🛋 furniture (E place, R turn, X pick up; your own room or the common room), and 🎨 Walls / 🪵 Floors put an owned style up in the room you're standing in — only your own bedroom or the common room. A bedroom nobody styled stays plain stone and oak. |
| **Dungeons** | Old Mine → Sunken Ruins → Shadow Keep, 100 floors each, 10 biomes each, boss every 10 floors. Finishing floor 100 unlocks the next. Enemies scale with total depth, so each dungeon is harder. Elevator every 5 floors. |
| **Seasons** | A 365-day calendar ("Year 2 · Day 86" in the HUD, night screen and save list; `calendar()` in `shared/seasons.js`). Spring, summer, autumn, winter: 30 days each (a 120-day cycle, so seasons don't line up with the 365-day year), worked out from the day number (HUD shows the season by the night clock). On day 1 of each season that season's boss visits town for the day only, leashed to the grass south-east of the market (`SEASON_ARENA`): Blossom Colossus, Sunscale Wyrm, Harvest King, Frost Titan. Very tough (scaled to the family's highest level, ~2.5x the last dungeon boss); beating it drops gold, a blueprint and one epic piece per fighter (`epic: true` items, never in shops, sell for ~30k). `systems/seasons.js`; the day it was beaten is `flags.seasonBossBeaten`. |
| **Enchanter** | A shady hooded figure under a dark tent in the town's far bottom-right corner (`e` on the map). Gold + ore + Arcane Essence enchant a weapon up to +5 (`shared/enchant.js`): +15% of its damage a level (at least +1), and it looks different every level (glow, bigger, sparkles at +3, flames at +4, golden flames at +5: `client/enchant.js`). Essence is rare on purpose: bosses 2+ (seasonal boss 6), chests 20%, monsters ~1-3% from floor 5. Levels are per player and weapon (`enchants`, save v11); selling a weapon loses its enchant. |
| **Town fun** | A maypole on the fountain with bunting to every lamp and round the square, butterflies over the flower beds, chimney smoke (`client/townfun.js`; all overhead or flying, nothing to bump into). |
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
- **The fort is drawn for the family's size** (`shared/fort.js`, not maps.js): rooms = bed slots in
  use (max 10, then people share). The host sends the count with `enter` (`opts.rooms`) because
  clients build layouts themselves. Someone new joining redraws the fort (`rebuildFort`). Furniture
  is saved relative to its room or the hall (`room`, `dx`, `dz`, save v10), and a piece that no
  longer fits goes back to the family's owned pile rather than vanishing.
- **Forge recipes for deep ores**: blueprints gate on the depth where their ore actually spawns
  (`FORGE_RECIPES` in shared/items.js); a rules test enforces that, and caught two old recipes
  (silverbow/slimewand) gating a floor before their ore existed.
- **Props are Blender-built**: `bun run make-props` regenerates `assets/generated/props/*.glb`; the
  .glb files are committed so CI tests see them. Dungeons pick flavour props per theme
  (`THEME_PROPS` in shared/mapgen.js); re-rocked room cells must keep the floor connected (flood
  fill undoes them) and boss arenas are never touched.
- **Effects are generated too** (no audio files anywhere). Everything routes through the music's
  master gain, so the Esc-menu volume slider and M cover effects as well.
