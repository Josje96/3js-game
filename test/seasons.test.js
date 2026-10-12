// Seasons: four of them, SEASON_DAYS days each; each season's boss visits town on its first day.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './helpers.js';
import { SEASONS, SEASON_DAYS, SEASON_ARENA, seasonOf, dayOfSeason, isBossDay } from '../src/shared/seasons.js';
import { ENEMIES } from '../src/shared/dungeons.js';
import { ITEMS, SHOP_STOCK, DROP_TIERS } from '../src/shared/items.js';

const bossIn = (loc) => [...loc.entities.values()].find((e) => e.seasonal);

test('seasons: spring, summer, autumn, winter, each SEASON_DAYS days, boss on day 1 of each', () => {
  assert.equal(SEASON_DAYS, 30);
  assert.deepEqual([1, 30, 31, 60, 61, 91, 120, 121].map((d) => seasonOf(d).id),
    ['spring', 'spring', 'summer', 'summer', 'autumn', 'winter', 'winter', 'spring']);
  assert.deepEqual([1, 2, 30, 31, 61, 91, 121].map(isBossDay), [true, false, false, true, true, true, true]);
  assert.equal(dayOfSeason(45), 15);
});

test('seasons: every boss is a real, tough enemy with a body, and its loot is epic (never in a shop or dungeon)', () => {
  const dropped = new Set(DROP_TIERS.flatMap((t) => t.items));
  for (const s of SEASONS) {
    const def = ENEMIES[s.boss];
    assert.ok(def?.body, `${s.boss} has a body`);
    assert.ok(def.hp >= 2000, `${s.boss} is very tough`);
    assert.ok(!def.summon || ENEMIES[def.summon], `${s.boss} summons a real enemy`);
    for (const id of s.loot) {
      assert.ok(ITEMS[id]?.epic, `${id} is epic`);
      assert.ok(ITEMS[id].sell >= 20000, `${id} is worth a fortune`);
      assert.ok(!SHOP_STOCK.includes(id) && !dropped.has(id), `${id} only comes from the boss`);
    }
  }
});

test('seasons: the boss is in town on its day only, stays in its yard, and leaves at the end of the day', () => {
  const { server, save, p } = world('season', 'mom');
  const town = server.getLocation('town');
  server.step(0.05);
  const boss = bossIn(town);
  assert.ok(boss, 'day 1: the spring boss is in town');
  assert.equal(boss.variant, 'bloomcolossus');
  assert.ok(boss.boss && boss._home, 'a leashed boss');
  // someone shopping at the market is left alone
  server.travel(p.mom, 'town');
  p.mom.x = 46; p.mom.z = 42;
  const hp = p.mom.hp;
  for (let i = 0; i < 100; i++) server.step(0.05);
  assert.equal(p.mom.hp, hp, 'the market is safe');
  assert.ok((boss.x - SEASON_ARENA.x) ** 2 + (boss.z - SEASON_ARENA.z) ** 2 < (SEASON_ARENA.r + 1) ** 2, 'stays in its yard');

  server.endDay('sleep');
  server.step(0.05);
  assert.equal(bossIn(town), undefined, 'gone the next day');
  save.day = 30;
  server.endDay('sleep');
  server.step(0.05);
  assert.equal(bossIn(town)?.variant, 'sunwyrm', 'day 31: summer’s boss');
});

test('seasons: beating the boss drops epic loot and gold for the fighters; it does not come back that day', () => {
  const { server, save, p } = world('beat', 'mom', 'kid');
  const town = server.getLocation('town');
  server.step(0.05);
  for (const x of Object.values(p)) { server.travel(x, 'town'); x.x = SEASON_ARENA.x + 6; x.z = SEASON_ARENA.z; }
  const boss = bossIn(town);
  server.hitSlime(p.mom, town, boss, 1e9);
  const drops = [...town.entities.values()].filter((e) => e.type === 'drop');
  const epics = drops.filter((d) => ITEMS[d.item]?.epic);
  assert.equal(epics.length, 2, 'one epic piece per fighter');
  for (const d of epics) assert.ok(SEASONS[0].loot.includes(d.item), 'from spring’s loot');
  assert.ok(drops.filter((d) => d.item === 'gold').reduce((n, d) => n + d.qty, 0) >= 3000, 'a pile of gold');
  assert.equal(save.flags.seasonBossBeaten, 1);
  server.syncSeasonBoss(town);
  assert.equal(bossIn(town), undefined, 'beaten for today');
});

test('seasons: the boss grows with the family', () => {
  const weak = world('weak', 'a');
  weak.server.step(0.05);
  const strong = world('strong', 'a');
  strong.save.players.a.level = 80;
  strong.p.a.level = 80;
  const town = strong.server.getLocation('town');
  for (const e of [...town.entities.values()]) if (e.seasonal) town.remove(e.id);
  strong.server.syncSeasonBoss(town);
  assert.ok(bossIn(town).maxHp > bossIn(weak.server.getLocation('town')).maxHp * 5);
});
