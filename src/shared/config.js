// Game-wide tunables. Tweak freely.

export const CELL = 4;               // world units per map grid cell (KayKit dungeon tiles are 4x4)
export const WALL_PAD = 0.5;         // walls stick 0.5 units into neighbouring cells
export const PLAYER_RADIUS = 0.6;
export const PLAYER_SPEED = 7;       // units / second
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
export const INTERACT_RANGE = 2.8;
export const PICKUP_RANGE = 1.4;

export const ELEVATOR_STEP = 5;      // elevator stops at floor 1 and every Nth floor you've reached
export const DEATH_GOLD_PENALTY = 0.1;
export const SPRING_COST = 5;        // gold for a full heal at the healing spring by the fort
export const AUTOSAVE_SECONDS = 30;

export const SAVE_VERSION = 5;
export const PROTOCOL_VERSION = 7;
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
// A look is { hat, cape, back, dye, hair, hairColor, face, skin }. hat/cape: 'own' = the outfit's own piece, 'none', or a key.
// `from` + `parts` borrow meshes from another character model ("<Model>_<part>");
// `build` = a little model made in client/cosmetics.js. Things with a `price` are bought
// in the town shop (from the shared purse) and then live in that player's closet.
export const HATS = {
  helmet:  { name: 'Knight helmet', from: 'Knight', parts: ['Helmet', 'HelmetVisor'] },
  bear:    { name: 'Bear hat', from: 'Barbarian', parts: ['BearHat'] },
  wizard:  { name: 'Wizard hat', from: 'Mage', parts: ['Hat'] },
  mask:    { name: 'Rogue mask', from: 'Rogue_Hooded', parts: ['Mask'] },
  party:   { name: 'Party hat', price: 40, build: 'party' },
  flowers: { name: 'Flower crown', price: 60, build: 'flowers' },
  bunny:   { name: 'Bunny ears', price: 80, build: 'bunny' },
  cat:     { name: 'Cat ears', price: 80, build: 'cat' },
  tophat:  { name: 'Top hat', price: 120, build: 'tophat' },
  viking:  { name: 'Viking helmet', price: 150, build: 'viking' },
  crown:   { name: 'Golden crown', price: 300, build: 'crown' },
};
export const CAPES = {
  knight: { name: 'Knight cape', from: 'Knight' },
  mage:   { name: 'Mage cape', from: 'Mage' },
  ranger: { name: 'Ranger cape', from: 'Ranger' },
  rogue:  { name: 'Rogue cape', from: 'Rogue' },
  hooded: { name: 'Hooded cloak', from: 'Rogue_Hooded' },
};
export const BACKS = {
  quiver:   { name: 'Quiver', price: 30, from: 'Ranger', parts: ['Quiver'] },
  backpack: { name: 'Backpack', price: 60, build: 'backpack' },
  bat:      { name: 'Bat wings', price: 180, build: 'bat' },
  fairy:    { name: 'Fairy wings', price: 220, build: 'fairy' },
};
/** Cape colours (multiplied over the cape's texture). */
export const DYES = {
  ruby:     { name: 'Ruby', price: 25, color: 0xff6b6b },
  sky:      { name: 'Sky', price: 25, color: 0x7fc4ff },
  leaf:     { name: 'Leaf', price: 25, color: 0x8be07a },
  sunny:    { name: 'Sunny', price: 25, color: 0xffe066 },
  bubblegum:{ name: 'Bubblegum', price: 35, color: 0xff9ad5 },
  grape:    { name: 'Grape', price: 35, color: 0xb48cff },
  midnight: { name: 'Midnight', price: 50, color: 0x555577 },
};
// The mirror at home: hair, face and skin. All free. (Built in client/cosmetics.js.)
export const HAIRS = {
  spiky:    { name: 'Spiky' },
  bob:      { name: 'Bob' },
  long:     { name: 'Long' },
  ponytail: { name: 'Ponytail' },
  pigtails: { name: 'Pigtails' },
  curly:    { name: 'Curly' },
  mohawk:   { name: 'Mohawk' },
  bun:      { name: 'Bun' },
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
};
/** Multiplied over the head's texture, so only darker or tinted tones work. */
export const SKINS = {
  tan:   { name: 'Tan', color: 0xe8b48a },
  brown: { name: 'Brown', color: 0xb07a52 },
  deep:  { name: 'Deep brown', color: 0x7a4c30 },
  green: { name: 'Goblin green', color: 0xa8e08a },
  blue:  { name: 'Frosty blue', color: 0xa8c8ff },
};

export const STYLE_SLOTS = { hat: HATS, cape: CAPES, back: BACKS, dye: DYES, hair: HAIRS, hairColor: HAIR_COLORS, face: FACES, skin: SKINS };

/** Is this style free, or already in the closet (a list like ['hat:crown', 'dye:sky'])? */
export function ownsStyle(closet, slot, id) {
  const def = STYLE_SLOTS[slot]?.[id];
  return !!def && (!def.price || (closet ?? []).includes(`${slot}:${id}`));
}

/** Sanitise a look from the network or a profile; with a closet, also drops things not owned. */
export function cleanLook(look, closet = null) {
  const fallback = { hat: 'own', cape: 'own', back: 'none', dye: 'none', hair: 'none', hairColor: 'brown', face: 'none', skin: 'none' };
  const out = {};
  for (const slot of Object.keys(fallback)) {
    const v = look?.[slot];
    const special = v === 'none' || (v === 'own' && fallback[slot] === 'own');
    const known = typeof v === 'string' && Object.hasOwn(STYLE_SLOTS[slot], v);
    out[slot] = special || (known && (!closet || ownsStyle(closet, slot, v))) ? v : fallback[slot];
  }
  return out;
}
