// Furniture for the Family Fort: beds (one per family member) and everything the Decorator in
// town sells once the King Slime is beaten. Placed furniture is a `furniture` entity in the fort,
// saved in save.house.furniture. Ids are stored in saves: never rename or remove one.
//
// `model` = a KayKit model, or `build` = a little model made in client/furniture.js.
// `radius` > 0 blocks movement. `light` = gives off a warm glow. `interact` = what E does.
// `seat` = you can sit on it (E): `y` = seat height (for the client), `face` = which way you face, added to its rot.

/** The Decorator unlocks when this world flag is set (beating the King Slime on mine floor 10). */
export const DECORATOR_FLAG = 'mineCleared';

export const FURNITURE = {
  bed:        { name: 'Bed', model: 'dungeon/bed_decorated', radius: 1.3, interact: 'sleep', notForSale: true },
  chair:      { name: 'Chair', model: 'dungeon/chair', price: 60, radius: 0.5, seat: { face: 0 } },
  stool:      { name: 'Stool', model: 'dungeon/stool', price: 40, radius: 0.45, seat: { face: 0 } },
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
  sofa:       { name: 'Comfy sofa', build: 'sofa', price: 260, radius: 1.2, seat: { face: 0 } },
  fireplace:  { name: 'Fireplace', build: 'fireplace', price: 500, radius: 1.3, light: true },
  aquarium:   { name: 'Fish tank', build: 'aquarium', price: 450, radius: 0.9 },
  petbed:     { name: 'Pet bed', build: 'petbed', price: 90, radius: 0 },
  // room decor, round 3
  desk:       { name: 'Writing desk', model: 'dungeon/table_small_decorated_B', price: 120, radius: 0.8 },
  toytrunk:   { name: 'Toy trunk', model: 'dungeon/trunk_medium_B', price: 90, radius: 0.8 },
  dresser:    { name: 'Dresser', model: 'dungeon/trunk_large_B', price: 160, radius: 0.9 },
  shelfsmall: { name: 'Little shelf', model: 'dungeon/shelf_small', price: 70, radius: 0.6 },
  clock:      { name: 'Grandfather clock', build: 'clock', price: 380, radius: 0.5 },
  toybox:     { name: 'Toy box', build: 'toybox', price: 110, radius: 0.7 },
  ruggreen:   { name: 'Green rug', build: 'rug', color: 0x3ac06a, price: 120, radius: 0 },
  rugpurple:  { name: 'Purple rug', build: 'rug', color: 0x8a5ac0, price: 120, radius: 0 },
  // the luxury collection: for families who've been saving up
  armchair:   { name: 'Velvet armchair', build: 'armchair', color: 0x9a2a3a, price: 1900, radius: 0.7, seat: { face: 0 }, luxury: true },
  vase:       { name: 'Porcelain vase', build: 'vase', price: 1800, radius: 0.4, luxury: true },
  candelabra: { name: 'Golden candelabra', build: 'candelabra', price: 2400, radius: 0.4, light: true, luxury: true },
  globe:      { name: 'Explorer’s globe', build: 'globe', price: 2800, radius: 0.5, luxury: true },
  royalrug:   { name: 'Royal rug', build: 'royalrug', price: 3000, radius: 0, luxury: true },
  library:    { name: 'Grand bookcase', build: 'library', price: 3200, radius: 1.0, luxury: true },
  harp:       { name: 'Golden harp', build: 'harp', price: 3600, radius: 0.6, luxury: true },
  statue:     { name: 'Marble knight statue', build: 'statue', price: 4400, radius: 0.8, luxury: true },
  fountain:   { name: 'Indoor fountain', build: 'fountain', price: 5600, radius: 1.2, luxury: true },
  piano:      { name: 'Grand piano', build: 'piano', price: 7000, radius: 1.5, luxury: true },
  throne:     { name: 'Golden throne', build: 'throne', price: 8000, radius: 0.9, seat: { face: 0 }, luxury: true },
};

