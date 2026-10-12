// Pebble Town's hand-made pieces: cottages, tower roofs, fences, market stalls, the fountain,
// lamp posts, flower beds, the fairies at the healing spring, and the chains on locked gates.
// All client-side looks; positions come from the town map (shared/maps.js).
import * as THREE from 'three';
import { cloneModel } from './assets.js';
import { glowTexture } from './effects.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
function mesh(parent, geo, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  parent.add(o);
  return o;
}

const ROOFS = [0xc0453a, 0x3a6ac0, 0x5a9a4a, 0xb0703a, 0x8a4ab0];
const WALLS = [0xf2e6c8, 0xe8d0b0, 0xf6efe0, 0xdcc8a8];

/** A townsperson's cottage filling a 2x2 block of cells: plaster walls, timber, a roof, a chimney. */
export function makeCottage(x, z, r) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(1.9); // the door is a little taller than a person; the house fills a 2x2 block of cells
  const wall = std(WALLS[Math.floor(r * 40) % WALLS.length]), wood = std(0x6b4a2c), roof = std(ROOFS[Math.floor(r * 10) % ROOFS.length], { roughness: 0.6 });
  mesh(g, new THREE.BoxGeometry(3.4, 2.6, 3.2), wall, 0, 1.3, 0);
  for (const sx of [-1, 1]) mesh(g, new THREE.BoxGeometry(0.18, 2.6, 0.18), wood, sx * 1.66, 1.3, 1.56);
  mesh(g, new THREE.BoxGeometry(3.5, 0.18, 0.2), wood, 0, 2.55, 1.6);
  const top = mesh(g, new THREE.ConeGeometry(2.9, 1.9, 4), roof, 0, 3.5, 0);
  top.rotation.y = Math.PI / 4;
  top.scale.set(1, 1, 0.9);
  mesh(g, new THREE.BoxGeometry(0.5, 1.2, 0.5), std(0x8a7a6a), 0.9, 4.1, -0.5); // chimney
  mesh(g, new THREE.BoxGeometry(0.9, 1.6, 0.1), wood, -0.6, 0.8, 1.62); // door
  mesh(g, new THREE.SphereGeometry(0.06, 8, 6), std(0xffcf3f, { metalness: 0.6 }), -0.3, 0.85, 1.7);
  const win = std(0xfff2b0, { emissive: 0xffc860, emissiveIntensity: 0.5 });
  mesh(g, new THREE.BoxGeometry(0.8, 0.7, 0.08), win, 0.75, 1.5, 1.62);
  mesh(g, new THREE.BoxGeometry(0.1, 0.7, 0.12), wood, 0.75, 1.5, 1.65);
  const box = mesh(g, new THREE.BoxGeometry(0.9, 0.2, 0.25), wood, 0.75, 1.1, 1.75); // window box with flowers
  for (let i = 0; i < 4; i++) mesh(box, new THREE.SphereGeometry(0.08, 6, 5), std([0xff7a9a, 0xffe066, 0xb48cff][i % 3]), -0.32 + i * 0.21, 0.15, 0);
  return g;
}

/** A pointed roof and a waving flag on top of a castle tower. */
export function makeTowerTop(x, z, y, r) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const cone = mesh(g, new THREE.ConeGeometry(2.6, 3, 8), std(ROOFS[Math.floor(r * 10) % 2], { roughness: 0.6 }), 0, 1.5, 0);
  cone.castShadow = true;
  mesh(g, new THREE.CylinderGeometry(0.05, 0.05, 2, 6), std(0x3a2a1c), 0, 3.8, 0);
  const flag = mesh(g, new THREE.PlaneGeometry(1.2, 0.7, 6, 1), std(r > 0.5 ? 0xffd23f : 0xe0525a, { side: THREE.DoubleSide }), 0.62, 4.4, 0);
  flag.userData.wave = r * 10;
  g.userData.update = (t) => {
    const pos = flag.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(t * 4 + pos.getX(i) * 4 + flag.userData.wave) * 0.12 * (pos.getX(i) + 0.6));
    pos.needsUpdate = true;
  };
  return g;
}

