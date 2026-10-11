// Item catalogue. `model` refers to a file under public/models (see client/assets.js).
// Weapons are also your mining tool, so damage applies to rocks too.
// `swing` picks the attack animation (see tools/blender/make_attacks.py).
// `ranged` weapons shoot a projectile ('arrow' or 'magic') instead of hitting up close.

export const ITEMS = {
  // --- weapons ---
  dagger:      { name: 'Dagger',          kind: 'weapon', damage: 2,  price: 0,    model: 'items/dagger', swing: 'stab' },
  staff:       { name: 'Apprentice Staff', kind: 'weapon', damage: 2,  price: 0,    model: 'items/staff', swing: 'cast', ranged: 'magic' },
  bow:         { name: 'Hunting Bow',     kind: 'weapon', damage: 2,  price: 0,    model: 'items/bow_withString', swing: 'cast', ranged: 'arrow' },
  sword:       { name: 'Short Sword',     kind: 'weapon', damage: 3,  price: 145,  model: 'items/sword_1handed', swing: 'slash' },
  axe:         { name: 'Hand Axe',        kind: 'weapon', damage: 3,  price: 145,  model: 'items/axe_1handed', swing: 'slash' },
  greataxe:    { name: 'Great Axe',       kind: 'weapon', damage: 5,  price: 480,  model: 'items/axe_2handed', swing: 'chop' },
  greatsword:  { name: 'Great Sword',     kind: 'weapon', damage: 7,  price: 1080, model: 'items/sword_2handed', swing: 'chop' },
  royalsword:  { name: 'Royal Blade',     kind: 'weapon', damage: 10, price: 2400, model: 'items/sword_2handed_color', swing: 'chop' },
  crossbow:    { name: 'Crossbow',        kind: 'weapon', damage: 4,  price: 300,  model: 'items/crossbow_1handed', swing: 'cast', ranged: 'arrow' },
  wand:        { name: 'Magic Wand',      kind: 'weapon', damage: 4,  price: 300,  model: 'items/wand', swing: 'cast', ranged: 'magic' },
  heavybow:    { name: 'Heavy Crossbow',  kind: 'weapon', damage: 7,  price: 1140, model: 'items/crossbow_2handed', swing: 'cast', ranged: 'arrow' },
  spellbook:   { name: 'Spellbook',       kind: 'weapon', damage: 7,  price: 1140, model: 'items/spellbook_open', swing: 'cast', ranged: 'magic' },

  // --- forged at the anvil in town from a blueprint (never sold). `tint` recolours the model ---
  copperblade:  { name: 'Copper Blade',     kind: 'weapon', damage: 5,  forged: true, model: 'items/sword_1handed', swing: 'slash', tint: 0xe08a4a },
  silverbow:    { name: 'Silver Bow',       kind: 'weapon', damage: 6,  forged: true, model: 'items/bow_withString', swing: 'cast', ranged: 'arrow', tint: 0xd8e4f0 },
  slimewand:    { name: 'Slime Wand',       kind: 'weapon', damage: 6,  forged: true, model: 'items/wand', swing: 'cast', ranged: 'magic', tint: 0x7cff6a },
  silvershield: { name: 'Silver Shield',    kind: 'shield', block: 0.4, forged: true, model: 'items/shield_square_color', tint: 0xdde8ff },
  goldenaxe:    { name: 'Golden Greataxe',  kind: 'weapon', damage: 9,  forged: true, model: 'items/axe_2handed', swing: 'chop', tint: 0xffd23f },
  crystalstaff: { name: 'Crystal Staff',    kind: 'weapon', damage: 10, forged: true, model: 'items/staff', swing: 'cast', ranged: 'magic', tint: 0x7fe8ff },
  dragonsword:  { name: 'Dragon Sword',     kind: 'weapon', damage: 13, forged: true, model: 'items/sword_2handed_color', swing: 'chop', tint: 0xff5a4a },

  // --- shields (left hand): a chance to block a hit completely ---
  woodshield:   { name: 'Wooden Shield',  kind: 'shield', block: 0.15, price: 110,  model: 'items/shield_round' },
  squareshield: { name: 'Square Shield',  kind: 'shield', block: 0.25, price: 360,  model: 'items/shield_square' },
  spikeshield:  { name: 'Spiked Shield',  kind: 'shield', block: 0.35, price: 840,  model: 'items/shield_spikes' },
  royalshield:  { name: 'Royal Shield',   kind: 'shield', block: 0.45, price: 1800, model: 'items/shield_badge_color' },

  // --- consumables ---
  cocoa:       { name: 'Hot Cocoa',       kind: 'consumable', heal: 4,  price: 12, model: 'items/mug_full' },
  potion:      { name: 'Health Potion',   kind: 'consumable', heal: 10, price: 36, model: 'dungeon/bottle_A_green' },
  bigpotion:   { name: 'Big Potion',      kind: 'consumable', heal: 30, price: 96, model: 'dungeon/bottle_C_green' },
  petfood:     { name: 'Pet Treat',       kind: 'consumable', petHeal: 12, price: 24, model: 'dungeon/bottle_B_brown' },

  // --- loot (sell these in town) ---
  stone:       { name: 'Stone',           kind: 'loot', sell: 1,  model: 'blocks/stone' },
  copper:      { name: 'Copper Ore',      kind: 'loot', sell: 4,  model: 'blocks/stone_with_copper' },
  silver:      { name: 'Silver Ore',      kind: 'loot', sell: 8,  model: 'blocks/stone_with_silver' },
  goldore:     { name: 'Gold Ore',        kind: 'loot', sell: 18, model: 'blocks/stone_with_gold' },
  slimegoo:    { name: 'Slime Goo',       kind: 'loot', sell: 2,  model: 'dungeon/bottle_B_green' },

  // a blueprint teaches its recipe when picked up (see FORGE_RECIPES)
  blueprint:   { name: 'Blueprint',       kind: 'blueprint', model: 'items/spellbook_closed', tint: 0x6fa8ff },

  // gold coins go straight to the family purse when picked up
  gold:        { name: 'Gold',            kind: 'currency', model: 'dungeon/coin' },
};

