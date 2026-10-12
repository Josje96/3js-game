// progression — part of the GameServer (see systems/index.js). Methods run with `this` = the GameServer.
import { ITEMS, duplicateValue, isGear } from '../../shared/items.js';
import { STATS, POINTS_PER_LEVEL, MAX_LEVEL, xpToNext, maxHpFor, attackDamage } from '../../shared/progression.js';

export const methods = {
  /** Co-op: everyone standing in the location shares the XP. */
  shareXp(loc, amount) {
    for (const p of loc.livePlayers()) this.addXp(p, amount);
  },

  addXp(p, amount) {
    if (p.level >= MAX_LEVEL) return;
    p.xp += amount;
    let gained = 0;
    while (p.level < MAX_LEVEL && p.xp >= xpToNext(p.level)) {
      p.xp -= xpToNext(p.level);
      p.level++;
      p.points += POINTS_PER_LEVEL;
      gained++;
    }
    if (gained) {
      p.maxHp = maxHpFor(p.level, p.stats);
      p.hp = p.maxHp; // levelling up heals you
      this.sendToLocation(p.loc, { t: 'fx', kind: 'levelup', id: p.id, x: p.x, z: p.z, level: p.level });
      this.toast(p, `Level up! You are level ${p.level}. Press C to spend your skill points.`);
      this.broadcastRoster();
    }
    this.sendSelf(p);
  },

  on_spend(p, { stat }) {
    if (!STATS[stat] || p.points <= 0) return;
    p.points--;
    p.stats[stat]++;
    const before = p.maxHp;
    p.maxHp = maxHpFor(p.level, p.stats);
    p.hp += p.maxHp - before;
    this.writeRecord(p);
    this.sendSelf(p);
  },

  /** Equip something from your gear bag (or take your shield off with item: null, slot: 'shield'). */
  on_equip(p, { item, slot }) {
    if (item == null && (slot === 'shield' || slot === 'armor')) p[slot] = null; // take it off
    else {
      const def = ITEMS[item];
      if (!def || !p.gear.includes(item) || !isGear(item)) return;
      p[def.kind] = item; // weapon / shield / armor
    }
    this.writeRecord(p);
    this.sendSelf(p);
    this.broadcastRoster();
  },

  /** Found or bought a weapon/shield: into the bag, and on if it's better than what you hold. */
  gainGear(p, item) {
    const def = ITEMS[item];
    if (p.gear.includes(item)) {
      const gold = duplicateValue(item);
      this.earn(p, gold);
      this.toast(p, `Another ${def.name}! You already have one, so it's worth ${gold} gold.`);
      return;
    }
    p.gear.push(item);
    const score = (id) => (def.kind === 'weapon' ? attackDamage(id, p.stats, p.enchants?.[id]) : def.kind === 'shield' ? ITEMS[id]?.block ?? 0 : ITEMS[id]?.armor ?? 0);
    const better = score(item) > score(p[def.kind]);
    if (better) p[def.kind] = item;
    this.toast(p, `New ${def.kind}: ${def.name}!${better ? ' Equipped.' : ' Press C to equip it.'}`);
    this.writeRecord(p);
    this.sendSelf(p);
  },
};
