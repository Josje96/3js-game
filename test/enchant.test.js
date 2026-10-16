// The Enchanter: gold + ore + Arcane Essence make a weapon stronger (and shinier), up to +5.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { world } from './helpers.js';
import { migrate } from '../src/server/saves.js';
import { ITEMS } from '../src/shared/items.js';
import { attackDamage } from '../src/shared/progression.js';
import { ENCHANT_COSTS, ENCHANT_MAX, ENCHANT_LOOKS, enchantCost } from '../src/shared/enchant.js';

/** A player standing at the Enchanter's counter with a steel blade and plenty of everything. */
function atTheEnchanter() {
  const w = world('ench', 'mom');
  const { server, p } = w;
  server.travel(p.mom, 'town');
  const tent = server.getLocation('town').layout.props.find((q) => q.interact === 'enchant');
  p.mom.x = tent.x - 2.2; p.mom.z = tent.z - 2.2; // in front of him (he faces the town)
  p.mom.gear.push('steelblade');
  p.mom.weapon = 'steelblade';
  p.mom.gold = 1e6;
  Object.assign(p.mom.inventory, { essence: 100, silver: 50, goldore: 50, mythril: 50, obsidian: 50, starstone: 50 });
  return { ...w, tent };
}

test('enchant: the Enchanter is in the far corner of town, and each level costs more', () => {
  const { tent } = atTheEnchanter();
  assert.ok(tent.x > 120 && tent.z > 85, 'bottom-right corner of town');
  assert.equal(ENCHANT_COSTS.length, ENCHANT_MAX);
  assert.equal(ENCHANT_LOOKS.length, ENCHANT_MAX);
  for (let i = 1; i < ENCHANT_MAX; i++) {
    assert.ok(ENCHANT_COSTS[i].gold > ENCHANT_COSTS[i - 1].gold && ENCHANT_COSTS[i].essence > ENCHANT_COSTS[i - 1].essence);
  }
  for (const c of ENCHANT_COSTS) assert.ok(ITEMS[c.ore[0]]?.kind === 'loot', `${c.ore[0]} is an ore`);
  assert.equal(enchantCost('leather', 0), null, 'only weapons');
});

test('enchant: paying makes the weapon stronger, up to +5, and everyone sees it', () => {
  const { c, p } = atTheEnchanter();
  const before = attackDamage('steelblade', p.mom.stats);
  const gold = p.mom.gold, essence = p.mom.inventory.essence, silver = p.mom.inventory.silver;
  c.mom.say({ t: 'enchant', item: 'steelblade' });
  assert.equal(p.mom.enchants.steelblade, 1);
  assert.equal(p.mom.gold, gold - ENCHANT_COSTS[0].gold);
  assert.equal(p.mom.inventory.essence, essence - ENCHANT_COSTS[0].essence);
  assert.equal(p.mom.inventory.silver, silver - ENCHANT_COSTS[0].ore[1]);
  assert.ok(attackDamage('steelblade', p.mom.stats, 1) > before);
  assert.equal(c.mom.last('self').enchants.steelblade, 1);
  for (let i = 0; i < 10; i++) c.mom.say({ t: 'enchant', item: 'steelblade' });
  assert.equal(p.mom.enchants.steelblade, ENCHANT_MAX, 'stops at +5');
  assert.ok(c.mom.all('fx').some((m) => m.kind === 'enchant' && m.level === ENCHANT_MAX));
});

test('enchant: no essence, too far away, or not your weapon: nothing happens', () => {
  const { c, p, tent } = atTheEnchanter();
  p.mom.inventory.essence = 1;
  c.mom.say({ t: 'enchant', item: 'steelblade' });
  assert.equal(p.mom.enchants.steelblade, undefined, 'needs essence');
  p.mom.inventory.essence = 100;
  c.mom.say({ t: 'enchant', item: 'starblade' });
  assert.equal(p.mom.enchants.starblade, undefined, 'not owned');
  p.mom.x = tent.x - 40;
  c.mom.say({ t: 'enchant', item: 'steelblade' });
  assert.equal(p.mom.enchants.steelblade, undefined, 'must be at his tent');
});

test('enchant: selling an enchanted weapon takes the magic with it', () => {
  const { c, p } = atTheEnchanter();
  c.mom.say({ t: 'enchant', item: 'steelblade' });
  p.mom.weapon = p.mom.gear[0];
  c.mom.say({ t: 'sell', item: 'steelblade', qty: 1 });
  assert.equal(p.mom.enchants.steelblade, undefined);
});

test('enchant: essence is rare: bosses always drop it, ordinary monsters almost never', () => {
  const { server } = world('essence');
  assert.ok(server.essenceFrom({ boss: true }, 10) >= 2);
  assert.ok(server.essenceFrom({ seasonal: true, boss: true }, 10) >= 5);
  assert.equal(server.essenceFrom({}, 1), 0, 'none near the top of the mine');
  let found = 0;
  for (let i = 0; i < 5000; i++) found += server.essenceFrom({}, 50);
  assert.ok(found > 0 && found < 5000 * 0.05, `rare (${found} in 5000)`);
});

test('enchant: a save from before the Enchanter loads with no enchantments', () => {
  const save = migrate(JSON.parse(readFileSync(new URL('./fixtures/save-v10.json', import.meta.url))));
  for (const pl of Object.values(save.players)) assert.deepEqual(pl.enchants, {});
  assert.equal(save.players.mom.weapon, 'steelblade');
});

test('enchant: every level adds damage, even to a small weapon', async () => {
  const { enchantDamage } = await import('../src/shared/enchant.js');
  for (const id of ['dagger', 'sword', 'staraxe']) {
    for (let l = 1; l <= ENCHANT_MAX; l++) assert.ok(enchantDamage(id, l) > enchantDamage(id, l - 1), `${id} +${l}`);
  }
});

test('cheat code 5678: a free enchant on the weapon in hand, only at the Enchanter', () => {
  const { c, p } = atTheEnchanter();
  const gold = p.mom.gold, essence = p.mom.inventory.essence;
  c.mom.say({ t: 'cheat', code: '5678' });
  assert.equal(p.mom.enchants.steelblade, 1);
  assert.equal(p.mom.gold, gold, 'free');
  assert.equal(p.mom.inventory.essence, essence, 'no essence used');
  for (let i = 0; i < 10; i++) c.mom.say({ t: 'cheat', code: '5678' });
  assert.equal(p.mom.enchants.steelblade, ENCHANT_MAX, 'not past the top');
  p.mom.x -= 30; // walked away
  p.mom.weapon = p.mom.gear[0];
  c.mom.say({ t: 'cheat', code: '5678' });
  assert.ok(!p.mom.enchants[p.mom.gear[0]], 'only at his tent');
});
