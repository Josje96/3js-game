// raid — on the 5th day of every month (each season is a month: shared/seasons.js RAID_DAY) the Shadow King's
// knights raid Pebble Town. In the morning the town calls everyone to rally; once someone's in town they march
// out of the Shadow Keep gate, along the road and up to the fountain (their column's yard moves along RAID_ROUTE:
// they fight whoever comes near it). They're fairly easy, led by their Captain. Beat them all: the townsfolk
// cheer, every defender gets gold and XP, and the first time, a captured Shadow banner for home. Let them hold
// the fountain long enough (or leave the town to them all day) and they carry off the town's takings: the
// shops charge the Shadow tax (SHADOW_TAX) for a few days.
import { ENEMIES, makeEnemy } from '../../shared/dungeons.js';
import { XP } from '../../shared/progression.js';
import { FURNITURE } from '../../shared/furniture.js';
import { isRaidDay, RAID_ROUTE, SHADOW_TAX, SHADOW_TAX_DAYS } from '../../shared/seasons.js';

const LOG = 'raid';            // save.flags: { day, state: 'coming' | 'on' | 'won' | 'lost' }
const WINS = 'raidWins';       // save.flags: how many raids the family has beaten off
const TROPHY = 'raidbanner';   // the first win's prize (shared/furniture.js)
const START_AFTER = 12;        // seconds someone has been in town (raid day) before they come
const MARCH = 1.5;             // how fast the column moves along the road (the knights themselves are faster)
const YARD = 7;                // how far round the column they'll go for someone
const SIEGE = 40;              // seconds of four or more knights at the fountain to carry off the takings
const AT_FOUNTAIN = 6;         // who counts as being at it
const POWER = 0.6;             // as strong as a dungeon this far down, times the family's best level: easy

const fountainOf = (loc) => loc.layout.props.find((q) => q.build === 'fountain');

/** The town was loaded: a raid that's on puts its knights back (a host who reloaded mid-raid). */
export function onLocation(loc) {
  if (loc.key === 'town' && this.raidLog()?.state === 'on' && !this.raidFoes(loc).length) this.startRaid(loc, null, true);
}

/** Joining on raid day: tell them where to go. */
export function onJoin(p) {
  const log = this.raidLog();
  if (log?.state === 'coming') this.toast(p, '⚔️ The Shadow King’s knights are raiding Pebble Town today! Rally in town and defend the fountain!');
  if (log?.state === 'on') this.toast(p, '⚔️ The Shadow Knights are marching on the fountain! Hurry to town!');
  const taxDays = (this.save.flags.shadowTax ?? 0) - this.save.day + 1;
  if (taxDays > 0) this.toast(p, `🌑 The Shadow tax: the knights took the town’s takings, so the shops charge ${Math.round(SHADOW_TAX * 100)}% more for ${taxDays === 1 ? 'the rest of today' : `${taxDays} more days`}.`);
}

export function tick(dt) {
  if (this._raidDay !== this.save.day) { // a new day
    const fresh = this._raidDay != null; // (not the first step after loading a save)
    this._raidDay = this.save.day;
    this.newRaidDay(fresh);
  }
  const log = this.raidLog(), town = this.locations.get('town');
  if (this._raidLeaveAt && this.time >= this._raidLeaveAt) { // the knights that took the town's takings are back through the gate
    this._raidLeaveAt = null;
    if (town) for (const e of this.raidFoes(town)) town.remove(e.id);
  }
  if (!log || !town) return;
  if (log.state === 'coming') {
    this._raidWait = town.livePlayers().length ? (this._raidWait ?? 0) + dt : 0;
    if (this._raidWait >= START_AFTER) this.startRaid(town, town.livePlayers()[0]);
    return;
  }
  if (log.state !== 'on' || !this._raidYard) return;
  // the column marches on along the road (whatever the fighting), then holds the fountain
  const y = this._raidYard, to = this._raidRoute[0];
  if (to) {
    const dx = to.x - y.x, dz = to.z - y.z, d = Math.hypot(dx, dz), step = MARCH * dt;
    if (d <= step) { y.x = to.x; y.z = to.z; this._raidRoute.shift(); } else { y.x += (dx / d) * step; y.z += (dz / d) * step; }
  }
  const f = fountainOf(town);
  if (!f) return;
  const near = this.raidFoes(town).filter((e) => (e.x - f.x) ** 2 + (e.z - f.z) ** 2 < AT_FOUNTAIN ** 2).length;
  if (!near) return;
  const before = log.siege ?? 0;
  log.siege = Math.min(1, before + (dt * Math.min(4, near)) / 4 / SIEGE);
  for (const q of [0.25, 0.5, 0.75]) if (before < q && log.siege >= q) this.sendToLocation('town', { t: 'toast', big: true, text: `⚠️ The Shadow Knights are taking the fountain! (${Math.round(q * 100)}%) Drive them off!` });
  if (log.siege >= 1) this.raidLost(town);
}

