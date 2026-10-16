// Game-wide tunables. Tweak freely.

export const CELL = 4;               // world units per map grid cell (KayKit dungeon tiles are 4x4)
export const WALL_PAD = 0.5;         // walls stick 0.5 units into neighbouring cells
export const PLAYER_RADIUS = 0.6;
export const PLAYER_SPEED = 7;       // units / second
export const FLY_HEIGHT = 2.2;       // a jetpack (V) lifts you this high...
export const FLY_SPEED = 1.6;        // ...and you go this much faster
export const PLAYER_BASE_HP = 20;
export const ROLL_TIME = 0.42;       // dodge roll: how long it lasts (seconds)...
export const ROLL_SPEED = 13;        // ...how fast you go (units / second)...
export const ROLL_IFRAMES = 0.32;    // ...how long hits can't touch you...
export const ROLL_COOLDOWN = 0.85;   // ...and how soon you can roll again (from the start of a roll)

export const TICK_HZ = 20;           // host simulation rate
export const SEND_HZ = 20;           // how often a client sends its own position

export const ATTACK_RANGE = 2.4;
export const SHOT_SPEED = 20;         // arrows and magic bolts, units / second
export const SHOT_RANGE = 13;
export const SPELL_COOLDOWN = 60;      // seconds between area spells (the family's "nova")
export const SPELL_RADIUS = 7.5;       // hits every enemy this close to you...
export const SPELL_DAMAGE = 3;         // ...for this many times your attack damage
export const INTERACT_RANGE = 2.8;
export const PICKUP_RANGE = 1.4;

export const DAY_SECONDS = 600;      // a day lasts ten minutes, then night falls
export const NIGHT_WARNINGS = [60, 30]; // warn everyone this many seconds before nightfall
export const NIGHT_GOLD_PENALTY = 0.5;  // out of the fort at nightfall: faint and drop this share of your gold
export const ELEVATOR_STEP = 5;      // elevator stops at floor 1 and every Nth floor you've reached
export const DEATH_GOLD_PENALTY = 0.5;
export const BANK_OPEN_FEE = 250;        // opening an account at the bank (gold in the bank is never lost)
export const SPRING_COST = 50;       // gold for a full heal (and LUCK) at the healing spring by the fort
export const LUCK_SECONDS = 120;     // the spring's luck: how long it lasts
export const LUCK_GOLD = 1.25, LUCK_CRIT = 0.1, LUCK_GEAR = 2; // while lucky: more gold, a lucky crit now and then, gear drops twice as often
export const FEAST_COST = 10;        // gold for food at the fort's feast table (heals half your health)
export const AUTOSAVE_SECONDS = 30;

export const SAVE_VERSION = 13;
export const PROTOCOL_VERSION = 45;
export const PEER_PREFIX = 'famdungeon-v1-'; // PeerJS ids are global; namespace ours

export const CLASSES = {
  Knight:       { model: 'Knight',       weapon: 'sword' },
  Barbarian:    { model: 'Barbarian',    weapon: 'axe' },
  Mage:         { model: 'Mage',         weapon: 'staff' },
  Ranger:       { model: 'Ranger',       weapon: 'bow' },
  Rogue:        { model: 'Rogue',        weapon: 'dagger' },
  Rogue_Hooded: { model: 'Rogue_Hooded', weapon: 'dagger' },
};

