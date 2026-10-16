// Gold, the shops, gear and armor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { world } from './helpers.js';
import { migrate } from '../src/server/saves.js';
import { ITEMS, SHOP_STOCK, SHOP_SECTIONS, shopTier, sellValue, inShopFor } from '../src/shared/items.js';

/** Stand at the Blacksmith's forge (where weapons, shields and armor are sold). */
function atForge(server, p) {
  const forge = server.getLocation('town').layout.props.find((q) => q.interact === 'forge');
  p.x = forge.x; p.z = forge.z + 3;
}

test('economy: everyone has their own gold', () => {
  const { server, p, c } = world('gold', 'mom', 'kid');
  for (const x of Object.values(p)) server.travel(x, 'town');
  p.mom.gold = 500; p.kid.gold = 0;
  c.kid.say({ t: 'buy', item: 'potion' });
  assert.equal(p.kid.gold, 0, 'the kid cannot spend mom’s gold');
  assert.equal(p.kid.inventory.potion, 2);
  c.mom.say({ t: 'buy', item: 'potion' });
  assert.equal(p.mom.gold, 500 - ITEMS.potion.price);
  // gold on the floor goes to whoever picks it up
  server.travel(p.kid, 'mine/1', 'U');
  const loc = server.locations.get('mine/1');
  server.dropItem(loc, p.kid, 'gold', 7);
  for (let i = 0; i < 10; i++) server.step(0.05);
  assert.equal(p.kid.gold, 7);
  assert.equal(p.mom.gold, 500 - ITEMS.potion.price);
});

test('economy: an old shared purse is split evenly when the save is upgraded', () => {
  const old = JSON.parse(readFileSync(new URL('./fixtures/save-v5.json', import.meta.url)));
  const purse = old.gold, n = Object.keys(old.players).length;
  const save = migrate(old);
  assert.equal(save.gold, undefined);
  for (const rec of Object.values(save.players)) assert.equal(rec.gold, Math.floor(purse / n));
});

test('economy: a tougher shop tier opens every 20 levels', () => {
  assert.equal(shopTier(1), 0);
  assert.equal(shopTier(20), 1);
  assert.equal(shopTier(99), 4);
  for (let tier = 0; tier <= 4; tier++) {
    for (const kind of ['weapon', 'shield', 'armor']) {
      assert.ok(SHOP_STOCK.some((id) => ITEMS[id].tier === tier && ITEMS[id].kind === kind), `tier ${tier} sells a ${kind}`);
    }
  }
  const best = (tier) => Math.max(...SHOP_STOCK.filter((id) => ITEMS[id].kind === 'weapon' && ITEMS[id].tier === tier).map((id) => ITEMS[id].damage));
  for (let tier = 1; tier <= 4; tier++) assert.ok(best(tier) > best(tier - 1), `tier ${tier} weapons are stronger`);
  for (const id of SHOP_STOCK) assert.ok(SHOP_SECTIONS.some((s) => s.kinds.includes(ITEMS[id].kind)), `${id} has a shop section`);

  const { server, p, c } = world('tiers');
  server.travel(p.a, 'town');
  p.a.gold = 1e6;
  c.a.say({ t: 'buy', item: 'axe' });
  assert.ok(!p.a.gear.includes('axe'), 'weapons only from the Blacksmith, at the forge');
  atForge(server, p.a);
  c.a.say({ t: 'buy', item: 'steelblade' });
  assert.ok(!p.a.gear.includes('steelblade'), 'level 1 cannot buy level 20 gear');
  p.a.level = 20;
  assert.ok(inShopFor('steelblade', 20));
  c.a.say({ t: 'buy', item: 'steelblade' });
  assert.equal(p.a.weapon, 'steelblade');
});

test('economy: armor softens hits; gear you are not using can be sold', () => {
  const { server, p, c } = world('armor');
  server.travel(p.a, 'town');
  atForge(server, p.a);
  p.a.gold = 10000;
  c.a.say({ t: 'buy', item: 'plate' });
  assert.equal(p.a.armor, 'plate');
  const hp = p.a.hp;
  server.damagePlayer(p.a, 10);
  assert.equal(hp - p.a.hp, Math.round(10 * (1 - ITEMS.plate.armor)));
  server.damagePlayer(p.a, 1);
  assert.equal(hp - p.a.hp, Math.round(10 * (1 - ITEMS.plate.armor)) + 1, 'every hit does at least 1');

  c.a.say({ t: 'sell', item: 'plate', qty: 1 });
  assert.ok(p.a.gear.includes('plate'), 'cannot sell what you are wearing');
  c.a.say({ t: 'equip', item: null, slot: 'armor' });
  const gold = p.a.gold;
  c.a.say({ t: 'sell', item: 'plate', qty: 1 });
  assert.ok(!p.a.gear.includes('plate'));
  assert.equal(p.a.gold, gold + sellValue('plate'));
  assert.ok(sellValue('plate') < ITEMS.plate.price, 'the shop buys back for less');
});

