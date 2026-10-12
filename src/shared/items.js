// Item catalogue. `model` refers to a file under public/models (see client/assets.js).
// Ids are stored in saves: never rename or remove one (add a migration in server/saves.js if you must).
// Weapons are also your mining tool, so damage applies to rocks too.
// `swing` picks the attack animation (see tools/blender/make_attacks.py).
// `ranged` weapons shoot a projectile ('arrow' or 'magic') instead of hitting up close.

export const ITEMS = {
  // --- weapons. `tier` = which shop tier sells it (a new tier every SHOP_TIER_LEVELS levels) ---
  dagger:      { name: 'Dagger',          kind: 'weapon', damage: 2,  price: 0,    model: 'items/dagger', swing: 'stab' },
  staff:       { name: 'Apprentice Staff', kind: 'weapon', damage: 2,  price: 0,    model: 'items/staff', swing: 'cast', ranged: 'magic' },
  bow:         { name: 'Hunting Bow',     kind: 'weapon', damage: 2,  price: 0,    model: 'items/bow_withString', swing: 'cast', ranged: 'arrow' },
  sword:       { name: 'Short Sword',     kind: 'weapon', damage: 3,  price: 145,  tier: 0, model: 'items/sword_1handed', swing: 'slash' },
  axe:         { name: 'Hand Axe',        kind: 'weapon', damage: 3,  price: 145,  tier: 0, model: 'items/axe_1handed', swing: 'slash' },
  greataxe:    { name: 'Great Axe',       kind: 'weapon', damage: 5,  price: 480,  tier: 0, model: 'items/axe_2handed', swing: 'chop' },
  greatsword:  { name: 'Great Sword',     kind: 'weapon', damage: 7,  price: 1080, tier: 0, model: 'items/sword_2handed', swing: 'chop' },
  royalsword:  { name: 'Royal Blade',     kind: 'weapon', damage: 10, price: 2400, tier: 0, model: 'items/sword_2handed_color', swing: 'chop' },
  crossbow:    { name: 'Crossbow',        kind: 'weapon', damage: 4,  price: 300,  tier: 0, model: 'items/crossbow_1handed', swing: 'cast', ranged: 'arrow' },
  wand:        { name: 'Magic Wand',      kind: 'weapon', damage: 4,  price: 300,  tier: 0, model: 'items/wand', swing: 'cast', ranged: 'magic' },
  heavybow:    { name: 'Heavy Crossbow',  kind: 'weapon', damage: 7,  price: 1140, tier: 0, model: 'items/crossbow_2handed', swing: 'cast', ranged: 'arrow' },
  spellbook:   { name: 'Spellbook',       kind: 'weapon', damage: 7,  price: 1140, tier: 0, model: 'items/spellbook_open', swing: 'cast', ranged: 'magic' },
  // level 20: steel
  steeldagger: { name: 'Steel Dirk',      kind: 'weapon', damage: 10, price: 3600, tier: 1, model: 'items/dagger', swing: 'stab', tint: 0xd6e2ee },
  steelblade:  { name: 'Steel Blade',     kind: 'weapon', damage: 13, price: 4000, tier: 1, model: 'items/sword_1handed', swing: 'slash', tint: 0xd6e2ee },
  steelaxe:    { name: 'Steel Greataxe',  kind: 'weapon', damage: 19, price: 5200, tier: 1, model: 'items/axe_2handed', swing: 'chop', tint: 0xd6e2ee },
  longbow:     { name: 'Elm Longbow',     kind: 'weapon', damage: 14, price: 4600, tier: 1, model: 'items/bow_withString', swing: 'cast', ranged: 'arrow', tint: 0xc98a4a },
  oakstaff:    { name: 'Oak Staff',       kind: 'weapon', damage: 14, price: 4600, tier: 1, model: 'items/staff', swing: 'cast', ranged: 'magic', tint: 0xa8e070 },
  // level 40: mythril
  mythrildagger: { name: 'Mythril Dirk',  kind: 'weapon', damage: 15, price: 11000, tier: 2, model: 'items/dagger', swing: 'stab', tint: 0x7fd8ff },
  mythrilblade:  { name: 'Mythril Blade', kind: 'weapon', damage: 20, price: 12000, tier: 2, model: 'items/sword_1handed', swing: 'slash', tint: 0x7fd8ff },
  mythrilaxe:    { name: 'Mythril Axe',   kind: 'weapon', damage: 29, price: 15000, tier: 2, model: 'items/axe_2handed', swing: 'chop', tint: 0x7fd8ff },
  mythrilbow:    { name: 'Mythril Crossbow', kind: 'weapon', damage: 21, price: 13500, tier: 2, model: 'items/crossbow_1handed', swing: 'cast', ranged: 'arrow', tint: 0x7fd8ff },
  mythrilwand:   { name: 'Mythril Wand',  kind: 'weapon', damage: 21, price: 13500, tier: 2, model: 'items/wand', swing: 'cast', ranged: 'magic', tint: 0x7fd8ff },
  // level 60: shadow
  shadowdagger: { name: 'Shadow Fang',    kind: 'weapon', damage: 21, price: 28000, tier: 3, model: 'items/dagger', swing: 'stab', tint: 0x7a52b8 },
  shadowblade:  { name: 'Shadow Blade',   kind: 'weapon', damage: 28, price: 30000, tier: 3, model: 'items/sword_2handed', swing: 'slash', tint: 0x7a52b8 },
  shadowaxe:    { name: 'Shadow Cleaver', kind: 'weapon', damage: 40, price: 36000, tier: 3, model: 'items/axe_2handed', swing: 'chop', tint: 0x7a52b8 },
  shadowbow:    { name: 'Shadow Repeater', kind: 'weapon', damage: 29, price: 33000, tier: 3, model: 'items/crossbow_2handed', swing: 'cast', ranged: 'arrow', tint: 0x7a52b8 },
  shadowstaff:  { name: 'Shadow Staff',   kind: 'weapon', damage: 29, price: 33000, tier: 3, model: 'items/staff', swing: 'cast', ranged: 'magic', tint: 0x7a52b8 },
  // level 80: starforged
  stardagger:  { name: 'Starfall Dirk',   kind: 'weapon', damage: 29, price: 70000, tier: 4, model: 'items/dagger', swing: 'stab', tint: 0xfff0a0 },
  starblade:   { name: 'Starforged Blade', kind: 'weapon', damage: 38, price: 76000, tier: 4, model: 'items/sword_2handed_color', swing: 'slash', tint: 0xfff0a0 },
  staraxe:     { name: 'Starforged Axe',  kind: 'weapon', damage: 54, price: 90000, tier: 4, model: 'items/axe_2handed', swing: 'chop', tint: 0xfff0a0 },
  starbow:     { name: 'Comet Crossbow',  kind: 'weapon', damage: 39, price: 82000, tier: 4, model: 'items/crossbow_2handed', swing: 'cast', ranged: 'arrow', tint: 0xfff0a0 },
  starbook:    { name: 'Book of Stars',   kind: 'weapon', damage: 39, price: 82000, tier: 4, model: 'items/spellbook_open', swing: 'cast', ranged: 'magic', tint: 0xfff0a0 },

  // --- forged at the anvil in town from a blueprint (never sold). `tint` recolours the model ---
  copperblade:  { name: 'Copper Blade',     kind: 'weapon', damage: 5,  forged: true, model: 'items/sword_1handed', swing: 'slash', tint: 0xe08a4a },
  silverbow:    { name: 'Silver Bow',       kind: 'weapon', damage: 6,  forged: true, model: 'items/bow_withString', swing: 'cast', ranged: 'arrow', tint: 0xd8e4f0 },
  slimewand:    { name: 'Slime Wand',       kind: 'weapon', damage: 6,  forged: true, model: 'items/wand', swing: 'cast', ranged: 'magic', tint: 0x7cff6a },
  silvershield: { name: 'Silver Shield',    kind: 'shield', block: 0.4, forged: true, model: 'items/shield_square_color', tint: 0xdde8ff },
  goldenaxe:    { name: 'Golden Greataxe',  kind: 'weapon', damage: 9,  forged: true, model: 'items/axe_2handed', swing: 'chop', tint: 0xffd23f },
  crystalstaff: { name: 'Crystal Staff',    kind: 'weapon', damage: 10, forged: true, model: 'items/staff', swing: 'cast', ranged: 'magic', tint: 0x7fe8ff },
  dragonsword:  { name: 'Dragon Sword',     kind: 'weapon', damage: 13, forged: true, model: 'items/sword_2handed_color', swing: 'chop', tint: 0xff5a4a },
  // the deep ores forge into gear a tier's worth better than the last shop tier you can buy —
  // mining your way down is the cheaper path, gathering the ore is the work
  mythrilbrand: { name: 'Mythril Brand',    kind: 'weapon', damage: 16, forged: true, model: 'items/sword_1handed', swing: 'slash', tint: 0x7fd8ff },
  mythrilbulwark: { name: 'Mythril Bulwark', kind: 'shield', block: 0.52, forged: true, model: 'items/shield_square_color', tint: 0x7fd8ff },
  obsidianedge: { name: 'Obsidian Edge',    kind: 'weapon', damage: 34, forged: true, model: 'items/sword_2handed', swing: 'chop', tint: 0x5a4a9a },
  nightstaff:   { name: 'Night Staff',      kind: 'weapon', damage: 33, forged: true, model: 'items/staff', swing: 'cast', ranged: 'magic', tint: 0x9a6ad0 },
  starpiercer:  { name: 'Star Piercer',     kind: 'weapon', damage: 32, forged: true, model: 'items/dagger', swing: 'stab', tint: 0xfff0a0 },
  starcleaver:  { name: 'Star Cleaver',     kind: 'weapon', damage: 58, forged: true, model: 'items/axe_2handed', swing: 'chop', tint: 0xfff0a0 },
  // --- epic: only dropped by the seasonal bosses in town (never sold in a shop; worth a fortune) ---
  blossomblade: { name: 'Blossom Blade',    kind: 'weapon', damage: 44, epic: true, sell: 30000, model: 'items/sword_2handed_color', swing: 'slash', tint: 0xffa8cf },
  petalaegis:   { name: 'Petal Aegis',      kind: 'shield', block: 0.64, epic: true, sell: 28000, model: 'items/shield_badge_color', tint: 0xffc8e0 },
  sunfirebow:   { name: 'Sunfire Crossbow', kind: 'weapon', damage: 45, epic: true, sell: 30000, model: 'items/crossbow_2handed', swing: 'cast', ranged: 'arrow', tint: 0xffb02a },
  sunplate:     { name: 'Sunforged Plate',  kind: 'armor', armor: 0.55, epic: true, sell: 30000, color: 0xffb02a, model: 'dungeon/trunk_small_C' },
  harvestreaper:{ name: 'Harvest Reaper',   kind: 'weapon', damage: 62, epic: true, sell: 34000, model: 'items/axe_2handed', swing: 'chop', tint: 0xd8782a },
  emberstaff:   { name: 'Ember Staff',      kind: 'weapon', damage: 45, epic: true, sell: 30000, model: 'items/staff', swing: 'cast', ranged: 'magic', tint: 0xff6a2a },
  frostfang:    { name: 'Frostfang',        kind: 'weapon', damage: 36, epic: true, sell: 28000, model: 'items/dagger', swing: 'stab', tint: 0xbfeaff },
  glacierplate: { name: 'Glacier Plate',    kind: 'armor', armor: 0.56, epic: true, sell: 32000, color: 0xcfeeff, model: 'dungeon/trunk_small_C' },

  // --- shields (left hand): a chance to block a hit completely ---
  woodshield:   { name: 'Wooden Shield',  kind: 'shield', block: 0.15, price: 110,   tier: 0, model: 'items/shield_round' },
  squareshield: { name: 'Square Shield',  kind: 'shield', block: 0.25, price: 360,   tier: 0, model: 'items/shield_square' },
  spikeshield:  { name: 'Spiked Shield',  kind: 'shield', block: 0.35, price: 840,   tier: 0, model: 'items/shield_spikes' },
  royalshield:  { name: 'Royal Shield',   kind: 'shield', block: 0.45, price: 1800,  tier: 0, model: 'items/shield_badge_color' },
  steelshield:  { name: 'Steel Shield',   kind: 'shield', block: 0.5,  price: 4400,  tier: 1, model: 'items/shield_square_color', tint: 0xd6e2ee },
  mythrilshield:{ name: 'Mythril Shield', kind: 'shield', block: 0.54, price: 13000, tier: 2, model: 'items/shield_badge_color', tint: 0x7fd8ff },
  shadowshield: { name: 'Shadow Shield',  kind: 'shield', block: 0.58, price: 32000, tier: 3, model: 'items/shield_spikes_color', tint: 0x7a52b8 },
  starshield:   { name: 'Star Aegis',     kind: 'shield', block: 0.62, price: 80000, tier: 4, model: 'items/shield_badge_color', tint: 0xfff0a0 },

  // --- armor (worn): takes this share off every hit. `color` paints the armor on your character ---
  leather:     { name: 'Leather Armor',    kind: 'armor', armor: 0.08, price: 120,   tier: 0, color: 0x9a6a3c, model: 'dungeon/trunk_small_A' },
  chainmail:   { name: 'Chainmail',        kind: 'armor', armor: 0.15, price: 520,   tier: 0, color: 0x9aa3ad, model: 'dungeon/trunk_small_A' },
  plate:       { name: 'Plate Armor',      kind: 'armor', armor: 0.22, price: 1500,  tier: 0, color: 0xc8ccd4, model: 'dungeon/trunk_small_B' },
  steelplate:  { name: 'Steel Plate',      kind: 'armor', armor: 0.3,  price: 4500,  tier: 1, color: 0xe2e8f0, model: 'dungeon/trunk_small_B' },
  mythrilmail: { name: 'Mythril Mail',     kind: 'armor', armor: 0.38, price: 13000, tier: 2, color: 0x7fd8ff, model: 'dungeon/trunk_small_C' },
  shadowplate: { name: 'Shadow Plate',     kind: 'armor', armor: 0.45, price: 32000, tier: 3, color: 0x7a52b8, model: 'dungeon/trunk_small_C' },
  starplate:   { name: 'Starforged Plate', kind: 'armor', armor: 0.52, price: 78000, tier: 4, color: 0xffe27a, model: 'dungeon/trunk_small_C' },

  // --- food & potions ---
  bread:       { name: 'Bread Roll',      kind: 'consumable', heal: 6,    price: 15,   tier: 0, model: 'dungeon/plate_food_B' },
  cocoa:       { name: 'Hot Cocoa',       kind: 'consumable', heal: 4,    price: 12,   tier: 0, model: 'items/mug_full' },
  potion:      { name: 'Health Potion',   kind: 'consumable', heal: 10,   price: 36,   tier: 0, model: 'dungeon/bottle_A_green' },
  pie:         { name: 'Apple Pie',       kind: 'consumable', heal: 20,   price: 60,   tier: 0, model: 'dungeon/plate_food_A' },
  bigpotion:   { name: 'Big Potion',      kind: 'consumable', heal: 30,   price: 96,   tier: 0, model: 'dungeon/bottle_C_green' },
  megapotion:  { name: 'Mega Potion',     kind: 'consumable', heal: 80,   price: 320,  tier: 1, model: 'dungeon/bottle_A_labeled_green' },
  feast:       { name: 'Hero’s Feast',    kind: 'consumable', heal: 150,  price: 700,  tier: 2, model: 'dungeon/plate_food_A' },
  elixir:      { name: 'Golden Elixir',   kind: 'consumable', heal: 9999, price: 1500, tier: 3, model: 'dungeon/bottle_C_brown' },
  // pet food: sold by the Pet Keeper, fed with G
  petfood:     { name: 'Pet Treat',       kind: 'consumable', petHeal: 12, price: 24,  model: 'dungeon/bottle_B_brown' },
  bigtreat:    { name: 'Deluxe Treat',    kind: 'consumable', petHeal: 45, price: 90,  model: 'dungeon/plate_small' },

  // --- loot (sell these in town) ---
  stone:       { name: 'Stone',           kind: 'loot', sell: 1,  model: 'blocks/stone' },
  copper:      { name: 'Copper Ore',      kind: 'loot', sell: 4,  model: 'blocks/stone_with_copper' },
  silver:      { name: 'Silver Ore',      kind: 'loot', sell: 8,  model: 'blocks/stone_with_silver' },
  goldore:     { name: 'Gold Ore',        kind: 'loot', sell: 18, model: 'blocks/stone_with_gold' },
  slimegoo:    { name: 'Slime Goo',       kind: 'loot', sell: 2,  model: 'dungeon/bottle_B_green' },
  mythril:     { name: 'Mythril Ore',     kind: 'loot', sell: 30, model: 'blocks/stone_with_silver', tint: 0x7fd8ff },
  obsidian:    { name: 'Obsidian',        kind: 'loot', sell: 55, model: 'blocks/stone_dark', tint: 0x9a6ad0 },
  // gem ores: rarer than metal, sparkly rocks deeper down (client/views.js RockView). `glow` = the gem's shine
  amethyst:    { name: 'Amethyst',        kind: 'loot', sell: 40,  model: 'props/crystalcluster', tint: 0xb46cff, gem: true, glow: 0x9a4dff },
  sapphire:    { name: 'Sapphire',        kind: 'loot', sell: 80,  model: 'props/crystalcluster', tint: 0x4f8dff, gem: true, glow: 0x2a6aff },
  emerald:     { name: 'Emerald',         kind: 'loot', sell: 130, model: 'props/crystalcluster', tint: 0x3fe08a, gem: true, glow: 0x1ac860 },
  ruby:        { name: 'Ruby',            kind: 'loot', sell: 190, model: 'props/crystalcluster', tint: 0xff4a6a, gem: true, glow: 0xff1a40 },
  opal:        { name: 'Rainbow Opal',    kind: 'loot', sell: 320, model: 'props/crystalcluster', tint: 0xf4f0ff, gem: true, glow: 0xffffff, rainbow: true },
  essence:     { name: 'Arcane Essence',  kind: 'loot', sell: 60, model: 'dungeon/bottle_B_green', tint: 0xb070ff }, // for enchanting: bosses drop it
  starstone:   { name: 'Starstone',       kind: 'loot', sell: 90, model: 'blocks/stone_with_gold', tint: 0xfff6c0 },

  // a blueprint teaches its recipe when picked up (see FORGE_RECIPES)
  blueprint:   { name: 'Blueprint',       kind: 'blueprint', model: 'items/spellbook_closed', tint: 0x6fa8ff },

  // gold coins go to whoever picks them up
  gold:        { name: 'Gold',            kind: 'currency', model: 'dungeon/coin' },
};

