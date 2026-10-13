// The Family Fort is drawn for the family's size: a square, a common hall, a room per member.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { world, fakeClient } from './helpers.js';
import { fortMap, fortWidth, fortDepth, fortColumns, MAX_ROOMS } from '../src/shared/fort.js';
import { buildLayout, roomIndexAt } from '../src/shared/locations.js';
import { migrate } from '../src/server/saves.js';
import { GameServer } from '../src/server/GameServer.js';

test('fort: a row of rooms on top (one room and bed each), the door bottom middle, every room reachable', () => {
  for (let n = 1; n <= MAX_ROOMS; n++) {
    const map = fortMap(n);
    const W = fortWidth(fortColumns(n)), H = fortDepth(fortColumns(n));
    assert.equal(map.rows.length, H);
    for (const row of map.rows) assert.equal(row.length, W);
    if (n <= 4) assert.ok(W <= 11 && H <= 14, `${n}: snug (${W}x${H})`);
    // nothing solid in a bedroom's doorway or the two cells in front of it (the chest once stood there)
    map.rooms.forEach((r, slot) => {
      for (const z of [r.door.z, r.door.z + r.door.out]) { // the doorway, and the cell you step out onto
        assert.ok('.p'.includes(map.rows[z][r.door.x]), `${n}: room ${slot}'s doorway is clear at ${r.door.x},${z} ('${map.rows[z][r.door.x]}')`);
      }
      assert.ok(r.w >= 3 && r.h >= 3, `${n}: rooms are roomy (${r.w}x${r.h})`);
    });
    assert.equal(map.rows[H - 1].indexOf('D'), Math.floor(W / 2), `${n}: door in the middle of the bottom wall`);
    const L = buildLayout('house', 1, { rooms: n });
    assert.equal(L.rooms.length, n, `${n}: rooms`);
    assert.equal(L.bedSlots.filter(Boolean).length, n, `${n}: beds`);
    L.bedSlots.forEach((b, slot) => assert.equal(b.room, slot, `${n}: bed ${slot} is in room ${slot}`));
    // walk from the spawn: every room and the door must be reachable
    const seen = new Set(), todo = [[Math.floor(L.spawn.x / 4), Math.floor(L.spawn.z / 4)]];
    while (todo.length) {
      const [x, z] = todo.pop(), k = `${x},${z}`;
      if (seen.has(k) || L.isSolidCell(x, z)) continue;
      seen.add(k);
      todo.push([x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]);
    }
    for (const r of L.rooms) assert.ok(seen.has(`${r.x},${r.z}`), `${n}: room at ${r.x},${r.z} is reachable`);
    const D = L.portals.D;
    assert.ok(seen.has(`${D.cx + D.dir[0]},${D.cz + D.dir[1]}`), `${n}: the door is reachable`);
  }
});

test('fort: someone new moves in and the fort grows a room, with everyone and the furniture kept', () => {
  const { server, save, c, p } = world('grow', 'mom');
  assert.equal(server.getLocation('house').layout.rooms.length, 1);
  save.flags.mineCleared = true;
  save.house.owned.stool = 1;
  p.mom.x = 10; p.mom.z = 11;
  c.mom.say({ t: 'placeFurniture', item: 'stool', x: 10, z: 9, rot: 0 }); // in mom's room
  assert.equal(save.house.furniture.length, 1);
  assert.equal(save.house.furniture[0].room, 0);

  fakeClient(server, { playerId: 'kid', name: 'kid', cls: 'Knight' });
  const house = server.locations.get('house');
  assert.equal(house.layout.rooms.length, 2, 'a room for the kid');
  assert.equal(save.house.beds.kid, 1);
  assert.equal(c.mom.last('enter').opts.rooms, 2, 'mom sees the new fort');
  const stool = [...house.entities.values()].find((e) => e.item === 'stool');
  assert.ok(stool && roomIndexAt(house.layout, Math.floor(stool.x / 4), Math.floor(stool.z / 4)) === 0, 'still in mom’s room');
  const beds = [...house.entities.values()].filter((e) => e.item === 'bed');
  assert.equal(beds.length, 2);
});

