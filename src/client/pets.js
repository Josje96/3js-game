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

// Four-legged critters are built from proportions (all in units; characters are ~2.5 tall):
//   body: [radius, length]  legs: [length, thickness]  neck: [length, tilt up]  head: radius
//   snout: [length, radius, 'round' | 'pointy' | 'flat' | 'long']  ears / tail: styles below
const LOOKS = {
  maple:    { shape: 'quad', body: [0.15, 0.24], legs: [0.15, 0.05], neck: [0.08, 0.9], head: 0.16, snout: [0.08, 0.075, 'round'],
              fur: 0xf2b27a, belly: 0xf8d2a8, ears: 'floppy', earColor: 0xe39a62, tail: 'puff', fluffy: true, nose: 0x3a2a20 },
  fox:      { shape: 'quad', body: [0.13, 0.3], legs: [0.2, 0.04], neck: [0.1, 0.7], head: 0.14, snout: [0.13, 0.06, 'pointy'],
              fur: 0xff8a3a, belly: 0xffffff, limbs: 0x3a2418, ears: 'tall', earInner: 0x3a2418, tail: 'bushy', tip: 0xffffff, nose: 0x2a1a10 },
  cat:      { shape: 'quad', body: [0.12, 0.28], legs: [0.17, 0.04], neck: [0.06, 0.8], head: 0.14, snout: [0.05, 0.065, 'round'],
              fur: 0xff9f45, belly: 0xffe3c2, ears: 'pointy', earInner: 0xffb3c9, tail: 'long', nose: 0xff8aa8, whiskers: true },
  bunny:    { shape: 'quad', body: [0.15, 0.2], legs: [0.09, 0.05], hind: 1.6, neck: [0.04, 1.1], head: 0.13, snout: [0.05, 0.07, 'round'],
              fur: 0xffffff, belly: 0xfff0f5, ears: 'long', earInner: 0xffb3c9, tail: 'puff', nose: 0xff8aa8, hop: true },
  piglet:   { shape: 'quad', body: [0.18, 0.26], legs: [0.11, 0.05], neck: [0.02, 0.3], head: 0.15, snout: [0.06, 0.075, 'flat'],
              fur: 0xffb3c6, belly: 0xffc9d6, snoutColor: 0xff8aa8, ears: 'flop', tail: 'curl' },
  panda:    { shape: 'quad', body: [0.2, 0.24], legs: [0.15, 0.075], neck: [0.04, 0.6], head: 0.17, snout: [0.05, 0.08, 'round'],
              fur: 0xffffff, belly: 0xffffff, limbs: 0x26262e, shoulders: 0x26262e, ears: 'round', earColor: 0x26262e, patches: true, nose: 0x26262e, tail: 'puff' },
  axolotl:  { shape: 'quad', body: [0.1, 0.36], legs: [0.06, 0.03], splay: true, neck: [0.02, 0.1], head: 0.14, headFlat: true, snout: [0.02, 0.1, 'flat'],
              fur: 0xffb3d1, belly: 0xffd6e6, gills: 0xff5a9e, tail: 'fin', smile: true },
  dragon:   { shape: 'quad', body: [0.15, 0.3], legs: [0.15, 0.055], neck: [0.16, 0.9], head: 0.13, snout: [0.12, 0.07, 'long'],
              fur: 0x5fcf6a, belly: 0xfff0a0, horns: 0xfff3c0, wings: 0x3f9a4a, tail: 'dragon', spines: 0x3f9a4a },
  unicorn:  { shape: 'quad', body: [0.15, 0.36], legs: [0.3, 0.045], hooves: 0xd8c2ff, neck: [0.2, 1.05], head: 0.12, snout: [0.14, 0.075, 'long'],
              fur: 0xffffff, belly: 0xfff6ff, ears: 'pointy', mane: [0xff7ab0, 0xffd23f, 0x7fd4ff, 0xb48cff], tail: 'mane', horn: 0xffd23f },
  hamster:  { shape: 'round', fur: 0xf0b060, belly: 0xfff3dd, ears: 'round', cheeks: true, nose: 0xff9ab8 },
  hedgehog: { shape: 'hog', fur: 0xd9b48a, belly: 0xf5e2c8, spikes: 0x6b4a2c, nose: 0x2a1a10 },
  chick:    { shape: 'bird', fur: 0xffe066, beak: 0xff9a2a, small: true },
  duck:     { shape: 'bird', fur: 0xfff07a, beak: 0xff8a1a, bill: true, long: true },
  penguin:  { shape: 'bird', fur: 0x2a2a3a, belly: 0xffffff, beak: 0xffb02a, upright: true, flippers: true },
  owl:      { shape: 'bird', fur: 0x9a6a3c, belly: 0xe9d2a8, beak: 0xffb02a, tufts: true, bigEyes: true, upright: true, disc: 0xe9d2a8 },
  bee:      { shape: 'bee', fur: 0xffd23f, stripes: 0x2a2a2a },
  snail:    { shape: 'snail', fur: 0xd9e8a0, shell: 0xc0703a },
};