/** A new, tougher shop tier every this many levels (level 20, 40, 60, 80). */
export const SHOP_TIER_LEVELS = 20;
export const MAX_SHOP_TIER = 4;

/** Which shop tier a player of this level can buy from (0 = from the start). */
export function shopTier(level) {
  return Math.min(MAX_SHOP_TIER, Math.floor(level / SHOP_TIER_LEVELS));
}

/** The town shop's sections, in order. Each lists the item kinds it sells. */
export const SHOP_SECTIONS = [
  { id: 'weapons', name: 'Weapons', icon: '⚔', kinds: ['weapon'] },
  { id: 'shields', name: 'Shields', icon: '🛡', kinds: ['shield'] },
  { id: 'armor', name: 'Armor', icon: '🥋', kinds: ['armor'] },
  { id: 'food', name: 'Food & potions', icon: '🍎', kinds: ['consumable'] },
];

/** What the town shop sells: everything with a shop `tier` (the buyer's level decides which tiers are open). */
export const SHOP_STOCK = Object.keys(ITEMS).filter((id) => ITEMS[id].tier != null);

/** What the Pet Keeper sells besides pets. */
export const PET_SHOP_STOCK = ['petfood', 'bigtreat'];

/** Can a player of `level` buy `id` in the town shop? */
export function inShopFor(id, level) {
  const def = ITEMS[id];
  return def?.tier != null && def.tier <= shopTier(level);
}

