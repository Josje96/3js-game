// Dungeon definitions. Floors are generated from the world seed by mapgen.js, so no level data
// is stored. Each dungeon is 100 floors: ten BIOMES of 10 floors, a boss on every 10th floor.
// Beating a biome's boss opens a ladder further down and sets its `flag`. Beating the floor-100
// boss completes the dungeon and breaks the chains on the next one (see server/systems/dungeons.js).
//
// Every dungeon is harder than the one before: enemies grow with the *total depth* (the mine's
// floor 100 is depth 100, the ruins' floor 1 is depth 101...). See enemyPower below.
//
// Adding a biome: add it to a dungeon's `biomes` (and a visual theme in client/LocationView.js
// THEMES + a music mood in client/music.js). Adding an enemy: ENEMIES below (+ a body in
// client/enemies.js if it isn't a slime). Ids and flags are stored in saves: never rename them.

export const BIOME_FLOORS = 10;
export const DUNGEON_FLOORS = 100;

const biome = (name, theme, enemies, boss, ores) => ({ name, theme, enemies: typeof enemies === 'function' ? enemies : () => enemies, boss, ores });

export const DUNGEONS = {
  mine: {
    name: 'The Old Mine', depth: 0, unlockedBy: null, entrance: 'm',
    biomes: [
      biome('The Old Mine', 'dungeon', (f) => (f <= 3 ? ['green'] : f <= 6 ? ['green', 'blue', 'bat'] : ['blue', 'red', 'bat']),
        { variant: 'king', name: 'King Slime', flag: 'mineCleared' }),
      biome('Frost Caverns', 'frost', ['iceslime', 'bat', 'yeti'], { variant: 'frostgiant', name: 'Frost Giant', flag: 'frostCleared' }),
      biome('Mushroom Grotto', 'grotto', ['shroom', 'spider', 'purple'], { variant: 'shroomking', name: 'Mushroom King', flag: 'grottoCleared' }),
      biome('Lava Depths', 'lava', ['imp', 'golem', 'firebat'], { variant: 'dragon', name: 'Lava Dragon', flag: 'lavaCleared' }),
      biome('Crystal Hollow', 'crystal', ['crystalslime', 'crystalgolem', 'bat'], { variant: 'colossus', name: 'Crystal Colossus', flag: 'mineBoss5' }),
      biome('Bone Crypt', 'bone', ['skeleton', 'ghost', 'bat'], { variant: 'skeletonking', name: 'Skeleton King', flag: 'mineBoss6' }),
      biome('Spider Nest', 'nest', ['spider', 'broodspider', 'black'], { variant: 'spiderqueen', name: 'Spider Queen', flag: 'mineBoss7' }),
      biome('Golden Vault', 'gold', ['goldslime', 'goldgolem', 'imp'], { variant: 'treasuregolem', name: 'Treasure Golem', flag: 'mineBoss8' }),
      biome('Shadow Mines', 'shadow', ['ghost', 'shadowslime', 'shadowimp'], { variant: 'shadowlord', name: 'Shadow Lord', flag: 'mineBoss9' }),
      biome('Heart of the Mountain', 'magma', ['golem', 'firebat', 'imp', 'crystalgolem'], { variant: 'ancientdragon', name: 'Ancient Dragon', flag: 'mineBoss10' }),
    ],
  },

  // Opens when the Old Mine is completed (its floor-100 boss).
  ruins: {
    name: 'Sunken Ruins', depth: 100, unlockedBy: 'mine', entrance: 'g',
    biomes: [
      biome('Sunken Ruins', 'ruins', (f) => (f <= 5 ? ['purple', 'bat', 'crab'] : ['black', 'spider', 'crab']), { variant: 'emperor', name: 'Slime Emperor', flag: 'ruinsCleared' }),
      biome('Coral Halls', 'coral', ['crab', 'blue', 'iceslime'], { variant: 'crabking', name: 'Crab King', flag: 'ruinsBoss2' }),
      biome('Drowned Library', 'library', ['ghost', 'skeleton', 'shroom'], { variant: 'scholar', name: 'Haunted Scholar', flag: 'ruinsBoss3' }),
      biome('Kelp Forest', 'kelp', ['kelpshroom', 'crab', 'green'], { variant: 'kelpgiant', name: 'Kelp Giant', flag: 'ruinsBoss4' }),
      biome('Pearl Palace', 'pearl', ['pearlslime', 'ghost', 'crab'], { variant: 'pearlgolem', name: 'Pearl Golem', flag: 'ruinsBoss5' }),
      biome('Ghost Ship', 'bone', ['skeleton', 'ghost', 'bat'], { variant: 'captain', name: 'Ghost Captain', flag: 'ruinsBoss6' }),
      biome('Tide Caves', 'frost', ['iceslime', 'crab', 'yeti'], { variant: 'seayeti', name: 'Sea Yeti', flag: 'ruinsBoss7' }),
      biome('Abyssal Trench', 'abyss', ['ghost', 'broodspider', 'shadowslime'], { variant: 'watcher', name: 'Abyss Watcher', flag: 'ruinsBoss8' }),
      biome('Sunken Temple', 'gold', ['goldgolem', 'skeleton', 'imp'], { variant: 'guardian', name: 'Temple Guardian', flag: 'ruinsBoss9' }),
      biome('Leviathan’s Lair', 'abyss', ['crab', 'ghost', 'iceslime', 'shadowslime'], { variant: 'leviathan', name: 'The Leviathan', flag: 'ruinsBoss10' }),
    ],
  },

  // Opens when the Sunken Ruins are completed. The last and hardest.
  keep: {
    name: 'Shadow Keep', depth: 200, unlockedBy: 'ruins', entrance: 'q',
    biomes: [
      biome('Castle Gates', 'keep', ['skeleton', 'bat', 'golem'], { variant: 'gatekeeper', name: 'The Gatekeeper', flag: 'keepBoss1' }),
      biome('The Armory', 'keep', ['skeleton', 'imp', 'spider'], { variant: 'ironknight', name: 'Iron Knight', flag: 'keepBoss2' }),
      biome('Dungeon Cells', 'dungeon', ['ghost', 'broodspider', 'black'], { variant: 'jailer', name: 'The Jailer', flag: 'keepBoss3' }),
      biome('Haunted Halls', 'bone', ['ghost', 'skeleton', 'shadowslime'], { variant: 'banshee', name: 'The Banshee', flag: 'keepBoss4' }),
      biome('Alchemy Labs', 'grotto', ['goldslime', 'crystalslime', 'shroom', 'imp'], { variant: 'alchemist', name: 'Mad Alchemist', flag: 'keepBoss5' }),
      biome('Frozen Tower', 'frost', ['yeti', 'iceslime', 'ghost'], { variant: 'icewyrm', name: 'Ice Wyrm', flag: 'keepBoss6' }),
      biome('Burning Library', 'lava', ['imp', 'firebat', 'ghost'], { variant: 'firelich', name: 'Fire Lich', flag: 'keepBoss7' }),
      biome('Throne Approach', 'gold', ['skeleton', 'goldgolem', 'shadowimp'], { variant: 'royalguard', name: 'Royal Guard', flag: 'keepBoss8' }),
      biome('Shadow Sanctum', 'shadow', ['ghost', 'shadowimp', 'shadowslime'], { variant: 'wraith', name: 'Shadow Wraith', flag: 'keepBoss9' }),
      biome('The Dark Throne', 'throne', ['shadowimp', 'skeleton', 'crystalgolem', 'ghost'], { variant: 'shadowking', name: 'The Shadow King', flag: 'keepBoss10' }),
    ],
  },
};

