// Pet models + animation. Pets are 'pet' entities on the host (they follow and fight);
// PetEntityView shows one, PetView is the model itself (also used on the pet stall).
// The first four species are hand-made below; the rest come from makeCritter's kit.
import * as THREE from 'three';
import { petStage, petTier } from '../shared/pets.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
const EYE_WHITE = std(0xffffff), PUPIL = new THREE.MeshBasicMaterial({ color: 0x111111 }), PINK = std(0xff9ab8);

function part(parent, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  parent.add(m);
  return m;
}
const ball = (r, seg = 14) => new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.7 | 0));

/** Two shiny cartoon eyes looking forward (+z). */
function eyes(parent, y, z, spread, size) {
  for (const s of [-1, 1]) {
    part(parent, ball(size, 10), EYE_WHITE, s * spread, y, z);
    part(parent, ball(size * 0.55, 8), PUPIL, s * spread, y, z + size * 0.6);
    part(parent, ball(size * 0.18, 6), EYE_WHITE, s * spread + size * 0.2, y + size * 0.25, z + size * 0.95);
  }
}

// Each builder returns { body, parts } where `parts` holds pieces the animation moves.
// Models face +z and stand on y = 0; roughly 0.4–0.7 units tall (characters are ~2.5).
const BUILDERS = {
  frog() {
    const body = new THREE.Group(), green = std(0x6fcf4a), belly = std(0xd8f5a0);
    part(body, ball(0.32), green, 0, 0.26, 0, 1.15, 0.8, 1.05);
    part(body, ball(0.24), belly, 0, 0.2, 0.12, 1, 0.65, 0.9);
    for (const s of [-1, 1]) part(body, ball(0.12), green, s * 0.17, 0.48, 0.12);
    eyes(body, 0.5, 0.2, 0.17, 0.075);
    for (const s of [-1, 1]) part(body, ball(0.05), PINK, s * 0.25, 0.3, 0.27, 1, 0.6, 0.4); // rosy cheeks
    const legs = [];
    for (const s of [-1, 1]) {
      legs.push(part(body, ball(0.12), green, s * 0.3, 0.1, -0.12, 1, 0.6, 1.5)); // back legs
      part(body, ball(0.07), green, s * 0.2, 0.06, 0.26);                           // front feet
    }
    return { body, parts: { legs }, headTop: [0, 0.6, 0.12] };
  },
  turtle() {
    const body = new THREE.Group(), skin = std(0x8fd16a), shell = std(0x8a5a34), spots = std(0xb98a4a);
    part(body, new THREE.SphereGeometry(0.36, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), shell, 0, 0.12, 0, 1, 0.85, 1.15);
    part(body, new THREE.CylinderGeometry(0.37, 0.37, 0.06, 18), std(0xd9b76a), 0, 0.12, 0, 1, 1, 1.15);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(body, ball(0.07, 8), spots, Math.cos(a) * 0.2, 0.33, Math.sin(a) * 0.24, 1, 0.35, 1);
    }
    part(body, ball(0.08, 8), spots, 0, 0.42, 0, 1, 0.35, 1);
    const head = part(body, ball(0.14), skin, 0, 0.2, 0.46);
    eyes(head, 0.05, 0.08, 0.07, 0.04);
    const legs = [];
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) legs.push(part(body, ball(0.08), skin, x * 0.26, 0.06, z * 0.28, 1, 0.8, 1.2));
    part(body, new THREE.ConeGeometry(0.04, 0.14, 6), skin, 0, 0.1, -0.44).rotation.x = -Math.PI / 2;
    return { body, parts: { head, legs }, headTop: [0, 0.36, 0.46] };
  },
  cat() {
    const body = new THREE.Group(), fur = std(0xff9f45), light = std(0xffe3c2);
    part(body, ball(0.2), fur, 0, 0.26, -0.05, 0.9, 0.85, 1.45);
    const head = new THREE.Group();
    head.position.set(0, 0.5, 0.24);
    body.add(head);
    part(head, ball(0.2), fur, 0, 0, 0);
    part(head, ball(0.1), light, 0, -0.06, 0.13, 1.2, 0.8, 0.8);
    part(head, ball(0.03, 6), PINK, 0, -0.02, 0.21);
    eyes(head, 0.04, 0.15, 0.08, 0.045);
    for (const s of [-1, 1]) {
      const ear = part(head, new THREE.ConeGeometry(0.075, 0.14, 4), fur, s * 0.11, 0.17, 0);
      ear.rotation.set(0, Math.PI / 4, -s * 0.25);
    }
    const legs = [];
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) legs.push(part(body, new THREE.CylinderGeometry(0.045, 0.05, 0.2, 8), x < 0 && z < 0 ? light : fur, x * 0.1, 0.1, z * 0.16 - 0.04));
    // tail: a chain of balls that sways
    const tail = new THREE.Group();
    tail.position.set(0, 0.32, -0.32);
    body.add(tail);
    for (let i = 0; i < 6; i++) part(tail, ball(0.045 - i * 0.003, 8), i === 5 ? light : fur, 0, i * 0.06, -i * 0.03);
    return { body, parts: { head, legs, tail }, headTop: [0, 0.7, 0.24] };
  },
  mouse() {
    const body = new THREE.Group(), fur = std(0xb8b0b8), pink = PINK;
    part(body, ball(0.17), fur, 0, 0.16, -0.03, 0.95, 0.85, 1.35);
    const head = new THREE.Group();
    head.position.set(0, 0.2, 0.18);
    body.add(head);
    part(head, new THREE.ConeGeometry(0.12, 0.24, 12), fur, 0, 0, 0.06).rotation.x = Math.PI / 2;
    part(head, ball(0.03, 6), pink, 0, 0, 0.19);
    for (const s of [-1, 1]) {
      part(head, ball(0.09), fur, s * 0.1, 0.12, -0.02, 1, 1, 0.3);
      part(head, ball(0.065), pink, s * 0.1, 0.12, 0.0, 1, 1, 0.25);
    }
    eyes(head, 0.05, 0.06, 0.06, 0.03);
    const tail = new THREE.Group();
    tail.position.set(0, 0.12, -0.24);
    body.add(tail);
    for (let i = 0; i < 8; i++) part(tail, ball(0.018, 6), pink, 0, Math.sin(i * 0.6) * 0.04, -i * 0.045);
    return { body, parts: { head, tail }, headTop: [0, 0.36, 0.16] };
  },
};