/** Gold the shop pays for one of these (loot, or a weapon/shield/armor from your bag). */
export function sellValue(id) {
  const def = ITEMS[id];
  if (!def) return 0;
  if (def.sell) return def.sell;
  if (def.forged) return Math.max(10, Math.floor((FORGE_RECIPES[id]?.gold ?? 40) * 1.5));
  if (['weapon', 'shield', 'armor'].includes(def.kind)) return Math.max(5, Math.floor((def.price ?? 0) * 0.3));
  return 0;
}

/**
 * What Q eats or drinks: the smallest heal that covers what you're missing (so big potions are
 * saved for emergencies), or the biggest you have if nothing covers it. `key` = 'heal' | 'petHeal'.
 */
export function bestHeal(inventory, missing, key = 'heal') {
  const have = Object.keys(inventory ?? {}).filter((id) => inventory[id] > 0 && ITEMS[id]?.[key]).sort((x, y) => ITEMS[x][key] - ITEMS[y][key]);
  return have.find((id) => ITEMS[id][key] >= missing) ?? have.at(-1) ?? null;
}

/** Things you wear or wield (kept in the gear bag, one equipped per slot). */
export const GEAR_KINDS = ['weapon', 'shield', 'armor'];
export const isGear = (id) => GEAR_KINDS.includes(ITEMS[id]?.kind);

