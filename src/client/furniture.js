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
    pool.position.y = 0.4;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.1, 12), stone);
    pillar.position.y = 0.85;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.22, 0.22, 20), stone);
    bowl.position.y = 1.45;
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.44, 20), water);
    top.rotation.x = -Math.PI / 2;
    top.position.y = 1.55;
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
        d.position.set(Math.cos(d.userData.a) * r, 1.55 - u * u * 1.15, Math.sin(d.userData.a) * r);
      }
    };
    return g;
  },
  piano() { // a black grand piano, lid propped open, with its bench
    const g = new THREE.Group();
    const black = mat(0x15151a, { roughness: 0.2, metalness: 0.2 });
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
    this.inner.userData.update?.(this.t); // ticking clocks, flapping... anything animated
    if (this.light) this.light.intensity = 7 + Math.sin(this.t * 7) * 0.8 + Math.sin(this.t * 17) * 0.5;
    this.inner.traverse((o) => {
      if (o.userData.flicker) o.scale.set(1 + Math.sin(this.t * 13) * 0.1, 1 + Math.sin(this.t * 9) * 0.2, 1);
      if (o.userData.swim != null) { const i = o.userData.swim; o.position.x = Math.sin(this.t * 0.8 + i * 2) * 0.6; o.rotation.y = Math.cos(this.t * 0.8 + i * 2) > 0 ? 0 : Math.PI; }
    });
  }
  dispose() { this.root.removeFromParent(); }
}
