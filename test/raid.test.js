// The Shadow Raid: on the 5th day of every month the Shadow King's knights march on the fountain. Win: gold for
// every defender (and a banner the first time). Lose (or leave the town to them): the Shadow tax on the shops.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './helpers.js';
import { isRaidDay, RAID_DAY, RAID_ROUTE, SEASON_DAYS, holidayOf, isBossDay, salePrice, SHADOW_TAX, SHADOW_TAX_DAYS } from '../src/shared/seasons.js';
import { ENEMIES } from '../src/shared/dungeons.js';
import { FURNITURE } from '../src/shared/furniture.js';
import { blocked } from '../src/shared/physics.js';

const knights = (loc) => [...loc.entities.values()].filter((e) => e.type === 'slime' && e._home?.raid);

function raidDay(day, ...ids) {
  const w = world('raid', ...ids);
  w.save.day = day;
  w.server.step(0.05);
  w.town = w.server.getLocation('town');
  return w;
}
const toTown = (w) => { for (const p of Object.values(w.p)) w.server.travel(p, 'town'); };
const wait = (w, s) => { for (let t = 0; t < s; t += 0.5) w.server.step(0.5); };
const beat = (w, who) => { for (let i = 0; i < 30 && knights(w.town).length; i++) for (const k of knights(w.town)) w.server.hitSlime(w.p[who], w.town, k, 1e9); };

test('shadow raid: the 5th of every month (a season), never on a boss day or a holiday; knights and their Captain are warriors', () => {
  assert.ok(isRaidDay(RAID_DAY) && isRaidDay(RAID_DAY + SEASON_DAYS) && isRaidDay(RAID_DAY + SEASON_DAYS * 7));
  for (let d = 1; d <= SEASON_DAYS * 4; d++) if (isRaidDay(d)) assert.ok(!isBossDay(d) && !holidayOf(d), `day ${d}: a raid day of its own`);
  assert.equal(ENEMIES.shadowknight.body, 'warrior');
  assert.ok(ENEMIES.shadowcaptain.champion, 'the Captain leads them (a boss bar)');
  assert.ok(ENEMIES.shadowknight.hp < ENEMIES.sunknight.hp && ENEMIES.shadowknight.damage < ENEMIES.sunknight.damage, 'fairly easy');
  assert.ok(FURNITURE.raidbanner?.notForSale, 'the banner is only won');
});

test('shadow raid: they come once someone is in town, march along open road, and are beaten for gold and a banner', () => {
  const w = raidDay(RAID_DAY, 'mom', 'kid');
  for (const pt of RAID_ROUTE) assert.ok(!blocked(w.town.layout, pt.x, pt.z, 0.8), `the route is open road at ${pt.x},${pt.z}`);
  assert.equal(w.save.flags.raid.state, 'coming');
  assert.equal(knights(w.town).length, 0, 'not before anyone is there');
  toTown(w);
  wait(w, 14);
  const k = knights(w.town);
  assert.equal(w.save.flags.raid.state, 'on');
  assert.equal(k.length, 1 + Math.min(12, 4 + 2 * 2), 'more knights for a bigger family, and the Captain');
  assert.ok(k.some((e) => e.boss && e.variant === 'shadowcaptain'));
  const yard = k[0]._home, x0 = yard.x;
  wait(w, 4);
  assert.ok(yard.x < x0 - 3, 'the column marches west along the road towards the fountain');
  const gold = w.p.mom.gold;
  beat(w, 'mom');
  assert.equal(w.save.flags.raid.state, 'won');
  assert.ok(w.p.mom.gold > gold, 'a purse of gold for the defenders');
  assert.equal(w.save.house.owned.raidbanner, 1, 'and the banner, the first time');
  // next month's raid: beaten again, no second banner
  w.server.endDay('sleep');
  w.save.day = RAID_DAY + SEASON_DAYS;
  w.server.step(0.05);
  toTown(w);
  wait(w, 14);
  beat(w, 'kid');
  assert.equal(w.save.flags.raidWins, 2);
  assert.equal(w.save.house.owned.raidbanner, 1, 'one banner');
});

test('shadow raid: holding the fountain wins it for them, and the shops charge the Shadow tax for a few days', () => {
  const w = raidDay(RAID_DAY, 'mom');
  toTown(w);
  wait(w, 14);
  const f = w.town.layout.props.find((q) => q.build === 'fountain');
  w.p.mom.x = 20; w.p.mom.z = 20; // (nobody fighting them)
  for (let i = 0; i < 200 && w.save.flags.raid.state === 'on'; i++) { for (const e of knights(w.town)) { e.x = f.x + 2; e.z = f.z + 2; } w.server.step(0.5); }
  assert.equal(w.save.flags.raid.state, 'lost');
  assert.ok(knights(w.town).length > 0, 'they march off with the loot...');
  wait(w, 10);
  assert.equal(knights(w.town).length, 0, '...and are gone');
  const last = w.save.flags.shadowTax;
  assert.equal(last, RAID_DAY + SHADOW_TAX_DAYS - 1);
  assert.equal(salePrice(100, RAID_DAY + 1, w.save.flags), Math.ceil(100 * (1 + SHADOW_TAX)), 'dearer while the tax is on');
  assert.equal(salePrice(100, last + 1, w.save.flags), 100, 'and back to normal after');
});

test('shadow raid: nobody in town all day, they raid unopposed', () => {
  const w = raidDay(RAID_DAY, 'mom');
  w.server.endDay('sleep');
  w.server.step(0.05);
  assert.equal(w.save.flags.raid.state, 'lost');
  assert.equal(w.save.flags.shadowTax, w.save.day + SHADOW_TAX_DAYS - 1, 'the tax from today');
});
