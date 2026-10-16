// The family chest holds weapons, shields and armor too (with their enchant), so the family can share gear.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './helpers.js';

function atTheChest(...ids) {
  const w = world('chest', ...ids);
  const chest = w.server.getLocation('house').layout.props.find((q) => q.interact === 'storage');
  for (const p of Object.values(w.p)) { w.server.travel(p, 'house'); p.x = chest.x; p.z = chest.z + chest.radius + 0.5; }
  return w;
}

test('chest: gear goes in (not what you wear) and comes out to someone else, enchant and all', () => {
  const { save, c, p } = atTheChest('mom', 'kid');
  p.mom.gear.push('greatsword');
  p.mom.enchants = { greatsword: 3 };
  c.mom.say({ t: 'stash', item: p.mom.weapon, qty: 1, dir: 'in' });
  assert.ok(p.mom.gear.includes(p.mom.weapon), 'the weapon in your hand stays');
  c.mom.say({ t: 'stash', item: 'greatsword', qty: 1, dir: 'in' });
  assert.equal(p.mom.gear.includes('greatsword'), false);
  assert.equal(p.mom.enchants.greatsword, undefined);
  assert.equal(save.house.storage.greatsword, 1);
  assert.deepEqual(save.house.storageEnch.greatsword, [3]);
  assert.equal(c.kid.last('chestState').storage.greatsword, 1, 'everyone at the chest sees it');
  c.kid.say({ t: 'stash', item: 'greatsword', qty: 1, dir: 'out' });
  assert.ok(p.kid.gear.includes('greatsword'));
  assert.equal(p.kid.enchants.greatsword, 3);
  assert.equal(save.house.storage.greatsword, undefined);
  assert.equal(save.house.storageEnch.greatsword, undefined);
  c.kid.say({ t: 'equip', item: 'greatsword' });
  assert.equal(p.kid.weapon, 'greatsword');
});

test('chest: you can’t take out gear you already own', () => {
  const { save, c, p } = atTheChest('mom', 'kid');
  p.mom.gear.push('axe');
  p.kid.gear.push('axe');
  c.mom.say({ t: 'stash', item: 'axe', qty: 1, dir: 'in' });
  c.kid.say({ t: 'stash', item: 'axe', qty: 1, dir: 'out' });
  assert.equal(save.house.storage.axe, 1, 'still in the chest');
  assert.equal(p.kid.gear.filter((g) => g === 'axe').length, 1);
});
