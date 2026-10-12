// The Family Fort is drawn for the family's size: a square, a common hall, a room per member.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { world, fakeClient } from './helpers.js';
import { fortMap, FORT_SIZE, MAX_ROOMS } from '../src/shared/fort.js';
import { buildLayout, roomIndexAt } from '../src/shared/locations.js';
import { migrate } from '../src/server/saves.js';
import { GameServer } from '../src/server/GameServer.js';

test('fort: a square with one room and one bed per family member, every room reachable', () => {
  for (let n = 1; n <= MAX_ROOMS; n++) {
    const map = fortMap(n);
    assert.equal(map.rows.length, FORT_SIZE);
    for (const row of map.rows) assert.equal(row.length, FORT_SIZE, 'square');
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
  p.mom.x = 12; p.mom.z = 12;
  c.mom.say({ t: 'placeFurniture', item: 'stool', x: 14, z: 10, rot: 0 }); // in mom's room
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
  p.mom.x = 26; p.mom.z = 40;
  c.mom.say({ t: 'placeFurniture', item: 'chair', x: 26, z: 37, rot: 0 });
  const chair = [...server.locations.get('house').entities.values()].find((e) => e.item === 'chair');
  assert.equal(chair.interact, 'sit');
  p.mom.z = 38.5;
  c.mom.say({ t: 'interact', id: chair.id });
  const fx = c.mom.all('fx').find((m) => m.kind === 'sit');
  assert.ok(fx && fx.x === chair.x && fx.z === chair.z, 'sat down on it');
});