/** Wooden fence: a post in every fence cell and rails to the fence cells next to it. */
export function makeFence(cells, isFence) {
  const g = new THREE.Group(), wood = std(0x9a6a3c), CELL = 4;
  const post = new THREE.CylinderGeometry(0.14, 0.16, 1.4, 6);
  for (const [cx, cz] of cells) {
    const x = cx * CELL + CELL / 2, z = cz * CELL + CELL / 2;
    mesh(g, post, wood, x, 0.7, z);
    for (const [dx, dz] of [[1, 0], [0, 1]]) {
      if (!isFence(cx + dx, cz + dz)) continue;
      for (const y of [0.45, 1.0]) {
        const rail = mesh(g, new THREE.BoxGeometry(dx ? CELL : 0.1, 0.12, dz ? CELL : 0.1), wood, x + (dx * CELL) / 2, y, z + (dz * CELL) / 2);
        rail.castShadow = true;
      }
    }
  }
  return g;
}

/**
 * A market stall: four poles, a striped canopy in `color`, a counter, and goods on it.
 * `goods`: 'shop' (potions, a sword) | 'pets' | 'decor' (candles, a plant).
 */
export function makeStall(color, goods) {
  const g = new THREE.Group();
  const wood = std(0x8a5a34);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mesh(g, new THREE.CylinderGeometry(0.09, 0.09, 3.6, 8), wood, sx * 2.1, 1.8, 0.4 + sz * 1.3);
  const stripes = [color, 0xffffff];
  for (let i = 0; i < 9; i++) { // sloped canopy, scalloped edge at the front
    const s = mesh(g, new THREE.BoxGeometry(0.5, 0.06, 3.2), std(stripes[i % 2], { roughness: 0.85 }), -2.0 + i * 0.5, 3.75, 0.4);
    s.rotation.x = -0.28;
    const flap = mesh(g, new THREE.CylinderGeometry(0.25, 0.25, 0.05, 12, 1, false, 0, Math.PI), std(stripes[i % 2]), -2.0 + i * 0.5, 3.33, 1.98);
    flap.rotation.set(Math.PI / 2, 0, Math.PI);
  }
  const counter = cloneModel('dungeon/table_long');
  counter.position.set(0, 0, 1.3);
  counter.rotation.y = Math.PI / 2;
  g.add(counter);
  const top = 1.02;
  if (goods === 'shop') {
    for (const [i, m] of ['dungeon/bottle_A_green', 'dungeon/bottle_C_green', 'dungeon/bottle_B_brown'].entries()) {
      const b = cloneModel(m);
      b.position.set(-1.4 + i * 0.45, top, 1.25);
      g.add(b);
    }
    const shield = cloneModel('items/shield_round');
    shield.position.set(1.2, top + 0.3, 1.2);
    shield.rotation.x = -0.5;
    g.add(shield);
    const food = cloneModel('dungeon/plate_food_A');
    food.position.set(0.3, top, 1.3);
    g.add(food);
  } else if (goods === 'decor') {
    const candles = cloneModel('dungeon/candle_triple');
    candles.position.set(-1.2, top, 1.3);
    g.add(candles);
    const pot = mesh(g, new THREE.CylinderGeometry(0.2, 0.15, 0.3, 10), std(0xc0703a), 1.1, top + 0.15, 1.3);
    for (let i = 0; i < 5; i++) mesh(pot, new THREE.SphereGeometry(0.14, 8, 6), std(0x4fae4a), Math.cos(i) * 0.1, 0.3 + (i % 2) * 0.1, Math.sin(i) * 0.1);
    mesh(g, new THREE.BoxGeometry(0.7, 0.5, 0.05), std(0xffc2d0), 0, top + 0.28, 1.05); // a swatch of wallpaper
  }
  return g;
}

