// Little things tucked against dungeon walls so every biome looks different (looks only, no
// collision). A biome theme picks one with `deco` (see THEMES in LocationView.js).
//
// Each entry: { light: colour of the few real lights placed among them (or null),
//               build(g, r) — add meshes to group `g` (it stands on the floor, against a wall);
//                             `r` is a stable 0..1 random number for this spot,
//               update?(g, t) — optional animation }
import * as THREE from 'three';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
const glowing = (color, intensity = 0.9, extra = {}) => std(color, { emissive: color, emissiveIntensity: intensity, ...extra });
const mesh = (g, geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };

/** Pointy crystals in a cluster. */
function crystals(g, r, color, emissive) {
  const m = std(color, { emissive, emissiveIntensity: 0.8, roughness: 0.1, transparent: true, opacity: 0.85, flatShading: true });
  for (let i = 0; i < 3; i++) {
    const h = 0.8 + ((r * 7 + i) % 1) * 1.2;
    const c = mesh(g, new THREE.ConeGeometry(0.22, h, 5), m, (i - 1) * 0.3, h / 2, (i % 2) * 0.2);
    c.rotation.z = (i - 1) * 0.3;
  }
}

export const DECORATIONS = {
  ice: { light: 0x7fd4ff, build: (g, r) => crystals(g, r, 0x9fe8ff, 0x3a9fd8) },
  crystal: { light: 0xc08aff, build: (g, r) => crystals(g, r, 0xd8b8ff, 0x8a4ae0) },
  pearls: {
    light: 0xffd0e8,
    build(g, r) {
      const shell = std(0xffc8d8, { roughness: 0.4 });
      const half = mesh(g, new THREE.SphereGeometry(0.45, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), shell, 0, 0.05, 0);
      half.scale.set(1, 0.35, 1);
      mesh(g, new THREE.SphereGeometry(0.16, 16, 12), glowing(0xfff6ff, 0.5, { roughness: 0.15, metalness: 0.3 }), 0, 0.22, 0);
      if (r > 0.5) mesh(g, new THREE.SphereGeometry(0.1, 12, 8), glowing(0xfff0f8, 0.4), 0.5, 0.1, 0.2);
    },
  },
  mushroom: {
    light: 0xd08aff,
    build(g, r) {
      const colors = [0xff7ad9, 0x7affe8, 0xb48cff];
      for (let i = 0; i < 2 + Math.floor(r * 3); i++) {
        const h = 0.4 + ((r * 13 + i * 0.37) % 1) * 0.9, col = colors[(i + Math.floor(r * 3)) % 3];
        const stem = mesh(g, new THREE.CylinderGeometry(0.06, 0.09, h, 6), std(0xf5ead6), (i - 1) * 0.35, h / 2, (i % 2) * 0.25);
        mesh(g, new THREE.SphereGeometry(0.25 + h * 0.15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), glowing(col, 0.7), stem.position.x, h, stem.position.z);
      }
    },
  },
  ember: {
    light: 0xff7a2a,
    build(g) {
      const rock = std(0x3a2a24, { flatShading: true, roughness: 1 });
      const hot = glowing(0xff6a1a, 1.4);
      for (let i = 0; i < 3; i++) mesh(g, new THREE.DodecahedronGeometry(0.25 + i * 0.08, 0), i === 1 ? hot : rock, (i - 1) * 0.4, 0.15, (i % 2) * 0.2);
    },
  },
  bones: {
    light: 0xfff0c8,
    build(g, r) {
      const bone = std(0xf0e8d0);
      const skull = mesh(g, new THREE.SphereGeometry(0.22, 12, 10), bone, 0, 0.2, 0);
      skull.scale.set(1, 0.9, 1.1);
      for (const s of [-1, 1]) mesh(g, new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ color: 0x111111 }), s * 0.08, 0.24, 0.19);
      for (let i = 0; i < 3; i++) {
        const b = mesh(g, new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), bone, 0.3 + i * 0.12, 0.05, (i - 1) * 0.2);
        b.rotation.set(Math.PI / 2, 0, r * 3 + i);
      }
      if (r > 0.6) { // a candle stub
        mesh(g, new THREE.CylinderGeometry(0.06, 0.06, 0.25, 8), std(0xfff6d8), -0.4, 0.12, 0.1);
        mesh(g, new THREE.SphereGeometry(0.05, 8, 6), glowing(0xffc860, 2), -0.4, 0.3, 0.1);
      }
    },
  },
  webs: {
    light: 0xc8b8ff,
    build(g, r) {
      // a sticky web strung across the corner, and a spider egg sac
      const web = std(0xf0f0ff, { transparent: true, opacity: 0.5, side: THREE.DoubleSide, emissive: 0x333344 });
      const ring = (rad) => mesh(g, new THREE.RingGeometry(rad, rad + 0.02, 8), web, 0, 1.6, 0.05);
      for (const rad of [0.25, 0.5, 0.75]) ring(rad);
      for (let i = 0; i < 8; i++) {
        const s = mesh(g, new THREE.PlaneGeometry(0.02, 0.85), web, Math.cos(i * Math.PI / 4) * 0.42, 1.6 + Math.sin(i * Math.PI / 4) * 0.42, 0.05);
        s.rotation.z = i * Math.PI / 4 + Math.PI / 2;
      }
      if (r > 0.4) mesh(g, new THREE.SphereGeometry(0.25, 10, 8), std(0xe8e0f0, { roughness: 1 }), 0.4, 0.2, 0.2).scale.set(1, 1.3, 1);
    },
  },
  coins: {
    light: 0xffd060,
    build(g, r) {
      const gold = std(0xffd23f, { metalness: 0.8, roughness: 0.3, emissive: 0x664400, emissiveIntensity: 0.3 });
      const pile = mesh(g, new THREE.ConeGeometry(0.5 + r * 0.3, 0.4 + r * 0.3, 10), gold, 0, 0.2, 0);
      pile.scale.y = 0.8;
      for (let i = 0; i < 4; i++) {
        const c = mesh(g, new THREE.CylinderGeometry(0.1, 0.1, 0.03, 12), gold, Math.cos(i * 1.7) * 0.6, 0.02, Math.sin(i * 1.7) * 0.6);
        c.rotation.x = i * 0.3;
      }
      if (r > 0.65) mesh(g, new THREE.OctahedronGeometry(0.12, 0), glowing([0xff3d6e, 0x4dc3ff, 0x6dff8a][Math.floor(r * 30) % 3], 0.6), 0.1, 0.55, 0.05);
    },
  },
  wisps: {
    light: 0x9f7aff,
    build(g, r) {
      for (let i = 0; i < 2; i++) {
        const w = mesh(g, new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: r > 0.5 ? 0xb48cff : 0x7fd8ff, transparent: true, opacity: 0.8 }), (i - 0.5) * 0.6, 1.2, 0);
        w.userData.float = r * 10 + i * 2;
      }
    },
    update(g, t) { g.traverse((o) => { if (o.userData.float != null) o.position.y = 1.2 + Math.sin(t * 1.5 + o.userData.float) * 0.35; }); },
  },
  coral: {
    light: 0x7ff0ff,
    build(g, r) {
      const colors = [0xff7a8a, 0xff9ad5, 0xffb070, 0x7ad8ff];
      for (let i = 0; i < 3; i++) {
        const col = colors[(i + Math.floor(r * 4)) % 4];
        const h = 0.5 + ((r * 11 + i) % 1) * 0.8;
        const stalk = mesh(g, new THREE.CylinderGeometry(0.05, 0.09, h, 6), std(col), (i - 1) * 0.35, h / 2, (i % 2) * 0.15);
        for (const s of [-1, 1]) {
          const b = mesh(g, new THREE.CylinderGeometry(0.035, 0.05, h * 0.5, 6), std(col), stalk.position.x + s * 0.12, h * 0.65, stalk.position.z);
          b.rotation.z = -s * 0.6;
        }
        mesh(g, new THREE.SphereGeometry(0.07, 8, 6), glowing(0xffffff, 0.3), stalk.position.x, h + 0.04, stalk.position.z);
      }
    },
  },
  kelp: {
    light: 0x7aff9a,
    build(g, r) {
      for (let i = 0; i < 3; i++) {
        const strand = new THREE.Group();
        strand.position.set((i - 1) * 0.3, 0, (i % 2) * 0.2);
        const h = 1.2 + ((r * 7 + i) % 1) * 1.4;
        for (let k = 0; k < 6; k++) mesh(strand, new THREE.SphereGeometry(0.1, 6, 6), std(0x3f9a4a, { emissive: 0x0a3a14 }), 0, (k + 0.5) * (h / 6), 0).scale.set(0.8, 2.2, 0.4);
        strand.userData.sway = r * 10 + i;
        g.add(strand);
      }
    },
    update(g, t) { for (const s of g.children) if (s.userData.sway != null) s.rotation.z = Math.sin(t * 1.2 + s.userData.sway) * 0.15; },
  },
  books: {
    light: 0xcfe8ff,
    build(g, r) {
      const colors = [0x8a2a2a, 0x2a4a8a, 0x2a6a3a, 0x6a4a2a];
      for (let i = 0; i < 4 + Math.floor(r * 3); i++) {
        const b = mesh(g, new THREE.BoxGeometry(0.42, 0.1, 0.32), std(colors[i % 4]), (r - 0.5) * 0.2, 0.05 + i * 0.1, 0);
        b.rotation.y = (i * 0.37 + r) % 0.6 - 0.3;
      }
      if (r > 0.5) mesh(g, new THREE.SphereGeometry(0.12, 10, 8), glowing(0x9fe8ff, 1), 0.5, 1.4, 0); // a ghostly light
    },
  },
  banners: {
    light: 0xffb060,
    build(g, r) {
      // a standing brazier, with a banner on a pole behind it
      const iron = std(0x3d4148, { metalness: 0.6, roughness: 0.4 });
      mesh(g, new THREE.CylinderGeometry(0.05, 0.08, 1, 8), iron, 0, 0.5, 0);
      mesh(g, new THREE.CylinderGeometry(0.3, 0.18, 0.25, 10), iron, 0, 1.1, 0);
      mesh(g, new THREE.ConeGeometry(0.22, 0.45, 8), glowing(0xff8a2a, 1.5), 0, 1.4, 0);
      mesh(g, new THREE.CylinderGeometry(0.03, 0.03, 2.6, 6), iron, 0.6, 1.3, -0.1);
      const cloth = mesh(g, new THREE.PlaneGeometry(0.6, 1.2), std(r > 0.5 ? 0x7a1a2a : 0x2a1a5a, { side: THREE.DoubleSide }), 0.95, 1.9, -0.1);
      cloth.userData.wave = r * 10;
    },
    update(g, t) { g.traverse((o) => { if (o.userData.wave != null) o.rotation.y = Math.sin(t * 2 + o.userData.wave) * 0.15; }); },
  },
};
