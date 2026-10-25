// The calendar — the Pebblewick Reckoning: a year is exactly four seasons of SEASON_DAYS days
// (120 days: "Year 2 · Day 86"), so every year starts on the first day of spring. Counted from the
// save's day number. Seasons are worked out from the day counter too (so saves
// need nothing new). On the first day of each season that season's boss visits town for the day:
// very tough, scaled to the family, and it drops epic loot (ITEMS with `epic: true`).

export const CALENDAR_NAME = 'the Pebblewick Reckoning';
export const SEASON_DAYS = 30;
export const YEAR_DAYS = SEASON_DAYS * 4; // spring, summer, autumn, winter: 120 days

/** Day 1 is Year 1, Day 1; day 121 is Year 2, Day 1 (and the first day of spring again). */
export function calendar(day) {
  const d = Math.max(1, Math.floor(day) || 1) - 1;
  return { year: Math.floor(d / YEAR_DAYS) + 1, day: (d % YEAR_DAYS) + 1 };
}

/** "Year 2 · Day 86" */
export function dateLabel(day) {
  const c = calendar(day);
  return `Year ${c.year} · Day ${c.day}`;
}

export const SEASONS = [
  { id: 'spring', name: 'Spring', icon: '🌸', boss: 'bloomcolossus', bossName: 'The Blossom Colossus', loot: ['blossomblade', 'petalaegis'] },
  { id: 'summer', name: 'Summer', icon: '☀️', boss: 'sunwyrm', bossName: 'The Sunscale Wyrm', loot: ['sunfirebow', 'sunplate'] },
  { id: 'autumn', name: 'Autumn', icon: '🍂', boss: 'harvestking', bossName: 'The Pumpkin Horror', loot: ['harvestreaper', 'emberstaff'] },
  { id: 'winter', name: 'Winter', icon: '❄️', boss: 'frosttitan', bossName: 'The Frost Titan', loot: ['frostfang', 'glacierplate'] },
];

/**
 * A different boss every year: twenty for each season, one a year (year 21 starts them over). Year 1's is the
 * season's own (`boss` above). The rest are built from a creature `body` (client/enemies.js), recoloured
 * (`tint`), with how it fights (`ai`), who it calls for help (`summon`) and maybe a `crown`; each year's is a
 * little tougher than the last (dungeons.js makes them enemies). Their ids are saved (beat_<variant>): never rename.
 */
