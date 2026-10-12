// decor — decorating the Family Fort. The Decorator (in the town market, once the King Slime is
// beaten) sells furniture, wall colours and floors. Furniture belongs to the whole family: bought
// pieces wait in save.house.owned until someone places them in the fort (build mode, B).
import { INTERACT_RANGE, CELL } from '../../shared/config.js';
import { FURNITURE, WALL_STYLES, FLOOR_STYLES, DECORATOR_FLAG } from '../../shared/furniture.js';
import { roomIndexAt } from '../../shared/locations.js';
import { blocked, dist2 } from '../../shared/physics.js';
import { HALL } from '../../shared/fort.js';

export const interactions = {
  decorator(p) { this.send(p, { t: 'ui', kind: 'decorator' }); },
  /** A chair, stool, sofa or town bench: sit down on it (walking off gets you up again). */
  sit(p, seat) {
    const def = seat.seat ? seat : FURNITURE[seat.item]; // a map prop (bench) carries its own seat
    if (!def?.seat) return;
    this.send(p, { t: 'fx', kind: 'sit', id: p.id, x: seat.x, z: seat.z, rot: (seat.rot ?? 0) + def.seat.face, r: seat.r });
  },
};

/**
 * The fort was loaded: put the family's furniture back where it was. Pieces are kept relative to
 * their room (or the hall), so they move with it when the fort is redrawn for a bigger family;
 * one that no longer fits goes back into the family's owned furniture.
 */
export function onLocation(loc) {
  if (loc.key !== 'house') return;
  const h = this.save.house;
  const misfits = h.furniture.filter((f) => !this.spawnFurniture(loc, f));
  if (!misfits.length) return;
  for (const f of misfits) h.owned[f.item] = (h.owned[f.item] ?? 0) + 1;
  h.furniture = h.furniture.filter((f) => !misfits.includes(f));
  this.persist();
}

/** Where a piece's room (slot `room`, or -1 = the hall) starts, in world units. */
function areaOrigin(layout, room) {
  const r = room >= 0 ? layout.rooms[room] : HALL;
  return r ? { x: r.x * CELL, z: r.z * CELL } : null;
}