for (const [id, d] of Object.entries(DUNGEONS)) {
  d.id = id;
  d.floors = d.biomes.length * BIOME_FLOORS;
  d.next = Object.keys(DUNGEONS).find((k) => DUNGEONS[k].unlockedBy === id) ?? null; // whose chains break when this one is done
}

/** Ore you can mine: deeper floors have better rocks. Weights by total depth. */
export function oresFor(depth) {
  // gems (amethyst → opal) are the rare sparkly ones
  if (depth <= 3) return { stone: 6, copper: 3 };
  if (depth <= 6) return { stone: 4, copper: 3, silver: 2, amethyst: 0.4 };
  if (depth <= 20) return { stone: 3, silver: 3, goldore: 2, amethyst: 0.8, sapphire: 0.3 };
  if (depth <= 50) return { stone: 2, silver: 3, goldore: 3, mythril: 1, amethyst: 0.6, sapphire: 0.7, emerald: 0.3 };
  if (depth <= 120) return { stone: 2, goldore: 3, mythril: 3, obsidian: 1, sapphire: 0.6, emerald: 0.7, ruby: 0.3 };
  if (depth <= 200) return { stone: 1, goldore: 2, mythril: 3, obsidian: 3, starstone: 1, emerald: 0.6, ruby: 0.7, opal: 0.25 };
  return { stone: 1, mythril: 2, obsidian: 3, starstone: 3, ruby: 0.7, opal: 0.5 };
}