/** The town fountain: a round basin, a pillar with a bowl, and water arching down. */
export function makeFountain() {
  const g = new THREE.Group();
  const stone = std(0xb8b0a4, { flatShading: true });
  const water = std(0x6fc8ff, { transparent: true, opacity: 0.75, roughness: 0.1, emissive: 0x1a4a6a, emissiveIntensity: 0.3 });
  mesh(g, new THREE.CylinderGeometry(2.1, 2.3, 0.7, 24, 1, true), stone, 0, 0.35, 0).material.side = THREE.DoubleSide;
  mesh(g, new THREE.TorusGeometry(2.15, 0.18, 6, 32), stone, 0, 0.7, 0).rotation.x = Math.PI / 2;
  mesh(g, new THREE.CircleGeometry(2.05, 32), water, 0, 0.5, 0).rotation.x = -Math.PI / 2;
  mesh(g, new THREE.CylinderGeometry(0.3, 0.45, 2.2, 10), stone, 0, 1.1, 0);
  mesh(g, new THREE.CylinderGeometry(0.9, 0.4, 0.35, 16), stone, 0, 2.2, 0);
  mesh(g, new THREE.CircleGeometry(0.85, 16), water, 0, 2.38, 0).rotation.x = -Math.PI / 2;
  const jets = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const drop = mesh(g, new THREE.SphereGeometry(0.09, 8, 6), water, 0, 0, 0);
    drop.castShadow = false;
    jets.push({ drop, a, phase: i / 8 });
  }
  g.userData.update = (t) => {
    for (const j of jets) { // drops arc from the bowl down into the basin
      const u = (t * 0.8 + j.phase) % 1;
      const r = 0.85 + u * 0.9;
      j.drop.position.set(Math.cos(j.a) * r, 2.35 + u * 0.5 - u * u * 2.3, Math.sin(j.a) * r);
    }
  };
  return g;
}

/** A park bench. */
export function makeBench() {
  const g = new THREE.Group(), wood = std(0x9a6a3c), iron = std(0x3a3a3a, { metalness: 0.5 });
  for (let i = 0; i < 3; i++) mesh(g, new THREE.BoxGeometry(2, 0.08, 0.22), wood, 0, 0.55, -0.25 + i * 0.25);
  for (let i = 0; i < 2; i++) mesh(g, new THREE.BoxGeometry(2, 0.22, 0.07), wood, 0, 0.85 + i * 0.28, -0.42).rotation.x = -0.15;
  for (const s of [-1, 1]) for (const z of [-0.3, 0.25]) mesh(g, new THREE.BoxGeometry(0.08, 0.55, 0.08), iron, s * 0.85, 0.27, z);
  return g;
}

/** A lamp post with a glowing lantern. `light` adds a real light (only a few, they're costly). */
export function makeLampPost(light) {
  const g = new THREE.Group();
  const iron = std(0x2e2a28, { metalness: 0.5, roughness: 0.5 });
  mesh(g, new THREE.CylinderGeometry(0.08, 0.12, 3.2, 8), iron, 0, 1.6, 0);
  mesh(g, new THREE.BoxGeometry(0.45, 0.55, 0.45), std(0xfff0b0, { emissive: 0xffc860, emissiveIntensity: 1.2 }), 0, 3.4, 0).castShadow = false;
  mesh(g, new THREE.ConeGeometry(0.4, 0.3, 4), iron, 0, 3.82, 0).rotation.y = Math.PI / 4;
  if (light) {
    const l = new THREE.PointLight(0xffc870, 0, 12, 1.6);
    l.position.y = 3.3;
    g.add(l);
    g.userData.light = l;
  }
  return g;
}

