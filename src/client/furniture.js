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

const ball = (r, seg = 14) => new THREE.SphereGeometry(r, seg, Math.max(6, (seg * 0.7) | 0));
const cyl = (rt, rb, h, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg);
/** Add a mesh to a builder's group: position, optional [sx, sy, sz] scale. */
function add(g, geo, m, x = 0, y = 0, z = 0, scale = null) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  if (scale) o.scale.set(...scale);
  o.castShadow = o.receiveShadow = true;
  g.add(o);
  return o;
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
  clock() { // a tall case with a round face and a slowly ticking pendulum
    const g = new THREE.Group();
    const wood = mat(0x5e3a20), gold = mat(0xffd23f, { metalness: 0.6, roughness: 0.3 });
    box(g, 0.5, 2.3, 0.3, wood, 0, 1.15, 0);
    box(g, 0.56, 0.1, 0.34, wood, 0, 2.35, 0);          // crown
    box(g, 0.3, 0.9, 0.05, mat(0x1e2430), 0, 0.75, 0.16); // the glass front over the pendulum
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 20), mat(0xfff6e0));
    face.rotation.x = Math.PI / 2;
    face.position.set(0, 1.9, 0.17);
    g.add(face);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.02, 6, 20), gold)).children.at(-1).position.set(0, 1.9, 0.18);
    const hand = box(g, 0.02, 0.14, 0.01, mat(0x222222), 0, 1.95, 0.21);
    hand.geometry.translate(0, -0.05, 0);
    const pendulum = box(g, 0.03, 0.7, 0.02, gold, 0, 0.45, 0.2);
    pendulum.geometry.translate(0, -0.35, 0);
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), gold);
    bob.position.set(0, -0.35, 0);
    pendulum.add(bob);
    g.userData.update = (t) => { pendulum.rotation.z = Math.sin(t * 2.4) * 0.25; hand.rotation.z = -(t * 0.5) % (Math.PI * 2); };
    return g;
  },
  toybox() { // a chest of toys: a ball, a little duck, blocks spilling over the rim
    const g = new THREE.Group();
    const wood = mat(0x8a5a34);
    box(g, 0.9, 0.55, 0.6, wood, 0, 0.28, 0);
    box(g, 0.94, 0.08, 0.64, mat(0x6b4423), 0, 0.53, 0);   // rim
    const lid = box(g, 0.94, 0.07, 0.64, mat(0xa06a3e), 0, 0.72, -0.28);
    lid.rotation.x = -0.9;                                 // open, leaning back
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), mat(0xe0525a));
    ball.position.set(0.2, 0.62, 0.08);
    g.add(ball);
    const duck = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat(0xf2cf3d));
    body.scale.set(1.2, 0.9, 1);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0xf2cf3d));
    head.position.set(0.08, 0.08, 0);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 4), mat(0xe08a3a));
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.15, 0.08, 0);
    duck.add(body, head, beak);
    duck.position.set(-0.18, 0.62, 0.05);
    g.add(duck);
    for (const [x, z, c] of [[-0.05, 0.24, 0x4f8ce0], [0.08, 0.26, 0x5cc06a], [-0.02, 0.15, 0xf2884a]]) {
      box(g, 0.08, 0.08, 0.08, mat(c), x, 0.58, z).rotation.y = x * 7;
    }
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
  // ---- the luxury collection
  armchair(def) { // a wingback in deep velvet on little gold feet
    const g = new THREE.Group();
    const velvet = mat(def.color, { roughness: 0.95 }), gold = mat(0xe0b84a, { metalness: 0.7, roughness: 0.3 });
    box(g, 1.2, 0.35, 1.0, velvet, 0, 0.4, 0);               // seat
    box(g, 1.05, 0.14, 0.85, mat(0xb84a5a, { roughness: 1 }), 0, 0.63, 0.06); // cushion
    box(g, 1.2, 1.3, 0.25, velvet, 0, 0.95, -0.42);          // back
    for (const s of [-1, 1]) {
      box(g, 0.22, 0.55, 1.0, velvet, s * 0.6, 0.72, 0);     // arms
      box(g, 0.25, 0.85, 0.35, velvet, s * 0.55, 1.25, -0.3); // wings
      for (const z of [-0.38, 0.38]) box(g, 0.1, 0.22, 0.1, gold, s * 0.5, 0.11, z);
    }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.25, 20, 1, false, -Math.PI / 2, Math.PI), velvet);
    top.rotation.z = Math.PI / 2;
    top.rotation.y = Math.PI / 2;
    top.position.set(0, 1.6, -0.42);
    top.scale.set(1, 1, 0.5);
    g.add(top);
    return g;
  },
  vase() { // blue-and-white porcelain with a spray of flowers
    const g = new THREE.Group();
    const pts = [[0, 0], [0.2, 0.02], [0.32, 0.25], [0.36, 0.55], [0.26, 0.85], [0.14, 1.0], [0.17, 1.12], [0.15, 1.15]].map(([x, y]) => new THREE.Vector2(x, y));
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), mat(0xf6f6fa, { roughness: 0.25 }));
    body.castShadow = true;
    g.add(body);
    for (const [y, r] of [[0.3, 0.335], [0.62, 0.34]]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 6, 28), mat(0x2a4aa0, { roughness: 0.3 }));
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      g.add(band);
    }
    const colors = [0xff7aa8, 0xffe066, 0xffffff, 0xb48cff];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, stem = box(g, 0.02, 0.5, 0.02, mat(0x4f8a3a), Math.cos(a) * 0.08, 1.35, Math.sin(a) * 0.08);
      stem.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat(colors[i % colors.length]));
      bloom.position.set(Math.cos(a) * 0.2, 1.6, Math.sin(a) * 0.2);
      g.add(bloom);
    }
    return g;
  },
  candelabra() { // a tall gold candle stand with five flames
    const g = new THREE.Group();
    const gold = mat(0xe0b84a, { metalness: 0.75, roughness: 0.25 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.35, 0.15, 16), gold);
    base.position.y = 0.08;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.8, 10), gold);
    stem.position.y = 1.0;
    g.add(base, stem);
    const wax = mat(0xfff6e0), flame = mat(0xffc04a, { emissive: 0xffa020, emissiveIntensity: 2 });
    for (let i = -2; i <= 2; i++) {
      const x = i * 0.25, y = 1.9 - Math.abs(i) * 0.08;
      if (i) box(g, Math.abs(x), 0.04, 0.04, gold, x / 2, y - 0.05, 0);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.06, 10), gold);
      cup.position.set(x, y, 0);
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.28, 8), wax);
      candle.position.set(x, y + 0.17, 0);
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 8), flame);
      f.position.set(x, y + 0.36, 0);
      f.userData.flicker = true;
      g.add(cup, candle, f);
    }
    return g;
  },
  globe() { // a slowly turning world on a wooden stand with a brass ring
    const g = new THREE.Group();
    const wood = mat(0x6b4423), brass = mat(0xd9a84a, { metalness: 0.7, roughness: 0.3 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2, leg = box(g, 0.06, 0.9, 0.06, wood, Math.cos(a) * 0.25, 0.45, Math.sin(a) * 0.25);
      leg.rotation.set(Math.sin(a) * -0.25, 0, Math.cos(a) * 0.25);
    }
    const c = document.createElement('canvas');
    c.width = 128; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#3a7ac8'; x.fillRect(0, 0, 128, 64);
    x.fillStyle = '#6ab04a';
    for (const [cx, cy, rx, ry] of [[24, 22, 14, 10], [30, 42, 8, 12], [64, 20, 12, 8], [70, 38, 10, 14], [100, 24, 18, 10], [108, 46, 8, 6]]) { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill(); }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const world = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
    world.position.y = 1.3;
    world.rotation.z = 0.4;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.025, 6, 32), brass);
    ring.position.y = 1.3;
    ring.rotation.set(0, Math.PI / 2, 0.4);
    g.add(world, ring);
    g.userData.update = (t) => { world.rotation.y = t * 0.4; };
    return g;
  },
  royalrug() { // a big crimson rug with a gold border and a medallion
    const g = new THREE.Group();
    const layer = (w, d, color, y) => {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color, { roughness: 1 }));
      r.rotation.x = -Math.PI / 2;
      r.position.y = y;
      r.receiveShadow = true;
      g.add(r);
    };
    layer(4.2, 2.8, 0xd9b24a, 0.06);
    layer(3.9, 2.5, 0x8a1e2e, 0.062);
    layer(3.5, 2.1, 0xb8344a, 0.064);
    const med = new THREE.Mesh(new THREE.CircleGeometry(0.7, 6), mat(0xd9b24a, { roughness: 1 }));
    med.rotation.x = -Math.PI / 2;
    med.position.y = 0.066;
    const inner = new THREE.Mesh(new THREE.CircleGeometry(0.45, 6), mat(0x24306a, { roughness: 1 }));
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.068;
    g.add(med, inner);
    for (const s of [-1, 1]) { // tassels
      for (let i = 0; i < 7; i++) box(g, 0.05, 0.02, 0.2, mat(0xf2d27a), -1.8 + i * 0.6, 0.06, s * 1.48);
    }
    return g;
  },
  library() { // a tall bookcase full of colourful books, gold trim on top
    const g = new THREE.Group();
    const wood = mat(0x4a2c18), gold = mat(0xe0b84a, { metalness: 0.7, roughness: 0.3 });
    box(g, 2.0, 2.8, 0.55, wood, 0, 1.4, -0.05);
    box(g, 2.15, 0.12, 0.62, gold, 0, 2.86, -0.05);
    const colors = [0xb8344a, 0x2a4aa0, 0x3a8a4a, 0xd9a84a, 0x6a2a8a, 0xe08a3a, 0x2a2a3a];
    for (let shelf = 0; shelf < 4; shelf++) {
      const y = 0.25 + shelf * 0.65;
      box(g, 1.85, 0.05, 0.4, mat(0x6b4423), 0, y - 0.03, 0.08);
      let x = -0.85;
      for (let i = 0; x < 0.82; i++) {
        const w = 0.07 + ((shelf * 7 + i * 3) % 4) * 0.02, h = 0.4 + ((shelf + i * 5) % 3) * 0.06;
        box(g, w, h, 0.32, mat(colors[(shelf * 3 + i) % colors.length]), x + w / 2, y + h / 2, 0.1);
        x += w + 0.01;
      }
    }
    return g;
  },
  harp() { // a golden concert harp with shimmering strings
    const g = new THREE.Group();
    const gold = mat(0xe0b84a, { metalness: 0.75, roughness: 0.25 });
    box(g, 0.5, 0.12, 0.4, gold, 0, 0.06, 0);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.0, 10), gold);
    pillar.position.set(-0.35, 1.05, 0);
    g.add(pillar);
    const body = box(g, 0.18, 1.9, 0.22, gold, 0.25, 1.0, 0);
    body.rotation.z = -0.3;
    const neck = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 20, Math.PI), gold);
    neck.position.set(0.05, 1.95, 0);
    g.add(neck);
    const string = mat(0xfff6d8, { emissive: 0xffe9a0, emissiveIntensity: 0.3 });
    for (let i = 0; i < 9; i++) {
      const x = -0.28 + i * 0.06, h = 1.5 - i * 0.1;
      box(g, 0.012, h, 0.012, string, x, 0.2 + h / 2 + i * 0.05, 0).castShadow = false;
    }
    return g;
  },
  statue() { // a marble knight on a plinth, sword planted in front
    const g = new THREE.Group();
    const marble = mat(0xeeeae2, { roughness: 0.35 });
    box(g, 1.2, 0.5, 1.2, mat(0xb8b2a8, { roughness: 0.6 }), 0, 0.25, 0);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 4, 12), marble);
    body.position.y = 1.2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), marble);
    head.position.y = 2.05;
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 8), marble);
    plume.position.y = 2.42;
    g.add(body, head, plume);
    box(g, 0.08, 0.95, 0.04, marble, 0, 1.0, 0.45);            // sword blade
    box(g, 0.35, 0.06, 0.06, marble, 0, 1.48, 0.45);           // crossguard
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 16), marble);
    shield.rotation.z = Math.PI / 2;
    shield.position.set(-0.4, 1.2, 0.1);
    g.add(shield);
    g.traverse((o) => { o.castShadow = true; });
    return g;
  },
  fountain() { // two stone basins with water spilling from the top
    const g = new THREE.Group();
    const stone = mat(0xd8d2c6, { roughness: 0.6 }), water = mat(0x6fc8ff, { transparent: true, opacity: 0.75, roughness: 0.1, emissive: 0x1a4a6a, emissiveIntensity: 0.3 });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.45, 24), stone);
    basin.position.y = 0.22;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.98, 24), water);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.47; // just over the rim
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.1, 12), stone);
    pillar.position.y = 0.85;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.22, 0.22, 20), stone);
    bowl.position.y = 1.45;
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.44, 20), water);
    top.rotation.x = -Math.PI / 2;
    top.position.y = 1.58;
    g.add(basin, pool, pillar, bowl, top);
    const drops = [];
    for (let i = 0; i < 10; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), water);
      d.userData.a = (i / 10) * Math.PI * 2;
      g.add(d);
      drops.push(d);
    }
    g.userData.update = (t) => {
      for (const d of drops) {
        const u = (t * 0.8 + d.userData.a) % 1, r = 0.45 + u * 0.4;
        d.position.set(Math.cos(d.userData.a) * r, 1.58 - u * u * 1.1, Math.sin(d.userData.a) * r);
      }
    };
    return g;
  },
  piano() { // a black grand piano, lid propped open, with its bench
    const g = new THREE.Group();
    const black = mat(0x2a2a34, { roughness: 0.3 }), trim = mat(0xe0b84a, { metalness: 0.7, roughness: 0.3 });
    const outline = new THREE.Shape();
    outline.moveTo(-0.8, 0.6);
    outline.lineTo(0.8, 0.6);
    outline.lineTo(0.8, -0.2);
    outline.bezierCurveTo(0.8, -1.2, 0.2, -1.0, 0.0, -1.6);
    outline.bezierCurveTo(-0.3, -2.1, -0.8, -1.8, -0.8, -1.2);
    outline.closePath();
    const bodyGeo = new THREE.ExtrudeGeometry(outline, { depth: 0.4, bevelEnabled: false });
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, black);
    body.position.y = 1.0;
    body.castShadow = true;
    g.add(body);
    const lid = new THREE.Mesh(new THREE.ShapeGeometry(outline), black);
    lid.geometry.rotateX(-Math.PI / 2);
    lid.position.set(0.8, 1.02, 0);
    lid.rotation.z = 0.6;
    lid.geometry.translate(-0.8, 0, 0);
    g.add(lid);
    box(g, 1.62, 0.05, 0.05, trim, 0, 1.02, 0.62);           // gold edge over the keys
    box(g, 1.6, 0.08, 0.25, mat(0xf6f6f0), 0, 0.9, 0.72);    // white keys
    for (let i = 0; i < 11; i++) box(g, 0.06, 0.05, 0.14, black, -0.7 + i * 0.14, 0.95, 0.67);
    for (const [x, z] of [[-0.65, 0.4], [0.65, 0.4], [-0.2, -1.3]]) box(g, 0.12, 0.6, 0.12, black, x, 0.3, z);
    box(g, 0.9, 0.1, 0.4, black, 0, 0.5, 1.35);              // bench
    for (const x of [-0.38, 0.38]) box(g, 0.08, 0.45, 0.3, black, x, 0.22, 1.35);
    return g;
  },
  throne() { // gold frame, red velvet, a crown on the tall back
    const g = new THREE.Group();
    const gold = mat(0xe8c45a, { metalness: 0.8, roughness: 0.25 }), velvet = mat(0xa01e32, { roughness: 0.95 });
    box(g, 1.3, 0.5, 1.1, gold, 0, 0.25, 0);
    box(g, 1.1, 0.14, 0.95, velvet, 0, 0.56, 0.05);
    box(g, 1.3, 2.2, 0.25, gold, 0, 1.35, -0.45);
    box(g, 1.0, 1.7, 0.08, velvet, 0, 1.4, -0.31);
    for (const s of [-1, 1]) {
      box(g, 0.18, 0.5, 1.0, gold, s * 0.64, 0.75, 0);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), gold);
      knob.position.set(s * 0.64, 1.05, 0.42);
      g.add(knob);
    }
    const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), mat(0x3a8aff, { emissive: 0x1a4aaa, emissiveIntensity: 0.6 }));
    jewel.position.set(0, 2.2, -0.31);
    g.add(jewel);
    for (const x of [-0.45, 0, 0.45]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 6), gold);
      spike.position.set(x, 2.6, -0.45);
      g.add(spike);
    }
    return g;
  },
  // ---- the luxury collection, part 2
  rockinghorse() { // a dappled wooden horse on rockers, rocking gently
    const g = new THREE.Group(), horse = new THREE.Group();
    const wood = mat(0x8a5a34), white = mat(0xf2ece0), red = mat(0xc0393b), gold = mat(0xe0b84a, { metalness: 0.7, roughness: 0.3 });
    for (const x of [-0.25, 0.25]) {
      const rocker = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.05, 6, 24, 0.9), wood);
      rocker.rotation.set(0, Math.PI / 2, -Math.PI / 2 - 0.45);
      rocker.position.set(x, 1.45, 0);
      horse.add(rocker);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(horse, 0.1, 0.55, 0.1, white, sx * 0.18, 0.38, sz * 0.4).rotation.x = sz * -0.15;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.7, 4, 12), white);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.8;
    const neck = box(horse, 0.22, 0.55, 0.26, white, 0, 1.15, 0.45);
    neck.rotation.x = 0.4;
    const head = box(horse, 0.22, 0.24, 0.45, white, 0, 1.38, 0.68);
    head.rotation.x = 0.3;
    const mane = box(horse, 0.08, 0.6, 0.12, mat(0x4a2c18), 0, 1.22, 0.33);
    mane.rotation.x = 0.4;
    for (const x of [-0.07, 0.07]) box(horse, 0.06, 0.12, 0.04, white, x, 1.55, 0.55);  // ears
    for (const x of [-0.12, 0.12]) box(horse, 0.03, 0.05, 0.05, mat(0x222222), x, 1.42, 0.72); // eyes
    box(horse, 0.5, 0.06, 0.5, red, 0, 1.06, -0.05);                                      // saddle
    for (const x of [-0.26, 0.26]) box(horse, 0.03, 0.25, 0.08, gold, x, 0.92, -0.05);     // stirrups
    const tail = box(horse, 0.08, 0.45, 0.1, mat(0x4a2c18), 0, 0.75, -0.6);
    tail.rotation.x = -0.4;
    horse.add(body);
    // dapples
    for (const [x, y, z] of [[0.24, 0.85, 0.2], [-0.24, 0.8, -0.1], [0.23, 0.75, -0.3], [-0.24, 0.9, 0.25]]) {
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.06, 10), mat(0xb8b0a4));
      d.position.set(x * 1.03, y, z);
      d.rotation.y = Math.sign(x) * Math.PI / 2;
      horse.add(d);
    }
    g.add(horse);
    g.userData.update = (t) => { horse.rotation.x = Math.sin(t * 2) * 0.12; };
    return g;
  },
  mirror() { // a tall oval looking-glass in a gold frame
    const g = new THREE.Group();
    const gold = mat(0xe0b84a, { metalness: 0.7, roughness: 0.3 });
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), mat(0xdfe8f0, { roughness: 0.05, metalness: 0.2, emissive: 0x9ab0c8, emissiveIntensity: 0.3 }));
    glass.scale.set(1, 1.6, 1);
    glass.position.set(0, 1.45, 0.02);
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.06, 8, 32), gold);
    frame.scale.set(1, 1.6, 1);
    frame.position.set(0, 1.45, 0.02);
    const back = new THREE.Mesh(new THREE.CircleGeometry(0.52, 32), mat(0x4a2c18));
    back.scale.set(1, 1.6, 1);
    back.rotation.y = Math.PI;
    back.position.set(0, 1.45, 0.01);
    g.add(glass, frame, back);
    for (const [x, r] of [[-0.15, 0.6], [0.05, 0.6]]) { // a glint across the glass
      const shine = box(g, 0.06, 0.6, 0.005, mat(0xffffff, { transparent: true, opacity: 0.5 }), x, 1.6, 0.03);
      shine.rotation.z = r;
      shine.castShadow = false;
    }
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 4), gold);
    crest.position.set(0, 2.36, 0.02);
    g.add(crest);
    for (const s of [-1, 1]) {
      const leg = box(g, 0.07, 0.75, 0.07, gold, s * 0.3, 0.37, 0);
      leg.rotation.z = s * 0.15;
      box(g, 0.1, 0.05, 0.5, gold, s * 0.36, 0.03, 0);
    }
    return g;
  },
  birdcage() { // a domed golden cage on a stand, with a canary hopping on its perch
    const g = new THREE.Group();
    const gold = mat(0xe0b84a, { metalness: 0.7, roughness: 0.3 });
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 0.08, 14), gold);
    foot.position.y = 0.04;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 8), gold);
    pole.position.y = 0.6;
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 20), gold);
    floor.position.y = 1.15;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xe0b84a, { metalness: 0.7, roughness: 0.3, wireframe: true }));
    dome.position.y = 1.85;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 14), gold);
    hook.position.y = 2.33;
    g.add(foot, pole, floor, dome, hook);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 4), gold);
      bar.position.set(Math.cos(a) * 0.41, 1.5, Math.sin(a) * 0.41);
      g.add(bar);
    }
    const perch = box(g, 0.5, 0.025, 0.025, mat(0x8a5a34), 0, 1.45, 0);
    perch.castShadow = false;
    const bird = new THREE.Group(), yellow = mat(0xffd23f);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), yellow);
    body.scale.set(0.9, 1, 1.3);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), yellow);
    head.position.set(0, 0.09, 0.07);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 4), mat(0xf2884a));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.09, 0.14);
    const tail = box(bird, 0.06, 0.02, 0.1, yellow, 0, 0.0, -0.13);
    tail.rotation.x = -0.4;
    bird.add(body, head, beak);
    bird.position.y = 1.55;
    g.add(bird);
    g.userData.update = (t) => {
      const hop = Math.max(0, Math.sin(t * 3));
      bird.position.y = 1.55 + hop * hop * 0.08;
      bird.position.x = Math.sin(t * 0.5) * 0.12;
      bird.rotation.y = Math.sin(t * 0.7) * 1.2;
    };
    return g;
  },
  musicbox() { // a music box on a little round table, lid open, ballerina twirling
    const g = new THREE.Group();
    const wood = mat(0x6b4423), gold = mat(0xe0b84a, { metalness: 0.7, roughness: 0.3 }), pink = mat(0xff9fc0);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 20), wood);
    top.position.y = 0.85;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.82, 10), wood);
    leg.position.y = 0.42;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.28, 0.06, 14), wood);
    foot.position.y = 0.03;
    g.add(top, leg, foot);
    box(g, 0.5, 0.22, 0.36, pink, 0, 0.99, 0);
    box(g, 0.52, 0.03, 0.38, gold, 0, 1.1, 0);
    const lid = box(g, 0.5, 0.04, 0.36, pink, 0, 1.12, -0.18);
    lid.geometry.translate(0, 0, 0.18);
    lid.position.set(0, 1.12, -0.18);
    lid.rotation.x = -1.9;                                      // swung open, leaning back
    const lidMirror = box(g, 0.4, 0.28, 0.005, mat(0xdfe8f0, { emissive: 0x9ab0c8, emissiveIntensity: 0.3 }), 0, 1.26, -0.17);
    lidMirror.rotation.x = 0.33;
    const dancer = new THREE.Group();
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.06, 12), mat(0xffd6e4));
    skirt.position.y = 0.08;
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.08, 8), pink);
    torso.position.y = 0.14;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mat(0xf2c8a0));
    head.position.y = 0.2;
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6), mat(0xf2c8a0));
    legs.position.y = 0.03;
    const arms = box(dancer, 0.14, 0.012, 0.012, mat(0xf2c8a0), 0, 0.2, 0);
    arms.castShadow = false;
    dancer.add(skirt, torso, head, legs);
    dancer.position.set(0, 1.12, 0.03);
    g.add(dancer);
    g.userData.update = (t) => { dancer.rotation.y = t * 2; };
    return g;
  },
  teaset() { // a lace-clothed table with a teapot, cups and a three-tier cake stand
    const g = new THREE.Group();
    const cloth = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.82, 0.8, 24), mat(0xfff8f0, { roughness: 1 }));
    cloth.position.y = 0.4;
    cloth.castShadow = true;
    const lace = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.03, 6, 32), mat(0xf6d8e4));
    lace.rotation.x = Math.PI / 2;
    lace.position.y = 0.05;
    g.add(cloth, lace);
    const china = mat(0xffffff, { roughness: 0.25 }), gold = mat(0xe0b84a, { metalness: 0.7, roughness: 0.3 }), blue = mat(0x6a9ae0, { roughness: 0.3 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 6), gold);
    pole.position.set(0.15, 1.07, -0.1);
    g.add(pole);
    const cakes = [0xff9fc0, 0xffe066, 0xb48cff, 0x9ae0b0, 0xffb07a];
    for (const [i, [y, r]] of [[0.85, 0.24], [1.05, 0.18], [1.25, 0.12]].entries()) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, 0.02, 18), china);
      plate.position.set(0.15, y, -0.1);
      g.add(plate);
      const n = 5 - i;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2, cake = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.045, 10), mat(cakes[(k + i) % cakes.length]));
        cake.position.set(0.15 + Math.cos(a) * r * 0.6, y + 0.035, -0.1 + Math.sin(a) * r * 0.6);
        g.add(cake);
      }
    }
    const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat(0xe0303a));
    cherry.position.set(0.15, 1.37, -0.1);
    g.add(cherry);
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), blue);
    pot.scale.set(1, 0.85, 1);
    pot.position.set(-0.3, 0.93, 0.05);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), gold);
    lid.position.set(-0.3, 1.07, 0.05);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.18, 8), blue);
    spout.rotation.z = -0.9;
    spout.position.set(-0.13, 0.97, 0.05);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 12), blue);
    handle.position.set(-0.46, 0.94, 0.05);
    g.add(pot, lid, spout, handle);
    for (const [x, z] of [[0.35, 0.45], [-0.35, 0.45], [0, 0.55]]) {
      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.015, 14), china);
      saucer.position.set(x, 0.81, z);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.06, 12), china);
      cup.position.set(x, 0.85, z);
      g.add(saucer, cup);
    }
    return g;
  },
  bearrug() { // a big friendly bear lying flat, paws out, head up and smiling
    const g = new THREE.Group();
    const fur = mat(0x6b4423, { roughness: 1 }), dark = mat(0x3a2414, { roughness: 1 }), claw = mat(0xf2ece0);
    const flat = (geo, m, x, z, sx = 1, sz = 1, y = 0.06) => {
      const o = new THREE.Mesh(geo, m);
      o.rotation.x = -Math.PI / 2;
      o.scale.set(sx, sz, 1);
      o.position.set(x, y, z);
      o.receiveShadow = true;
      g.add(o);
      return o;
    };
    flat(new THREE.CircleGeometry(0.9, 28), fur, 0, -0.2, 1, 1.3);
    flat(new THREE.CircleGeometry(0.6, 24), mat(0x8a5a34, { roughness: 1 }), 0, -0.2, 1, 1.3, 0.062); // lighter belly
    for (const sx of [-1, 1]) for (const [z, a] of [[0.55, 0.6], [-1.0, -0.6]]) {
      const leg = flat(new THREE.CircleGeometry(0.3, 14), fur, sx * 0.85, z, 1.6, 0.8);
      leg.rotation.z = -sx * a;                             // front paws reach forward, back paws back
      const dx = sx * Math.cos(a), dz = Math.sign(z) * Math.abs(Math.sin(a));
      for (let k = -1; k <= 1; k++) {                       // three claws at the tip of each paw
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), claw);
        c.scale.set(1, 0.6, 1);
        c.position.set(sx * 0.85 + dx * 0.5 - dz * k * 0.1, 0.07, z + dz * 0.5 + dx * k * 0.1);
        g.add(c);
      }
    }
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), fur);
    tail.scale.set(1, 0.4, 1);
    tail.position.set(0, 0.07, -1.45);
    g.add(tail);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), fur);
    head.scale.set(1, 0.75, 0.95);
    head.position.set(0, 0.3, 1.05);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), mat(0xc49a6a, { roughness: 1 }));
    snout.scale.set(1.1, 0.75, 1);
    snout.position.set(0, 0.22, 1.42);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(0x1a1210, { roughness: 0.3 }));
    nose.position.set(0, 0.3, 1.6);
    g.add(head, snout, nose);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), fur);
      ear.scale.set(1, 1, 0.5);
      ear.position.set(s * 0.32, 0.58, 0.95);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), dark);
      inner.scale.set(1, 1, 0.4);
      inner.position.set(s * 0.32, 0.58, 1.0);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(0x1a1210, { roughness: 0.2 }));
      eye.position.set(s * 0.16, 0.42, 1.38);
      g.add(ear, inner, eye);
    }
    head.castShadow = snout.castShadow = true;
    return g;
  },
  tapestry() { // a tall banner on a wooden stand: a gold crown on royal blue
    const g = new THREE.Group();
    const wood = mat(0x4a2c18), gold = mat(0xe0b84a, { metalness: 0.7, roughness: 0.3 });
    for (const s of [-1, 1]) {
      box(g, 0.1, 2.9, 0.1, wood, s * 0.8, 1.45, -0.1);
      box(g, 0.14, 0.06, 0.6, wood, s * 0.8, 0.03, -0.1);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), gold);
      knob.position.set(s * 0.8, 2.95, -0.1);
      g.add(knob);
    }
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 8), gold);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, 2.7, -0.05);
    g.add(rod);
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#24306a'; x.fillRect(0, 0, 128, 256);
    x.strokeStyle = '#e8c45a'; x.lineWidth = 6; x.strokeRect(8, 8, 112, 222);
    x.fillStyle = '#e8c45a';
    x.beginPath(); x.moveTo(30, 120); x.lineTo(30, 80); x.lineTo(46, 100); x.lineTo(64, 70); x.lineTo(82, 100); x.lineTo(98, 80); x.lineTo(98, 120); x.closePath(); x.fill();
    x.fillRect(30, 124, 68, 12);
    x.fillStyle = '#d0304a';
    for (const cx of [46, 64, 82]) { x.beginPath(); x.arc(cx, 130, 4, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = '#f6e2a0';
    for (const [sx, sy] of [[32, 40], [96, 40], [64, 175], [36, 200], [92, 200]]) {
      x.beginPath();
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 4 : 9; x.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); }
      x.fill();
    }
    x.globalCompositeOperation = 'destination-out'; // cut a pointed hem
    x.beginPath(); x.moveTo(0, 257); x.lineTo(0, 236); x.lineTo(64, 257); x.lineTo(128, 236); x.lineTo(128, 257); x.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.6, 1, 8), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, side: THREE.DoubleSide, alphaTest: 0.5 }));
    cloth.position.set(0, 1.4, -0.05);
    cloth.castShadow = true;
    g.add(cloth);
    for (const s of [-1, 1]) { // gold tassels on the rod ends
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 6), gold);
      t.position.set(s * 0.72, 2.52, -0.05);
      g.add(t);
    }
    const pos = cloth.geometry.attributes.position, base = Float32Array.from(pos.array);
    g.userData.update = (t) => { // a slow ripple, strongest at the hem
      for (let i = 0; i < pos.count; i++) {
        const y = base[i * 3 + 1], sway = (1.3 - y) / 2.6;
        pos.setZ(i, Math.sin(t * 1.5 + y * 2) * 0.05 * sway);
      }
      pos.needsUpdate = true;
    };
    return g;
  },
  telescope() { // a brass telescope on a wooden tripod, slowly scanning the sky
    const g = new THREE.Group();
    const wood = mat(0x6b4423), brass = mat(0xd9a84a, { metalness: 0.75, roughness: 0.25 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5, leg = box(g, 0.06, 1.35, 0.06, wood, Math.cos(a) * 0.3, 0.64, Math.sin(a) * 0.3);
      leg.rotation.set(Math.sin(a) * -0.4, 0, Math.cos(a) * 0.4);
    }
    const head = new THREE.Group();
    head.position.y = 1.3;
    const scope = new THREE.Group();
    for (const [r, len, z] of [[0.1, 0.7, 0.2], [0.075, 0.5, -0.35], [0.055, 0.25, -0.68]]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), brass);
      tube.rotation.x = Math.PI / 2;
      tube.position.z = z;
      scope.add(tube);
    }
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.09, 14), mat(0x6fc8ff, { emissive: 0x2a6aa0, emissiveIntensity: 0.5, roughness: 0.05 }));
    lens.position.z = 0.56;
    scope.add(lens);
    scope.rotation.x = -0.5; // looking up and out
    head.add(scope);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), brass));
    g.add(head);
    g.userData.update = (t) => { head.rotation.y = Math.sin(t * 0.2) * 0.8; scope.rotation.x = -0.5 + Math.sin(t * 0.13) * 0.15; };
    g.traverse((o) => { o.castShadow = true; });
    return g;
  },
  crystalball() { // a glowing violet orb on a carved stand, mist swirling inside
    const g = new THREE.Group();
    const wood = mat(0x2a1a2a), gold = mat(0xe0b84a, { metalness: 0.7, roughness: 0.3 });
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.35, 0.1, 6), wood);
    foot.position.y = 0.05;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.9, 6), wood);
    stem.position.y = 0.55;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.12, 0.18, 6), gold);
    cup.position.y = 1.08;
    g.add(foot, stem, cup);
    for (let i = 0; i < 3; i++) { // three gold claws holding the ball
      const a = (i / 3) * Math.PI * 2, c = box(g, 0.04, 0.22, 0.04, gold, Math.cos(a) * 0.22, 1.22, Math.sin(a) * 0.22);
      c.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
    }
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), mat(0xcab4ff, { transparent: true, opacity: 0.55, roughness: 0.05, emissive: 0x7a4ae0, emissiveIntensity: 0.5 }));
    orb.position.y = 1.45;
    const mist = new THREE.Group();
    mist.position.y = 1.45;
    for (let i = 0; i < 3; i++) {
      const wisp = new THREE.Mesh(new THREE.TorusGeometry(0.12 + i * 0.04, 0.025, 6, 20), mat(0xf0e0ff, { emissive: 0xb48cff, emissiveIntensity: 1.2, transparent: true, opacity: 0.8 }));
      wisp.rotation.set(i, i * 2, 0);
      mist.add(wisp);
    }
    g.add(mist, orb);
    g.userData.update = (t) => { mist.rotation.set(t * 0.7, t * 1.1, t * 0.3); };
    return g;
  },
  armor() { // a shining suit of armour on a plinth, holding a halberd
    const g = new THREE.Group();
    const steel = mat(0xc8ccd4, { metalness: 0.6, roughness: 0.3 }), dark = mat(0x1a1a22), gold = mat(0xe0b84a, { metalness: 0.7, roughness: 0.3 });
    box(g, 0.9, 0.2, 0.7, mat(0x4a2c18), 0, 0.1, 0);
    for (const s of [-1, 1]) {
      box(g, 0.2, 0.12, 0.32, steel, s * 0.15, 0.26, 0.05);                       // boots
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.8, 10), steel);
      leg.position.set(s * 0.15, 0.7, 0);
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), steel);
      knee.position.set(s * 0.15, 0.72, 0.04);
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), steel);
      shoulder.position.set(s * 0.34, 1.62, 0);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.65, 10), steel);
      arm.position.set(s * 0.36, 1.27, 0.02);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), steel);
      hand.position.set(s * 0.36, 0.92, 0.06);
      g.add(leg, knee, shoulder, arm, hand);
    }
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.65, 14), steel);
    chest.position.y = 1.38;
    chest.scale.set(1, 1, 0.8);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.08, 14), mat(0x6b4423));
    belt.scale.set(1, 1, 0.8);
    belt.position.y = 1.05;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.2, 14), steel);
    skirt.scale.set(1, 1, 0.8);
    skirt.position.y = 0.94;
    box(g, 0.08, 0.08, 0.02, gold, 0, 1.05, 0.19);                                // buckle
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), steel);
    helmet.scale.set(1, 1.15, 1);
    helmet.position.y = 1.92;
    const visor = box(g, 0.26, 0.035, 0.05, dark, 0, 1.94, 0.18);
    visor.castShadow = false;
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 8), mat(0xc0393b, { roughness: 1 }));
    plume.position.set(0, 2.2, -0.08);
    plume.rotation.x = -0.5;
    g.add(chest, belt, skirt, helmet, plume);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 8), mat(0x6b4423)); // halberd in the right hand
    pole.position.set(0.36, 1.25, 0.12);
    const axe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16, 1, false, 0, Math.PI), steel);
    axe.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    axe.position.set(0.36, 2.2, 0.12);
    const spear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 6), steel);
    spear.position.set(0.36, 2.55, 0.12);
    g.add(pole, axe, spear);
    g.traverse((o) => { if (o !== visor) o.castShadow = true; });
    return g;
  },
  bathtub() { // a golden claw-foot tub brimming with bubbles (and a rubber duck)
    const g = new THREE.Group();
    const gold = mat(0xe8c45a, { metalness: 0.8, roughness: 0.25 });
    const pts = [[0, 0], [0.62, 0], [0.7, 0.1], [0.74, 0.45], [0.78, 0.6], [0.72, 0.6], [0.66, 0.15], [0, 0.15]].map(([x, y]) => new THREE.Vector2(x, y));
    const tub = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), gold);
    tub.scale.set(1.5, 1, 0.85);
    tub.position.y = 0.25;
    tub.castShadow = true;
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.72, 28), mat(0x9ad8ff, { roughness: 0.1 }));
    water.rotation.x = -Math.PI / 2;
    water.scale.set(1.5, 0.85, 1);
    water.position.y = 0.75;
    g.add(tub, water);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), gold);
      foot.scale.set(1, 1.6, 1);
      foot.position.set(sx * 0.8, 0.14, sz * 0.4);
      g.add(foot);
    }
    const foam = mat(0xffffff, { roughness: 0.6 }), bubbles = [];
    for (let i = 0; i < 18; i++) {
      const a = i * 2.4, r = 0.25 + (i % 4) * 0.12;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.1 + (i % 3) * 0.04, 10, 8), foam);
      b.position.set(Math.cos(a) * r * 1.4, 0.8, Math.sin(a) * r * 0.7);
      b.userData.p = i;
      bubbles.push(b);
      g.add(b);
    }
    const duck = new THREE.Group(), yellow = mat(0xf2cf3d);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), yellow);
    body.scale.set(1.3, 0.9, 1);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), yellow);
    head.position.set(0.08, 0.09, 0);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), mat(0xe08a3a));
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.16, 0.09, 0);
    duck.add(body, head, beak);
    duck.position.set(0.3, 0.82, 0.25);
    g.add(duck);
    const tap = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12, Math.PI), gold);
    tap.position.set(-1.05, 0.95, 0);
    g.add(tap);
    g.userData.update = (t) => {
      for (const b of bubbles) b.position.y = 0.8 + Math.sin(t * 1.5 + b.userData.p) * 0.025;
      duck.position.y = 0.82 + Math.sin(t * 1.2) * 0.02;
      duck.rotation.y = Math.sin(t * 0.4) * 0.6;
    };
    return g;
  },
  chandelier() { // tiers of gold rings with candles and crystal drops, hanging on a chain
    const g = new THREE.Group(), swing = new THREE.Group();
    swing.position.y = 4.0; // hangs from the top of the walls
    const gold = mat(0xe8c45a, { metalness: 0.8, roughness: 0.25 }), crystal = mat(0xe8f4ff, { transparent: true, opacity: 0.85, roughness: 0.05, emissive: 0xaad4ff, emissiveIntensity: 0.6 });
    for (let i = 0; i < 6; i++) {
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 5, 10), gold);
      link.position.y = -0.1 - i * 0.12;
      link.rotation.y = (i % 2) * Math.PI / 2;
      swing.add(link);
    }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.6, 10), gold);
    stem.position.y = -1.0;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), gold);
    ball.position.y = -1.35;
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 10), gold);
    finial.rotation.x = Math.PI;
    finial.position.y = -1.6;
    swing.add(stem, ball, finial);
    const wax = mat(0xfff6e0), flame = mat(0xffc04a, { emissive: 0xffa020, emissiveIntensity: 2 });
    for (const [r, y, n] of [[0.75, -1.35, 8], [0.4, -0.95, 5]]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 6, 32), gold);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      swing.add(ring);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
        const arm = box(swing, r, 0.025, 0.025, gold, x / 2, y, z / 2);
        arm.rotation.y = -a;
        const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), wax);
        candle.position.set(x, y + 0.12, z);
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 8), flame);
        f.position.set(x, y + 0.26, z);
        f.userData.flicker = true;
        const drop = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), crystal);
        drop.scale.set(1, 2, 1);
        drop.position.set(Math.cos(a + Math.PI / n) * r, y - 0.15, Math.sin(a + Math.PI / n) * r);
        swing.add(candle, f, drop);
      }
    }
    const tear = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), crystal);
    tear.scale.set(1, 2.2, 1);
    tear.position.y = -1.9;
    swing.add(tear);
    swing.traverse((o) => { o.castShadow = false; }); // a shadow from up here would cover the room
    g.add(swing);
    g.userData.update = (t) => { swing.rotation.z = Math.sin(t * 0.6) * 0.015; swing.rotation.y = Math.sin(t * 0.25) * 0.1; };
    return g;
  },
  organ() { // a carved wooden organ with a wall of golden pipes
    const g = new THREE.Group();
    const wood = mat(0x4a2c18), gold = mat(0xe8c45a, { metalness: 0.8, roughness: 0.25 });
    box(g, 2.6, 1.0, 0.9, wood, 0, 0.5, -0.1);                      // console
    box(g, 2.8, 2.6, 0.4, wood, 0, 1.7, -0.5);                      // back case
    box(g, 2.0, 0.08, 0.3, mat(0xf6f6f0), 0, 1.05, 0.2);            // keys
    for (let i = 0; i < 14; i++) box(g, 0.06, 0.05, 0.16, mat(0x1a1a22), -0.9 + i * 0.14, 1.1, 0.17);
    box(g, 2.0, 0.08, 0.3, mat(0xf6f6f0), 0, 1.18, 0.05);          // a second keyboard
    box(g, 1.6, 0.1, 0.45, wood, 0, 0.5, 1.0);                      // bench
    for (const x of [-0.7, 0.7]) box(g, 0.1, 0.45, 0.4, wood, x, 0.22, 1.0);
    for (let i = 0; i < 15; i++) {                                  // pipes, tallest in the middle
      const x = -1.2 + i * (2.4 / 14), h = 1.2 + (1 - Math.abs(x) / 1.2) * 1.6;
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, h, 10), gold);
      pipe.position.set(x, 2.0 + h / 2, -0.35);
      const mouth = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 10), gold);
      mouth.rotation.x = Math.PI;
      mouth.position.set(x, 1.92, -0.35);
      g.add(pipe, mouth);
    }
    const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 20, 1, false, -Math.PI / 2, Math.PI), wood);
    crest.rotation.x = Math.PI / 2;
    crest.position.set(0, 3.0, -0.2);
    g.add(crest);
    g.traverse((o) => { o.castShadow = true; });
    return g;
  },
  hoard() { // a dragon-sized heap of gold coins, gems and a crown, glinting
    const g = new THREE.Group();
    const gold = mat(0xf2c84a, { metalness: 0.75, roughness: 0.3 });
    const heap = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), gold);
    heap.scale.set(1.2, 0.55, 1.0);
    heap.castShadow = heap.receiveShadow = true;
    g.add(heap);
    const coins = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.025, 12), mat(0xffd84a, { metalness: 0.8, roughness: 0.25 }), 90);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); // same pile every time
    for (let i = 0; i < 90; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand());
      const x = Math.cos(a) * r * 1.35, z = Math.sin(a) * r * 1.15;
      const inside = Math.max(0, 1 - (x / 1.2) ** 2 - (z / 1.0) ** 2);
      p.set(x, 0.07 + Math.sqrt(inside) * 0.55, z);
      q.setFromEuler(e.set(rand() - 0.5, rand() * 3, rand() - 0.5));
      coins.setMatrixAt(i, m.compose(p, q, one));
    }
    coins.castShadow = true;
    g.add(coins);
    const gems = [];
    for (const [i, [x, z, c]] of [[-0.4, 0.3, 0xff3a5a], [0.5, 0.1, 0x3a8aff], [0.1, -0.5, 0x3ae07a], [-0.6, -0.3, 0xb04aff], [0.7, 0.5, 0xff3a5a], [-0.1, 0.65, 0x3ae0e0]].entries()) {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), mat(c, { emissive: c, emissiveIntensity: 0.4, roughness: 0.1 }));
      const inside = Math.max(0, 1 - (x / 1.2) ** 2 - (z / 1.0) ** 2);
      gem.position.set(x, 0.08 + Math.sqrt(inside) * 0.55, z);
      gem.userData.i = i;
      gems.push(gem);
      g.add(gem);
    }
    const crown = new THREE.Group();
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.12, 16, 1, true), mat(0xffe066, { metalness: 0.8, roughness: 0.2, side: THREE.DoubleSide }));
    crown.add(band);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 4), band.material);
      spike.position.set(Math.cos(a) * 0.17, 0.11, Math.sin(a) * 0.17);
      crown.add(spike);
    }
    crown.position.set(0.05, 0.62, 0.05);
    crown.rotation.z = 0.25;
    g.add(crown);
    const goblet = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.03, 0.15, 12), gold);
    cup.position.y = 0.2;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.05, 0.13, 8), gold);
    stem.position.y = 0.07;
    goblet.add(cup, stem);
    goblet.position.set(-0.75, 0.2, 0.45);
    goblet.rotation.z = 0.5;
    g.add(goblet);
    g.userData.update = (t) => {
      for (const gem of gems) {
        gem.rotation.y = t * 0.8 + gem.userData.i;
        gem.material.emissiveIntensity = 0.3 + Math.max(0, Math.sin(t * 2 + gem.userData.i * 1.7)) ** 8 * 2.5; // a glint now and then
      }
    };
    return g;
  },
  teddy() { // a giant teddy bear sitting with its legs out, a bow round its neck
    const g = new THREE.Group(), fur = mat(0xb07a4a, { roughness: 1 }), light = mat(0xe8c8a0, { roughness: 1 }), dark = mat(0x2a1a10);
    const ball = (r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); b.position.set(x, y, z); b.scale.set(sx, sy, sz); b.castShadow = true; g.add(b); return b; };
    ball(0.5, fur, 0, 0.55, -0.05, 1, 1.05, 0.9);           // body
    ball(0.28, light, 0, 0.5, 0.33, 1, 1.1, 0.5);           // tummy
    ball(0.38, fur, 0, 1.25, 0.05);                         // head
    ball(0.17, light, 0, 1.18, 0.37, 1.1, 0.85, 0.8);       // muzzle
    ball(0.05, dark, 0, 1.24, 0.5);                         // nose
    for (const s of [-1, 1]) {
      ball(0.12, fur, s * 0.3, 1.55, 0.02); ball(0.07, light, s * 0.3, 1.55, 0.08, 1, 1, 0.5); // ears
      ball(0.045, dark, s * 0.13, 1.35, 0.36);               // eyes
      ball(0.16, fur, s * 0.5, 0.65, 0.15, 0.8, 1.4, 0.8);   // arms
      ball(0.18, fur, s * 0.25, 0.18, 0.38, 0.9, 0.8, 1.4);  // legs
      ball(0.1, light, s * 0.25, 0.18, 0.62, 1, 1, 0.4);     // paw pads
      ball(0.09, mat(0xe8433a), s * 0.12, 0.98, 0.3, 1.3, 0.8, 0.6); // bow
    }
    return g;
  },
  easel() { // a wooden easel with a half-finished painting and a palette
    const g = new THREE.Group(), wood = mat(0x9a6a3c);
    for (const s of [-1, 1]) box(g, 0.08, 2.0, 0.08, wood, s * 0.45, 1.0, 0).rotation.z = s * -0.12;
    box(g, 0.08, 1.9, 0.08, wood, 0, 0.95, -0.4).rotation.x = -0.25;
    box(g, 1.1, 0.06, 0.12, wood, 0, 0.7, 0.05);
    box(g, 1.0, 0.8, 0.05, mat(0xfff6e8), 0, 1.15, 0.07);
    for (const [c, x, y, w, h] of [[0x7fc4ff, 0, 1.38, 0.9, 0.3], [0x7cc85a, 0, 0.9, 0.9, 0.28], [0xffd23f, 0.25, 1.32, 0.16, 0.16], [0xff7a5a, -0.2, 1.05, 0.3, 0.2]]) box(g, w, h, 0.01, mat(c), x, y, 0.1).castShadow = false;
    const palette = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 16), mat(0xc9a06a));
    palette.position.set(0.45, 0.72, 0.15);
    g.add(palette);
    return g;
  },
  beanbag() { // a squishy beanbag
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 12), mat(0xff7aa8, { roughness: 1 }));
    b.scale.set(1, 0.6, 1);
    b.position.y = 0.35;
    b.castShadow = true;
    g.add(b);
    const dent = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), mat(0xff8fb8, { roughness: 1 }));
    dent.scale.set(1, 0.35, 1);
    dent.position.set(0, 0.62, -0.05);
    g.add(dent);
    return g;
  },
  lantern() { // a lantern hanging from a crook
    const g = new THREE.Group(), iron = mat(0x2e2a28, { metalness: 0.5, roughness: 0.5 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.6, 8), iron);
    pole.position.y = 1.3;
    g.add(pole);
    box(g, 0.5, 0.05, 0.05, iron, 0.25, 2.55, 0);
    box(g, 0.28, 0.36, 0.28, iron, 0.5, 2.2, 0);
    const glow = box(g, 0.2, 0.28, 0.2, new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffc860, emissiveIntensity: 1.2 }), 0.5, 2.2, 0);
    glow.userData.flicker = true;
    return g;
  },
  cauldron() { // a black cauldron on little legs, bubbling green
    const g = new THREE.Group(), iron = mat(0x1e1e22, { metalness: 0.4 });
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.7), iron);
    pot.position.y = 0.65;
    pot.material.side = THREE.DoubleSide;
    pot.castShadow = true;
    g.add(pot);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; box(g, 0.08, 0.3, 0.08, iron, Math.cos(a) * 0.4, 0.1, Math.sin(a) * 0.4); }
    // the brew: a heaving surface that slowly changes colour (green, purple, pink, blue...), big bubbles that
    // swell up, rise and pop, and wisps of steam in the same colour
    const BREWS = [0x5aff7a, 0xb46cff, 0xff6ac8, 0x5ac8ff];
    const brewGeo = new THREE.CircleGeometry(0.5, 24, 0, Math.PI * 2);
    const brew = new THREE.Mesh(brewGeo, new THREE.MeshBasicMaterial({ color: BREWS[0] }));
    brew.rotation.x = -Math.PI / 2;
    brew.position.y = 1.0;
    g.add(brew);
    const flat = brewGeo.attributes.position.array.slice();
    const bubbles = [], steam = [];
    for (let i = 0; i < 8; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: BREWS[0], transparent: true }));
      g.add(b);
      bubbles.push(b);
    }
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: BREWS[0], transparent: true, depthWrite: false }));
      g.add(s);
      steam.push(s);
    }
    const now = new THREE.Color(), next = new THREE.Color();
    g.userData.update = (t) => {
      const k = (t / 4) % BREWS.length, i0 = Math.floor(k), f = k - i0, blend = f < 0.7 ? 0 : (f - 0.7) / 0.3;
      now.set(BREWS[i0]).lerp(next.set(BREWS[(i0 + 1) % BREWS.length]), blend * blend * (3 - 2 * blend));
      brew.material.color.copy(now);
      const pos = brewGeo.attributes.position; // the surface heaves
      for (let v = 0; v < pos.count; v++) {
        const x = flat[v * 3], y = flat[v * 3 + 1];
        pos.setZ(v, Math.sin(x * 9 + t * 4) * Math.cos(y * 8 - t * 3) * 0.025);
      }
      pos.needsUpdate = true;
      bubbles.forEach((b, i) => {
        const u = (t * 0.6 + i * 0.137) % 1, r = 0.08 + (i % 3) * 0.12;
        b.position.set(Math.cos(i * 2.4) * r, 1.0 + u * 0.18, Math.sin(i * 2.4) * r);
        b.scale.setScalar(u < 0.85 ? 0.5 + u : (1 - u) * 8); // swells, then pops
        b.material.color.copy(now).lerp(next.set(0xffffff), 0.35);
        b.material.opacity = u < 0.85 ? 0.95 : (1 - u) * 6;
      });
      steam.forEach((s, i) => {
        const u = (t * 0.25 + i / 3) % 1;
        s.position.set(Math.sin(t + i * 2) * 0.12, 1.15 + u * 1.1, Math.cos(t * 0.8 + i) * 0.12);
        s.scale.setScalar(0.6 + u * 1.4);
        s.material.color.copy(now).lerp(next.set(0xffffff), 0.6);
        s.material.opacity = 0.35 * (1 - u);
      });
    };
    return g;
  },
  bookstack() { // a wobbly stack of books with a candle on top
    const g = new THREE.Group(), colors = [0xc0393b, 0x3b6fc0, 0x3ac06a, 0x8a5ac0, 0xe0a050, 0x6b4a2c];
    let y = 0;
    colors.forEach((c, i) => {
      const h = 0.12 + (i % 3) * 0.03;
      const b = box(g, 0.55 - (i % 2) * 0.08, h, 0.4, mat(c), 0, y + h / 2, 0);
      b.rotation.y = (i % 3 - 1) * 0.2;
      y += h;
    });
    box(g, 0.08, 0.2, 0.08, mat(0xfff6dc), 0, y + 0.1, 0);
    const flame = box(g, 0.05, 0.08, 0.05, new THREE.MeshBasicMaterial({ color: 0xffc860 }), 0, y + 0.25, 0);
    flame.userData.flicker = true;
    return g;
  },
  palm() { // a tall potted palm
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.28, 0.6, 14), mat(0xe0d6c0));
    pot.position.y = 0.3;
    g.add(pot);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.6, 8), mat(0x8a5a34));
    trunk.position.y = 1.4;
    g.add(trunk);
    const leaf = mat(0x3fa84a, { side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 1.1), leaf);
      l.position.set(Math.cos(a) * 0.45, 2.15, Math.sin(a) * 0.45);
      l.rotation.set(Math.PI / 2 - 0.6, 0, 0);
      l.rotation.order = 'YXZ';
      l.rotation.y = -a + Math.PI / 2;
      g.add(l);
    }
    return g;
  },
  gramophone() { // a wooden box with a spinning record and a golden horn
    const g = new THREE.Group(), gold = mat(0xe0b84a, { metalness: 0.75, roughness: 0.25 });
    box(g, 0.7, 0.35, 0.7, mat(0x6b3a22), 0, 0.85, 0);
    box(g, 0.8, 0.7, 0.8, mat(0x8a5a34), 0, 0.35, 0);
    const record = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 24), mat(0x111111, { roughness: 0.3 }));
    record.position.set(0, 1.04, 0);
    g.add(record);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.025, 16), mat(0xd8302a));
    label.position.set(0, 1.045, 0);
    g.add(label);
    const arm = box(g, 0.03, 0.03, 0.4, gold, 0.18, 1.08, -0.1);
    arm.rotation.y = 0.5;
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.05, 0.9, 20, 1, true), gold);
    horn.material.side = THREE.DoubleSide;
    horn.position.set(-0.1, 1.6, -0.15);
    horn.rotation.set(-0.7, 0, 0.3);
    g.add(horn);
    g.userData.update = (t) => { record.rotation.y = t * 3; label.rotation.y = t * 3; };
    return g;
  },
  cakestand() { // a three-tier cake on a golden stand, strawberries on top
    const g = new THREE.Group(), gold = mat(0xe0b84a, { metalness: 0.75, roughness: 0.25 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.8, 10), gold);
    stem.position.y = 0.4;
    g.add(stem);
    const tiers = [[0.5, 0xfff6f0, 0xff9ab8], [0.38, 0xffe0ea, 0xffffff], [0.26, 0xfff6f0, 0xff9ab8]];
    let y = 0.85;
    for (const [r, cake, icing] of tiers) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.03, 20), gold);
      plate.position.y = y;
      g.add(plate);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.26, 20), mat(cake, { roughness: 0.9 }));
      c.position.y = y + 0.15;
      c.castShadow = true;
      g.add(c);
      const drip = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 6, 24), mat(icing));
      drip.rotation.x = Math.PI / 2;
      drip.position.y = y + 0.28;
      g.add(drip);
      y += 0.3;
    }
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0xd8302a));
      s.position.set(Math.cos(i * 2.1) * 0.1, y + 0.03, Math.sin(i * 2.1) * 0.1);
      g.add(s);
    }
    return g;
  },
  dollhouse() { // a little royal dollhouse on a table: pink walls, blue roof, lit windows
    const g = new THREE.Group();
    box(g, 1.4, 0.6, 1.0, mat(0x8a5a34), 0, 0.3, 0);
    box(g, 1.2, 0.9, 0.8, mat(0xffd6e4), 0, 1.05, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.6, 4), mat(0x4f7fc0));
    roof.position.set(0, 1.8, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, 0.75);
    g.add(roof);
    const win = new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffc860, emissiveIntensity: 0.8 });
    for (const [x, y] of [[-0.35, 1.25], [0.35, 1.25], [-0.35, 0.85], [0.35, 0.85]]) box(g, 0.2, 0.2, 0.02, win, x, y, 0.41).castShadow = false;
    box(g, 0.2, 0.3, 0.02, mat(0x6b4a2c), 0, 0.75, 0.41);
    return g;
  },
  // ---- the Seasonal Trader's decorations (shared/seasonal.js)
  blossomtree() { // a little cherry tree in a pot, pink blossom clouds
    const g = new THREE.Group();
    add(g, cyl(0.35, 0.28, 0.5), mat(0xe0d6c0), 0, 0.25, 0);
    add(g, cyl(0.07, 0.1, 1.4), mat(0x6b4a2c), 0, 1.15, 0);
    for (const [x, y, z, r] of [[0, 2.0, 0, 0.5], [0.35, 1.8, 0.1, 0.38], [-0.35, 1.85, -0.1, 0.4], [0.1, 1.7, 0.35, 0.35], [-0.1, 2.25, -0.2, 0.32]]) add(g, ball(r), mat(0xffb3cc, { roughness: 1 }), x, y, z);
    return g;
  },
  bunnyplush() { // a floppy-eared bunny plush
    const g = new THREE.Group(), fur = mat(0xf4ece4, { roughness: 1 }), pink = mat(0xffb3cc);
    add(g, ball(0.32), fur, 0, 0.32, 0, [1, 0.9, 0.9]);
    add(g, ball(0.24), fur, 0, 0.75, 0.05);
    for (const s of [-1, 1]) { const ear = add(g, ball(0.08), fur, s * 0.1, 1.05, 0, [0.7, 2.6, 0.5]); ear.rotation.z = s * 0.3; add(g, ball(0.035), mat(0x222222), s * 0.08, 0.8, 0.24); }
    add(g, ball(0.04), pink, 0, 0.72, 0.27);
    return g;
  },
  eggbasket() { // a wicker basket of painted eggs
    const g = new THREE.Group();
    add(g, cyl(0.42, 0.32, 0.35), mat(0xc9a06a, { roughness: 1 }), 0, 0.18, 0);
    add(g, new THREE.TorusGeometry(0.35, 0.03, 6, 20, Math.PI), mat(0xb08a50), 0, 0.36, 0);
    [0xff9ab8, 0x7fc4ff, 0xffe066, 0xb48cff, 0x8be07a].forEach((c, i) => add(g, ball(0.1), mat(c, { roughness: 0.4 }), Math.cos(i * 1.3) * 0.18, 0.42, Math.sin(i * 1.3) * 0.18, [0.8, 1.1, 0.8]));
    return g;
  },
  birdhouse() { // a little birdhouse on a post
    const g = new THREE.Group();
    add(g, cyl(0.05, 0.06, 1.6), mat(0x8a5a34), 0, 0.8, 0);
    add(g, new THREE.BoxGeometry(0.45, 0.45, 0.4), mat(0x7fc4ff), 0, 1.8, 0);
    const roof = add(g, new THREE.ConeGeometry(0.42, 0.3, 4), mat(0xc0453a), 0, 2.17, 0);
    roof.rotation.y = Math.PI / 4;
    add(g, cyl(0.07, 0.07, 0.05), mat(0x222222), 0, 1.85, 0.2).rotation.x = Math.PI / 2;
    return g;
  },
  tulips() { // a long planter of tulips
    const g = new THREE.Group();
    add(g, new THREE.BoxGeometry(1.0, 0.35, 0.4), mat(0xc0703a), 0, 0.18, 0);
    [0xff5a6a, 0xffd23f, 0xff9ab8, 0xb48cff, 0xff5a6a].forEach((c, i) => {
      const x = -0.4 + i * 0.2;
      add(g, cyl(0.015, 0.015, 0.45), mat(0x3fa84a), x, 0.55, 0);
      add(g, new THREE.ConeGeometry(0.07, 0.16, 6, 1, true), mat(c, { side: THREE.DoubleSide }), x, 0.82, 0).rotation.x = Math.PI;
    });
    return g;
  },
  maypolemini() { // a little maypole with ribbons
    const g = new THREE.Group();
    add(g, cyl(0.04, 0.05, 1.8), mat(0xf4efe6), 0, 0.9, 0);
    add(g, ball(0.08), mat(0xffd23f), 0, 1.85, 0);
    [0xff5a6a, 0x7fc4ff, 0xffe066, 0x8be07a].forEach((c, i) => {
      const a = (i / 4) * Math.PI * 2;
      const rib = add(g, new THREE.BoxGeometry(0.04, 1.4, 0.01), mat(c), Math.cos(a) * 0.3, 1.1, Math.sin(a) * 0.3);
      rib.rotation.z = Math.cos(a) * 0.25; rib.rotation.x = -Math.sin(a) * 0.25;
    });
    return g;
  },
  parasol() { // a striped beach parasol
    const g = new THREE.Group();
    add(g, cyl(0.04, 0.04, 2.2), mat(0xf4efe6), 0, 1.1, 0);
    for (let i = 0; i < 8; i++) {
      const seg = add(g, new THREE.ConeGeometry(1.2, 0.45, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4), mat(i % 2 ? 0xffffff : 0xff5a6a, { side: THREE.DoubleSide }), 0, 2.25, 0);
      seg.castShadow = true;
    }
    return g;
  },
  beachball() { // a big striped beach ball
    const g = new THREE.Group();
    [0xff5a6a, 0xffffff, 0x4fa8ff, 0xffe066, 0xffffff, 0x8be07a].forEach((c, i) => add(g, new THREE.SphereGeometry(0.4, 16, 12, (i / 6) * Math.PI * 2, Math.PI / 3), mat(c, { roughness: 0.4 }), 0, 0.4, 0));
    return g;
  },
  sandcastle() { // a sandcastle with towers and a flag
    const g = new THREE.Group(), sand = mat(0xf0d89a, { roughness: 1 });
    add(g, new THREE.BoxGeometry(1.0, 0.4, 1.0), sand, 0, 0.2, 0);
    for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) { add(g, cyl(0.17, 0.2, 0.6), sand, x, 0.3, z); add(g, new THREE.ConeGeometry(0.2, 0.25, 8), sand, x, 0.72, z); }
    add(g, cyl(0.22, 0.26, 0.8), sand, 0, 0.6, 0);
    add(g, cyl(0.01, 0.01, 0.4), mat(0x8a5a34), 0, 1.2, 0);
    add(g, new THREE.BoxGeometry(0.2, 0.12, 0.01), mat(0xff5a6a), 0.1, 1.33, 0);
    return g;
  },
  sunflowers() { // tall sunflowers in a pot
    const g = new THREE.Group();
    add(g, cyl(0.3, 0.24, 0.45), mat(0x4f7fc0), 0, 0.22, 0);
    for (const [x, h] of [[-0.12, 1.7], [0.15, 1.4], [0, 1.2]]) {
      add(g, cyl(0.025, 0.03, h), mat(0x3fa84a), x, 0.45 + h / 2, 0);
      add(g, cyl(0.24, 0.24, 0.04, 16), mat(0xffd23f), x, 0.45 + h, 0.05).rotation.x = Math.PI / 2;
      add(g, cyl(0.11, 0.11, 0.06, 12), mat(0x6b3a1a), x, 0.45 + h, 0.08).rotation.x = Math.PI / 2;
    }
    return g;
  },
  shellbowl() { // a wooden bowl of seashells and a starfish
    const g = new THREE.Group();
    add(g, new THREE.SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x9a6a3c, { side: THREE.DoubleSide }), 0, 0.4, 0);
    [0xffe0ea, 0xfff6dc, 0xffc8a0, 0xe0f0ff].forEach((c, i) => add(g, ball(0.09), mat(c, { roughness: 0.3 }), Math.cos(i * 1.6) * 0.18, 0.38, Math.sin(i * 1.6) * 0.18, [1, 0.6, 1.2]));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(g, new THREE.ConeGeometry(0.04, 0.16, 4), mat(0xff8a5a), Math.cos(a) * 0.07, 0.42, Math.sin(a) * 0.07).rotation.set(Math.PI / 2, 0, -a + Math.PI / 2); }
    return g;
  },
  surfboard() { // a surfboard leaning up
    const g = new THREE.Group();
    const board = add(g, ball(0.5, 20), mat(0x4fd8c0, { roughness: 0.3 }), 0, 1.0, -0.2, [0.45, 2.0, 0.08]);
    board.rotation.x = -0.25;
    add(g, ball(0.5, 20), mat(0xffffff), 0, 1.0, -0.15, [0.08, 1.95, 0.085]).rotation.x = -0.25;
    return g;
  },
  jackolantern() { // a carved pumpkin, glowing
    const g = new THREE.Group();
    add(g, ball(0.42), mat(0xff8a2a, { roughness: 0.6 }), 0, 0.38, 0, [1.15, 0.85, 1.15]);
    add(g, cyl(0.05, 0.06, 0.18), mat(0x4f7a2a), 0, 0.78, 0);
    const glow = new THREE.MeshBasicMaterial({ color: 0xffd23f });
    for (const s of [-1, 1]) add(g, new THREE.ConeGeometry(0.07, 0.1, 3), glow, s * 0.15, 0.45, 0.42).rotation.x = Math.PI / 2;
    add(g, new THREE.BoxGeometry(0.3, 0.06, 0.05), glow, 0, 0.27, 0.43).userData.flicker = true;
    return g;
  },
  scarecrow() { // a friendly scarecrow with a straw hat
    const g = new THREE.Group();
    add(g, cyl(0.05, 0.05, 2.0), mat(0x8a5a34), 0, 1.0, 0);
    add(g, new THREE.BoxGeometry(1.2, 0.08, 0.08), mat(0x8a5a34), 0, 1.4, 0);
    add(g, new THREE.BoxGeometry(0.5, 0.6, 0.3), mat(0x7a3a8a), 0, 1.3, 0);
    add(g, ball(0.22), mat(0xe8c87a), 0, 1.85, 0);
    add(g, cyl(0.4, 0.4, 0.04, 16), mat(0xd8b860), 0, 2.03, 0);
    add(g, cyl(0.17, 0.2, 0.18, 16), mat(0xd8b860), 0, 2.13, 0);
    for (const s of [-1, 1]) add(g, ball(0.03), mat(0x222222), s * 0.08, 1.9, 0.19);
    return g;
  },
  leafpile() { // a pile of autumn leaves
    const g = new THREE.Group(), colors = [0xd8782a, 0xc0392b, 0xffb03a, 0x8a4a1a];
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4, r = (i % 7) * 0.12;
      const l = add(g, new THREE.CircleGeometry(0.16, 5), mat(colors[i % 4], { side: THREE.DoubleSide, roughness: 1 }), Math.cos(a) * r, 0.06 + (0.84 - r) * 0.35 * Math.random(), Math.sin(a) * r);
      l.rotation.set(-Math.PI / 2 + (Math.random() - 0.5) * 0.8, 0, a);
    }
    return g;
  },
  applebasket() { // a basket heaped with apples
    const g = new THREE.Group();
    add(g, cyl(0.4, 0.3, 0.4), mat(0xc9a06a, { roughness: 1 }), 0, 0.2, 0);
    for (let i = 0; i < 9; i++) add(g, ball(0.11), mat(i % 3 ? 0xd8302a : 0x8bc84a, { roughness: 0.5 }), Math.cos(i * 2.2) * 0.2 * (i % 2 + 0.3), 0.46 + (i % 3) * 0.05, Math.sin(i * 2.2) * 0.2 * (i % 2 + 0.3));
    return g;
  },
  cornstalks() { // a bundle of dry corn stalks
    const g = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const st = add(g, cyl(0.03, 0.04, 1.8), mat(0xd8b860), Math.cos(a) * 0.12, 0.9, Math.sin(a) * 0.12);
      st.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
    }
    add(g, cyl(0.2, 0.2, 0.08), mat(0x8a2a1a), 0, 0.7, 0);
    return g;
  },
  acornbowl() { // a bowl of acorns, little gourds and a pinecone
    const g = new THREE.Group();
    add(g, new THREE.SphereGeometry(0.38, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x6b4a2c, { side: THREE.DoubleSide }), 0, 0.38, 0);
    for (let i = 0; i < 6; i++) { const x = Math.cos(i * 1.1) * 0.2, z = Math.sin(i * 1.1) * 0.2; add(g, ball(0.06), mat(0xa86a3a), x, 0.38, z, [1, 1.2, 1]); add(g, ball(0.065), mat(0x5a3a22), x, 0.44, z, [1, 0.5, 1]); }
    add(g, ball(0.12), mat(0xffb03a), 0.05, 0.42, 0, [1, 0.8, 1]);
    add(g, ball(0.1), mat(0x8bc84a), -0.1, 0.42, 0.1, [1, 1.3, 1]);
    return g;
  },
  snowman() { // a snowman with a carrot nose and a scarf
    const g = new THREE.Group(), snow = mat(0xf8fbff, { roughness: 0.9 });
    add(g, ball(0.45), snow, 0, 0.42, 0);
    add(g, ball(0.32), snow, 0, 1.05, 0);
    add(g, ball(0.22), snow, 0, 1.52, 0);
    add(g, new THREE.ConeGeometry(0.05, 0.25, 8), mat(0xff8a2a), 0, 1.52, 0.3).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) add(g, ball(0.03), mat(0x222222), s * 0.08, 1.6, 0.19);
    add(g, new THREE.TorusGeometry(0.22, 0.06, 6, 16), mat(0xd8302a), 0, 1.3, 0).rotation.x = Math.PI / 2;
    add(g, cyl(0.16, 0.16, 0.25), mat(0x222222), 0, 1.85, 0);
    add(g, cyl(0.26, 0.26, 0.03), mat(0x222222), 0, 1.73, 0);
    return g;
  },
  xmastree() { // a festive tree with baubles and a star
    const g = new THREE.Group(), pine = mat(0x2f8a4a, { roughness: 0.9 });
    add(g, cyl(0.1, 0.12, 0.4), mat(0x6b4a2c), 0, 0.2, 0);
    for (const [y, r] of [[0.8, 0.8], [1.3, 0.62], [1.75, 0.42]]) add(g, new THREE.ConeGeometry(r, 0.8, 10), pine, 0, y, 0);
    [0xd8302a, 0xffd23f, 0x4fa8ff, 0xff9ab8, 0xffffff, 0xd8302a, 0xffd23f].forEach((c, i) => {
      const a = i * 2.3, y = 0.6 + (i % 4) * 0.33, r = 0.75 - (i % 4) * 0.17;
      add(g, ball(0.06), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.4 }), Math.cos(a) * r, y, Math.sin(a) * r);
    });
    const star = add(g, new THREE.OctahedronGeometry(0.14), new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffc020, emissiveIntensity: 0.8 }), 0, 2.25, 0);
    star.userData.flicker = true;
    return g;
  },
  giftpile() { // a heap of wrapped presents with ribbons
    const g = new THREE.Group();
    for (const [x, z, w, h, c, r] of [[0, 0, 0.5, 0.4, 0xd8302a, 0xffd23f], [0.45, 0.1, 0.35, 0.3, 0x2f8a4a, 0xffffff], [-0.35, 0.2, 0.3, 0.45, 0x4fa8ff, 0xff5a6a], [0.1, 0.05, 0.3, 0.25, 0xffd23f, 0xd8302a]]) {
      const y = x === 0.1 ? 0.52 : h / 2;
      add(g, new THREE.BoxGeometry(w, h, w), mat(c), x, y, z);
      add(g, new THREE.BoxGeometry(w + 0.01, h + 0.01, 0.05), mat(r), x, y, z);
      add(g, new THREE.BoxGeometry(0.05, h + 0.01, w + 0.01), mat(r), x, y, z);
    }
    return g;
  },
  snowglobe() { // a giant snow globe with a tiny house and drifting snow
    const g = new THREE.Group();
    add(g, cyl(0.38, 0.45, 0.3), mat(0x8a5a34), 0, 0.15, 0);
    add(g, ball(0.42, 20), new THREE.MeshStandardMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.35, roughness: 0.05 }), 0, 0.68, 0);
    add(g, new THREE.BoxGeometry(0.2, 0.18, 0.2), mat(0xffd6e4), 0, 0.42, 0);
    const roof = add(g, new THREE.ConeGeometry(0.17, 0.14, 4), mat(0x4f7fc0), 0, 0.58, 0);
    roof.rotation.y = Math.PI / 4;
    const flakes = [];
    for (let i = 0; i < 10; i++) flakes.push(add(g, ball(0.02, 6), mat(0xffffff), 0, 0, 0));
    g.userData.update = (t) => flakes.forEach((f, i) => { const u = (t * 0.15 + i / 10) % 1; f.position.set(Math.cos(i * 2.4) * 0.25, 1.0 - u * 0.65, Math.sin(i * 2.4) * 0.25); });
    return g;
  },
  icesculpture() { // a swan carved from ice on a plinth
    const g = new THREE.Group(), ice = new THREE.MeshStandardMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.75, roughness: 0.05, metalness: 0.1 });
    add(g, new THREE.BoxGeometry(0.8, 0.4, 0.8), mat(0xf4f4f8), 0, 0.2, 0);
    add(g, ball(0.32), ice, 0, 0.65, 0, [1.3, 0.8, 0.9]);
    const neck = add(g, new THREE.TorusGeometry(0.25, 0.06, 8, 16, Math.PI * 1.1), ice, 0.25, 0.95, 0);
    neck.rotation.z = -0.3;
    add(g, ball(0.09), ice, 0.45, 1.15, 0);
    for (const s of [-1, 1]) add(g, ball(0.25), ice, -0.1, 0.8, s * 0.2, [1.1, 0.5, 0.4]).rotation.z = 0.4;
    return g;
  },
  stocking() { // a little rack of hanging stockings
    const g = new THREE.Group();
    add(g, cyl(0.04, 0.05, 1.4), mat(0x8a5a34), -0.55, 0.7, 0);
    add(g, cyl(0.04, 0.05, 1.4), mat(0x8a5a34), 0.55, 0.7, 0);
    add(g, new THREE.BoxGeometry(1.2, 0.06, 0.06), mat(0x8a5a34), 0, 1.38, 0);
    [0xd8302a, 0x2f8a4a, 0xd8302a].forEach((c, i) => {
      const x = -0.35 + i * 0.35;
      add(g, new THREE.BoxGeometry(0.16, 0.42, 0.1), mat(c), x, 1.1, 0);
      add(g, new THREE.BoxGeometry(0.24, 0.12, 0.1), mat(c), x + 0.05, 0.86, 0);
      add(g, new THREE.BoxGeometry(0.18, 0.08, 0.11), mat(0xffffff), x, 1.3, 0);
    });
    return g;
  },
  calendar() { // a wall calendar on a little wooden stand: a red top, a page of days, one circled
    const g = new THREE.Group(), wood = mat(0x8a5a34);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 0.06), wood);
      leg.position.set(s * 0.25, 0.65, -0.05);
      leg.rotation.x = -0.1;
      g.add(leg);
    }
    add(g, new THREE.BoxGeometry(0.66, 0.78, 0.04), mat(0xfaf6ec), 0, 1.22, 0.02);
    add(g, new THREE.BoxGeometry(0.66, 0.16, 0.05), mat(0xd8402a), 0, 1.6, 0.025);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) add(g, new THREE.BoxGeometry(0.08, 0.08, 0.01), mat(r === 1 && c === 3 ? 0xd8402a : 0xc8c0b0), -0.22 + c * 0.11, 1.4 - r * 0.15, 0.045);
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
    this.makeLabel = makeLabel;
    this.root = new THREE.Group();
    this.inner = def.build ? FURNITURE_BUILDERS[def.build](def) : cloneModel(def.model ?? 'dungeon/box_small');
    this.root.add(this.inner);
    this.root.position.set(e.x, 0, e.z);
    this.root.rotation.y = e.rot ?? 0;
    if (def.light) {
      this.light = new THREE.PointLight(def.lightColor ?? 0xffc477, 8, 7, 1.6);
      this.light.position.y = def.lightY ?? 1.6;
      this.root.add(this.light);
    }
    if (e.item === 'bed') {
      // a quilt in the owner's colour over the KayKit bed, and their name on a little sign
      const quilt = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.16, 2.0), mat(e.blanket ?? 0xe0525a, { roughness: 1 }));
      quilt.position.set(0, 0.86, 0.45);
      quilt.castShadow = quilt.receiveShadow = true;
      this.root.add(quilt);
      this.ownerName = e.ownerName;
      this.label = makeLabel(`${e.ownerName}’s bed`, '#ffe9b0');
      this.label.scale.multiplyScalar(0.7);
      this.label.position.set(0, 2.4, -0.6);
      this.root.add(this.label);
    }
    this.t = Math.random() * 10;
    this.use = def.use;
    this.fx = [];          // little things floating off it while it's being used (notes, bubbles...)
    this.anim = null;      // { use, t }: what it's doing after an E press
    this.setOn(e.on ?? true);
  }
  apply(e) {
    this.root.position.set(e.x, 0, e.z);
    this.root.rotation.y = e.rot ?? this.root.rotation.y;
    if (this.label && e.ownerName && e.ownerName !== this.ownerName) { // renamed: a new sign
      this.ownerName = e.ownerName;
      const old = this.label;
      this.label = this.makeLabel(`${e.ownerName}’s bed`, '#ffe9b0');
      this.label.scale.copy(old.scale);
      this.label.position.copy(old.position);
      old.removeFromParent();
      this.root.add(this.label);
    }
    if (e.on != null) this.setOn(e.on);
  }

  /** The show after an E press: spinning, rocking, hopping, and notes or bubbles drifting up. */
  animate(dt) {
    const a = this.anim, i = this.inner;
    if (this.bubbles && this.on) this.bubbles.forEach((b, k) => { b.position.y = this.water.position.y + 0.06 + Math.abs(Math.sin(this.t * 2 + k)) * 0.05; });
    if (a) {
      a.t += dt;
      const fade = Math.max(0, 1 - a.t / 3);
      i.rotation.set(0, 0, 0);
      i.position.y = 0;
      if (a.use === 'globe') i.rotation.y = (1 - fade * fade) * Math.PI * 6;
      else if (a.use === 'rockinghorse') i.rotation.x = Math.sin(a.t * 6) * 0.22 * fade;
      else if (a.use === 'birdcage' || a.use === 'toybox' || a.use === 'treasure' || a.use === 'hoard') i.position.y = Math.abs(Math.sin(a.t * 12)) * 0.1 * fade;
      else if (a.use === 'armor') i.rotation.z = Math.sin(a.t * 20) * 0.05 * fade;
      else if (a.use === 'musicbox' || a.use === 'piano' || a.use === 'organ' || a.use === 'harp') i.scale.setScalar(1 + Math.abs(Math.sin(a.t * 8)) * 0.02 * fade);
      if (a.t > 3) { this.anim = null; i.rotation.set(0, 0, 0); i.position.y = 0; i.scale.setScalar(1); }
    }
    // music notes / bubbles drifting up off it
    for (const f of this.fx) {
      f.at -= dt;
      if (f.at > 0) continue;
      if (!f.sprite) {
        f.sprite = f.kind === 'note' ? noteSprite() : bubbleSprite();
        f.x = (Math.random() - 0.5) * 1.2;
        f.z = (Math.random() - 0.5) * 0.8;
        this.root.add(f.sprite);
      }
      f.life = (f.life ?? 0) + dt;
      const u = f.life / 2;
      f.sprite.position.set(f.x + Math.sin(f.life * 4) * 0.2, 1.4 + u * 2.2, f.z);
      f.sprite.material.opacity = Math.max(0, 1 - u);
    }
    for (const f of this.fx) if (f.life > 2) f.sprite.removeFromParent();
    this.fx = this.fx.filter((f) => !(f.life > 2));
  }

  /** Toggle pieces: lights and fires out, the bath full or empty, the fountain running or not. */
  setOn(on) {
    if (this.on === on) return;
    this.on = on;
    this.inner.traverse((o) => { if (o.userData.flicker) o.visible = on; });
    if (this.use === 'bathtub') {
      if (!this.water) {
        const box = new THREE.Box3().setFromObject(this.inner), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
        this.water = new THREE.Mesh(new THREE.BoxGeometry(size.x * 0.78, 0.05, size.z * 0.7), new THREE.MeshStandardMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.75, roughness: 0.05, emissive: 0x1a4a6a }));
        this.water.position.set(mid.x, box.min.y + size.y * 0.55, mid.z);
        this.inner.add(this.water);
        this.bubbles = [];
        for (let i = 0; i < 7; i++) {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.09 + (i % 3) * 0.04, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, roughness: 0.2 }));
          b.position.set(mid.x + (Math.sin(i * 2.3) * size.x * 0.3), this.water.position.y + 0.06, mid.z + Math.cos(i * 1.7) * size.z * 0.25);
          this.inner.add(b);
          this.bubbles.push(b);
        }
      }
      this.water.visible = on;
      for (const b of this.bubbles) b.visible = on;
    }
  }

  /** Someone pressed E on it: start its little show (sounds are in GameClient). */
  play(use) {
    this.anim = { use, t: 0 };
    if (['piano', 'organ', 'harp', 'musicbox'].includes(use)) for (let i = 0; i < 6; i++) this.fx.push({ kind: 'note', at: i * 0.45 });
    if (use === 'aquarium' || (use === 'fountain' && this.on)) for (let i = 0; i < 8; i++) this.fx.push({ kind: 'bubble', at: i * 0.15 });
  }

  update(dt) {
    this.t += dt;
    this.inner.userData.update?.(this.t); // ticking clocks, flapping... anything animated
    if (this.light) this.light.intensity = this.on ? 7 + Math.sin(this.t * 7) * 0.8 + Math.sin(this.t * 17) * 0.5 : 0;
    this.animate(dt);
    this.inner.traverse((o) => {
      if (o.userData.flicker) o.scale.set(1 + Math.sin(this.t * 13) * 0.1, 1 + Math.sin(this.t * 9) * 0.2, 1);
      if (o.userData.swim != null) { const i = o.userData.swim; o.position.x = Math.sin(this.t * 0.8 + i * 2) * 0.6; o.rotation.y = Math.cos(this.t * 0.8 + i * 2) > 0 ? 0 : Math.PI; }
    });
  }
  dispose() { this.root.removeFromParent(); }
}

let noteTex = null;
/** A floating ♪ for music-making furniture. */
function noteSprite() {
  if (!noteTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 52px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(40,20,60,0.8)';
    ctx.strokeText('♪', 32, 34);
    ctx.fillStyle = '#ffe680';
    ctx.fillText('♪', 32, 34);
    noteTex = new THREE.CanvasTexture(c);
    noteTex.colorSpace = THREE.SRGBColorSpace;
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex, transparent: true, depthWrite: false }));
  s.scale.setScalar(0.5);
  return s;
}

function bubbleSprite() {
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshStandardMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.8, roughness: 0.1 }));
  return s;
}
