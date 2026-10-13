// The Seasonal Trader in the town square sells things you can only buy in their season: treats
// (ITEMS with `seasonal`) and decorations for the fort (FURNITURE with `seasonal`). What's on the
// stall rotates through SETS_PER_SEASON sets during the season (a new set every few days).
import { SEASON_DAYS, seasonOf, dayOfSeason } from './seasons.js';

export const SETS_PER_SEASON = 5;
const SET_DAYS = SEASON_DAYS / SETS_PER_SEASON; // 6
/** Which three of the six decorations each set shows: five different sets. */
const SET_PICKS = [[0, 1, 2], [3, 4, 5], [0, 2, 4], [1, 3, 5], [0, 4, 5]];

/** Each season's pool: two treats, two fancy outfits (one is always on the stall) and six decorations. */
export const SEASONAL_STOCK = {
  spring: { food: ['blossomtea', 'honeycake'], outfits: ['blossomgown', 'gardener'], decor: ['blossomtree', 'bunnyplush', 'eggbasket', 'birdhouse', 'tulips', 'maypolemini'] },
  summer: { food: ['lemonade', 'icecream'], outfits: ['beachdress', 'safari'], decor: ['parasol', 'beachball', 'sandcastle', 'sunflowers', 'shellbowl', 'surfboard'] },
  autumn: { food: ['cider', 'pumpkinpie'], outfits: ['harvestcloak', 'pumpkinsuit'], decor: ['jackolantern', 'scarecrow', 'leafpile', 'applebasket', 'cornstalks', 'acornbowl'] },
  winter: { food: ['gingerbread', 'snowcone'], outfits: ['snowqueen', 'wintercoat'], decor: ['snowman', 'xmastree', 'giftpile', 'snowglobe', 'icesculpture', 'stocking'] },
};

/** The trader's prices: these are rare, so twice what the item's own price says. */
export const SEASONAL_MARKUP = 2;
export const seasonalPrice = (def) => Math.round((def?.price ?? 0) * SEASONAL_MARKUP);

/**
 * What's on the stall on `day`: the season, which of the 5 sets (each a treat, a fancy outfit and
 * three decorations, different every time), and how many days until it changes.
 */
export function seasonalSet(day) {
  const season = seasonOf(day), d = dayOfSeason(day), set = Math.floor((d - 1) / SET_DAYS);
  const pool = SEASONAL_STOCK[season.id];
  const decor = SET_PICKS[set].map((j) => pool.decor[j]);
  return {
    season: season.id,
    set,
    items: [
      { id: pool.food[set % pool.food.length], kind: 'item' },
      { id: pool.outfits[(set + 1) % pool.outfits.length], kind: 'clothes' },
      ...decor.map((id) => ({ id, kind: 'furniture' })),
    ],
    daysLeft: SET_DAYS - ((d - 1) % SET_DAYS),
  };
}
