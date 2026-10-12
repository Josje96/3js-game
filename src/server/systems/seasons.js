// seasons — the year turns every SEASON_DAYS days (shared/seasons.js). On the first day of each
// season that season's boss visits Pebble Town for the day: it stays in its patch of grass south-east
// of the market (only people who walk up to it get attacked), it's scaled to the strongest family
// member, and beating it drops epic loot: one piece per fighter, plus a pile of gold.
import { ENEMIES, makeEnemy } from '../../shared/dungeons.js';
import { ITEMS } from '../../shared/items.js';
import { XP } from '../../shared/progression.js';
import { seasonOf, isBossDay, seasonBossDepth, SEASON_ARENA } from '../../shared/seasons.js';

const BEATEN = 'seasonBossBeaten'; // save.flags: the day the family last beat a seasonal boss
const FIGHT_RANGE = SEASON_ARENA.r + 14; // who counts as having fought it (gets a piece of loot)
const XP_MUL = 4;                         // worth this many dungeon bosses

/** The town was loaded: if today's the day, the boss is waiting. */
export function onLocation(loc) {
  if (loc.key === 'town') this.syncSeasonBoss(loc);
}

/** A new day: announce a new season's boss, and put it in (or take it out of) town. */
export function tick() {
  if (this._seasonDay === this.save.day) return;
  const fresh = this._seasonDay != null; // not on the first step after loading a save
  this._seasonDay = this.save.day;
  const town = this.locations.get('town');
  if (town) this.syncSeasonBoss(town);
  if (fresh && this.seasonBossToday()) {
    const s = seasonOf(this.save.day);
    this.broadcast({ t: 'toast', big: true, text: `${s.icon} ${s.name} is here! ${s.bossName} has come to Pebble Town — for today only. It’s very tough: bring the whole family!` });
  }
}

/** Joining on the boss's day: tell them. */
export function onJoin(p) {
  if (!this.seasonBossToday()) return;
  const s = seasonOf(this.save.day);
  this.toast(p, `${s.icon} ${s.bossName} is in town today only (south-east of the market)!`);
}

export const methods = {
  seasonBossToday() {
    return isBossDay(this.save.day) && this.save.flags[BEATEN] !== this.save.day;
  },

  /** Make the town match the day: the season's boss in its yard on its day, gone otherwise. */
  syncSeasonBoss(loc) {
    const s = seasonOf(this.save.day), want = this.seasonBossToday();
    const boss = [...loc.entities.values()].find((e) => e.seasonal);
    if (boss && (!want || boss.variant !== s.boss)) {
      for (const e of [...loc.entities.values()]) if (e.seasonal || e._home?.season) loc.remove(e.id);
    } else if (boss || !want) return;
    if (!want) return;
    const levels = [...Object.values(this.save.players), ...this.players.values()].map((r) => r.level ?? 1);
    const depth = seasonBossDepth(Math.max(1, ...levels));
    const def = ENEMIES[s.boss], scale = def.scale ?? 1;
    loc.spawn({
      ...makeEnemy(s.boss, depth, SEASON_ARENA.x, SEASON_ARENA.z),
      boss: true, seasonal: true, name: s.bossName, r: (def.r ?? 0.7) * scale,
      _depth: depth, _home: { x: SEASON_ARENA.x, z: SEASON_ARENA.z, r: SEASON_ARENA.r, season: true },
    });
  },

  /** Beaten! Gold, a blueprint, and an epic piece for everyone who was in the fight. Its helpers flee. */
  seasonBossDefeated(loc, e, by) {
    const s = seasonOf(this.save.day);
    this.save.flags[BEATEN] = this.save.day;
    for (const h of [...loc.entities.values()]) {
      if (h.type !== 'slime' || !h._home?.season) continue;
      loc.remove(h.id);
      this.sendToLocation(loc.key, { t: 'fx', kind: 'pop', x: h.x, z: h.z, variant: h.variant });
    }
    const [lo] = ENEMIES[e.variant].gold;
    const gold = Math.round(lo * (e.goldMul ?? 1));
    for (let i = 0; i < 6; i++) this.dropItem(loc, e, 'gold', Math.round(gold / 6));
    const fighters = loc.livePlayers().filter((p) => (p.x - SEASON_ARENA.x) ** 2 + (p.z - SEASON_ARENA.z) ** 2 < FIGHT_RANGE ** 2);
    for (let i = 0; i < Math.max(1, fighters.length); i++) this.dropItem(loc, e, s.loot[Math.floor(Math.random() * s.loot.length)], 1);
    this.dropBlueprint(loc, e, e._depth ?? 1);
    this.dropItem(loc, e, 'essence', this.essenceFrom(e, e._depth ?? 1));
    this.sendToLocation(loc.key, { t: 'fx', kind: 'pop', x: e.x, z: e.z, variant: e.variant });
    this.sendToLocation(loc.key, { t: 'fx', kind: 'nova', x: e.x, z: e.z });
    this.shareXp(loc, XP.boss * XP_MUL);
    const names = s.loot.map((id) => ITEMS[id].name).join(' or ');
    this.broadcast({ t: 'toast', big: true, text: `🏆 ${by?.name ?? 'The family'} and friends beat ${s.bossName}! Epic loot in town: ${names}!` });
    this.persist();
    this.broadcastWorld();
  },
};
