// solstice — the Solstice Arena, halfway through summer (shared/seasons.js holidayOf 'solstice'): a
// sand ring on the grass south-east of the market with the Sun Herald at its gate. Talk to the herald
// to start the next round of warriors (ARENA_ROUNDS: three, each harder, scaled to the family). They
// only fight people inside the ring. If everyone leaves (or faints) mid-round the warriors bow out and
// the round can be tried again. Win the third and everyone in the ring gets the Solar Blade; three more,
// harder still, win the Solar Helmet (ARENA_PRIZES).
import { ENEMIES, makeEnemy } from '../../shared/dungeons.js';
import { ITEMS } from '../../shared/items.js';
import { XP } from '../../shared/progression.js';
import { HATS } from '../../shared/config.js';
import { holidayOf, SOLSTICE_ARENA, SOLSTICE_HERALD, ARENA_ROUNDS, ARENA_PRIZES } from '../../shared/seasons.js';

const LOG = 'solstice';               // save.flags: { day, won: rounds won today }
const RING = SOLSTICE_ARENA.r + 3;    // who counts as in the fight
const AWAY = 6;                        // seconds with nobody in the ring before the warriors bow out
const ARENA = { x: SOLSTICE_ARENA.x, z: SOLSTICE_ARENA.z, r: SOLSTICE_ARENA.r, arena: true }; // the warriors' yard

const inRing = (p) => (p.x - SOLSTICE_ARENA.x) ** 2 + (p.z - SOLSTICE_ARENA.z) ** 2 < RING ** 2;

/** The town was loaded: on the solstice the herald (and the ring) are there. */
export function onLocation(loc) {
  if (loc.key === 'town') this.syncSolstice(loc);
}

/** A new day puts up or takes down the arena; a round with nobody left in the ring is called off. */
export function tick(dt) {
  const town = this.locations.get('town');
  if (!town) return;
  if (this._solsticeDay !== this.save.day) {
    this._solsticeDay = this.save.day;
    this.syncSolstice(town);
  }
  if (!this._arenaOn) return; // a round is on (only then is it worth looking)
  if (!this.arenaFoes(town).length) { this._arenaOn = false; return; }
  this._arenaAway = town.livePlayers().some(inRing) ? 0 : (this._arenaAway ?? 0) + dt;
  if (this._arenaAway >= AWAY) this.callOffArena(town);
}

export const interactions = {
  /** The Sun Herald: start the next round (or cheer you on, or crown you). */
  arena(p) {
    if (holidayOf(this.save.day) !== 'solstice' || p.loc !== 'town') return;
    const town = this.locations.get('town'), won = this.solsticeLog().won;
    if (this.arenaFoes(town).length) return this.toast(p, `☀️ Round ${won + 1} is on! Beat the warriors in the ring!`);
    if (won >= ARENA_ROUNDS.length) return this.toast(p, `☀️ “Hail, Solstice Champions! The Solar Blade and the Solar Helmet are yours. Come back next summer!”`);
    this.startArenaRound(town, won + 1, p);
  },
};

