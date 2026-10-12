# To do

Most important first. Tick things off in the same commit that does them.

## Check before going live
- [ ] Play on two real devices on the home Wi-Fi as a guest: is the stutter gone? (F3 shows fps, ping and
      whether the "fast lane" is up.) If a tablet is slow, try Esc → Graphics → Medium/Fast.
- [ ] Balance pass: 100-floor dungeons, enemy scaling (`enemyPower` in shared/dungeons.js), shop prices
      per tier, armor values, nightfall penalty. All first guesses.
- [ ] Old saves: load a real family save (back it up first) and check the gold split, beds and dungeon
      unlocks look right. The Ruins are now much harder for saves that already had them open.
- [ ] Merge branch `round-2` into `main`, push, let GitHub Actions run `bun run check`.

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
- [ ] Touch controls for tablets/phones.
- [ ] Villagers are only on each player's own screen; fine, but they can't be talked to.
- [ ] Run `GameServer` in a Web Worker so the host's rendering never stalls the world.
- [ ] Code-split the build (it's ~850 KB of JS in one file).

## To discuss (no code yet)
- **Desktop app (Electrobun) vs web**: recommendation was to stay web-first (works on every device,
  nothing to install, one build) and maybe wrap later; mobile = PWA (add to home screen) before any app store.
- **Accounts + server saves** and **dedicated server / MMO**: a small always-on server (Bun) that runs the
  same `GameServer` would solve "the world lives in the host's tab", enable accounts and cloud saves, and
  remove WebRTC/NAT issues. Needs hosting, logins, moderation and child-privacy care (COPPA if kids
  outside the family play). A full MMO is a much bigger step.
- **Ads + $1.99/month premium**: ads aimed at children have strict rules (COPPA, app-store kids policies);
  consider a one-time purchase or cosmetic-only supporter pack instead. Needs accounts first.