/** A capsule lying along z (for bodies, snouts, legs...). */
const capsuleZ = (r, len) => new THREE.CapsuleGeometry(r, Math.max(0.001, len), 6, 14).rotateX(Math.PI / 2);

/**
 * A four-legged animal from its LOOKS proportions: a long body with chest and haunches,
 * legs that swing from the hip, a neck, a head with a snout, ears and a tail.
 */
function makeQuad(L, stage) {
  const g = new THREE.Group();
  const fur = std(L.fur), belly = std(L.belly ?? L.fur), limbs = std(L.limbs ?? L.fur);
  const [bodyR, bodyLen] = L.body, [legLen, legR] = L.legs;
  const parts = { legs: [] };
  const hipY = legLen + bodyR * 0.75;
  const front = bodyLen / 2, back = -bodyLen / 2;

  // body: a capsule, a deeper chest at the front and round haunches at the back
  part(g, capsuleZ(bodyR, bodyLen), fur, 0, hipY, 0, 1, 0.95, 1);
  part(g, ball(bodyR * 1.08), fur, 0, hipY + bodyR * 0.05, front * 0.75, 1, 1.05, 0.9);
  part(g, ball(bodyR * (L.hind ? 1.25 : 1.02)), fur, 0, hipY + (L.hind ? bodyR * 0.15 : 0), back * 0.8, 1, 1, 1);
  part(g, capsuleZ(bodyR * 0.75, bodyLen * 0.8), belly, 0, hipY - bodyR * 0.35, 0, 1, 0.6, 1);
  if (L.shoulders) part(g, capsuleZ(bodyR * 1.04, bodyLen * 0.12), std(L.shoulders), 0, hipY, front * 0.45);
  if (L.fluffy) for (let i = 0; i < 14; i++) { // Maple's curls
    const a = i * 2.4, along = (i / 13 - 0.5) * bodyLen;
    part(g, ball(bodyR * 0.42, 8), fur, Math.cos(a) * bodyR * 0.85, hipY + Math.abs(Math.sin(a)) * bodyR * 0.75, along);
  }
  if (L.spines) for (let i = 0; i < 5; i++) {
    const sp = part(g, new THREE.ConeGeometry(0.035, 0.1, 4), std(L.spines), 0, hipY + bodyR * 0.95, front * 0.6 - i * bodyLen * 0.28);
    sp.rotation.x = -0.3;
  }

  // legs hang from pivots at the hip, so swinging them looks like walking
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const hind = z < 0 && L.hind;
    const pivot = new THREE.Group();
    pivot.position.set(x * bodyR * (L.splay ? 1.15 : 0.6), hipY - bodyR * 0.3, z > 0 ? front * 0.7 : back * 0.75);
    if (L.splay) pivot.rotation.z = -x * 0.9;
    const len = legLen + bodyR * 0.3;
    part(pivot, new THREE.CapsuleGeometry(legR * (hind ? 1.5 : 1), len * 0.8, 4, 10), limbs, 0, -len / 2, 0);
    part(pivot, ball(legR * 1.25, 10), L.hooves ? std(L.hooves) : limbs, 0, -len + legR * 0.4, legR * 0.5, 1, 0.6, 1.4); // paw / hoof
    g.add(pivot);
    parts.legs.push(pivot);
  }

  // neck + head
  const [neckLen, tilt] = L.neck;
  const neckBase = new THREE.Vector3(0, hipY + bodyR * 0.35, front + bodyR * 0.3);
  const headPos = neckBase.clone().add(new THREE.Vector3(0, Math.sin(tilt) * (neckLen + L.head * 0.6), Math.cos(tilt) * (neckLen + L.head * 0.4)));
  if (neckLen > 0.03) {
    const neck = part(g, new THREE.CapsuleGeometry(bodyR * 0.55, neckLen, 4, 10), L.mane ? fur : fur, 0, 0, 0);
    neck.position.copy(neckBase).lerp(headPos, 0.5);
    neck.rotation.x = Math.PI / 2 - tilt;
  }
  const head = new THREE.Group();
  head.position.copy(headPos);
  g.add(head);
  parts.head = head;
  const hr = L.head;
  part(head, ball(hr), fur, 0, 0, 0, L.headFlat ? 1.35 : 1, L.headFlat ? 0.75 : 1, 1);
  if (L.fluffy) for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; part(head, ball(hr * 0.38, 8), fur, Math.cos(a) * hr * 0.7, hr * 0.45 + Math.sin(a * 2) * hr * 0.12, Math.sin(a) * hr * 0.6 - hr * 0.1); }
  if (L.patches) for (const sx of [-1, 1]) part(head, ball(hr * 0.33, 8), std(0x26262e), sx * hr * 0.4, hr * 0.12, hr * 0.78, 1, 1.25, 0.5);
  const [snLen, snR, snKind] = L.snout;
  const snoutMat = std(L.snoutColor ?? L.belly ?? L.fur);
  let noseZ = hr * 0.8;
  if (snKind === 'pointy') {
    const sn = part(head, new THREE.ConeGeometry(snR, snLen + hr * 0.5, 10), fur, 0, -hr * 0.25, hr * 0.62 + snLen * 0.5);
    sn.rotation.x = Math.PI / 2;
    part(head, ball(snR * 0.8), belly, 0, -hr * 0.38, hr * 0.6, 1, 0.6, 1.1);
    noseZ = hr * 0.85 + snLen;
  } else if (snKind === 'flat') {
    part(head, new THREE.CylinderGeometry(snR, snR * 1.05, snLen + 0.03, 14), snoutMat, 0, -hr * 0.2, hr * 0.9 + snLen * 0.3).rotation.x = Math.PI / 2;
    if (L.snoutColor) for (const sx of [-1, 1]) part(head, ball(snR * 0.18, 6), std(0x9a4a5a), sx * snR * 0.38, -hr * 0.2, hr * 0.95 + snLen * 0.8);
    noseZ = null;
  } else { // round muzzle, or a long horse/dragon face
    part(head, capsuleZ(snR, snLen), snoutMat, 0, -hr * 0.3, hr * 0.55 + snLen * 0.5);
    noseZ = hr * 0.6 + snLen + snR * 0.9;
  }
  if (L.nose && noseZ) part(head, ball(Math.max(0.022, snR * 0.38), 8), std(L.nose), 0, -hr * 0.22, noseZ);
  if (L.whiskers) for (const sx of [-1, 1]) for (const dy of [-0.01, 0.02]) {
    const w = part(head, new THREE.CylinderGeometry(0.004, 0.004, 0.16, 3), std(0xffffff), sx * 0.09, -hr * 0.3 + dy, hr * 0.85);
    w.rotation.z = Math.PI / 2 + sx * dy * 6;
  }
  if (L.smile) part(head, new THREE.TorusGeometry(hr * 0.35, 0.008, 4, 12, Math.PI), std(0x7a2a4a), 0, -hr * 0.18, hr * 0.98).rotation.z = Math.PI;
  eyes(head, hr * 0.18, hr * 0.78, hr * (L.headFlat ? 0.62 : 0.45), hr * 0.24);
  // ears
  const earMat = std(L.earColor ?? L.fur);
  for (const sx of [-1, 1]) {
    if (L.ears === 'floppy') { const e = part(head, ball(hr * 0.42), earMat, sx * hr * 0.88, -hr * 0.15, -hr * 0.05, 0.45, 1.3, 0.8); e.rotation.z = sx * 0.25; }
    else if (L.ears === 'flop') { const e = part(head, new THREE.ConeGeometry(hr * 0.35, hr * 0.6, 4), earMat, sx * hr * 0.55, hr * 0.75, hr * 0.15); e.rotation.set(0.9, 0, -sx * 0.4); }
    else if (L.ears === 'long') {
      const e = part(head, capsuleZ(hr * 0.2, hr * 1.4), earMat, sx * hr * 0.35, hr * 1.25, -hr * 0.1, 1, 1, 0.45); e.rotation.set(-Math.PI / 2 + 0.25, 0, -sx * 0.15);
      if (L.earInner) { const i2 = part(head, capsuleZ(hr * 0.11, hr * 1.2), std(L.earInner), sx * hr * 0.35, hr * 1.25, -hr * 0.02, 1, 1, 0.3); i2.rotation.copy(e.rotation); }
    } else if (L.ears === 'pointy' || L.ears === 'tall') {
      const tall = L.ears === 'tall' ? 1.5 : 1;
      const e = part(head, new THREE.ConeGeometry(hr * 0.32, hr * 0.7 * tall, 4), earMat, sx * hr * 0.55, hr * 0.8 + hr * 0.15 * tall, 0); e.rotation.set(0, Math.PI / 4, -sx * 0.25);
      if (L.earInner) { const i2 = part(head, new THREE.ConeGeometry(hr * 0.17, hr * 0.45 * tall, 4), std(L.earInner), sx * hr * 0.55, hr * 0.76 + hr * 0.15 * tall, hr * 0.08); i2.rotation.copy(e.rotation); }
    } else if (L.ears === 'round') part(head, ball(hr * 0.32), earMat, sx * hr * 0.72, hr * 0.72, -hr * 0.05, 1, 1, 0.55);
  }
  if (L.gills) for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const gl = part(head, new THREE.CapsuleGeometry(0.018, 0.12, 3, 6), std(L.gills), sx * hr * 1.25, hr * 0.35 - i * hr * 0.35, -hr * 0.2);
    gl.rotation.z = -sx * (0.7 + i * 0.35);
  }
  if (L.horns) for (const sx of [-1, 1]) { const hn = part(head, new THREE.ConeGeometry(0.025, 0.14, 6), std(L.horns), sx * hr * 0.45, hr * 0.85, -hr * 0.3); hn.rotation.x = -0.6; }
  if (L.horn && stage >= 1) { const hn = part(head, new THREE.ConeGeometry(0.03, 0.24, 8), std(L.horn, { emissive: 0x664400 }), 0, hr * 1.05, hr * 0.45); hn.rotation.x = 0.4; }
  if (L.mane) {
    L.mane.forEach((c, i) => part(head, ball(hr * 0.32, 8), std(c), 0, hr * 0.85 - i * hr * 0.05, -hr * 0.25 - i * hr * 0.3)); // forelock + top of the neck
    for (let i = 0; i < 5; i++) part(g, ball(bodyR * 0.32, 8), std(L.mane[i % L.mane.length]), 0, neckBase.y + (headPos.y - neckBase.y) * (i / 5) + bodyR * 0.4, neckBase.z + (headPos.z - neckBase.z) * (i / 5) - bodyR * 0.3);
  }

  // tail, from the rump
  const tail = new THREE.Group();
  tail.position.set(0, hipY + bodyR * 0.3, back - bodyR * 0.9);
  g.add(tail);
  parts.tail = tail;
  if (L.tail === 'puff') part(tail, ball(bodyR * 0.45), L.fluffy ? fur : std(0xffffff), 0, 0, 0);
  else if (L.tail === 'bushy') { const t = part(tail, capsuleZ(bodyR * 0.55, bodyLen * 0.7), fur, 0, 0.02, -bodyLen * 0.45); t.rotation.x = 0.5; part(tail, ball(bodyR * 0.5), std(L.tip), 0, -0.13, -bodyLen * 0.9); }
  else if (L.tail === 'long') for (let i = 0; i < 7; i++) part(tail, ball(0.035 - i * 0.002, 8), fur, 0, Math.sin(i * 0.4) * 0.12, -i * 0.045);
  else if (L.tail === 'curl') part(tail, new THREE.TorusGeometry(0.045, 0.016, 6, 12), fur, 0, 0.02, -0.02);
  else if (L.tail === 'fin') { const f = part(tail, capsuleZ(bodyR * 0.6, bodyLen * 0.8), std(L.gills ?? L.fur), 0, -bodyR * 0.4, -bodyLen * 0.35, 0.25, 1.2, 1); f.rotation.x = 0.1; }
  else if (L.tail === 'dragon') { const t = part(tail, new THREE.ConeGeometry(bodyR * 0.55, bodyLen * 1.4, 8), fur, 0, -bodyR * 0.3, -bodyLen * 0.6); t.rotation.x = -Math.PI / 2 - 0.25; part(tail, new THREE.ConeGeometry(0.06, 0.12, 3), std(L.spines), 0, -bodyR * 0.65, -bodyLen * 1.25).rotation.x = -Math.PI / 2; }
  else if (L.tail === 'mane') L.mane.forEach((c, i) => part(tail, ball(bodyR * 0.36, 8), std(c), 0, -i * bodyR * 0.45, -0.04 - i * bodyR * 0.2));
  if (L.wings) {
    parts.wings = [];
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * bodyR * 0.6, hipY + bodyR * 0.7, front * 0.3);
      const w = part(pivot, new THREE.ConeGeometry(0.16, 0.42, 3), std(L.wings), sx * 0.2, 0.06, 0, 1, 1, 0.2);
      w.rotation.z = -sx * 1.2;
      g.add(pivot);
      parts.wings.push(pivot);
    }
  }
  return { body: g, parts, headTop: [0, headPos.y + hr, headPos.z], hop: L.hop };
}