const FLOWER_COLORS = [0xff7a9a, 0xffe066, 0xb48cff, 0xffffff, 0xff9a5a, 0x7ad8ff];
/** Flower beds: lots of little flowers (instanced) around each spot. */
export function makeFlowers(spots, rand) {
  const g = new THREE.Group();
  const stems = [], heads = [];
  for (const [i, s] of spots.entries()) {
    const n = s.n ?? 14;
    for (let k = 0; k < n; k++) {
      const a = rand(i, k, 'fa') * Math.PI * 2, r = Math.sqrt(rand(i, k, 'fr')) * (s.r ?? 1.6);
      const h = 0.3 + rand(i, k, 'fh') * 0.35;
      const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
      stems.push({ x, z, h });
      heads.push({ x, y: h, z, c: FLOWER_COLORS[Math.floor(rand(i, k, 'fc') * FLOWER_COLORS.length)] });
    }
  }
  const stemMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.025, 1, 4).translate(0, 0.5, 0), std(0x3f8a2c), stems.length);
  const headMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.11, 0), std(0xffffff, { roughness: 0.5 }), heads.length);
  const m = new THREE.Matrix4();
  stems.forEach((s, i) => stemMesh.setMatrixAt(i, m.makeScale(1, s.h, 1).setPosition(s.x, 0, s.z)));
  heads.forEach((h, i) => { headMesh.setMatrixAt(i, m.makeScale(1, 0.6, 1).setPosition(h.x, h.y, h.z)); headMesh.setColorAt(i, new THREE.Color(h.c)); });
  stemMesh.castShadow = headMesh.castShadow = true;
  g.add(stemMesh, headMesh);
  return g;
}

/** Tiny glowing fairies that dance around the healing spring. */
export function makeFairies(cx, cz, radius, count = 7) {
  const g = new THREE.Group();
  const colors = [0xffb3e6, 0xb3f0ff, 0xfff2a8, 0xc8b3ff];
  const fairies = [];
  for (let i = 0; i < count; i++) {
    const f = new THREE.Group();
    const color = colors[i % colors.length];
    const body = mesh(f, new THREE.SphereGeometry(0.09, 10, 8), std(color, { emissive: color, emissiveIntensity: 1.2 }));
    body.castShadow = false;
    const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glowSprite.scale.setScalar(0.9);
    f.add(glowSprite);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    const wings = [-1, 1].map((s) => {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.13, 10), wingMat);
      w.scale.set(1, 0.6, 1);
      w.position.set(s * 0.1, 0.05, 0);
      f.add(w);
      return w;
    });
    g.add(f);
    fairies.push({ f, wings, a: (i / count) * Math.PI * 2, speed: 0.25 + (i % 3) * 0.12, r: radius + 0.6 + (i % 2) * 1.2, h: 1.1 + (i % 4) * 0.35, phase: i * 1.7 });
  }
  g.userData.update = (t) => {
    for (const x of fairies) {
      const a = x.a + t * x.speed * (x.phase % 2 > 1 ? 1 : -1);
      const wob = Math.sin(t * 1.3 + x.phase) * 0.8;
      x.f.position.set(cx + Math.cos(a) * (x.r + wob), x.h + Math.sin(t * 2.4 + x.phase) * 0.35, cz + Math.sin(a) * (x.r + wob));
      x.f.rotation.y = -a;
      const flap = Math.sin(t * 40 + x.phase) * 0.9;
      x.wings[0].rotation.y = flap;
      x.wings[1].rotation.y = -flap;
    }
  };
  return g;
}

/**
 * Chains in an X across a locked gate, with a big padlock. `breakApart()` starts the
 * lock-breaking animation; `update(dt)` runs it; `done` when the pieces have fallen away.
 */
