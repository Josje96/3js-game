// Furniture for the Family Fort: beds (one per family member) and everything the Decorator in
// town sells once the King Slime is beaten. Placed furniture is a `furniture` entity in the fort,
// saved in save.house.furniture. Ids are stored in saves: never rename or remove one.
//
// `model` = a KayKit model, or `build` = a little model made in client/furniture.js.
// `radius` > 0 blocks movement. `light` = gives off a warm glow. `interact` = what E does.

/** The Decorator unlocks when this world flag is set (beating the King Slime on mine floor 10). */
export const DECORATOR_FLAG = 'mineCleared';

export const FURNITURE = {
  bed:        { name: 'Bed', model: 'dungeon/bed_decorated', radius: 1.3, interact: 'sleep', notForSale: true },
  chair:      { name: 'Chair', model: 'dungeon/chair', price: 60, radius: 0.5 },
  stool:      { name: 'Stool', model: 'dungeon/stool', price: 40, radius: 0.45 },
  smalltable: { name: 'Small table', model: 'dungeon/table_small_decorated_A', price: 90, radius: 0.8 },
  table:      { name: 'Dining table', model: 'dungeon/table_medium_tablecloth_decorated_B', price: 180, radius: 1.1 },
  feasttable: { name: 'Feast table', model: 'dungeon/table_long_tablecloth_decorated_A', price: 320, radius: 1.6 },
  bookshelf:  { name: 'Bookshelf', model: 'dungeon/shelf_large', price: 150, radius: 0.9 },
  candleshelf:{ name: 'Candle shelf', model: 'dungeon/shelf_small_candles', price: 110, radius: 0.6, light: true },
  trunk:      { name: 'Treasure trunk', model: 'dungeon/trunk_large_A', price: 140, radius: 0.9 },
  barrel:     { name: 'Barrel', model: 'dungeon/barrel_large_decorated', price: 50, radius: 0.8 },
  kegs:       { name: 'Little kegs', model: 'dungeon/barrel_small_stack', price: 70, radius: 0.8 },
  crates:     { name: 'Crates', model: 'dungeon/box_stacked', price: 60, radius: 0.9 },
  candles:    { name: 'Candles', model: 'dungeon/candle_triple', price: 30, radius: 0, light: true },
  trophy:     { name: 'Sword & shield trophy', model: 'dungeon/sword_shield_gold', price: 400, radius: 0.6 },
  pillar:     { name: 'Fancy pillar', model: 'dungeon/pillar_decorated', price: 200, radius: 0.8 },
  rugred:     { name: 'Red rug', build: 'rug', color: 0xc0393b, price: 120, radius: 0 },
  rugblue:    { name: 'Blue rug', build: 'rug', color: 0x3b6fc0, price: 120, radius: 0 },
  plant:      { name: 'Potted plant', build: 'plant', price: 80, radius: 0.5 },
  lamp:       { name: 'Floor lamp', build: 'lamp', price: 150, radius: 0.4, light: true },
  sofa:       { name: 'Comfy sofa', build: 'sofa', price: 260, radius: 1.2 },
  fireplace:  { name: 'Fireplace', build: 'fireplace', price: 500, radius: 1.3, light: true },
  aquarium:   { name: 'Fish tank', build: 'aquarium', price: 450, radius: 0.9 },
  petbed:     { name: 'Pet bed', build: 'petbed', price: 90, radius: 0 },
};

/** Wall colours for the fort (painted over the stone walls). `price` 0 = the one you start with. */
export const WALL_STYLES = {
  stone: { name: 'Grey stone', price: 0 },
  cream: { name: 'Cream', price: 200, tint: 0xfff0d8 },
  rose:  { name: 'Rose', price: 200, tint: 0xffc2d0 },
  sky:   { name: 'Sky blue', price: 200, tint: 0xbfdcff },
  mint:  { name: 'Mint', price: 200, tint: 0xc4f2d8 },
  dusk:  { name: 'Dusk purple', price: 260, tint: 0xb8a6e0 },
};

/** Floors for the fort. */
export const FLOOR_STYLES = {
  oak:    { name: 'Oak boards', price: 0, model: 'dungeon/floor_wood_large' },
  walnut: { name: 'Walnut boards', price: 180, model: 'dungeon/floor_wood_large_dark' },
  tiles:  { name: 'Stone tiles', price: 150, model: 'dungeon/floor_tile_large' },
  honey:  { name: 'Honey boards', price: 220, model: 'dungeon/floor_wood_large', tint: 0xffd08a },
  rosy:   { name: 'Rosy tiles', price: 220, model: 'dungeon/floor_tile_large', tint: 0xffc2c2 },
};

/** A blanket colour for each family member's bed (picked from their id, so it never changes). */
export const BLANKETS = [0xe0525a, 0x4f8ce0, 0x5cc06a, 0xf2b33d, 0xa36ce0, 0xf27fb8, 0x46c2c2, 0xf2884a];
export function blanketFor(playerId) {
  let h = 0;
  for (const ch of String(playerId)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return BLANKETS[h % BLANKETS.length];
}
