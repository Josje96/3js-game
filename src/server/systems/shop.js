// shop — the Shopkeeper (food, potions, fashion, buying your loot and spare gear), the Blacksmith
// (weapons, shields and armor — a new tier every 20 levels — and forging, see FORGE_RECIPES)
// and the Pet Keeper's treats. Gold is each player's own (see wallet.js).
import { STYLE_SLOTS, ownsStyle, INTERACT_RANGE } from '../../shared/config.js';
import { dist2 } from '../../shared/physics.js';
import { ITEMS, SHOP_STOCK, PET_SHOP_STOCK, FORGE_RECIPES, inShopFor, shopTier, sellValue, isGear, SMELT, SMELT_ORE } from '../../shared/items.js';

export const interactions = {
  shop(p) { this.send(p, { t: 'ui', kind: 'shop' }); },
  forge(p) { this.send(p, { t: 'ui', kind: 'smith' }); }, // the Blacksmith: weapons, shields, armor and forging
};

export const methods = {
  /** Buy from the town shop (tier allowing) or the Pet Keeper's treats. Only in town. */
  on_buy(p, { item }) {
    const def = ITEMS[item];
    if (!def || p.loc !== 'town') return;
    const petShop = PET_SHOP_STOCK.includes(item);
    if (!petShop && !SHOP_STOCK.includes(item)) return;
    if (!petShop && !inShopFor(item, p.level)) {
      return this.toast(p, `The shopkeeper says: come back at level ${def.tier * 20} for ${def.name}!`);
    }
    const gear = isGear(item);
    if (gear && !this.atForge(p)) return this.toast(p, 'Weapons and armor are sold by the Blacksmith, at the forge.');
    if (gear && p.gear.includes(item)) return this.toast(p, 'You already have that one. Press C to equip it.');
    if (!this.spend(p, def.price, def.name)) return;
    if (gear) {
      p.gear.push(item);
      p[def.kind] = item; // just bought it: put it on (weapon / shield / armor slot)
      this.writeRecord(p);
      this.broadcastRoster();
    } else p.inventory[item] = (p.inventory[item] ?? 0) + 1;
    this.toast(p, `Bought ${def.name}!`);
    this.sendSelf(p);
  },

  /** Buy a hat / back item / dye / fancy clothes for this player's closet. */
  on_buyStyle(p, { slot, id }) {
    const def = STYLE_SLOTS[slot]?.[id];
    if (!def?.price || def.seasonal || ownsStyle(p.closet, slot, id) || p.loc !== 'town') return;
    if (!this.spend(p, def.price, def.name)) return;
    p.closet.push(`${slot}:${id}`);
    this.toast(p, `Bought ${def.name}! Try it on at the wardrobe at home.`);
    this.writeRecord(p);
    this.sendSelf(p);
  },

  /** Make a forged weapon: needs its blueprint, the materials and gold. Only at the forge. */
  on_forge(p, { recipe }) {
    const r = FORGE_RECIPES[recipe];
    if (!r || !p.blueprints.includes(recipe) || p.loc !== 'town') return;
    if (p.gear.includes(recipe)) return this.toast(p, 'You already have one of those!');
    for (const [item, n] of Object.entries(r.needs)) {
      if ((p.inventory[item] ?? 0) < n) return this.toast(p, `You need ${n} ${ITEMS[item].name}.`);
    }
    if (!this.spend(p, r.gold, ITEMS[recipe].name)) return;
    for (const [item, n] of Object.entries(r.needs)) {
      p.inventory[item] -= n;
      if (!p.inventory[item]) delete p.inventory[item];
    }
    this.sendToLocation(p.loc, { t: 'fx', kind: 'forge', id: p.id, x: p.x, z: p.z });
    this.gainGear(p, recipe);
  },

  /** Smelt SMELT_ORE ore into a bar at the Blacksmith (`all`: as many bars as the ore makes). */
  on_smelt(p, { ore, all }) {
    const bar = SMELT[ore];
    if (!bar || p.loc !== 'town') return;
    const n = Math.min(all ? Infinity : 1, Math.floor((p.inventory[ore] ?? 0) / SMELT_ORE));
    if (n < 1) return this.toast(p, `You need ${SMELT_ORE} ${ITEMS[ore].name} for a bar.`);
    p.inventory[ore] -= n * SMELT_ORE;
    if (!p.inventory[ore]) delete p.inventory[ore];
    p.inventory[bar] = (p.inventory[bar] ?? 0) + n;
    this.sendToLocation(p.loc, { t: 'fx', kind: 'forge', id: p.id, x: p.x, z: p.z });
    this.toast(p, `🔥 Smelted ${n} ${ITEMS[bar].name}${n > 1 ? 's' : ''}!`);
    this.writeRecord(p);
    this.sendSelf(p);
  },

  /** Sell loot from your bag, or a weapon / shield / armor you aren't using. */
  on_sell(p, { item, qty }) {
    const def = ITEMS[item];
    if (!def || p.loc !== 'town') return;
    if (isGear(item)) {
      if (!p.gear.includes(item)) return;
      if (p.weapon === item || p.shield === item || p.armor === item) return this.toast(p, `Take off your ${def.name} first (C).`);
      const price = sellValue(item);
      p.gear = p.gear.filter((g) => g !== item);
      if (p.enchants) delete p.enchants[item]; // the magic goes with it
      this.earn(p, price);
      this.toast(p, `Sold ${def.name} for ${price} gold`);
      this.writeRecord(p);
      this.sendSelf(p);
      return;
    }
    const have = p.inventory[item] ?? 0;
    const n = Math.min(have, Math.max(1, Math.floor(qty) || 1));
    if (!def.sell || n <= 0) return;
    p.inventory[item] = have - n;
    if (!p.inventory[item]) delete p.inventory[item];
    this.earn(p, def.sell * n);
    this.toast(p, `Sold ${n} ${def.name} for ${def.sell * n} gold`);
  },

  /** Standing at the Blacksmith's forge? */
  atForge(p) {
    const forge = this.getLocation('town').layout.props.find((q) => q.interact === 'forge');
    return p.loc === 'town' && !!forge && dist2(p, forge) <= (INTERACT_RANGE + forge.radius + 2) ** 2;
  },

  /** For the HUD: the shop tier this player can buy from. */
  shopTierFor(p) {
    return shopTier(p.level);
  },
};
