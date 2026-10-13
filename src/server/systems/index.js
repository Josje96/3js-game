// The GameServer is split into "systems": one file per feature area. Each file exports
//
//   export const methods = { on_buy(p, msg) {...}, helper() {...} }   // become GameServer methods
//   export const interactions = { shop(p, prop) {...} }               // optional: props with `interact: 'shop'`
//   export function tick(dt) {...}                                     // optional: runs every server step
//   export function onJoin(p) {...}                                    // optional: a player joined (before they arrive anywhere)
//   export function onLeave(p) {...}                                   // optional: a player left
//   export function onLocation(loc) {...}                              // optional: a location was just created
//
// Every function runs with `this` = the GameServer, so systems can call each other's methods
// (this.gainGear, this.toast...). Two systems defining the same name is an error at startup,
// so one feature can never silently replace another's code.
//
// Adding a system: create the file, add it to SYSTEMS below. Adding a message: add an `on_<name>`
// method AND its schema in shared/protocol.js (a test checks they match).

import * as bank from './bank.js';
import * as combat from './combat.js';
import * as day from './day.js';
import * as decor from './decor.js';
import * as dungeons from './dungeons.js';
import * as enchant from './enchant.js';
import * as holidays from './holidays.js';
import * as home from './home.js';
import * as pets from './pets.js';
import * as progression from './progression.js';
import * as seasons from './seasons.js';
import * as seasonaltrader from './seasonaltrader.js';
import * as shop from './shop.js';
import * as town from './town.js';
import * as wallet from './wallet.js';

export const SYSTEMS = { bank, combat, day, decor, dungeons, enchant, holidays, home, pets, progression, seasons, seasonaltrader, shop, town, wallet };

/** Copy every system's methods onto the class; collect interactions and hooks. */
export function installSystems(cls) {
  const owner = {};
  const interactions = {};
  const hooks = { tick: [], onJoin: [], onLeave: [], onLocation: [] };
  for (const [name, sys] of Object.entries(SYSTEMS)) {
    for (const [method, fn] of Object.entries(sys.methods ?? {})) {
      if (Object.hasOwn(cls.prototype, method) || owner[method]) {
        throw new Error(`GameServer.${method} is defined twice (${owner[method] ?? 'GameServer.js'} and systems/${name}.js)`);
      }
      owner[method] = `systems/${name}.js`;
      cls.prototype[method] = fn;
    }
    for (const [kind, fn] of Object.entries(sys.interactions ?? {})) {
      if (interactions[kind]) throw new Error(`interaction '${kind}' is handled twice`);
      interactions[kind] = fn;
    }
    for (const name of Object.keys(hooks)) if (sys[name]) hooks[name].push(sys[name]);
  }
  return { interactions, hooks };
}