// Wardrobe: every character shares one skeleton, so any outfit can wear any hat or cape.
// A look is { hat, cape, back, dye, clothes, hair, hairColor, face, skin }. hat/cape: 'own' = the outfit's own piece, 'none', or a key.
// `from` + `parts` borrow meshes from another character model ("<Model>_<part>");
// `build` = a little model made in client/cosmetics.js. Things with a `price` are bought
// in the town shop (from the shared purse) and then live in that player's closet.
export const HATS = {
  helmet:  { name: 'Knight helmet', from: 'Knight', parts: ['Helmet', 'HelmetVisor'] },
  bear:    { name: 'Bear hat', from: 'Barbarian', parts: ['BearHat'] },
  wizard:  { name: 'Wizard hat', from: 'Mage', parts: ['Hat'] },
  mask:    { name: 'Rogue mask', from: 'Rogue_Hooded', parts: ['Mask'] },
  party:   { name: 'Party hat', price: 48, build: 'party' },
  flowers: { name: 'Flower crown', price: 72, build: 'flowers' },
  bunny:   { name: 'Bunny ears', price: 96, build: 'bunny' },
  cat:     { name: 'Cat ears', price: 96, build: 'cat' },
  tophat:  { name: 'Top hat', price: 144, build: 'tophat' },
  viking:  { name: 'Viking helmet', price: 180, build: 'viking' },
  crown:   { name: 'Golden crown', price: 360, build: 'crown' },
  beret:   { name: 'Beret', price: 60, build: 'beret' },
  unicorn: { name: 'Unicorn horn', price: 120, build: 'unicorn' },
  cowboy:  { name: 'Cowboy hat', price: 150, build: 'cowboy' },
  pirate:  { name: 'Pirate hat', price: 200, build: 'pirate' },
  halo:    { name: 'Halo', price: 300, build: 'halo' },
  bandana: { name: 'Pirate bandana', price: 80, build: 'bandana' },
  captain: { name: 'Captain’s hat', price: 260, build: 'captain' },
};
export const CAPES = {
  knight: { name: 'Knight cape', from: 'Knight' },
  mage:   { name: 'Mage cape', from: 'Mage' },
  ranger: { name: 'Ranger cape', from: 'Ranger' },
  rogue:  { name: 'Rogue cape', from: 'Rogue' },
  hooded: { name: 'Hooded cloak', from: 'Rogue_Hooded' },
};
export const BACKS = {
  quiver:   { name: 'Quiver', price: 36, from: 'Ranger', parts: ['Quiver'] },
  backpack: { name: 'Backpack', price: 72, build: 'backpack' },
  bat:      { name: 'Bat wings', price: 216, build: 'bat' },
  fairy:    { name: 'Fairy wings', price: 264, build: 'fairy' },
  balloon:  { name: 'Heart balloon', price: 48, build: 'balloon' },
  shell:    { name: 'Turtle shell', price: 120, build: 'shell' },
  butterfly:{ name: 'Butterfly wings', price: 240, build: 'butterfly' },
  angel:    { name: 'Angel wings', price: 300, build: 'angel' },
  jetpack:  { name: 'Jetpack (it flies! V)', price: 50000, build: 'jetpack', flies: true },
  parrot:   { name: 'Pirate parrot', price: 220, build: 'parrot' },
  jollyroger: { name: 'Jolly Roger flag', price: 180, build: 'jollyroger' },
};
/** Cape colours (multiplied over the cape's texture). */
export const DYES = {
  ruby:     { name: 'Ruby', price: 30, color: 0xff6b6b },
  sky:      { name: 'Sky', price: 30, color: 0x7fc4ff },
  leaf:     { name: 'Leaf', price: 30, color: 0x8be07a },
  sunny:    { name: 'Sunny', price: 30, color: 0xffe066 },
  bubblegum:{ name: 'Bubblegum', price: 42, color: 0xff9ad5 },
  grape:    { name: 'Grape', price: 42, color: 0xb48cff },
  midnight: { name: 'Midnight', price: 60, color: 0x555577 },
};
// The mirror at home: hair, face and skin. All free. (Built in client/cosmetics.js.)
export const HAIRS = {
  bald:     { name: 'Bald' },
  suave:    { name: 'Suave' },
  spiky:    { name: 'Spiky' },
  bob:      { name: 'Bob' },
  long:     { name: 'Long' },
  ponytail: { name: 'Ponytail' },
  pigtails: { name: 'Pigtails' },
  curly:    { name: 'Curly' },
  mohawk:   { name: 'Mohawk' },
  bun:      { name: 'Bun' },
  pixie:    { name: 'Pixie' },
  wavy:     { name: 'Long & wavy' },
  braid:    { name: 'Braid' },
  spacebuns:{ name: 'Space buns' },
  afro:     { name: 'Afro' },
};
/** The front of the hair (mirror): how it falls over the forehead. Free. (client/cosmetics.js hairline) */
export const BANGS = {
  straight: { name: 'Straight' },
  side:     { name: 'Side-swept' },
  curtain:  { name: 'Curtain' },
  choppy:   { name: 'Choppy' },
};
export const HAIR_COLORS = {
  brown:  { name: 'Brown', color: 0x6b4423 },
  black:  { name: 'Black', color: 0x262222 },
  blonde: { name: 'Blonde', color: 0xf2cf6b },
  ginger: { name: 'Ginger', color: 0xd9662b },
  white:  { name: 'Snowy', color: 0xf0f0f0 },
  pink:   { name: 'Pink', color: 0xff8ac6 },
  blue:   { name: 'Blue', color: 0x5aa8ff },
  purple: { name: 'Purple', color: 0xa37cff },
  green:  { name: 'Green', color: 0x6fcf55 },
};
export const FACES = {
  glasses:    { name: 'Glasses' },
  sunglasses: { name: 'Sunglasses' },
  stars:      { name: 'Star glasses' },
  monocle:    { name: 'Monocle' },
  eyepatch:   { name: 'Eyepatch' },
  mustache:   { name: 'Mustache' },
  beard:      { name: 'Beard' },
  blush:      { name: 'Rosy cheeks' },
  freckles:   { name: 'Freckles' },
  hearts:     { name: 'Heart glasses' },
  goggles:    { name: 'Goggles' },
  clown:      { name: 'Clown nose' },
  whiskers:   { name: 'Cat whiskers' },
  goatee:     { name: 'Goatee' },
  scar:       { name: 'Pirate scar' },
  piratebeard:{ name: 'Braided pirate beard' },
};
/**
 * Fancy clothes over the outfit (bought in the shop's Fashion tab). `jacket` recolours the body and
 * sleeves (hands keep their skin), `legs` the trousers; `extra` is a little model from client/cosmetics.js.
 */
