// Pebble Town's hand-made pieces: cottages, tower roofs, fences, market stalls, the fountain,
// lamp posts, flower beds, the fairies at the healing spring, and the chains on locked gates.
// All client-side looks; positions come from the town map (shared/maps.js).
import * as THREE from 'three';
import { cloneModel } from './assets.js';
import { glowTexture } from './effects.js';
import { WINTER } from './seasonfx.js';

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
  const pools = [mesh(g, new THREE.CircleGeometry(2.05, 32), water, 0, 0.5, 0)];
  pools[0].rotation.x = -Math.PI / 2;
  mesh(g, new THREE.CylinderGeometry(0.3, 0.45, 2.2, 10), stone, 0, 1.1, 0);
  mesh(g, new THREE.CylinderGeometry(0.9, 0.4, 0.35, 16), stone, 0, 2.2, 0);
  pools.push(mesh(g, new THREE.CircleGeometry(0.85, 16), water, 0, 2.38, 0));
  pools[1].rotation.x = -Math.PI / 2;
  // winter: frozen solid — ice in both bowls and icicles hanging off the top bowl
  const iceMat = std(0xd6eefc, { roughness: 0.15, metalness: 0.1, emissive: 0x335577, emissiveIntensity: 0.15 });
  const frozen = new THREE.Group();
  for (const [r, y] of [[2.05, 0.52], [0.85, 2.4]]) frozen.add(mesh(g, new THREE.CircleGeometry(r, 32), iceMat, 0, y, 0)).children.at(-1).rotation.x = -Math.PI / 2;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, len = 0.25 + ((i * 37) % 10) / 20;
    const ic = mesh(frozen, new THREE.ConeGeometry(0.06, len, 6), iceMat, Math.cos(a) * 0.88, 2.2 - len / 2, Math.sin(a) * 0.88);
    ic.rotation.x = Math.PI;
    ic.castShadow = false;
  }
  g.add(frozen);
  const jets = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const drop = mesh(g, new THREE.SphereGeometry(0.09, 8, 6), water, 0, 0, 0);
    drop.castShadow = false;
    jets.push({ drop, a, phase: i / 8 });
  }
  g.userData.update = (t) => {
    const ice = WINTER.value > 0.5;
    frozen.visible = ice;
    for (const p of pools) p.visible = !ice;
    for (const j of jets) j.drop.visible = !ice;
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

/** The Banker's booth (he stands at the origin, facing +z): a stone counter with a brass rail,
 * stacks of coins, a strongbox behind him and a sign with a big gold coin on it. */
export function makeBankBooth() {
  const g = new THREE.Group();
  const stone = std(0xd8d2c4), dark = std(0x8a7f70), brass = std(0xd9a93a, { metalness: 0.7, roughness: 0.3 });
  const gold = std(0xffd23f, { metalness: 0.8, roughness: 0.25, emissive: 0x6a4a00, emissiveIntensity: 0.3 });
  mesh(g, new THREE.BoxGeometry(3.2, 1.0, 0.8), stone, 0, 0.5, 0.9); // the counter
  mesh(g, new THREE.BoxGeometry(3.4, 0.12, 1.0), dark, 0, 1.06, 0.9);
  for (const x of [-1.5, -0.5, 0.5, 1.5]) mesh(g, new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), brass, x, 1.45, 1.3);
  mesh(g, new THREE.BoxGeometry(3.1, 0.05, 0.05), brass, 0, 1.8, 1.3); // brass rail
  for (const [x, n] of [[-1.0, 5], [-0.75, 3], [0.9, 4]]) { // coin stacks
    for (let i = 0; i < n; i++) mesh(g, new THREE.CylinderGeometry(0.12, 0.12, 0.04, 14), gold, x, 1.14 + i * 0.045, 0.85);
  }
  const box = mesh(g, new THREE.BoxGeometry(1.0, 0.8, 0.7), std(0x5a3a22), -1.1, 0.4, -0.9); // the strongbox
  mesh(box, new THREE.BoxGeometry(1.04, 0.1, 0.74), brass, 0, 0.1, 0);
  mesh(box, new THREE.BoxGeometry(0.16, 0.2, 0.05), brass, 0, 0.1, 0.37);
  // a sign on two posts with a big coin
  for (const x of [0.9, 1.9]) mesh(g, new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), std(0x6b4a2c), x, 1.3, -0.9);
  mesh(g, new THREE.BoxGeometry(1.3, 0.8, 0.08), std(0x2e4a7a), 1.4, 2.4, -0.9);
  const coin = mesh(g, new THREE.CylinderGeometry(0.3, 0.3, 0.06, 20), gold, 1.4, 2.4, -0.84);
  coin.rotation.x = Math.PI / 2;
  g.userData.update = (t) => { coin.rotation.z = t * 1.5; };
  return g;
}