/** What the town shop sells. */
export const SHOP_STOCK = ['cocoa', 'potion', 'bigpotion', 'petfood', 'sword', 'axe', 'greataxe', 'greatsword', 'royalsword', 'crossbow', 'wand', 'heavybow', 'spellbook', 'woodshield', 'squareshield', 'spikeshield', 'royalshield'];

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
  silverbow:    { depth: 3,  gold: 96,  needs: { silver: 5, copper: 3 } },
  slimewand:    { depth: 3,  gold: 96,  needs: { slimegoo: 6, silver: 2 } },
  silvershield: { depth: 4,  gold: 180, needs: { silver: 6, goldore: 2 } },
  goldenaxe:    { depth: 6,  gold: 240, needs: { goldore: 6, silver: 3 } },
  crystalstaff: { depth: 7,  gold: 300, needs: { goldore: 5, slimegoo: 5 } },
  dragonsword:  { depth: 9,  gold: 720, needs: { goldore: 10, silver: 10 } },
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
  { depth: 1,  items: ['dagger', 'sword', 'axe', 'bow', 'staff', 'woodshield'] },
  { depth: 4,  items: ['crossbow', 'wand', 'greataxe', 'sword', 'squareshield'] },
  { depth: 8,  items: ['greatsword', 'heavybow', 'spellbook', 'greataxe', 'spikeshield'] },
  { depth: 15, items: ['royalsword', 'greatsword', 'heavybow', 'spellbook', 'royalshield'] },
];

export function rollGearDrop(depth, rand = Math.random) {
  let tier = DROP_TIERS.findLastIndex((t) => depth >= t.depth);
  if (rand() < 0.15) tier = Math.min(tier + 1, DROP_TIERS.length - 1);
  const items = DROP_TIERS[Math.max(0, tier)].items;
  return items[Math.floor(rand() * items.length)];
}

/** Gold you get for finding a weapon/shield you already own. */
export function duplicateValue(id) {
  return Math.max(10, Math.floor((ITEMS[id]?.price || 60) / 5));
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