/** A hedgehog: a low teardrop body, spines only on its back, and a pointy little nose. */
function makeHog(L) {
  const g = new THREE.Group(), fur = std(L.fur), belly = std(L.belly);
  const parts = { legs: [] };
  part(g, ball(0.22), fur, 0, 0.2, -0.02, 1, 0.8, 1.3);
  part(g, ball(0.16), belly, 0, 0.14, 0.06, 0.95, 0.6, 1.2);
  const spike = new THREE.ConeGeometry(0.035, 0.15, 5), spikeMat = std(L.spikes);
  for (let i = 0; i < 34; i++) { // spines fanned over the back, pointing backwards and out
    const a = (i * 2.399) % (Math.PI * 2), r = Math.sqrt((i + 0.5) / 34);
    const x = Math.cos(a) * r * 0.2, z = -0.1 + Math.sin(a) * r * 0.25;
    if (z > 0.13) continue;
    const sp = part(g, spike, spikeMat, x, 0.28 + (1 - r) * 0.06, z);
    sp.lookAt(x * 3, 0.5 + (1 - r) * 0.2, z * 2 - 0.5);
    sp.rotateX(Math.PI / 2);
  }
  const head = new THREE.Group();
  head.position.set(0, 0.2, 0.24);
  g.add(head);
  parts.head = head;
  part(head, ball(0.11), belly, 0, 0, 0, 1, 0.95, 1.1);
  const snout = part(head, new THREE.ConeGeometry(0.07, 0.16, 10), belly, 0, -0.02, 0.13);
  snout.rotation.x = Math.PI / 2;
  part(head, ball(0.028, 8), std(L.nose), 0, -0.02, 0.21);
  eyes(head, 0.03, 0.08, 0.06, 0.03);
  for (const sx of [-1, 1]) part(head, ball(0.03, 8), fur, sx * 0.08, 0.08, -0.02, 1, 1, 0.5);
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) parts.legs.push(part(g, ball(0.045, 8), belly, x * 0.12, 0.03, z * 0.15, 1, 0.6, 1.3));
  return { body: g, parts, headTop: [0, 0.34, 0.2] };
}

