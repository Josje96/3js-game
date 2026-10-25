// The story (shared/story.js): pages found as bosses fall, a shard for every dungeon done, the townsfolk
// following along, and Corvin home by the fountain at the end.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './helpers.js';
import { STORY_PAGES, SHARD_DUNGEONS, storyProgress } from '../src/shared/story.js';
import { DUNGEONS } from '../src/shared/dungeons.js';
import { TOWNSFOLK, townsfolkLine } from '../src/shared/townsfolk.js';
import { blocked } from '../src/shared/physics.js';
import { PLAYER_RADIUS } from '../src/shared/config.js';

test('story: every page waits on a real boss or dungeon; pages and shards follow the family’s progress', () => {
  const bossFlags = new Set(Object.values(DUNGEONS).flatMap((d) => d.biomes.map((b) => b.boss.flag)));
  for (const page of STORY_PAGES) {
    if (page.flag) assert.ok(bossFlags.has(page.flag), `${page.id}: '${page.flag}' is a boss's flag`);
    if (page.done) assert.ok(DUNGEONS[page.done], `${page.id}: '${page.done}' is a dungeon`);
    assert.ok(page.title && page.text.length > 80, `${page.id} has something to read`);
  }
  for (const id of SHARD_DUNGEONS) assert.ok(DUNGEONS[id], `${id} holds a shard`);
  assert.deepEqual(storyProgress({}).pages.map((p) => p.id), ['legend'], 'a new world: just the legend');
  assert.equal(storyProgress({}).shards, 0);
  const mid = storyProgress({ flags: { mineCleared: true, lavaCleared: true }, dungeons: { mine: { completed: true } } });
  assert.deepEqual(mid.pages.map((p) => p.id), ['legend', 'goblin', 'tobias', 'shard1']);
  assert.equal(mid.chapter, 1);
  const end = storyProgress({ flags: {}, dungeons: { mine: { completed: true }, ruins: { completed: true }, keep: { completed: true } } });
  assert.ok(end.ending && end.shards === 3);
});

test('story: the townsfolk talk about how the story is going', () => {
  for (const who of TOWNSFOLK) {
    assert.equal(who.storyLines?.length, SHARD_DUNGEONS.length + 1, `${who.name}: a line for every chapter`);
    for (let chapter = 0; chapter <= SHARD_DUNGEONS.length; chapter++) {
      const said = new Set(Array.from({ length: 300 }, () => townsfolkLine(who, { day: 5, chapter })));
      assert.ok(who.storyLines[chapter].some((t) => said.has(t)), `${who.name} talks about chapter ${chapter}`);
      for (let other = 0; other <= SHARD_DUNGEONS.length; other++) if (other !== chapter) assert.ok(!who.storyLines[other].some((t) => said.has(t)), `${who.name}: chapter ${other}'s news isn't out yet / is old`);
    }
  }
});

test('story: Corvin comes home to the fountain once the Shadow Keep is done (and you can talk to him)', () => {
  const { server, save, p, c } = world('corvin', 'kid');
  server.travel(p.kid, 'town');
  const town = server.locations.get('town'), corvin = () => [...town.entities.values()].find((e) => e.type === 'npc' && e.name === 'Corvin');
  assert.ok(!corvin(), 'not before the end');
  for (const id of SHARD_DUNGEONS) { save.dungeons[id].unlocked = true; server.completeDungeon(id); }
  const him = corvin();
  assert.ok(him, 'home at the end');
  assert.ok(!blocked(town.layout, him.x, him.z, PLAYER_RADIUS, town.layout.solids), 'standing somewhere free');
  server.syncStory(town);
  assert.equal([...town.entities.values()].filter((e) => e.name === 'Corvin').length, 1, 'only one of him');
  p.kid.x = him.x; p.kid.z = him.z + 1.2;
  c.kid.say({ t: 'interact', id: him.id });
  assert.equal(c.kid.last('ui')?.name, 'Corvin');
});
