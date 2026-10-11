// home — part of the GameServer (see systems/index.js). Methods run with `this` = the GameServer.
import { INTERACT_RANGE, SPRING_COST, CLASSES, cleanLook } from '../../shared/config.js';
import { ITEMS } from '../../shared/items.js';
import { petMaxHp } from '../../shared/pets.js';
import { dist2 } from '../../shared/physics.js';

/** Props you can use with E (see shared/props.js `interact`). */
export const interactions = {
  sleep(p) {
    p.hp = p.maxHp;
    for (const pet of p.pets) if (!pet.fainted) pet.hp = petMaxHp(pet.species, pet.level); // fainted ones need the Pet Keeper
    this.syncPetEnt(p);
    this.save.day++;
    this.dayClock = 0;
    this.night = false;
    this.nightHomeAt = null;
    this.sendSelf(p);
    this.persist();
    this.broadcastWorld();
    this.broadcast({ t: 'toast', text: `${p.name} slept. Day ${this.save.day} — game saved!` });
  },
  spring(p) {
    if (p.hp >= p.maxHp) return this.toast(p, 'You splash about. You already feel great!');
    if (this.save.gold < SPRING_COST) return this.toast(p, `The spring asks for ${SPRING_COST} gold...`);
    this.save.gold -= SPRING_COST;
    const healed = p.maxHp - p.hp;
    p.hp = p.maxHp;
    const pet = p.pets.find((x) => x.id === p.pet && !x.fainted);
    if (pet) { pet.hp = petMaxHp(pet.species, pet.level); this.syncPetEnt(p); } // a splash for the pet too
    this.sendSelf(p);
    this.broadcastWorld();
    this.sendToLocation(p.loc, { t: 'fx', kind: 'heal', id: p.id, x: p.x, z: p.z, amount: healed });
    this.toast(p, `The spring sparkles... fully healed! (-${SPRING_COST} gold)`);
  },
  wardrobe(p) { this.send(p, { t: 'ui', kind: 'wardrobe' }); },
  mirror(p) { this.send(p, { t: 'ui', kind: 'mirror' }); },
  storage(p) { this.send(p, { t: 'ui', kind: 'chest', storage: this.chestStorage() }); },
};

export const methods = {
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