export const BOSS_YEARS = 20;
export const SEASON_BOSSES = {
  spring: [
    { variant: 'bloomcolossus', name: 'The Blossom Colossus' }, // year 1 (and 21, 41...): the first ever
    { variant: 'thornback', name: 'The Thornback Treant', body: 'treant', tint: 0x6fcf55, ai: 'chase', summon: 'shroom' },
    { variant: 'sporequeen', name: 'The Spore Queen', body: 'shroom', tint: 0xff8ac8, ai: 'shooter', summon: 'shroom', crown: true },
    { variant: 'gardenweaver', name: 'The Garden Weaver', body: 'spider', tint: 0x8be07a, ai: 'pounce', summon: 'spider' },
    { variant: 'mossgolem', name: 'The Mossy Golem', body: 'golem', tint: 0x7aaa5a, ai: 'chase', summon: 'green' },
    { variant: 'bunnybrute', name: 'The Bunnyhop Brute', body: 'yeti', tint: 0xffc8e0, ai: 'pounce', summon: 'green' },
    { variant: 'puddlecrab', name: 'The Puddle Crab King', body: 'crab', tint: 0x6ab8ff, ai: 'chase', summon: 'crab', crown: true },
    { variant: 'petaldrake', name: 'The Petal Drake', body: 'dragon', tint: 0xff9ad5, ai: 'shooter', summon: 'bat' },
    { variant: 'rainspirit', name: 'The Rain Spirit', body: 'ghost', tint: 0x9fd8ff, ai: 'flutter', summon: 'ghost' },
    { variant: 'pollenimp', name: 'The Pollen Imp Lord', body: 'imp', tint: 0xffe066, ai: 'shooter', summon: 'imp', crown: true },
    { variant: 'bumblebaron', name: 'The Bumble Baron', body: 'bat', tint: 0xffd23f, ai: 'flutter', summon: 'bat' },
    { variant: 'eggthief', name: 'The Egg Thief King', body: 'goblin', tint: 0x8acf5a, ai: 'chase', summon: 'green', crown: true },
    { variant: 'bramblebones', name: 'Bramble Bones', body: 'skeleton', tint: 0x9acf7a, ai: 'chase', summon: 'skeleton' },
    { variant: 'vineserpent', name: 'The Vine Serpent', body: 'sunserpent', tint: 0x6fcf55, ai: 'shooter', summon: 'spider' },
    { variant: 'hailgiant', name: 'The Hailstone Giant', body: 'icetitan', tint: 0xcfe8ff, ai: 'chase', summon: 'iceslime' },
    { variant: 'cabbageking', name: 'The Cabbage King', body: 'pumpkinking', tint: 0x9ae07a, ai: 'chase', summon: 'green' },
    { variant: 'blossomgolem', name: 'The Blossom Golem', body: 'golem', tint: 0xffb3cc, ai: 'chase', summon: 'shroom' },
    { variant: 'cherryelder', name: 'The Cherry Elder', body: 'treant', tint: 0xfff0f4, ai: 'chase', summon: 'shroom', crown: true },
    { variant: 'toadstool', name: 'Old Toadstool', body: 'shroom', tint: 0xd84a3a, ai: 'chase', summon: 'shroom' },
    { variant: 'rainbowwyrm', name: 'The Rainbow Wyrm', body: 'sunserpent', tint: 0xb48cff, ai: 'shooter', summon: 'bat' },
  ],
  summer: [
    { variant: 'sunwyrm', name: 'The Sunscale Wyrm' }, // year 1 (and 21, 41...): the first ever
    { variant: 'sandcolossus', name: 'The Sand Colossus', body: 'golem', tint: 0xe8c87a, ai: 'chase', summon: 'crab' },
    { variant: 'tidecrab', name: 'The Tide Crab Emperor', body: 'crab', tint: 0xff7a4a, ai: 'chase', summon: 'crab', crown: true },
    { variant: 'scorchdrake', name: 'The Scorch Drake', body: 'dragon', tint: 0xff7a1a, ai: 'shooter', summon: 'firebat' },
    { variant: 'sunburntyeti', name: 'The Sunburnt Yeti', body: 'yeti', tint: 0xff9a7a, ai: 'pounce', summon: 'crab' },
    { variant: 'fireflyqueen', name: 'The Firefly Queen', body: 'bat', tint: 0xfff27a, ai: 'flutter', summon: 'firebat', crown: true },
    { variant: 'heatwaveimp', name: 'The Heatwave Imp', body: 'imp', tint: 0xff8a2a, ai: 'shooter', summon: 'imp' },
    { variant: 'mirage', name: 'The Mirage', body: 'ghost', tint: 0xffe8a0, ai: 'flutter', summon: 'ghost' },
    { variant: 'cactusking', name: 'The Cactus King', body: 'treant', tint: 0x5aa84a, ai: 'chase', summon: 'spider', crown: true },
    { variant: 'coralserpent', name: 'The Coral Serpent', body: 'sunserpent', tint: 0xff7ab8, ai: 'shooter', summon: 'crab' },
    { variant: 'magmagolem', name: 'The Magma Golem', body: 'golem', tint: 0xff5a1a, ai: 'chase', summon: 'firebat' },
    { variant: 'scarabking', name: 'The Scarab King', body: 'spider', tint: 0x2a8a8a, ai: 'pounce', summon: 'spider', crown: true },
    { variant: 'captainbones', name: 'Captain Bones', body: 'skeleton', tint: 0xf0e0b0, ai: 'chase', summon: 'skeleton', crown: true },
    { variant: 'sunflowergiant', name: 'The Sunflower Giant', body: 'treant', tint: 0xffd23f, ai: 'chase', summon: 'shroom' },
    { variant: 'melonmonarch', name: 'The Melon Monarch', body: 'pumpkinking', tint: 0x5abf5a, ai: 'chase', summon: 'green', crown: true },
    { variant: 'sunshroom', name: 'The Sunshroom', body: 'shroom', tint: 0xffb03a, ai: 'shooter', summon: 'shroom' },
    { variant: 'goblinsunchief', name: 'The Goblin Sun-Chief', body: 'goblin', tint: 0xd8a83a, ai: 'chase', summon: 'goldslime', crown: true },
    { variant: 'thunderhead', name: 'The Thunderhead', body: 'icetitan', tint: 0x8a9ab8, ai: 'chase', summon: 'bat' },
    { variant: 'dunedragon', name: 'The Dune Dragon', body: 'dragon', tint: 0xd8b06a, ai: 'shooter', summon: 'firebat' },
    { variant: 'solarimp', name: 'The Solar Imp', body: 'imp', tint: 0xffd23f, ai: 'shooter', summon: 'firebat' },
  ],
  autumn: [
    { variant: 'harvestking', name: 'The Pumpkin Horror' }, // year 1 (and 21, 41...): the first ever
    { variant: 'scarecrowlord', name: 'The Scarecrow Lord', body: 'pumpkinking', tint: 0xd8b860, ai: 'chase', summon: 'skeleton' },
    { variant: 'gourdgolem', name: 'The Gourd Golem', body: 'golem', tint: 0xe8781a, ai: 'chase', summon: 'shroom' },
    { variant: 'leafdrake', name: 'The Leaf Drake', body: 'dragon', tint: 0xd8641a, ai: 'shooter', summon: 'bat' },
    { variant: 'crowqueen', name: 'The Crow Queen', body: 'bat', tint: 0x2a2a3a, ai: 'flutter', summon: 'bat', crown: true },
    { variant: 'maplegiant', name: 'The Maple Giant', body: 'treant', tint: 0xd8302a, ai: 'chase', summon: 'shroom' },
    { variant: 'hollowhaunt', name: 'The Hollow Haunt', body: 'ghost', tint: 0xffb06a, ai: 'flutter', summon: 'ghost' },
    { variant: 'webwitch', name: 'The Web Witch', body: 'spider', tint: 0x7a3fb8, ai: 'pounce', summon: 'spider', crown: true },
    { variant: 'moonyeti', name: 'The Harvest Moon Yeti', body: 'yeti', tint: 0xc89a5a, ai: 'pounce', summon: 'skeleton' },
    { variant: 'cauldronimp', name: 'The Cauldron Imp', body: 'imp', tint: 0x6ac04a, ai: 'shooter', summon: 'imp' },
    { variant: 'bonecollector', name: 'The Bone Collector', body: 'skeleton', tint: 0xd8d0b8, ai: 'chase', summon: 'skeleton', crown: true },
    { variant: 'toadstoolelder', name: 'The Toadstool Elder', body: 'shroom', tint: 0x8a4a2a, ai: 'shooter', summon: 'shroom' },
    { variant: 'acornking', name: 'The Acorn King', body: 'goblin', tint: 0x9a6434, ai: 'chase', summon: 'green', crown: true },
    { variant: 'foggiant', name: 'The Fog Giant', body: 'icetitan', tint: 0x9aa0aa, ai: 'chase', summon: 'ghost' },
    { variant: 'emberserpent', name: 'The Ember Serpent', body: 'sunserpent', tint: 0xe8501a, ai: 'shooter', summon: 'firebat' },
    { variant: 'nightbatlord', name: 'The Night Bat Lord', body: 'bat', tint: 0x5a3a7a, ai: 'flutter', summon: 'bat', crown: true },
    { variant: 'rootgolem', name: 'The Root Golem', body: 'golem', tint: 0x6b4a2c, ai: 'chase', summon: 'spider' },
    { variant: 'jackwraith', name: 'The Jack-o’-Wraith', body: 'ghost', tint: 0xff8a1a, ai: 'flutter', summon: 'ghost' },
    { variant: 'haystackhorror', name: 'The Haystack Horror', body: 'yeti', tint: 0xe8c860, ai: 'pounce', summon: 'skeleton' },
    { variant: 'cornsnake', name: 'The Corn Snake', body: 'sunserpent', tint: 0xf0c040, ai: 'shooter', summon: 'spider' },
  ],
  winter: [
    { variant: 'frosttitan', name: 'The Frost Titan' }, // year 1 (and 21, 41...): the first ever
    { variant: 'snowqueen', name: 'The Snow Queen', body: 'ghost', tint: 0xdff6ff, ai: 'flutter', summon: 'iceslime', crown: true },
    { variant: 'glacierdrake', name: 'The Glacier Drake', body: 'dragon', tint: 0x9fd8ff, ai: 'shooter', summon: 'iceslime' },
    { variant: 'abominable', name: 'The Abominable Snowman', body: 'yeti', tint: 0xffffff, ai: 'pounce', summon: 'yeti' },
    { variant: 'frostcrab', name: 'The Frost Crab', body: 'crab', tint: 0xbfe8ff, ai: 'chase', summon: 'iceslime' },
    { variant: 'iciclegolem', name: 'The Icicle Golem', body: 'golem', tint: 0xcfefff, ai: 'chase', summon: 'iceslime' },
    { variant: 'pinegiant', name: 'The Pine Giant', body: 'treant', tint: 0x2f7a4a, ai: 'chase', summon: 'yeti' },
    { variant: 'blizzardbat', name: 'The Blizzard Bat', body: 'bat', tint: 0xe8f4ff, ai: 'flutter', summon: 'bat' },
    { variant: 'grumpus', name: 'The Grumpus', body: 'imp', tint: 0x8a2a2a, ai: 'shooter', summon: 'imp', crown: true },
    { variant: 'snowmanking', name: 'The Snowman King', body: 'pumpkinking', tint: 0xf4f4f8, ai: 'chase', summon: 'iceslime', crown: true },
    { variant: 'frostweaver', name: 'The Frost Weaver', body: 'spider', tint: 0xa8d8ff, ai: 'pounce', summon: 'spider' },
    { variant: 'icelich', name: 'The Ice Lich', body: 'skeleton', tint: 0x9fd8ff, ai: 'chase', summon: 'skeleton', crown: true },
    { variant: 'yulegoblin', name: 'The Yule Goblin', body: 'goblin', tint: 0x2a8a3a, ai: 'chase', summon: 'green', crown: true },
    { variant: 'auroraserpent', name: 'The Aurora Serpent', body: 'sunserpent', tint: 0x6affd0, ai: 'shooter', summon: 'iceslime' },
    { variant: 'frostcap', name: 'The Frostcap', body: 'shroom', tint: 0x9fd8ff, ai: 'shooter', summon: 'shroom' },
    { variant: 'avalanche', name: 'The Avalanche', body: 'icetitan', tint: 0xf4f8ff, ai: 'chase', summon: 'yeti' },
    { variant: 'polarbrute', name: 'The Polar Brute', body: 'yeti', tint: 0xf0f0e8, ai: 'pounce', summon: 'iceslime' },
    { variant: 'northwind', name: 'The North Wind', body: 'ghost', tint: 0xbfd8ff, ai: 'flutter', summon: 'ghost' },
    { variant: 'crystalwyrm', name: 'The Crystal Wyrm', body: 'dragon', tint: 0xc8b8ff, ai: 'shooter', summon: 'crystalslime' },
    { variant: 'iceking', name: 'The Ice King', body: 'golem', tint: 0x8ab8e8, ai: 'chase', summon: 'iceslime', crown: true },
  ],
};