export function makeChains() {
  const g = new THREE.Group();
  const iron = std(0x5a5e66, { metalness: 0.85, roughness: 0.35 });
  const link = new THREE.TorusGeometry(0.16, 0.05, 6, 12);
  const links = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i <= 13; i++) {
      const u = i / 13;
      const l = mesh(g, link, iron, (u - 0.5) * 3.2 * s, 0.4 + u * 3.0, 0.15);
      l.rotation.set(i % 2 ? Math.PI / 2 : 0, 0, s * -0.75);
      links.push(l);
    }
  }
  const lock = new THREE.Group();
  lock.position.set(0, 1.9, 0.35);
  mesh(lock, new THREE.BoxGeometry(0.75, 0.6, 0.22), std(0xc8a040, { metalness: 0.8, roughness: 0.3 }));
  mesh(lock, new THREE.TorusGeometry(0.25, 0.07, 8, 16, Math.PI), iron, 0, 0.3, 0);
  mesh(lock, new THREE.BoxGeometry(0.1, 0.22, 0.05), std(0x111111), 0, -0.05, 0.12); // keyhole
  g.add(lock);
  let t = -1;
  const pieces = [...links, lock];
  const api = {
    group: g,
    breakApart() { t = 0; for (const p of pieces) p.userData.v = new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 5, 1 + Math.random() * 3); },
    get breaking() { return t >= 0; },
    get done() { return t > 2.6; },
    update(dt) {
      if (t < 0) return;
      t += dt;
      if (t < 1.1) { // the padlock shakes harder and harder, then CRACK
        lock.rotation.z = Math.sin(t * 50) * 0.25 * t;
        lock.scale.setScalar(1 + t * 0.15);
        return;
      }
      for (const p of pieces) {
        p.userData.v.y -= 15 * dt;
        p.position.addScaledVector(p.userData.v, dt);
        p.rotation.x += dt * 6;
        if (p.position.y < 0.1) { p.position.y = 0.1; p.userData.v.multiplyScalar(0.4); p.userData.v.y = Math.abs(p.userData.v.y) * 0.3; }
      }
      if (t > 2.1) g.traverse((o) => { if (o.material) { o.material.transparent = true; o.material.opacity = Math.max(0, 1 - (t - 2.1) * 2); } });
    },
  };
  return api;
}

/**
 * The Enchanter's corner (he stands at the origin, facing +z): a dark patched tent behind him, a
 * cloth-draped counter with a glowing crystal ball and candles, a bubbling cauldron, a hanging
 * purple lantern and a sign with a rune. Shady, but it glows invitingly at night.
 */
