// Facial hair: its own spot in the mirror (the outfit's own, clean-shaven, or a beard), and older looks keep theirs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEARDS, FACES, STYLE_SLOTS, cleanLook } from '../src/shared/config.js';

test('beards: facial hair has its own spot, and a look saved before it keeps its beard', () => {
  assert.equal(STYLE_SLOTS.beard, BEARDS);
  for (const id of Object.keys(BEARDS)) assert.ok(FACES[id], `${id}: still a face id too (saved looks use it)`);
  assert.equal(cleanLook({}).beard, 'own', 'the outfit’s own beard by default');
  assert.equal(cleanLook({ beard: 'none' }).beard, 'none', 'clean-shaven');
  assert.equal(cleanLook({ beard: 'goatee' }).beard, 'goatee');
  assert.equal(cleanLook({ beard: 'nonsense' }).beard, 'own');
  assert.equal(cleanLook({ face: 'beard' }).face, 'beard', 'an old look with its beard in the face slot loads as it was');
});
