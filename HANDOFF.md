# Family Dungeon — handover

What's in the game and how it plays. **For how the code works and how to change it safely, read
`AGENTS.md`.** What's next: `todo.md`. Last updated **2026-10-11** (round 2, branch `round-2`).

## State
- `bun run check` passes: lint, 42 tests, build. Versions: `PROTOCOL_VERSION 15`, `SAVE_VERSION 8`
  (saves from v5 upgrade automatically; a v5 fixture is tested).
- Checked in headless Chrome: every place renders without errors, a guest joins over real WebRTC.
- Not yet checked: two real devices on the home Wi-Fi, game balance, and how slow tablets run.

## The game now
| Area | What's there |
|---|---|
| **Pebble Town** | Castle walls and towers, the Family Fort, market square with canopy stalls: Shopkeeper, Blacksmith (forge) next to her, Pet Keeper, Decorator (appears after the King Slime). Fountain, benches, cottages, lamps that light at dusk, villagers walking, 7 townsfolk to talk to (E). Healing spring with fairies and flowers. Training yard: dummy + harmless practice slime. Three dungeon entrances; locked ones are chained, and the chains break in a little cutscene the first time you visit town after unlocking. |
| **Family Fort** | Bigger. A bed per family member (name + quilt colour). Wardrobe, mirror, family chest. Decorate with furniture, wall colours and floors from the Decorator (B at home = build mode: E place, R turn, X pick up). |
| **Dungeons** | Old Mine → Sunken Ruins → Shadow Keep, 100 floors each, 10 biomes each, boss every 10 floors. Finishing floor 100 unlocks the next. Enemies scale with total depth, so each dungeon is harder. Elevator every 5 floors. |
| **Day & night** | 10-minute days. Warnings at 1 min and 30 s; the sky turns to dusk. At nightfall anyone outside the fort faints and loses half their gold; a "Day N" night screen shows. The day also ends when everyone online is in bed (Stardew style). |
| **Money** | Each player has their own gold. Shop tabs: Weapons, Shields, Armor, Food & potions, Fashion, Sell (loot and spare gear). New gear tier every 20 levels. Pet treats at the Pet Keeper. |
| **Characters** | New hairstyles replace the outfit's own hair; fancy clothes (suit & tie, tuxedo, ball gown, royal robe, Sunday best); armor shows as a breastplate + shoulder pads. Low health = you flash red and the screen edges pulse. |
| **Combat** | Area spell (R, once a minute) is bigger (radius 7.5) with a rune-circle shockwave. |
| **Pets** | 20 species shaped like their animals; a new accessory every 5 levels, evolve at 10/20. G feeds the best-fitting treat. |
| **Online** | Positions travel on a fast unreliable WebRTC lane and are interpolated, so guests shouldn't stutter. Esc menu: graphics High/Medium/Fast; F3 shows fps/ping. |

## Controls
WASD move · Space/click attack · Shift roll · E interact · Q eat/drink (smallest heal that's enough) · G feed pet ·
R area spell (rotate in build mode) · B build mode at home · X pick up furniture · C character · P pets ·
Enter chat · M music · F3 stats · Esc menu. Gamepad: A attack, B roll, X interact, Y potion, LB spell, RB feed.

## Running it
`bun install`, then `bun run dev`. Saves live in the host's browser (localStorage); back up with Esc → Download save file.
Don't open `dist/index.html` from disk; use `bun run build` + `bun run preview`, or upload `dist/` to a static host.

## Decisions made this round (see git log for details)
- Bun instead of Node. Gold split evenly when old saves upgrade. Stardew-style sleeping. Next dungeon unlocks
  when the previous one's floor-100 boss falls (saves that already had the Ruins open keep them open — but
  the Ruins now start at depth 101, so they're much harder than before).
- The Decorator unlocks with the King Slime (`DECORATOR_FLAG` in shared/furniture.js; change it there to
  require completing the whole mine instead).
- Pet colour changes every 5 levels were removed (they caused the floating black dots and odd colours).