test('fort: furniture from the old fixed fort is kept (or handed back if it no longer fits)', () => {
  const save = migrate(JSON.parse(readFileSync(new URL('./fixtures/save-v9.json', import.meta.url))));
  const f = save.house.furniture[0];
  const ownedBefore = save.house.owned.sofa ?? 0;
  assert.equal(f.x, undefined);
  assert.equal(f.room, -1, 'the sofa was in the hall');
  const server = new GameServer({ save, log: () => {} });
  const house = server.getLocation('house');
  const sofas = [...house.entities.values()].filter((e) => e.item === 'sofa').length + (save.house.owned.sofa ?? 0);
  assert.equal(sofas, ownedBefore + 1, 'placed or back in the owned pile, never lost');
});

test('fort: chairs, stools and sofas can be sat on', () => {
  const { server, save, c, p } = world('sit', 'mom');
  save.flags.mineCleared = true;
  save.house.owned.chair = 1;
  p.mom.x = 10; p.mom.z = 25;
  c.mom.say({ t: 'placeFurniture', item: 'chair', x: 10, z: 22, rot: 0 });
  const chair = [...server.locations.get('house').entities.values()].find((e) => e.item === 'chair');
  assert.equal(chair.interact, 'sit');
  p.mom.z = 23.5;
  c.mom.say({ t: 'interact', id: chair.id });
  const fx = c.mom.all('fx').find((m) => m.kind === 'sit');
  assert.ok(fx && fx.x === chair.x && fx.z === chair.z, 'sat down on it');
});

test('fort: the feast table asks to buy food (10 gold), then you sit and it heals half your health; nobody walks through it', async () => {
  const { blocked } = await import('../src/shared/physics.js');
  const { PLAYER_RADIUS, FEAST_COST } = await import('../src/shared/config.js');
  const { server, p, c } = world('feast', 'mom');
  server.travel(p.mom, 'house');
  const L = server.getLocation('house').layout;
  const table = L.props.find((q) => q.interact === 'feast');
  assert.ok(table, 'the common room has a feast table');
  for (const dx of [-6.5, -3, 0, 3, 6.5]) for (const dz of [-1.75, 0, 1.75]) assert.ok(blocked(L, table.x + dx, table.z + dz, PLAYER_RADIUS, L.solids), `solid at ${dx},${dz}`);
  p.mom.x = table.x + 1; p.mom.z = table.z + 2.8;
  p.mom.hp = 3; p.mom.gold = 25;
  c.mom.say({ t: 'interact', id: table.id });
  const ask = c.mom.last('ui');
  assert.equal(ask.kind, 'feast', 'it asks first');
  assert.equal(p.mom.gold, 25, 'nothing paid yet');
  assert.ok(!c.mom.all('fx').some((m) => m.kind === 'sit'), 'not sat down yet');
  c.mom.say({ t: 'eatFeast', table: ask.table });
  assert.equal(FEAST_COST, 10);
  assert.equal(p.mom.gold, 15);
  assert.equal(p.mom.hp, 3 + Math.ceil(p.mom.maxHp / 2), 'half the health bar');
  const sat = c.mom.all('fx').find((m) => m.kind === 'sit');
  assert.ok(sat, 'sat down at a seat');
  assert.ok(sat.up && !blocked(L, sat.up.x, sat.up.z, PLAYER_RADIUS, L.solids), 'getting up puts you on clear floor, not inside the table');
  // standing at the mirror, the mirror is what E uses — not the table
  const { useDistance } = await import('../src/shared/props.js');
  const mirror = L.props.find((q) => q.interact === 'mirror');
  const atMirror = { x: mirror.x, z: mirror.z + 1.6 };
  assert.ok(useDistance(mirror, atMirror) < useDistance(table, atMirror), 'the mirror is nearer than any seat');
  // no gold, no food
  p.mom.gold = 5; p.mom.hp = 3;
  c.mom.say({ t: 'eatFeast', table: ask.table });
  assert.equal(p.mom.hp, 3);
});