test('economy: pet treats come from the Pet Keeper, not the general store', () => {
  assert.ok(!SHOP_STOCK.includes('petfood'));
  const { server, p, c } = world('treats');
  server.travel(p.a, 'town');
  p.a.gold = 100;
  c.a.say({ t: 'buy', item: 'petfood' });
  assert.equal(p.a.inventory.petfood, 1);
});

test('economy: forged weapons have perks — keen crits, vampiric heals, frost freezes, giant-slayer hits bosses harder', async () => {
  const { PERKS, PERK_GIANT } = await import('../src/shared/items.js');
  const { FORGE_RECIPES } = await import('../src/shared/items.js');
  for (const id of Object.keys(FORGE_RECIPES)) if (ITEMS[id].kind === 'weapon') assert.ok(PERKS[ITEMS[id].perk], `${id} has a perk`);
  const { server, p } = world('perks');
  server.travel(p.a, 'mine/1', 'U');
  const loc = server.locations.get('mine/1');
  const slime = () => loc.spawn({ type: 'slime', variant: 'green', x: p.a.x + 1, z: p.a.z, hp: 1e6, maxHp: 1e6, damage: 0, speed: 0 });
  p.a.weapon = 'obsidianedge'; p.a.hp = 1; // vampiric
  server.hitSlime(p.a, loc, slime(), 100);
  assert.ok(p.a.hp > 1, 'healed by the hit');
  p.a.weapon = 'nightstaff'; // frost
  const e = slime();
  server.hitSlime(p.a, loc, e, 10);
  assert.ok(e._stun > 0.5, 'frozen for a moment');
  p.a.weapon = 'starcleaver'; // giant-slayer
  const boss = slime(); boss.boss = true; boss.name = 'Test';
  server.hitSlime(p.a, loc, boss, 100);
  assert.equal(1e6 - boss.hp, Math.round(100 * PERK_GIANT));
});

test('co-op: everyone fighting near a kill gets their own loot, which only they can pick up', async () => {
  const { world } = await import('./helpers.js');
  const { server, p } = world('share', 'mom', 'kid');
  for (const id of ['mom', 'kid']) server.travel(p[id], 'mine/2', 'U');
  const loc = server.locations.get(p.mom.loc);
  for (const e of [...loc.entities.values()]) if (e.type === 'slime' || e.type === 'drop') loc.remove(e.id);
  p.kid.x = p.mom.x + 2; p.kid.z = p.mom.z;
  const e = loc.spawn({ type: 'slime', variant: 'green', x: p.mom.x + 1, z: p.mom.z, hp: 1, maxHp: 1, damage: 0, speed: 0, goldMul: 1 });
  server.hitSlime(p.mom, loc, e, 99);
  const gold = [...loc.entities.values()].filter((d) => d.type === 'drop' && d.item === 'gold');
  assert.deepEqual(gold.map((d) => d.owner).sort(), ['kid', 'mom'], 'a pile each');
  // the kid can't take mom's
  const momsPile = gold.find((d) => d.owner === 'mom');
  const kidGold = p.kid.gold;
  p.kid.x = momsPile.x; p.kid.z = momsPile.z; p.mom.x += 30;
  loc.tickDrop(momsPile, 0.05, [p.kid]);
  assert.ok(loc.entities.has(momsPile.id) && p.kid.gold === kidGold, 'not the kid’s to take');
});

test('cheat code 1234: 1000 gold (typed in the game or in chat, where nobody sees it)', () => {
  const { c, p } = world('cheat', 'kid', 'mom');
  const gold = p.kid.gold;
  c.kid.say({ t: 'cheat', code: '1234' });
  assert.equal(p.kid.gold, gold + 1000);
  c.kid.say({ t: 'cheat', code: '9999' });
  assert.equal(p.kid.gold, gold + 1000, 'only the real code');
  c.mom.clear();
  c.kid.say({ t: 'chat', text: '1234' });
  assert.equal(p.kid.gold, gold + 2000);
  assert.equal(c.mom.all('chat').length, 0, 'not shown in chat');
});