/** A stone flower planter for the town square, spilling over with flowers. */
export function makePlanter() {
  const g = new THREE.Group();
  const stone = std(0xc9bfae), rim = std(0xa89c88), soil = std(0x5a3a22);
  mesh(g, new THREE.BoxGeometry(1.8, 0.7, 1.8), stone, 0, 0.35, 0);
  mesh(g, new THREE.BoxGeometry(2.0, 0.14, 2.0), rim, 0, 0.74, 0);
  mesh(g, new THREE.BoxGeometry(1.6, 0.1, 1.6), soil, 0, 0.78, 0);
  const leaf = std(0x4fa83a), colors = [0xff6b8a, 0xffd23f, 0xb48cff, 0xff9a3a, 0xffffff];
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, r = 0.25 + (i % 4) * 0.17;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    mesh(g, new THREE.CylinderGeometry(0.025, 0.03, 0.4, 4), leaf, x, 1.0, z);
    const bloom = mesh(g, new THREE.SphereGeometry(0.13, 8, 6), std(colors[i % colors.length], { roughness: 0.5 }), x, 1.22, z);
    bloom.scale.y = 0.7;
  }
  for (let i = 0; i < 6; i++) { // trailing leaves over the rim
    const a = (i / 6) * Math.PI * 2;
    mesh(g, new THREE.SphereGeometry(0.18, 8, 6), leaf, Math.cos(a) * 0.85, 0.72, Math.sin(a) * 0.85).scale.set(1, 0.5, 1);
  }
  return g;
}

/** A market cart piled with produce: pumpkins, apples, cabbages and a sack. */
export function makeCart() {
  const g = new THREE.Group();
  const wood = std(0x8a5a34), dark = std(0x5a3a22);
  mesh(g, new THREE.BoxGeometry(2.6, 0.6, 1.5), wood, 0, 0.95, 0);
  mesh(g, new THREE.BoxGeometry(2.7, 0.1, 1.6), dark, 0, 1.28, 0);
  for (const s of [-1, 1]) {
    const wheel = mesh(g, new THREE.CylinderGeometry(0.55, 0.55, 0.12, 14), dark, -0.6, 0.55, s * 0.82);
    wheel.rotation.x = Math.PI / 2;
    mesh(g, new THREE.CylinderGeometry(0.1, 0.1, 0.14, 8), wood, -0.6, 0.55, s * 0.88).rotation.x = Math.PI / 2;
  }
  mesh(g, new THREE.BoxGeometry(0.15, 0.6, 0.15), wood, 1.1, 0.35, 0.55);   // legs at the front
  mesh(g, new THREE.BoxGeometry(0.15, 0.6, 0.15), wood, 1.1, 0.35, -0.55);
  for (const s of [-1, 1]) mesh(g, new THREE.BoxGeometry(1.3, 0.08, 0.08), wood, 1.9, 0.9, s * 0.5).rotation.z = 0.2; // handles
  const pumpkin = std(0xff8a2a), apple = std(0xd8302a), cabbage = std(0x7cc85a);
  for (const [x, z] of [[-0.8, -0.3], [-0.4, 0.35], [-0.95, 0.4]]) mesh(g, new THREE.SphereGeometry(0.28, 10, 8), pumpkin, x, 1.48, z).scale.y = 0.75;
  for (let i = 0; i < 9; i++) mesh(g, new THREE.SphereGeometry(0.1, 8, 6), apple, 0.2 + (i % 3) * 0.2, 1.38 + Math.floor(i / 3) * 0.06, -0.4 + Math.floor(i / 3) * 0.2);
  for (const [x, z] of [[0.75, 0.3], [0.9, -0.2]]) mesh(g, new THREE.SphereGeometry(0.22, 10, 8), cabbage, x, 1.45, z);
  mesh(g, new THREE.SphereGeometry(0.32, 10, 8), std(0xd8c8a0), 0.3, 1.5, 0.4).scale.set(1, 1.2, 0.9); // a flour sack
  return g;
}

/** The town notice board: a little roofed board with pinned papers. */
export function makeNoticeBoard() {
  const g = new THREE.Group();
  const wood = std(0x6b4a2c);
  for (const x of [-0.8, 0.8]) mesh(g, new THREE.BoxGeometry(0.14, 2.4, 0.14), wood, x, 1.2, 0);
  mesh(g, new THREE.BoxGeometry(1.8, 1.1, 0.1), std(0x9a6a3c), 0, 1.6, 0);
  const roof = mesh(g, new THREE.BoxGeometry(2.1, 0.08, 0.6), std(0xc0453a), 0, 2.45, 0);
  roof.rotation.x = 0.15;
  const papers = [0xfff6dc, 0xffe9b0, 0xdff0ff, 0xffd6e4];
  for (let i = 0; i < 5; i++) {
    const p = mesh(g, new THREE.BoxGeometry(0.32, 0.4, 0.02), std(papers[i % papers.length]), -0.55 + i * 0.27, 1.6 + (i % 2 ? 0.18 : -0.12), 0.07);
    p.rotation.z = (i % 3 - 1) * 0.12;
    mesh(g, new THREE.SphereGeometry(0.025, 6, 4), std(0xd8302a), p.position.x, p.position.y + 0.17, 0.09);
  }
  return g;
}

