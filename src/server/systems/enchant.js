// enchant — the Enchanter, a shady figure in the far corner of Pebble Town. Bring gold, ore and
// Arcane Essence (bosses drop it; a few chests and deep monsters too) and he makes a weapon
// stronger and fancier, up to +5 (shared/enchant.js). Levels are per player and per weapon.
import { ITEMS } from '../../shared/items.js';
import { INTERACT_RANGE } from '../../shared/config.js';
import { ENCHANT_MAX, enchantCost, enchantedName } from '../../shared/enchant.js';
import { dist2 } from '../../shared/physics.js';

export const interactions = {
  enchant(p) { this.send(p, { t: 'ui', kind: 'enchanter' }); },
};

export const methods = {
  /** Enchant one of your weapons one level up, if you can pay for it. Must be standing at his tent. */
  on_enchant(p, { item }) {
    if (p.loc !== 'town' || ITEMS[item]?.kind !== 'weapon' || !p.gear.includes(item)) return;
    const tent = this.getLocation('town').layout.props.find((q) => q.interact === 'enchant');
    if (!tent || dist2(p, tent) > (INTERACT_RANGE + tent.radius + 2) ** 2) return;
    p.enchants ??= {};
    const level = p.enchants[item] ?? 0;
    const cost = enchantCost(item, level);
    if (!cost) return this.toast(p, `Your ${ITEMS[item].name} can’t hold any more magic.`);
    const [ore, oreN] = cost.ore;
    const have = (id) => p.inventory[id] ?? 0;
    if (have('essence') < cost.essence || have(ore) < oreN) return this.toast(p, '“Not enough, friend. Come back with the goods.”');
    if (!this.spend(p, cost.gold, `enchanting ${ITEMS[item].name}`)) return;
    for (const [id, n] of [['essence', cost.essence], [ore, oreN]]) {
      p.inventory[id] -= n;
      if (!p.inventory[id]) delete p.inventory[id];
    }
    p.enchants[item] = level + 1;
    this.sendToLocation('town', { t: 'fx', kind: 'enchant', id: p.id, x: p.x, z: p.z, level: level + 1 });
    this.toast(p, `✨ ${enchantedName(item, level + 1)}!${level + 1 >= ENCHANT_MAX ? ' It can’t get any stronger.' : ''}`);
    this.writeRecord(p);
    this.sendSelf(p);
  },

  /** A rare drop for enchanting: how much Arcane Essence a beaten enemy leaves (usually none). */
  essenceFrom(e, depth) {
    if (e.seasonal) return 6;
    if (e.boss) return 2 + Math.floor(depth / 50);
    return depth >= 5 && Math.random() < 0.012 + Math.min(0.02, depth * 0.0001) ? 1 : 0;
  },
};
