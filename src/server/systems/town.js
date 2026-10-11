// town — Pebble Town's townsfolk (talk with E) and the training yard: a dummy that shows how hard
// you hit, and a practice slime that can't hurt you, never leaves the yard and comes back when beaten.
import { TOWNSFOLK } from '../../shared/townsfolk.js';
import { ENEMIES } from '../../shared/dungeons.js';

const RESPAWN = 3; // seconds before a beaten practice slime pops back

export const interactions = {
  talk(p, prop) {
    const who = TOWNSFOLK[prop.folk % TOWNSFOLK.length];
    if (!who) return;
    const text = who.lines[Math.floor(Math.random() * who.lines.length)];
    this.send(p, { t: 'ui', kind: 'talk', name: who.name, text, x: prop.x, z: prop.z });
  },
};

/** The town was loaded: put the dummy and the practice slime in the training yard. */
export function onLocation(loc) {
  if (loc.key !== 'town') return;
  const { dummy, trainingSlime } = loc.layout.spots ?? {};
  if (dummy) loc.spawn({ type: 'dummy', x: dummy.x, z: dummy.z, rot: 0, r: 0.6, hits: 0 });
  if (trainingSlime) this.spawnPracticeSlime(loc);
}

export function tick() {
  const loc = this.locations.get('town');
  if (loc?._practiceAt != null && this.time >= loc._practiceAt) {
    loc._practiceAt = null;
    this.spawnPracticeSlime(loc);
  }
}

export const methods = {
  spawnPracticeSlime(loc) {
    const at = loc.layout.spots.trainingSlime, def = ENEMIES.practice;
    loc.spawn({
      type: 'slime', variant: 'practice', x: at.x, z: at.z, hp: def.hp, maxHp: def.hp, damage: 0, speed: def.speed,
      practice: true, _home: { x: at.x, z: at.z, r: 5 },
    });
  },

  /** The practice slime was beaten: no loot, no XP, just a pop and it's back in a moment. */
  practiceSlimeBeaten(loc) {
    loc._practiceAt = this.time + RESPAWN;
  },

  /** Hitting the training dummy: it wobbles and shows the damage, and never falls over. */
  hitDummy(p, loc, e, dmg) {
    e.hits++;
    e._dirty = true;
    this.sendToLocation(loc.key, { t: 'fx', kind: 'dmg', id: e.id, x: e.x, z: e.z, amount: dmg });
  },
};