/** Total depth: how far down this floor is across all dungeons (sets how tough things are). */
export function depthOf(dungeonId, floor) {
  return (DUNGEONS[dungeonId]?.depth ?? 0) + floor;
}

/** How much tougher enemies are at a depth than on mine floor 1 (health, damage, gold). */
export function enemyPower(depth) {
  const d = Math.max(0, depth - 1);
  return { hp: 1 + d * 0.045, damage: 1 + d * 0.035, gold: 1 + d * 0.05 };
}

/**
 * Every enemy. (They're all `type: 'slime'` entities on the server — slimes came first.)
 * Stats are for mine floor 1 and grow with depth (enemyPower). Bosses are much tougher.
 * `ai`: chase | flutter (erratic flier) | pounce (wind up, then lunge) | shooter (keeps away, throws fire)
 * `body`: which model the client builds (missing = a slime). `tint` recolours a body. `color` = slime colour.
 */
export const ENEMIES = {
  green:      { hp: 6,   damage: 1,  speed: 2.6, gold: [1, 3],  ai: 'chase' },
  blue:       { hp: 11,  damage: 2,  speed: 3.0, gold: [2, 5],  ai: 'chase' },
  red:        { hp: 16,  damage: 2,  speed: 3.4, gold: [4, 7],  ai: 'chase' },
  purple:     { hp: 16,  damage: 2,  speed: 3.4, gold: [4, 7],  ai: 'chase' },
  black:      { hp: 22,  damage: 3,  speed: 3.8, gold: [6, 10], ai: 'chase' },
  bat:        { hp: 7,   damage: 2,  speed: 5.2, gold: [2, 4],  ai: 'flutter', body: 'bat', fly: true },
  iceslime:   { hp: 22,  damage: 3,  speed: 3.2, gold: [5, 9],  ai: 'chase' },
  yeti:       { hp: 38,  damage: 4,  speed: 2.4, gold: [8, 13], ai: 'chase', body: 'yeti', r: 1.0 },
  shroom:     { hp: 26,  damage: 3,  speed: 2.2, gold: [6, 10], ai: 'chase', body: 'shroom' },
  spider:     { hp: 22,  damage: 4,  speed: 3.0, gold: [7, 12], ai: 'pounce', body: 'spider' },
  imp:        { hp: 22,  damage: 3,  speed: 3.2, gold: [8, 12], ai: 'shooter', body: 'imp', fly: true },
  golem:      { hp: 60,  damage: 5,  speed: 1.9, gold: [11, 17], ai: 'chase', body: 'golem', r: 1.1 },
  firebat:    { hp: 17,  damage: 3,  speed: 5.6, gold: [7, 11], ai: 'flutter', body: 'bat', fly: true, fire: true },
  // deeper places
  crystalslime: { hp: 24, damage: 3, speed: 3.4, gold: [8, 12], ai: 'chase', color: 0xc8a8ff },
  crystalgolem: { hp: 55, damage: 5, speed: 2.0, gold: [12, 18], ai: 'chase', body: 'golem', tint: 0xb48cff, r: 1.1 },
  skeleton:   { hp: 28,  damage: 4,  speed: 3.1, gold: [9, 14], ai: 'chase', body: 'skeleton' },
  ghost:      { hp: 20,  damage: 4,  speed: 3.6, gold: [9, 14], ai: 'flutter', body: 'ghost', fly: true },
  broodspider:{ hp: 24,  damage: 4,  speed: 3.4, gold: [9, 14], ai: 'pounce', body: 'spider', tint: 0x6a3a8a },
  goldslime:  { hp: 26,  damage: 3,  speed: 3.6, gold: [20, 30], ai: 'chase', color: 0xffd23f },
  goldgolem:  { hp: 60,  damage: 5,  speed: 1.9, gold: [20, 30], ai: 'chase', body: 'golem', tint: 0xffd23f, r: 1.1 },
  shadowslime:{ hp: 26,  damage: 4,  speed: 3.8, gold: [10, 15], ai: 'chase', color: 0x3a2a5a },
  shadowimp:  { hp: 24,  damage: 4,  speed: 3.4, gold: [10, 15], ai: 'shooter', body: 'imp', tint: 0x7a52b8, fly: true },
  crab:       { hp: 26,  damage: 4,  speed: 3.0, gold: [9, 14], ai: 'chase', body: 'crab' },
  kelpshroom: { hp: 26,  damage: 3,  speed: 2.4, gold: [8, 12], ai: 'chase', body: 'shroom', tint: 0x4fae6a },
  pearlslime: { hp: 24,  damage: 3,  speed: 3.4, gold: [10, 15], ai: 'chase', color: 0xffe0ee },

  // the training yard's slime in town: never hurts anyone (see server/systems/town.js)
  practice:   { hp: 40,  damage: 0,  speed: 2.0, gold: [0, 0],  ai: 'chase', color: 0xffa8d8, harmless: true },
  // bosses (one per biome; much tougher than their floor)
  king:          { hp: 85,  damage: 3, speed: 2.4, gold: [90, 90],   ai: 'chase', scale: 3.2 },
  frostgiant:    { hp: 245, damage: 5, speed: 2.4, gold: [160, 160], ai: 'chase', body: 'yeti', scale: 2.4, r: 1.0 },
  shroomking:    { hp: 350, damage: 6, speed: 2.2, gold: [210, 210], ai: 'chase', body: 'shroom', scale: 2.8, summon: 'shroom' },
  dragon:        { hp: 510, damage: 6, speed: 2.6, gold: [330, 330], ai: 'shooter', body: 'dragon', scale: 2.2, r: 1.2 },
  colossus:      { hp: 560, damage: 7, speed: 2.0, gold: [300, 300], ai: 'chase', body: 'golem', tint: 0xb48cff, scale: 2.4, r: 1.1, summon: 'crystalslime' },
  skeletonking:  { hp: 560, damage: 7, speed: 2.6, gold: [320, 320], ai: 'chase', body: 'skeleton', scale: 2.6, crown: true, summon: 'skeleton' },
  spiderqueen:   { hp: 600, damage: 8, speed: 3.0, gold: [340, 340], ai: 'pounce', body: 'spider', tint: 0x6a3a8a, scale: 2.6, summon: 'broodspider' },
  treasuregolem: { hp: 650, damage: 8, speed: 2.0, gold: [600, 600], ai: 'chase', body: 'golem', tint: 0xffd23f, scale: 2.6, r: 1.1 },
  shadowlord:    { hp: 650, damage: 8, speed: 2.8, gold: [380, 380], ai: 'shooter', body: 'imp', tint: 0x7a52b8, scale: 2.4, summon: 'shadowslime' },
  ancientdragon: { hp: 800, damage: 9, speed: 2.6, gold: [500, 500], ai: 'shooter', body: 'dragon', tint: 0x8a2a2a, scale: 2.6, r: 1.2 },
  emperor:       { hp: 400, damage: 5, speed: 2.8, gold: [240, 240], ai: 'chase', scale: 3.8 },
  crabking:      { hp: 450, damage: 6, speed: 2.6, gold: [260, 260], ai: 'chase', body: 'crab', scale: 2.6, crown: true, summon: 'crab' },
  scholar:       { hp: 450, damage: 6, speed: 3.0, gold: [280, 280], ai: 'shooter', body: 'ghost', tint: 0x9fe8ff, scale: 2.4, fly: true },
  kelpgiant:     { hp: 520, damage: 7, speed: 2.2, gold: [300, 300], ai: 'chase', body: 'yeti', tint: 0x4fae6a, scale: 2.4, r: 1.0 },
  pearlgolem:    { hp: 540, damage: 7, speed: 2.0, gold: [320, 320], ai: 'chase', body: 'golem', tint: 0xffe0ee, scale: 2.4, r: 1.1, summon: 'pearlslime' },
  captain:       { hp: 560, damage: 7, speed: 2.8, gold: [340, 340], ai: 'chase', body: 'skeleton', tint: 0x9a7a5a, scale: 2.5, crown: true, summon: 'skeleton' },
  seayeti:       { hp: 600, damage: 8, speed: 2.4, gold: [350, 350], ai: 'chase', body: 'yeti', tint: 0x7fd8e8, scale: 2.5, r: 1.0 },
  watcher:       { hp: 620, damage: 8, speed: 3.0, gold: [370, 370], ai: 'pounce', body: 'spider', tint: 0x2a3a6a, scale: 2.8, summon: 'shadowslime' },
  guardian:      { hp: 680, damage: 8, speed: 2.0, gold: [420, 420], ai: 'chase', body: 'golem', tint: 0x40c0b0, scale: 2.6, r: 1.1 },
  leviathan:     { hp: 820, damage: 9, speed: 2.6, gold: [550, 550], ai: 'shooter', body: 'dragon', tint: 0x3a6ad0, scale: 2.8, r: 1.2, summon: 'crab' },
  gatekeeper:    { hp: 520, damage: 7, speed: 2.0, gold: [300, 300], ai: 'chase', body: 'golem', tint: 0x8a8aa0, scale: 2.5, r: 1.1 },
  ironknight:    { hp: 560, damage: 7, speed: 2.6, gold: [320, 320], ai: 'chase', body: 'skeleton', tint: 0xb8c4d0, scale: 2.5, crown: true },
  jailer:        { hp: 580, damage: 8, speed: 2.4, gold: [330, 330], ai: 'chase', body: 'yeti', tint: 0x6a5a4a, scale: 2.4, r: 1.0, summon: 'black' },
  banshee:       { hp: 560, damage: 8, speed: 3.2, gold: [340, 340], ai: 'flutter', body: 'ghost', tint: 0xd8f0ff, scale: 2.6, fly: true, summon: 'ghost' },
  alchemist:     { hp: 600, damage: 8, speed: 2.8, gold: [360, 360], ai: 'shooter', body: 'imp', tint: 0x6aff8a, scale: 2.3, summon: 'goldslime' },
  icewyrm:       { hp: 680, damage: 8, speed: 2.6, gold: [380, 380], ai: 'shooter', body: 'dragon', tint: 0xa8ecff, scale: 2.5, r: 1.2 },
  firelich:      { hp: 700, damage: 9, speed: 2.8, gold: [400, 400], ai: 'shooter', body: 'skeleton', tint: 0xff7a3a, scale: 2.4, crown: true, summon: 'firebat' },
  royalguard:    { hp: 740, damage: 9, speed: 2.6, gold: [430, 430], ai: 'chase', body: 'skeleton', tint: 0xffd23f, scale: 2.6, crown: true, summon: 'skeleton' },
  wraith:        { hp: 760, damage: 9, speed: 3.2, gold: [450, 450], ai: 'flutter', body: 'ghost', tint: 0x5a3a8a, scale: 2.8, fly: true, summon: 'shadowimp' },
  shadowking:    { hp: 1000, damage: 10, speed: 2.8, gold: [1000, 1000], ai: 'shooter', body: 'skeleton', tint: 0x3a2a5a, scale: 3.0, crown: true, summon: 'shadowimp' },
  // the seasonal bosses: one day in town at the start of each season (shared/seasons.js), scaled to the family
  bloomcolossus: { hp: 2600, damage: 10, speed: 2.2, gold: [3000, 3000], ai: 'chase', body: 'golem', tint: 0xff9ec8, scale: 3.4, r: 1.4, summon: 'shroom' },
  sunwyrm:       { hp: 2400, damage: 11, speed: 2.8, gold: [3000, 3000], ai: 'shooter', body: 'dragon', tint: 0xffa52a, scale: 3.2, r: 1.4, summon: 'firebat' },
  harvestking:   { hp: 2600, damage: 11, speed: 2.8, gold: [3000, 3000], ai: 'chase', body: 'skeleton', tint: 0xd8782a, scale: 3.4, crown: true, summon: 'skeleton' },
  frosttitan:    { hp: 3000, damage: 12, speed: 2.4, gold: [3000, 3000], ai: 'chase', body: 'yeti', tint: 0xe8f6ff, scale: 3.6, r: 1.4, summon: 'iceslime' },
};
export const SLIME_STATS = ENEMIES; // older name

