// Furniture in the Family Fort (beds and decorations): `furniture` entities from the host.
// Models come from the KayKit pack (`model`) or are built here (`build`) — see shared/furniture.js.
import * as THREE from 'three';
import { FURNITURE } from '../shared/furniture.js';
import { cloneModel } from './assets.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
function box(parent, w, h, d, m, x, y, z) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  b.castShadow = b.receiveShadow = true;
  parent.add(b);
  return b;
}

/** Hand-made furniture the KayKit pack doesn't have. Each faces +z, standing on y = 0. */
export const FURNITURE_BUILDERS = {
  rug(def) {
    const g = new THREE.Group();
    const r = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), mat(def.color, { roughness: 1 }));
    r.rotation.x = -Math.PI / 2;
    r.scale.set(1.3, 0.85, 1);
    r.position.y = 0.06;
    r.receiveShadow = true;
    const edge = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.6, 40), mat(0xf2d27a, { roughness: 1 }));
    edge.rotation.x = -Math.PI / 2;
    edge.scale.copy(r.scale);
    edge.position.y = 0.065;
    g.add(r, edge);
    return g;
  },
  plant() {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.26, 0.55, 14), mat(0xc0703a));
    pot.position.y = 0.28;
    g.add(pot);
    const leaf = mat(0x4fae4a);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), leaf);
      l.position.set(Math.cos(a) * 0.22, 0.85 + (i % 3) * 0.18, Math.sin(a) * 0.22);
      l.scale.set(0.8, 1.2, 0.8);
      g.add(l);
    }
    g.traverse((o) => { o.castShadow = true; });
    return g;
  },
  lamp() {
    const g = new THREE.Group();
    box(g, 0.5, 0.06, 0.5, mat(0x3a2a1c), 0, 0.03, 0);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 8), mat(0x3a2a1c));
    pole.position.y = 1;
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.42, 0.5, 16, 1, true), mat(0xfff0c8, { emissive: 0xffc870, emissiveIntensity: 0.6, side: THREE.DoubleSide }));
    shade.position.y = 2;
    g.add(pole, shade);
    return g;
  },
  sofa() {
    const g = new THREE.Group();
    const cloth = mat(0x7a4ab0), wood = mat(0x5e3a20);
    box(g, 2.6, 0.5, 1.1, cloth, 0, 0.45, 0);
    box(g, 2.6, 0.9, 0.3, cloth, 0, 0.9, -0.42);
    for (const s of [-1, 1]) box(g, 0.3, 0.75, 1.1, cloth, s * 1.3, 0.6, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.12, 0.2, 0.12, wood, sx * 1.2, 0.1, sz * 0.4);
    for (const s of [-1, 1]) box(g, 1.2, 0.18, 0.9, mat(0x9a6ad0), s * 0.62, 0.78, 0.05); // cushions
    return g;
  },
  fireplace() {
    const g = new THREE.Group();
    const stone = mat(0x8a817a, { flatShading: true });
    box(g, 2.6, 2.2, 0.9, stone, 0, 1.1, -0.2);
    box(g, 1.4, 1.1, 0.95, mat(0x1a1210), 0, 0.6, -0.15);
    box(g, 2.9, 0.2, 1.1, mat(0x6b4a2c), 0, 2.25, -0.15);
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 8), mat(0xff8a2a, { emissive: 0xff6a1a, emissiveIntensity: 1.5 }));
    fire.position.set(0, 0.45, 0.1);
    fire.userData.flicker = true;
    g.add(fire);
    return g;
  },
  aquarium() {
    const g = new THREE.Group();
    box(g, 1.8, 0.7, 0.9, mat(0x5e3a20), 0, 0.35, 0);
    const water = box(g, 1.7, 0.9, 0.8, mat(0x6fc8ff, { transparent: true, opacity: 0.45, roughness: 0.1 }), 0, 1.15, 0);
    water.castShadow = false;
    const colors = [0xff8a2a, 0xffd23f, 0xff6bb5];
    for (let i = 0; i < 3; i++) {
      const fish = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat(colors[i], { emissive: colors[i], emissiveIntensity: 0.2 }));
      fish.scale.set(1.6, 1, 0.6);
      fish.position.set(-0.5 + i * 0.5, 1.0 + i * 0.15, 0);
      fish.userData.swim = i;
      g.add(fish);
    }
    return g;
  },
  petbed() {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.18, 10, 24), mat(0xc96a8a, { roughness: 1 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.18;
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 24), mat(0xffe0ea, { roughness: 1 }));
    cushion.position.y = 0.08;
    g.add(ring, cushion);
    return g;
  },
};

/** One piece of furniture. Beds get their owner's blanket colour and name. */
export class FurnitureView {
  constructor(e, makeLabel) {
    const def = FURNITURE[e.item] ?? {};
    this.root = new THREE.Group();
    this.inner = def.build ? FURNITURE_BUILDERS[def.build](def) : cloneModel(def.model ?? 'dungeon/box_small');
    this.root.add(this.inner);
    this.root.position.set(e.x, 0, e.z);
    this.root.rotation.y = e.rot ?? 0;
    if (def.light) {
      this.light = new THREE.PointLight(0xffc477, 8, 7, 1.6);
      this.light.position.y = 1.6;
      this.root.add(this.light);
    }
    if (e.item === 'bed') {
      // a quilt in the owner's colour over the KayKit bed, and their name on a little sign
      const quilt = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.16, 2.0), mat(e.blanket ?? 0xe0525a, { roughness: 1 }));
      quilt.position.set(0, 0.86, 0.45);
      quilt.castShadow = quilt.receiveShadow = true;
      this.root.add(quilt);
      this.label = makeLabel(`${e.ownerName}’s bed`, '#ffe9b0');
      this.label.scale.multiplyScalar(0.7);
      this.label.position.set(0, 2.4, -0.6);
      this.root.add(this.label);
    }
    this.t = Math.random() * 10;
  }
  apply(e) {
    this.root.position.set(e.x, 0, e.z);
    this.root.rotation.y = e.rot ?? this.root.rotation.y;
  }
  update(dt) {
    this.t += dt;
    if (this.light) this.light.intensity = 7 + Math.sin(this.t * 7) * 0.8 + Math.sin(this.t * 17) * 0.5;
    this.inner.traverse((o) => {
      if (o.userData.flicker) o.scale.set(1 + Math.sin(this.t * 13) * 0.1, 1 + Math.sin(this.t * 9) * 0.2, 1);
      if (o.userData.swim != null) { const i = o.userData.swim; o.position.x = Math.sin(this.t * 0.8 + i * 2) * 0.6; o.rotation.y = Math.cos(this.t * 0.8 + i * 2) > 0 ? 0 : Math.PI; }
    });
  }
  dispose() { this.root.removeFromParent(); }
}