/** This year's boss for the season `day` falls in: { variant, name, year } (year: 1..BOSS_YEARS in the cycle). */
export function seasonBossFor(day) {
  const s = seasonOf(day), y = (calendar(day).year - 1) % BOSS_YEARS;
  return { ...SEASON_BOSSES[s.id][y], year: y + 1 };
}

/** Which season day `day` (1 = the very first day) falls in. */
export function seasonOf(day) {
  return SEASONS[Math.floor((Math.max(1, day) - 1) / SEASON_DAYS) % SEASONS.length];
}

/** 1..SEASON_DAYS: how far into its season `day` is. */
export function dayOfSeason(day) {
  return ((Math.max(1, day) - 1) % SEASON_DAYS) + 1;
}

/** How many days until the next season starts (1 on a season's last day). */
export function daysToNextSeason(day) {
  return SEASON_DAYS - dayOfSeason(day) + 1;
}

/**
 * Holidays, one day each: Easter halfway through spring (Grandma brings everyone an Easter basket),
 * the Summer Solstice halfway through summer (the Solstice Arena: three rounds of warriors, the Solar Blade),
 * Halloween halfway through autumn (costumes, pumpkins, trick-or-treat at the cottages) and
 * Christmas halfway through winter (Santa in the square, lights on the trees).
 */
