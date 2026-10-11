# Family Dungeon — plan

## Done (scaffold v0.1)
- [x] Vite + three.js project, KayKit assets synced to `public/models`
- [x] Title screen: name + class, new world (optional seed), continue, import/export save, join by code
- [x] Host-authoritative server running in the host's tab; WebRTC invites via PeerJS room code / link
- [x] Saves in the host's localStorage: world seed, day, shared gold, flags, deepest floor per dungeon, each player's hp/weapon/inventory
- [x] Family Fort (bed = heal + save + next day), Pebble Town (shop, mine entrance, sealed gate)
- [x] The Old Mine: 10 seeded floors, rocks with ore, slimes, chests, Stardew-style ladder odds
- [x] Elevator: floor 1 + every 5th floor reached
- [x] Floor 10 King Slime boss → sets `mineCleared` → gate opens to the Sunken Ruins (placeholder, same generator)
- [x] Shop: potions + weapon upgrades, sell loot. Fainting sends you home and costs 10% gold
- [x] Chat, damage numbers, gamepad support, background-tab-safe host tick
- [x] Attack animations generated in Blender (slash / chop / stab / cast), per-weapon speed, hits land on impact
- [x] Weapons visible in hand; slimes don't stack; loot respects walls; refresh-rejoin works
- [x] Painted grass with swaying tufts, animated water with lily pads (`client/nature.js`)
- [x] Generative background music, a mood per location, M to mute, volume in the Esc menu (`client/music.js`)
- [x] Wardrobe in the fort: any outfit + any hat / cape / back item / cape dye (`client/cosmetics.js`)
- [x] Shop tabs: Gear (weapons, shields with block chance, cocoa) and Fashion (hats, wings, dyes)
- [x] Ranged weapons (bow, staff, wand, crossbows, spellbook) shoot arrows / magic bolts
- [x] Breakable barrels with loot (sometimes a slime!); the way down is a pit with a ladder
- [x] Healing spring by the fort (full heal for 5 gold)
- [x] Pets (20 species incl. Maple the Maltipoo) follow you, fight, level up and evolve at 10 / 20 (`shared/pets.js`, P key)
- [x] Pets get a new look every 5 levels, have health (bar over their head + in the HUD), faint, and are revived at the Pet Keeper for gold
- [x] Mirror in the fort: hair style + colour, face extras (glasses, beard...), skin tone (real reflection via three's Reflector)
- [x] Levels, XP bar, skill points (Str/Dex/Magic/Vit); class only sets starting points + weapon (`shared/progression.js`, C key)
- [x] Gear bag: weapons + shields drop in dungeons, anyone can equip anything
- [x] Blueprints drop in dungeons; the forge in town makes forged weapons from ore
- [x] The mine is 40 floors: Old Mine / Frost Caverns / Mushroom Grotto / Lava Depths, a boss every 10 floors, new enemies
- [x] Dodge roll with i-frames (Shift); buy confirmations; low-poly swaying trees
- [x] Fix: arriving next to the up-stairs no longer bounces you straight back to town

## Next up (pick what the family wants)
- [ ] **Real enemies** — KayKit "Skeletons" pack (free tier) uses the same rig, so the generated attacks work on it too
- [ ] Two-handed grip (left hand on the handle) for chop; hit-stop / screen shake on impact
- [ ] **Shared family chest** in the fort (`save.house.storage` already exists)
- [ ] **Fort upgrades** bought with gold (`save.house.level`): bigger room, trophy wall for boss kills
- [ ] **Sound effects** (swing, rock break, coin, slime squish) — music is done
- [ ] **Sunken Ruins content**: its own enemies, props, boss arena
- [ ] Touch controls for tablets
- [ ] Hosting: `npm run build` → upload `dist/` to itch.io (HTML game) so nobody needs the dev server
- [ ] Optional: run `GameServer` in a Web Worker so the host's rendering can't stall the world

## Not verified yet
- Two real devices playing together over the network (only same-computer tabs and headless tests so far)
- Difficulty / economy balance (enemy strength, XP curve, prices, pet power are first guesses)
- How the generative music actually sounds

## Known limits
- The world lives in the host's tab: if the host closes it, guests are disconnected (progress up to the last autosave is kept).
- PeerJS uses a free public broker for the introduction and has no TURN server, so a few strict networks (some school/office Wi-Fi) can't connect. Home networks are almost always fine.
- Dungeon floors reset when everyone leaves them (by design, like Stardew).
- Mirror hair sits on top of the models' built-in hair, which can peek out; hats cover hair; skin tones can only darken/tint.
- The family chest is a placeholder; the Sunken Ruins reuse the mine generator with few unique touches.
- No version control yet: run `git init` and commit before the next round of changes (see HANDOFF.md).