// ------------------------------------------------------------------ the critter kit

const LOOKS = {
  maple:    { shape: 'quad', body: 0xf2b27a, belly: 0xf8d2a8, ears: 'floppy', tail: 'puff', fluffy: true, nose: 0x3a2a20 },
  bunny:    { shape: 'quad', body: 0xffffff, belly: 0xfff0f5, ears: 'long', tail: 'puff', inner: 0xffb3c9, nose: 0xff8aa8 },
  hamster:  { shape: 'round', body: 0xf0b060, belly: 0xfff3dd, ears: 'round', cheeks: true, nose: 0xff9ab8 },
  hedgehog: { shape: 'round', body: 0xd9b48a, belly: 0xf5e2c8, ears: 'round', spikes: 0x6b4a2c, nose: 0x2a1a10 },
  chick:    { shape: 'bird', body: 0xffe066, beak: 0xff9a2a, small: true },
  duck:     { shape: 'bird', body: 0xfff07a, beak: 0xff8a1a, bill: true },
  penguin:  { shape: 'bird', body: 0x2a2a3a, belly: 0xffffff, beak: 0xffb02a, upright: true },
  owl:      { shape: 'bird', body: 0x9a6a3c, belly: 0xe9d2a8, beak: 0xffb02a, tufts: true, bigEyes: true },
  fox:      { shape: 'quad', body: 0xff8a3a, belly: 0xffffff, ears: 'pointy', tail: 'fluffy', tip: 0xffffff, nose: 0x2a1a10 },
  piglet:   { shape: 'quad', body: 0xffb3c6, ears: 'pointy', tail: 'curl', snout: 0xff8aa8 },
  panda:    { shape: 'quad', body: 0xffffff, limbs: 0x26262e, ears: 'round', earColor: 0x26262e, patches: true, nose: 0x26262e },
  axolotl:  { shape: 'quad', body: 0xffb3d1, belly: 0xffd6e6, ears: 'none', gills: 0xff5a9e, tail: 'fin', low: true },
  dragon:   { shape: 'quad', body: 0x5fcf6a, belly: 0xfff0a0, ears: 'none', horns: 0xfff3c0, wings: 0x3f9a4a, tail: 'spiky' },
  unicorn:  { shape: 'quad', body: 0xffffff, belly: 0xfff6ff, ears: 'pointy', mane: [0xff7ab0, 0xffd23f, 0x7fd4ff, 0xb48cff], tail: 'mane', tall: true, horn: 0xffd23f },
  bee:      { shape: 'bee', body: 0xffd23f, stripes: 0x2a2a2a },
  snail:    { shape: 'snail', body: 0xd9e8a0, shell: 0xc0703a },
};

