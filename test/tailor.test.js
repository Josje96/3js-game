// Fancy clothes are a tailored top skinned onto the character's skeleton (client/tailor.js): every outfit
// must build one, bound only to real bones, with every vertex's weights adding up to 1.
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { CLOTHES } from '../src/shared/config.js';
import { COSTUMES } from '../src/client/cosmetics.js';
import { buildTailored } from '../src/client/tailor.js';

// a KayKit-shaped rig in its T-pose (bind positions measured from the game's characters)
function rig() {
  const at = {
    root: [0, 0, 0], hips: [0, 0.41, 0], spine: [0, 0.6, 0], chest: [0, 0.97, 0], head: [0, 1.24, 0],
    upperarml: [0.21, 1.11, 0], lowerarml: [0.45, 1.11, 0], wristl: [0.71, 1.11, 0], handl: [0.79, 1.11, 0],
    upperarmr: [-0.21, 1.11, 0], lowerarmr: [-0.45, 1.11, 0], wristr: [-0.71, 1.11, 0], handr: [-0.79, 1.11, 0],
  };
  const bones = Object.entries(at).map(([name, p]) => { const b = new THREE.Bone(); b.name = name; b.position.set(...p); return b; });
  const skeleton = new THREE.Skeleton(bones);
  const body = new THREE.SkinnedMesh(new THREE.BoxGeometry(0.8, 0.9, 0.7), new THREE.MeshStandardMaterial());
  body.bind(skeleton);
  return body;
}

describe('tailored clothes', () => {
  const extras = new Set([...Object.values(CLOTHES), ...Object.values(COSTUMES).map((c) => c.clothes)].map((c) => c.extra));
  extras.add('coat'); // winter's coat
  for (const extra of extras) {
    test(`${extra} builds a sound skinned top`, () => {
      const body = rig(), top = buildTailored(extra, 0x334455, 0xc0303a, body);
      expect(top).not.toBeNull();
      const g = top.geometry, pos = g.attributes.position.array, sw = g.attributes.skinWeight, si = g.attributes.skinIndex;
      expect(g.index.count).toBeGreaterThan(300);
      for (const v of pos) expect(Number.isFinite(v)).toBe(true);
      for (let i = 0; i < sw.count; i++) {
        expect(sw.getX(i) + sw.getY(i) + sw.getZ(i) + sw.getW(i)).toBeCloseTo(1, 4);
        expect(si.getX(i)).toBeLessThan(body.skeleton.bones.length);
      }
    });
  }
});