/** The fort's feast table: a long oak table with benches either side, laid with a roast, pies,
 * fruit, bread, goblets and candles. 14 long along x. */
export function makeFeastTable() {
  const g = new THREE.Group();
  const oak = std(0x8a5a34), dark = std(0x5a3a22), cloth = std(0xf4ecd8, { roughness: 0.95 }), runner = std(0xb8322e);
  mesh(g, new THREE.BoxGeometry(14, 0.16, 1.8), oak, 0, 1.05, 0);
  mesh(g, new THREE.BoxGeometry(14.1, 0.02, 1.4), cloth, 0, 1.14, 0);
  mesh(g, new THREE.BoxGeometry(14.2, 0.025, 0.45), runner, 0, 1.16, 0);
  for (const x of [-6.6, -2.2, 2.2, 6.6]) for (const z of [-0.7, 0.7]) mesh(g, new THREE.BoxGeometry(0.18, 1.0, 0.18), dark, x, 0.5, z);
  for (const s of [-1, 1]) { // benches
    mesh(g, new THREE.BoxGeometry(13, 0.14, 0.55), oak, 0, 0.55, s * 1.75);
    for (const x of [-6, -2, 2, 6]) mesh(g, new THREE.BoxGeometry(0.14, 0.5, 0.45), dark, x, 0.27, s * 1.75);
  }
  const plate = std(0xffffff, { roughness: 0.4 }), gold = std(0xd9a93a, { metalness: 0.7, roughness: 0.3 });
  for (const x of [-4.5, -1.5, 1.5, 4.5]) for (const s of [-1, 1]) { // a place for everyone: plate and goblet
    mesh(g, new THREE.CylinderGeometry(0.28, 0.24, 0.04, 16), plate, x, 1.18, s * 0.5);
    mesh(g, new THREE.CylinderGeometry(0.07, 0.05, 0.22, 10), gold, x + 0.42, 1.27, s * 0.48);
  }
  // the roast in the middle
  mesh(g, new THREE.CylinderGeometry(0.6, 0.55, 0.06, 20), gold, 0, 1.2, 0);
  const roast = mesh(g, new THREE.SphereGeometry(0.42, 14, 10), std(0xb8662a, { roughness: 0.6 }), 0, 1.45, 0);
  roast.scale.set(1.3, 0.75, 0.9);
  for (const s of [-1, 1]) {
    mesh(g, new THREE.CylinderGeometry(0.07, 0.09, 0.4, 8), std(0xb8662a), s * 0.45, 1.55, 0.15).rotation.z = s * 1.0;
    mesh(g, new THREE.SphereGeometry(0.06, 8, 6), std(0xfff6dc), s * 0.62, 1.67, 0.15);
  }
  // pies, a fruit bowl, bread
  for (const x of [-3, 3]) {
    mesh(g, new THREE.CylinderGeometry(0.34, 0.3, 0.16, 16), std(0xe0a050), x, 1.25, 0);
    mesh(g, new THREE.CylinderGeometry(0.3, 0.3, 0.02, 16), std(0x8a2a3a), x, 1.34, 0);
  }
  mesh(g, new THREE.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gold, -5.5, 1.5, 0).rotation.x = Math.PI;
  for (const [dx, dz, c] of [[0, 0, 0xd8302a], [0.15, 0.1, 0xffd23f], [-0.12, 0.12, 0x7cc85a], [0.05, -0.15, 0xff8a2a]]) mesh(g, new THREE.SphereGeometry(0.11, 8, 6), std(c), -5.5 + dx, 1.52, dz);
  for (const x of [5.4, 5.8]) mesh(g, new THREE.CapsuleGeometry(0.12, 0.3, 4, 8), std(0xd9a066), x, 1.28, 0.05).rotation.z = Math.PI / 2;
  // candles, flickering
  const flames = [];
  for (const x of [-2.2, 2.2]) {
    mesh(g, new THREE.CylinderGeometry(0.12, 0.14, 0.1, 10), gold, x, 1.21, 0);
    mesh(g, new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), std(0xfff6dc), x, 1.45, 0);
    const f = mesh(g, new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc860 }), x, 1.72, 0);
    f.castShadow = false;
    flames.push(f);
  }
  g.userData.update = (t) => flames.forEach((f, i) => f.scale.set(1, 1.2 + Math.sin(t * 11 + i * 2) * 0.3, 1));
  return g;
}