/** Builds a critter from its LOOKS entry. Returns the same shape as the hand-made builders. */
function makeCritter(L, stage) {
  const g = new THREE.Group();
  const fur = std(L.body), belly = std(L.belly ?? L.body), dark = std(L.limbs ?? L.body);
  const parts = { legs: [] };
  let headTop = [0, 0.6, 0.2];

  const fluff = (parent, x, y, z, r) => { // curly fluff for Maple
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      part(parent, ball(r * 0.45, 8), fur, x + Math.cos(a) * r * 0.75, y + Math.sin(a * 2) * r * 0.25, z + Math.sin(a) * r * 0.75);
    }
  };

  if (L.shape === 'quad') {
    const h = L.low ? 0.18 : L.tall ? 0.42 : 0.28; // body height off the ground
    const bodyLen = L.low ? 1.5 : 1.25;
    part(g, ball(0.22), fur, 0, h + 0.05, -0.02, 1, 0.9, bodyLen);
    part(g, ball(0.17), belly, 0, h - 0.02, 0.04, 0.95, 0.7, bodyLen * 0.9);
    if (L.fluffy) fluff(g, 0, h + 0.12, -0.02, 0.22);
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const leg = part(g, new THREE.CylinderGeometry(0.05, 0.055, h, 8), L.limbs ? dark : fur, x * 0.11, h / 2, z * 0.16);
      parts.legs.push(leg);
    }
    const head = new THREE.Group();
    head.position.set(0, h + 0.28, 0.27);
    g.add(head);
    parts.head = head;
    part(head, ball(0.2), fur, 0, 0, 0);
    if (L.fluffy) fluff(head, 0, 0.08, -0.02, 0.17);
    if (L.patches) for (const sx of [-1, 1]) part(head, ball(0.065, 8), std(0x26262e), sx * 0.08, 0.03, 0.15, 1, 1.2, 0.5);
    eyes(head, 0.03, 0.16, 0.08, 0.042);
    part(head, ball(0.09), belly, 0, -0.07, 0.14, 1.1, 0.8, 0.9); // muzzle
    if (L.nose) part(head, ball(0.035, 8), std(L.nose), 0, -0.03, 0.23);
    if (L.snout) { part(head, new THREE.CylinderGeometry(0.07, 0.08, 0.06, 12), std(L.snout), 0, -0.05, 0.2).rotation.x = Math.PI / 2; }
    const ear = (sx) => {
      if (L.ears === 'floppy') { const e = part(head, ball(0.09), std(0xe39a62), sx * 0.17, -0.02, 0, 0.5, 1.3, 0.8); e.rotation.z = sx * 0.3; }
      else if (L.ears === 'long') { part(head, ball(0.06), fur, sx * 0.08, 0.27, -0.02, 0.8, 3, 0.5); if (L.inner) part(head, ball(0.035), std(L.inner), sx * 0.08, 0.27, 0.01, 0.8, 3, 0.4); }
      else if (L.ears === 'pointy') { const e = part(head, new THREE.ConeGeometry(0.06, 0.13, 4), fur, sx * 0.11, 0.17, 0); e.rotation.z = -sx * 0.25; }
      else if (L.ears === 'round') part(head, ball(0.06), std(L.earColor ?? L.body), sx * 0.13, 0.15, 0, 1, 1, 0.5);
    };
    if (L.ears !== 'none') for (const sx of [-1, 1]) ear(sx);
    if (L.gills) for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
      const gl = part(head, new THREE.ConeGeometry(0.03, 0.16, 5), std(L.gills), sx * 0.19, 0.08 - i * 0.07, -0.02);
      gl.rotation.z = -sx * (1.0 + i * 0.25);
    }
    if (L.horns) for (const sx of [-1, 1]) { const hn = part(head, new THREE.ConeGeometry(0.03, 0.14, 6), std(L.horns), sx * 0.08, 0.2, -0.05); hn.rotation.x = -0.4; }
    if (L.horn && stage >= 1) { const hn = part(head, new THREE.ConeGeometry(0.035, 0.26, 8), std(L.horn, { emissive: 0x664400 }), 0, 0.24, 0.08); hn.rotation.x = 0.35; }
    if (L.mane) L.mane.forEach((c, i) => part(g, ball(0.06, 8), std(c), 0, h + 0.33 - i * 0.07, 0.15 - i * 0.09));
    // tails
    const tail = new THREE.Group();
    tail.position.set(0, h + 0.1, -0.3);
    g.add(tail);
    parts.tail = tail;
    if (L.tail === 'puff') part(tail, ball(0.08), L.fluffy ? fur : std(0xffffff), 0, 0.02, 0);
    else if (L.tail === 'fluffy') { part(tail, ball(0.1), fur, 0, 0.1, -0.1, 1, 1, 1.8); part(tail, ball(0.07), std(L.tip), 0, 0.14, -0.26); }
    else if (L.tail === 'curl') part(tail, new THREE.TorusGeometry(0.05, 0.018, 6, 12), fur, 0, 0.04, -0.02);
    else if (L.tail === 'fin') { const f = part(tail, ball(0.1), std(L.gills ?? L.body), 0, -0.02, -0.12, 0.25, 0.9, 1.6); f.rotation.x = 0.2; }
    else if (L.tail === 'spiky') { const t = part(tail, new THREE.ConeGeometry(0.07, 0.4, 8), fur, 0, -0.02, -0.15); t.rotation.x = -Math.PI / 2; }
    else if (L.tail === 'mane') L.mane.forEach((c, i) => part(tail, ball(0.05, 8), std(c), 0, -0.03 * i, -0.05 - i * 0.05));
    if (L.wings) {
      parts.wings = [];
      for (const sx of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(sx * 0.12, h + 0.2, -0.02);
        const w = part(pivot, new THREE.ConeGeometry(0.15, 0.4, 3), std(L.wings), sx * 0.2, 0.05, 0, 1, 1, 0.2);
        w.rotation.z = -sx * 1.2;
        g.add(pivot);
        parts.wings.push(pivot);
      }
    }
    headTop = [0, h + 0.28 + 0.2, 0.27];
  } else if (L.shape === 'round') {
    part(g, ball(0.27), fur, 0, 0.26, 0, 1.05, 0.95, 1.1);
    part(g, ball(0.2), belly, 0, 0.22, 0.1, 1, 0.9, 0.8);
    if (L.spikes) for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, rr = 0.24;
      const sp = part(g, new THREE.ConeGeometry(0.04, 0.16, 5), std(L.spikes), Math.cos(a) * rr * 0.9, 0.34 + Math.sin(i) * 0.06, -0.05 + Math.sin(a) * rr * 0.7 - 0.05);
      sp.lookAt(sp.position.x * 4, sp.position.y * 2 + 0.3, sp.position.z * 4 - 0.4);
      sp.rotateX(Math.PI / 2);
    }
    eyes(g, 0.33, 0.24, 0.09, 0.045);
    if (L.nose) part(g, ball(0.03, 8), std(L.nose), 0, 0.27, 0.3);
    if (L.cheeks) for (const sx of [-1, 1]) part(g, ball(0.08), belly, sx * 0.15, 0.22, 0.18);
    if (L.ears === 'round') for (const sx of [-1, 1]) part(g, ball(0.06), std(0xffc9a8), sx * 0.15, 0.5, 0.05, 1, 1, 0.5);
    for (const sx of [-1, 1]) parts.legs.push(part(g, ball(0.06), fur, sx * 0.13, 0.04, 0.12, 1, 0.6, 1.3));
    parts.head = g;
    headTop = [0, 0.55, 0.05];
  } else if (L.shape === 'bird') {
    const up = L.upright ? 1.3 : 1;
    part(g, ball(0.24), fur, 0, 0.27 * up, 0, 1, up, 1.05);
    if (L.belly) part(g, ball(0.19), belly, 0, 0.24 * up, 0.09, 1, up, 0.8);
    const headY = L.small ? 0.42 : 0.5 * up;
    const head = new THREE.Group();
    head.position.set(0, headY, 0.06);
    g.add(head);
    parts.head = head;
    if (!L.small) part(head, ball(0.17), fur, 0, 0, 0);
    eyes(head, 0.04, 0.13, L.bigEyes ? 0.08 : 0.07, L.bigEyes ? 0.06 : 0.035);
    if (L.bill) part(head, ball(0.07), std(L.beak), 0, -0.03, 0.18, 1.2, 0.4, 1.4);
    else { const bk = part(head, new THREE.ConeGeometry(0.045, 0.1, 6), std(L.beak), 0, -0.02, 0.18); bk.rotation.x = Math.PI / 2; }
    if (L.tufts) for (const sx of [-1, 1]) { const t = part(head, new THREE.ConeGeometry(0.04, 0.12, 4), fur, sx * 0.1, 0.16, -0.02); t.rotation.z = -sx * 0.4; }
    parts.wings = [];
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * 0.22, 0.3 * up, -0.02);
      part(pivot, ball(0.1), fur, 0, -0.04, 0, 0.35, 1.1, 1);
      g.add(pivot);
      parts.wings.push(pivot);
    }
    for (const sx of [-1, 1]) parts.legs.push(part(g, ball(0.05), std(L.beak), sx * 0.09, 0.025, 0.08, 1.2, 0.4, 1.6));
    headTop = [0, headY + (L.small ? 0.1 : 0.17), 0.06];
  } else if (L.shape === 'bee') {
    const body = part(g, ball(0.2), fur, 0, 0.55, -0.05, 1, 1, 1.3);
    for (const z of [-0.12, 0.02]) part(g, new THREE.CylinderGeometry(0.205, 0.205, 0.06, 16), std(L.stripes), 0, 0.55, z).rotation.x = Math.PI / 2;
    const head = new THREE.Group();
    head.position.set(0, 0.6, 0.25);
    g.add(head);
    parts.head = head;
    part(head, ball(0.15), fur, 0, 0, 0);
    eyes(head, 0.03, 0.12, 0.06, 0.035);
    for (const sx of [-1, 1]) { const a = part(head, new THREE.CylinderGeometry(0.01, 0.01, 0.18, 4), std(L.stripes), sx * 0.06, 0.18, 0); a.rotation.z = -sx * 0.3; part(head, ball(0.025, 6), std(L.stripes), sx * 0.09, 0.27, 0); }
    const st = part(g, new THREE.ConeGeometry(0.04, 0.12, 6), std(L.stripes), 0, 0.53, -0.33); st.rotation.x = -Math.PI / 2;
    parts.wings = [];
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * 0.1, 0.72, -0.05);
      part(pivot, ball(0.14, 10), std(0xe8f8ff, { transparent: true, opacity: 0.6 }), sx * 0.12, 0.05, 0, 1, 0.15, 0.6);
      g.add(pivot);
      parts.wings.push(pivot);
    }
    parts.hover = body;
    headTop = [0, 0.78, 0.25];
  } else if (L.shape === 'snail') {
    part(g, ball(0.12), fur, 0, 0.08, 0.05, 1, 0.6, 3);
    const shell = new THREE.Group();
    shell.position.set(0, 0.28, -0.08);
    g.add(shell);
    part(shell, new THREE.TorusGeometry(0.13, 0.08, 10, 20), std(L.shell), 0, 0, 0).rotation.y = Math.PI / 2;
    part(shell, ball(0.09), std(0xe0a060), 0.02, 0, 0);
    const head = new THREE.Group();
    head.position.set(0, 0.16, 0.36);
    g.add(head);
    parts.head = head;
    part(head, ball(0.09), fur, 0, 0, 0);
    for (const sx of [-1, 1]) {
      part(head, new THREE.CylinderGeometry(0.015, 0.015, 0.18, 5), fur, sx * 0.05, 0.13, 0);
      part(head, ball(0.035, 8), EYE_WHITE, sx * 0.05, 0.23, 0.01);
      part(head, ball(0.02, 6), PUPIL, sx * 0.05, 0.23, 0.035);
    }
    parts.shell = shell;
    headTop = [0, 0.42, 0.36];
  }
  return { body: g, parts, headTop };
}

