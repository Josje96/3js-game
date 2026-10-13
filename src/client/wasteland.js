// The old battlefield outside Pebble Town's walls: scorched, cratered ground running out to the
// fog, ruined stone houses with charred beams, dead trees, wrecked catapults and carts, stake
// barricades, swords and spears left in the mud, torn banners, and fires still smouldering, their
// smoke drifting up. Looks only (nobody can walk out there). Everything sits outside the town's
// rectangle (w x h world units) and is placed with the layout's stable per-cell randomness.
import * as THREE from 'three';
import { glowTexture } from './effects.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true, ...extra });
const STONE = std(0x7a756c), DARK_STONE = std(0x55514a), CHAR = std(0x2a2420), WOOD = std(0x5a4030), OLD_WOOD = std(0x6e5a44);
const IRON = std(0x8a8a90, { metalness: 0.6, roughness: 0.5, flatShading: false }), RUST = std(0x7a4a2a, { metalness: 0.3 });
const BANNER = [std(0x7a1a1a, { side: THREE.DoubleSide }), std(0x2a3a6a, { side: THREE.DoubleSide }), std(0x4a4a2a, { side: THREE.DoubleSide })];

function piece(parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Scorched earth: one big plane under everything, mottled ash, mud and burnt patches. */
function ground(w, h, R) {
  const W = w + R * 2, H = h + R * 2;
  const geo = new THREE.PlaneGeometry(W, H, 110, 90);
  geo.rotateX(-Math.PI / 2);
  geo.translate(w / 2, -0.12, h / 2);
  const pos = geo.attributes.position, col = [];
  const c = new THREE.Color(), MUD = new THREE.Color(0x6a5844), ASH = new THREE.Color(0x4a4440), BURNT = new THREE.Color(0x26201c), DRY = new THREE.Color(0x857256);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const n1 = Math.sin(x * 0.11 + Math.sin(z * 0.07) * 2) * Math.cos(z * 0.09 + Math.sin(x * 0.05) * 1.5);
    const n2 = Math.sin(x * 0.37 + z * 0.29) * Math.sin(z * 0.41 - x * 0.17);
    c.copy(MUD).lerp(ASH, n1 * 0.5 + 0.5).lerp(DRY, Math.max(0, n2) * 0.5).lerp(BURNT, Math.max(0, n1 - 0.45) * 1.6);
    col.push(c.r, c.g, c.b);
    const outside = x < -2 || z < -2 || x > w + 2 || z > h + 2;
    if (outside) pos.setY(i, -0.12 + n1 * 0.35 + n2 * 0.12 - 0.2); // lumpy, churned-up ground (flat under the town)
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  m.receiveShadow = true;
  return m;
}

function crater(g, x, z, r, s) {
  piece(g, new THREE.CircleGeometry(s, 14), CHAR, x, -0.1, z, -Math.PI / 2);
  const rim = piece(g, new THREE.TorusGeometry(s, s * 0.28, 5, 14), std(0x4a3e34), x, -0.15, z, Math.PI / 2);
  rim.scale.z = 0.5;
  for (let i = 0; i < 5; i++) { // clods thrown out
    const a = r(i) * Math.PI * 2, d = s * (1.4 + r(i + 9) * 0.8);
    piece(g, new THREE.DodecahedronGeometry(0.25 + r(i + 3) * 0.3, 0), DARK_STONE, x + Math.cos(a) * d, 0, z + Math.sin(a) * d, r(i) * 3, r(i + 1) * 3, 0);
  }
}

function rubble(g, x, z, r, s = 1) {
  for (let i = 0; i < 7; i++) {
    const a = r(i) * Math.PI * 2, d = r(i + 20) * 1.6 * s, k = (0.35 + r(i + 40) * 0.5) * s;
    piece(g, new THREE.DodecahedronGeometry(k, 0), r(i + 60) < 0.5 ? STONE : DARK_STONE, x + Math.cos(a) * d, k * 0.4, z + Math.sin(a) * d, r(i) * 6, r(i + 2) * 6, r(i + 4) * 6);
  }
}

/** A burnt-out stone house: two or three broken walls, jagged at the top, a fallen charred beam. */
function ruin(g, x, z, r) {
  const house = new THREE.Group();
  house.position.set(x, 0, z);
  house.rotation.y = r(1) * Math.PI * 2;
  g.add(house);
  const W = 5 + r(2) * 3, D = 4 + r(3) * 2;
  const wall = (len, along, ox, oz, ry) => {
    for (let i = 0; i < Math.ceil(len / 0.9); i++) { // stacked blocks, each column broken off at a different height
      const t = -len / 2 + i * 0.9 + 0.45, hgt = Math.max(0.4, (1 - Math.abs(t / len) * 0.6) * (1 + r(i + along) * 3.2) * (r(i + along + 50) < 0.15 ? 0.2 : 1));
      for (let y = 0; y < hgt; y += 0.6) {
        const b = piece(house, new THREE.BoxGeometry(0.88, 0.58, 0.7), (i + Math.round(y / 0.6)) % 3 ? STONE : DARK_STONE, 0, y + 0.29, 0);
        b.position.set(ox + Math.cos(ry) * t, y + 0.29, oz - Math.sin(ry) * t);
        b.rotation.y = ry + (r(i * 7 + y * 3 + along) - 0.5) * 0.12;
      }
    }
  };
  wall(W, 10, 0, -D / 2, 0);
  wall(D, 30, -W / 2, 0, Math.PI / 2);
  if (r(4) < 0.6) wall(D * 0.6, 50, W / 2, -D * 0.2, Math.PI / 2);
  piece(house, new THREE.BoxGeometry(W * 0.9, 0.3, 0.3), CHAR, 0.4, 0.5, 0.4, 0.15, 0.3, 0.35); // fallen roof beam
  piece(house, new THREE.BoxGeometry(D * 0.8, 0.25, 0.25), CHAR, -0.8, 1.2, -0.6, 0.0, 1.2, -0.5);
  rubble(house, W * 0.2, D * 0.1, (i) => r(i + 70), 0.8);
}

function deadTree(g, x, z, r) {
  const t = new THREE.Group();
  t.position.set(x, 0, z);
  t.rotation.y = r(1) * 6.3;
  const s = 0.8 + r(2) * 0.7;
  t.scale.setScalar(s);
  g.add(t);
  const bark = r(3) < 0.5 ? CHAR : std(0x3e342c);
  piece(t, new THREE.CylinderGeometry(0.16, 0.32, 4.2, 6), bark, 0, 2.1, 0, 0, 0, (r(4) - 0.5) * 0.2);
  for (let i = 0; i < 4; i++) { // bare, crooked branches
    const y = 2.2 + i * 0.55, a = i * 2.1 + r(i) * 1.5, len = 1.6 - i * 0.25;
    const b = piece(t, new THREE.CylinderGeometry(0.04, 0.11, len, 5), bark, Math.cos(a) * len * 0.4, y + len * 0.3, Math.sin(a) * len * 0.4);
    b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    const twig = piece(t, new THREE.CylinderGeometry(0.02, 0.05, len * 0.5, 4), bark, Math.cos(a) * len * 0.8, y + len * 0.6, Math.sin(a) * len * 0.8);
    twig.rotation.set(Math.sin(a + 0.6) * 0.6, 0, -Math.cos(a + 0.6) * 0.6);
  }
}

/** A wrecked catapult: its frame on one side, the throwing arm snapped, a wheel come off. */
function catapult(g, x, z, r) {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.set(0, r(1) * 6.3, 0.18);
  g.add(c);
  for (const s of [-1, 1]) {
    piece(c, new THREE.BoxGeometry(4.2, 0.35, 0.35), OLD_WOOD, 0, 0.5, s * 1.1);
    const up = piece(c, new THREE.BoxGeometry(0.3, 2.4, 0.3), OLD_WOOD, 0.3, 1.6, s * 1.1, 0, 0, s * 0.1);
    up.rotation.z = -0.25;
  }
  piece(c, new THREE.BoxGeometry(0.3, 0.3, 2.5), OLD_WOOD, 0.6, 2.6, 0); // crossbar
  piece(c, new THREE.BoxGeometry(3.4, 0.25, 0.25), CHAR, -0.4, 1.2, 0.2, 0.2, 0.4, 0.5); // the snapped arm
  piece(c, new THREE.CylinderGeometry(0.45, 0.45, 0.3, 8), CHAR, -1.2, 0.2, -0.4, 0.2, 0, Math.PI / 2); // bucket
  const wheel = piece(c, new THREE.TorusGeometry(0.7, 0.12, 5, 10), OLD_WOOD, 2.6, 0.12, 1.8, Math.PI / 2, 0, 0.2);
  for (let i = 0; i < 4; i++) piece(wheel, new THREE.BoxGeometry(1.3, 0.08, 0.08), OLD_WOOD, 0, 0, 0, 0, 0, (i * Math.PI) / 4);
}

/** A cheval de frise: sharpened stakes crossed through a log, to stop charging horses. */
function stakes(g, x, z, r) {
  const s = new THREE.Group();
  s.position.set(x, 0, z);
  s.rotation.y = r(1) * 6.3;
  g.add(s);
  piece(s, new THREE.CylinderGeometry(0.2, 0.2, 5, 6), OLD_WOOD, 0, 0.7, 0, 0, 0, Math.PI / 2);
  for (let i = 0; i < 6; i++) {
    const xx = -2 + i * 0.8;
    for (const k of [-1, 1]) {
      const st = piece(s, new THREE.ConeGeometry(0.1, 2.4, 5), WOOD, xx, 0.7, 0, k * 0.8, 0, 0);
      st.geometry.translate(0, 0.6, 0);
    }
  }
}

/** A sword or spear stuck in the mud. */
function blade(g, x, z, r) {
  const b = new THREE.Group();
  b.position.set(x, 0, z);
  b.rotation.set((r(1) - 0.5) * 0.6, r(2) * 6.3, (r(3) - 0.5) * 0.6);
  g.add(b);
  if (r(4) < 0.5) { // sword
    piece(b, new THREE.BoxGeometry(0.1, 1.1, 0.03), r(5) < 0.5 ? IRON : RUST, 0, 0.45, 0);
    piece(b, new THREE.BoxGeometry(0.45, 0.07, 0.08), RUST, 0, 1.0, 0);
    piece(b, new THREE.CylinderGeometry(0.04, 0.04, 0.3, 5), WOOD, 0, 1.18, 0);
  } else { // spear
    piece(b, new THREE.CylinderGeometry(0.035, 0.035, 2.4, 5), OLD_WOOD, 0, 1.0, 0);
    piece(b, new THREE.ConeGeometry(0.08, 0.35, 4), IRON, 0, 2.35, 0);
  }
}

/** A tall pole with a torn banner hanging off it. */
function banner(g, x, z, r) {
  const p = new THREE.Group();
  p.position.set(x, 0, z);
  p.rotation.set(0, r(1) * 6.3, (r(2) - 0.5) * 0.35);
  g.add(p);
  piece(p, new THREE.CylinderGeometry(0.06, 0.08, 5, 6), OLD_WOOD, 0, 2.5, 0);
  const cloth = new THREE.PlaneGeometry(1.4, 2.2, 4, 6);
  const pos = cloth.attributes.position;
  for (let i = 0; i < pos.count; i++) { // ragged bottom edge and a bit of a sag
    const u = pos.getX(i), v = pos.getY(i);
    pos.setZ(i, Math.sin(u * 3 + v) * 0.12);
    if (v < -0.9) pos.setY(i, v + Math.abs(Math.sin(u * 9)) * 0.6);
  }
  cloth.computeVertexNormals();
  piece(p, cloth, BANNER[Math.floor(r(3) * BANNER.length)], 0.75, 3.6, 0);
}

/** A broken cart: a tipped-over bed and a lone wheel. */
function cart(g, x, z, r) {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.set(0, r(1) * 6.3, 0.6);
  g.add(c);
  piece(c, new THREE.BoxGeometry(2.4, 0.15, 1.4), OLD_WOOD, 0, 0.6, 0);
  for (const s of [-1, 1]) piece(c, new THREE.BoxGeometry(2.4, 0.5, 0.1), OLD_WOOD, 0, 0.85, s * 0.68);
  const wheel = piece(g, new THREE.TorusGeometry(0.55, 0.1, 5, 10), OLD_WOOD, x + 1.8, 0.1, z + 0.6, Math.PI / 2, 0, 0);
  for (let i = 0; i < 3; i++) piece(wheel, new THREE.BoxGeometry(1.0, 0.07, 0.07), OLD_WOOD, 0, 0, 0, 0, 0, (i * Math.PI) / 3);
}

/**
 * Smouldering fires: glowing embers in a ring of stones, and dark smoke drifting up off them.
 * Not merged (it moves): `update(t)` animates the smoke and flicker.
 */
function fires(spots) {
  const g = new THREE.Group(), puffs = [], flames = [];
  const smokeMat = new THREE.SpriteMaterial({ map: glowTexture(), color: 0x3a3632, transparent: true, opacity: 0.5, depthWrite: false });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7a20 });
  for (const [x, z, k] of spots) {
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 5), flameMat);
      f.position.set(x + (i - 1) * 0.25, 0.3, z + ((i * 7) % 3 - 1) * 0.2);
      g.add(f);
      flames.push(f);
    }
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Sprite(smokeMat.clone());
      s.userData = { x, z, phase: (i / 7) + k * 0.13 };
      g.add(s);
      puffs.push(s);
    }
  }
  g.userData.update = (t) => {
    for (const s of puffs) {
      const u = (t * 0.08 + s.userData.phase) % 1;
      s.position.set(s.userData.x + Math.sin(t * 0.3 + s.userData.phase * 9) * 0.8 + u * 3, 0.8 + u * 14, s.userData.z + u * 1.5);
      s.scale.setScalar(1.2 + u * 6);
      s.material.opacity = Math.sin(u * Math.PI) * 0.45;
    }
    flames.forEach((f, i) => { f.scale.y = 0.7 + Math.abs(Math.sin(t * 9 + i * 1.7)) * 0.6; });
  };
  return g;
}