/**
 * The Seasonal Trader's stall, dressed four ways (spring blossom, summer sun, autumn pumpkins,
 * winter snow). Call `userData.setSeason(id)` to show the right one.
 */
export function makeSeasonalStall() {
  const g = new THREE.Group(), looks = {};
  const deck = (id, color, dress) => {
    const v = makeStall(color, 'shop');
    dress(v);
    v.visible = false;
    g.add(v);
    looks[id] = v;
  };
  const ball = (parent, r, color, x, y, z, extra = {}) => mesh(parent, new THREE.SphereGeometry(r, 10, 8), std(color, extra), x, y, z);
  deck('spring', 0xff9ab8, (v) => {
    for (let i = 0; i < 9; i++) ball(v, 0.16, i % 2 ? 0xffffff : 0xffb3cc, -2 + i * 0.5, 3.15, 1.95);      // a blossom garland
    for (const x of [-2.6, 2.6]) { mesh(v, new THREE.CylinderGeometry(0.3, 0.24, 0.5, 12), std(0xe0d6c0), x, 0.25, 1.6); for (let k = 0; k < 5; k++) ball(v, 0.12, [0xff6b8a, 0xffd23f, 0xb48cff][k % 3], x + Math.cos(k) * 0.15, 0.6, 1.6 + Math.sin(k) * 0.15); }
  });
  deck('summer', 0xffd23f, (v) => {
    const sun = mesh(v, new THREE.CircleGeometry(0.45, 20), new THREE.MeshBasicMaterial({ color: 0xffb020 }), 0, 4.45, 0.4);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const ray = mesh(v, new THREE.BoxGeometry(0.08, 0.35, 0.02), new THREE.MeshBasicMaterial({ color: 0xffd23f }), Math.cos(a) * 0.65, 4.45 + Math.sin(a) * 0.65, 0.4); ray.rotation.z = a - Math.PI / 2; }
    sun.castShadow = false;
    for (const x of [-0.7, 0.7]) mesh(v, new THREE.CylinderGeometry(0.12, 0.14, 0.4, 10), std(0xff9ab8, { transparent: true, opacity: 0.85 }), x, 1.25, 1.3); // lemonade jugs
  });
  deck('autumn', 0xd8782a, (v) => {
    for (const [x, r] of [[-2.6, 0.32], [-2.15, 0.22], [2.5, 0.36]]) ball(v, r, 0xff8a2a, x, r * 0.85, 1.7).scale.y = 0.8;
    for (let i = 0; i < 9; i++) { const leaf = mesh(v, new THREE.CircleGeometry(0.13, 5), std([0xc0392b, 0xffb03a, 0x8a4a1a][i % 3], { side: THREE.DoubleSide }), -2 + i * 0.5, 3.15, 1.98); leaf.rotation.z = i; }
  });
  deck('winter', 0x9fd8ff, (v) => {
    mesh(v, new THREE.BoxGeometry(4.6, 0.18, 3.3), std(0xffffff, { roughness: 1 }), 0, 3.95, 0.4).rotation.x = -0.28; // snow on the canopy
    for (let i = 0; i < 10; i++) { const ic = mesh(v, new THREE.ConeGeometry(0.06, 0.35 + (i % 3) * 0.1, 6), std(0xdff6ff, { transparent: true, opacity: 0.85 }), -2.1 + i * 0.47, 3.0, 2.0); ic.rotation.x = Math.PI; }
    const tree = new THREE.Group();
    for (const [y, r] of [[0.5, 0.45], [0.85, 0.32], [1.15, 0.2]]) mesh(tree, new THREE.ConeGeometry(r, 0.5, 8), std(0x2f8a4a), 0, y, 0);
    ball(tree, 0.07, 0xffe27a, 0, 1.42, 0, { emissive: 0xffc020, emissiveIntensity: 0.8 });
    tree.position.set(2.6, 0, 1.6);
    v.add(tree);
  });
  let shown = null;
  g.userData.setSeason = (id) => {
    if (id === shown || !looks[id]) return;
    if (shown) looks[shown].visible = false;
    looks[id].visible = true;
    shown = id;
  };
  g.userData.setSeason('spring');
  return g;
}

/** A carved jack-o'-lantern with a candle glowing inside (Halloween all over town). */
export function makeJackOLantern(size = 1, r = 0.5) {
  const g = new THREE.Group();
  const orange = std(r > 0.5 ? 0xf07a1a : 0xe86a10, { roughness: 0.55 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    mesh(g, new THREE.SphereGeometry(0.22, 12, 10), orange, Math.sin(a) * 0.17, 0.3, Math.cos(a) * 0.17).scale.set(0.75, 1.0, 0.75);
  }
  mesh(g, new THREE.CylinderGeometry(0.03, 0.05, 0.16, 6), std(0x4a6a2a), 0.02, 0.6, 0).rotation.z = 0.3;
  const glow = new THREE.MeshBasicMaterial({ color: 0xffc040 });
  const tri = new THREE.CircleGeometry(0.075, 3);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(tri, glow); e.position.set(s * 0.1, 0.36, 0.355); e.rotation.z = Math.PI / 2; g.add(e); }
  const grin = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.15, 12, 1, Math.PI * 1.15, Math.PI * 0.7), glow);
  grin.position.set(0, 0.32, 0.355);
  g.add(grin);
  g.scale.setScalar(size * (0.85 + r * 0.4));
  return g;
}

