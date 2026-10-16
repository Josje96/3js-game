// The Pet Keeper trains a young pet straight up to level 10, for 10,000 gold (only pets under level 10).
import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './helpers.js';
import { newPet, petMaxHp, TRAIN_TO, TRAIN_COST } from '../src/shared/pets.js';

test('pet training: 10,000 gold takes a young pet to level 10, in town, only under level 10', () => {
  const { server, c, p } = world('train', 'kid');
  const kid = p.kid;
  const pet = newPet('maple', 'Maple');
  kid.pets.push(pet);
  server.travel(kid, 'house');
  kid.gold = TRAIN_COST * 3;
  c.kid.say({ t: 'trainPet', id: pet.id });
  assert.equal(pet.level, 1, 'only at the Pet Keeper in town');
  server.travel(kid, 'town');
  kid.gold = TRAIN_COST - 1;
  c.kid.say({ t: 'trainPet', id: pet.id });
  assert.equal(pet.level, 1, 'too poor');
  kid.gold = TRAIN_COST * 2;
  c.kid.say({ t: 'trainPet', id: pet.id });
  assert.equal(pet.level, TRAIN_TO);
  assert.equal(kid.gold, TRAIN_COST);
  assert.equal(pet.hp, petMaxHp('maple', TRAIN_TO), 'grown up health');
  c.kid.say({ t: 'trainPet', id: pet.id });
  assert.equal(pet.level, TRAIN_TO, 'not past level 10');
  assert.equal(kid.gold, TRAIN_COST, 'and not charged');
});
