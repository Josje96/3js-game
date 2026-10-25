// Furniture for the Family Fort: beds (one per family member) and everything the Decorator in
// town sells once the Goblin King is beaten. Placed furniture is a `furniture` entity in the fort,
// saved in save.house.furniture. Ids are stored in saves: never rename or remove one.
//
// `model` = a KayKit model, or `build` = a little model made in client/furniture.js.
// `radius` > 0 blocks movement. `light` = gives off a warm glow. `interact` = what E does.
// `seat` = you can sit on it (E): `y` = seat height (for the client), `face` = which way you face, added to its rot.

/** The Decorator unlocks when this world flag is set (beating the Goblin King on mine floor 10). */
export const DECORATOR_FLAG = 'mineCleared';

export const FURNITURE = {
  bed:        { name: 'Bed', model: 'dungeon/bed_decorated', radius: 1.3, interact: 'sleep', notForSale: true },
  calendar:   { name: 'Calendar', build: 'calendar', radius: 0.35, interact: 'calendar', notForSale: true }, // beside every bed: sleep until the next season
  // a beaten dungeon's trophy: everyone takes one from the stand by its gate in town (systems/trophies.js)
  minetrophy:  { name: 'Old Mine trophy', build: 'minetrophy', radius: 0.5, notForSale: true, trophy: 'mine' },
  ruinstrophy: { name: 'Sunken Ruins trophy', build: 'ruinstrophy', radius: 0.5, notForSale: true, trophy: 'ruins' },
  keeptrophy:  { name: 'Shadow Keep trophy', build: 'keeptrophy', radius: 0.5, notForSale: true, trophy: 'keep' },
  raidbanner:  { name: 'Captured Shadow banner', build: 'raidbanner', radius: 0.5, notForSale: true }, // the first Shadow Raid beaten off (server/systems/raid.js)
  chair:      { name: 'Chair', model: 'dungeon/chair', price: 60, radius: 0.5, seat: { face: -Math.PI / 2, y: 0.52 } }, // (the model's back is on its +x side)
  stool:      { name: 'Stool', model: 'dungeon/stool', price: 40, radius: 0.45, seat: { face: 0, y: 0.5 } },
  smalltable: { name: 'Small table', model: 'dungeon/table_small_decorated_A', price: 90, radius: 0.8 },
  table:      { name: 'Dining table', model: 'dungeon/table_medium_tablecloth_decorated_B', price: 180, radius: 1.1 },
  feasttable: { name: 'Feast table', model: 'dungeon/table_long_tablecloth_decorated_A', price: 320, radius: 1.6 },
  bookshelf:  { name: 'Bookshelf', model: 'dungeon/shelf_large', price: 150, radius: 0.9 },
  candleshelf:{ name: 'Candle shelf', model: 'dungeon/shelf_small_candles', price: 110, radius: 0.6, light: true },
  trunk:      { name: 'Treasure trunk', model: 'dungeon/trunk_large_A', price: 140, radius: 0.9, use: 'treasure' },
  barrel:     { name: 'Barrel', model: 'dungeon/barrel_large_decorated', price: 50, radius: 0.8 },
  kegs:       { name: 'Little kegs', model: 'dungeon/barrel_small_stack', price: 70, radius: 0.8 },
  crates:     { name: 'Crates', model: 'dungeon/box_stacked', price: 60, radius: 0.9 },
  candles:    { name: 'Candles', model: 'dungeon/candle_triple', price: 30, radius: 0, light: true, use: 'light' },
  trophy:     { name: 'Sword & shield trophy', model: 'dungeon/sword_shield_gold', price: 400, radius: 0.6 },
  pillar:     { name: 'Fancy pillar', model: 'dungeon/pillar_decorated', price: 200, radius: 0.8 },
  rugred:     { name: 'Red rug', build: 'rug', color: 0xc0393b, price: 120, radius: 0 },
  rugblue:    { name: 'Blue rug', build: 'rug', color: 0x3b6fc0, price: 120, radius: 0 },
  plant:      { name: 'Potted plant', build: 'plant', price: 80, radius: 0.5 },
  lamp:       { name: 'Floor lamp', build: 'lamp', price: 150, radius: 0.4, light: true, use: 'light' },
  sofa:       { name: 'Comfy sofa', build: 'sofa', price: 260, radius: 1.2, seat: { face: 0, y: 0.87 } },
  fireplace:  { name: 'Fireplace', build: 'fireplace', price: 500, radius: 1.3, light: true, use: 'fire' },
  aquarium:   { name: 'Fish tank', build: 'aquarium', price: 450, radius: 0.9, use: 'aquarium' },
  petbed:     { name: 'Pet bed', build: 'petbed', price: 90, radius: 0 },
  // room decor, round 3
  desk:       { name: 'Writing desk', model: 'dungeon/table_small_decorated_B', price: 120, radius: 0.8 },
  toytrunk:   { name: 'Toy trunk', model: 'dungeon/trunk_medium_B', price: 90, radius: 0.8, use: 'toybox' },
  dresser:    { name: 'Dresser', model: 'dungeon/trunk_large_B', price: 160, radius: 0.9 },
  shelfsmall: { name: 'Little shelf', model: 'dungeon/shelf_small', price: 70, radius: 0.6 },
  clock:      { name: 'Grandfather clock', build: 'clock', price: 380, radius: 0.5, use: 'clock' },
  toybox:     { name: 'Toy box', build: 'toybox', price: 110, radius: 0.7, use: 'toybox' },
  ruggreen:   { name: 'Green rug', build: 'rug', color: 0x3ac06a, price: 120, radius: 0 },
  rugpurple:  { name: 'Purple rug', build: 'rug', color: 0x8a5ac0, price: 120, radius: 0 },
  // more for every home (E does something on most of them: see USES)
  teddy:      { name: 'Giant teddy bear', build: 'teddy', price: 180, radius: 0.6, use: 'teddy' },
  easel:      { name: 'Painting easel', build: 'easel', price: 220, radius: 0.5, use: 'easel' },
  bigtop:     { name: 'Mini circus tent', build: 'bigtop', price: 900, radius: 1.4 },
  circusball: { name: 'Circus ball', build: 'circusball', price: 240, radius: 0.6 },
  podium:     { name: 'Circus podium', build: 'podium', price: 320, radius: 0.7 },
  heartrug:       { name: 'Pink heart rug', build: 'heartrug', price: 260, radius: 0 },
  unicornplush:   { name: 'Unicorn plush', build: 'unicornplush', price: 340, radius: 0.5 },
  canopy:         { name: 'Princess canopy nook', build: 'canopy', price: 900, radius: 0.9 },
  cloudlamp:      { name: 'Rainbow cloud lamp', build: 'cloudlamp', price: 380, radius: 0.35, light: true, lightY: 1.25, lightColor: 0xffe8f4, use: 'light' },
  vanity:         { name: 'Princess vanity', build: 'vanity', price: 650, radius: 0.7 },
  rockingunicorn: { name: 'Unicorn rocking horse', build: 'rockingunicorn', price: 560, radius: 0.6 },
  heartballoons:  { name: 'Heart balloons', build: 'heartballoons', price: 220, radius: 0.35 },
  pram:           { name: 'Doll’s pram', build: 'pram', price: 300, radius: 0.5 },
  strawberrypouf: { name: 'Strawberry pouf', build: 'strawberrypouf', price: 280, radius: 0.5, seat: { face: 0, y: 0.62 } },
  beanbag:    { name: 'Squishy beanbag', build: 'beanbag', price: 160, radius: 0.6, seat: { face: 0, y: 0.62 } },
  lantern:    { name: 'Hanging lantern', build: 'lantern', price: 120, radius: 0.3, light: true, lightY: 2.2, use: 'light' },
  cauldron:   { name: 'Bubbling cauldron', build: 'cauldron', price: 340, radius: 0.7, use: 'cauldron' },
  bookstack:  { name: 'Stack of books', build: 'bookstack', price: 70, radius: 0.4 },
  palm:       { name: 'Potted palm', build: 'palm', price: 200, radius: 0.5 },
  // seasonal decorations: only from the Seasonal Trader, in their season (shared/seasonal.js)
  blossomtree: { name: 'Cherry blossom tree', build: 'blossomtree', price: 900, radius: 0.6, seasonal: 'spring' },
  bunnyplush:  { name: 'Bunny plush', build: 'bunnyplush', price: 400, radius: 0.4, seasonal: 'spring', use: 'teddy' },
  eggbasket:   { name: 'Painted egg basket', build: 'eggbasket', price: 450, radius: 0.5, seasonal: 'spring' },
  birdhouse:   { name: 'Birdhouse on a post', build: 'birdhouse', price: 500, radius: 0.4, seasonal: 'spring', use: 'birdcage' },
  tulips:      { name: 'Tulip planter', build: 'tulips', price: 350, radius: 0.5, seasonal: 'spring' },
  maypolemini: { name: 'Little maypole', build: 'maypolemini', price: 700, radius: 0.5, seasonal: 'spring', use: 'globe' },
  parasol:     { name: 'Beach parasol', build: 'parasol', price: 600, radius: 0.3, seasonal: 'summer' },
  beachball:   { name: 'Beach ball', build: 'beachball', price: 250, radius: 0.4, seasonal: 'summer', use: 'globe' },
  sandcastle:  { name: 'Sandcastle', build: 'sandcastle', price: 550, radius: 0.7, seasonal: 'summer' },
  sunflowers:  { name: 'Sunflowers', build: 'sunflowers', price: 400, radius: 0.4, seasonal: 'summer' },
  shellbowl:   { name: 'Bowl of seashells', build: 'shellbowl', price: 300, radius: 0.4, seasonal: 'summer' },
  surfboard:   { name: 'Surfboard', build: 'surfboard', price: 650, radius: 0.4, seasonal: 'summer' },
  jackolantern:{ name: 'Jack-o’-lantern', build: 'jackolantern', price: 450, radius: 0.5, light: true, lightY: 0.6, lightColor: 0xff9a3a, seasonal: 'autumn', use: 'light' },
  scarecrow:   { name: 'Friendly scarecrow', build: 'scarecrow', price: 700, radius: 0.5, seasonal: 'autumn' },
  leafpile:    { name: 'Pile of leaves', build: 'leafpile', price: 250, radius: 0, seasonal: 'autumn' },
  applebasket: { name: 'Apple basket', build: 'applebasket', price: 350, radius: 0.5, seasonal: 'autumn' },
  cornstalks:  { name: 'Corn stalks', build: 'cornstalks', price: 400, radius: 0.4, seasonal: 'autumn' },
  acornbowl:   { name: 'Acorns & gourds', build: 'acornbowl', price: 300, radius: 0.4, seasonal: 'autumn' },
  snowman:     { name: 'Snowman', build: 'snowman', price: 600, radius: 0.6, seasonal: 'winter' },
  xmastree:    { name: 'Festive tree', build: 'xmastree', price: 1200, radius: 0.8, light: true, lightY: 1.6, lightColor: 0xffe27a, seasonal: 'winter', use: 'light' },
  giftpile:    { name: 'Pile of presents', build: 'giftpile', price: 500, radius: 0.6, seasonal: 'winter', use: 'toybox' },
  snowglobe:   { name: 'Giant snow globe', build: 'snowglobe', price: 800, radius: 0.5, seasonal: 'winter', use: 'globe' },
  icesculpture:{ name: 'Ice swan', build: 'icesculpture', price: 900, radius: 0.6, seasonal: 'winter' },
  stocking:    { name: 'Hanging stockings', build: 'stocking', price: 300, radius: 0.3, seasonal: 'winter' },
  // the luxury collection: for families who've been saving up
  armchair:   { name: 'Velvet armchair', build: 'armchair', color: 0x9a2a3a, price: 1900, radius: 0.7, seat: { face: 0, y: 0.7 }, luxury: true },
  vase:       { name: 'Porcelain vase', build: 'vase', price: 1800, radius: 0.4, luxury: true },
  candelabra: { name: 'Golden candelabra', build: 'candelabra', price: 2400, radius: 0.4, light: true, luxury: true, use: 'light' },
  globe:      { name: 'Explorer’s globe', build: 'globe', price: 2800, radius: 0.5, luxury: true, use: 'globe' },
  royalrug:   { name: 'Royal rug', build: 'royalrug', price: 3000, radius: 0, luxury: true },
  library:    { name: 'Grand bookcase', build: 'library', price: 3200, radius: 1.0, luxury: true },
  harp:       { name: 'Golden harp', build: 'harp', price: 3600, radius: 0.6, luxury: true, use: 'harp' },
  statue:     { name: 'Marble knight statue', build: 'statue', price: 4400, radius: 0.8, luxury: true },
  fountain:   { name: 'Indoor fountain', build: 'fountain', price: 5600, radius: 1.2, luxury: true, use: 'fountain' },
  piano:      { name: 'Grand piano', build: 'piano', price: 7000, radius: 1.5, luxury: true, use: 'piano' },
  throne:     { name: 'Golden throne', build: 'throne', price: 8000, radius: 0.9, seat: { face: 0, y: 0.63 }, luxury: true },
  // the luxury collection, part 2 (`lightY` / `lightColor` move or tint the glow)
  rockinghorse:{ name: 'Rocking horse', build: 'rockinghorse', price: 2000, radius: 0.7, luxury: true, use: 'rockinghorse' },
  mirror:     { name: 'Gilded mirror', build: 'mirror', price: 2200, radius: 0.5, luxury: true },
  birdcage:   { name: 'Golden birdcage', build: 'birdcage', price: 2400, radius: 0.5, luxury: true, use: 'birdcage' },
  musicbox:   { name: 'Ballerina music box', build: 'musicbox', price: 2500, radius: 0.5, luxury: true, use: 'musicbox' },
  teaset:     { name: 'Royal tea table', build: 'teaset', price: 2600, radius: 0.8, luxury: true },
  bearrug:    { name: 'Bear rug', build: 'bearrug', price: 2800, radius: 0, luxury: true },
  tapestry:   { name: 'Royal crest tapestry', build: 'tapestry', price: 3000, radius: 0.5, luxury: true },
  telescope:  { name: 'Brass telescope', build: 'telescope', price: 3400, radius: 0.6, luxury: true, use: 'telescope' },
  crystalball:{ name: 'Wizard’s crystal ball', build: 'crystalball', price: 3800, radius: 0.5, light: true, lightY: 1.4, lightColor: 0xb48cff, luxury: true, use: 'crystalball' },
  armor:      { name: 'Suit of armour', build: 'armor', price: 4800, radius: 0.6, luxury: true, use: 'armor' },
  bathtub:    { name: 'Golden bathtub', build: 'bathtub', price: 5200, radius: 1.1, luxury: true, use: 'bathtub' },
  chandelier: { name: 'Crystal chandelier', build: 'chandelier', price: 6000, radius: 0, light: true, lightY: 2.6, luxury: true, use: 'light' },
  organ:      { name: 'Pipe organ', build: 'organ', price: 9000, radius: 1.3, luxury: true, use: 'organ' },
  gramophone: { name: 'Gramophone', build: 'gramophone', price: 3000, radius: 0.5, luxury: true, use: 'gramophone' },
  cakestand:  { name: 'Grand cake stand', build: 'cakestand', price: 2600, radius: 0.5, luxury: true, use: 'cake' },
  dollhouse:  { name: 'Royal dollhouse', build: 'dollhouse', price: 3600, radius: 0.9, luxury: true, use: 'dollhouse' },
  hoard:      { name: 'Dragon’s hoard', build: 'hoard', price: 12000, radius: 1.1, luxury: true, use: 'hoard' },
  // the luxury collection, part 3
  lavalamp:   { name: 'Giant lava lamp', build: 'lavalamp', price: 2200, radius: 0.4, light: true, lightY: 1.0, lightColor: 0xff7ad0, luxury: true, use: 'light' },
  bonsai:     { name: 'Golden bonsai', build: 'bonsai', price: 2400, radius: 0.5, luxury: true },
  popcorn:    { name: 'Popcorn machine', build: 'popcorn', price: 2600, radius: 0.5, luxury: true, use: 'popcorn' },
  hourglass:  { name: 'Giant hourglass', build: 'hourglass', price: 2800, radius: 0.5, luxury: true },
  icecream:   { name: 'Ice-cream cart', build: 'icecream', price: 3000, radius: 0.8, luxury: true, use: 'icecream' },
  crystals:   { name: 'Glowing crystals', build: 'crystals', price: 3400, radius: 0.6, light: true, lightY: 0.8, lightColor: 0x7fd8ff, luxury: true, use: 'light' },
  rocket:     { name: 'Model rocket', build: 'rocket', price: 3500, radius: 0.6, luxury: true },
  trophycase: { name: 'Trophy cabinet', build: 'trophycase', price: 3600, radius: 0.8, luxury: true },
  peacock:    { name: 'Peacock statue', build: 'peacock', price: 4000, radius: 0.7, luxury: true },
  jukebox:    { name: 'Glowing jukebox', build: 'jukebox', price: 4200, radius: 0.6, light: true, lightY: 1.2, lightColor: 0xffb04a, luxury: true, use: 'jukebox' },
  castlemodel:{ name: 'Model castle', build: 'castlemodel', price: 4400, radius: 0.9, luxury: true },
  arcade:     { name: 'Arcade cabinet', build: 'arcade', price: 4800, radius: 0.6, luxury: true, use: 'arcade' },
  treasurechest: { name: 'Royal treasure chest', build: 'treasurechest', price: 5000, radius: 0.7, luxury: true, use: 'treasure' },
  wishingwell:{ name: 'Wishing well', build: 'wishingwell', price: 5000, radius: 0.9, luxury: true, use: 'wish' },
  orrery:     { name: 'Brass orrery', build: 'orrery', price: 5200, radius: 0.6, luxury: true },
  pooltable:  { name: 'Billiards table', build: 'pooltable', price: 6000, radius: 1.4, luxury: true },
  unicornstatue: { name: 'Unicorn statue', build: 'unicornstatue', price: 6000, radius: 0.8, luxury: true },
  koipond:    { name: 'Indoor koi pond', build: 'koipond', price: 6500, radius: 1.2, luxury: true, use: 'aquarium' },
  carousel:   { name: 'Little carousel', build: 'carousel', price: 7500, radius: 1.1, luxury: true, use: 'carousel' },
  dragonstatue: { name: 'Golden dragon statue', build: 'dragonstatue', price: 9000, radius: 1.0, luxury: true },
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
  // more paint
  coral:    { name: 'Coral', price: 200, tint: 0xffb8a8 },
  sage:     { name: 'Sage green', price: 200, tint: 0xc8dcb8 },
  powder:   { name: 'Powder blue', price: 200, tint: 0xd2e6ff },
  lilac:    { name: 'Lilac', price: 200, tint: 0xd8c4f0 },
  sand:     { name: 'Sandstone', price: 220, tint: 0xf0dcb0 },
  terracotta: { name: 'Terracotta', price: 240, tint: 0xe0a080 },
  forestwall: { name: 'Forest green', price: 260, tint: 0x9cc89a },
  navy:     { name: 'Deep navy', price: 260, tint: 0x8c9ad0 },
  // more wallpaper
  gingham:  { name: 'Picnic gingham wallpaper', price: 900, tint: 0xffc8c8, pattern: { kind: 'gingham', bg: 0xffffff, fg: 0xff9a9a } },
  bluegingham: { name: 'Blue gingham wallpaper', price: 900, tint: 0xbcd8ff, pattern: { kind: 'gingham', bg: 0xffffff, fg: 0x8ab8f0 } },
  mintstripe: { name: 'Mint stripe wallpaper', price: 900, tint: 0xc8f0dc, pattern: { kind: 'stripes', bg: 0xf2fff8, fg: 0xa8e6c8, accent: 0x6fcf9f } },
  lemondot: { name: 'Lemon dot wallpaper', price: 900, tint: 0xfff0a0, pattern: { kind: 'polka', bg: 0xfff6c0, fg: 0xffffff } },
  mermaid:  { name: 'Mermaid scale wallpaper', price: 1400, tint: 0x7fd0d8, pattern: { kind: 'scales', bg: 0x5ab8c8, fg: 0x9fe6ea, accent: 0xd8b4ff } },
  dragonscale: { name: 'Dragon scale wallpaper', price: 1600, tint: 0x3a7a4a, pattern: { kind: 'scales', bg: 0x2a5a3a, fg: 0x5aa06a, accent: 0xe0c050 } },
  garden:   { name: 'Rose garden wallpaper', price: 1200, tint: 0xe8f4e0, pattern: { kind: 'floral', bg: 0xe8f4e0, fg: 0xff6a8a, accent: 0xffffff } },
  lovebirds:{ name: 'Lilac hearts wallpaper', price: 1200, tint: 0xeee0ff, pattern: { kind: 'hearts', bg: 0xf4ecff, fg: 0xb48cff, accent: 0xff9ac8 } },
  sunset:   { name: 'Sunset stars wallpaper', price: 1500, tint: 0x6a2a5a, pattern: { kind: 'stars', bg: 0x5a2350, fg: 0xffc8e0, accent: 0xffb04a } },
  emeraldhq:{ name: 'Emerald harlequin wallpaper', price: 1600, tint: 0x1f5a40, pattern: { kind: 'harlequin', bg: 0xe8f0e0, fg: 0x1f5a40, accent: 0xd9b24a } },
  silverdamask: { name: 'Silver damask wallpaper', price: 2000, tint: 0x2a3550, pattern: { kind: 'damask', bg: 0x2a3550, fg: 0xc8d0e0, accent: 0xeef2ff } },
  rubyroyal:{ name: 'Ruby crown wallpaper', price: 2400, tint: 0x7a1a2a, pattern: { kind: 'royal', bg: 0x7a1a2a, fg: 0xe8c45a, accent: 0xf6e2a0 } },
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
  // more floors
  cherry:   { name: 'Cherry boards', price: 220, model: 'dungeon/floor_wood_large', tint: 0xe89a8a },
  maple:    { name: 'Maple boards', price: 220, model: 'dungeon/floor_wood_large', tint: 0xffe2b0 },
  whitewash:{ name: 'Whitewashed boards', price: 240, model: 'dungeon/floor_wood_large', tint: 0xf4f0ea },
  ebony:    { name: 'Ebony boards', price: 260, model: 'dungeon/floor_wood_large_dark', tint: 0x6a6070 },
  chocolate:{ name: 'Chocolate boards', price: 240, model: 'dungeon/floor_wood_large_dark', tint: 0xc89a7a },
  teal:     { name: 'Teal boards', price: 240, model: 'dungeon/floor_wood_large', tint: 0x9adad4 },
  lilacwood:{ name: 'Lilac boards', price: 240, model: 'dungeon/floor_wood_large', tint: 0xd4c0f0 },
  sunny:    { name: 'Sunflower boards', price: 240, model: 'dungeon/floor_wood_large', tint: 0xffe680 },
  skytile:  { name: 'Sky tiles', price: 220, model: 'dungeon/floor_tile_large', tint: 0xbcdcff },
  minttile: { name: 'Mint tiles', price: 220, model: 'dungeon/floor_tile_large', tint: 0xbcf0d0 },
  lemontile:{ name: 'Lemon tiles', price: 220, model: 'dungeon/floor_tile_large', tint: 0xfff2a8 },
  terracottatile: { name: 'Terracotta tiles', price: 240, model: 'dungeon/floor_tile_large', tint: 0xf0a888 },
  slate:    { name: 'Slate tiles', price: 240, model: 'dungeon/floor_tile_large', tint: 0x8a90a0 },
  sandtile: { name: 'Sand tiles', price: 220, model: 'dungeon/floor_tile_large', tint: 0xf4e0b8 },
  emerald:  { name: 'Emerald tiles', price: 300, model: 'dungeon/floor_tile_large', tint: 0x7ed8a0 },
  sapphire: { name: 'Sapphire tiles', price: 300, model: 'dungeon/floor_tile_large', tint: 0x8aa8ff },
  amethyst: { name: 'Amethyst tiles', price: 300, model: 'dungeon/floor_tile_large', tint: 0xc8a0ff },
  goldtile: { name: 'Gold tiles', price: 400, model: 'dungeon/floor_tile_large', tint: 0xffd870 },
  coraltile:{ name: 'Coral tiles', price: 240, model: 'dungeon/floor_tile_large', tint: 0xffb0a0 },
  cloud:    { name: 'Cloud tiles', price: 260, model: 'dungeon/floor_tile_large', tint: 0xfaf8ff },
};

