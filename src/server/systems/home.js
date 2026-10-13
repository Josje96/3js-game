// home — the Family Fort: a bed for every family member (the day ends when everyone online is in
// bed), the wardrobe, mirror and family chest, and the healing spring in town.
import { INTERACT_RANGE, SPRING_COST, CLASSES, CELL, cleanLook } from '../../shared/config.js';
import { FURNITURE, blanketFor } from '../../shared/furniture.js';
import { ITEMS } from '../../shared/items.js';
import { petMaxHp } from '../../shared/pets.js';
import { dist2 } from '../../shared/physics.js';
import { MAX_ROOMS } from '../../shared/fort.js';

/** Props you can use with E (see shared/props.js `interact`). */
export const interactions = {
  /** The feast table: sit down at the nearest seat. You eat while you stay sitting (see tick). */
  feast(p, table) {
    const seats = (table.seats ?? []).map(([dx, dz, face]) => ({ x: table.x + dx, z: table.z + dz, rot: face }));
    if (!seats.length) return;
    const seat = seats.reduce((a, b) => ((a.x - p.x) ** 2 + (a.z - p.z) ** 2 <= (b.x - p.x) ** 2 + (b.z - p.z) ** 2 ? a : b));
    this.send(p, { t: 'fx', kind: 'sit', id: p.id, x: seat.x, z: seat.z, rot: seat.rot, r: 0.6 });
    Object.assign(p, { x: seat.x, z: seat.z });
    p.feasting = { since: this.time, next: this.time + FEAST_EVERY };
    this.toast(p, p.hp < p.maxHp ? '🍗 Tuck in! Stay sitting to eat — every bite heals.' : '🍗 You sit down to the feast. (You’re already full of beans.)');
  },

  /** Your own bed: lie down (or get up again). Someone else's: it's theirs. */
  sleep(p, bed) {
    if (bed.owner !== p.id) return this.toast(p, `That’s ${bed.ownerName}’s bed! Yours has your name on it.`);
    if (p.sleeping) return this.wakeUp(p);
    p.sleeping = true;
    this.send(p, { t: 'fx', kind: 'sleep', id: p.id, x: bed.x, z: bed.z, rot: bed.rot });
    const asleep = [...this.players.values()].filter((x) => x.sleeping).length;
    if (asleep < this.players.size) {
      this.broadcast({ t: 'toast', text: `${p.name} is in bed (${asleep} of ${this.players.size} asleep). The day ends when everyone is in bed.` });
    }
    this.checkAllAsleep();
  },
  spring(p) {
    if (p.hp >= p.maxHp) return this.toast(p, 'You splash about. You already feel great!');
    if (!this.spend(p, SPRING_COST, 'the healing spring')) return;
    const healed = p.maxHp - p.hp;
    p.hp = p.maxHp;
    const pet = p.pets.find((x) => x.id === p.pet && !x.fainted);
    if (pet) { pet.hp = petMaxHp(pet.species, pet.level); this.syncPetEnt(p); } // a splash for the pet too
    this.sendSelf(p);
    this.sendToLocation(p.loc, { t: 'fx', kind: 'heal', id: p.id, x: p.x, z: p.z, amount: healed });
    this.toast(p, `The spring sparkles... fully healed! (-${SPRING_COST} gold)`);
  },
  wardrobe(p) { this.send(p, { t: 'ui', kind: 'wardrobe' }); },
  mirror(p) { this.send(p, { t: 'ui', kind: 'mirror' }); },
  storage(p) { this.send(p, { t: 'ui', kind: 'chest', storage: this.chestStorage() }); },
};

/** The fort was just loaded: put everyone's bed in it (plus any furniture, see decor.js). */
export function onLocation(loc) {
  if (loc.key !== 'house') return;
  for (const id of Object.keys(this.save.players)) this.placeBed(loc, id);
}

/** A new family member gets a bed slot (kept in the save) the first time they join, and with it a room. */
export function onJoin(p) {
  const beds = (this.save.house.beds ??= {});
  if (beds[p.id] == null) {
    const used = new Set(Object.values(beds));
    let slot = 0;
    while (slot < MAX_ROOMS && used.has(slot)) slot++;
    if (slot >= MAX_ROOMS) slot = Object.keys(beds).length % MAX_ROOMS; // a crowded fort: share
    beds[p.id] = slot;
  }
  const house = this.locations.get('house');
  if (house && house.layout.opts.rooms !== this.fortRooms()) this.rebuildFort();
  else if (house) this.placeBed(house, p.id);
}

/** Feasting: while you stay sitting at the feast table, every FEAST_EVERY seconds you eat and heal. */
const FEAST_EVERY = 1, FEAST_HEAL = 0.15;
export function tick() {
  for (const p of this.players.values()) {
    const f = p.feasting;
    if (!f) continue;
    // you get up by walking off (the client then stops sending 'sit'); give it a moment to sit down first
    if (p.loc !== 'house' || (this.time - f.since > 0.6 && p.anim !== 'sit')) { p.feasting = null; continue; }
    if (this.time < f.next || p.hp >= p.maxHp) continue;
    f.next = this.time + FEAST_EVERY;
    p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.ceil(p.maxHp * FEAST_HEAL)));
    this.sendToLocation(p.loc, { t: 'fx', kind: 'feast', x: p.x, z: p.z });
    if (p.hp >= p.maxHp) this.toast(p, '🍗 You’re stuffed! Full of beans again.');
    this.sendSelf(p);
  }
}