/** Seconds between attacks for each swing style (heavier = slower). */
export const SWING_COOLDOWN = { stab: 0.3, slash: 0.42, cast: 0.5, chop: 0.65 };

/** When the blow lands, in seconds after pressing attack (matches the strike frame of each clip). */
export const SWING_IMPACT = { stab: 0.19, slash: 0.27, cast: 0.3, chop: 0.38 };

/**
 * What the anvil can make. Find the blueprint in a dungeon first (deeper = better ones),
 * then bring the materials and gold. `depth` = shallowest floor its blueprint can drop on.
 */
export const FORGE_RECIPES = {
  copperblade:  { depth: 1,  gold: 48,  needs: { copper: 6, stone: 4 } },
  silverbow:    { depth: 4,  gold: 96,  needs: { silver: 5, copper: 3 } },
  slimewand:    { depth: 4,  gold: 96,  needs: { slimegoo: 6, silver: 2 } },
  silvershield: { depth: 4,  gold: 180, needs: { silver: 6, goldore: 2 } },
  goldenaxe:    { depth: 6,  gold: 240, needs: { goldore: 6, silver: 3 } },
  crystalstaff: { depth: 7,  gold: 300, needs: { goldore: 5, slimegoo: 5 } },
  dragonsword:  { depth: 9,  gold: 720, needs: { goldore: 10, silver: 10 } },
  // deep ores: their blueprint only drops once you can reach the floor the ore spawns on
  mythrilbrand: { depth: 50,  gold: 1200,  needs: { mythril: 5, stone: 6 } },
  mythrilbulwark: { depth: 55, gold: 1800, needs: { mythril: 6, goldore: 4 } },
  obsidianedge: { depth: 120, gold: 7200,  needs: { obsidian: 8, mythril: 4 } },
  nightstaff:   { depth: 130, gold: 7800,  needs: { obsidian: 6, goldore: 8 } },
  starpiercer:  { depth: 200, gold: 30000, needs: { starstone: 4, obsidian: 4 } },
  starcleaver:  { depth: 210, gold: 44000, needs: { starstone: 10, obsidian: 6 } },
};

