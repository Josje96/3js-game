// bank — the Banker's booth in Pebble Town. Opening an account costs BANK_OPEN_FEE; after that
// you can put gold in and take it out, and gold in the bank is never lost when you faint (only
// the gold you carry is). You can also send gold from your account to anyone in the family who has
// an account too, even if they're not playing right now: it lands in their account.
import { BANK_OPEN_FEE, INTERACT_RANGE } from '../../shared/config.js';
import { dist2 } from '../../shared/physics.js';

export const interactions = {
  bank(p) {
    // who you can send to: everyone else with an account (online, the live player is the truth)
    const family = Object.entries(this.save.players)
      .filter(([id]) => id !== p.id && this.bankOf(id) != null)
      .map(([id, r]) => ({ id, name: r.name, level: (this.players.get(id) ?? r).level ?? 1 }));
    this.send(p, { t: 'ui', kind: 'bank', family });
  },
};

export const methods = {
  /** Everything at the bank: 'open', 'deposit', 'withdraw', 'send' (amount, to). Must be at the booth. */
  on_bank(p, { action, amount, to }) {
    if (!this.atBank(p)) return;
    if (action === 'open') {
      if (p.bank != null) return;
      if (!this.spend(p, BANK_OPEN_FEE, 'opening a bank account')) return;
      p.bank = 0;
      this.toast(p, '🏦 Your bank account is open! Gold in the bank is safe, even if you faint.');
      return this.bankDone(p);
    }
    if (p.bank == null) return this.toast(p, 'Open an account first.');
    const n = Math.floor(amount ?? 0);
    if (!(n > 0)) return;
    if (action === 'deposit') {
      if (!this.spend(p, n, 'that deposit')) return;
      p.bank += n;
      this.toast(p, `Put ${n} gold in the bank.`);
    } else if (action === 'withdraw') {
      if (p.bank < n) return this.toast(p, `You only have ${p.bank} gold in the bank.`);
      p.bank -= n;
      this.earn(p, n);
      this.toast(p, `Took ${n} gold out of the bank.`);
    } else if (action === 'send') {
      const rec = this.save.players[to];
      if (!rec || to === p.id) return;
      if (this.bankOf(to) == null) return this.toast(p, `${rec.name} needs to open a bank account first.`);
      if (p.bank < n) return this.toast(p, `You only have ${p.bank} gold in the bank.`);
      p.bank -= n;
      const live = this.players.get(to);
      (live ?? rec).bank += n; // online: the live player is the truth (its record is written from it)
      if (live) {
        this.toast(live, `💌 ${p.name} sent you ${n} gold (it’s in your bank)!`);
        this.sendSelf(live);
        this.writeRecord(live);
      }
      this.toast(p, `Sent ${n} gold to ${rec.name}.`);
    } else return;
    this.bankDone(p);
  },

  /** Someone's bank balance, or null if they have no account. */
  bankOf(id) {
    return (this.players.get(id) ?? this.save.players[id])?.bank ?? null;
  },

  atBank(p) {
    if (p.loc !== 'town') return false;
    const booth = this.getLocation('town').layout.props.find((q) => q.interact === 'bank');
    return !!booth && dist2(p, booth) <= (INTERACT_RANGE + booth.radius + 2) ** 2;
  },

  bankDone(p) {
    this.writeRecord(p);
    this.sendSelf(p);
    this.persist();
  },
};
