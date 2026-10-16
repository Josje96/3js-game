// wallet — everyone has their own gold (`p.gold`, saved per player). Every change to it goes
// through these, so the HUD and the save always hear about it.

export const methods = {
  /** Take `amount` gold from `p` if they have it. Returns false (and tells them) if not. */
  spend(p, amount, what = 'that') {
    if (!(amount >= 0) || p.gold < amount) {
      this.toast(p, `Not enough gold for ${what}! (${amount} gold, you have ${p.gold})`);
      return false;
    }
    p.gold -= amount;
    this.sendSelf(p);
    return true;
  },

  /** Give `p` gold (pickups, selling, rewards). */
  earn(p, amount) {
    if (!(amount > 0)) return;
    p.gold += Math.floor(amount);
    this.sendSelf(p);
  },

  /** Cheat codes (type them in the game, or in chat): 1234 = 1000 gold; 5678 = a free enchant at the Enchanter. */
  on_cheat(p, { code }) {
    if (code === '5678') return this.freeEnchant(p); // (systems/enchant.js: only at the Enchanter)
    if (CHEATS[code] == null) return;
    this.earn(p, CHEATS[code]);
    this.writeRecord(p);
    this.toast(p, `💰 Cheat code! +${CHEATS[code]} gold`, true);
    this.persist();
  },
};

const CHEATS = { 1234: 1000 }; // code -> gold