export const HOLIDAY_DAY = 15;
export function holidayOf(day) {
  if (dayOfSeason(day) !== HOLIDAY_DAY) return null;
  return { spring: 'easter', summer: 'solstice', autumn: 'halloween', winter: 'christmas' }[seasonOf(day).id] ?? null;
}
/** Some spring days it rains (the same days for everyone: worked out from the day number). */
export function isRainyDay(day) {
  return seasonOf(day).id === 'spring' && !isBossDay(day) && !holidayOf(day) && ((Math.imul(day, 2654435761) >>> 0) % 100) < 35;
}

/** Where Santa (Christmas) and Grandma (Easter) stand: in the town square, east of the fountain. */
export const SANTA_SPOT = { x: 84, z: 62 };

/** Where Santa's sleigh is parked, from where he stands (client/town.js makeChristmasCorner; its front, the reindeer, is +z). */
export const SLEIGH_PARKED = { x: -1.6, z: -3.7, rot: Math.PI / 2 }; // (side on behind him, the reindeer behind his tree: not in front of him)

/**
 * Where the strolling villagers keep out of at Christmas (client/villagers.js keepOut): Santa's whole corner,
 * and the last stretch of the sleigh's way in, low over the square (GameClient's Christmas film), so it
 * never lands on anyone. Circles `{ x, z, r }` in the world.
 */