/**
 * Santa's corner at Christmas: a decorated fir tree (baubles, a star, twinkling lights) with a heap
 * of wrapped presents under it, and his sack. `userData.update(t)` twinkles the lights.
 */
export function makeChristmasCorner() {
  const g = new THREE.Group(), tree = new THREE.Group();
  tree.position.set(2.6, 0, -1.2);
  g.add(tree);
  mesh(tree, new THREE.CylinderGeometry(0.16, 0.2, 0.6, 8), std(0x6b4a2c), 0, 0.3, 0);
  const fir = std(0x1f6a3a, { roughness: 0.85, flatShading: true });
  for (const [y, rr, h] of [[0.5, 1.35, 1.3], [1.3, 1.05, 1.15], [2.0, 0.72, 1.0], [2.6, 0.4, 0.8]]) mesh(tree, new THREE.ConeGeometry(rr, h, 9), fir, 0, y + h / 2, 0);
  const star = mesh(tree, new THREE.OctahedronGeometry(0.22, 0), std(0xffe27a, { emissive: 0xffc020, emissiveIntensity: 0.9, metalness: 0.4 }), 0, 3.55, 0);
  star.scale.set(1, 1.3, 0.5);
  const lights = [];
  const COLORS = [0xff4a4a, 0xffd23f, 0x4ad0ff, 0x6aff7a, 0xff8ae0];
  for (let i = 0; i < 34; i++) {
    const u = i / 34, a = u * Math.PI * 2 * 4.2, y = 0.6 + u * 2.7, rr = 1.3 * (1 - u * 0.82) + 0.02;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), new THREE.MeshBasicMaterial({ color: COLORS[i % COLORS.length] }));
    m.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
    tree.add(m);
    lights.push(m);
  }
  for (let i = 0; i < 12; i++) { // baubles
    const u = (i + 0.5) / 12, a = i * 2.4, y = 0.7 + u * 2.3, rr = 1.2 * (1 - u * 0.8);
    mesh(tree, new THREE.SphereGeometry(0.09, 10, 8), std([0xd8202a, 0xffd23f, 0x3a6ac0][i % 3], { metalness: 0.6, roughness: 0.25 }), Math.cos(a) * rr, y, Math.sin(a) * rr);
  }
  const WRAP = [[0xd8202a, 0xffd23f], [0x2f7a3a, 0xd8202a], [0x3a6ac0, 0xffffff], [0xf0e0b0, 0x2f7a3a], [0x8a3ab8, 0xffd23f]];
  for (let i = 0; i < 7; i++) { // presents under the tree, with ribbons
    const [paper, ribbon] = WRAP[i % WRAP.length], s = 0.32 + (i % 3) * 0.1;
    const a = i * 0.9, box = new THREE.Group();
    box.position.set(Math.cos(a) * 1.3 + 2.6, s / 2, Math.sin(a) * 0.9 - 0.2);
    box.rotation.y = a;
    g.add(box);
    mesh(box, new THREE.BoxGeometry(s, s, s), std(paper), 0, 0, 0);
    mesh(box, new THREE.BoxGeometry(s + 0.01, s + 0.01, 0.06), std(ribbon), 0, 0, 0);
    mesh(box, new THREE.BoxGeometry(0.06, s + 0.01, s + 0.01), std(ribbon), 0, 0, 0);
    for (const sx of [-1, 1]) mesh(box, new THREE.TorusGeometry(0.06, 0.02, 6, 10), std(ribbon), sx * 0.06, s / 2 + 0.04, 0).rotation.y = Math.PI / 2;
  }
  const sleigh = makeSleigh(); // his sleigh and reindeer, behind him
  sleigh.position.set(-2.4, 0, -3.2);
  sleigh.rotation.y = 0.5;
  g.add(sleigh);
  // Santa's sack, bulging with more presents
  const sack = mesh(g, new THREE.SphereGeometry(0.5, 14, 12), std(0xa0302a, { roughness: 0.95 }), -1.1, 0.48, -0.3);
  sack.scale.set(1, 1.1, 0.9);
  mesh(g, new THREE.CylinderGeometry(0.12, 0.2, 0.25, 10), std(0xa0302a, { roughness: 0.95 }), -1.1, 1.05, -0.3);
  mesh(g, new THREE.TorusGeometry(0.13, 0.03, 6, 12), std(0xffd23f), -1.1, 0.97, -0.3).rotation.x = Math.PI / 2;
  g.userData.update = (t) => {
    lights.forEach((m, i) => { m.visible = Math.sin(t * 3 + i * 1.7) > -0.4; });
    star.rotation.y = t * 0.8;
  };
  return g;
}

