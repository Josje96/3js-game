// Farm tools (items.js `build`, made in client/farmtools.js): each one builds, and is held like the other weapons.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ITEMS, SHOP_STOCK } from '../src/shared/items.js';
import { FARM_TOOLS } from '../src/client/farmtools.js';

test('farm tools: pitchfork, sickle, spade and scythe, sold in the shop and built in code', () => {
  for (const id of ['pitchfork', 'sickle', 'spade', 'scythe', 'steelscythe']) {
    assert.equal(ITEMS[id]?.kind, 'weapon', `${id} is a weapon`);
    assert.ok(SHOP_STOCK.includes(id), `the shop sells ${id}`);
  }
  for (const [id, def] of Object.entries(ITEMS).filter(([, d]) => d.build)) {
    assert.ok(FARM_TOOLS[def.build], `${id}: a builder for '${def.build}'`);
    assert.ok(!def.model, `${id}: built or a model, not both`);
    const box = new THREE.Box3().setFromObject(FARM_TOOLS[def.build](def));
    // like the KayKit weapons: the grip at the origin, the head up +y, flat in x-y
    assert.ok(box.min.y < 0 && box.max.y > 0.8 && box.max.y < 2.2, `${id}: held at the grip, weapon-sized (${box.min.y.toFixed(2)}..${box.max.y.toFixed(2)})`);
    assert.ok(box.max.z - box.min.z < 0.3, `${id}: flat like a blade`);
  }
});
