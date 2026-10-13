// Mini bosses: beat a boss and a little one of it can be adopted at the Pet Keeper.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './helpers.js';
import { PET_SPECIES, isMiniPet } from '../src/shared/pets.js';
import { DUNGEONS } from '../src/shared/dungeons.js';
import { SEASONS } from '../src/shared/seasons.js';

test('mini bosses: one for every dungeon and seasonal boss, each unlocked by beating it', () => {
  const minis = Object.entries(PET_SPECIES).filter(([id]) => isMiniPet(id));
  const bosses = Object.values(DUNGEONS).reduce((n, d) => n + d.biomes.length, 0) + SEASONS.length;
  assert.equal(minis.length, bosses);
  for (const [id, def] of minis) assert.ok(def.unlock && def.price > 0 && def.forms.length === 3, id);
});

test('mini bosses: locked until the family beats the boss, then anyone can adopt one', () => {
  const { server, save, p, c } = world('mini', 'kid');
  server.travel(p.kid, 'town');
  p.kid.gold = 10000;
  c.kid.say({ t: 'buyPet', species: 'mini_king', name: 'Kingy' });
  assert.ok(!p.kid.pets.some((x) => x.species === 'mini_king'), 'not before the Goblin King is beaten');
  save.flags.mineCleared = true;
  c.kid.say({ t: 'buyPet', species: 'mini_king', name: 'Kingy' });
  assert.ok(p.kid.pets.some((x) => x.species === 'mini_king'), 'a mini Goblin King');
  assert.equal(p.kid.gold, 10000 - PET_SPECIES.mini_king.price);
});