/** Twinkling lights wound round a tree (Christmas: on every tree in town). `trees` = [{ x, z, s }]. */
export function makeTreeLights(trees) {
  const COLORS = [0xff4a4a, 0xffd23f, 0x4ad0ff, 0x6aff7a, 0xff8ae0].map((c) => new THREE.Color(c));
  // the crowns' real shapes (client/nature.js treeGeometry): a pine is four stacked cones, the leafy trees a big ball at 4 up
  const PINE = [[2.1, 2.4, 2.0], [1.7, 2.1, 3.3], [1.25, 1.8, 4.5], [0.7, 1.3, 5.5]]; // [radius, height, middle]
  const PER = 24, n = trees.length * PER;
  const lights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), Math.max(1, n));
  const m = new THREE.Matrix4();
  let k = 0;
  for (const t of trees) {
    for (let i = 0; i < PER; i++, k++) {
      const a = i * 2.39996 + t.x; // golden-angle spread round the crown
      let x, y, z;
      if (t.kind === 'pine') { // on a tier's sloping side, in its lower part (the upper part hides under the next tier)
        const [r, h, mid] = PINE[i % 4], u = 0.08 + ((i * 0.37) % 0.45);
        const rr = r * (1 - u) * 0.98;
        x = Math.cos(a) * rr; z = Math.sin(a) * rr; y = mid - h / 2 + u * h;
      } else { // on the big ball (its flat faces sit a little inside the round)
        const y0 = 4 + (((i * 0.61) % 1) - 0.45) * 2.4, rr = Math.sqrt(Math.max(0, (1.9 * 0.97) ** 2 - (y0 - 4) ** 2));
        x = Math.cos(a) * rr; z = Math.sin(a) * rr; y = y0;
      }
      m.makeTranslation(t.x + x * t.s, y * t.s, t.z + z * t.s);
      lights.setMatrixAt(k, m);
      lights.setColorAt(k, COLORS[k % COLORS.length]);
    }
  }
  lights.count = n;
  lights.frustumCulled = false;
  const dim = COLORS.map((c) => c.clone().multiplyScalar(0.35)); // blinked off: a dim glow, not a black dot
  let last = -1;
  lights.userData.update = (time) => { // a few at a time blink off and on
    const step = Math.floor(time * 3);
    if (step === last) return;
    last = step;
    for (let i = 0; i < n; i++) lights.setColorAt(i, Math.sin(step * 1.3 + i * 2.7) > -0.6 ? COLORS[i % COLORS.length] : dim[i % COLORS.length]);
    lights.instanceColor.needsUpdate = true;
  };
  return lights;
}

/** Grandma's Easter corner: a big wicker basket heaped with pastel eggs, more eggs in the grass, and spring flowers. */
export function makeEasterCorner() {
  const g = new THREE.Group();
  const wicker = std(0xc8964a, { roughness: 1 }), PASTEL = [0xffb3d1, 0xb3e0ff, 0xfff0a0, 0xc8f0b0, 0xd8c0ff, 0xffd0a8];
  const basket = new THREE.Group();
  basket.position.set(2.2, 0, -0.6);
  g.add(basket);
  const bowl = mesh(basket, new THREE.CylinderGeometry(0.85, 0.6, 0.7, 16, 1, true), wicker, 0, 0.35, 0);
  bowl.material = wicker.clone();
  bowl.material.side = THREE.DoubleSide;
  for (let i = 0; i < 4; i++) mesh(basket, new THREE.TorusGeometry(0.62 + i * 0.07, 0.03, 4, 20), wicker, 0, 0.1 + i * 0.18, 0).rotation.x = Math.PI / 2; // weave
  mesh(basket, new THREE.TorusGeometry(0.75, 0.05, 6, 20, Math.PI), wicker, 0, 0.7, 0); // the handle
  mesh(basket, new THREE.CylinderGeometry(0.78, 0.78, 0.06, 16), std(0x8ad870, { roughness: 1 }), 0, 0.62, 0); // grass lining
  const egg = (parent, x, y, z, c, s = 1) => {
    const e = mesh(parent, new THREE.SphereGeometry(0.16 * s, 12, 10), std(c, { roughness: 0.4 }), x, y, z);
    e.scale.y = 1.3;
    mesh(e, new THREE.TorusGeometry(0.16 * s, 0.018 * s, 4, 14), std(PASTEL[(PASTEL.indexOf(c) + 2) % PASTEL.length]), 0, 0, 0).rotation.x = Math.PI / 2; // a painted band
    return e;
  };
  for (let i = 0; i < 9; i++) { const a = i * 0.7, r = (i % 3) * 0.22; egg(basket, Math.cos(a) * r, 0.78 + (i % 2) * 0.12, Math.sin(a) * r, PASTEL[i % PASTEL.length]); }
  for (let i = 0; i < 8; i++) { const a = i * 0.9 + 0.3, r = 1.6 + (i % 3) * 0.5; egg(g, 2.2 + Math.cos(a) * r, 0.2, -0.6 + Math.sin(a) * r * 0.7, PASTEL[(i + 3) % PASTEL.length], 0.9).rotation.z = (i % 2 ? 0.4 : -0.3); }
  for (let i = 0; i < 10; i++) { // spring flowers
    const a = i * 0.63, x = -1.2 + Math.cos(a) * 0.9, z = -0.4 + Math.sin(a) * 0.5;
    mesh(g, new THREE.CylinderGeometry(0.02, 0.02, 0.35, 4), std(0x4f9a3a), x, 0.17, z);
    for (let k = 0; k < 5; k++) mesh(g, new THREE.SphereGeometry(0.06, 6, 5), std(PASTEL[i % PASTEL.length]), x + Math.cos(k * 1.26) * 0.07, 0.36, z + Math.sin(k * 1.26) * 0.07);
    mesh(g, new THREE.SphereGeometry(0.04, 6, 5), std(0xffd23f), x, 0.38, z);
  }
  g.userData.update = (t) => { basket.rotation.y = Math.sin(t * 0.8) * 0.05; };
  return g;
}