/** A blanket colour for each family member's bed (picked from their id, so it never changes). */
export const BLANKETS = [0xe0525a, 0x4f8ce0, 0x5cc06a, 0xf2b33d, 0xa36ce0, 0xf27fb8, 0x46c2c2, 0xf2884a];
export function blanketFor(playerId) {
  let h = 0;
  for (const ch of String(playerId)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return BLANKETS[h % BLANKETS.length];
}

/**
 * What a piece does when you press E on it (`use` on the furniture). `verb` is the prompt;
 * `toggle` pieces switch on and off (the bath fills, lamps light) and remember it until the fort
 * reloads; `startOn` = how they come. `say` = a line or two you get told (picked at random).
 */
export const USES = {
  piano:        { verb: 'Play the piano' },
  organ:        { verb: 'Play the pipe organ' },
  harp:         { verb: 'Strum the harp' },
  musicbox:     { verb: 'Wind up the music box' },
  globe:        { verb: 'Spin the globe' },
  rockinghorse: { verb: 'Rock the horse' },
  birdcage:     { verb: 'Whistle to the bird' },
  aquarium:     { verb: 'Feed the fish' },
  hoard:        { verb: 'Count the treasure' },
  armor:        { verb: 'Salute the knight' },
  toybox:       { verb: 'Rummage for a toy', say: ['You find a squeaky duck! 🦆', 'A wooden sword — en garde!', 'A spinning top whirrs across the floor.', 'A teddy bear. It looks pleased to see you. 🧸'] },
  treasure:     { verb: 'Open the trunk', say: ['Just old maps and a lot of dust.', 'A love letter… from Grandpa to Grandma! 💌', 'Spare socks. Very glamorous.'] },
  crystalball:  { verb: 'Gaze into the crystal ball', say: ['🔮 I see… a great treasure, deep in the mine.', '🔮 Beware the one with the crown…', '🔮 A friend will share their gold with you soon.', '🔮 The stars say: eat more pie.', '🔮 Someone in this family snores. Loudly.'] },
  telescope:    { verb: 'Look through the telescope', say: ['🔭 A shooting star! Make a wish.', '🔭 You can see the Old Mine from up here.', '🔭 A dragon? No… just a very big bird.', '🔭 The moon has a face. It winks at you.'] },
  clock:        { verb: 'Check the clock' },
  teddy:        { verb: 'Hug the teddy', say: ['🧸 A big soft hug. Everything feels better.', '🧸 The teddy hugs you back. Probably.', '🧸 Squeeeeze!'] },
  easel:        { verb: 'Paint a picture', say: ['🎨 You paint a lovely sunset.', '🎨 A portrait of the family pet. It’s… abstract.', '🎨 A dragon! Mostly teeth.', '🎨 A bowl of fruit. Very still life.'] },
  cauldron:     { verb: 'Stir the cauldron', say: ['🧪 It smells of strawberries and socks.', '🧪 Bloop. Bloop. Something winks at you from the bottom.', '🧪 The potion turns purple. Then pink. Then purple again.'] },
  gramophone:   { verb: 'Play a record' },
  cake:         { verb: 'Have a slice of cake', heal: 10 },
  dollhouse:    { verb: 'Peek into the dollhouse', say: ['🏠 Tiny people having a tiny feast.', '🏠 A tiny family, all asleep in tiny beds.', '🏠 Someone tiny has left a tiny window open.'] },
  bathtub:      { verb: ['Fill the bath', 'Empty the bath'], toggle: true },
  fire:         { verb: ['Light the fire', 'Put out the fire'], toggle: true, startOn: true },
  light:        { verb: ['Light it', 'Put it out'], toggle: true, startOn: true },
  fountain:     { verb: ['Turn the fountain on', 'Turn the fountain off'], toggle: true, startOn: true },
  jukebox:      { verb: 'Pick a song', say: ['🎵 A bouncy tune fills the fort!', '🎵 Everybody dance!', '🎵 A slow, dreamy song. Someone yawns.', '🎵 The jukebox picks one by itself. It has good taste.'] },
  carousel:     { verb: ['Start the carousel', 'Stop the carousel'], toggle: true },
  popcorn:      { verb: 'Make some popcorn', heal: 5, say: ['🍿 Pop! Pop! Pop-pop-pop!', '🍿 Warm and buttery.'] },
  icecream:     { verb: 'Get an ice cream', heal: 5, say: ['🍦 Strawberry with sprinkles!', '🍦 Mint choc chip. Brain freeze!', '🍦 Two scoops of vanilla, please.'] },
  arcade:       { verb: 'Play a game', say: ['🕹 NEW HIGH SCORE!', '🕹 Game over… one more go?', '🕹 You beat level 1! (It was quite easy.)', '🕹 The ghosts got you. Again.'] },
  wish:         { verb: 'Make a wish', say: ['🪙 Plink! Your wish is a secret.', '🪙 The water sparkles. Something good is coming.', '🪙 You hear a tiny “thank you” from the bottom of the well.'] },
};

/** The E prompt for a placed piece (`on` = a toggle piece's state). */
export function useVerb(item, on) {
  const u = USES[FURNITURE[item]?.use];
  if (!u) return null;
  return Array.isArray(u.verb) ? u.verb[on ? 1 : 0] : u.verb;
}
