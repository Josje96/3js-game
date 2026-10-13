// Static props placed by maps or the dungeon generator.
// radius > 0 means it blocks movement. `interact` is handled by a server system (systems/*.js `interactions`).
// `npc` = a character model standing there (`npcLook` dresses them); `stall` = a canopy of that colour
// over a counter; `requiresFlag` = hidden (and unusable) until that world flag is set.

// Wide things block movement as a few circles ([dx, dz, r] from the prop), not one big one:
// a market stall is a counter and four poles 4.2 wide.
const STALL_BLOCKS = [[-1.4, 0.4, 1.4], [0, 0.4, 1.4], [1.4, 0.4, 1.4]];

export const PROPS = {
  chest:      { model: 'dungeon/chest', radius: 1.0, interact: 'storage', prompt: 'Family chest' },
  table:      { model: 'dungeon/table_medium_decorated_A', radius: 1.1 },
  barrel:     { model: 'dungeon/barrel_large', radius: 0.95 },
  keg:        { model: 'dungeon/keg_decorated', radius: 0.95 },
  crates:     { model: 'dungeon/crates_stacked', radius: 1.1 },
  box:        { model: 'dungeon/box_large', radius: 0.8 },
  boxsmall:   { model: 'dungeon/box_small_decorated', radius: 0.6 },
  pillar:     { model: 'dungeon/pillar', radius: 0.8 },
  rubble:     { model: 'dungeon/rubble_half', radius: 0 },
  torch:      { model: 'dungeon/torch_mounted', radius: 0, light: true },
  banner:     { model: 'dungeon/banner_patternA_red', radius: 0 },
  // generated with bun run make-props (tools/blender/make_props.py) — dungeon flavour + town clutter
  stalagmite: { model: 'props/stalagmite', radius: 0.7 },
  crystalcluster: { model: 'props/crystalcluster', radius: 0.6 },
  bonepile:   { model: 'props/bonepile', radius: 0.5 },
  minecart:   { model: 'props/minecart', radius: 1.0 },
  rails:      { model: 'props/rails', radius: 0 },  // flat on the floor: walk over it
  support:    { model: 'props/support', radius: 0.35 },
  well:       { model: 'props/well', radius: 0.9 },
  haybale:    { model: 'props/haybale', radius: 0.8 },
  crate:      { model: 'props/crate', radius: 0.7 },
  signpost:   { model: 'props/signpost', radius: 0.25 },
  // town: stalls under canopies around the market square, plus things to look at
  fountain:   { build: 'fountain', radius: 1.9 },
  // the fort's long feast table (14 long, benches either side): sit down with E and eat — it heals.
  // `seats` = where you sit [dx, dz, facing]
  feast:      { build: 'feast', radius: 1, offsetZ: 2, interact: 'feast', prompt: 'Sit down for food (10 gold, heals half your health)',
                // the table and both benches are solid end to end (you sit down onto a seat with E)
                blocks: [-6.5, -5, -3.5, -2, -0.5, 1, 2.5, 4, 5.5, 6.5].flatMap((dx) => [[dx, 0, 1.0], [dx, -1.75, 0.4], [dx, 1.75, 0.4]]),
                seats: [-4.5, -1.5, 1.5, 4.5].flatMap((dx) => [[dx, -1.75, 0], [dx, 1.75, Math.PI]]) },
  // the town square's dressing: all solid, nobody walks through them
  planter:    { build: 'planter', radius: 1.0 },
  cart:       { build: 'cart', radius: 1.0, blocks: [[-0.8, 0, 1.0], [0.8, 0, 1.0]] },
  noticeboard:{ build: 'noticeboard', radius: 0.6, interact: 'notices', prompt: 'Read the notice board' },
  // placed round the fountain by shared/locations.js; `r` = how far in front you get up, `seat.face` = which way you sit
  bench:      { build: 'bench', radius: 0, r: 0.55, interact: 'sit', prompt: 'Sit on the bench', seat: { face: 0 } },
  lamp:       { build: 'lamp', radius: 0.3, light: true },
  townsfolk:  { townsfolk: true, radius: 0.7, interact: 'talk', prompt: 'Talk' },
  decorator:  { npc: 'Rogue', npcName: 'Decorator', npcLook: { hat: 'tophat', clothes: 'suit', hair: 'suave', hairColor: 'ginger', face: 'monocle', cape: 'none' },
                radius: 2.3, offsetZ: -0.9, blocks: STALL_BLOCKS, interact: 'decorator', prompt: 'Decorator (furniture, walls & floors)', stall: 0x7a52b8,
                requiresFlag: 'mineCleared' },
  spring:     { build: 'springSign', radius: 0.5, offsetZ: 1.2, interact: 'spring', prompt: 'Healing spring — full heal for 50 gold, and 🍀 luck' },
  forge:      { build: 'forge', npc: 'Barbarian', npcName: 'Blacksmith', radius: 2.0, offsetZ: -0.6, blocks: [[-2.2, 0.2, 1.05], [0, 0.9, 0.9], [0, -0.6, 1.0]], interact: 'forge', prompt: 'Blacksmith (weapons, shields, armor & forging)' },
  mirror:     { build: 'mirror', radius: 0.7, offsetZ: -1.3, interact: 'mirror', prompt: 'Mirror (hair & face)' },
  wardrobe:   { build: 'wardrobe', radius: 1.2, offsetZ: -0.9, interact: 'wardrobe', prompt: 'Wardrobe (change outfit)' },
  petkeeper:  { npc: 'Ranger', npcName: 'Pet Keeper', radius: 2.3, offsetZ: -0.9, blocks: STALL_BLOCKS, interact: 'pets', prompt: 'Pet Keeper (pets & treats)', stall: 0xff9ab8, pets: true },
  // a shady figure in the town's far corner, under a dark tent with a bubbling cauldron, turned to face the town
  enchanter:  { build: 'enchanterTent', npc: 'Rogue_Hooded', npcName: 'Enchanter', npcLook: { hat: 'own', cape: 'own', dye: 'midnight', face: 'eyepatch' },
                rot: -Math.PI * 0.75, radius: 1.6, blocks: [[0, -0.9, 1.7], [0, 0.7, 0.8]], interact: 'enchant', prompt: 'Enchanter (make your weapons stronger)' },
  // the Seasonal Trader: a stall dressed for the season (client/town.js), selling season-only things
  seasonal:   { build: 'seasonalStall', npc: 'Ranger', npcName: 'Seasonal Trader', npcLook: { hat: 'none', cape: 'none', clothes: 'sunday', hair: 'bun', hairColor: 'ginger' },
                radius: 2.3, offsetZ: -0.9, blocks: STALL_BLOCKS, interact: 'seasonal', prompt: 'Seasonal Trader (only this season!)' },
  // the Banker's booth east of the market: a stone counter, a strongbox and a sign with a coin
  bank:       { build: 'bankBooth', npc: 'Mage', npcName: 'Banker', npcLook: { hat: 'tophat', clothes: 'suit', face: 'monocle', hair: 'suave', hairColor: 'white', cape: 'none' },
                radius: 1.8, offsetZ: -0.9, blocks: [[-1.1, 0.5, 1.1], [1.1, 0.5, 1.1], [0, -0.6, 1.0]], interact: 'bank', prompt: 'Bank (keep your gold safe, send gold to family)' },
  shopkeeper: { npc: 'Mage', npcName: 'Shopkeeper', npcLook: { hat: 'none', hair: 'bun', hairColor: 'ginger', clothes: 'sunday', cape: 'none' },
                radius: 2.3, offsetZ: -0.9, blocks: STALL_BLOCKS, interact: 'shop', prompt: 'Shop (food, potions, fashion, sell loot)', stall: 0x4f8ce0 },
};

/**
 * How far `who` is from being able to use `t` (0 or less = touching it). Long things with seats
 * (the feast table) count from their nearest seat, so they don't reach over everything nearby.
 */
export function useDistance(t, who) {
  if (t.seats?.length) {
    return Math.min(...t.seats.map(([dx, dz]) => Math.hypot(t.x + dx - who.x, t.z + dz - who.z))) - 0.6;
  }
  return Math.hypot(t.x - who.x, t.z - who.z) - (t.radius ?? t.r ?? 0);
}
