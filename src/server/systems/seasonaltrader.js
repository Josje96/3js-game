// seasonaltrader — the Seasonal Trader's stall in the town square: treats and decorations you can
// only buy in their season, a different set every few days (shared/seasonal.js).
import { ITEMS } from '../../shared/items.js';
import { FURNITURE } from '../../shared/furniture.js';
import { CLOTHES } from '../../shared/config.js';
import { seasonalSet, seasonalPrice } from '../../shared/seasonal.js';

export const interactions = {
  seasonal(p) {
    const set = seasonalSet(this.save.day);
    this.send(p, { t: 'ui', kind: 'seasonal', ...set });
  },
};

export const methods = {
  /** Buy something off the stall: it has to be on today's set. Treats go in your bag; decorations go home. */
  on_buySeasonal(p, { item }) {
    if (p.loc !== 'town') return;
    const on = seasonalSet(this.save.day).items.find((i) => i.id === item);
    if (!on) return this.toast(p, '“Sorry, that’s not on the stall today. Come back next season!”');
    const def = on.kind === 'item' ? ITEMS[item] : on.kind === 'clothes' ? CLOTHES[item] : FURNITURE[item];
    if (!def) return;
    if (on.kind === 'clothes' && p.closet.includes(`clothes:${item}`)) return this.toast(p, 'You already have that outfit — it’s in your wardrobe.');
    if (!this.spend(p, seasonalPrice(def), def.name)) return;
    if (on.kind === 'clothes') {
      p.closet.push(`clothes:${item}`);
      this.toast(p, `Bought ${def.name}! Try it on at the wardrobe at home.`);
      this.writeRecord(p);
      this.sendSelf(p);
    } else if (on.kind === 'item') {
      p.inventory[item] = (p.inventory[item] ?? 0) + 1;
      this.toast(p, `Bought ${def.name}!`);
      this.sendSelf(p);
    } else {
      const owned = this.save.house.owned;
      owned[item] = (owned[item] ?? 0) + 1;
      this.toast(p, `Bought ${def.name}! Go home and press B to place it.`);
      this.sendHouse();
    }
  },
};
