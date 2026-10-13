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
| **Pebble Town** | Castle walls and towers, the Family Fort, market square with canopy stalls: Shopkeeper, Blacksmith (forge) next to her, Pet Keeper, Decorator (appears after the King Slime). Fountain, benches, cottages, lamps that light at dusk, villagers walking, 7 townsfolk to talk to (E). The healing spring (50 gold: a full heal and 2 minutes of 🍀 luck — +25% gold from monsters, a 10% lucky crit, gear drops twice as often; `LUCK_*` in config.js, the HUD counts it down) is a round pond you can wade into: stone banks, reeds and cattails, lily pads, fairies and flowers (no glow ring: it's meant to feel calm and safe). Cottages fill a 2x2 block of cells so their doors are taller than a person. Training yard: dummy + harmless practice slime, hay bales. Three dungeon entrances (each with a signpost); locked ones are chained, and the chains break in a little cutscene the first time you visit town after unlocking. |
| **Family Fort** | Snug: a bedroom (3x3 cells) in each corner — two along the top, two along the bottom (more pairs side by side for bigger families) — the common room across the middle (a dressing corner with the wardrobe, mirror and family chest side by side, and a long feast table: E asks if you'd like food for 10 gold — yes sits you down and heals half your health; the table and benches are solid), and the front door in the middle of the bottom wall down a little passage. 11x14 cells for up to 4 people. Bed slots: 0 top-left, 1 bottom-left, 2 top-right, 3 bottom-right... so rooms never move. Nothing stands in front of a bedroom doorway (tested). Sit on chairs, stools, sofas, armchairs and the throne (E) — and on the town's fountain benches. Wallpapers (patterned, 900–2400 gold) and a ✨ Luxury tab of 25 pieces (1800–12000 gold: chandelier, bear rug, suit of armour, pipe organ, dragon’s hoard, throne...). Buy at the Decorator (furniture, wall colours/wallpapers, floors — all a family pool; buying puts nothing up). At home, B = build mode: 🛋 furniture (E place, R turn, X pick up; your own room or the common room), and 🎨 Walls / 🪵 Floors put an owned style up in the room you're standing in — only your own bedroom or the common room. A bedroom nobody styled stays plain stone and oak. |
| **Dungeons** | Old Mine → Sunken Ruins → Shadow Keep, 100 floors each, 10 biomes each, boss every 10 floors. Finishing floor 100 unlocks the next. Enemies scale with total depth, so each dungeon is harder. Elevator every 5 floors. |
| **Seasons** | The calendar is the Pebblewick Reckoning: 120-day years ("Year 2 · Day 86" in the HUD, night screen and save list; `calendar()` in `shared/seasons.js`), exactly four 30-day seasons (spring, summer, autumn, winter), so every year starts on the first day of spring, worked out from the day number (HUD shows the season by the night clock). On day 1 of each season that season's boss visits town for the day only, leashed to the grass south-east of the market (`SEASON_ARENA`): the Blossom Colossus (a walking blossom treant), the Sunscale Wyrm (a sun serpent with a blazing halo), the Harvest King (a pumpkin-headed scarecrow king with a scythe and a crow) and the Frost Titan (a giant of ice crystals) — bodies you meet nowhere else (`SEASON_BODIES` in client/enemies.js). Very tough (scaled to the family's highest level, ~2.5x the last dungeon boss); beating it drops gold, a blueprint and one epic piece per fighter (`epic: true` items, never in shops, sell for ~30k). `systems/seasons.js`; the day it was beaten is `flags.seasonBossBeaten`. | Outdoors in town the season shows (`client/seasonfx.js`): the grass and trees recolour in their shaders (fresh spring green, warm summer gold with sun rays, golden-orange autumn, snowy winter; the pink blossom trees only flower in spring) and petals, sun motes, falling leaves or snow drift round the player.
| **Seasonal Trader** | A stall in the town square (`V` on the map) dressed for the season (blossom / sun / pumpkins / snow). Sells only this season’s things at twice the normal price (they’re rare): a treat (heals), a fancy outfit (8 seasonal outfits, never in the fashion shop; try them on) and three fort decorations, from a pool of 2 treats + 2 outfits + 6 decorations per season; the stall rotates through 5 sets, a new one every 6 days (`shared/seasonal.js`, `systems/seasonaltrader.js`). Seasonal decorations aren't sold by the Decorator. |
| **Enchanter** | A shady hooded figure under a dark tent in the town's far bottom-right corner (`e` on the map). Gold + ore + Arcane Essence enchant a weapon up to +5 (`shared/enchant.js`): +15% of its damage a level (at least +1), and it looks different every level (glow, bigger, sparkles at +3, flames at +4, golden flames at +5: `client/enchant.js`). Essence is rare on purpose: bosses 2+ (seasonal boss 6), chests 20%, monsters ~1-3% from floor 5. Levels are per player and weapon (`enchants`, save v11); selling a weapon loses its enchant. |
| **Bank** | The Banker's booth on the east side of the town square (`$` on the map). Opening an account costs 250 gold (`BANK_OPEN_FEE`); then deposit / withdraw, and gold in the bank is never lost when you faint (only your purse is). Send gold from your account to any family member, even offline: into their bank, or their purse if they have none. `systems/bank.js`, player field `bank` (null = no account, save v12). The HUD shows 🏦 next to your gold. |
| **Gems** | Rare sparkly ore rocks (stone with glowing crystal clusters and twinkling glints): Amethyst (floor 4+), Sapphire, Emerald, Ruby, Rainbow Opal (shifts colour, depth 120+). Sell for 40–320 each. Metal ores glint too. Weights in `oresFor`, looks in `RockView` (client/views.js). |
| **Town fun** | Townhouses along the square's north side, a tiled mosaic round the fountain, stone flower planters, a market cart and a notice board (E: the date and when the next seasonal boss comes). A maypole on the fountain with bunting to every lamp and round the square, butterflies over the flower beds, chimney smoke (`client/townfun.js`; all overhead or flying, nothing to bump into). |
| **Using decorations** | E on furniture does something (`USES` in shared/furniture.js): the piano, organ, harp and music box play tunes with notes floating up, the globe spins, the rocking horse rocks, the bird sings, fish get fed, the crystal ball tells fortunes, the telescope spots things, the clock tells the time to nightfall, the toy box and trunk turn things up; the bathtub fills/empties and lamps, candles, the chandelier, the fireplace and the fountain switch on/off (`on` on the entity, until the fort reloads). |
| **Day & night** | 10-minute days. Warnings at 1 min and 30 s (with chimes); the sky turns to dusk. At nightfall anyone outside the fort faints and loses half their gold; a "Day N" night screen shows. The day also ends when everyone online is in bed (Stardew style): your bed asks how long to sleep (until morning, 2, 3, 5, 7 or 14 days); the night lasts the fewest days anyone picked, and a new season always wakes you on its first day (its boss). The HUD shows "N days until <next season>" under the calendar. |
| **Money** | Each player has their own gold. The Shopkeeper sells food & potions and fashion and buys loot and spare gear; the Blacksmith sells weapons, shields and armor (a new tier every 20 levels) and forges blueprint gear — forged weapons have a perk (Keen crits, Vampiric heals, Frostbite freezes, Giant-slayer hits bosses harder; `PERKS` in shared/items.js). Pet treats at the Pet Keeper. The forge also makes blueprint gear from deep ores (mythril, obsidian, starstone) — mining down is the cheap path to late gear. |
| **Characters** | New hairstyles replace the outfit’s own hair, with eyebrows in the hair colour; fancy clothes (suit & tie and tuxedo with a free choice of tie colour, ball gown, royal robe, Sunday best, pirate captain, princess gown, wizard robe, chef whites, farmer overalls, summer dress) go over armor; armor shows as a breastplate + shoulder pads. Low health = you flash red and the screen edges pulse. |
| **Combat** | Area spell (R, once a minute) is bigger (radius 7.5) with a rune-circle shockwave. |
| **Pets** | 20 species modelled on the real animal (sculpted bodies, feathers, fur, real eyes). Level up to 100; a new accessory every 5 levels (stars, crown, halo, wings, gems, a little moon, a legendary rainbow aura at 100), evolve at 10/20. G feeds the best-fitting treat. |
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
