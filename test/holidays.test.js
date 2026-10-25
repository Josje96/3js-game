// Holidays: Halloween (autumn day 15: trick-or-treat at every cottage, once per house) and
// Christmas (winter day 15: Santa in the square, one present each).
import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './helpers.js';
import { holidayOf, SANTA_SPOT, SEASON_DAYS } from '../src/shared/seasons.js';
import { blocked } from '../src/shared/physics.js';
import { PLAYER_RADIUS, income } from '../src/shared/config.js';
import { ITEMS, SHOP_STOCK } from '../src/shared/items.js';

const EASTER = 15, HALLOWEEN = SEASON_DAYS * 2 + 15, CHRISTMAS = SEASON_DAYS * 3 + 15;

test('holidays: Halloween halfway through autumn, Christmas halfway through winter, one day each, every year', () => {
  assert.equal(holidayOf(HALLOWEEN), 'halloween');
  assert.equal(holidayOf(CHRISTMAS), 'christmas');
  assert.equal(holidayOf(HALLOWEEN + 120), 'halloween', 'next year too');
  assert.equal(holidayOf(EASTER), 'easter');
  assert.equal(holidayOf(SEASON_DAYS + 15), 'solstice', 'Midsummer: the Solstice Arena');
  for (const d of [1, 14, 16, 44, 46, HALLOWEEN - 1, HALLOWEEN + 1, CHRISTMAS + 1]) assert.equal(holidayOf(d), null, `day ${d}`);
  for (const id of ['candycorn', 'toffeeapple', 'candycane']) assert.ok(ITEMS[id]?.heal && !SHOP_STOCK.includes(id), `${id}: a holiday-only treat`);
});

const inTown = (server, pred) => [...server.getLocation('town').entities.values()].filter(pred);

test('holidays: on Halloween you can trick-or-treat at every cottage door, once per house', () => {
  const { server, save, p, c } = world('halloween', 'kid');
  save.day = HALLOWEEN;
  server.step(0.05);
  const doors = inTown(server, (e) => e.interact === 'treat');
  assert.ok(doors.length >= 4, `a door to knock on at every cottage (${doors.length})`);
  const L = server.getLocation('town').layout;
  for (const d of doors) assert.ok(!blocked(L, d.x, d.z + 1.6, PLAYER_RADIUS, L.solids), 'you can stand at the door');
  server.travel(p.kid, 'town');
  const knock = (d) => { p.kid.x = d.x; p.kid.z = d.z + 1.6; c.kid.say({ t: 'interact', id: d.id }); };
  const gold = p.kid.gold, treats = () => Object.entries(p.kid.inventory).filter(([id]) => ['candycorn', 'toffeeapple', 'pumpkinpie', 'cider'].includes(id)).reduce((n, [, q]) => n + q, 0);
  knock(doors[0]);
  assert.equal(treats(), 1, 'a treat');
  assert.ok(p.kid.gold > gold, 'and some gold');
  const fx = c.kid.last('fx');
  assert.ok(['treat', 'boo'].includes(fx.kind) && fx.house === doors[0].house && fx.by === p.kid.id, 'everyone sees which door, and who knocked (the neighbour comes out: views.js DoorGreeter)');
  knock(doors[0]);
  assert.equal(treats(), 1, 'one treat per house');
  knock(doors[1]);
  assert.equal(treats(), 2, 'the next house gives another');
  // the next day: no doors, no costumes
  server.endDay('sleep');
  server.step(0.05);
  assert.equal(inTown(server, (e) => e.holiday).length, 0, 'Halloween is over');
});

