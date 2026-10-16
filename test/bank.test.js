// The bank: costs gold to open, keeps gold safe when you faint, sends gold to family.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { world } from './helpers.js';
import { migrate } from '../src/server/saves.js';
import { BANK_OPEN_FEE } from '../src/shared/config.js';

/** Players standing at the Banker's booth. */
function atTheBank(...ids) {
  const w = world('bank', ...ids);
  const booth = w.server.getLocation('town').layout.props.find((q) => q.interact === 'bank');
  for (const p of Object.values(w.p)) { w.server.travel(p, 'town'); p.x = booth.x; p.z = booth.z + 2.6; }
  return { ...w, booth };
}

test('bank: opening an account costs gold; then deposit and withdraw', () => {
  const { c, p } = atTheBank('mom');
  p.mom.gold = 100;
  c.mom.say({ t: 'bank', action: 'deposit', amount: 50 });
  assert.equal(p.mom.bank, null, 'no account yet');
  c.mom.say({ t: 'bank', action: 'open' });
  assert.equal(p.mom.bank, null, 'not enough gold to open one');
  p.mom.gold = 1000;
  c.mom.say({ t: 'bank', action: 'open' });
  assert.equal(p.mom.bank, 0);
  assert.equal(p.mom.gold, 1000 - BANK_OPEN_FEE);
  c.mom.say({ t: 'bank', action: 'deposit', amount: 500 });
  assert.equal(p.mom.bank, 500);
  assert.equal(p.mom.gold, 1000 - BANK_OPEN_FEE - 500);
  c.mom.say({ t: 'bank', action: 'deposit', amount: 99999 });
  assert.equal(p.mom.bank, 500, 'can’t put in more than you carry');
  c.mom.say({ t: 'bank', action: 'withdraw', amount: 200 });
  assert.equal(p.mom.bank, 300);
  c.mom.say({ t: 'bank', action: 'withdraw', amount: 5000 });
  assert.equal(p.mom.bank, 300, 'can’t take out more than is there');
  assert.equal(c.mom.last('self').bank, 300);
});

test('bank: gold in the bank is safe when you faint at night', () => {
  const { server, c, p } = atTheBank('mom');
  p.mom.gold = 2000;
  c.mom.say({ t: 'bank', action: 'open' });
  c.mom.say({ t: 'bank', action: 'deposit', amount: 1000 });
  const carried = p.mom.gold;
  server.endDay('nightfall'); // out in town after dark
  assert.equal(p.mom.bank, 1000, 'the bank keeps it all');
  assert.equal(p.mom.gold, carried - Math.floor(carried / 2), 'only the purse is halved');
});

test('bank: send gold to family — only to someone with an account (even offline)', () => {
  const { server, save, c, p, booth } = atTheBank('mom', 'kid');
  p.mom.gold = 5000; p.kid.gold = 1000;
  c.mom.say({ t: 'bank', action: 'open' });
  c.mom.say({ t: 'bank', action: 'deposit', amount: 2000 });
  c.mom.say({ t: 'interact', id: booth.id });
  assert.deepEqual(c.mom.last('ui').family, [], 'the kid has no account: not on the list');
  c.mom.say({ t: 'bank', action: 'send', amount: 300, to: 'kid' });
  assert.equal(p.mom.bank, 2000, 'no account: nothing sent');
  assert.equal(p.kid.gold, 1000);
  c.kid.say({ t: 'bank', action: 'open' });
  c.mom.say({ t: 'interact', id: booth.id });
  assert.deepEqual(c.mom.last('ui').family.map((f) => f.id), ['kid']);
  c.mom.say({ t: 'bank', action: 'send', amount: 200, to: 'kid' });
  assert.equal(p.kid.bank, 200, 'into the kid’s bank');
  c.mom.say({ t: 'bank', action: 'send', amount: 99999, to: 'kid' });
  assert.equal(p.mom.bank, 1800, 'can’t send more than you have');
  // grandpa isn't playing right now
  save.players.grandpa = { ...save.players.kid, name: 'Grandpa', gold: 10, bank: null };
  c.mom.say({ t: 'bank', action: 'send', amount: 100, to: 'grandpa' });
  assert.equal(save.players.grandpa.gold, 10, 'no account: nothing arrives');
  assert.equal(p.mom.bank, 1800);
  save.players.grandpa.bank = 5;
  c.mom.say({ t: 'bank', action: 'send', amount: 100, to: 'grandpa' });
  assert.equal(save.players.grandpa.bank, 105);
  assert.equal(server.players.get('grandpa'), undefined);
});

test('bank: only at the Banker’s booth', () => {
  const { c, p, booth } = atTheBank('mom');
  p.mom.gold = 1000;
  p.mom.x = booth.x + 40;
  c.mom.say({ t: 'bank', action: 'open' });
  assert.equal(p.mom.bank, null);
});

test('bank: a save from before the bank loads with no account', () => {
  const save = migrate(JSON.parse(readFileSync(new URL('./fixtures/save-v11.json', import.meta.url))));
  for (const pl of Object.values(save.players)) assert.equal(pl.bank, null);
  assert.equal(save.players.mom.gold, 777);
  assert.deepEqual(save.players.mom.enchants, { steelblade: 2 });
});
