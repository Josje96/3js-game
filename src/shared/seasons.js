// Seasons: the year is four seasons of SEASON_DAYS days, worked out from the day counter (so saves
// need nothing new). On the first day of each season that season's boss visits town for the day:
// very tough, scaled to the family, and it drops epic loot (ITEMS with `epic: true`).

export const SEASON_DAYS = 30;

export const SEASONS = [
  { id: 'spring', name: 'Spring', icon: '🌸', boss: 'bloomcolossus', bossName: 'The Blossom Colossus', loot: ['blossomblade', 'petalaegis'] },
  { id: 'summer', name: 'Summer', icon: '☀️', boss: 'sunwyrm', bossName: 'The Sunscale Wyrm', loot: ['sunfirebow', 'sunplate'] },
  { id: 'autumn', name: 'Autumn', icon: '🍂', boss: 'harvestking', bossName: 'The Harvest King', loot: ['harvestreaper', 'emberstaff'] },
  { id: 'winter', name: 'Winter', icon: '❄️', boss: 'frosttitan', bossName: 'The Frost Titan', loot: ['frostfang', 'glacierplate'] },
];

/** Which season day `day` (1 = the very first day) falls in. */
export function seasonOf(day) {
  return SEASONS[Math.floor((Math.max(1, day) - 1) / SEASON_DAYS) % SEASONS.length];
}

/** 1..SEASON_DAYS: how far into its season `day` is. */
export function dayOfSeason(day) {
  return ((Math.max(1, day) - 1) % SEASON_DAYS) + 1;
}

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
