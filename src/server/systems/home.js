// home — the Family Fort: a bed for every family member (the day ends when everyone online is in
// bed), the wardrobe, mirror and family chest, and the healing spring in town.
import { INTERACT_RANGE, SPRING_COST, LUCK_SECONDS, FEAST_COST, CLASSES, CELL, cleanLook } from '../../shared/config.js';
import { useDistance } from '../../shared/props.js';
import { FURNITURE, blanketFor } from '../../shared/furniture.js';
import { ITEMS } from '../../shared/items.js';
import { petMaxHp } from '../../shared/pets.js';
import { dist2 } from '../../shared/physics.js';
import { MAX_ROOMS } from '../../shared/fort.js';

/** Props you can use with E (see shared/props.js `interact`). */
export const interactions = {
  /** The feast table: asks whether you'd like to buy food (see on_eatFeast). */
  feast(p, table) {
    this.send(p, { t: 'ui', kind: 'feast', table: table.id, price: FEAST_COST, heal: Math.ceil(p.maxHp * FEAST_HEAL) });
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
  /** The healing spring: a full heal and two minutes of luck (more gold, lucky hits, better drops). */
  spring(p) {
    if (!this.spend(p, SPRING_COST, 'the healing spring')) return;
    p.luckUntil = this.time + LUCK_SECONDS;
    const healed = p.maxHp - p.hp;
    p.hp = p.maxHp;
    const pet = p.pets.find((x) => x.id === p.pet && !x.fainted);
    if (pet) { pet.hp = petMaxHp(pet.species, pet.level); this.syncPetEnt(p); } // a splash for the pet too
    this.sendSelf(p);
    this.sendToLocation(p.loc, { t: 'fx', kind: 'heal', id: p.id, x: p.x, z: p.z, amount: healed });
    this.toast(p, `The spring sparkles… fully healed, and 🍀 lucky for ${LUCK_SECONDS / 60} minutes! (-${SPRING_COST} gold)`);
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

/** A plate at the feast heals this much of your health bar. */
const FEAST_HEAL = 0.5;

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
    if (existing) { Object.assign(existing, { ownerName: name, x: at.x, z: at.z, rot: at.rot ?? 0 }); existing._dirty = true; return; }
    loc.spawn({
      type: 'furniture', item: 'bed', owner: playerId, ownerName: name, blanket: blanketFor(playerId),
      x: at.x, z: at.z, rot: at.rot ?? 0, r: FURNITURE.bed.radius, interact: 'sleep',
    });
  },

  /** Where a player wakes up: at the foot of their own bed, on the open side (never in the wall behind the pillow). */
  bedSpot(p) {
    const slot = this.save.house.beds?.[p.id];
    const at = this.getLocation('house').layout.bedSlots?.[slot];
    return at ? { x: at.x, z: at.z + (at.rot ? -2.6 : 2.6) } : null;
  },

  wakeUp(p) {
    if (!p.sleeping) return;
    p.sleeping = false;
    this.send(p, { t: 'fx', kind: 'wake', id: p.id, up: this.bedSpot(p) });
  },

  /** Yes to food at the feast table: pay, sit down at the nearest seat and eat — half your health back. */
  on_eatFeast(p, { table: id }) {
    const loc = this.locations.get(p.loc);
    const table = loc?.layout.props.find((q) => q.id === id && q.interact === 'feast');
    if (!table || useDistance(table, p) > INTERACT_RANGE) return;
    const seats = (table.seats ?? []).map(([dx, dz, face]) => ({ x: table.x + dx, z: table.z + dz, rot: face, side: Math.sign(dz) }));
    if (!seats.length || !this.spend(p, FEAST_COST, 'food at the feast')) return;
    const seat = seats.reduce((a, b) => ((a.x - p.x) ** 2 + (a.z - p.z) ** 2 <= (b.x - p.x) ** 2 + (b.z - p.z) ** 2 ? a : b));
    // getting up: step back off the bench, away from the table (forwards would be into it)
    const up = { x: seat.x, z: table.z + seat.side * 3.0 };
    this.send(p, { t: 'fx', kind: 'sit', id: p.id, x: seat.x, z: seat.z, rot: seat.rot, r: 0.6, up });
    Object.assign(p, { x: seat.x, z: seat.z });
    const healed = Math.min(p.maxHp - p.hp, Math.ceil(p.maxHp * FEAST_HEAL));
    p.hp += healed;
    this.sendToLocation(p.loc, { t: 'fx', kind: 'feast', x: p.x, z: p.z });
    this.sendSelf(p);
    this.toast(p, `🍗 Yum! +${healed} health. (-${FEAST_COST} gold)`);
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