export const CLOTHES = {
  suit:   { name: 'Suit & tie', price: 240, jacket: 0x2e3440, legs: 0x262a33, extra: 'tie' },
  tux:    { name: 'Tuxedo', price: 360, jacket: 0x16161c, legs: 0x16161c, extra: 'bowtie' },
  gown:   { name: 'Ball gown', price: 360, jacket: 0xd8649f, legs: 0xd8649f, extra: 'gown' },
  royal:  { name: 'Royal robe', price: 600, jacket: 0x6a35b8, legs: 0x3d2470, extra: 'robe' },
  sunday: { name: 'Sunday best', price: 180, jacket: 0x5b86c9, legs: 0xe9e2cf, extra: 'vest' },
  pirate: { name: 'Pirate captain', price: 420, jacket: 0x8a1a1a, legs: 0x2a2a2a, extra: 'sash' },
  princess: { name: 'Princess gown', price: 480, jacket: 0x9fd8ff, legs: 0x9fd8ff, extra: 'gown' },
  wizard: { name: 'Wizard robe', price: 520, jacket: 0x2a2a7a, legs: 0x22225a, extra: 'robe' },
  chef:   { name: 'Chef whites', price: 200, jacket: 0xf4f4f4, legs: 0x3a3a3a, extra: 'apron' },
  overalls: { name: 'Farmer overalls', price: 160, jacket: 0xd8402a, legs: 0x3b5f9a, extra: 'bib' },
  sundress: { name: 'Summer dress', price: 300, jacket: 0xffd23f, legs: 0xffd23f, extra: 'gown' },
  rosegown:     { name: 'Rose princess gown', price: 520, jacket: 0xff7ab8, legs: 0xff7ab8, extra: 'gown' },
  lilacgown:    { name: 'Lilac princess gown', price: 520, jacket: 0xb898ff, legs: 0xb898ff, extra: 'gown' },
  mintgown:     { name: 'Mint princess gown', price: 520, jacket: 0x7fe0b8, legs: 0x7fe0b8, extra: 'gown' },
  goldgown:     { name: 'Golden princess gown', price: 680, jacket: 0xf0c040, legs: 0xf0c040, extra: 'gown' },
  midnightgown: { name: 'Midnight princess gown', price: 680, jacket: 0x34407a, legs: 0x34407a, extra: 'gown' },
  // seasonal outfits: only from the Seasonal Trader, in their season (shared/seasonal.js)
  blossomgown:  { name: 'Blossom gown', price: 1400, jacket: 0xffb3cc, legs: 0xffd6e4, extra: 'gown', seasonal: 'spring' },
  gardener:     { name: 'Gardener’s overalls', price: 1000, jacket: 0xfff6dc, legs: 0x3fa84a, extra: 'bib', seasonal: 'spring' },
  beachdress:   { name: 'Beach dress', price: 1200, jacket: 0x4fd8c0, legs: 0x4fd8c0, extra: 'gown', seasonal: 'summer' },
  safari:       { name: 'Safari explorer', price: 1000, jacket: 0xd8c08a, legs: 0x8a7a5a, extra: 'vest', seasonal: 'summer' },
  harvestcloak: { name: 'Harvest cloak', price: 1400, jacket: 0xd8782a, legs: 0x6b3a1a, extra: 'robe', seasonal: 'autumn' },
  pumpkinsuit:  { name: 'Pumpkin patch suit', price: 1000, jacket: 0xff8a2a, legs: 0x3a5a2a, extra: 'tie', seasonal: 'autumn' },
  snowqueen:    { name: 'Snow queen gown', price: 1600, jacket: 0xdff6ff, legs: 0xbfe0ff, extra: 'gown', seasonal: 'winter' },
  wintercoat:   { name: 'Festive red coat', price: 1200, jacket: 0xd8302a, legs: 0x2a2a2a, extra: 'robe', seasonal: 'winter' },
};
/** Eyebrow shapes (the mirror). All free; they take the hair colour. */
export const BROWS = {
  soft:    { name: 'Soft' },
  thick:   { name: 'Thick' },
  thin:    { name: 'Thin' },
  arched:  { name: 'Arched' },
  angry:   { name: 'Fierce' },
  worried: { name: 'Worried' },
  bushy:   { name: 'Bushy' },
};
/** The colour of the tie (suit) or bow tie (tuxedo). All free: pick one in the wardrobe. */
export const TIE_COLORS = {
  red:    { name: 'Red', color: 0xc0303a },
  navy:   { name: 'Navy', color: 0x24306a },
  green:  { name: 'Green', color: 0x2f8a4a },
  gold:   { name: 'Gold', color: 0xe0b84a },
  purple: { name: 'Purple', color: 0x7a3ab8 },
  pink:   { name: 'Pink', color: 0xff7aa8 },
  sky:    { name: 'Sky blue', color: 0x6ab8ff },
  black:  { name: 'Black', color: 0x16161c },
};
/** Skin tones (the mirror): the colour of all the skin (face, scalp, hands, arms), as named. 'none' = the outfit's own (Pale). */
export const SKINS = {
  tan:    { name: 'Tan', color: 0xd9a271 },
  brown:  { name: 'Brown', color: 0xa86d47 },
  deep:   { name: 'Deep brown', color: 0x6e4429 },
  green:  { name: 'Goblin green', color: 0x8fcf6a },
  blue:   { name: 'Frosty blue', color: 0x9fc4ff },
  golden: { name: 'Golden', color: 0xf0c47e },
  olive:  { name: 'Olive', color: 0xc1a56f },
  ebony:  { name: 'Ebony', color: 0x4a2d1d },
  rosy:   { name: 'Rosy pink', color: 0xffb7bd },
  lilac:  { name: 'Fairy lilac', color: 0xc9aaf2 },
};

