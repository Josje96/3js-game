# To do

Most important first. Tick things off in the same commit that does them.

## Check before going live
- [ ] **Everyone refreshes after the round-3 update** (protocol 16): guests on an old tab can't join.
- [ ] Play on two real devices on the home Wi-Fi as a guest: is the stutter gone? (F3 shows fps, ping and
      whether the "fast lane" is up.) If a tablet is slow, try Esc → Graphics → Medium/Fast.
- [ ] Listen to the new sound effects on real speakers — they were only checked for "no console errors",
      never for actually sounding good.
- [ ] Balance pass: 100-floor dungeons, enemy scaling (`enemyPower` in shared/dungeons.js), shop prices
      per tier, armor values, nightfall penalty, and the new deep-ore forge recipes' costs. All first guesses.
- [ ] Old saves: load a real family save (back it up first) and check the v9 room upgrade — beds should
      each sit in their own room, and everyone can style their own room at the Decorator.
- [x] Merge branches `round-2` and `round-3` into `main`.
- [x] Push the dungeon-floor crash fix (86d142f): every dungeon floor was an empty blue room after round 3.

## Asked for, not done yet
- [x] **Blender assets** to make places less repetitive — done in round 3: `tools/blender/make_props.py`
      (`bun run make-props`) builds ten props (mine cart + rails, wooden support, stalagmites, crystal
      clusters, bone piles, produce crates, a well, hay bales, signposts); dungeons scatter them per
      biome, the town map places the town ones. Bridges still want a chasm tile type — not done.
- [ ] Decide the discussion items (below) before building any of them.

## Ideas / smaller things
- [x] Dungeons still look samey within a biome: done in round 3 — rooms get personalities (pillars, cave outcrops, alcoves, great halls) and some corridors are two wide.
- [ ] Unique boss attacks (currently chase / pounce / shoot + summons).
- [x] Forge recipes for deeper ores (mythril, obsidian, starstone) — done in round 3: Mythril Brand & Bulwark, Obsidian Edge, Night Staff, Star Piercer, Star Cleaver; blueprints gate on where the ores spawn.
- [x] Sound effects (hits, coins, chains breaking, night chime) — done in round 3, all generated with WebAudio in `client/sfx.js` (no files); M mutes everything.
- [x] A private room per family member with their own walls, floors and furniture — done in round 3:
      the Decorator styles the whole fort or just your room; furniture is a family pool but only
      placeable in your own room or the hall. Since then: the fort is a square drawn for the
      family's size (a room per member), you can sit on seats, and there are wallpapers + luxury furniture.
      Then: rooms only along the top, one common room, door bottom middle, much smaller; styles
      only ever change the room you pick; sleepers lie head on the pillow; gowns/robes flare so feet stay inside.
      Seasons + a seasonal town boss with epic loot; luxury furniture doubled; stalls/forge/benches solid,
      pets go round solid things, villagers keep off cells with something solid in them.
- [ ] Sitting is a hand-bent pose (the free KayKit rig has no sit clip); the sofa's cushion is a bit
      higher than a chair so you sink in slightly. A per-seat height would need it in the `anim` string.
- [ ] Touch controls for tablets/phones.
- [ ] Villagers are only on each player's own screen; fine, but they can't be talked to.
- [ ] Run `GameServer` in a Web Worker so the host's rendering never stalls the world.
- [x] Town stutter on laptops: the town drew ~750 calls / 3.4M triangles a frame (dungeons ~50 / 0.2M).
      Now ~390 / 1.4M at the busy market: buried block faces trimmed, static builders merged
      (`client/merge.js`), the shadow box fitted to the view, tiny parts cast no shadow, shaders
      compiled on arrival. Still to confirm on the real laptop (F3).
- [ ] Places leak GPU memory: `LocationView.dispose()` never frees the geometries/materials its builders
      make, so every visit to town adds a few hundred buffers. Free what the view created (not cached models).
- [ ] If the town is still heavy: split the whole-town instanced blocks into chunks so off-screen ones are culled.
- [ ] Code-split the build (it's ~940 KB of JS in one file).
- [ ] Type-check the JS (back burner): `checkJs` + `strictNullChecks` via a jsconfig, `tsc --noEmit` in
      `bun run check`, starting with `shared/` and `client/LocationView.js`. Would have caught the null-`home` crash.

## To discuss (no code yet)
- **Desktop app (Electrobun) vs web**: recommendation was to stay web-first (works on every device,
  nothing to install, one build) and maybe wrap later; mobile = PWA (add to home screen) before any app store.
- **Accounts + server saves** and **dedicated server / MMO**: a small always-on server (Bun) that runs the
  same `GameServer` would solve "the world lives in the host's tab", enable accounts and cloud saves, and
  remove WebRTC/NAT issues. Needs hosting, logins, moderation and child-privacy care (COPPA if kids
  outside the family play). A full MMO is a much bigger step.
- **Ads + $1.99/month premium**: ads aimed at children have strict rules (COPPA, app-store kids policies);
  consider a one-time purchase or cosmetic-only supporter pack instead. Needs accounts first.
