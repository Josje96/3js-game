// pets — part of the GameServer (see systems/index.js). Methods run with `this` = the GameServer.
import { ITEMS, bestHeal } from '../../shared/items.js';
import { PET_SPECIES, PET_MAX_LEVEL, TIER_LOOKS, petStage, petTier, petFormName, petXpToNext, petMaxHp, reviveCost, newPet, cleanPetName } from '../../shared/pets.js';

export const interactions = {
  pets(p) { this.send(p, { t: 'ui', kind: 'pets' }); },
};

export const methods = {
  /** Put the player's active pet into their location (as an entity that follows and fights). */
  spawnPet(p, loc) {
    if (p.petEnt) { this.locations.get(p.loc)?.remove(p.petEnt); p.petEnt = null; }
    const pet = p.pets.find((x) => x.id === p.pet);
    if (!pet || pet.fainted || !loc) return;
    const a = Math.random() * Math.PI * 2;
    const ent = loc.spawn({
      type: 'pet', species: pet.species, name: pet.name, level: pet.level, owner: p.id, act: 0,
      hp: pet.hp, maxHp: petMaxHp(pet.species, pet.level),
      x: p.x + Math.cos(a) * 1.2, z: p.z + Math.sin(a) * 1.2, rot: p.rot, _pet: pet,
    });
    p.petEnt = ent.id;
  },

  petsChanged(p) {
    this.spawnPet(p, this.locations.get(p.loc));
    this.writeRecord(p);
    this.sendSelf(p);
  },

  on_buyPet(p, { species, name }) {
    const def = PET_SPECIES[species];
    if (!def) return;
    if (def.unlock && !this.save.flags[def.unlock]) return this.toast(p, `Beat ${def.unlockBy} first — then a little one will want to come home with you!`);
    if (p.pets.some((x) => x.species === species)) return this.toast(p, `You already have a ${def.name.toLowerCase()}!`);
    if (!this.spend(p, def.price, `a ${def.name.toLowerCase()}`)) return;
    const pet = newPet(species, name);
    p.pets.push(pet);
    p.pet = pet.id;
    this.toast(p, `${pet.name} joined you! Pets fight with you, level up and evolve.`);
    this.petsChanged(p);
  },

  /** Copy the active pet's record (hp...) onto its entity, e.g. after healing. */
  syncPetEnt(p) {
    const ent = p.petEnt && this.locations.get(p.loc)?.entities.get(p.petEnt);
    if (!ent) return;
    ent.hp = ent._pet.hp;
    ent.maxHp = petMaxHp(ent._pet.species, ent._pet.level);
    ent._dirty = true;
  },

  /** Something hit a pet. At 0 health it faints and goes home until revived at the Pet Keeper. */
  damagePet(ent, amount) {
    const pet = ent._pet, owner = this.players.get(ent.owner);
    if (!pet || pet.fainted) return;
    pet.hp = Math.max(0, pet.hp - amount);
    ent.hp = pet.hp;
    ent._dirty = true;
    this.sendToLocation(owner?.loc, { t: 'fx', kind: 'hurt', id: ent.id, x: ent.x, z: ent.z, amount });
    if (pet.hp > 0) { if (owner) this.sendSelf(owner); return; }
    pet.fainted = true;
    const loc = owner && this.locations.get(owner.loc);
    loc?.remove(ent.id);
    if (owner) {
      owner.petEnt = null;
      this.sendToLocation(owner.loc, { t: 'fx', kind: 'faint', x: ent.x, z: ent.z });
      this.toast(owner, `${pet.name} fainted and went home! Revive them at the Pet Keeper in town (${reviveCost(pet.level)} gold).`);
      this.writeRecord(owner);
      this.sendSelf(owner);
    }
  },

  /** Pay the Pet Keeper to wake a fainted pet up (full health). */
  on_revivePet(p, { id }) {
    const pet = p.pets.find((x) => x.id === id);
    if (!pet?.fainted || p.loc !== 'town') return;
    const cost = reviveCost(pet.level);
    if (!this.spend(p, cost, `waking ${pet.name}`)) return;
    pet.fainted = false;
    pet.hp = petMaxHp(pet.species, pet.level);
    this.toast(p, `${pet.name} is wide awake and ready for adventure!`);
    if (p.pet === pet.id) this.spawnPet(p, this.locations.get(p.loc));
    this.writeRecord(p);
    this.sendSelf(p);
  },

  /** Choose which pet follows you (null = everyone naps at home). */
  on_pickPet(p, { id }) {
    if (id !== null && !p.pets.some((x) => x.id === id)) return;
    if (id !== null && p.pets.find((x) => x.id === id).fainted) return this.toast(p, 'That pet fainted. Revive them at the Pet Keeper first!');
    p.pet = id;
    this.petsChanged(p);
  },

  on_renamePet(p, { id, name }) {
    const pet = p.pets.find((x) => x.id === id);
    const clean = cleanPetName(name);
    if (!pet || !clean || PET_SPECIES[pet.species].fixedName) return;
    pet.name = clean;
    this.petsChanged(p);
  },

  /** A pet's own XP: it levels up, and evolves at EVOLVE_AT. */
  petXp(owner, ent, amount) {
    const pet = ent._pet;
    if (!pet || pet.level >= PET_MAX_LEVEL) return;
    pet.xp += amount;
    const stageBefore = petStage(pet.level), tierBefore = petTier(pet.level), hpBefore = petMaxHp(pet.species, pet.level);
    let up = false;
    while (pet.level < PET_MAX_LEVEL && pet.xp >= petXpToNext(pet.level)) {
      pet.xp -= petXpToNext(pet.level);
      pet.level++;
      up = true;
    }
    if (pet.level >= PET_MAX_LEVEL) pet.xp = 0; // all grown up: nothing left to fill
    if (!up) return;
    pet.hp += petMaxHp(pet.species, pet.level) - hpBefore; // growing up adds health
    ent.level = pet.level;
    ent.hp = pet.hp;
    ent.maxHp = petMaxHp(pet.species, pet.level);
    ent._dirty = true;
    if (petStage(pet.level) > stageBefore) {
      this.sendToLocation(owner.loc, { t: 'fx', kind: 'evolve', id: ent.id, x: ent.x, z: ent.z });
      this.broadcast({ t: 'toast', text: `What? ${pet.name} is evolving... into ${petFormName(pet.species, pet.level)}!`, big: true });
    } else if (petTier(pet.level) > tierBefore) {
      this.sendToLocation(owner.loc, { t: 'fx', kind: 'evolve', id: ent.id, x: ent.x, z: ent.z });
      this.toast(owner, `${pet.name} reached level ${pet.level} and got ${TIER_LOOKS[petTier(pet.level)]}!`);
    } else {
      this.sendToLocation(owner.loc, { t: 'fx', kind: 'petlevel', id: ent.id, x: ent.x, z: ent.z, level: pet.level });
    }
    this.sendSelf(owner);
  },

  /** Feed your out-and-about pet a treat (G), right where you are. Uses the treat that fits best. */
  on_feedPet(p) {
    const loc = this.locations.get(p.loc);
    const pet = p.pets.find((x) => x.id === p.pet && !x.fainted);
    const ent = pet && p.petEnt && loc?.entities.get(p.petEnt);
    if (!ent) return this.toast(p, 'Bring a pet along first (P) to feed it.');
    const max = petMaxHp(pet.species, pet.level);
    if (pet.hp >= max) return this.toast(p, `${pet.name} is already full!`);
    const treat = bestHeal(p.inventory, max - pet.hp, 'petHeal');
    if (!treat) return this.toast(p, 'No pet treats. The Pet Keeper in town sells them.');
    p.inventory[treat]--;
    if (!p.inventory[treat]) delete p.inventory[treat];
    const before = pet.hp;
    pet.hp = Math.min(max, pet.hp + ITEMS[treat].petHeal + pet.level);
    this.syncPetEnt(p);
    this.sendSelf(p);
    this.sendToLocation(loc.key, { t: 'fx', kind: 'heal', id: ent.id, x: ent.x, z: ent.z, amount: pet.hp - before });
  },

};
