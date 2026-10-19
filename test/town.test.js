// Pebble Town: townsfolk, the training yard, the Decorator and decorating the fort.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './helpers.js';
import { FURNITURE } from '../src/shared/furniture.js';
import { buildLayout } from '../src/shared/locations.js';
import { TOWNSFOLK } from '../src/shared/townsfolk.js';
import { blocked } from '../src/shared/physics.js';
import { PLAYER_RADIUS } from '../src/shared/config.js';

test('town: market stalls, the forge and the fountain benches are solid all the way across', () => {
  const L = buildLayout('town', 1, {});
  const shop = L.props.find((q) => q.type === 'shopkeeper'), forge = L.props.find((q) => q.type === 'forge');
  for (const [dx, dz] of [[2.1, 1.7], [-2.1, 1.7], [0, 1.3], [2.1, -0.9]]) { // the stall's poles and counter
    assert.ok(blocked(L, shop.x + dx, shop.z + dz, PLAYER_RADIUS, L.solids), `stall at ${dx},${dz}`);
  }
  assert.ok(blocked(L, forge.x - 2.2, forge.z + 0.2, PLAYER_RADIUS, L.solids), 'the forge’s furnace');
  const benches = L.props.filter((q) => q.type === 'bench');
  assert.equal(benches.length, 4);
  for (const b of benches) assert.ok(blocked(L, b.x, b.z, PLAYER_RADIUS, L.solids), 'a bench');
});

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

