// combat — part of the GameServer (see systems/index.js). Methods run with `this` = the GameServer.
import { ATTACK_RANGE, SHOT_SPEED, SHOT_RANGE, ROLL_IFRAMES, ROLL_COOLDOWN, SPELL_COOLDOWN, SPELL_RADIUS, SPELL_DAMAGE, DEATH_GOLD_PENALTY, LUCK_CRIT, LUCK_GOLD, LUCK_GEAR } from '../../shared/config.js';
import { ENEMIES, biomeFor, makeEnemy, oresFor } from '../../shared/dungeons.js';
import { ITEMS, weaponCooldown, weaponImpact, rollGearDrop, rollBlueprint, isGear, PERK_CRIT, PERK_HEAL, PERK_FREEZE, PERK_GIANT, protection } from '../../shared/items.js';
import { XP, attackDamage } from '../../shared/progression.js';
import { dist2 } from '../../shared/physics.js';

const LOOT_SHARE_RANGE = 18; // fighting this close to a kill gets you your own share of its loot

export const methods = {
  /** Dodge roll: a moment of invulnerability. (Movement itself is the client's.) */
  on_roll(p) {
    if (this.time - (p.lastRoll ?? -9) < ROLL_COOLDOWN * 0.85 || p.hp <= 0) return;
    p.lastRoll = this.time;
    p.rollUntil = this.time + ROLL_IFRAMES;
    p.dodgeShown = false;
  },

  on_attack(p, { rot }) {
    // a little slack so network jitter doesn't eat swings the client already showed
    if (this.time - p.lastAttack < weaponCooldown(p.weapon) * 0.85 || p.hp <= 0) return;
    p.lastAttack = this.time;
    p.act++;
    // damage lands on the animation's impact frame, not on the button press
    p.pendingHit = { at: this.time + weaponImpact(p.weapon), rot: Number(rot) || p.rot, loc: p.loc };
  },

  resolveAttack(p, { rot: r, loc: key }) {
    const loc = this.locations.get(p.loc);
    if (!loc || p.loc !== key || p.hp <= 0) return;
    const dmg = attackDamage(p.weapon, p.stats, p.enchants?.[p.weapon]);
    const ranged = ITEMS[p.weapon]?.ranged;
    if (ranged) {
      loc.spawn({
        type: 'shot', kind: ranged, rot: r,
        x: p.x + Math.sin(r) * 0.9, z: p.z + Math.cos(r) * 0.9,
        vx: Math.sin(r) * SHOT_SPEED, vz: Math.cos(r) * SHOT_SPEED,
        _dmg: dmg, _owner: p.id, _life: SHOT_RANGE / SHOT_SPEED,
      });
      return;
    }
    const hx = p.x + Math.sin(r) * 1.2, hz = p.z + Math.cos(r) * 1.2;
    for (const e of [...loc.entities.values()]) {
      const reach = ATTACK_RANGE * 0.6 + e.r;
      if ((e.x - hx) ** 2 + (e.z - hz) ** 2 > reach * reach) continue;
      this.hitEntity(p, loc, e, dmg);
    }
  },

  /** Area spell: a burst that hurts every enemy around you (not your family). Once a minute. */
  on_spell(p) {
    if (this.time - (p.lastSpell ?? -Infinity) < SPELL_COOLDOWN * 0.98 || p.hp <= 0) return;
    const loc = this.locations.get(p.loc);
    if (!loc) return;
    p.lastSpell = this.time;
    const dmg = attackDamage(p.weapon, p.stats, p.enchants?.[p.weapon]) * SPELL_DAMAGE;
    for (const e of [...loc.entities.values()]) {
      if (e.type !== 'slime' || dist2(e, p) > SPELL_RADIUS * SPELL_RADIUS) continue;
      this.hitEntity(p, loc, e, dmg, p);
    }
    this.sendToLocation(loc.key, { t: 'fx', kind: 'nova', x: p.x, z: p.z });
  },

  /** Something got hit by `p` (up close, or by their arrow/bolt coming from `from`). */
  hitEntity(p, loc, e, dmg, from = p) {
    if (e.type === 'rock') this.hitRock(p, loc, e, dmg);
    else if (e.type === 'slime') this.hitSlime(p, loc, e, dmg, from);
    else if (e.type === 'barrel') this.hitBarrel(loc, e, dmg);
    else if (e.type === 'chest') this.openChest(p, loc, e);
    else if (e.type === 'dummy') this.hitDummy(p, loc, e, dmg);
  },

  hitRock(p, loc, e, dmg) {
    e.hp -= dmg;
    e._dirty = true;
    this.sendToLocation(loc.key, { t: 'fx', kind: 'hit', id: e.id, x: e.x, z: e.z });
    if (e.hp > 0) return;
    loc.remove(e.id);
    this.dropItem(loc, e, e.ore, 1);
    this.sendToLocation(loc.key, { t: 'fx', kind: 'break', x: e.x, z: e.z, ore: e.ore });
    this.shareXp(loc, XP.rock);
    this.maybeSpawnLadder(loc, e);
  },

  hitSlime(p, loc, e, dmg, from = p) {
    if (!loc.entities.has(e.id)) return; // (already gone: beaten, or sent away)
    const perk = ITEMS[p?.weapon]?.perk; // forged weapons' perks (shared/items.js PERKS)
    if (perk === 'keen' && Math.random() < PERK_CRIT) {
      dmg *= 2;
      this.sendToLocation(loc.key, { t: 'fx', kind: 'crit', x: e.x, z: e.z });
    }
    if (perk === 'giant' && e.boss) dmg = Math.round(dmg * PERK_GIANT);
    const lucky = p?.luckUntil > this.time; // the healing spring's luck
    if (lucky && perk !== 'keen' && Math.random() < LUCK_CRIT) {
      dmg *= 2;
      this.sendToLocation(loc.key, { t: 'fx', kind: 'crit', x: e.x, z: e.z, lucky: true });
    }
    e.hp -= dmg;
    if (!e.boss) e._stun = perk === 'frost' ? PERK_FREEZE : 0.25;
    else if (perk === 'frost') e._slow = PERK_FREEZE * 2; // bosses don't flinch at every hit (they'd never fight back); frost slows them
    if (perk === 'vampiric' && p.hp > 0 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.round(dmg * PERK_HEAL)));
      this.sendSelf(p);
    }
    const d = Math.sqrt(dist2(e, from)) || 1;
    const push = e.boss ? 4 : 14;
    e._kx = ((e.x - from.x) / d) * push;
    e._kz = ((e.z - from.z) / d) * push;
    this.sendToLocation(loc.key, { t: 'fx', kind: 'dmg', id: e.id, x: e.x, z: e.z, amount: dmg });
    if (e.hp > 0) return;
    loc.remove(e.id);
    if (e.practice) { // the training yard's slime: no loot or XP, it just comes back
      this.sendToLocation(loc.key, { t: 'fx', kind: 'pop', x: e.x, z: e.z, variant: e.variant });
      return this.practiceSlimeBeaten(loc);
    }
    if (e.seasonal) return this.seasonBossDefeated(loc, e, p); // the season's boss in town: its own loot
    if (e._home?.arena) return this.arenaFoeDefeated(loc, e, p); // the Solstice Arena's warriors
    const [lo, hi] = ENEMIES[e.variant].gold;
    // co-op: everyone fighting nearby gets their own loot, rolled for them (only they see and pick it up)
    for (const q of this.lootSharers(loc, e, p)) {
      this._lootFor = q.id;
      const luckyQ = q.luckUntil > this.time;
      this.dropItem(loc, e, 'gold', Math.round((lo + Math.floor(Math.random() * (hi - lo + 1))) * (e.goldMul ?? 1) * (luckyQ ? LUCK_GOLD : 1)));
      if (Math.random() < 0.3) this.dropItem(loc, e, 'slimegoo', 1);
      if (e.boss || Math.random() < 0.035 * (luckyQ ? LUCK_GEAR : 1)) this.dropGear(loc, e, e.boss ? 4 : 0);
      if (e.boss) this.dropBlueprint(loc, e, 4);
      const essence = this.essenceFrom(e, loc.layout.depth ?? 1); // for the Enchanter: rare
      if (essence) this.dropItem(loc, e, 'essence', essence);
    }
    this._lootFor = null;
    this.sendToLocation(loc.key, { t: 'fx', kind: 'pop', x: e.x, z: e.z, variant: e.variant });
    this.shareXp(loc, e.boss ? XP.boss : XP.slime(e.maxHp));
    if (e.boss) this.bossDefeated(loc, e);
    else this.maybeSpawnLadder(loc, e, loc.count('slime') === 0);
  },

  hitBarrel(loc, e, dmg) {
    e.hp -= dmg;
    e._dirty = true;
    this.sendToLocation(loc.key, { t: 'fx', kind: 'hit', id: e.id, x: e.x, z: e.z });
    if (e.hp > 0) return;
    loc.remove(e.id);
    this.sendToLocation(loc.key, { t: 'fx', kind: 'smash', x: e.x, z: e.z });
    this.shareXp(loc, XP.barrel);
    // what's inside? deeper floors hide better things
    const floor = loc.layout.floor ?? 1, depth = loc.layout.depth ?? floor;
    const roll = Math.random();
    if (roll < 0.04) this.dropGear(loc, e);
    else if (roll < 0.45) this.dropItem(loc, e, 'gold', 1 + Math.floor(Math.random() * (3 + depth)));
    else if (roll < 0.62) this.dropItem(loc, e, rollOre(depth), 1 + Math.floor(Math.random() * 2));
    else if (roll < 0.74) this.dropItem(loc, e, 'slimegoo', 1);
    else if (roll < 0.84) this.dropItem(loc, e, 'potion', 1);
    else if (roll < 0.91) { // surprise!
      const kinds = biomeFor(loc.layout.dungeonId, floor).enemies(floor);
      loc.spawn(makeEnemy(kinds[Math.floor(Math.random() * kinds.length)], loc.layout.depth ?? floor, e.x, e.z));
      this.sendToLocation(loc.key, { t: 'toast', text: 'Something was hiding in the barrel!' });
    } // else: empty, just splinters
  },

  openChest(p, loc, e) {
    loc.remove(e.id);
    for (let i = 0; i < 3; i++) this.dropItem(loc, e, 'gold', Math.ceil(e.gold / 3));
    if (Math.random() < 0.5) this.dropItem(loc, e, 'potion', 1);
    if (Math.random() < 0.35) this.dropGear(loc, e);
    if (Math.random() < 0.3) this.dropBlueprint(loc, e);
    if (Math.random() < 0.2) this.dropItem(loc, e, 'essence', 1);
    this.sendToLocation(loc.key, { t: 'fx', kind: 'chest', x: e.x, z: e.z });
  },

  /** A blueprint scroll; which recipe is decided when someone picks it up (so it's new to them). */
  dropBlueprint(loc, at, bonusDepth = 0) {
    const a = Math.random() * Math.PI * 2;
    loc.spawn({ type: 'drop', item: 'blueprint', qty: 1, depth: (loc.layout.depth ?? 1) + bonusDepth, x: at.x + Math.cos(a) * 0.6, z: at.z + Math.sin(a) * 0.6, ...this.lootTag() });
  },

  /** A weapon or shield on the floor; how good depends on how deep we are. */
  dropGear(loc, at, bonusDepth = 0) {
    this.dropItem(loc, at, rollGearDrop((loc.layout.depth ?? 1) + bonusDepth), 1);
  },

  /** Everyone fighting near a kill (alive, here, within LOOT_SHARE_RANGE) — and whoever made it. */
  lootSharers(loc, at, killer) {
    const near = loc.livePlayers().filter((q) => dist2(q, at) < LOOT_SHARE_RANGE * LOOT_SHARE_RANGE);
    if (killer && !near.includes(killer)) near.push(killer);
    return near.length ? near : [null];
  },

  /** A drop on the floor. While `_lootFor` is set (a kill's shared loot) it's that player's alone, for a while. */
  dropItem(loc, at, item, qty) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 0.8;
    loc.spawn({ type: 'drop', item, qty, x: at.x + Math.cos(a) * r, z: at.z + Math.sin(a) * r, ...this.lootTag() });
  },

  lootTag() {
    return this._lootFor ? { owner: this._lootFor, _born: this.time } : {};
  },

  pickup(p, drop) {
    const kind = ITEMS[drop.item]?.kind;
    if (drop.item === 'gold') {
      this.earn(p, drop.qty);
    } else if (isGear(drop.item)) {
      this.gainGear(p, drop.item);
    } else if (kind === 'blueprint') {
      const recipe = rollBlueprint(drop.depth ?? 1, p.blueprints);
      if (recipe) {
        p.blueprints.push(recipe);
        this.toast(p, `Blueprint: ${ITEMS[recipe].name}! Take it to the forge in town.`);
        this.writeRecord(p);
        this.sendSelf(p);
      } else {
        this.earn(p, 25);
        this.toast(p, 'An old blueprint you already know. Sold it for 25 gold.');
      }
    } else {
      p.inventory[drop.item] = (p.inventory[drop.item] ?? 0) + drop.qty;
      this.sendSelf(p);
    }
    this.send(p, { t: 'fx', kind: 'pickup', item: drop.item, qty: drop.qty, x: drop.x, z: drop.z });
  },

  damagePlayer(p, amount) {
    if (p.hp <= 0) return;
    if (this.time < (p.rollUntil ?? 0)) {
      if (!p.dodgeShown) { p.dodgeShown = true; this.send(p, { t: 'fx', kind: 'dodge', id: p.id }); }
      return;
    }
    if (p.shield && Math.random() < ITEMS[p.shield].block) {
      this.sendToLocation(p.loc, { t: 'fx', kind: 'block', id: p.id, x: p.x, z: p.z });
      return;
    }
    amount = Math.max(1, Math.round(amount * (1 - protection(p.armor, p.helmet)))); // armor and helmet soften every hit
    p.hp = Math.max(0, p.hp - amount);
    this.sendSelf(p);
    this.sendToLocation(p.loc, { t: 'fx', kind: 'hurt', id: p.id, x: p.x, z: p.z, amount });
    if (p.hp > 0) return;
    const lost = Math.floor(p.gold * DEATH_GOLD_PENALTY);
    p.gold -= lost;
    this.toast(p, `You fainted! Someone carried you home.${lost ? ` (dropped ${lost} gold)` : ''}`);
    p.hp = p.maxHp;
    this.sendSelf(p);
    this.travel(p, 'house');
  },

  on_use(p, { item }) {
    const def = ITEMS[item];
    if (def?.kind !== 'consumable' || !def.heal || !p.inventory[item]) return;
    if (p.hp >= p.maxHp) return this.toast(p, 'Already at full health!');
    p.inventory[item]--;
    if (!p.inventory[item]) delete p.inventory[item];
    p.hp = Math.min(p.maxHp, p.hp + def.heal);
    this.sendSelf(p);
    this.sendToLocation(p.loc, { t: 'fx', kind: 'heal', id: p.id, x: p.x, z: p.z, amount: def.heal });
  },
};

/** A random ore that can be found this deep (weighted like the rocks). */
function rollOre(depth) {
  const weights = Object.entries(oresFor(depth));
  let roll = Math.random() * weights.reduce((a, [, w]) => a + w, 0);
  for (const [ore, w] of weights) if ((roll -= w) < 0) return ore;
  return 'stone';
}
