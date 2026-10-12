// home — the Family Fort: a bed for every family member (the day ends when everyone online is in
// bed), the wardrobe, mirror and family chest, and the healing spring in town.
import { INTERACT_RANGE, SPRING_COST, CLASSES, cleanLook } from '../../shared/config.js';
import { FURNITURE, blanketFor } from '../../shared/furniture.js';
import { ITEMS } from '../../shared/items.js';
import { petMaxHp } from '../../shared/pets.js';
import { dist2 } from '../../shared/physics.js';

/** Props you can use with E (see shared/props.js `interact`). */
export const interactions = {
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

/** A new family member gets a bed slot (kept in the save) the first time they join. */
export function onJoin(p) {
  const beds = (this.save.house.beds ??= {});
  if (beds[p.id] == null) {
    const used = new Set(Object.values(beds));
    const slots = this.getLocation('house').layout.bedSlots ?? [];
    let slot = slots.findIndex((_, i) => !used.has(i));
    if (slot < 0) slot = Object.keys(beds).length % Math.max(1, slots.length); // a crowded fort: share
    beds[p.id] = slot;
  }
  const house = this.locations.get('house');
  if (house) this.placeBed(house, p.id);
}

export function onLeave() {
  this.checkAllAsleep();
}

export const methods = {
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
};