export function makeEnchanterTent() {
  const g = new THREE.Group();
  const cloth = std(0x2a1a3a, { roughness: 0.95 }), patch = std(0x4a2a5a, { roughness: 0.95 }), wood = std(0x3a2618);
  const tent = mesh(g, new THREE.ConeGeometry(2.4, 3.6, 4, 1, true), cloth, 0, 1.8, -1.9);
  tent.rotation.y = Math.PI / 4;
  tent.material.side = THREE.DoubleSide;
  mesh(g, new THREE.BoxGeometry(0.7, 0.5, 0.05), patch, -0.6, 1.4, -0.7).rotation.set(-0.5, 0, 0.2); // patches
  mesh(g, new THREE.BoxGeometry(0.4, 0.4, 0.05), patch, 0.8, 0.9, -0.9).rotation.set(-0.5, 0, -0.3);
  mesh(g, new THREE.CylinderGeometry(0.05, 0.05, 4.2, 6), wood, 0, 2.1, -1.9); // tent pole poking out the top
  // the counter, with a purple cloth hanging down the front
  mesh(g, new THREE.BoxGeometry(1.8, 0.9, 0.7), wood, 0, 0.45, 0.85);
  mesh(g, new THREE.BoxGeometry(1.9, 0.06, 0.8), std(0x5a2a7a), 0, 0.92, 0.85);
  mesh(g, new THREE.BoxGeometry(1.9, 0.6, 0.04), std(0x5a2a7a), 0, 0.62, 1.26);
  const orb = mesh(g, new THREE.SphereGeometry(0.26, 16, 12), new THREE.MeshStandardMaterial({ color: 0xc8a0ff, emissive: 0x9a5aff, emissiveIntensity: 1.4, transparent: true, opacity: 0.85, roughness: 0.1 }), 0, 1.22, 0.85);
  orb.castShadow = false;
  mesh(g, new THREE.CylinderGeometry(0.18, 0.22, 0.1, 10), std(0xb8902a, { metalness: 0.7 }), 0, 0.99, 0.85);
  const flame = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  for (const [x, h] of [[-0.7, 0.3], [-0.55, 0.2], [0.65, 0.25]]) {
    mesh(g, new THREE.CylinderGeometry(0.04, 0.04, h, 6), std(0xf0e6d0), x, 0.95 + h / 2, 0.75);
    mesh(g, new THREE.SphereGeometry(0.035, 6, 4), flame, x, 0.98 + h, 0.75).castShadow = false;
  }
  // the cauldron, bubbling green
  const pot = mesh(g, new THREE.SphereGeometry(0.55, 14, 10, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), std(0x1e1e22, { metalness: 0.4 }), 1.7, 0.6, 0.2);
  pot.material.side = THREE.DoubleSide;
  const brew = mesh(g, new THREE.CircleGeometry(0.47, 16), new THREE.MeshBasicMaterial({ color: 0x5aff7a }), 1.7, 0.85, 0.2);
  brew.rotation.x = -Math.PI / 2;
  const bubbles = [];
  for (let i = 0; i < 5; i++) {
    const b = mesh(g, new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0x9aff9a, transparent: true }), 1.7, 0.9, 0.2);
    b.castShadow = false;
    bubbles.push({ b, a: i * 1.3, r: 0.12 + (i % 3) * 0.1 });
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x5aff7a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(1.7, 1.2, 0.2);
  glow.scale.setScalar(1.8);
  g.add(glow);
  // a lantern hanging off a crooked pole, glowing purple
  mesh(g, new THREE.CylinderGeometry(0.06, 0.07, 3, 6), wood, -1.6, 1.5, 0.4).rotation.z = 0.08;
  mesh(g, new THREE.BoxGeometry(0.9, 0.06, 0.06), wood, -1.25, 2.95, 0.4);
  const lantern = mesh(g, new THREE.BoxGeometry(0.3, 0.4, 0.3), new THREE.MeshStandardMaterial({ color: 0xd0a0ff, emissive: 0xa060ff, emissiveIntensity: 1.6 }), -0.9, 2.6, 0.4);
  lantern.castShadow = false;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xb070ff, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.set(-0.9, 2.6, 0.4);
  halo.scale.setScalar(2.2);
  g.add(halo);
  // a sign with a glowing rune
  mesh(g, new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), wood, -1.5, 0.7, 1.4);
  mesh(g, new THREE.BoxGeometry(0.8, 0.55, 0.06), wood, -1.5, 1.3, 1.42);
  const rune = mesh(g, new THREE.TorusGeometry(0.16, 0.03, 6, 5), new THREE.MeshBasicMaterial({ color: 0xc890ff }), -1.5, 1.3, 1.47);
  rune.castShadow = false;
  g.userData.update = (t) => {
    for (const { b, a, r } of bubbles) { // bubbles rise and pop in the brew
      const u = ((t * 0.6 + a) % 1);
      b.position.set(1.7 + Math.cos(a * 3) * r, 0.86 + u * 0.35, 0.2 + Math.sin(a * 3) * r);
      b.material.opacity = 1 - u;
    }
    orb.material.emissiveIntensity = 1.1 + Math.sin(t * 2.2) * 0.4;
    halo.material.opacity = 0.55 + Math.sin(t * 3.1) * 0.15;
    rune.rotation.z = t * 0.5;
  };
  return g;
}
