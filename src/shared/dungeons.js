// Dungeon definitions. Adding a new dungeon = adding an entry here plus
// a portal that points at it (see maps.js). Floors are generated from the
// world seed by mapgen.js, so no level data needs to be stored.
//
// A dungeon is a stack of BIOMES, 10 floors each, with a boss on every 10th floor.
// Beating a boss opens a ladder further down (and sets its `flag`).

export const BIOME_FLOORS = 10;

export const DUNGEONS = {
  mine: {
    name: 'The Old Mine',
    unlockFlag: null,             // always open
    clearFlag: 'mineCleared',     // first boss beaten -> the ruins gate in town opens
    biomes: [
      {
        name: 'The Old Mine', theme: 'dungeon',
        enemies: (f) => (f <= 3 ? ['green'] : f <= 6 ? ['green', 'blue', 'bat'] : ['blue', 'red', 'bat']),
        ores: (f) => (f <= 3 ? { stone: 6, copper: 3 } : f <= 6 ? { stone: 4, copper: 3, silver: 2 } : { stone: 3, silver: 3, goldore: 2 }),
        boss: { variant: 'king', name: 'King Slime', flag: 'mineCleared' },
      },
      {
        name: 'Frost Caverns', theme: 'frost',
        enemies: () => ['iceslime', 'bat', 'yeti'],
        ores: () => ({ stone: 2, silver: 4, goldore: 2 }),
        boss: { variant: 'frostgiant', name: 'Frost Giant', flag: 'frostCleared' },
      },
      {
        name: 'Mushroom Grotto', theme: 'grotto',
        enemies: () => ['shroom', 'spider', 'purple'],
        ores: () => ({ stone: 2, silver: 3, goldore: 3 }),
        boss: { variant: 'shroomking', name: 'Mushroom King', flag: 'grottoCleared' },
      },
      {
        name: 'Lava Depths', theme: 'lava',
        enemies: () => ['imp', 'golem', 'firebat'],
        ores: () => ({ stone: 1, silver: 2, goldore: 5 }),
        boss: { variant: 'dragon', name: 'Lava Dragon', flag: 'lavaCleared' },
      },
    ],
  },

  // Unlocked by beating the King Slime.
  ruins: {
    name: 'Sunken Ruins',
    unlockFlag: 'mineCleared',
    clearFlag: 'ruinsCleared',
    biomes: [
      {
        name: 'Sunken Ruins', theme: 'ruins',
        enemies: (f) => (f <= 5 ? ['purple', 'bat'] : ['black', 'spider']),
        ores: (f) => (f <= 5 ? { silver: 3, goldore: 1, stone: 2 } : { goldore: 3, silver: 2 }),
        boss: { variant: 'emperor', name: 'Slime Emperor', flag: 'ruinsCleared' },
      },
    ],
  },
};

for (const d of Object.values(DUNGEONS)) d.floors = d.biomes.length * BIOME_FLOORS;

/**
 * Every enemy. (They're all `type: 'slime'` entities on the server — slimes came first.)
 * `ai`: chase | flutter (erratic flier) | pounce (wind up, then lunge) | shooter (keeps away, throws fire)
 * `body`: which model the client builds (missing = a slime of that colour).
 * hp/damage are for the first floor the enemy shows up on; deeper floors scale them up.
 */
export const ENEMIES = {
  green:      { hp: 6,    damage: 1,  speed: 2.6, gold: [2, 5],      ai: 'chase' },
  blue:       { hp: 12,   damage: 2,  speed: 3.0, gold: [4, 9],      ai: 'chase' },
  red:        { hp: 20,   damage: 3,  speed: 3.4, gold: [8, 15],     ai: 'chase' },
  purple:     { hp: 30,   damage: 4,  speed: 3.4, gold: [12, 20],    ai: 'chase' },
  black:      { hp: 45,   damage: 5,  speed: 3.8, gold: [18, 30],    ai: 'chase' },
  bat:        { hp: 8,    damage: 2,  speed: 5.2, gold: [3, 8],      ai: 'flutter', body: 'bat', fly: true },
  iceslime:   { hp: 40,   damage: 5,  speed: 3.2, gold: [15, 25],    ai: 'chase' },
  yeti:       { hp: 70,   damage: 7,  speed: 2.4, gold: [25, 40],    ai: 'chase', body: 'yeti', r: 1.0 },
  shroom:     { hp: 60,   damage: 7,  speed: 2.2, gold: [25, 40],    ai: 'chase', body: 'shroom' },
  spider:     { hp: 50,   damage: 8,  speed: 3.0, gold: [25, 45],    ai: 'pounce', body: 'spider' },
  imp:        { hp: 60,   damage: 8,  speed: 3.2, gold: [35, 55],    ai: 'shooter', body: 'imp', fly: true },
  golem:      { hp: 160,  damage: 12, speed: 1.9, gold: [50, 80],    ai: 'chase', body: 'golem', r: 1.1 },
  firebat:    { hp: 45,   damage: 8,  speed: 5.6, gold: [30, 50],    ai: 'flutter', body: 'bat', fly: true },
  // bosses
  king:       { hp: 120,  damage: 4,  speed: 2.4, gold: [150, 150],  ai: 'chase', scale: 3.2 },
  emperor:    { hp: 300,  damage: 7,  speed: 2.8, gold: [400, 400],  ai: 'chase', scale: 3.8 },
  frostgiant: { hp: 450,  damage: 10, speed: 2.4, gold: [500, 500],  ai: 'chase', body: 'yeti', scale: 2.4, r: 1.0 },
  shroomking: { hp: 800,  damage: 12, speed: 2.2, gold: [800, 800],  ai: 'chase', body: 'shroom', scale: 2.8, summon: 'shroom' },
  dragon:     { hp: 1400, damage: 15, speed: 2.6, gold: [1500, 1500], ai: 'shooter', body: 'dragon', scale: 2.2, r: 1.2 },
};
export const SLIME_STATS = ENEMIES; // older name

export const ROCK_HP = { stone: 2, copper: 4, silver: 7, goldore: 11 };

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

/** An enemy as it appears on a given floor: tougher the deeper you go within its biome. */
export function makeEnemy(variant, floor, x, z, boss = false) {
  const s = ENEMIES[variant];
  const within = (floor - 1) % BIOME_FLOORS; // 0..9
  const hp = Math.round(boss ? s.hp : s.hp * (1 + within * 0.08) + Math.floor(floor / 2));
  return {
    type: 'slime', variant, x, z, hp, maxHp: hp,
    damage: s.damage + (boss ? 0 : Math.floor(within / 4)), speed: s.speed,
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