export function christmasKeepOut(santa) {
  const s = Math.sin(SLEIGH_PARKED.rot), c = Math.cos(SLEIGH_PARKED.rot), out = [{ x: santa.x + 0.5, z: santa.z - 1.6, r: 5 }];
  for (const back of [3, 7, 11, 15]) out.push({ x: santa.x + SLEIGH_PARKED.x - s * back, z: santa.z + SLEIGH_PARKED.z - c * back, r: 3 });
  return out;
}

/**
 * What you bump into round Santa at Christmas (he's solid himself, as a town npc): the tree with the
 * presents under it, his sack, and the sleigh with its two reindeer. Circles `{ x, z, r }` in the world.
 */
export function christmasSolids(santa) {
  const out = [{ x: santa.x + 2.6, z: santa.z - 0.8, r: 1.75 }, { x: santa.x - 1.1, z: santa.z - 0.3, r: 0.55 }];
  const s = Math.sin(SLEIGH_PARKED.rot), c = Math.cos(SLEIGH_PARKED.rot);
  for (const [along, r] of [[-0.8, 0.95], [0.5, 0.95], [3.0, 0.55], [4.8, 0.55]]) {
    out.push({ x: santa.x + SLEIGH_PARKED.x + s * along, z: santa.z + SLEIGH_PARKED.z + c * along, r });
  }
  return out;
}