/** Builds a critter from its LOOKS entry. Returns the same shape as the hand-made builders. */
function makeCritter(L, stage) {
  const g = new THREE.Group();
  const fur = std(L.fur), belly = std(L.belly ?? L.fur);
  const parts = { legs: [] };
  let headTop = [0, 0.6, 0.2];

  if (L.shape === 'quad') return makeQuad(L, stage);
  if (L.shape === 'hog') return makeHog(L);
  if (L.shape === 'round') {
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
    const up = L.upright ? 1.35 : 1;
    const body = L.long ? [0.2, 0.85, 1.45] : [0.24, up, 1.05]; // ducks are longer than they are tall
    part(g, ball(body[0]), fur, 0, 0.27 * up, 0, 1, body[1], body[2]);
    if (L.belly) part(g, ball(body[0] * 0.8), belly, 0, 0.24 * up, 0.08, 0.95, body[1] * 0.95, body[2] * 0.75);
    if (L.long) { const tl = part(g, new THREE.ConeGeometry(0.08, 0.16, 6), fur, 0, 0.36, -0.3); tl.rotation.x = -2.2; } // perky tail
    const headY = L.small ? 0.42 : L.long ? 0.55 : 0.5 * up;
    const head = new THREE.Group();
    head.position.set(0, headY, L.long ? 0.2 : 0.06);
    g.add(head);
    parts.head = head;
    if (L.long) part(g, new THREE.CapsuleGeometry(0.075, 0.16, 4, 8), fur, 0, 0.42, 0.18).rotation.x = 0.4; // neck
    if (!L.small) part(head, ball(0.16), fur, 0, 0, 0);
    if (L.disc) part(head, ball(0.13), std(L.disc), 0, -0.01, 0.07, 1.2, 1, 0.5); // owl face
    eyes(head, 0.03, L.disc ? 0.13 : 0.12, L.bigEyes ? 0.07 : 0.07, L.bigEyes ? 0.055 : 0.035);
    if (L.bill) part(head, ball(0.07), std(L.beak), 0, -0.04, 0.17, 1.2, 0.4, 1.5);
    else { const bk = part(head, new THREE.ConeGeometry(0.04, 0.1, 6), std(L.beak), 0, -0.03, 0.17); bk.rotation.x = Math.PI / 2; }
    if (L.tufts) for (const sx of [-1, 1]) { const t = part(head, new THREE.ConeGeometry(0.04, 0.13, 4), fur, sx * 0.1, 0.16, -0.02); t.rotation.z = -sx * 0.4; }
    parts.wings = [];
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * body[0] * 0.92, 0.32 * up, -0.02);
      if (L.flippers) part(pivot, capsuleZ(0.045, 0.12), fur, 0, -0.1, 0, 1, 1, 0.4).rotation.set(1.3, 0, sx * 0.2);
      else part(pivot, ball(0.1), fur, 0, -0.04, -0.02, 0.32, 1, 1.25);
      g.add(pivot);
      parts.wings.push(pivot);
    }
    for (const sx of [-1, 1]) parts.legs.push(part(g, ball(0.05), std(L.beak), sx * 0.09, 0.025, 0.08, 1.2, 0.4, 1.6));
    headTop = [0, headY + (L.small ? 0.1 : 0.16), head.position.z];
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
    this.hop = !!built.hop; // bunnies bounce along
    this.t = Math.random() * 10;
    this.jump = 0;       // frog jump progress
  }

  animate(dt, moving) {
    const t = this.t, b = this.body, P = this.parts;
    b.position.y = 0;
    b.rotation.set(0, 0, 0);
    switch (this.shape) {
      case 'frog': {
        // hop when moving; an occasional little hop when idle
        if (this.jump <= 0 && (moving || Math.sin(t * 0.7) > 0.995)) this.jump = 0.45;
        if (this.jump > 0) {
          this.jump -= dt;
          const u = 1 - this.jump / 0.45;
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
      case 'round':
      case 'hog': {
        const w = t * 12;
        b.position.y = moving ? Math.abs(Math.sin(w * (this.hop ? 0.6 : 1))) * (this.hop ? 0.16 : 0.04) : 0;
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