export const methods = {
  /** Put a saved piece in the fort; null if it doesn't fit (its room is gone, or it's in a wall now). */
  spawnFurniture(loc, f) {
    const def = FURNITURE[f.item], L = loc.layout;
    const o = def && areaOrigin(L, f.room ?? -1);
    if (!o) return null;
    const x = o.x + f.dx, z = o.z + f.dz;
    if (roomIndexAt(L, Math.floor(x / CELL), Math.floor(z / CELL)) !== (f.room ?? -1)) return null;
    if (blocked(L, x, z, Math.max(def.radius, 0.4) * 0.9, L.solids)) return null;
    return loc.spawn({ type: 'furniture', item: f.item, fid: f.id, x, z, rot: f.rot ?? 0, r: def.radius, ...(def.seat ? { interact: 'sit', prompt: 'Sit' } : {}) });
  },

  decoratorOpen() {
    return !!this.save.flags[DECORATOR_FLAG];
  },

  on_buyFurniture(p, { item }) {
    const def = FURNITURE[item];
    if (!def || def.notForSale || p.loc !== 'town' || !this.decoratorOpen()) return;
    if (!this.spend(p, def.price, def.name)) return;
    const owned = this.save.house.owned;
    owned[item] = (owned[item] ?? 0) + 1;
    this.toast(p, `Bought ${def.name}! Go home and press B to place it.`);
    this.sendHouse();
  },

  /** The common room's wall colour and floor: buy once, then switch between owned ones for free. Bedrooms keep their own. */
  on_houseStyle(p, { kind, id }) {
    const h = this.save.house;
    if (!this.styleOk(p, kind, id, h)) return;
    h[kind] = id;
    this.toast(p, `The common room now has ${nameFor(kind, id)}!`);
    this.sendHouse();
    this.broadcastWorld();
  },

  /** Dress YOUR room: same styles as the fort's, remembered per room (keyed by bed slot). */
  on_roomStyle(p, { kind, id, slot }) {
    const h = this.save.house;
    if (this.roomSlot(p) !== slot) return this.toast(p, 'That’s not your room — only its owner can style it.');
    if (!this.styleOk(p, kind, id, h)) return;
    (h.roomStyles ??= {})[slot] ??= {};
    h.roomStyles[slot][kind] = id;
    this.toast(p, `Your room now has ${nameFor(kind, id)}!`);
    this.sendHouse();
    this.broadcastWorld();
  },

  /** Shared checks for house/room styles: the table and id exist, and an unowned style is bought in town. */
  styleOk(p, kind, id, h) {
    const table = kind === 'wall' ? WALL_STYLES : kind === 'floor' ? FLOOR_STYLES : null;
    const def = table?.[id];
    if (!def || (p.loc !== 'town' && p.loc !== 'house') || !this.decoratorOpen()) return false;
    h.styles ??= [];
    const key = `${kind}:${id}`;
    if (def.price && !h.styles.includes(key)) {
      if (p.loc !== 'town') {
        this.toast(p, 'Buy that from the Decorator in town first.');
        return false;
      }
      if (!this.spend(p, def.price, def.name)) return false;
      h.styles.push(key);
    }
    return true;
  },

  /** Put a piece of the family's furniture down in the fort. Inside someone else's room: no. */
  on_placeFurniture(p, { item, x, z, rot }) {
    const def = FURNITURE[item], h = this.save.house;
    const loc = this.locations.get(p.loc);
    if (!def || p.loc !== 'house' || !loc || !(h.owned[item] > 0)) return;
    if (dist2(p, { x, z }) > (INTERACT_RANGE + 4) ** 2) return; // close to where you're standing
    const r = Math.max(def.radius, 0.4);
    const L = loc.layout;
    const room = roomIndexAt(L, Math.floor(x / 4), Math.floor(z / 4));
    if (room >= 0) {
      const owner = this.roomOwner(room);
      if (owner && owner.id !== p.id) return this.toast(p, `That’s ${owner.name}’s room — they decorate that one!`);
    }
    const door = Object.values(L.portals)[0]?.arrive;
    const clash = blocked(L, x, z, r, loc.solids())
      || (door && dist2({ x, z }, door) < 3.2 ** 2)
      || (L.spawn && dist2({ x, z }, L.spawn) < 2.2 ** 2)
      || (def.radius > 0 && loc.livePlayersAll().some((q) => dist2(q, { x, z }) < (r + 0.7) ** 2));
    if (clash) return this.toast(p, 'It doesn’t fit there! Try somewhere with more room.');
    const o = areaOrigin(L, room);
    const f = { id: `f${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`, item, room, dx: round(x - o.x), dz: round(z - o.z), rot: round(rot) };
    h.owned[item]--;
    if (!h.owned[item]) delete h.owned[item];
    h.furniture.push(f);
    this.spawnFurniture(loc, f);
    this.sendHouse();
    this.persist();
  },

  /** Pick a placed piece back up (it goes back into the family's owned furniture). */
  on_pickUpFurniture(p, { id }) {
    const loc = this.locations.get(p.loc);
    const e = loc?.entities.get(id);
    if (p.loc !== 'house' || e?.type !== 'furniture' || e.item === 'bed' || !e.fid) return;
    if (dist2(p, e) > (INTERACT_RANGE + e.r + 1) ** 2) return;
    const h = this.save.house;
    h.furniture = h.furniture.filter((f) => f.id !== e.fid);
    h.owned[e.item] = (h.owned[e.item] ?? 0) + 1;
    loc.remove(e.id);
    this.sendHouse();
    this.persist();
  },

  /** Everyone's view of what the family owns (for the Decorator and build mode). */
  sendHouse() {
    const h = this.save.house;
    this.broadcast({ t: 'house', owned: h.owned, styles: h.styles ?? [], wall: h.wall, floor: h.floor, roomStyles: h.roomStyles ?? {}, rooms: this.roomsView() });
  },
};

export function onJoin(p) {
  const h = this.save.house;
  this.send(p, { t: 'house', owned: h.owned, styles: h.styles ?? [], wall: h.wall, floor: h.floor, roomStyles: h.roomStyles ?? {}, rooms: this.roomsView() });
}

const round = (v) => Math.round(Number(v) * 100) / 100;
const nameFor = (kind, id) => {
  const def = (kind === 'wall' ? WALL_STYLES : FLOOR_STYLES)[id];
  return `${def.name.toLowerCase()} ${kind === 'wall' ? 'walls' : 'floors'}`;
};