/** A snowman: three snowballs, coal eyes and buttons, a carrot nose, twig arms, a scarf and a top hat. */
export function makeSnowman(r = 0.5) {
  const g = new THREE.Group(), snow = std(0xf6faff, { roughness: 1 }), coal = std(0x1a1a1a);
  const s = 0.85 + r * 0.35;
  mesh(g, new THREE.SphereGeometry(0.7, 16, 12), snow, 0, 0.6, 0);
  mesh(g, new THREE.SphereGeometry(0.5, 16, 12), snow, 0, 1.5, 0);
  mesh(g, new THREE.SphereGeometry(0.36, 16, 12), snow, 0, 2.2, 0);
  for (const sx of [-1, 1]) mesh(g, new THREE.SphereGeometry(0.05, 6, 5), coal, sx * 0.12, 2.28, 0.31);
  mesh(g, new THREE.ConeGeometry(0.05, 0.3, 8), std(0xff7a1a), 0, 2.2, 0.45).rotation.x = Math.PI / 2;
  for (const y of [1.35, 1.55, 1.75]) mesh(g, new THREE.SphereGeometry(0.045, 6, 5), coal, 0, y, 0.48 - Math.abs(y - 1.55) * 0.3);
  for (const sx of [-1, 1]) { const arm = mesh(g, new THREE.CylinderGeometry(0.025, 0.035, 0.9, 5), std(0x5a3a22), sx * 0.75, 1.65, 0); arm.rotation.z = -sx * 1.1; }
  const scarf = [0xd8302a, 0x2f7a3a, 0x3a6ac0][Math.floor(r * 3)];
  mesh(g, new THREE.TorusGeometry(0.33, 0.07, 6, 18), std(scarf, { roughness: 1 }), 0, 1.92, 0).rotation.x = Math.PI / 2;
  mesh(g, new THREE.BoxGeometry(0.14, 0.4, 0.05), std(scarf, { roughness: 1 }), 0.18, 1.72, 0.3).rotation.z = 0.2;
  mesh(g, new THREE.CylinderGeometry(0.38, 0.38, 0.04, 16), coal, 0, 2.5, 0);
  mesh(g, new THREE.CylinderGeometry(0.25, 0.25, 0.4, 16), coal, 0, 2.72, 0);
  g.scale.setScalar(s);
  return g;
}

/** A little pile of wrapped sweets (Halloween). */
export function makeCandyPile(r = 0.5) {
  const g = new THREE.Group(), COLS = [0xff4a8a, 0xffd23f, 0x7fd8ff, 0x9aff6a, 0xff8a2a, 0xb48cff];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.3 + r * 6, d = (i % 3) * 0.14, c = COLS[(i + Math.floor(r * 6)) % COLS.length];
    const sweet = new THREE.Group();
    sweet.position.set(Math.cos(a) * d, 0.07 + (i > 5 ? 0.09 : 0), Math.sin(a) * d);
    sweet.rotation.y = a;
    mesh(sweet, new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), std(c, { roughness: 0.3 }), 0, 0, 0).rotation.z = Math.PI / 2;
    for (const sx of [-1, 1]) mesh(sweet, new THREE.ConeGeometry(0.05, 0.08, 6), std(c, { roughness: 0.3 }), sx * 0.1, 0, 0).rotation.z = -sx * Math.PI / 2; // twisted wrapper ends
    g.add(sweet);
  }
  mesh(g, new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4), std(0xffffff), 0.2, 0.15, 0.1).rotation.z = 0.5; // a lollipop
  mesh(g, new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12), std(0xff4a8a, { roughness: 0.3 }), 0.27, 0.29, 0.1).rotation.x = Math.PI / 2;
  return g;
}