/**
 * A new look every 5 levels (see TIER_LOOKS in shared/pets.js); they stack up:
 * 5 scarf · 10 evolve · 15 orbiting sparkles · 20 evolve + crown · 25 glowing ring ·
 * 30 golden scarf + crown gem · 35 halo · 40 rainbow ring · 45 soft light · 50 golden shimmer
 */
function decorate(built, level) {
  const tier = petTier(level);
  const fx = built.parts.fx = {};
  if (tier < 1) return;
  const [x, y, z] = built.headTop;
  const goldMat = () => std(0xffcf3f, { metalness: 0.8, roughness: 0.25, side: THREE.DoubleSide });
  const scarf = part(built.body, new THREE.TorusGeometry(0.15, 0.04, 8, 16), tier >= 6 ? goldMat() : std(0xe8433a), x, y - 0.24, z - 0.02);
  scarf.rotation.x = Math.PI / 2;
  if (tier >= 3) { // little stars circling the pet
    const orbit = new THREE.Group();
    orbit.position.set(0, y * 0.6, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), new THREE.MeshBasicMaterial({ color: [0xfff27a, 0x9fe8ff, 0xff9ad5][i] }));
      star.position.set(Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45);
      orbit.add(star);
    }
    built.body.add(orbit);
    fx.orbit = orbit;
  }
  if (tier >= 4) { // crown
    const crown = new THREE.Group();
    crown.position.set(x, y - 0.02, z);
    const gold = goldMat();
    crown.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.085, 0.06, 12, 1, true), gold));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 4), gold);
      tip.position.set(Math.cos(a) * 0.085, 0.055, Math.sin(a) * 0.085);
      crown.add(tip);
    }
    if (tier >= 6) {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), std(0xff3d6e, { emissive: 0xaa0033 }));
      gem.position.set(0, 0.01, 0.09);
      crown.add(gem);
    }
    built.body.add(crown);
  }
  if (tier >= 5) { // ring underfoot (rainbow from 40)
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 32), new THREE.MeshBasicMaterial({ color: 0xfff27a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    built.body.add(ring);
    fx.ring = ring;
    fx.rainbow = tier >= 8;
  }
  if (tier >= 7) { // halo
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 6, 20), new THREE.MeshBasicMaterial({ color: 0xfff6b0 }));
    halo.rotation.x = Math.PI / 2;
    halo.position.set(x, y + 0.16, z);
    built.body.add(halo);
    fx.halo = halo;
  }
  if (tier >= 9) { // its own soft light
    const light = new THREE.PointLight(0xfff0c0, 3, 4, 1.5);
    light.position.set(0, y + 0.3, 0);
    built.body.add(light);
  }
  if (tier >= 10) { // golden shimmer over the whole body
    fx.shimmer = [];
    built.body.traverse((o) => {
      if (!o.isMesh || !o.material.isMeshStandardMaterial) return;
      o.material = o.material.clone();
      fx.shimmer.push(o.material);
    });
  }
}

