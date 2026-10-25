// town — Pebble Town's townsfolk (talk with E) and the training yard: a dummy that shows how hard
// you hit, and a practice goblin that can't hurt you, never leaves the yard and comes back when beaten.
// And the story's end (shared/story.js): once the Shadow Keep is done, Corvin lives by the fountain.
import { TOWNSFOLK, townsfolkLine } from '../../shared/townsfolk.js';
import { storyProgress } from '../../shared/story.js';
import { ENEMIES } from '../../shared/dungeons.js';
import { SEASONS, SEASON_DAYS, seasonOf, seasonBossFor, dayOfSeason, dateLabel } from '../../shared/seasons.js';

const RESPAWN = 3; // seconds before a beaten practice goblin pops back
/** Where Corvin stands (from the fountain) once he's home: the story's end. */
export const CORVIN_FROM_FOUNTAIN = { x: 1, z: 4 }; // (just south of it, clear of the benches, room in front to talk to him)
const CORVIN_LINES = [
  'I’m sorry. I’m so very sorry. I thought the town loved a stone more than me… but it was my own heart that had gone cold.',
  'My little brother still makes me laugh. Don’t tell him: his head is big enough already, with that top hat.',
  'Want to see a trick? *pulls a coin out of your ear* …I used to use magic for sad things. Now I only use it for silly ones.',
  'The Heartstone remembers everything good that happens in Pebble Town. Let’s give it lots to remember, shall we?',
  'Thank you for bringing me home, little heroes.',
];

export const interactions = {
  /** The notice board in the square: the date, and when the next seasonal boss is due. */
  notices(p) {
    const day = this.save.day, s = seasonOf(day), next = SEASONS[(SEASONS.indexOf(s) + 1) % SEASONS.length];
    const left = SEASON_DAYS - dayOfSeason(day) + 1;
    const boss = this.seasonBossToday?.() ? `${seasonBossFor(day).name} is in town TODAY, south-east of the market!` : `${seasonBossFor(day + left).name} comes with ${next.name.toLowerCase()}, in ${left} day${left === 1 ? '' : 's'}.`;
    this.send(p, { t: 'ui', kind: 'talk', name: 'Notice board', text: `📜 ${dateLabel(day)} — ${s.icon} ${s.name}. ${boss} Lost gold? The bank keeps it safe. Weapons dull? The Enchanter waits in the far corner…` });
  },
  talk(p, prop) {
    const who = TOWNSFOLK[prop.folk % TOWNSFOLK.length];
    if (!who) return;
    const text = townsfolkLine(who, { day: this.save.day, hero: !!this.save.flags.mineCleared, chapter: storyProgress(this.save).chapter }); // (the season, today's holiday or the story, often)
    this.send(p, { t: 'ui', kind: 'talk', name: who.name, text, x: prop.x, z: prop.z });
  },
  /** Corvin, once the Shadow King, home again. */
  corvin(p, npc) {
    this.send(p, { t: 'ui', kind: 'talk', name: 'Corvin', text: CORVIN_LINES[Math.floor(Math.random() * CORVIN_LINES.length)], x: npc.x, z: npc.z });
  },
};

/** The town was loaded: put the dummy and the practice goblin in the training yard. */
export function onLocation(loc) {
  if (loc.key !== 'town') return;
  this.syncStory(loc);
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
  /** The story's end: Corvin by the fountain once the Shadow Keep is done (shared/story.js). */
  syncStory(loc) {
    if (!storyProgress(this.save).ending || [...loc.entities.values()].some((e) => e.type === 'npc' && e.name === 'Corvin')) return;
    const fountain = loc.layout.props.find((q) => q.build === 'fountain');
    if (!fountain) return;
    loc.spawn({
      type: 'npc', name: 'Corvin', cls: 'Mage', x: fountain.x + CORVIN_FROM_FOUNTAIN.x, z: fountain.z + CORVIN_FROM_FOUNTAIN.z, rot: 0.2, r: 0.8,
      look: { hat: 'wizard', cape: 'none', clothes: 'wizard', hair: 'long', hairColor: 'white', beard: 'beard', brows: 'soft' },
      interact: 'corvin', prompt: 'Talk to Corvin',
    });
  },

  spawnPracticeSlime(loc) {
    const at = loc.layout.spots.trainingSlime, def = ENEMIES.practice;
    loc.spawn({
      type: 'slime', variant: 'practice', x: at.x, z: at.z, hp: def.hp, maxHp: def.hp, damage: 0, speed: def.speed,
      practice: true, _home: { x: at.x, z: at.z, r: 5 },
    });
  },

  /** The practice goblin was beaten: no loot, no XP, just a pop and it's back in a moment. */
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