test('town: once the King Slime is beaten, townsfolk sometimes cheer the hero (never before)', () => {
  const { server, save, p, c } = world('hero');
  server.travel(p.a, 'town');
  const folk = propOf(server, 'townsfolk');
  standBy(p.a, folk);
  const heard = () => {
    const out = new Set();
    for (let i = 0; i < 200; i++) { c.a.say({ t: 'interact', id: folk.id }); out.add(c.a.last('ui').text); }
    return out;
  };
  const who = TOWNSFOLK[folk.folk % TOWNSFOLK.length];
  assert.ok(![...heard()].some((t) => who.heroLines.includes(t)), 'no hero talk before the King Slime is beaten');
  save.flags.mineCleared = true;
  const after = [...heard()];
  assert.ok(after.some((t) => who.heroLines.includes(t)), 'hero talk');
  assert.ok(after.some((t) => who.lines.includes(t)), 'still their usual chat too');
  for (const f of TOWNSFOLK) assert.ok(f.heroLines?.length >= 2, `${f.name} has something to say about it`);
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
  save.day = 2; // (not a sale day: full prices)
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
  const wallBefore = save.house.wall;
  c.mom.say({ t: 'buyHouseStyle', kind: 'wall', id: 'rose' });
  assert.ok(save.house.styles.includes('wall:rose'), 'bought for the family');
  assert.equal(save.house.wall, wallBefore, 'but not put up anywhere yet');

  // placing it in the fort (the kid can do it: furniture is the family's)
  server.travel(p.kid, 'house');
  const house = server.locations.get('house');
  const door = house.layout.portals.D.arrive;
  c.kid.say({ t: 'placeFurniture', item: 'sofa', x: door.x, z: door.z - 0.5, rot: 0 });
  assert.equal(save.house.furniture.length, 0, 'not blocking the door');
  const spot = { x: 6, z: 30 }; // the west end of the common room, clear of the furniture by the walls
  p.kid.x = spot.x + 4; p.kid.z = spot.z - 2;
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

test('decor: everyone has their own room — its owner styles it and nobody else furnishes it', () => {
  const { server, save, c, p } = world('rooms', 'mom', 'kid');
  save.day = 2; // (not a sale day: full prices)
  server.travel(p.mom, 'house');
  server.travel(p.kid, 'house');
  assert.equal(save.house.beds.mom, 0, 'mom claimed the first room');
  assert.equal(save.house.beds.kid, 1, 'kid the second');
  assert.deepEqual(save.house.roomStyles, {});

  p.kid.gold = 10000;
  save.flags.mineCleared = true; // the Decorator is open
  server.travel(p.kid, 'town');
  c.kid.say({ t: 'buyFurniture', item: 'stool' });
  assert.equal(save.house.owned.stool, 1);
  server.travel(p.kid, 'house');
  p.kid.x = 10; p.kid.z = 18; // in mom's doorway, in reach of her room
  c.kid.say({ t: 'placeFurniture', item: 'stool', x: 10, z: 13, rot: 0 });
  assert.equal(save.house.furniture.length, 0, 'mom’s room is mom’s');
  p.mom.x = 10; p.mom.z = 18;
  c.mom.say({ t: 'placeFurniture', item: 'stool', x: 10, z: 13, rot: 0 });
  assert.equal(save.house.furniture.length, 1, 'mom furnishes her own room');

  // styling: buy in town, then put it up yourself, only in the room you're standing in,
  // and only if it's your own room or the common room
  const at = (pl, x, z) => { pl.x = x; pl.z = z; };
  at(p.kid, 10, 46); // in the kid's own room (room 1, bottom left)
  c.kid.say({ t: 'roomStyle', kind: 'wall', id: 'stone', slot: 1 }); // 'stone' is the free one
  assert.equal(save.house.roomStyles[1]?.wall, 'stone');
  c.kid.say({ t: 'roomStyle', kind: 'wall', id: 'sky', slot: 1 });   // not bought yet
  assert.equal(save.house.roomStyles[1]?.wall, 'stone');
  c.kid.say({ t: 'roomStyle', kind: 'wall', id: 'stone', slot: 0 });
  assert.ok(!save.house.roomStyles[0], 'not from the kid’s room: only the room you stand in');
  at(p.kid, 10, 10); // in mom's room
  c.kid.say({ t: 'roomStyle', kind: 'wall', id: 'stone', slot: 0 });
  assert.ok(!save.house.roomStyles[0], 'kid cannot dress mom’s room');
  server.travel(p.kid, 'town');
  const before = p.kid.gold;
  c.kid.say({ t: 'buyHouseStyle', kind: 'wall', id: 'dusk' });
  assert.ok(save.house.styles.includes('wall:dusk'));
  assert.equal(p.kid.gold, before - 260);
  assert.equal(save.house.roomStyles[1]?.wall, 'stone', 'buying doesn’t put it up');
  server.travel(p.kid, 'house');
  at(p.kid, 10, 46);
  c.kid.say({ t: 'roomStyle', kind: 'wall', id: 'dusk', slot: 1 });
  assert.equal(save.house.roomStyles[1]?.wall, 'dusk', 'put up in the kid’s room');
  assert.notEqual(save.house.wall, 'dusk', 'only that room');
  assert.ok(!save.house.roomStyles[0], 'mom’s room untouched');
  at(p.kid, 20, 28); // the common room is everyone's
  c.kid.say({ t: 'roomStyle', kind: 'floor', id: 'oak', slot: -1 });
  c.kid.say({ t: 'roomStyle', kind: 'wall', id: 'dusk', slot: -1 });
  assert.equal(save.house.wall, 'dusk');
});

test('town: you can sit on a bench by the fountain (E), facing the fountain', () => {
  const { server, p, c } = world('bench');
  server.travel(p.a, 'town');
  const L = server.getLocation('town').layout;
  const bench = L.props.find((q) => q.type === 'bench'), fountain = L.props.find((q) => q.type === 'fountain');
  p.a.x = bench.x + Math.sin(bench.rot) * 1.3; p.a.z = bench.z + Math.cos(bench.rot) * 1.3; // in front of it
  c.a.say({ t: 'interact', id: bench.id });
  const fx = c.a.all('fx').find((m) => m.kind === 'sit');
  assert.ok(fx && fx.x === bench.x && fx.z === bench.z, 'sat down');
  const toFountain = Math.atan2(fountain.x - bench.x, fountain.z - bench.z);
  assert.ok(Math.abs(Math.atan2(Math.sin(fx.rot - toFountain), Math.cos(fx.rot - toFountain))) < 0.01, 'looking at the fountain');
});

test('pets: you can rename your pet', () => {
  const { server, p, c } = world('rename', 'a');
  server.travel(p.a, 'town');
  p.a.gold = 5000;
  c.a.say({ t: 'buyPet', species: 'hedgehog', name: 'Spiky' });
  const pet = p.a.pets.find((x) => x.species === 'hedgehog');
  c.a.say({ t: 'renamePet', id: pet.id, name: '  Pricklepuff!! ' });
  assert.equal(pet.name, 'Pricklepuff');
  assert.equal(c.a.last('self').pets.find((x) => x.id === pet.id).name, 'Pricklepuff');
  c.a.say({ t: 'renamePet', id: pet.id, name: '!!!' });
  assert.equal(pet.name, 'Pricklepuff', 'a name of nothing is ignored');
});

test('town: the whole gap in the training yard fence can be walked through, the fence itself can’t', () => {
  const L = buildLayout('town', 1, {});
  const gap = { x: 6 * 4 + 2, z: 18 * 4 + 2 }; // the opening in the yard's top fence
  for (const dx of [-3, -1.5, 0, 1.5, 3]) assert.ok(!blocked(L, gap.x + dx, gap.z, PLAYER_RADIUS, L.solids), `walkable at ${dx}`);
  assert.ok(blocked(L, 4 * 4 + 2, gap.z, PLAYER_RADIUS, L.solids), 'a fence rail still blocks');
  assert.ok(blocked(L, 2 * 4 + 2, 20 * 4 + 2, PLAYER_RADIUS, L.solids), 'the side fence too');
});

test('decor: press E on a decoration — the piano plays, the bath fills and empties, lamps go out', () => {
  const { server, save, c, p } = world('usedecor', 'mom');
  server.travel(p.mom, 'house');
  const loc = server.locations.get('house');
  const put = (item, x, z) => { const f = { id: item, item, room: -1, dx: x - 4, dz: z - 20, rot: 0 }; save.house.furniture.push(f); return server.spawnFurniture(loc, f); };
  const piano = put('piano', 12, 30), bath = put('bathtub', 30, 30), lamp = put('lamp', 30, 22);
  assert.equal(piano.interact, 'use');
  const use = (e) => { p.mom.x = e.x; p.mom.z = e.z + 2.4; c.mom.clear(); c.mom.say({ t: 'interact', id: e.id }); };
  use(piano);
  assert.ok(c.mom.all('fx').some((m) => m.kind === 'decor' && m.use === 'piano'), 'it plays');
  assert.equal(bath.on, false);
  use(bath);
  assert.equal(bath.on, true, 'the bath fills');
  use(bath);
  assert.equal(bath.on, false, 'and empties');
  assert.equal(lamp.on, true, 'lamps come lit');
  use(lamp);
  assert.equal(lamp.on, false);
});

test('the healing spring: 50 gold, a full heal and two minutes of luck (more gold from monsters)', async () => {
  const { SPRING_COST, LUCK_SECONDS, LUCK_GOLD } = await import('../src/shared/config.js');
  const { server, p, c } = world('luck', 'a');
  server.travel(p.a, 'town');
  const spring = propOf(server, 'spring');
  p.a.x = spring.x; p.a.z = spring.z + 1.5;
  p.a.gold = 100; p.a.hp = 3;
  c.a.say({ t: 'interact', id: spring.id });
  assert.equal(SPRING_COST, 50);
  assert.equal(p.a.gold, 50);
  assert.equal(p.a.hp, p.a.maxHp);
  assert.ok(p.a.luckUntil - server.time > LUCK_SECONDS - 1, 'two minutes of luck');
  assert.ok(c.a.last('self').luck > 100, 'the HUD hears about it');
  // lucky gold: a monster drops more
  server.travel(p.a, 'mine/1', 'U');
  const loc = server.locations.get('mine/1');
  const kill = () => {
    const e = loc.spawn({ type: 'slime', variant: 'green', x: p.a.x + 1, z: p.a.z, hp: 1, maxHp: 1, damage: 0, speed: 0, goldMul: 1 });
    server.hitSlime(p.a, loc, e, 99);
    return [...loc.entities.values()].filter((d) => d.type === 'drop' && d.item === 'gold').reduce((n, d) => { loc.remove(d.id); return n + d.qty; }, 0);
  };
  let lucky = 0, plain = 0;
  for (let i = 0; i < 200; i++) lucky += kill();
  p.a.luckUntil = 0;
  for (let i = 0; i < 200; i++) plain += kill();
  assert.ok(lucky > plain * (1 + (LUCK_GOLD - 1) / 2), `lucky gold ${lucky} vs ${plain}`);
});

test('town: a jetpack climbs over the market stalls instead of flying through their roofs', async () => {
  const { flyHeightAt } = await import('../src/shared/props.js');
  const { FLY_HEIGHT } = await import('../src/shared/config.js');
  const L = buildLayout('town', 1, {});
  const stalls = L.props.filter((p) => p.stall);
  assert.ok(stalls.length >= 3, 'the market has stalls');
  for (const p of stalls) {
    assert.ok(flyHeightAt(L.props, p.x, p.z + 0.4, FLY_HEIGHT) > 4.2, `over the ${p.interact} stall you clear its 3.8 roof`);
    assert.ok(flyHeightAt(L.props, p.x + 1.8, p.z + 2, FLY_HEIGHT) > 4.2, 'even near the corner of the roof');
  }
  const fountain = L.props.find((p) => p.build === 'fountain');
  assert.equal(flyHeightAt(L.props, fountain.x, fountain.z, FLY_HEIGHT), FLY_HEIGHT, 'out in the square you fly at the usual height');
});