/** Wall colours for the fort (painted over the stone walls). `price` 0 = the one you start with. */
export const WALL_STYLES = {
  stone: { name: 'Grey stone', price: 0 },
  cream: { name: 'Cream', price: 200, tint: 0xfff0d8 },
  rose:  { name: 'Rose', price: 200, tint: 0xffc2d0 },
  sky:   { name: 'Sky blue', price: 200, tint: 0xbfdcff },
  mint:  { name: 'Mint', price: 200, tint: 0xc4f2d8 },
  dusk:  { name: 'Dusk purple', price: 260, tint: 0xb8a6e0 },
  butter:{ name: 'Butter yellow', price: 200, tint: 0xfff2b0 },
  lavender: { name: 'Lavender', price: 200, tint: 0xe4d2ff },
  seafoam: { name: 'Seafoam', price: 200, tint: 0xbef0e2 },
  peach: { name: 'Peach', price: 200, tint: 0xffdcbe },
  // wallpaper: patterned panels over the walls (drawn by client/wallpaper.js). `tint` = the swatch fallback.
  candy:    { name: 'Candy stripe wallpaper', price: 900, tint: 0xffd6e4, pattern: { kind: 'stripes', bg: 0xfff4f7, fg: 0xffb3cc, accent: 0xff8fb2 } },
  regency:  { name: 'Regency stripe wallpaper', price: 1100, tint: 0x2f5a4a, pattern: { kind: 'stripes', bg: 0xf3ead2, fg: 0x2f5a4a, accent: 0xc9a43a } },
  polka:    { name: 'Polka dot wallpaper', price: 900, tint: 0xbfe0ff, pattern: { kind: 'polka', bg: 0xdff0ff, fg: 0xffffff } },
  meadow:   { name: 'Meadow flower wallpaper', price: 1200, tint: 0xfff6dc, pattern: { kind: 'floral', bg: 0xfff6dc, fg: 0xff9fb8, accent: 0xffd23f } },
  sweetheart: { name: 'Sweetheart wallpaper', price: 1200, tint: 0xffe0ea, pattern: { kind: 'hearts', bg: 0xffe9f0, fg: 0xff7aa0, accent: 0xffb3c8 } },
  starry:   { name: 'Starry night wallpaper', price: 1500, tint: 0x1c2550, pattern: { kind: 'stars', bg: 0x1c2550, fg: 0xdfe6ff, accent: 0xffe27a } },
  harlequin:{ name: 'Harlequin wallpaper', price: 1600, tint: 0x6a2a4a, pattern: { kind: 'harlequin', bg: 0xf0e2c8, fg: 0x6a2a4a, accent: 0xd9b24a } },
  damask:   { name: 'Gold damask wallpaper', price: 2000, tint: 0x5a1e2a, pattern: { kind: 'damask', bg: 0x5a1e2a, fg: 0xd9b24a, accent: 0xf2d27a } },
  royal:    { name: 'Royal crown wallpaper', price: 2400, tint: 0x24306a, pattern: { kind: 'royal', bg: 0x24306a, fg: 0xe8c45a, accent: 0xf6e2a0 } },
};

/** Floors for the fort. */
export const FLOOR_STYLES = {
  oak:    { name: 'Oak boards', price: 0, model: 'dungeon/floor_wood_large' },
  walnut: { name: 'Walnut boards', price: 180, model: 'dungeon/floor_wood_large_dark' },
  tiles:  { name: 'Stone tiles', price: 150, model: 'dungeon/floor_tile_large' },
  honey:  { name: 'Honey boards', price: 220, model: 'dungeon/floor_wood_large', tint: 0xffd08a },
  rosy:   { name: 'Rosy tiles', price: 220, model: 'dungeon/floor_tile_large', tint: 0xffc2c2 },
  crimson:{ name: 'Crimson tiles', price: 220, model: 'dungeon/floor_tile_large', tint: 0xe8a0a0 },
  forest: { name: 'Forest boards', price: 220, model: 'dungeon/floor_wood_large', tint: 0xa8e0a0 },
  pearl:  { name: 'Pearl tiles', price: 220, model: 'dungeon/floor_tile_large', tint: 0xf0f4f8 },
  night:  { name: 'Midnight boards', price: 260, model: 'dungeon/floor_wood_large_dark', tint: 0x9aa0c0 },
};

/** A blanket colour for each family member's bed (picked from their id, so it never changes). */
export const BLANKETS = [0xe0525a, 0x4f8ce0, 0x5cc06a, 0xf2b33d, 0xa36ce0, 0xf27fb8, 0x46c2c2, 0xf2884a];
export function blanketFor(playerId) {
  let h = 0;
  for (const ch of String(playerId)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return BLANKETS[h % BLANKETS.length];
}