const STAGE_SCALE = [1, 1.3, 1.6];

export function buildPet(kind, level = 1) {
  const stage = petStage(level);
  const built = BUILDERS[kind]?.() ?? makeCritter(LOOKS[kind] ?? LOOKS.maple, stage);
  decorate(built, level);
  return built;
}

export class PetView {
  constructor(kind, level = 1) {
    this.kind = kind;
    this.shape = BUILDERS[kind] ? kind : LOOKS[kind]?.shape ?? 'quad';
    const built = buildPet(kind, level);
    this.root = new THREE.Group();
    this.root.add(built.body);
    this.root.scale.setScalar(STAGE_SCALE[petStage(level)]);
    this.body = built.body;
    this.parts = built.parts;
    this.t = Math.random() * 10;
    this.hop = 0;        // frog jump progress
  }

  animate(dt, moving) {
    const t = this.t, b = this.body, P = this.parts;
    b.position.y = 0;
    b.rotation.set(0, 0, 0);
    switch (this.shape) {
      case 'frog': {
        // hop when moving; an occasional little hop when idle
        if (this.hop <= 0 && (moving || Math.sin(t * 0.7) > 0.995)) this.hop = 0.45;
        if (this.hop > 0) {
          this.hop -= dt;
          const u = 1 - this.hop / 0.45;
          b.position.y = Math.sin(u * Math.PI) * 0.35;
          b.scale.set(1 - Math.sin(u * Math.PI) * 0.1, 1 + Math.sin(u * Math.PI) * 0.15, 1);
          for (const l of P.legs) l.scale.z = 1.5 + Math.sin(u * Math.PI) * 1.2;
        } else {
          const breathe = 1 + Math.sin(t * 3) * 0.03;
          b.scale.set(breathe, 1 / breathe, 1);
        }
        break;
      }
      case 'turtle': {
        const w = moving ? Math.sin(t * 6) : 0;
        b.rotation.z = w * 0.06;
        P.legs.forEach((l, i) => { l.position.y = 0.06 + Math.max(0, Math.sin(t * 6 + (i % 3 ? Math.PI : 0))) * (moving ? 0.05 : 0); });
        P.head.position.z = 0.46 + (moving ? Math.sin(t * 6) * 0.03 : Math.sin(t * 0.8) * 0.06);
        break;
      }
      case 'cat': {
        const w = t * 10;
        b.position.y = moving ? Math.abs(Math.sin(w)) * 0.05 : 0;
        P.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(w + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.5 : 0; });
        P.tail.rotation.z = Math.sin(t * (moving ? 6 : 1.8)) * 0.5;
        P.tail.rotation.x = -0.3 + Math.sin(t * 1.3) * 0.15;
        P.head.rotation.y = moving ? 0 : Math.sin(t * 0.6) * 0.35;
        break;
      }
      case 'mouse': {
        b.position.y = moving ? Math.abs(Math.sin(t * 22)) * 0.03 : 0;
        P.tail.rotation.y = Math.sin(t * (moving ? 14 : 3)) * 0.4;
        P.head.rotation.x = moving ? 0 : Math.sin(t * 9) * 0.06; // sniff sniff
        break;
      }
      case 'quad':
      case 'round': {
        const w = t * 12;
        b.position.y = moving ? Math.abs(Math.sin(w)) * 0.04 : 0;
        P.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(w + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.5 : 0; });
        if (P.tail) P.tail.rotation.y = Math.sin(t * (moving ? 10 : 3)) * 0.5; // wag
        if (P.head && P.head !== b) P.head.rotation.z = moving ? 0 : Math.sin(t * 0.9) * 0.12;
        if (P.wings) P.wings.forEach((wg, i) => { wg.rotation.z = (i ? -1 : 1) * Math.sin(t * 6) * 0.3; });
        if (this.shape === 'round') b.rotation.z = moving ? Math.sin(w) * 0.08 : 0;
        break;
      }
      case 'bird': {
        b.rotation.z = moving ? Math.sin(t * 12) * 0.12 : 0; // waddle
        b.position.y = moving ? Math.abs(Math.sin(t * 12)) * 0.03 : 0;
        P.wings.forEach((wg, i) => { wg.rotation.z = (i ? -1 : 1) * (moving ? Math.abs(Math.sin(t * 16)) * 0.6 : Math.sin(t * 2) * 0.05); });
        P.head.rotation.x = moving ? 0 : Math.sin(t * 1.4) * 0.1;
        break;
      }
      case 'bee':
        b.position.y = 0.2 + Math.sin(t * 4) * 0.08;
        P.wings.forEach((wg, i) => { wg.rotation.z = (i ? -1 : 1) * Math.sin(t * 40) * 0.6; });
        break;
      case 'snail':
        P.shell.rotation.z = Math.sin(t * 3) * 0.05;
        b.scale.z = 1 + (moving ? Math.sin(t * 8) * 0.06 : 0);
        P.head.rotation.x = Math.sin(t * 1.3) * 0.1;
        break;
    }
    const fx = P.fx ?? {};
    if (fx.orbit) fx.orbit.rotation.y = t * 2.2;
    if (fx.ring) {
      fx.ring.material.opacity = 0.25 + Math.sin(t * 3) * 0.12;
      if (fx.rainbow) fx.ring.material.color.setHSL((t * 0.25) % 1, 0.9, 0.6);
    }
    if (fx.halo) fx.halo.position.y += Math.sin(t * 2) * 0.0008;
    if (fx.shimmer) { const g = 0.12 + Math.sin(t * 2.5) * 0.1; for (const m of fx.shimmer) m.emissive.setRGB(g, g * 0.8, 0); }
  }

  dispose() {
    this.root.removeFromParent();
  }
}

