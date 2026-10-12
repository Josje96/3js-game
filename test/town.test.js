// Pebble Town: townsfolk, the training yard, the Decorator and decorating the fort.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './helpers.js';
import { FURNITURE } from '../src/shared/furniture.js';

const propOf = (server, type) => server.getLocation('town').layout.props.find((q) => q.type === type);
const standBy = (p, t) => { p.x = t.x; p.z = t.z + 2.4; };

test('town: townsfolk chat when you talk to them', () => {
  const { server, p, c } = world('folk');
  server.travel(p.a, 'town');
  const folk = propOf(server, 'townsfolk');
  standBy(p.a, folk);
  c.a.say({ t: 'interact', id: folk.id });
  const ui = c.a.last('ui');
  assert.equal(ui.kind, 'talk');
  assert.ok(ui.name && ui.text);
});

test('town: the practice slime never hurts you, stays in its yard, and comes back when beaten', () => {
  const { server, p } = world('yard');
  server.travel(p.a, 'town');
  const town = server.locations.get('town');
  const slime = [...town.entities.values()].find((e) => e.practice);
  const dummy = [...town.entities.values()].find((e) => e.type === 'dummy');
  assert.ok(slime && dummy);
  // stand right on it for a while: no damage
  const hp = p.a.hp;
  for (let i = 0; i < 100; i++) { p.a.x = slime.x; p.a.z = slime.z + 0.5; server.step(0.05); }
  assert.equal(p.a.hp, hp);
  // someone far away in town doesn't lure it out of the yard
  p.a.x = town.layout.spawn.x; p.a.z = town.layout.spawn.z;
  for (let i = 0; i < 200; i++) server.step(0.05);
  assert.ok(Math.hypot(slime.x - slime._home.x, slime.z - slime._home.z) < slime._home.r + 1.5, 'still in the yard');
  // beat it: no gold, no XP, and a new one pops up
  const xp = p.a.xp, gold = p.a.gold;
  server.hitSlime(p.a, town, slime, 9999);
  assert.ok(!town.entities.has(slime.id));
  for (let i = 0; i < 80; i++) server.step(0.05);
  assert.ok([...town.entities.values()].some((e) => e.practice), 'back again');
  assert.equal(p.a.xp, xp);
  assert.equal(p.a.gold, gold);
  // the dummy takes hits forever
  server.hitEntity(p.a, town, dummy, 50);
  assert.ok(town.entities.has(dummy.id));
  assert.equal(dummy.hits, 1);
});

test('town: the Decorator opens after the King Slime; furniture is bought, placed and picked up', () => {
  const { server, save, p, c } = world('decor', 'mom', 'kid');
  server.travel(p.mom, 'town');
  const deco = propOf(server, 'decorator');
  standBy(p.mom, deco);
  c.mom.clear();
  c.mom.say({ t: 'interact', id: deco.id });
  assert.equal(c.mom.last('ui'), undefined, 'not here yet');
  save.flags.mineCleared = true;
  c.mom.say({ t: 'interact', id: deco.id });
  assert.equal(c.mom.last('ui').kind, 'decorator');

  p.mom.gold = 1000;
  c.mom.say({ t: 'buyFurniture', item: 'sofa' });
  assert.equal(save.house.owned.sofa, 1);
  assert.equal(p.mom.gold, 1000 - FURNITURE.sofa.price);
  c.mom.say({ t: 'buyFurniture', item: 'bed' });
  assert.equal(save.house.owned.bed, undefined, 'beds are not for sale');
  c.mom.say({ t: 'houseStyle', kind: 'wall', id: 'rose' });
  assert.equal(save.house.wall, 'rose');

  // placing it in the fort (the kid can do it: furniture is the family's)
  server.travel(p.kid, 'house');
  const house = server.locations.get('house');
  const door = house.layout.portals.D.arrive;
  c.kid.say({ t: 'placeFurniture', item: 'sofa', x: door.x, z: door.z - 0.5, rot: 0 });
  assert.equal(save.house.furniture.length, 0, 'not blocking the door');
  const spot = { x: house.layout.spawn.x + 8, z: house.layout.spawn.z - 6 };
  p.kid.x = spot.x; p.kid.z = spot.z + 3;
  c.kid.say({ t: 'placeFurniture', item: 'sofa', x: spot.x, z: spot.z, rot: Math.PI });
  assert.equal(save.house.furniture.length, 1);
  assert.equal(save.house.owned.sofa, undefined);
  const sofa = [...house.entities.values()].find((e) => e.item === 'sofa');
  assert.ok(sofa);
  // it's still there after everyone leaves and the fort loads again
  for (const x of Object.values(p)) server.travel(x, 'town');
  server.locations.delete('house');
  server.travel(p.kid, 'house');
  const again = [...server.locations.get('house').entities.values()].find((e) => e.item === 'sofa');
  assert.ok(again);
  p.kid.x = again.x; p.kid.z = again.z + 2;
  c.kid.say({ t: 'pickUpFurniture', id: again.id });
  assert.equal(save.house.furniture.length, 0);
  assert.equal(save.house.owned.sofa, 1);
});