export const ROCK_HP = { stone: 2, copper: 4, silver: 7, goldore: 11, mythril: 16, obsidian: 24, starstone: 32,
  amethyst: 8, sapphire: 13, emerald: 18, ruby: 26, opal: 34 }; // gems: a bit tougher than the metal found beside them

// Breakable barrels: `style` picks the model, hp = hits with a starter weapon (damage 2-3).
export const BARREL_STYLES = { barrel: 3, keg: 3, small: 1 };

/** The biome a floor belongs to (floor 1-10 = first biome, 11-20 = second, ...). */
export function biomeFor(dungeonId, floor) {
  const d = DUNGEONS[dungeonId];
  return d.biomes[Math.min(d.biomes.length - 1, Math.floor((floor - 1) / BIOME_FLOORS))];
}

export function isBossFloor(floor) {
  return floor % BIOME_FLOORS === 0;
}

/** An enemy as it appears at a total depth (see depthOf): tougher the deeper you go. */
export function makeEnemy(variant, depth, x, z, boss = false) {
  const s = ENEMIES[variant], power = enemyPower(depth);
  const hp = Math.round(s.hp * power.hp);
  return {
    type: 'slime', variant, x, z, hp, maxHp: hp,
    damage: Math.max(1, Math.round(s.damage * power.damage)), speed: s.speed,
    goldMul: Math.round(power.gold * 100) / 100,
    ...(s.scale ? { scale: s.scale } : {}),
  };
}

/** Location keys look like "mine/3". */
export function dungeonKey(dungeonId, floor) {
  return `${dungeonId}/${floor}`;
}

export function parseKey(key) {
  const [id, f] = key.split('/');
  if (DUNGEONS[id]) return { kind: 'dungeon', dungeonId: id, floor: Number(f) };
  return { kind: id };
}