export function onLeave() {
  this.checkAllAsleep();
}

export const methods = {
  /** How many rooms the fort has: one per bed slot in use. */
  fortRooms() {
    const slots = Object.values(this.save.house.beds ?? {});
    return Math.min(MAX_ROOMS, Math.max(1, ...slots.map((s) => s + 1)));
  },

  /** Someone new moved in: draw the fort again with a room for them. Whoever's inside stays put if they can. */
  rebuildFort() {
    const old = this.locations.get('house');
    if (!old) return;
    const inside = [...old.players].map((id) => this.players.get(id)).filter(Boolean);
    for (const p of inside) { this.wakeUp(p); this.leaveLocation(p); }
    this.locations.delete('house');
    const layout = this.getLocation('house').layout;
    for (const p of inside) {
      const free = !layout.isSolidCell(Math.floor(p.x / CELL), Math.floor(p.z / CELL));
      this.travel(p, 'house', null, free ? { x: p.x, z: p.z } : null);
    }
    this.sendHouse(); // everyone needs the new list of rooms (who decorates which)
  },

  /** Spawn (or rename) a family member's bed entity in the fort. */
  placeBed(loc, playerId) {
    const slot = this.save.house.beds?.[playerId];
    const at = loc.layout.bedSlots?.[slot];
    if (!at) return;
    const name = this.save.players[playerId]?.name ?? 'Someone';
    const existing = [...loc.entities.values()].find((e) => e.type === 'furniture' && e.item === 'bed' && e.owner === playerId);
    if (existing) { existing.ownerName = name; existing._dirty = true; return; }
    loc.spawn({
      type: 'furniture', item: 'bed', owner: playerId, ownerName: name, blanket: blanketFor(playerId),
      x: at.x, z: at.z, rot: 0, r: FURNITURE.bed.radius, interact: 'sleep',
    });
  },

  /** Where a player wakes up: just in front of their own bed. */
  bedSpot(p) {
    const slot = this.save.house.beds?.[p.id];
    const at = this.getLocation('house').layout.bedSlots?.[slot];
    return at ? { x: at.x, z: at.z + 2.6 } : null;
  },

  wakeUp(p) {
    if (!p.sleeping) return;
    p.sleeping = false;
    this.send(p, { t: 'fx', kind: 'wake', id: p.id });
  },

  /** Stardew-style: once everyone online is asleep, the night passes. */
  checkAllAsleep() {
    if (this.players.size && [...this.players.values()].every((x) => x.sleeping)) this.endDay('sleep');
  },

  /** The family chest's contents: shared by everyone, kept in the save. */
  chestStorage() {
    return (this.save.house.storage ??= {});
  },

  /** Move items between your bag and the family chest (`dir` = 'in' or 'out'). Only at the chest. */
  on_stash(p, { item, qty, dir }) {
    const loc = this.locations.get(p.loc);
    const chest = loc?.layout.props.find((q) => q.interact === 'storage');
    if (!chest || dist2(p, chest) > (INTERACT_RANGE + chest.radius) ** 2) return;
    if (dir !== 'in' && dir !== 'out') return;
    const def = ITEMS[item], n = Math.floor(Number(qty));
    if (!def || def.kind === 'currency' || !(n > 0)) return;
    const store = this.chestStorage();
    const from = dir === 'in' ? p.inventory : store;
    const to = dir === 'in' ? store : p.inventory;
    const count = Math.min(n, from[item] ?? 0);
    if (count <= 0) return;
    from[item] -= count;
    if (!from[item]) delete from[item];
    to[item] = (to[item] ?? 0) + count;
    this.sendSelf(p);
    this.sendToLocation(loc.key, { t: 'chestState', storage: store });
    this.persist();
  },

  /** Change outfit / hat / cape. Only at home, where the wardrobe is. */
  on_wardrobe(p, { cls, look }) {
    if (p.loc !== 'house' || !CLASSES[cls]) return;
    p.cls = cls;
    p.look = cleanLook(look, p.closet);
    this.writeRecord(p);
    this.broadcastRoster();
  },

  /** Which room does this player own (their bed's room), or -1 for none? */
  roomSlot(p) {
    const slot = this.save.house.beds?.[p.id];
    const rooms = this.getLocation('house')?.layout.rooms ?? [];
    return slot != null && slot < rooms.length ? slot : -1;
  },

  /** The room's owner: { id, name } for the player whose bed is in bed slot `slot`, or null. */
  roomOwner(slot) {
    const beds = this.save.house.beds ?? {};
    for (const [id, s] of Object.entries(beds)) {
      if (s === slot) return { id, name: this.save.players[id]?.name ?? 'Someone' };
    }
    return null;
  },

  /** Each room as { slot, owner, ownerName }, for the client's rooms UI. */
  roomsView() {
    const rooms = this.getLocation('house')?.layout.rooms ?? [];
    return rooms.map((_, slot) => {
      const o = this.roomOwner(slot);
      return { slot, owner: o?.id ?? null, ownerName: o?.name ?? null };
    });
  },
};