/** The first day of every season is a sale: everything in the town's shops is half price (the shopkeepers shout it). */
export const SALE_OFF = 0.5;
export const isSaleDay = (day) => dayOfSeason(day) === 1;
/** What something costs today: half on sale day; the Shadow tax on top after a lost raid (flags.shadowTax: its last day). */
export const salePrice = (price, day, flags = null) => {
  const p = isSaleDay(day) ? Math.ceil(price * (1 - SALE_OFF)) : price;
  return (flags?.shadowTax ?? 0) >= day ? Math.ceil(p * (1 + SHADOW_TAX)) : p;
};

/**
 * The Shadow Raid (server/systems/raid.js): on the 5th day of every month (a season is a month) the Shadow
 * King's knights march out of the Shadow Keep gate, along the road and up to the fountain. RAID_ROUTE: where
 * they come in and the turns on the way (then the fountain). Lose and the shops charge the Shadow tax.
 */
export const RAID_DAY = 5;
export const isRaidDay = (day) => dayOfSeason(day) === RAID_DAY;
export const RAID_ROUTE = [{ x: 124, z: 66 }, { x: 80, z: 66 }];
export const SHADOW_TAX = 0.25, SHADOW_TAX_DAYS = 3;

/** The seasonal boss is in town on the first day of every season. */
export function isBossDay(day) {
  return dayOfSeason(day) === 1;
}

/** How strong the visiting boss is: as deep as the strongest family member could fight, and then some. */
export function seasonBossDepth(maxLevel) {
  return Math.max(1, Math.min(250, Math.round((maxLevel || 1) * 2.5)));
}

/** Where the boss stands in town (the open grass south-east of the market) and how far it roams. */
export const SEASON_ARENA = { x: 110, z: 74, r: 9 };

/**
 * The Solstice Arena (halfway through summer): a sand ring on the grass south-east of the market, the
 * Sun Herald at its north gate. Talk to the herald to start the next round; each is harder (`power`
 * times the family's best level, as a dungeon depth). Win the first three and every fighter gets the Solar Blade;
 * the next three are harder still, and win the Solar Helmet (ARENA_PRIZES).
 */
export const SOLSTICE_ARENA = { x: 111, z: 75, r: 7.5 };
export const SOLSTICE_HERALD = { x: 111, z: 66 };
export const ARENA_ROUNDS = [
  { name: 'the Bronze Gladiators', foes: { gladiator: 3 }, power: 1.2 },
  { name: 'the Sun Guard', foes: { gladiator: 2, sunarcher: 2, sunknight: 1 }, power: 1.6 },
  { name: 'the Solar Champion', foes: { solarchampion: 1, sunknight: 2 }, power: 2.0 },
  // won the Solar Blade? three more, harder still, for the Solar Helmet
  { name: 'the Flame Legion', foes: { flamegladiator: 3, sunarcher: 2 }, power: 2.5 },
  { name: 'the Dawn Paladins', foes: { sunpaladin: 2, flamegladiator: 2, sunarcher: 2 }, power: 3.0 },
  { name: 'the Sun King', foes: { sunking: 1, sunpaladin: 2 }, power: 3.6 },
];
export const ARENA_PRIZE = 'solarblade';
/** What winning round n gives everyone in the ring: an item (ITEMS), or a hat for the wardrobe (HATS). */
export const ARENA_PRIZES = { 3: { item: ARENA_PRIZE }, 6: { item: 'solarhelm' } }; // (6: a helmet, worn in the helmet slot)
