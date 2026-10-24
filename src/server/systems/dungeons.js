// dungeons — entering (chained gates, the elevator), ladders, and bosses. Beating a dungeon's
// floor-100 boss completes it and breaks the chains on the next dungeon's gate in town.
import { ELEVATOR_STEP } from '../../shared/config.js';
import { DUNGEONS, ENEMIES, dungeonKey, biomeFor } from '../../shared/dungeons.js';

export const methods = {
  elevatorStops(dungeonId) {
    const deepest = this.save.dungeons[dungeonId].deepest;
    const stops = [1];
    for (let f = ELEVATOR_STEP; f <= deepest; f += ELEVATOR_STEP) stops.push(f);
    return stops;
  },

  enterDungeon(p, dungeonId) {
    const def = DUNGEONS[dungeonId];
    if (!this.save.dungeons[dungeonId]?.unlocked) {
      const before = DUNGEONS[def.unlockedBy];
      return this.toast(p, `The ${def.name} is chained shut. Beat all ${before.floors} floors of ${before.name} to break the chains!`);
    }
    const stops = this.elevatorStops(dungeonId);
    if (stops.length === 1) return this.travel(p, dungeonKey(dungeonId, 1), 'U');
    this.send(p, { t: 'ui', kind: 'elevator', dungeon: dungeonId, name: def.name, floors: stops });
  },

  on_elevator(p, { dungeon, floor }) {
    if (!DUNGEONS[dungeon] || !this.save.dungeons[dungeon]?.unlocked || !this.elevatorStops(dungeon).includes(floor)) return;
    const here = this.locations.get(p.loc);
    // must be standing at the entrance (in town)
    if (here?.key !== 'town') return;
    this.travel(p, dungeonKey(dungeon, floor), 'U');
  },

  useLadder(p, loc) {
    const { dungeonId, floor } = loc.layout;
    if (floor >= DUNGEONS[dungeonId].floors) return;
    this.travel(p, dungeonKey(dungeonId, floor + 1), 'U');
  },

  maybeSpawnLadder(loc, at, force = false) {
    if (loc.ladderSpawned || loc.layout.kind !== 'dungeon' || loc.layout.isBoss) return;
    // Stardew-style: the fewer rocks left, the likelier the ladder.
    const left = loc.count('rock');
    const cleared = loc.initialRocks ? 1 - left / loc.initialRocks : 1;
    const p = 0.04 + 0.4 * cleared * cleared;
    if (!force && left > 0 && Math.random() > p) return;
    loc.ladderSpawned = true;
    loc.spawn({ type: 'ladder', x: at.x, z: at.z });
    this.sendToLocation(loc.key, { t: 'toast', text: 'A way down appeared!' });
  },

  /** The floor-100 boss fell: the dungeon is done, and the next one's chains break (once). */
  completeDungeon(dungeonId) {
    const state = this.save.dungeons[dungeonId];
    const first = !state.completed;
    state.completed = true;
    const town = this.locations.get('town');
    if (town) this.syncTrophies(town);
    if (first) this.broadcast({ t: 'toast', big: true, text: `🏆 A trophy for every hero waits by the ${DUNGEONS[dungeonId].name} in town — go and take yours!` });
    const next = DUNGEONS[dungeonId].next;
    if (!next || this.save.dungeons[next].unlocked) {
      if (first && !next) this.broadcast({ t: 'toast', text: 'You beat every dungeon in the land. The family are true heroes!', big: true });
      return;
    }
    this.save.dungeons[next].unlocked = true;
    this.save.dungeons[next].unlockedOnDay = this.save.day;
    // everyone sees the chains break the next time they're in town (the client remembers it saw it)
    this.broadcast({ t: 'toast', text: `CRACK! Far away in town, the chains on the ${DUNGEONS[next].name} gate shatter!`, big: true });
  },

  bossDefeated(loc, boss) {
    const { dungeonId, floor } = loc.layout;
    const def = DUNGEONS[dungeonId], biome = biomeFor(dungeonId, floor);
    const firstTime = !this.save.flags[biome.boss.flag];
    this.save.flags[biome.boss.flag] = true;
    for (const q of this.lootSharers(loc, boss)) { // a pile of gold for each fighter
      this._lootFor = q?.id;
      for (let i = 0; i < 5; i++) this.dropGold(loc, boss, Math.ceil((ENEMIES[boss.variant].gold[0] * (boss.goldMul ?? 1)) / 5));
    }
    this._lootFor = null;
    let news = `${boss.name} was defeated!`;
    if (firstTime && biome.boss.flag === 'mineCleared') news += ' A new stall has opened in the town market — the Decorator!';
    if (floor < def.floors) {
      // the way on to the next biome
      loc.ladderSpawned = true;
      loc.spawn({ type: 'ladder', x: boss.x, z: boss.z });
      news += ` A way down to ${biomeFor(dungeonId, floor + 1).name} opened!`;
    } else {
      news += ` You conquered ${def.name}!`;
      this.completeDungeon(dungeonId);
    }
    this.broadcast({ t: 'toast', text: news, big: true });
    this.broadcastWorld();
    this.persist();
  },
};
