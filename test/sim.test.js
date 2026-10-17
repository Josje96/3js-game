// Headless tests for the shared world code and the host server. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLayout, isWalkableChar } from '../src/shared/locations.js';
import { generateFloor } from '../src/shared/mapgen.js';
import { DUNGEONS, dungeonKey } from '../src/shared/dungeons.js';
import { MAPS } from '../src/shared/maps.js';
import { CELL, PROTOCOL_VERSION } from '../src/shared/config.js';
import { blocked } from '../src/shared/physics.js';
import { GameServer } from '../src/server/GameServer.js';
import { newSave } from '../src/server/saves.js';
import { FORGE_RECIPES } from '../src/shared/items.js';

function floodFill(layout, start) {
  const seen = new Set([`${start[0]},${start[1]}`]);
  const stack = [start];
  while (stack.length) {
    const [x, z] = stack.pop();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${z + dz}`;
      if (!seen.has(k) && !layout.isSolidCell(x + dx, z + dz)) { seen.add(k); stack.push([x + dx, z + dz]); }
    }
  }
  return seen;
}

function assertPortalsUnambiguous(layout) {
  for (const p of Object.values(layout.portals)) {
    const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => !layout.isSolidCell(p.cx + dx, p.cz + dz));
    assert.equal(open.length, 1, `portal ${p.id} in ${layout.key}@${layout.seed} touches ${open.length} walkable cells`);
  }
}

function walkableCount(layout) {
  return layout.rows.join('').split('').filter(isWalkableChar).length;
}

test('hand-made maps are rectangular and fully connected', () => {
  for (const key of Object.keys(MAPS)) {
    const map = MAPS[key];
    for (const row of map.rows) assert.equal(row.length, map.rows[0].length, `${key} row width`);
    const layout = buildLayout(key, 1);
    const start = [Math.floor(layout.spawn.x / CELL), Math.floor(layout.spawn.z / CELL)];
    assert.equal(floodFill(layout, start).size, walkableCount(layout), `${key} has unreachable floor`);
    assert.ok(!blocked(layout, layout.spawn.x, layout.spawn.z, 0.6, layout.solids), `${key} spawn blocked`);
    assertPortalsUnambiguous(layout);
  }
});

test('dungeon floors are deterministic, connected, and have a way up', () => {
  for (const id of Object.keys(DUNGEONS)) {
    for (let floor = 1; floor <= DUNGEONS[id].floors; floor++) {
      for (let seed = 1; seed <= (floor <= 20 ? 60 : 6); seed++) {
        const key = dungeonKey(id, floor);
        const a = buildLayout(key, seed), b = buildLayout(key, seed);
        assert.deepEqual(a.rows, b.rows, 'same seed, same floor');
        assert.deepEqual(a.initial, b.initial);
        const start = [Math.floor(a.spawn.x / CELL), Math.floor(a.spawn.z / CELL)];
        assert.equal(floodFill(a, start).size, walkableCount(a), `${key}@${seed} has unreachable floor`);
        assert.ok(a.portals.U, 'has up stairs');
        assertPortalsUnambiguous(a);
        assert.ok(!blocked(a, a.spawn.x, a.spawn.z, 0.6, a.solids), `${key}@${seed} spawn blocked`);
        if (floor % 10 === 0) assert.ok(a.initial.some((e) => e.boss), 'every 10th floor has a boss');
        else assert.ok(!a.initial.some((e) => e.boss), 'no bosses on normal floors');
      }
    }
  }
  assert.notDeepEqual(buildLayout('mine/3', 1).rows, buildLayout('mine/3', 2).rows, 'different seeds differ');
});

test('mapgen: rooms have personalities — most floors hide an outcrop in a room', () => {
  let withOutcrops = 0, total = 0;
  for (let floor = 1; floor <= 100; floor += 7) {
    for (let seed = 1; seed <= 40; seed++) {
      const f = generateFloor('mine', floor, seed);
      total++;
      const enclosed = (z, x) => f.rows[z][x] === '#' && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => f.rows[z + dz][x + dx] !== '#');
      if (Array.from({ length: f.h - 2 }, (_, i) => i + 1).some((z) => Array.from({ length: f.w - 2 }, (_, i) => i + 1).some((x) => enclosed(z, x)))) withOutcrops++;
    }
  }
  assert.ok(withOutcrops > total * 0.4, `only ${withOutcrops}/${total} floors have an interior outcrop — the room personalities are gone?`);
});

// --- server ---------------------------------------------------------------

function fakeClient(server, hello) {
  const inbox = [];
  let handler;
  const conn = { send: (m) => inbox.push(m), onMessage: (cb) => { handler = cb; }, onClose: () => {} };
  server.addConnection(conn);
  const c = {
    inbox,
    say: (msg) => handler(msg),
    last: (t) => inbox.filter((m) => m.t === t).at(-1),
    clear: () => { inbox.length = 0; },
  };
  c.say({ t: 'hello', protocol: PROTOCOL_VERSION, ...hello });
  return c;
}

function walkTo(server, client, id, x, z) {
  server.time += 2; // a real walk takes a while (and arrivals ignore exits for a moment)
  client.say({ t: 'move', x, z, rot: 0, anim: 'run', epoch: server.players.get(id).epoch });
  return server.players.get(id);
}

test('server: join, travel through portals, mine down, buy and sell', () => {
  const save = newSave({ name: 'Test', seed: 'test-seed' });
  const server = new GameServer({ save, log: () => {} });
  const mom = fakeClient(server, { playerId: 'mom', name: 'Mom', cls: 'Knight' });

  assert.equal(mom.last('welcome').you, 'mom');
  assert.equal(mom.last('enter').key, 'house');
  const p = server.players.get('mom');

  // walk out of the house door -> town
  const house = server.locations.get('house').layout;
  walkTo(server, mom, 'mom', house.portals.D.x, house.portals.D.z);
  assert.equal(p.loc, 'town');

  // walk into the mine entrance -> mine floor 1 (no elevator stops yet)
  const town = server.locations.get('town').layout;
  walkTo(server, mom, 'mom', town.portals.m.x, town.portals.m.z);
  assert.equal(p.loc, 'mine/1');
  assert.equal(save.dungeons.mine.deepest, 1);

  // the sealed gate refuses us
  walkTo(server, mom, 'mom', town.portals.g.x, town.portals.g.z);

  // smash every rock until a ladder shows up
  p.weapon = 'royalsword';
  const loc = server.locations.get('mine/1');
  for (const rock of [...loc.entities.values()].filter((e) => e.type === 'rock')) {
    p.x = rock.x; p.z = rock.z - 1.2; p.rot = 0;
    server.time += 1;
    mom.say({ t: 'attack', rot: 0 });
    server.step(0.5); // let the swing land
  }
  const ladder = [...loc.entities.values()].find((e) => e.type === 'ladder');
  assert.ok(ladder, 'breaking every rock guarantees a ladder');
  assert.ok(loc.count('drop') > 0, 'rocks drop loot');

  // collect drops by ticking the sim while standing on them
  for (const d of [...loc.entities.values()].filter((e) => e.type === 'drop')) {
    p.x = d.x; p.z = d.z;
    server.step(0.05);
  }
  assert.ok(Object.keys(p.inventory).some((k) => k !== 'potion'), 'picked up ore');

  walkTo(server, mom, 'mom', ladder.x, ladder.z);
  assert.equal(p.loc, 'mine/2');
  assert.ok(!server.locations.has('mine/1'), 'empty floors are discarded');

  // back in town: sell everything, buy a potion (with your own gold)
  server.travel(p, 'town');
  const before = p.gold;
  for (const [item, qty] of Object.entries(p.inventory)) if (item !== 'potion') mom.say({ t: 'sell', item, qty });
  assert.ok(p.gold > before, 'selling earns gold');
  const potions = p.inventory.potion;
  p.gold += 100;
  mom.say({ t: 'buy', item: 'potion' });
  assert.equal(p.inventory.potion, potions + 1);
});

test('server: slimes hurt players, fainting sends you home, finishing the mine unchains the ruins', () => {
  const save = newSave({ name: 'Test', seed: 'boss-seed' });
  save.dungeons.mine.deepest = 10;
  const server = new GameServer({ save, log: () => {} });
  const kid = fakeClient(server, { playerId: 'kid', name: 'Kid', cls: 'Mage' });
  const p = server.players.get('kid');

  // elevator offers the checkpoints
  server.travel(p, 'town');
  const town = server.locations.get('town').layout;
  walkTo(server, kid, 'kid', town.portals.m.x, town.portals.m.z);
  assert.deepEqual(kid.last('ui').floors, [1, 5, 10]);
  kid.say({ t: 'elevator', dungeon: 'mine', floor: 10 });
  assert.equal(p.loc, 'mine/10');

  const loc = server.locations.get('mine/10');
  const boss = [...loc.entities.values()].find((e) => e.boss);
  // stand next to the boss and let it hit us until we faint
  p.hp = 3;
  for (let i = 0; i < 200 && p.loc === 'mine/10'; i++) { p.x = boss.x + 1; p.z = boss.z; server.step(0.05); }
  assert.equal(p.loc, 'house', 'fainted and woke up at home');
  assert.equal(p.hp, p.maxHp);

  // go back and beat it
  server.travel(p, 'mine/10', 'U');
  const loc2 = server.locations.get('mine/10');
  const boss2 = [...loc2.entities.values()].find((e) => e.boss);
  p.weapon = 'royalsword';
  for (let i = 0; i < 50 && loc2.entities.has(boss2.id); i++) {
    p.x = boss2.x; p.z = boss2.z - 2; p.hp = p.maxHp;
    server.time += 1;
    kid.say({ t: 'attack', rot: 0 });
    server.step(0.5);
  }
  assert.ok(!loc2.entities.has(boss2.id), 'boss died');
  assert.equal(save.flags.mineCleared, true);

  // the ruins stay chained until the whole mine (floor 100) is beaten
  server.travel(p, 'town');
  p.triggers.clear();
  walkTo(server, kid, 'kid', town.portals.g.x, town.portals.g.z);
  assert.equal(p.loc, 'town');
  assert.match(kid.last('toast').text, /chained/);
  server.travel(p, 'mine/100', 'U');
  const deep = server.locations.get('mine/100');
  const last = [...deep.entities.values()].find((e) => e.boss);
  last.hp = 1;
  server.hitSlime(p, deep, last, 5);
  assert.ok(save.dungeons.mine.completed);
  assert.ok(save.dungeons.ruins.unlocked, 'the chains break');
  assert.ok(!save.dungeons.keep.unlocked, 'but only on the next dungeon');
  server.travel(p, 'town');
  p.triggers.clear();
  walkTo(server, kid, 'kid', town.portals.g.x, town.portals.g.z);
  assert.equal(p.loc, 'ruins/1');
});

test('server: two players see each other only in the same location', () => {
  const save = newSave({ name: 'Test', seed: 's' });
  const server = new GameServer({ save, log: () => {} });
  const a = fakeClient(server, { playerId: 'a', name: 'A', cls: 'Knight' });
  const b = fakeClient(server, { playerId: 'b', name: 'B', cls: 'Rogue' });
  server.step(0.05);
  assert.equal(a.last('pos').players.length, 2);
  assert.equal(a.last('snap').players.length, 2, 'looks are sent the first time');
  a.clear();
  server.step(0.05);
  assert.equal(a.last('snap'), undefined, 'nothing changed: no reliable snapshot');
  assert.equal(a.last('pos').players.length, 2, 'positions every tick');
  server.travel(server.players.get('b'), 'town');
  a.clear(); b.clear();
  server.step(0.05);
  assert.equal(a.last('pos').players.length, 1);
  assert.equal(b.last('pos').players[0][0], 'b');
  // a new hat is sent to everyone nearby
  server.travel(server.players.get('b'), 'house');
  server.step(0.05);
  a.clear();
  server.players.get('b').look = { ...server.players.get('b').look, hat: 'none' };
  server.step(0.05);
  assert.equal(a.last('snap').players[0].id, 'b');
  // records survive a reconnect
  server.players.get('b').inventory.copper = 7;
  server.dropConnection(2);
  assert.equal(save.players.b.inventory.copper, 7);
});

test('server: stale moves from a previous location are ignored', () => {
  const save = newSave({ name: 'Test', seed: 'stale' });
  const server = new GameServer({ save, log: () => {} });
  const c = fakeClient(server, { playerId: 'x', name: 'X', cls: 'Knight' });
  const p = server.players.get('x');
  const house = server.locations.get('house').layout;
  const oldEpoch = p.epoch;
  walkTo(server, c, 'x', house.portals.D.x, house.portals.D.z);
  assert.equal(p.loc, 'town');
  const arrived = { x: p.x, z: p.z };
  // a move still in flight from the house arrives after the trip
  c.say({ t: 'move', x: 1, z: 1, rot: 0, anim: 'run', epoch: oldEpoch });
  assert.deepEqual({ x: p.x, z: p.z }, arrived);
  assert.equal(c.last('enter').epoch, p.epoch);
});

test('server: rejoining with the same id replaces the stale connection', () => {
  const save = newSave({ name: 'Test', seed: 'rejoin' });
  const server = new GameServer({ save, log: () => {} });
  const first = fakeClient(server, { playerId: 'kid', name: 'Kid', cls: 'Rogue' });
  server.players.get('kid').inventory.copper = 3;
  const second = fakeClient(server, { playerId: 'kid', name: 'Kid', cls: 'Rogue' });
  assert.equal(first.last('kicked')?.t, 'kicked');
  assert.equal(second.last('welcome').you, 'kid');
  assert.equal(server.players.size, 1);
  assert.equal(server.players.get('kid').inventory.copper, 3, 'progress carried over');
});

test('server: slimes spread out instead of stacking', () => {
  const save = newSave({ name: 'Test', seed: 'spread' });
  const server = new GameServer({ save, log: () => {} });
  fakeClient(server, { playerId: 'p', name: 'P', cls: 'Knight' });
  const p = server.players.get('p');
  server.travel(p, 'mine/1', 'U');
  const loc = server.locations.get('mine/1');
  const slimes = [...loc.entities.values()].filter((e) => e.type === 'slime');
  for (const s of slimes) { s.x = p.x; s.z = p.z; } // all stacked on the arrival spot (always open floor)
  for (let i = 0; i < 40; i++) { p.hp = p.maxHp; server.step(0.05); }
  const [a, b] = slimes;
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 0.8, 'two slimes are not on top of each other');
});

test('server: barrels show up in the mine and smash open', () => {
  // most floors have a few barrels, and they never sit on top of each other or the spawn
  let total = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const a = buildLayout(dungeonKey('mine', 4), seed);
    const barrels = a.initial.filter((e) => e.type === 'barrel');
    total += barrels.length;
    for (const b of barrels) assert.ok(!blocked(a, b.x, b.z, 0.5, []), 'barrel inside a wall');
  }
  assert.ok(total > 30, `only ${total} barrels in 30 floors`);

  const save = newSave({ name: 'Test', seed: 'barrels' });
  const server = new GameServer({ save, log: () => {} });
  const kid = fakeClient(server, { playerId: 'kid', name: 'Kid', cls: 'Rogue' });
  const p = server.players.get('kid');
  let loc = null;
  for (let floor = 1; floor <= 9 && !loc; floor++) {
    server.travel(p, dungeonKey('mine', floor), 'U');
    const here = server.locations.get(p.loc);
    if (here.count('barrel')) loc = here;
  }
  assert.ok(loc, 'found a floor with barrels');
  const barrel = [...loc.entities.values()].find((e) => e.type === 'barrel');
  for (let i = 0; i < 5 && loc.entities.has(barrel.id); i++) {
    p.x = barrel.x; p.z = barrel.z - 1.2;
    server.time += 1;
    kid.say({ t: 'attack', rot: 0 });
    server.step(0.5);
  }
  assert.ok(!loc.entities.has(barrel.id), 'barrel broke');
  assert.ok(kid.inbox.some((m) => m.t === 'fx' && m.kind === 'smash'), 'clients see it smash');
});

test('server: ranged weapons shoot projectiles that hit from afar and stop at walls', () => {
  const save = newSave({ name: 'Test', seed: 'pew' });
  const server = new GameServer({ save, log: () => {} });
  const mage = fakeClient(server, { playerId: 'mage', name: 'Mage', cls: 'Mage' });
  const p = server.players.get('mage');
  assert.equal(p.weapon, 'staff');
  server.travel(p, 'town');
  const loc = server.locations.get(p.loc);
  // the town square is open: a slime 8 units north (-z), well out of melee reach
  const { x, z } = loc.layout.spawn;
  p.x = x; p.z = z;
  const slime = loc.spawn({ type: 'slime', variant: 'green', x, z: z - 8, hp: 6, maxHp: 6, damage: 1, speed: 0 });
  server.time += 1;
  mage.say({ t: 'attack', rot: Math.PI });
  for (let i = 0; i < 20; i++) server.step(0.05);
  assert.ok(slime.hp < 6, 'the bolt hit the slime');
  assert.equal(loc.count('shot'), 0, 'the bolt is used up');

  // shooting at the town wall: the bolt disappears without hitting anything
  loc.remove(slime.id);
  server.time += 1;
  mage.say({ t: 'attack', rot: Math.PI });
  for (let i = 0; i < 30; i++) server.step(0.05);
  assert.equal(loc.count('shot'), 0, 'stopped by a wall or ran out of range');

  // existing Rangers get a bow when their save is upgraded
  const ranger = fakeClient(server, { playerId: 'r', name: 'R', cls: 'Ranger' });
  assert.ok(ranger.last('self').weapon === 'bow');
});

test('server: walking on after a ladder does not bounce you back up the stairs', () => {
  for (let seed = 0; seed < 40; seed++) {
    const server = new GameServer({ save: newSave({ name: 't', seed: `s${seed}` }), log: () => {} });
    const c = fakeClient(server, { playerId: 'a', name: 'A', cls: 'Knight' });
    const p = server.players.get('a');
    server.travel(p, dungeonKey('mine', 2), 'U');
    const U = server.locations.get(p.loc).layout.portals.U;
    // keep holding "towards the stairs" for a second, like you were when you hit the ladder
    for (let i = 0; i < 20; i++) {
      c.say({ t: 'move', x: p.x - U.dir[0] * 0.35, z: p.z - U.dir[1] * 0.35, rot: 0, anim: 'run', epoch: p.epoch });
      server.step(0.05);
    }
    assert.equal(p.loc, 'mine/2', `seed ${seed}: bounced back to ${p.loc}`);
    // ...but stepping off the stairs and back on still takes you up
    walkTo(server, c, 'a', U.arrive.x, U.arrive.z);
    walkTo(server, c, 'a', U.x, U.z);
    assert.equal(p.loc, 'town');
  }
});

test('server: a dodge roll makes you briefly untouchable', () => {
  const server = new GameServer({ save: newSave({ name: 't', seed: 'roll' }), log: () => {} });
  const c = fakeClient(server, { playerId: 'a', name: 'A', cls: 'Knight' });
  const p = server.players.get('a');
  server.time = 10;
  c.say({ t: 'roll' });
  server.damagePlayer(p, 5);
  assert.equal(p.hp, p.maxHp, 'no damage mid-roll');
  assert.ok(c.inbox.some((m) => m.kind === 'dodge'));
  server.time += 1;
  server.damagePlayer(p, 5);
  assert.equal(p.hp, p.maxHp - 5, 'hits land again after the roll');
  c.say({ t: 'roll' }); // spamming roll doesn't stack i-frames forever
  server.time += 0.1;
  c.say({ t: 'roll' });
  assert.ok(p.rollUntil < server.time + 0.3);
});

test('server: XP levels you up, skill points raise stats, found weapons go in the gear bag', async () => {
  const { xpToNext, maxHpFor, attackDamage } = await import('../src/shared/progression.js');
  const server = new GameServer({ save: newSave({ name: 't', seed: 'lvl' }), log: () => {} });
  const c = fakeClient(server, { playerId: 'a', name: 'A', cls: 'Mage' });
  const p = server.players.get('a');
  assert.deepEqual([p.level, p.points, p.stats.int, p.weapon], [1, 0, 3, 'staff'], 'class presets');
  p.hp = 3;
  server.addXp(p, xpToNext(1) + 1);
  assert.equal(p.level, 2);
  assert.equal(p.points, 2);
  assert.equal(p.hp, p.maxHp, 'level up heals');
  const hpBefore = p.maxHp;
  c.say({ t: 'spend', stat: 'vit' });
  assert.equal(p.maxHp, hpBefore + 3);
  assert.equal(p.maxHp, maxHpFor(2, p.stats));
  c.say({ t: 'spend', stat: 'str' });
  c.say({ t: 'spend', stat: 'str' }); // no points left
  assert.equal(p.points, 0);
  assert.equal(p.stats.str, 1);

  // anyone can use any weapon: a Mage picking up a great sword
  server.gainGear(p, 'greatsword');
  assert.ok(p.gear.includes('greatsword'));
  assert.equal(p.weapon, 'greatsword', 'stronger finds are equipped');
  c.say({ t: 'equip', item: 'staff' });
  assert.equal(p.weapon, 'staff');
  c.say({ t: 'equip', item: 'royalsword' }); // not owned
  assert.equal(p.weapon, 'staff');
  const gold = p.gold;
  server.gainGear(p, 'greatsword'); // duplicate -> gold
  assert.ok(p.gold > gold);
  assert.equal(p.gear.filter((g) => g === 'greatsword').length, 1);
  assert.equal(attackDamage('staff', p.stats), 2 + 1, 'magic stat boosts the staff');

  // saved and restored
  server.persist();
  const rec = server.save.players.a;
  assert.equal(rec.level, 2);
  assert.deepEqual(rec.gear, p.gear);
});

test('server: blueprints from chests teach recipes; the forge turns ore into weapons', () => {
  const server = new GameServer({ save: newSave({ name: 't', seed: 'forge' }), log: () => {} });
  server.save.day = 2; // (not a sale day: full prices)
  const c = fakeClient(server, { playerId: 'a', name: 'A', cls: 'Knight' });
  const p = server.players.get('a');
  server.travel(p, dungeonKey('mine', 1), 'U');
  const loc = server.locations.get(p.loc);
  server.dropBlueprint(loc, { x: p.x, z: p.z });
  server.step(0.05); // standing on it picks it up
  assert.deepEqual(p.blueprints, ['copperblade'], 'floor 1 only has the copper blade recipe');

  server.travel(p, 'town');
  c.say({ t: 'forge', recipe: 'copperblade' });
  assert.ok(!p.gear.includes('copperblade'), 'no ore yet');
  p.inventory.copper = 7; p.inventory.stone = 4;
  p.gold = 100;
  c.say({ t: 'forge', recipe: 'copperblade' });
  assert.ok(p.gear.includes('copperblade'));
  assert.equal(p.weapon, 'copperblade', 'stronger than the starter sword, so equipped');
  assert.deepEqual(p.inventory, { potion: 2, copper: 1 });
  assert.equal(p.gold, 52);
  c.say({ t: 'forge', recipe: 'dragonsword' }); // blueprint not found
  assert.ok(!p.gear.includes('dragonsword'));
});

test('server: the deep ores forge into the late gear', () => {
  const server = new GameServer({ save: newSave({ name: 't', seed: 'deepforge' }), log: () => {} });
  server.save.day = 2; // (not a sale day: full prices)
  const c = fakeClient(server, { playerId: 'a', name: 'A', cls: 'Knight' });
  const p = server.players.get('a');
  for (const recipe of ['mythrilbrand', 'starcleaver']) {
    server.travel(p, 'town');
    p.blueprints.push(recipe);
    c.say({ t: 'forge', recipe });
    assert.ok(!p.gear.includes(recipe), 'no ore yet');
    const r = FORGE_RECIPES[recipe];
    for (const [item, n] of Object.entries(r.needs)) p.inventory[item] = n;
    p.gold = r.gold;
    c.say({ t: 'forge', recipe });
    assert.ok(p.gear.includes(recipe), recipe);
    assert.equal(p.gold, 0, 'materials were free, the gold was not');
    for (const item of Object.keys(r.needs)) assert.ok((p.inventory[item] ?? 0) === 0, `used up the ${item}`);
    p.gear = []; // the next recipe must forge too
  }
});

test('server: biomes every 10 floors, bosses open the way down, imps throw fireballs', async () => {
  const { ENEMIES, biomeFor } = await import('../src/shared/dungeons.js');
  assert.equal(DUNGEONS.mine.floors, 100);
  assert.equal(buildLayout(dungeonKey('mine', 15), 1).title, 'Frost Caverns — Floor 15');
  const frost = new Set(biomeFor('mine', 15).enemies(15));
  for (const e of buildLayout(dungeonKey('mine', 15), 3).initial) if (e.type === 'slime') assert.ok(frost.has(e.variant), e.variant);

  const server = new GameServer({ save: newSave({ name: 't', seed: 'deep' }), log: () => {} });
  const c = fakeClient(server, { playerId: 'a', name: 'A', cls: 'Knight' });
  const p = server.players.get('a');
  server.travel(p, dungeonKey('mine', 20), 'U');
  const loc = server.locations.get(p.loc);
  const boss = [...loc.entities.values()].find((e) => e.boss);
  assert.equal(boss.variant, 'frostgiant');
  boss.hp = 1;
  server.hitSlime(p, loc, boss, 5);
  assert.ok(server.save.flags.frostCleared);
  assert.ok([...loc.entities.values()].some((e) => e.type === 'ladder'), 'ladder to the grotto');
  assert.ok(c.inbox.some((m) => m.t === 'toast' && /Mushroom Grotto/.test(m.text)));

  // an imp a few steps away throws fire that hurts
  server.travel(p, dungeonKey('mine', 31), 'U');
  const lava = server.locations.get(p.loc);
  for (const e of [...lava.entities.values()]) lava.remove(e.id);
  const { x, z } = lava.layout.spawn;
  p.x = x; p.z = z; p.hp = p.maxHp;
  const imp = lava.spawn({ type: 'slime', variant: 'imp', x: x + 0.01, z: z - 1, hp: 60, maxHp: 60, damage: 8, speed: 0 });
  imp._shoot = 0;
  for (let i = 0; i < 20; i++) server.step(0.05);
  assert.ok(p.hp < p.maxHp, 'fireball hit');
  assert.equal(ENEMIES.imp.ai, 'shooter');
});

test('server: pets follow you, fight enemies, level up and evolve', async () => {
  const { petStage, petMaxHp, EVOLVE_AT } = await import('../src/shared/pets.js');
  const { migrate } = await import('../src/server/saves.js');
  const server = new GameServer({ save: newSave({ name: 't', seed: 'pets' }), log: () => {} });
  const c = fakeClient(server, { playerId: 'a', name: 'A', cls: 'Knight' });
  const p = server.players.get('a');
  c.say({ t: 'buyPet', species: 'maple', name: 'Rex' });
  assert.equal(p.pets[0].name, 'Maple', 'Maple is always Maple (and free)');
  c.say({ t: 'buyPet', species: 'dragon' });
  assert.equal(p.pets.length, 1, 'too expensive');

  server.travel(p, 'town');
  const loc = server.locations.get('town');
  const pet = [...loc.entities.values()].find((e) => e.type === 'pet');
  assert.ok(pet, 'the pet came along');
  const { x, z } = loc.layout.spawn;
  p.x = x; p.z = z;
  const slime = loc.spawn({ type: 'slime', variant: 'green', x: x + 2, z, hp: 12, maxHp: 12, damage: 0, speed: 0 });
  for (let i = 0; i < 400 && loc.entities.has(slime.id); i++) server.step(0.05);
  assert.ok(!loc.entities.has(slime.id), 'Maple beat the slime');
  assert.ok(p.pets[0].level > 1 || p.pets[0].xp > 0, 'and got XP');

  // grind to evolution
  server.petXp(p, pet, 5000);
  assert.ok(p.pets[0].level >= EVOLVE_AT[1]);
  assert.equal(petStage(p.pets[0].level), 2);
  assert.ok(c.inbox.some((m) => m.t === 'toast' && /evolving/.test(m.text)));
  // pets keep growing all the way to level 100, then stop
  server.petXp(p, pet, 1e6);
  assert.equal(p.pets[0].level, 100);
  assert.equal(pet.maxHp, petMaxHp('maple', 100));
  server.petXp(p, pet, 1e6);
  assert.equal(p.pets[0].level, 100, 'and no further');

  // leaving: the pet goes with you
  server.travel(p, 'house');
  assert.ok(![...loc.entities.values()].some((e) => e.type === 'pet'));
  assert.ok([...server.locations.get('house').entities.values()].some((e) => e.type === 'pet'));
  c.say({ t: 'pickPet', id: null });
  assert.ok(![...server.locations.get('house').entities.values()].some((e) => e.type === 'pet'), 'napping at home');

  // old saves: pets were plain species names
  const old = newSave({ name: 'o', seed: 'o' });
  old.players.x = { name: 'X', cls: 'Mage', hp: 10, weapon: 'staff', inventory: {}, pets: ['frog', 'cat'], pet: 'cat' };
  const up = migrate(old).players.x;
  assert.equal(up.pets.length, 2);
  assert.equal(up.pets.find((q) => q.id === up.pet).species, 'cat');
});

test('server: pets have health, faint, and are revived at the Pet Keeper for gold', async () => {
  const { petMaxHp, reviveCost, petTier, TIER_LOOKS, PET_MAX_LEVEL } = await import('../src/shared/pets.js');
  const server = new GameServer({ save: newSave({ name: 't', seed: 'faint' }), log: () => {} });
  const c = fakeClient(server, { playerId: 'a', name: 'A', cls: 'Knight' });
  const p = server.players.get('a');
  c.say({ t: 'buyPet', species: 'maple' });
  const pet = p.pets[0];
  assert.equal(pet.hp, petMaxHp('maple', 1));
  server.travel(p, dungeonKey('mine', 1), 'U');
  const loc = server.locations.get(p.loc);
  for (const e of [...loc.entities.values()]) if (e.type === 'slime') loc.remove(e.id);
  const ent = [...loc.entities.values()].find((e) => e.type === 'pet');
  // a slime right next to the pet (and far from the player) goes for the pet
  p.x = loc.layout.spawn.x; p.z = loc.layout.spawn.z;
  ent.x = p.x + 3; ent.z = p.z;
  const slime = loc.spawn({ type: 'slime', variant: 'red', x: ent.x + 0.9, z: ent.z, hp: 999, maxHp: 999, damage: 6, speed: 3 });
  for (let i = 0; i < 400 && !pet.fainted; i++) { server.step(0.05); ent.x = p.x + 3; ent.z = p.z; }
  assert.ok(pet.fainted, 'pet fainted');
  assert.ok(!loc.entities.has(ent.id), 'and went home');
  assert.equal(p.hp, p.maxHp, 'the slime went for the pet, not the player');
  loc.remove(slime.id);

  // can't take a fainted pet along, sleeping doesn't fix it, the Pet Keeper does
  c.say({ t: 'pickPet', id: pet.id });
  server.travel(p, 'house');
  assert.ok(![...server.locations.get('house').entities.values()].some((e) => e.type === 'pet'));
  server.travel(p, 'town');
  p.gold = 10;
  c.say({ t: 'revivePet', id: pet.id });
  assert.ok(pet.fainted, 'too poor');
  p.gold = 100;
  c.say({ t: 'revivePet', id: pet.id });
  assert.ok(!pet.fainted);
  assert.equal(p.gold, 100 - reviveCost(1));
  assert.equal(pet.hp, petMaxHp('maple', 1));
  assert.ok([...server.locations.get('town').entities.values()].some((e) => e.type === 'pet'), 'back at your side');

  // a new look every 5 levels
  assert.deepEqual([1, 4, 5, 9, 10, 15, 20, 50, 99, 100].map(petTier), [0, 0, 1, 1, 2, 3, 4, 10, 19, 20]);
  assert.equal(TIER_LOOKS.length - 1, PET_MAX_LEVEL / 5, 'a look for every 5 levels, all the way up');
});

test('server: the family chest moves items between your bag and the shared store', () => {
  const server = new GameServer({ save: newSave({ name: 't', seed: 'chest' }), log: () => {} });
  const c = fakeClient(server, { playerId: 'a', name: 'A', cls: 'Knight' });
  const p = server.players.get('a');
  server.travel(p, 'house');
  const loc = server.locations.get(p.loc);
  const chest = loc.layout.props.find((q) => q.interact === 'storage');
  assert.ok(chest, 'the fort has a chest');
  p.inventory.copper = 5;
  p.x = chest.x + 9; p.z = chest.z; // too far away to use it
  c.say({ t: 'stash', item: 'copper', qty: 5, dir: 'in' });
  assert.equal(p.inventory.copper, 5, 'nothing moves from across the room');
  p.x = chest.x; p.z = chest.z;
  c.say({ t: 'stash', item: 'copper', qty: 3, dir: 'in' });
  assert.deepEqual([p.inventory.copper, server.save.house.storage.copper], [2, 3]);
  c.say({ t: 'stash', item: 'copper', qty: 10, dir: 'out' });
  assert.deepEqual([p.inventory.copper, server.save.house.storage.copper], [5, undefined], 'take back all there is');
  c.say({ t: 'stash', item: 'gold', qty: 1, dir: 'in' });
  assert.equal(server.save.house.storage.gold, undefined, 'gold is not stashable');
});

test('server: pets can be fed a treat anywhere, to heal them', () => {
  const server = new GameServer({ save: newSave({ name: 't', seed: 'feed' }), log: () => {} });
  const c = fakeClient(server, { playerId: 'a', name: 'A', cls: 'Knight' });
  const p = server.players.get('a');
  c.say({ t: 'buyPet', species: 'maple' });
  const pet = p.pets[0];
  pet.hp = 5;
  c.say({ t: 'feedPet' });
  assert.equal(pet.hp, 5, 'no treat, no heal');
  p.inventory.petfood = 2;
  c.say({ t: 'feedPet' });
  assert.ok(pet.hp > 5, 'the treat healed the pet');
  assert.equal(p.inventory.petfood, 1);
  c.say({ t: 'use', item: 'petfood' });
  assert.equal(p.inventory.petfood, 1, 'a treat is not a potion');
});

test('server: the area spell hits every enemy around you, once a minute', () => {
  const server = new GameServer({ save: newSave({ name: 't', seed: 'nova' }), log: () => {} });
  const c = fakeClient(server, { playerId: 'a', name: 'A', cls: 'Knight' });
  const p = server.players.get('a');
  const loc = server.locations.get(p.loc);
  const { x, z } = loc.layout.spawn;
  p.x = x; p.z = z;
  const near = loc.spawn({ type: 'slime', variant: 'green', x: x + 2, z, hp: 50, maxHp: 50, damage: 0, speed: 0 });
  const far = loc.spawn({ type: 'slime', variant: 'green', x: x + 9, z, hp: 50, maxHp: 50, damage: 0, speed: 0 });
  server.time += 100;
  c.say({ t: 'spell' });
  assert.ok(near.hp < 50, 'the nearby slime was hit');
  assert.equal(far.hp, 50, 'the far slime was out of range');
  const after = near.hp;
  c.say({ t: 'spell' });
  assert.equal(near.hp, after, 'still on cooldown');
  server.time += 60;
  c.say({ t: 'spell' });
  assert.ok(near.hp < after, 'ready again after a minute');
});
