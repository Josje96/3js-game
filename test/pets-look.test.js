// Every pet species builds at every stage, animates, and stays light enough to draw.
// (The renderer isn't loaded in tests, but the models are plain three.js geometry.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { PetView } from '../src/client/pets.js';
import { triangles } from '../src/client/petkit.js';
import { PET_SPECIES, EVOLVE_AT, PET_MAX_LEVEL } from '../src/shared/pets.js';

test('pets: every species builds at every stage, animates, and has sane geometry', () => {
  for (const species of Object.keys(PET_SPECIES)) {
    for (const level of [1, ...EVOLVE_AT, PET_MAX_LEVEL]) {
      const pet = new PetView(species, level);
      for (const moving of [false, true]) for (let i = 0; i < 5; i++) { pet.t += 0.1; pet.animate(0.1, moving); }
      let meshes = 0;
      pet.root.traverse((o) => {
        if (!o.isMesh) return;
        meshes++;
        const pos = o.geometry.attributes.position.array;
        assert.ok(pos.every(Number.isFinite), `${species} Lv ${level}: a mesh has NaN positions`);
      });
      assert.ok(meshes > 0 && meshes < 40, `${species} Lv ${level}: ${meshes} meshes (bake() keeps this low)`);
      assert.ok(triangles(pet.root) < 40000, `${species} Lv ${level}: too many triangles`);
      if (pet.shape !== 'frog') assert.ok(pet.parts.head, `${species}: the animation needs a head`); // a frog hops whole
    }
  }
});