test('holidays: on Christmas Santa is in the square, with one present for each of us', () => {
  const { server, save, p, c } = world('xmas', 'mom', 'kid');
  save.day = CHRISTMAS;
  server.step(0.05);
  const [santa] = inTown(server, (e) => e.interact === 'santa');
  assert.ok(santa, 'Santa came');
  const L = server.getLocation('town').layout;
  assert.ok(!blocked(L, SANTA_SPOT.x, SANTA_SPOT.z + 1.5, PLAYER_RADIUS, L.solids), 'you can walk up to Santa');
  for (const id of ['mom', 'kid']) server.travel(p[id], 'town');
  const visit = (id) => { p[id].x = santa.x; p[id].z = santa.z + 1.5; c[id].say({ t: 'interact', id: santa.id }); };
  visit('mom');
  assert.equal(p.mom.inventory.santapresent, 1, 'a present from Santa');
  visit('mom');
  assert.equal(p.mom.inventory.santapresent, 1, 'one present each');
  const gold = p.mom.gold;
  c.mom.say({ t: 'openPresent', item: 'santapresent' });
  assert.ok(!p.mom.inventory.santapresent && p.mom.gold >= gold + income(200), 'opened: gold inside (GOLD_INCOME)');
  visit('kid');
  assert.equal(p.kid.inventory.santapresent, 1, 'the kid gets one too');
  // presents can be given to each other
  c.kid.say({ t: 'sendPresent', item: 'santapresent', to: 'mom' });
  assert.equal(p.mom.inventory.santapresent, 1, 'the kid gave mom their present');
  assert.ok(!p.kid.inventory.santapresent);
  assert.deepEqual(save.flags.santaGifts.ids.sort(), ['kid', 'mom'], 'remembered in the save');
  server.endDay('sleep');
  server.step(0.05);
  assert.equal(inTown(server, (e) => e.holiday).length, 0, 'Santa has gone home');
});

test('holidays: at Easter Grandma is in the square with a basket for each of us', () => {
  const { server, save, p, c } = world('easter', 'kid');
  save.day = EASTER;
  server.step(0.05);
  const [grandma] = inTown(server, (e) => e.interact === 'easter');
  assert.ok(grandma, 'Grandma came');
  server.travel(p.kid, 'town');
  p.kid.x = grandma.x; p.kid.z = grandma.z + 1.5;
  const gold = p.kid.gold;
  c.kid.say({ t: 'interact', id: grandma.id });
  assert.ok(p.kid.inventory.chocolateegg >= 3 && p.kid.inventory.honeycake === 1 && p.kid.gold > gold, 'an Easter basket');
  c.kid.say({ t: 'interact', id: grandma.id });
  assert.equal(p.kid.inventory.honeycake, 1, 'one basket each');
  server.endDay('sleep');
  server.step(0.05);
  assert.equal(inTown(server, (e) => e.holiday).length, 0, 'Grandma has gone home');
});

test('holidays: Santa’s tree, sack and sleigh are solid, and you can still walk up to him', async () => {
  const { christmasSolids, SANTA_SPOT } = await import('../src/shared/seasons.js');
  const solids = christmasSolids(SANTA_SPOT);
  const inside = (x, z) => solids.some((s) => Math.hypot(s.x - x, s.z - z) < s.r);
  assert.ok(inside(SANTA_SPOT.x + 2.6, SANTA_SPOT.z - 1.2), 'the tree');
  assert.ok(inside(SANTA_SPOT.x - 1.6, SANTA_SPOT.z - 3.7), 'the sleigh');
  for (const [dx, dz] of [[0, 1.4], [0.8, 1.2], [-0.8, 1.2]]) assert.ok(!inside(SANTA_SPOT.x + dx, SANTA_SPOT.z + dz), 'room in front of Santa to talk to him');
});

test('holidays: the villagers keep out of Santa’s corner and the sleigh’s way in', async () => {
  const { christmasKeepOut, SANTA_SPOT, SLEIGH_PARKED } = await import('../src/shared/seasons.js');
  const zones = christmasKeepOut(SANTA_SPOT);
  const kept = (x, z) => zones.some((s) => Math.hypot(s.x - x, s.z - z) < s.r);
  assert.ok(kept(SANTA_SPOT.x, SANTA_SPOT.z) && kept(SANTA_SPOT.x + 2.6, SANTA_SPOT.z - 1.2), 'Santa and his tree');
  const s = Math.sin(SLEIGH_PARKED.rot), c = Math.cos(SLEIGH_PARKED.rot);
  for (let back = 0; back <= 14; back += 1) assert.ok(kept(SANTA_SPOT.x + SLEIGH_PARKED.x - s * back, SANTA_SPOT.z + SLEIGH_PARKED.z - c * back), `the sleigh's way in, ${back} back`);
});
