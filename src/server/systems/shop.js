// shop — part of the GameServer (see systems/index.js). Methods run with `this` = the GameServer.
import { STYLE_SLOTS, ownsStyle } from '../../shared/config.js';
import { ITEMS, SHOP_STOCK, FORGE_RECIPES } from '../../shared/items.js';

export const interactions = {
  shop(p) { this.send(p, { t: 'ui', kind: 'shop', stock: SHOP_STOCK }); },
  forge(p) { this.send(p, { t: 'ui', kind: 'forge' }); },
};

export const methods = {
  on_buy(p, { item }) {
    const def = ITEMS[item];
    if (!def || !SHOP_STOCK.includes(item)) return;
    if (this.save.gold < def.price) return this.toast(p, 'Not enough gold!');
    const gear = def.kind === 'weapon' || def.kind === 'shield';
    if (gear && p.gear.includes(item)) return this.toast(p, 'You already have that one. Press C to equip it.');
    this.save.gold -= def.price;
    if (gear) {
      p.gear.push(item);
      if (def.kind === 'weapon') p.weapon = item; else p.shield = item; // just bought it: put it on
      this.writeRecord(p);
    } else p.inventory[item] = (p.inventory[item] ?? 0) + 1;
    this.toast(p, `Bought ${def.name}!`);
    this.sendSelf(p);
    this.broadcastWorld();
  },

  /** Buy a hat / back item / dye for this player's closet (paid from the family purse). */
  on_buyStyle(p, { slot, id }) {
    const def = STYLE_SLOTS[slot]?.[id];
    if (!def?.price || ownsStyle(p.closet, slot, id)) return;
    if (this.save.gold < def.price) return this.toast(p, 'Not enough gold!');
    this.save.gold -= def.price;
    p.closet.push(`${slot}:${id}`);
    this.toast(p, `Bought ${def.name}! Try it on at the wardrobe at home.`);
    this.writeRecord(p);
    this.sendSelf(p);
    this.broadcastWorld();
  },

  /** Make a forged weapon: needs its blueprint, the materials and gold. Only at the forge. */
  on_forge(p, { recipe }) {
    const r = FORGE_RECIPES[recipe];
    if (!r || !p.blueprints.includes(recipe) || p.loc !== 'town') return;
    if (p.gear.includes(recipe)) return this.toast(p, 'You already have one of those!');
    for (const [item, n] of Object.entries(r.needs)) {
      if ((p.inventory[item] ?? 0) < n) return this.toast(p, `You need ${n} ${ITEMS[item].name}.`);
    }
    if (this.save.gold < r.gold) return this.toast(p, 'Not enough gold!');
    for (const [item, n] of Object.entries(r.needs)) {
      p.inventory[item] -= n;
      if (!p.inventory[item]) delete p.inventory[item];
    }
    this.save.gold -= r.gold;
    this.sendToLocation(p.loc, { t: 'fx', kind: 'forge', id: p.id, x: p.x, z: p.z });
    this.gainGear(p, recipe);
    this.broadcastWorld();
  },

  on_sell(p, { item, qty }) {
    const def = ITEMS[item];
    const have = p.inventory[item] ?? 0;
    const n = Math.min(have, Math.max(1, Math.floor(qty) || 1));
    if (!def?.sell || n <= 0) return;
    p.inventory[item] = have - n;
    if (!p.inventory[item]) delete p.inventory[item];
    this.save.gold += def.sell * n;
    this.toast(p, `Sold ${n} ${def.name} for ${def.sell * n} gold`);
    this.sendSelf(p);
    this.broadcastWorld();
  },
};