/** A pet entity from the host: eases to its position, lunges when it attacks, shows its name + level. */
export class PetEntityView {
  constructor(e, makeLabel) {
    this.makeLabel = makeLabel;
    this.root = new THREE.Group();
    this.root.position.set(e.x, 0, e.z);
    this.root.rotation.y = e.rot ?? 0;
    this.target = { x: e.x, z: e.z, rot: e.rot ?? 0 };
    this.lastAct = e.act;
    this.lunge = 0;
    this.build(e);
  }

  build(e) {
    this.pet?.dispose();
    this.label?.removeFromParent();
    this.species = e.species;
    this.name = e.name ?? this.name;
    this.level = e.level;
    this.stage = petStage(e.level);
    this.pet = new PetView(e.species, e.level);
    this.root.add(this.pet.root);
    this.label = this.makeLabel(`${this.name} · Lv ${e.level}`, this.stage === 2 ? '#ffd23f' : '#c9f7ff');
    this.label.scale.multiplyScalar(0.6);
    const top = 1.0 * STAGE_SCALE[this.stage] + 0.3;
    this.label.position.y = top + 0.2;
    this.root.add(this.label);
    // health bar, always shown so you can keep an eye on your buddy
    if (!this.hpBar) {
      const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x102018, depthTest: false }));
      const fg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x5cff7a, depthTest: false }));
      bg.scale.set(0.9, 0.12, 1);
      fg.scale.set(0.9, 0.08, 1);
      bg.renderOrder = 11; fg.renderOrder = 12;
      this.hpBar = new THREE.Group();
      this.hpBar.add(bg, fg);
      this.hpFg = fg;
      this.root.add(this.hpBar);
    }
    this.hpBar.position.y = top;
    this.maxHp = e.maxHp ?? this.maxHp;
    this.setHp(e.hp ?? this.hp);
  }

  setHp(hp) {
    if (hp == null || !this.maxHp) return;
    this.hp = hp;
    const f = Math.max(0, Math.min(1, hp / this.maxHp));
    this.hpFg.scale.x = 0.9 * f;
    this.hpFg.position.x = -(0.9 * (1 - f)) / 2;
    this.hpFg.material.color.set(f > 0.5 ? 0x5cff7a : f > 0.25 ? 0xffd23f : 0xff4a4a);
  }

  /** The hurt fx calls this: a quick red blink. */
  play(name) { if (name === 'hurt') this.blink = 0.2; }

  apply(e) {
    if (e.x != null) this.target = { x: e.x, z: e.z, rot: e.rot ?? this.target.rot };
    if (e.maxHp != null) this.maxHp = e.maxHp;
    if (e.level != null && e.level !== this.level) this.build({ ...e, species: e.species ?? this.species });
    else if (e.hp != null) this.setHp(e.hp);
    if (e.act != null && e.act !== this.lastAct) { this.lastAct = e.act; this.lunge = 0.25; }
  }

  update(dt) {
    const p = this.root.position;
    const moving = Math.hypot(this.target.x - p.x, this.target.z - p.z) > 0.05;
    const k = 1 - Math.exp(-dt * 14);
    p.x += (this.target.x - p.x) * k;
    p.z += (this.target.z - p.z) * k;
    let r = this.target.rot - this.root.rotation.y;
    r = Math.atan2(Math.sin(r), Math.cos(r));
    this.root.rotation.y += r * k;
    this.pet.t += dt;
    this.pet.animate(dt, moving);
    // attack: a quick hop forward
    this.lunge = Math.max(0, this.lunge - dt);
    const u = this.lunge / 0.25;
    this.pet.root.position.z = Math.sin(u * Math.PI) * 0.5;
    this.pet.root.position.y = Math.sin(u * Math.PI) * 0.25;
    this.blink = Math.max(0, (this.blink ?? 0) - dt);
    this.pet.root.visible = !(this.blink > 0 && Math.floor(this.blink * 30) % 2);
  }

  dispose() { this.root.removeFromParent(); }
}
