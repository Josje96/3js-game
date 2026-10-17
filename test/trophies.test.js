// Trophies: beat a dungeon and a stand by its gate in town gives everyone one trophy to put up at home.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './helpers.js';
import { DUNGEONS } from '../src/shared/dungeons.js';
import { FURNITURE } from '../src/shared/furniture.js';
import { blocked } from '../src/shared/physics.js';

const stands = (loc) => [...loc.entities.values()].filter((e) => e.trophyStand);

test('trophies: one for every dungeon, never sold', () => {
  for (const id of Object.keys(DUNGEONS)) {
    const t = Object.entries(FURNITURE).find(([, d]) => d.trophy === id);
    assert.ok(t, `${id} has a trophy`);
    assert.ok(t[1].notForSale && t[1].build, `${t[0]} is built, and never sold`);
  }
});

test('trophies: beat a dungeon, a stand appears by its gate; everyone takes exactly one', () => {
  const { server, save, p, c } = world('trophy', 'mom', 'kid');
  for (const q of Object.values(p)) server.travel(q, 'town');
  const town = server.getLocation('town');
  assert.equal(stands(town).length, 0, 'nothing before');
  server.completeDungeon('mine');
  const [stand] = stands(town);
  assert.ok(stand && stand.dungeon === 'mine', 'the Old Mine’s stand');
  assert.ok(!blocked(town.layout, stand.x, stand.z, 0.5), 'on open ground');
  const take = (who) => { p[who].x = stand.x; p[who].z = stand.z + 1.2; c[who].say({ t: 'interact', id: stand.id }); };
  take('mom');
  assert.equal(save.house.owned.minetrophy, 1);
  take('mom');
  assert.equal(save.house.owned.minetrophy, 1, 'only one each');
  take('kid');
  assert.equal(save.house.owned.minetrophy, 2, 'the kid gets one too');
  // the next time the town loads, the stand is still there (for anyone who hasn't taken theirs)
  server.completeDungeon('mine');
  assert.equal(stands(town).length, 1, 'never two stands');
});