export const STYLE_SLOTS = { hat: HATS, cape: CAPES, back: BACKS, dye: DYES, clothes: CLOTHES, hair: HAIRS, bangs: BANGS, hairColor: HAIR_COLORS, face: FACES, skin: SKINS, tie: TIE_COLORS, brows: BROWS };

/** Is this style free, or already in the closet (a list like ['hat:crown', 'dye:sky'])? */
export function ownsStyle(closet, slot, id) {
  const def = STYLE_SLOTS[slot]?.[id];
  return !!def && (!def.price || (closet ?? []).includes(`${slot}:${id}`));
}

/** Sanitise a look from the network or a profile; with a closet, also drops things not owned. */
export function cleanLook(look, closet = null) {
  const fallback = { hat: 'own', cape: 'own', back: 'none', dye: 'none', clothes: 'none', hair: 'none', bangs: 'none', hairColor: 'brown', face: 'none', skin: 'none', tie: 'red', brows: 'soft' };
  const out = {};
  for (const slot of Object.keys(fallback)) {
    const v = look?.[slot];
    const special = v === 'none' || (v === 'own' && fallback[slot] === 'own');
    const known = typeof v === 'string' && Object.hasOwn(STYLE_SLOTS[slot], v);
    out[slot] = special || (known && (!closet || ownsStyle(closet, slot, v))) ? v : fallback[slot];
  }
  return out;
}