export const methods = {
  /** Today's arena record (a fresh one each solstice). */
  solsticeLog() {
    const log = this.save.flags[LOG];
    return log?.day === this.save.day ? log : (this.save.flags[LOG] = { day: this.save.day, won: 0 });
  },

  arenaFoes(loc) {
    return [...loc.entities.values()].filter((e) => e.type === 'slime' && e._home?.arena);
  },

  /** Make the town match the day: the herald on the solstice, nobody (and no warriors) otherwise. */
  syncSolstice(loc) {
    const want = holidayOf(this.save.day) === 'solstice';
    if (!want) {
      for (const e of [...loc.entities.values()]) if (e.arenaHerald || e._home?.arena) loc.remove(e.id);
      return;
    }
    if ([...loc.entities.values()].some((e) => e.arenaHerald)) return;
    loc.spawn({
      type: 'npc', arenaHerald: true, name: 'Sun Herald', cls: 'Knight', decor: 'solstice',
      look: { hat: 'own', cape: 'knight', face: 'mustache', hairColor: 'blonde' },
      x: SOLSTICE_HERALD.x, z: SOLSTICE_HERALD.z, rot: 0, r: 0.8, interact: 'arena', prompt: 'Talk to the Sun Herald ☀️',
    });
  },

  /** Round n's warriors march in, spread round the far side of the ring, as strong as the family. */
  startArenaRound(loc, n, by) {
    const round = ARENA_ROUNDS[n - 1];
    const levels = [...Object.values(this.save.players), ...this.players.values()].map((r) => r.level ?? 1);
    const depth = Math.max(1, Math.round(Math.max(1, ...levels) * round.power));
    const foes = Object.entries(round.foes).flatMap(([variant, k]) => Array(k).fill(variant));
    foes.forEach((variant, i) => {
      const a = Math.PI * (0.15 + (0.7 * (i + 0.5)) / foes.length); // a fan facing the gate
      const x = ARENA.x + Math.cos(a) * ARENA.r * 0.6, z = ARENA.z + Math.sin(a) * ARENA.r * 0.6;
      const def = ENEMIES[variant], boss = !!def.champion;
      loc.spawn({
        ...makeEnemy(variant, depth, x, z), rot: Math.PI, r: (def.r ?? 0.7) * (def.scale ?? 1),
        ...(boss ? { boss: true, name: def.champion, bigMoves: def.bigMoves } : {}),
        _depth: depth, _home: ARENA,
      });
      this.sendToLocation(loc.key, { t: 'fx', kind: 'nova', x, z });
    });
    this._arenaAway = 0;
    this._arenaOn = true;
    this.sendToLocation(loc.key, { t: 'toast', big: true, text: `☀️ ${by?.name ?? 'Someone'} steps into the Solstice Arena! Round ${n} of ${ARENA_ROUNDS.length}: ${round.name}!` });
  },

  /** A warrior down: a little gold and XP; the last one wins the round. */
  arenaFoeDefeated(loc, e, by) {
    const [lo, hi] = ENEMIES[e.variant].gold;
    const gold = Math.round((lo + Math.floor(Math.random() * (hi - lo + 1))) * (e.goldMul ?? 1));
    const piles = e.boss ? 5 : 1;
    for (let i = 0; i < piles; i++) this.dropItem(loc, e, 'gold', Math.round(gold / piles));
    if (e.boss) this.dropItem(loc, e, 'essence', this.essenceFrom(e, e._depth ?? 1));
    this.sendToLocation(loc.key, { t: 'fx', kind: 'pop', x: e.x, z: e.z, variant: e.variant });
    this.shareXp(loc, e.boss ? XP.boss * 2 : XP.slime(e.maxHp));
    if (e.boss) { // the champion yields: the warriors he called in go with him
      for (const f of this.arenaFoes(loc)) {
        loc.remove(f.id);
        this.sendToLocation(loc.key, { t: 'fx', kind: 'pop', x: f.x, z: f.z, variant: f.variant });
      }
    }
    if (!this.arenaFoes(loc).length) this.arenaRoundWon(loc, by);
  },

  arenaRoundWon(loc, by) {
    const log = this.solsticeLog();
    log.won = Math.min(ARENA_ROUNDS.length, log.won + 1);
    this.sendToLocation(loc.key, { t: 'fx', kind: 'nova', x: ARENA.x, z: ARENA.z });
    const fighters = loc.livePlayers().filter(inRing);
    if (by && !fighters.includes(by)) fighters.push(by);
    const prize = ARENA_PRIZES[log.won];
    if (prize) {
      for (const p of fighters) {
        if (prize.item) this.gainGear(p, prize.item);
        else if (!(p.closet ??= []).includes(`hat:${prize.hat}`)) { p.closet.push(`hat:${prize.hat}`); this.sendSelf(p); } // (into the wardrobe)
      }
      const name = prize.item ? ITEMS[prize.item].name : HATS[prize.hat].name;
      this.broadcast({ t: 'toast', big: true, text: `☀️🏆 ${fighters.map((p) => p.name).join(' & ') || 'The family'} won ${log.won < ARENA_ROUNDS.length ? 'the Solstice Arena' : 'the Solstice Arena’s hardest trial'} and earned the ${name}!${prize.hat ? ' (It’s in your wardrobe.)' : ''}` });
    }
    if (log.won < ARENA_ROUNDS.length) {
      const next = ARENA_ROUNDS[log.won];
      this.sendToLocation(loc.key, { t: 'toast', big: true, text: prize
        ? `☀️ The Sun Herald has a harder challenge: ${next.name} and ${ARENA_ROUNDS.length - log.won} more rounds for the Solar Helmet! Talk to him when you’re ready.`
        : `🏆 Round ${log.won} won! Talk to the Sun Herald when you’re ready for round ${log.won + 1}.` });
    }
    this.persist();
  },

  /** Nobody left in the ring: the warriors bow and leave; the round can be tried again. */
  callOffArena(loc) {
    for (const f of this.arenaFoes(loc)) loc.remove(f.id);
    this._arenaAway = 0;
    const next = this.solsticeLog().won + 1;
    this.sendToLocation(loc.key, { t: 'toast', text: `☀️ The warriors bow and leave the ring. Talk to the Sun Herald to try round ${next} again.` });
  },
};
