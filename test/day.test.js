// The day clock, nightfall, and sleeping in your own bed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './helpers.js';
import { DAY_SECONDS } from '../src/shared/config.js';

const runTo = (server, seconds) => { while (server.dayClock < seconds) server.step(0.25); };

test('day: warnings a minute and 30 seconds before night', () => {
  const { server, c } = world('warn');
  runTo(server, DAY_SECONDS - 61);
  c.a.clear();
  runTo(server, DAY_SECONDS - 59);
  assert.match(c.a.last('toast').text, /1 minute/);
  runTo(server, DAY_SECONDS - 29);
  assert.match(c.a.last('toast').text, /30 seconds/);
  assert.equal(c.a.all('fx').filter((f) => f.kind === 'nightWarning').length, 2);
});

test('day: at nightfall whoever is out faints and drops half their gold; the day ends for everyone', () => {
  const { server, save, c, p } = world('night', 'mom', 'kid');
  server.travel(p.kid, 'mine/1', 'U');
  p.kid.gold = 100; p.mom.gold = 100;
  p.mom.hp = 3;
  const day = save.day;
  runTo(server, DAY_SECONDS - 1);
  c.kid.clear();
  server.step(2);
  assert.equal(save.day, day + 1, 'a new day');
  assert.equal(c.kid.last('night').day, day + 1, 'the night screen says which day it is');
  assert.equal(p.kid.gold, 50, 'out after dark: half the gold is gone');
  assert.equal(p.mom.gold, 100, 'safe at home');
  assert.equal(p.kid.loc, 'house');
  assert.equal(p.mom.hp, p.mom.maxHp, 'a night’s sleep heals');
  assert.ok(server.dayClock < 5, 'the clock starts again');
});

test('day: everyone has their own bed, and the day ends once everybody is in bed', () => {
  const { server, save, c, p } = world('beds', 'mom', 'kid');
  const house = server.locations.get('house');
  const beds = [...house.entities.values()].filter((e) => e.type === 'furniture' && e.item === 'bed');
  assert.equal(beds.length, 2, 'a bed each');
  const bedOf = (id) => beds.find((b) => b.owner === id);
  assert.notDeepEqual([bedOf('mom').x, bedOf('mom').z], [bedOf('kid').x, bedOf('kid').z]);

  const day = save.day;
  const goToBed = (id) => { p[id].x = bedOf(id).x; p[id].z = bedOf(id).z + 2; c[id].say({ t: 'interact', id: bedOf(id).id }); };
  goToBed('kid');
  assert.ok(p.kid.sleeping);
  // the kid tries mom's bed too: not theirs
  c.kid.say({ t: 'interact', id: bedOf('mom').id });
  assert.equal(save.day, day, 'not everyone is asleep yet');
  // getting up (moving) wakes you
  c.kid.say({ t: 'move', epoch: p.kid.epoch, x: p.kid.x + 1, z: p.kid.z, rot: 0, anim: 'run' });
  assert.ok(!p.kid.sleeping);
  goToBed('kid');
  goToBed('mom');
  assert.equal(save.day, day + 1, 'everyone asleep: morning');
  assert.ok(!p.mom.sleeping && !p.kid.sleeping);
  assert.equal(c.mom.last('night').reason, 'sleep');
  // beds stay in the save for next time
  assert.deepEqual(Object.keys(save.house.beds).sort(), ['kid', 'mom']);
});

test('day: if the last person awake leaves, the sleepers get their morning', () => {
  const { server, save, c, p } = world('leave', 'mom', 'kid');
  const bed = [...server.locations.get('house').entities.values()].find((e) => e.item === 'bed' && e.owner === 'mom');
  p.mom.x = bed.x; p.mom.z = bed.z + 2;
  c.mom.say({ t: 'interact', id: bed.id });
  const day = save.day;
  server.dropConnection([...server.conns].find(([, x]) => x.playerId === 'kid')[0]);
  assert.equal(save.day, day + 1);
});