/** Santa's sleigh behind him, and two reindeer harnessed to it (Rudolph at the front). */
function makeSleigh() {
  const g = new THREE.Group(), red = std(0xb81e26, { roughness: 0.5 }), gold = std(0xffcf3f, { metalness: 0.7, roughness: 0.3 });
  mesh(g, new THREE.BoxGeometry(1.6, 0.6, 2.4), red, 0, 0.75, 0);
  mesh(g, new THREE.BoxGeometry(1.6, 0.8, 0.3), red, 0, 1.1, -1.1); // the high back
  for (const sx of [-1, 1]) {
    const runner = mesh(g, new THREE.TorusGeometry(0.4, 0.05, 6, 12, Math.PI / 2), gold, sx * 0.7, 0.42, 1.0);
    runner.rotation.y = Math.PI / 2;
    mesh(g, new THREE.BoxGeometry(0.08, 0.08, 2.6), gold, sx * 0.7, 0.05, -0.1);
    for (const z of [-0.8, 0.6]) mesh(g, new THREE.BoxGeometry(0.06, 0.4, 0.06), gold, sx * 0.7, 0.25, z);
  }
  mesh(g, new THREE.BoxGeometry(1.65, 0.08, 2.45), gold, 0, 1.06, 0);
  mesh(g, new THREE.SphereGeometry(0.45, 12, 10), std(0x8a2a22, { roughness: 1 }), 0.2, 1.3, -0.4); // a sack of presents
  for (const [x, z, c] of [[-0.4, 0.4, 0x2f7a3a], [-0.3, -0.2, 0x3a6ac0], [0.4, 0.6, 0xffd23f]]) mesh(g, new THREE.BoxGeometry(0.35, 0.35, 0.35), std(c), x, 1.25, z);
  const deer = (x, z, rudolph) => {
    const d = new THREE.Group(), fur = std(0x8a5a34, { roughness: 1 }), dark = std(0x4a2e1a);
    d.position.set(x, 0, z);
    mesh(d, new THREE.CapsuleGeometry(0.28, 0.7, 4, 10), fur, 0, 1.0, 0).rotation.x = Math.PI / 2;
    for (const [lx, lz] of [[-0.18, 0.35], [0.18, 0.35], [-0.18, -0.35], [0.18, -0.35]]) mesh(d, new THREE.CylinderGeometry(0.06, 0.05, 0.85, 6), fur, lx, 0.45, lz);
    mesh(d, new THREE.CylinderGeometry(0.12, 0.16, 0.5, 8), fur, 0, 1.35, 0.5).rotation.x = -0.5; // neck
    const head = mesh(d, new THREE.SphereGeometry(0.2, 10, 8), fur, 0, 1.65, 0.72);
    head.scale.set(0.9, 0.9, 1.3);
    mesh(d, new THREE.SphereGeometry(0.07, 8, 6), rudolph ? std(0xff2020, { emissive: 0xff2020, emissiveIntensity: 1 }) : dark, 0, 1.6, 0.98); // the nose
    for (const sx of [-1, 1]) {
      mesh(d, new THREE.SphereGeometry(0.035, 6, 5), std(0x111111), sx * 0.1, 1.72, 0.88);
      const antler = new THREE.Group();
      antler.position.set(sx * 0.12, 1.82, 0.62);
      antler.rotation.z = -sx * 0.5;
      mesh(antler, new THREE.CylinderGeometry(0.025, 0.03, 0.45, 5), std(0xd8c8a0), 0, 0.22, 0);
      for (let k = 0; k < 2; k++) mesh(antler, new THREE.CylinderGeometry(0.02, 0.025, 0.2, 5), std(0xd8c8a0), sx * 0.08, 0.2 + k * 0.15, 0).rotation.z = -sx * 0.9;
      d.add(antler);
    }
    mesh(d, new THREE.TorusGeometry(0.2, 0.04, 6, 14), std(0xd8302a), 0, 1.3, 0.48).rotation.x = Math.PI / 2 - 0.5; // a collar with bells
    mesh(d, new THREE.SphereGeometry(0.05, 6, 5), gold, 0, 1.12, 0.6);
    return d;
  };
  g.add(deer(0, 3.0, false), deer(0, 4.8, true));
  for (const sx of [-1, 1]) mesh(g, new THREE.BoxGeometry(0.03, 0.03, 3.2), std(0x6b4a2c), sx * 0.3, 0.95, 2.6); // the reins
  return g;
}