export const methods = {
  /** Today's raid, if today's the day. */
  raidLog() {
    const log = this.save.flags[LOG];
    return log?.day === this.save.day ? log : null;
  },

  raidFoes(loc) {
    return [...loc.entities.values()].filter((e) => e.type === 'slime' && e._home?.raid);
  },

  /** Morning: last raid's knights go; a raid day calls everyone to rally. Yesterday's raid left to them: lost. */
  newRaidDay(fresh) {
    const town = this.locations.get('town'), last = this.save.flags[LOG];
    if (town) for (const e of this.raidFoes(town)) town.remove(e.id);
    this._raidYard = null;
    this._raidWait = 0;
    if (last && last.day < this.save.day && (last.state === 'coming' || last.state === 'on')) {
      if (last.state === 'coming') this.raidLost(null, true); // nobody came to stop them
      else { last.state = 'gone'; this.broadcast({ t: 'toast', text: '⚔️ At nightfall the Shadow Knights slunk back to the Shadow Keep.' }); }
    }
    if (!isRaidDay(this.save.day)) return;
    this.save.flags[LOG] = { day: this.save.day, state: 'coming', siege: 0 };
    if (fresh) this.broadcast({ t: 'toast', big: true, text: '⚔️ Scouts are running in: the Shadow King’s knights will raid Pebble Town today! They’re after the fountain. Everyone, rally in town!' });
  },

  /** They come: knights (more for a bigger family) and their Captain, out of the Shadow Keep gate. */
  startRaid(loc, by, quiet = false) {
    const log = this.raidLog();
    if (!log) return;
    log.state = 'on';
    const f = fountainOf(loc);
    const [start, ...route] = RAID_ROUTE;
    this._raidRoute = f ? [...route, { x: f.x, z: f.z }] : route;
    this._raidYard = { x: start.x, z: start.z, r: YARD, raid: true };
    const levels = [...Object.values(this.save.players), ...this.players.values()].map((r) => r.level ?? 1);
    const depth = Math.max(1, Math.round(Math.max(1, ...levels) * POWER));
    const knights = Math.min(12, 4 + 2 * Math.max(1, loc.livePlayers().length));
    const foes = ['shadowcaptain', ...Array(knights).fill('shadowknight')];
    foes.forEach((variant, i) => {
      const row = Math.floor(i / 3), col = (i % 3) - 1; // in ranks, the Captain at the front
      const x = start.x + row * 1.8, z = start.z + col * 1.8;
      const def = ENEMIES[variant], boss = !!def.champion;
      loc.spawn({
        ...makeEnemy(variant, depth, x, z), rot: -Math.PI / 2, r: (def.r ?? 0.7) * (def.scale ?? 1),
        ...(boss ? { boss: true, name: def.champion } : {}),
        _depth: depth, _home: this._raidYard,
      });
    });
    this.persist();
    if (quiet) return;
    this.sendToLocation(loc.key, { t: 'raid', phase: 'start', x: start.x, z: start.z });
    this.broadcast({ t: 'toast', big: true, text: `⚔️ The Shadow Knights are marching out of the Shadow Keep gate${by ? ` — ${by.name} spotted them` : ''}! Stop them before they reach the fountain!` });
  },

  /** A knight down: a little gold and XP; the last one wins the day. */
  raidFoeDefeated(loc, e, by) {
    const [lo, hi] = ENEMIES[e.variant].gold;
    const gold = Math.round((lo + Math.floor(Math.random() * (hi - lo + 1))) * (e.goldMul ?? 1));
    const piles = e.boss ? 4 : 1;
    for (let i = 0; i < piles; i++) this.dropGold(loc, e, Math.round(gold / piles));
    this.sendToLocation(loc.key, { t: 'fx', kind: 'pop', x: e.x, z: e.z, variant: e.variant });
    this.shareXp(loc, e.boss ? XP.boss : XP.slime(e.maxHp));
    if (e.boss) this.sendToLocation(loc.key, { t: 'toast', big: true, text: '⚔️ The Captain of the Shadow Knights has fallen! Finish off the rest!' });
    if (!this.raidFoes(loc).length) this.raidWon(loc, by);
  },

  /** Saved! Everyone in town gets a purse of gold and XP; the first time, a captured banner for home. */
  raidWon(loc, by) {
    const log = this.raidLog();
    if (!log || log.state !== 'on') return;
    log.state = 'won';
    this._raidYard = null;
    const wins = this.save.flags[WINS] = (this.save.flags[WINS] ?? 0) + 1;
    const defenders = loc.livePlayers();
    if (by && !defenders.includes(by)) defenders.push(by);
    for (const p of defenders) this.earn(p, 150 + 20 * (p.level ?? 1));
    this.shareXp(loc, XP.boss * 2);
    if (wins === 1) {
      const owned = this.save.house.owned;
      owned[TROPHY] = (owned[TROPHY] ?? 0) + 1;
      this.sendHouse();
    }
    const f = fountainOf(loc);
    this.sendToLocation(loc.key, { t: 'raid', phase: 'won', x: f?.x ?? loc.layout.w * 2, z: f?.z ?? loc.layout.h * 2 });
    this.broadcast({ t: 'toast', big: true, text: `🎉 Pebble Town is saved! ${defenders.map((p) => p.name).join(' & ') || 'The family'} drove off the Shadow Knights. Every defender gets a purse of gold!${wins === 1 ? ` And a ${FURNITURE[TROPHY].name} for the fort (press B at home).` : ''}` });
    this.persist();
  },

  /** They held the fountain (or nobody came): they make off with the town's takings. The Shadow tax. */
  raidLost(loc, unopposed = false) {
    const log = this.save.flags[LOG];
    if (log) log.state = 'lost';
    this._raidYard = null;
    if (loc) { // they march off back to the Shadow Keep gate with the loot, and are gone
      const [gate] = RAID_ROUTE, back = { x: gate.x + 4, z: gate.z, r: 1.5, raid: true };
      for (const e of this.raidFoes(loc)) e._home = back;
      this._raidLeaveAt = this.time + 9;
      const f = fountainOf(loc);
      this.sendToLocation(loc.key, { t: 'raid', phase: 'lost', x: f?.x ?? 0, z: f?.z ?? 0 });
    }
    this.save.flags.shadowTax = this.save.day + SHADOW_TAX_DAYS - 1; // (today and the next few: its last day)
    this.broadcast({ t: 'toast', big: true, text: `🌑 ${unopposed ? 'Nobody was there to stop them: yesterday the' : 'The'} Shadow Knights carried off the town’s takings! The shops charge the Shadow tax (${Math.round(SHADOW_TAX * 100)}% more) for ${SHADOW_TAX_DAYS} days. Next time, rally!` });
    this.broadcastWorld();
    this.persist();
  },
};
