// Every network message, in one place. The server checks each client message against its
// schema BEFORE the `on_<name>` handler runs, so handlers can trust field types (they must
// still check game rules: ownership, location, money...). Unknown messages are dropped.
//
// Adding or changing a message:
//   1. add/change it here (field types below), and bump PROTOCOL_VERSION in config.js
//   2. client → server: write `on_<name>(p, msg)` in a server system (src/server/systems/)
//   3. server → client: handle it in GameClient.onMessage
// `bun test` fails if a schema has no handler or a handler has no schema.
//
// Field types: 'num' (finite number), 'int', 'str' (≤ 200 chars), 'bool', 'obj', 'any'.
// A trailing '?' means optional (may be missing or null).

/** Client → server. */
export const CLIENT_MESSAGES = {
  hello:     { protocol: 'int', playerId: 'str', name: 'str', cls: 'str', look: 'obj?', isHost: 'bool?' },
  move:      { epoch: 'int', x: 'num', z: 'num', rot: 'num', anim: 'str' },
  attack:    { rot: 'num' },
  roll:      {},
  spell:     {},
  interact:  { id: 'str' },
  use:       { item: 'str' },
  feedPet:   {},
  buy:       { item: 'str' },
  sell:      { item: 'str', qty: 'int' },
  buyStyle:  { slot: 'str', id: 'str' },
  equip:     { item: 'str?', slot: 'str?' },
  spend:     { stat: 'str' },
  forge:     { recipe: 'str' },
  stash:     { item: 'str', qty: 'int', dir: 'str' },
  buyPet:    { species: 'str', name: 'str?' },
  pickPet:   { id: 'str?' },
  renamePet: { id: 'str', name: 'str' },
  revivePet: { id: 'str' },
  wardrobe:  { cls: 'str', look: 'obj' },
  elevator:  { dungeon: 'str', floor: 'int' },
  chat:      { text: 'str' },
  buyFurniture:    { item: 'str' },
  placeFurniture:  { item: 'str', x: 'num', z: 'num', rot: 'num' },
  pickUpFurniture: { id: 'str' },
  houseStyle:      { kind: 'str', id: 'str' },
};

/**
 * Server → client (documentation only; the client trusts the host).
 *   welcome  { you, isHost }                 you joined; `you` is your player id
 *   kicked   { reason }                      you can't (or can no longer) play here
 *   world    { name, seed, day, flags, dungeons, night, dayLeft, ... }   world-wide state, ~1/s
 *   self     { hp, maxHp, level, xp, gear, inventory, pets, ... }        your own character
 *   enter    { key, seed, epoch, x, z, ents, players }  you arrived somewhere: rebuild the scene
 *   snap     { players, ents, gone }         20×/s: moving things in your location
 *   roster   { players: [{ id, name, cls, level, loc }] }
 *   toast    { text, big? }                  a message on screen
 *   chat     { from, text }
 *   ui       { kind, ... }                   open a window (shop, forge, pets, wardrobe, mirror, chest, elevator)
 *   fx       { kind, x, z, id?, ... }        one-off effects (damage numbers, level ups, debris...)
 *   chestState { storage }                   the family chest changed
 *   night    { day, reason, fainted }        the day ended: show the night screen
 *   house    { owned, styles, wall, floor }  the family's furniture and fort styles changed
 */
export const SERVER_MESSAGES = ['welcome', 'kicked', 'world', 'self', 'enter', 'snap', 'roster', 'toast', 'chat', 'ui', 'fx', 'chestState', 'night', 'house'];

const CHECKS = {
  num: (v) => typeof v === 'number' && Number.isFinite(v),
  int: (v) => Number.isInteger(v),
  str: (v) => typeof v === 'string' && v.length <= 200,
  bool: (v) => typeof v === 'boolean',
  obj: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
  any: () => true,
};

/** Is `msg` a well-formed client message? Returns null if fine, or a reason string. */
export function checkClientMessage(msg) {
  if (typeof msg !== 'object' || msg === null || typeof msg.t !== 'string') return 'not a message';
  const schema = Object.hasOwn(CLIENT_MESSAGES, msg.t) ? CLIENT_MESSAGES[msg.t] : null;
  if (!schema) return `unknown message '${msg.t}'`;
  for (const [field, type] of Object.entries(schema)) {
    const optional = type.endsWith('?');
    const v = msg[field];
    if (v == null) { if (optional) continue; return `${msg.t}.${field} is missing`; }
    if (!CHECKS[optional ? type.slice(0, -1) : type](v)) return `${msg.t}.${field} should be ${type}`;
  }
  return null;
}
