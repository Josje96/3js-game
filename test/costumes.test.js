// Halloween costumes: every one builds, wears a real outfit style (not the suit-and-tie fallback),
// and the ghost is a sheet all the way down with the body hidden under it.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COSTUMES, HALLOWEEN_COSTUMES, buildCostumeHat } from '../src/client/cosmetics.js';
import { STYLES } from '../src/client/tailor.js';

test('costumes: each Halloween costume has a head piece and an outfit style of its own', () => {
  for (const id of ['skeleton', 'frankenstein', 'werewolf', 'ghost']) assert.ok(HALLOWEEN_COSTUMES.includes(id), `${id} is a costume`);
  for (const id of HALLOWEEN_COSTUMES) {
    const c = COSTUMES[id];
    assert.ok(c, `${id} is described`);
    let meshes = 0;
    buildCostumeHat(id).traverse((o) => { if (o.isMesh) meshes++; });
    assert.ok(meshes > 0, `${id} has a head piece`);
    if (c.clothes) assert.ok(STYLES[c.clothes.extra], `${id}: "${c.clothes.extra}" is a tailored style (an unknown one falls back to a suit and tie)`);
  }
});

test('costumes: the ghost is one sheet from the top of the head to just above the ground, body hidden', () => {
  assert.ok(COSTUMES.ghost.hideBody && COSTUMES.ghost.mask && COSTUMES.ghost.clothes === null);
  const box = new THREE.Box3().setFromObject(buildCostumeHat('ghost'));
  assert.ok(box.max.y > 0 && box.min.y < -2, 'from over the head down to the hem (hat frame: head 1 wide)');
});
