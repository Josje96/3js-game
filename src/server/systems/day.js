// day — the day clock. Warnings a minute and 30 seconds before nightfall; at nightfall anyone
// who isn't home in the fort faints and loses half their gold, and the day ends for everyone.
// A day also ends early when everyone online is in bed (see home.js). Dungeons reshuffle each day.
import { DAY_SECONDS, NIGHT_WARNINGS, NIGHT_GOLD_PENALTY } from '../../shared/config.js';
import { daysToNextSeason } from '../../shared/seasons.js';
import { petMaxHp } from '../../shared/pets.js';

export function tick(dt) {
  this.dayClock += dt;
  this.worldTimer -= dt;
  if (this.worldTimer <= 0) { this.worldTimer = 1; this.broadcastWorld(); }
  const left = DAY_SECONDS - this.dayClock;
  for (const w of NIGHT_WARNINGS) {
    if (left <= w && !this.warned.has(w)) {
      this.warned.add(w);
      const when = w >= 60 ? `${Math.round(w / 60)} minute${w >= 120 ? 's' : ''}` : `${w} seconds`;
      this.broadcast({ t: 'toast', text: `🌙 Night falls in ${when}! Get home to the fort, or you’ll faint and drop half your gold.`, big: true });
      this.broadcast({ t: 'fx', kind: 'nightWarning', seconds: w });
    }
  }
  if (left <= 0) this.endDay('nightfall');
}

export const methods = {
  /**
   * Ends today. 'nightfall': whoever is outside the fort faints (half their gold). 'sleep': everyone
   * went to bed. Then everybody wakes up healed next to their bed on the next day.
   */
  endDay(reason, days = 1) {
    const fainted = [];
    if (reason === 'nightfall') {
      for (const p of this.players.values()) {
        if (p.loc === 'house') continue;
        const lost = Math.floor(p.gold * NIGHT_GOLD_PENALTY);
        p.gold -= lost;
        fainted.push({ name: p.name, lost });
      }
    }
    // a long sleep wakes you on the first day of a new season, so nobody sleeps through its boss
    days = Math.min(Math.max(1, days | 0), daysToNextSeason(this.save.day));
    this.save.day += days;
    this.dayClock = 0;
    this.warned = new Set();
    // the night screen goes up first, so nobody sees the world being rebuilt behind it
    this.broadcast({ t: 'night', day: this.save.day, reason, fainted, days });
    for (const p of [...this.players.values()]) {
      p.hp = p.maxHp;
      p.sleeping = false;
      p.sleepDays = 1;
      for (const pet of p.pets) if (!pet.fainted) pet.hp = petMaxHp(pet.species, pet.level); // fainted ones need the Pet Keeper
      this.travel(p, 'house', null, this.bedSpot(p));
      const f = fainted.find((x) => x.name === p.name);
      if (f) this.toast(p, `You were out after dark and fainted! Someone carried you home.${f.lost ? ` (dropped ${f.lost} gold)` : ''}`);
      this.sendSelf(p);
    }
    this.persist();
    this.broadcastWorld();
  },
};
