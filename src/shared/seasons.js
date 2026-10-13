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
 * Halloween halfway through autumn (costumes, pumpkins, trick-or-treat at the cottages) and
 * Christmas halfway through winter (Santa in the square, lights on the trees).
 */
export const HOLIDAY_DAY = 15;
export function holidayOf(day) {
  if (dayOfSeason(day) !== HOLIDAY_DAY) return null;
  return { spring: 'easter', autumn: 'halloween', winter: 'christmas' }[seasonOf(day).id] ?? null;
}
/** Some spring days it rains (the same days for everyone: worked out from the day number). */
export function isRainyDay(day) {
  return seasonOf(day).id === 'spring' && !isBossDay(day) && !holidayOf(day) && ((Math.imul(day, 2654435761) >>> 0) % 100) < 35;
}

/** Where Santa (Christmas) and Grandma (Easter) stand: in the town square, east of the fountain. */
export const SANTA_SPOT = { x: 84, z: 62 };

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