/** A blueprint you don't know yet, from the ones that can drop this deep (or null). */
export function rollBlueprint(depth, known = [], rand = Math.random) {
  const pool = Object.entries(FORGE_RECIPES).filter(([id, r]) => depth >= r.depth && !known.includes(id)).map(([id]) => id);
  return pool.length ? pool[Math.floor(rand() * pool.length)] : null;
}

/**
 * Weapons and shields found in dungeons, by how deep you are (floor 1 = 1).
 * Each drop is from your depth's tier, sometimes one tier better.
 */
export const DROP_TIERS = [
  { depth: 1,   items: ['dagger', 'sword', 'axe', 'bow', 'staff', 'woodshield', 'leather'] },
  { depth: 4,   items: ['crossbow', 'wand', 'greataxe', 'sword', 'squareshield', 'chainmail'] },
  { depth: 8,   items: ['greatsword', 'heavybow', 'spellbook', 'greataxe', 'spikeshield', 'chainmail'] },
  { depth: 15,  items: ['royalsword', 'greatsword', 'heavybow', 'spellbook', 'royalshield', 'plate'] },
  { depth: 40,  items: ['steeldagger', 'steelblade', 'steelaxe', 'longbow', 'oakstaff', 'steelshield', 'steelplate'] },
  { depth: 90,  items: ['mythrildagger', 'mythrilblade', 'mythrilaxe', 'mythrilbow', 'mythrilwand', 'mythrilshield', 'mythrilmail'] },
  { depth: 160, items: ['shadowdagger', 'shadowblade', 'shadowaxe', 'shadowbow', 'shadowstaff', 'shadowshield', 'shadowplate'] },
  { depth: 230, items: ['stardagger', 'starblade', 'staraxe', 'starbow', 'starbook', 'starshield', 'starplate'] },
];

export function rollGearDrop(depth, rand = Math.random) {
  let tier = DROP_TIERS.findLastIndex((t) => depth >= t.depth);
  if (rand() < 0.15) tier = Math.min(tier + 1, DROP_TIERS.length - 1);
  const items = DROP_TIERS[Math.max(0, tier)].items;
  return items[Math.floor(rand() * items.length)];
}

/** Gold you get for finding a weapon/shield/armor you already own. */
export function duplicateValue(id) {
  return Math.max(10, sellValue(id));
}

export function weaponImpact(id) {
  return SWING_IMPACT[ITEMS[id]?.swing] ?? 0.25;
}

export function weaponCooldown(id) {
  return SWING_COOLDOWN[ITEMS[id]?.swing] ?? 0.4;
}

export function weaponDamage(id) {
  return ITEMS[id]?.damage ?? 1;
}