/**
 * The whole battlefield round a town `w` x `h` world units big. `rand(cx, cz, salt)` is the
 * layout's stable randomness. Returns { still, moving }: `still` can be merged (never moves).
 */
export function makeWasteland(w, h, rand) {
  const still = new THREE.Group();
  const R = 110; // how far out it goes (the fog swallows the rest)
  still.add(ground(w, h, R * 2.4)); // the ground runs on past the fog, so its edge never shows
  // spots on a jittered grid all round the walls, from just outside them out to the fog
  const spots = [];
  for (let gz = -R; gz < h + R; gz += 7) for (let gx = -R; gx < w + R; gx += 7) {
    const k = (salt) => rand(Math.round(gx), Math.round(gz), salt);
    const x = gx + k('jx') * 6, z = gz + k('jz') * 6;
    const out = Math.max(-x, -z, x - w, z - h); // how far outside the town
    if (out < 5) continue;
    spots.push({ x, z, out, k });
  }
  const fireSpots = [];
  for (const { x, z, out, k } of spots) {
    const r = (i) => k(`r${i}`);
    const roll = k('what'), near = out < 45; // the most detail near the walls, where you can see it
    if (roll < 0.06) ruin(still, x, z, r);
    else if (roll < 0.14) crater(still, x, z, r, 1.5 + r(9) * 2);
    else if (roll < 0.22) deadTree(still, x, z, r);
    else if (roll < 0.27 && near) rubble(still, x, z, r, 1 + r(8));
    else if (roll < 0.30) catapult(still, x, z, r);
    else if (roll < 0.34 && near) stakes(still, x, z, r);
    else if (roll < 0.36) banner(still, x, z, r);
    else if (roll < 0.38) cart(still, x, z, r);
    else if (roll < 0.42 && near) { for (let i = 0; i < 4; i++) blade(still, x + (r(i) - 0.5) * 5, z + (r(i + 5) - 0.5) * 5, (j) => r(i * 10 + j)); }
    else if (roll < 0.45) { fireSpots.push([x, z, fireSpots.length]); rubble(still, x, z, r, 0.5); }
  }
  return { still, moving: fires(fireSpots) };
}
