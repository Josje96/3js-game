// dungeons — part of the GameServer (see systems/index.js). Methods run with `this` = the GameServer.
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
    if (def.unlockFlag && !this.save.flags[def.unlockFlag]) {
      return this.toast(p, `The ${def.name} gate is sealed. Defeat the boss of the Old Mine to open it!`);
    }
    const stops = this.elevatorStops(dungeonId);
    if (stops.length === 1) return this.travel(p, dungeonKey(dungeonId, 1), 'U');
    this.send(p, { t: 'ui', kind: 'elevator', dungeon: dungeonId, name: def.name, floors: stops });
  },

  on_elevator(p, { dungeon, floor }) {
    if (!DUNGEONS[dungeon] || !this.elevatorStops(dungeon).includes(floor)) return;
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

  bossDefeated(loc, boss) {
    const { dungeonId, floor } = loc.layout;
    const def = DUNGEONS[dungeonId], biome = biomeFor(dungeonId, floor);
    const opensGate = biome.boss.flag === 'mineCleared' && !this.save.flags.mineCleared;
    this.save.flags[biome.boss.flag] = true;
    if (biome.boss.flag === def.clearFlag) this.save.flags[def.clearFlag] = true;
    for (let i = 0; i < 5; i++) this.dropItem(loc, boss, 'gold', Math.ceil(ENEMIES[boss.variant].gold[0] / 5));
    let news = `${boss.name} was defeated!`;
    if (opensGate) news += ' Something rumbles in town... a sealed gate has opened!';
    if (floor < def.floors) {
      // the way on to the next biome
      loc.ladderSpawned = true;
      loc.spawn({ type: 'ladder', x: boss.x, z: boss.z });
      news += ` A way down to ${biomeFor(dungeonId, floor + 1).name} opened!`;
    } else news += ' You reached the very bottom!';
    this.broadcast({ t: 'toast', text: news, big: true });
    this.broadcastWorld();
    this.persist();
  },
};
