// How an enchanted weapon looks (levels in shared/enchant.js): it glows in its level's colour, gets
// bigger, and from +3 sparkles, from +4 burns with flickering flames along its length.
// The effects are children of the weapon, so they follow the hand through every swing.
import * as THREE from 'three';
import { ENCHANT_LOOKS } from '../shared/enchant.js';
import { glowTexture } from './effects.js';

const sprite = (color, opacity) => new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
}));

/** Dress up a weapon model for enchant `level` (1..5). Returns { update(time) } for the animation. */
export function enchantWeapon(obj, level) {
  const look = ENCHANT_LOOKS[Math.min(level, ENCHANT_LOOKS.length) - 1];
  if (!look) return null;
  // measure before scaling: effects are placed in the weapon's own (unscaled) space
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  const axis = size.x >= size.y && size.x >= size.z ? 'x' : size.y >= size.z ? 'y' : 'z';
  const along = (u) => mid.clone().setComponent(['x', 'y', 'z'].indexOf(axis), box.min[axis] + size[axis] * u);
  const len = size[axis] || 1;

  obj.scale.multiplyScalar(look.scale);
  const glow = new THREE.Color(look.glow);
  obj.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone(); // never touch the shared model's material
    for (const m of [o.material].flat()) if (m.emissive) { m.emissive.copy(glow); m.emissiveIntensity = look.strength * 0.7; }
  });

  const parts = [];
  const aura = sprite(look.glow, 0.25 + look.strength * 0.3); // a soft halo round the whole weapon
  aura.position.copy(mid);
  aura.scale.setScalar(len * 1.4);
  obj.add(aura);
  if (look.sparkles != null) {
    for (let i = 0; i < 7; i++) {
      const s = sprite(look.sparkles, 0.9);
      obj.add(s);
      parts.push({ s, u: 0.25 + (i / 7) * 0.75, a: i * 2.1, kind: 'sparkle' });
    }
  }
  if (look.flame != null) {
    for (let i = 0; i < 9; i++) {
      const s = sprite(i % 3 ? look.flame : 0xffffff, 0.8);
      obj.add(s);
      parts.push({ s, u: 0.3 + (i / 9) * 0.7, a: i * 1.7, kind: 'flame' });
    }
  }
  return {
    update(t) {
      aura.material.opacity = 0.25 + look.strength * 0.3 + Math.sin(t * 3) * 0.08;
      for (const p of parts) {
        const at = along(p.u);
        if (p.kind === 'sparkle') { // little lights circling the blade
          const r = len * 0.12;
          at.x += Math.cos(t * 2.5 + p.a) * r; at.z += Math.sin(t * 2.5 + p.a) * r;
          p.s.position.copy(at);
          p.s.scale.setScalar(len * 0.07 * (0.6 + 0.4 * Math.sin(t * 7 + p.a)));
        } else { // flames: flicker and lick upwards off the weapon
          const k = (t * 1.8 + p.a) % 1;
          at.y += k * len * 0.18;
          p.s.position.copy(at);
          p.s.scale.setScalar(len * (0.16 - k * 0.1) * (0.8 + 0.3 * Math.sin(t * 13 + p.a)));
          p.s.material.opacity = 0.85 * (1 - k);
        }
      }
    },
  };
}
