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
};
