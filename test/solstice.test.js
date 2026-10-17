// The Solstice Arena: halfway through summer, three rounds of warriors (each harder); win them all for the Solar Blade.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './helpers.js';
import { holidayOf, SEASON_DAYS, SOLSTICE_ARENA, ARENA_ROUNDS, ARENA_PRIZE } from '../src/shared/seasons.js';
import { ENEMIES } from '../src/shared/dungeons.js';
import { ITEMS, SHOP_STOCK, DROP_TIERS } from '../src/shared/items.js';
import { blocked } from '../src/shared/physics.js';

const SOLSTICE = SEASON_DAYS + 15;
const ents = (loc, pred) => [...loc.entities.values()].filter(pred);
const foes = (loc) => ents(loc, (e) => e.type === 'slime' && e._home?.arena);
const herald = (loc) => ents(loc, (e) => e.arenaHerald)[0];

function arena(...ids) {
  const w = world('solstice', ...ids);
  w.save.day = SOLSTICE;
  w.server.step(0.05);
  w.town = w.server.getLocation('town');
  for (const p of Object.values(w.p)) { w.server.travel(p, 'town'); p.x = SOLSTICE_ARENA.x; p.z = SOLSTICE_ARENA.z - 4; }
  return w;
}
const talk = (w, who) => { const h = herald(w.town); const p = w.p[who]; p.x = h.x; p.z = h.z + 1.5; w.c[who].say({ t: 'interact', id: h.id }); p.x = SOLSTICE_ARENA.x; p.z = SOLSTICE_ARENA.z - 4; };
const beatRound = (w, who) => { for (let i = 0; i < 20 && foes(w.town).length; i++) for (const f of foes(w.town)) w.server.hitSlime(w.p[who], w.town, f, 1e9); };

test('solstice arena: halfway through summer; three rounds of real warriors with bodies; the prize is epic and only won here', () => {
  assert.equal(holidayOf(SOLSTICE), 'solstice');
  assert.equal(holidayOf(SOLSTICE + 120), 'solstice', 'every year');
  assert.equal(ARENA_ROUNDS.length, 3);
  for (const [i, r] of ARENA_ROUNDS.entries()) {
    for (const v of Object.keys(r.foes)) assert.ok(ENEMIES[v]?.body === 'warrior', `${v} is a warrior`);
    if (i) assert.ok(r.power > ARENA_ROUNDS[i - 1].power, `round ${i + 1} is harder`);
  }
  const prize = ITEMS[ARENA_PRIZE];
  assert.ok(prize.epic && prize.kind === 'weapon' && prize.sell >= 20000);
  assert.ok(!SHOP_STOCK.includes(ARENA_PRIZE) && !DROP_TIERS.some((t) => t.items.includes(ARENA_PRIZE)), 'not sold or dropped anywhere else');
});

test('solstice arena: the herald is only there on the solstice, standing somewhere you can reach', () => {
  const w = arena('mom');
  const h = herald(w.town);
  assert.ok(h, 'the Sun Herald is in town');
  assert.ok(!blocked(w.town.layout, h.x, h.z + 1.5, 0.4), 'room to stand in front of him');
  assert.ok(!blocked(w.town.layout, SOLSTICE_ARENA.x, SOLSTICE_ARENA.z, 0.4), 'the ring is open ground');
  w.server.endDay('sleep');
  w.server.step(0.05);
  assert.equal(herald(w.town), undefined, 'gone the next day');
});

test('solstice arena: each round is harder; winning all three gives everyone in the ring the Solar Blade', () => {
  const w = arena('mom', 'kid');
  const hp = [];
  for (let n = 1; n <= 3; n++) {
    talk(w, 'mom');
    const f = foes(w.town);
    assert.equal(f.length, Object.values(ARENA_ROUNDS[n - 1].foes).reduce((a, b) => a + b, 0), `round ${n}'s warriors`);
    hp.push(Math.max(...f.map((e) => e.maxHp)));
    talk(w, 'kid');
    assert.equal(foes(w.town).length, f.length, 'no second round on top of the first');
    if (n === 3) assert.ok(f.some((e) => e.boss && e.variant === 'solarchampion'), 'the Solar Champion in the final');
    assert.ok(!w.p.mom.gear.includes(ARENA_PRIZE), 'no blade yet');
    beatRound(w, 'mom');
    assert.equal(w.save.flags.solstice.won, n);
  }
  assert.ok(hp[0] < hp[1] && hp[1] < hp[2], 'the warriors get tougher');
  assert.ok(w.p.mom.gear.includes(ARENA_PRIZE) && w.p.kid.gear.includes(ARENA_PRIZE), 'a Solar Blade each');
  talk(w, 'mom');
  assert.equal(foes(w.town).length, 0, 'won for this year');
});

test('solstice arena: warriors only fight people in the ring, and bow out if everyone leaves', () => {
  const w = arena('mom');
  talk(w, 'mom');
  w.p.mom.x = 46; w.p.mom.z = 42; // off shopping
  const hp = w.p.mom.hp;
  for (let i = 0; i < 40; i++) w.server.step(0.05);
  assert.equal(w.p.mom.hp, hp, 'the market is safe');
  for (const f of foes(w.town)) assert.ok((f.x - SOLSTICE_ARENA.x) ** 2 + (f.z - SOLSTICE_ARENA.z) ** 2 < (SOLSTICE_ARENA.r + 1.5) ** 2, 'stays in the ring');
  for (let i = 0; i < 120; i++) w.server.step(0.05);
  assert.equal(foes(w.town).length, 0, 'called off');
  assert.equal(w.save.flags.solstice.won, 0, 'round 1 to try again');
  talk(w, 'mom');
  assert.ok(foes(w.town).length, 'and it can be tried again');
});

test('solstice arena: the warriors grow with the family', () => {
  const weak = arena('a');
  talk(weak, 'a');
  const strong = arena('a');
  strong.save.players.a.level = strong.p.a.level = 60;
  talk(strong, 'a');
  assert.ok(foes(strong.town)[0].maxHp > foes(weak.town)[0].maxHp * 3);
});
