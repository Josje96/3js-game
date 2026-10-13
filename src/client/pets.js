// Pet models + animation. Pets are 'pet' entities on the host (they follow and fight);
// PetEntityView shows one, PetView is the model itself (also used on the pet stall and icons).
// Every species is sculpted from client/petkit.js: smooth tubes for bodies and limbs, thin blades
// for feathers, ears and fur, glossy eyes. bake() then merges each moving part into one mesh.
import * as THREE from 'three';
import { petStage, petTier, isMiniPet, PET_SPECIES } from '../shared/pets.js';
import { buildMobModel, animateMob } from './enemies.js';
import { dropTinyShadows } from './merge.js';
import { mix, smooth, rnd, shade, curly, scallops, tube, leaf, aim, part, placed, ball, bake, eye } from './petkit.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1];

// ------------------------------------------------------------------ small pieces shared by many

/** Fur tufts or contour feathers over a tube: n pieces between along a0..a1, skipping the belly unless `all`. */
function cover(parent, geo, { n, a0 = 0.05, a1 = 0.95, len, width, color, seed = 1, lift = 0.3, back = 1, droop = 0.1, bend = 0, belly = true, widest = 0.4, round = 0.7, nu = 4, ns = 1, edge }) {
  const at = geo.userData.at;
  for (let i = 0; i < n; i++) {
    const along = a0 + (a1 - a0) * ((i + rnd(seed + i) * 0.7) / n);
    const around = (i * 0.618 + rnd(seed * 7 + i) * 0.1) % 1;
    const { p, n: nrm, t } = at(along, around);
    if (!belly && nrm.y < -0.45) continue;
    const along_ = t.clone().addScaledVector(nrm, -t.dot(nrm)).normalize(); // backwards along the skin
    const dir = nrm.clone().multiplyScalar(lift).addScaledVector(along_, -back).add(V(0, -droop, 0));
    const k = 0.85 + rnd(seed * 3 + i) * 0.3;
    const c = typeof color === 'function' ? color(p, nrm, along, i) : color;
    const paint = edge ? (s, u) => mix(c, edge, smooth(0.55, 1, Math.max(Math.abs(s), u))) : undefined;
    placed(parent, leaf(len * k, width * k, { bend, widest, round, nu, ns, paint, color: c }), c, p.addScaledVector(nrm, -0.004), dir, nrm);
  }
}

/** Whiskers fanning out from a muzzle side at `at` (x is mirrored). */
function whiskers(head, at, len, color = 0xf4f4f4, count = 3) {
  for (const sx of SIDES) for (let i = 0; i < count; i++) {
    const y0 = at[1] + (i - 1) * 0.006, a = (i - 1) * 0.22;
    part(head, tube([
      [sx * at[0], y0, at[2], 0.0022],
      [sx * (at[0] + len * 0.5), y0 + a * len * 0.3, at[2] - len * 0.15, 0.0016],
      [sx * (at[0] + len), y0 + a * len * 0.5 - len * 0.12, at[2] - len * 0.25, 0.0006],
    ], { seg: 3, steps: 2, color }));
  }
}

/** A leathery nose with two nostrils, at the tip of a muzzle. */
function noseTip(head, pos, size, color = 0x1a1414) {
  part(head, ball(size, 12), color, pos[0], pos[1], pos[2], 1.25, 0.8, 0.85);
  for (const sx of SIDES) part(head, ball(size * 0.32, 6), 0x060404, pos[0] + sx * size * 0.5, pos[1] - size * 0.05, pos[2] + size * 0.62, 1.3, 0.7, 0.6);
}

/** An ear: an outer blade and a paler inner blade sitting in its cup. */
function ear(head, sx, at, dir, face, E) {
  const pos = V(sx * at[0], at[1], at[2]);
  const d = V(sx * dir[0], dir[1], dir[2]), f = V(sx * face[0], face[1], face[2]).normalize();
  const shape = { widest: E.widest ?? 0.25, round: E.round ?? 0.85, base: E.base ?? 0.6, cup: E.cup ?? 0.35, bend: E.bend ?? 0, nu: 6, ns: 3 };
  placed(head, leaf(E.len, E.width, { ...shape, paint: E.paint, color: E.color }), E.color, pos, d, f);
  if (E.inner != null) {
    placed(head, leaf(E.len * 0.82, E.width * 0.66, { ...shape, cup: shape.cup * 0.9, paint: E.innerPaint, color: E.inner }), E.inner, pos.clone().addScaledVector(f, 0.004).addScaledVector(d.normalize(), E.len * 0.04), d, f);
  }
}

// ------------------------------------------------------------------ four legs

/**
 * One leg hanging from its pivot (the shoulder or hip), reaching the ground at y = -len.
 * foot: 'paw' (toes), 'flat' (rabbit / bear soles), 'claw' (dragon), 'hoof', 'cloven' (pig).
 */
function limb(pivot, { len: L, t, hind, foot = 'paw', paint, hoof = 0x3a2a20, claws = 0x2a2420, bump }) {
  const ankle = foot === 'hoof' || foot === 'cloven' ? t * 2.2 : t * 1.0;
  const rings = hind ? [
    [0, 0.14 * L, 0.0, 2.0 * t, 2.4 * t],
    [0, -0.1 * L, 0.05 * L, 1.9 * t, 2.2 * t],
    [0, -0.36 * L, 0.08 * L, 1.15 * t, 1.25 * t],
    [0, -0.64 * L, -0.08 * L, 0.78 * t, 0.86 * t],
    [0, -L + ankle, -0.03 * L, 0.72 * t, 0.78 * t],
  ] : [
    [0, 0.14 * L, 0, 1.7 * t, 2.1 * t],
    [0, -0.1 * L, -0.03 * L, 1.45 * t, 1.65 * t],
    [0, -0.4 * L, -0.05 * L, 1.0 * t, 1.1 * t],
    [0, -0.74 * L, 0.0, 0.76 * t, 0.82 * t],
    [0, -L + ankle, 0.01 * L, 0.74 * t, 0.8 * t],
  ];
  const zA = rings[rings.length - 1][2], yA = -L;
  const sock = (d, v, p) => paint(d, 1, p);
  if (foot === 'hoof' || foot === 'cloven') {
    rings.push([0, -L + t * 1.2, zA + t * 0.35, 0.72 * t, 0.76 * t]); // pastern
    part(pivot, tube(rings, { paint, seg: 10, round: true }));
    if (foot === 'hoof') part(pivot, new THREE.CylinderGeometry(t * 0.8, t * 1.05, t * 1.25, 14), hoof, 0, yA + t * 0.62, zA + t * 0.45).rotation.x = 0.12;
    else for (const sx of SIDES) part(pivot, new THREE.CylinderGeometry(t * 0.4, t * 0.5, t * 1.1, 8), hoof, sx * t * 0.42, yA + t * 0.55, zA + t * 0.5, 1, 1, 1.25);
    return;
  }
  part(pivot, tube(rings, { paint, seg: bump ? 28 : 10, steps: bump ? 6 : 3, round: true, bump }));
  const flat = foot === 'flat', fl = flat ? t * 2.8 : t * 2.0;
  part(pivot, tube([
    [0, yA + 0.85 * t, zA - (flat ? 1.4 : 0.45) * t, 0.6 * t, 0.55 * t],
    [0, yA + 0.6 * t, zA + 0.2 * t - (flat ? t : 0), 1.02 * t, 0.6 * t],
    [0, yA + 0.5 * t, zA + fl * 0.65, 1.0 * t, 0.5 * t],
    [0, yA + 0.38 * t, zA + fl, 0.55 * t, 0.36 * t],
  ], { paint: sock, seg: 10 }));
  const toeCol = paint(V(0, -1, 0), 1, V(0, yA, 0));
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * 0.5 * t, z = zA + fl * 0.92 - Math.abs(i - 1.5) * 0.15 * t;
    part(pivot, ball(0.34 * t, 8), toeCol, x, yA + 0.32 * t, z, 1, 0.85, 1.1);
    if (foot === 'claw' || flat) placed(pivot, new THREE.ConeGeometry(0.16 * t, 0.7 * t, 5).rotateX(Math.PI / 2).translate(0, 0, 0.35 * t), claws, [x, yA + 0.3 * t, z + 0.2 * t], [0, -0.5, 1]);
  }
}

/**
 * A four-legged animal. Q gives proportions (body radius r and length, leg length + thickness,
 * neck [length, tilt, thickness], head { r, w, h, muzzle [length, radius], drop, tip, jaw, flat })
 * and coat(where, dir, along, point) its colours ('body' | 'leg' | 'neck' | 'head').
 * Returns the pieces the species adds its own ears, eyes, nose and tail to.
 */
function quadruped(Q) {
  const g = new THREE.Group(), parts = { legs: [] };
  const { r, len } = Q, f = len / 2;
  const chest = Q.chest ?? 1, waist = Q.waist ?? 0.8, rump = Q.rump ?? 1, rumpY = (Q.rumpY ?? 0) * r;
  const H = Q.legLen, by = H + r * 0.3;
  const coat = (where) => (d, v, p, a) => Q.coat(where, d, v, p, a);
  const torso = tube([
    [0, by + 0.05 * r + rumpY, -f - 0.95 * r * rump, 0.22 * r, 0.25 * r],
    [0, by + 0.08 * r + rumpY, -f - 0.62 * r * rump, 0.8 * r * rump, 0.86 * r * rump],
    [0, by + 0.04 * r + rumpY * 0.6, -f - 0.05 * r, 0.93 * r * rump, 0.98 * r * rump],
    [0, by + r * (0.93 - 0.95 * waist) * 0.85, 0, waist * r, waist * 0.95 * r],
    [0, by - 0.08 * r * chest, f - 0.05 * r, 0.9 * r * (Q.chestW ?? 1), 1.05 * r * chest],
    [0, by + 0.05 * r, f + 0.45 * r, 0.72 * r, 0.85 * r],
    [0, by + 0.3 * r, f + 0.8 * r, 0.38 * r, 0.42 * r],
  ], { seg: Q.bump ? 46 : 18, steps: Q.bump ? 6 : 3, paint: coat('body'), bump: Q.bump && ((p, d) => Q.bump(p, d, 'body')) });
  part(g, torso);

  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const hind = sz < 0, pivot = new THREE.Group();
    const hy = hind ? H + rumpY * 0.5 : H;
    pivot.position.set(sx * r * (hind ? 0.56 : 0.5), hy, hind ? -f - 0.12 * r * rump : f + 0.1 * r);
    g.add(pivot);
    parts.legs.push(pivot);
    limb(pivot, { len: hy, t: Q.legT * (hind ? Q.hindT ?? 1 : 1), hind, foot: (hind && Q.hindFoot) || Q.foot, paint: coat('leg'), hoof: Q.hoof, claws: Q.claws, bump: Q.bump && ((p, d) => Q.bump(p, d, 'leg')) });
  }

  // neck and head
  const [nl, tilt, nw = 0.6] = Q.neck, hd = Q.head, hr = hd.r;
  const base = V(0, by + 0.35 * r, f + 0.5 * r), dir = V(0, Math.sin(tilt), Math.cos(tilt));
  const headPos = base.clone().addScaledVector(dir, nl + hr * 0.55);
  const neckEnd = headPos.clone().add(V(0, -0.28 * hr, -0.4 * hr));
  const mid = base.clone().lerp(neckEnd, 0.5);
  const neck = tube([
    [0, base.y - 0.15 * r, base.z - 0.35 * r, Math.min(nw * 1.1, 0.66) * r, Math.min(nw * 1.3, 0.78) * r],
    [0, mid.y + (Q.crest ?? 0) * r, mid.z, (nw * r + hr * 0.55) * 0.52, (nw * r * 1.2 + hr * 0.7) * 0.55],
    [0, neckEnd.y, neckEnd.z, hr * 0.55, hr * 0.62],
  ], { seg: Q.bump ? 40 : 14, steps: Q.bump ? 6 : 3, paint: coat('neck'), round: true, bump: Q.bump && ((p, d) => Q.bump(p, d, 'neck')) });
  part(g, neck);
  const head = new THREE.Group();
  head.position.copy(headPos);
  g.add(head);
  parts.head = head;
  const w = hd.w ?? 1, h = hd.h ?? 1, jaw = hd.jaw ?? 0;
  const [ml, mr] = hd.muzzle, drop = (hd.drop ?? 0.25) * hr, tip = hd.tip ?? 0.7;
  const tipZ = 0.5 * hr + ml;
  const rings = [
    [0, 0.05 * hr, -0.92 * hr, 0.28 * hr * w, 0.28 * hr * h],
    [0, 0.08 * hr, -0.6 * hr, 0.82 * hr * w, 0.84 * hr * h],
    [0, 0.02 * hr - jaw * 0.3 * hr, -0.08 * hr, 0.95 * hr * w, (0.9 + jaw * 0.35) * hr * h],
    [0, -drop * 0.6, 0.38 * hr, (0.55 * hr * w + mr) * 0.62, (0.6 * hr * h + mr) * 0.58],
    [0, -drop, 0.5 * hr + ml * 0.5, mr, mr * 0.88],
    [0, -drop - mr * 0.05, tipZ, mr * tip, mr * tip * 0.85],
  ];
  if (hd.flat) rings.push([0, -drop, tipZ + mr * 0.12, mr * tip * 0.98, mr * tip * 0.84], [0, -drop, tipZ + mr * 0.14, 0.001, 0.001]);
  else rings.push([0, -drop, tipZ + mr * 0.3, mr * 0.25, mr * 0.22]);
  const skull = tube(rings, { seg: Q.bump ? 40 : 18, steps: Q.bump ? 5 : 3, paint: coat('head'), bump: Q.bump && ((p, d, v) => Q.bump(p, d, 'head', v)) });
  part(head, skull);
  const neckMid = base.clone().lerp(neckEnd, 0.5);
  const ring = { at: neckMid.toArray(), dir: neckEnd.clone().sub(base).normalize().toArray(), r: (nw * r * 1.1 + hr * 0.62) * 0.55 + (Q.bump ? 0.016 : 0) };
  return { g, parts, head, hr, r, f, by, rump, rumpY, skull, torso, neck, headPos, ring,
    nose: [0, -drop + mr * 0.15, tipZ + mr * (hd.flat ? 0.14 : 0.18)], mr,
    tailRoot: V(0, by + 0.35 * r + rumpY, -f - 0.85 * r * rump) };
}

/** A tail group at the rump with a tapering tube along `path` ([x, y, z, radius, height?] from the root). */
function tailTube(Q, path, paint, opts = {}) {
  const tail = new THREE.Group();
  tail.position.copy(Q.tailRoot);
  Q.g.add(tail);
  Q.parts.tail = tail;
  const geo = tube(path, { seg: opts.seg ?? 10, steps: opts.steps, paint, bump: opts.bump });
  part(tail, geo);
  return { tail, geo };
}

/** The finishing step for every model: bake the pieces, and tell the views where the head and neck are. */
function done(Q, headTop, extra = {}) {
  bake(Q.g);
  return { body: Q.g, parts: Q.parts, headTop, neck: Q.ring, ...extra };
}

// ------------------------------------------------------------------ wings

/**
 * A folded bird wing built from real rows of feathers, in a pivot at the shoulder: coverts on
 * top, secondaries under them, long primaries reaching back past the tail. `paint(row, s, u, i)`.
 */
function featherWing(pivot, sx, { len: Lw, back, down, paint, rows = 3, primaries = 6, secondaries = 6, width = 1 }) {
  const out = V(sx, 0.25, 0).normalize();
  const B = back.clone().normalize(), D = down.clone().normalize();
  const at = (b, d, x = 0) => V(sx * x, 0, 0).addScaledVector(B, b * Lw).addScaledVector(D, d * Lw);
  const feather = (row, i, base, dir, l, w2, opts = {}) => {
    const geo = leaf(l * Lw, w2 * Lw * width, { widest: 0.55, round: 0.55, bend: -0.05, cup: 0.12, nu: 5, ns: 2, paint: (s, u) => paint(row, s, u, i), ...opts });
    placed(pivot, geo, 0xffffff, base, dir.normalize(), out);
  };
  for (let i = 0; i < primaries; i++) { // long flight feathers, fanned a little
    const d = B.clone().addScaledVector(D, 0.12 - i * 0.05).add(V(-sx * 0.1, 0, 0));
    feather('primary', i, at(0.12 + i * 0.03, 0.2 + i * 0.015), d, 0.95 - i * 0.07, 0.2);
  }
  for (let i = 0; i < secondaries; i++) {
    const d = B.clone().addScaledVector(D, 0.35).add(V(-sx * 0.05, 0, 0));
    feather('secondary', i, at(0.02 + i * 0.075, 0.25, 0.006), d, 0.55, 0.2);
  }
  for (let k = 0; k < rows; k++) for (let i = 0; i < 5; i++) { // coverts: short rounded rows on top
    const d = B.clone().addScaledVector(D, 0.3 + k * 0.1);
    feather('covert', i + k * 5, at(0.0 + i * 0.075 + k * 0.03, 0.04 + k * 0.1, 0.012 + (rows - k) * 0.004), d, 0.32 - k * 0.04, 0.17, { round: 0.45 });
  }
}

/** Feathered wings on a four-legged animal (the Alicorn). */
function backWings(Q, at, len, paint) {
  Q.parts.wings = [];
  for (const sx of SIDES) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * at[0], at[1], at[2]);
    Q.g.add(pivot);
    Q.parts.wings.push(pivot);
    featherWing(pivot, sx, { len, back: V(sx * 0.35, 0.55, -1), down: V(sx, 0.35, 0.2), paint, rows: 3, primaries: 7, secondaries: 7 }); // half spread, up and out
  }
}

// ------------------------------------------------------------------ the four-legged species

function maple() {
  const FUR = 0xf2b27a, LIGHT = 0xf8d2a8, DARK = 0xd8945a;
  const Q = quadruped({
    r: 0.14, len: 0.2, chest: 1, waist: 0.9, legLen: 0.17, legT: 0.034, foot: 'paw',
    neck: [0.05, 0.85, 0.75], head: { r: 0.14, w: 1.05, h: 0.95, muzzle: [0.05, 0.055], drop: 0.3, tip: 0.85 },
    coat: (where, d, v, p) => shade(where === 'leg' ? mix(FUR, LIGHT, 0.5) : mix(FUR, LIGHT, smooth(0, -0.7, d.y)), (curly(p, 0.045) - 0.5) * 0.14),
    // a curly coat: soft lumps all over, smoothing out towards the eyes and nose
    bump: (p, d, where, v) => curly(p, 0.045) * 0.016 * (where === 'head' ? smooth(0.62, 0.4, v) : 1),
  });
  const { head, hr } = Q;
  for (const sx of SIDES) { // long floppy ears covered in curls
    ear(head, sx, [0.78 * hr, 0.42 * hr, -0.18 * hr], [0.3, -1, 0.08], [1, 0, 0.25], { len: 1.25 * hr, width: 0.75 * hr, widest: 0.6, round: 0.45, base: 0.5, cup: -0.15, color: DARK });
    part(head, tube([[sx * 0.8 * hr, 0.42 * hr, -0.2 * hr, 0.1 * hr, 0.25 * hr], [sx * 0.95 * hr, 0.05 * hr, -0.2 * hr, 0.16 * hr, 0.38 * hr], [sx * 1.0 * hr, -0.5 * hr, -0.15 * hr, 0.14 * hr, 0.34 * hr], [sx * 0.95 * hr, -0.8 * hr, -0.12 * hr, 0.05 * hr, 0.1 * hr]],
      { seg: 28, steps: 6, paint: (d, v, p) => shade(DARK, (curly(p, 0.04) - 0.5) * 0.2), bump: (p) => curly(p, 0.04) * 0.012 })); // long curly ear fur
  }
  for (const sx of SIDES) eye(head, [sx * 0.4 * hr, 0.16 * hr, 0.62 * hr], [sx * 0.38, 0.05, 1], 0.17 * hr, { iris: 0x24140c, pupil: 'none', lid: 0x2a1a12 });
  noseTip(head, Q.nose, 0.034);
  // a plume of a tail, curled over the back
  tailTube(Q, [[0, -0.02, 0.02, 0.035], [0, 0.06, -0.05, 0.05], [0, 0.13, -0.03, 0.05], [0, 0.16, 0.03, 0.04], [0, 0.14, 0.08, 0.015]], (d, v, p) => shade(FUR, (curly(p, 0.04) - 0.5) * 0.15), { seg: 28, steps: 6, bump: (p) => curly(p, 0.04) * 0.014 });
  return done(Q, [0, Q.headPos.y + hr * 1.05, Q.headPos.z]);
}

function fox(stage) {
  const ORANGE = 0xe0702a, DEEP = 0xc85a1e, DARK = 0x2a1a14, WHITE = 0xfaf4ec;
  const Q = quadruped({
    r: 0.115, len: 0.3, chest: 1.05, waist: 0.7, rump: 0.92, legLen: 0.22, legT: 0.028, foot: 'paw',
    neck: [0.09, 0.72, 0.55], head: { r: 0.12, w: 1.08, h: 0.8, muzzle: [0.15, 0.04], drop: 0.32, tip: 0.55 },
    coat(where, d, v, p) {
      if (where === 'leg') return mix(ORANGE, DARK, smooth(0.25, 0.5, v));
      const top = mix(ORANGE, DEEP, smooth(0.3, 0.9, d.y));
      if (where === 'head') return mix(top, WHITE, smooth(-0.05, -0.45, d.y) * smooth(-0.04, 0.02, p.z));
      if (where === 'neck') return mix(top, WHITE, smooth(0.1, -0.4, d.y));
      return mix(top, WHITE, smooth(-0.2, -0.6, d.y) * smooth(-0.05, 0.12, p.z));
    },
  });
  const { head, hr } = Q;
  for (const sx of SIDES) {
    ear(head, sx, [0.5 * hr, 0.6 * hr, -0.25 * hr], [0.32, 1, -0.12], [0.35, 0, 1], { len: 1.3 * hr, width: 0.9 * hr, widest: 0.22, round: 1, base: 0.8, cup: 0.4,
      color: ORANGE, paint: (s, u) => mix(ORANGE, DARK, smooth(0.35, 0.75, u)), inner: WHITE });
    for (let i = 0; i < 3; i++) placed(head, leaf(0.05, 0.02, { bend: 0.2 }), WHITE, [sx * 0.52 * hr, 0.62 * hr, -0.2 * hr], [sx * (0.1 + i * 0.12), 1, 0.3], [sx * 0.3, 0, 1]);
    eye(head, [sx * 0.45 * hr, 0.18 * hr, 0.48 * hr], [sx * 0.5, 0.08, 1], 0.15 * hr, { iris: 0xd88a1e, pupil: 'slit', lid: DARK, lidWidth: 0.26 });
    for (let i = 0; i < 7; i++) placed(head, leaf(0.05, 0.022, { bend: -0.15, round: 0.6 }), mix(WHITE, ORANGE, i % 3 ? 0.15 : 0.45), // cheek ruff
      [sx * 0.72 * hr, -0.22 * hr - i * 0.012, 0.0 - i * 0.012], [sx * 0.6, -0.4 - i * 0.06, -0.8], [sx, 0, 0.3]);
  }
  noseTip(head, Q.nose, 0.025);
  whiskers(head, [Q.mr * 0.6, Q.nose[1] - 0.012, Q.nose[2] - 0.035], 0.1, 0x1a1210);
  cover(Q.g, Q.neck, { n: 14, a0: 0.1, a1: 0.7, len: 0.06, width: 0.035, color: (p, n) => (n.y < -0.1 ? WHITE : ORANGE), lift: 0.7, back: 0.6, bend: -0.1, seed: 4 });
  // the brush: a big soft tail with a white tip (nine-tailed foxes show five)
  const tails = stage >= 2 ? [-0.7, -0.35, 0, 0.35, 0.7] : [0];
  const tail = new THREE.Group();
  tail.position.copy(Q.tailRoot);
  Q.g.add(tail);
  Q.parts.tail = tail;
  for (const [i, yaw] of tails.entries()) {
    const holder = new THREE.Group();
    holder.rotation.y = yaw;
    holder.rotation.x = tails.length > 1 ? 0.3 + (0.8 - Math.abs(yaw)) * 0.5 : 0; // fanned up behind
    tail.add(holder);
    const geo = tube([[0, 0.0, 0.01, 0.028], [0, -0.04, -0.07, 0.058], [0, -0.1, -0.19, 0.075], [0, -0.14, -0.31, 0.07], [0, -0.155, -0.4, 0.048], [0, -0.15, -0.45, 0.004]],
      { seg: 12, paint: (d, v) => mix(mix(ORANGE, DEEP, smooth(0, 0.8, d.y)), WHITE, smooth(0.74, 0.8, v)) });
    part(holder, geo);
    cover(holder, geo, { n: 14, a0: 0.25, a1: 0.85, len: 0.08, width: 0.04, color: (p, n, a) => (a > 0.78 ? WHITE : ORANGE), lift: 0.6, back: 0.9, bend: 0, seed: 20 + i });
  }
  return done(Q, [0, Q.headPos.y + hr * 0.85, Q.headPos.z]);
}

function cat() {
  const FUR = 0xf09a48, STRIPE = 0xc0601e, CREAM = 0xffe8cc, PINKY = 0xf2a6a6;
  const tabby = (c, p, k = 1) => mix(c, STRIPE, smooth(0.45, 0.8, Math.sin(p.z * 70 + Math.abs(p.x) * 20 + Math.sin(p.y * 40))) * k);
  const Q = quadruped({
    r: 0.1, len: 0.27, chest: 0.95, waist: 0.8, rump: 0.96, legLen: 0.19, legT: 0.025, foot: 'paw',
    neck: [0.05, 0.8, 0.62], head: { r: 0.125, w: 1.08, h: 0.88, muzzle: [0.03, 0.05], drop: 0.3, tip: 0.85 },
    coat(where, d, v, p) {
      if (where === 'leg') return mix(tabby(FUR, V(0, p.y * 1.6, p.y)), CREAM, smooth(0.6, 0.85, v));
      if (where === 'head') return mix(tabby(FUR, V(0, 0, p.y * 1.4 + 0.3), smooth(0.2, 0.6, d.y)), CREAM, smooth(-0.1, -0.5, d.y) * smooth(-0.02, 0.06, p.z));
      return mix(tabby(FUR, p, smooth(-0.6, -0.1, d.y)), CREAM, smooth(-0.3, -0.7, d.y));
    },
  });
  const { head, hr } = Q;
  for (const sx of SIDES) {
    ear(head, sx, [0.52 * hr, 0.66 * hr, -0.18 * hr], [0.35, 1, -0.05], [0.3, 0, 1], { len: 0.78 * hr, width: 0.82 * hr, widest: 0.15, round: 1, base: 0.95, cup: 0.4, color: FUR, inner: PINKY });
    for (let i = 0; i < 3; i++) placed(head, leaf(0.035, 0.014, { bend: 0.15 }), CREAM, [sx * 0.5 * hr, 0.68 * hr, -0.14 * hr], [sx * (i * 0.15), 1, 0.25], [sx * 0.3, 0, 1]);
    eye(head, [sx * 0.4 * hr, 0.17 * hr, 0.66 * hr], [sx * 0.3, 0.06, 1], 0.19 * hr, { iris: 0x9cc43a, pupil: 'slit', lid: 0x5a3214, lidWidth: 0.2 });
    part(head, ball(Q.mr * 0.55, 10), CREAM, sx * Q.mr * 0.45, Q.nose[1] - Q.mr * 0.45, Q.nose[2] - Q.mr * 0.35); // whisker pads
    for (let i = 0; i < 4; i++) placed(head, leaf(0.034, 0.016, { bend: -0.1 }), i % 2 ? FUR : CREAM, [sx * 0.78 * hr, -0.2 * hr - i * 0.01, 0.05 * hr], [sx * 0.7, -0.3, -0.6], [sx, 0, 0.3]);
  }
  part(head, new THREE.ConeGeometry(0.016, 0.014, 3), 0xe88a96, Q.nose[0], Q.nose[1] + 0.004, Q.nose[2] - 0.002, 1, 1, 0.6).rotation.set(Math.PI / 2 + 0.3, Math.PI, 0);
  whiskers(head, [Q.mr * 0.7, Q.nose[1] - Q.mr * 0.45, Q.nose[2] - Q.mr * 0.4], 0.13);
  tailTube(Q, [[0, 0, 0.01, 0.024], [0, 0.02, -0.08, 0.022], [0, 0.09, -0.16, 0.02], [0, 0.19, -0.19, 0.018], [0, 0.27, -0.16, 0.016], [0, 0.3, -0.11, 0.011], [0, 0.3, -0.09, 0.003]],
    (d, v) => mix(FUR, STRIPE, smooth(0.3, 0.7, Math.sin(v * 38)) * 0.9));
  return done(Q, [0, Q.headPos.y + hr * 0.9, Q.headPos.z]);
}

function bunny() {
  const FUR = 0xfbfbfb, SHADE = 0xeee9ea, PINKY = 0xf3afc0;
  const Q = quadruped({
    r: 0.125, len: 0.15, chest: 0.9, waist: 0.95, rump: 1.35, rumpY: 0.3, legLen: 0.11, legT: 0.028, hindT: 1.35, foot: 'paw', hindFoot: 'flat',
    neck: [0.02, 0.95, 0.8], head: { r: 0.11, w: 0.92, h: 0.95, muzzle: [0.045, 0.058], drop: 0.25, tip: 0.85 },
    coat: (where, d) => mix(FUR, SHADE, smooth(0, -0.8, d.y)),
  });
  const { head, hr } = Q;
  for (const sx of SIDES) {
    ear(head, sx, [0.3 * hr, 0.72 * hr, -0.38 * hr], [0.14, 1, -0.38], [0.22, 0, 1], { len: 2.3 * hr, width: 0.78 * hr, widest: 0.45, round: 0.55, base: 0.55, cup: 0.5, color: FUR, inner: PINKY, innerPaint: (s, u) => mix(PINKY, FUR, smooth(0.75, 1, u)) });
    eye(head, [sx * 0.6 * hr, 0.24 * hr, 0.22 * hr], [sx * 1.1, 0.1, 0.55], 0.19 * hr, { iris: 0x3a1418, pupil: 'none', lid: 0xe6cfd4 });
    part(head, ball(Q.mr * 0.6, 10), FUR, sx * Q.mr * 0.42, Q.nose[1] - Q.mr * 0.5, Q.nose[2] - Q.mr * 0.4); // split upper lip
  }
  part(head, ball(0.014, 8), 0xe88aa0, Q.nose[0], Q.nose[1], Q.nose[2] - 0.004, 1.3, 0.8, 0.7);
  whiskers(head, [Q.mr * 0.7, Q.nose[1] - Q.mr * 0.45, Q.nose[2] - Q.mr * 0.45], 0.12);
  cover(Q.g, Q.torso, { n: 50, a0: 0.05, a1: 0.6, len: 0.045, width: 0.03, color: (p, n) => mix(FUR, SHADE, smooth(0, -0.8, n.y)), lift: 0.2, seed: 6 });
  const tail = new THREE.Group(); // cottontail
  tail.position.copy(Q.tailRoot).add(V(0, 0.01, 0.02));
  Q.g.add(tail);
  Q.parts.tail = tail;
  part(tail, ball(0.05, 12), FUR);
  for (let i = 0; i < 14; i++) { const a = i * 2.4, e = (i / 14) * Math.PI; const n = V(Math.cos(a) * Math.sin(e), Math.cos(e), -Math.abs(Math.sin(a) * Math.sin(e)) - 0.3).normalize(); placed(tail, leaf(0.04, 0.03, { round: 0.5 }), FUR, n.clone().multiplyScalar(0.035), n, [0, 1, 0]); }
  return done(Q, [0, Q.headPos.y + hr * 0.95, Q.headPos.z], { hop: true });
}

function piglet() {
  const PINK = 0xffb8c8, DEEP = 0xf598ad, SNOUT = 0xf28aa0;
  const Q = quadruped({
    r: 0.165, len: 0.25, chest: 1, waist: 1.0, rump: 1.02, legLen: 0.11, legT: 0.038, foot: 'cloven', hoof: 0x8a5a5a,
    neck: [0.02, 0.3, 0.95], head: { r: 0.14, w: 1.0, h: 0.95, muzzle: [0.09, 0.062], drop: 0.2, tip: 1.0, flat: true, jaw: 0.2 },
    coat(where, d, v) {
      if (where === 'head' && v > 0.9) return SNOUT;
      return mix(PINK, DEEP, smooth(0, -0.9, d.y) * 0.6);
    },
  });
  const { head, hr } = Q;
  for (const sx of SIDES) {
    ear(head, sx, [0.5 * hr, 0.7 * hr, -0.15 * hr], [0.55, 0.85, 0.3], [0.3, -0.15, 1], { len: 0.95 * hr, width: 0.85 * hr, widest: 0.3, round: 0.9, base: 0.7, cup: 0.35, bend: 0.4, color: PINK, inner: DEEP });
    eye(head, [sx * 0.5 * hr, 0.24 * hr, 0.55 * hr], [sx * 0.6, 0.05, 1], 0.1 * hr, { iris: 0x2a1a14, pupil: 'none', lid: DEEP, lidWidth: 0.3 });
    part(head, ball(0.012, 6), 0x5a2a34, sx * Q.mr * 0.35, Q.nose[1] - 0.004, Q.nose[2] + 0.002, 0.8, 1.3, 0.4); // nostrils
  }
  const curl = [];
  for (let i = 0; i <= 14; i++) { const a = i * 0.55, rad = 0.035 - i * 0.0012; curl.push([Math.sin(a) * rad, Math.cos(a) * rad - 0.035, -0.01 - i * 0.004, 0.011 - i * 0.0005]); }
  tailTube(Q, curl, () => PINK, { seg: 6 });
  return done(Q, [0, Q.headPos.y + hr * 0.9, Q.headPos.z]);
}

function panda() {
  const WHITE = 0xf6f4ee, BLACK = 0x24242a;
  const Q = quadruped({
    r: 0.19, len: 0.24, chest: 1.05, waist: 0.95, legLen: 0.15, legT: 0.058, foot: 'claw', hindFoot: 'flat', claws: 0x4a4a4a,
    neck: [0.03, 0.6, 0.9], head: { r: 0.165, w: 1.1, h: 0.95, muzzle: [0.06, 0.07], drop: 0.32, tip: 0.85 },
    coat(where, d, v, p) {
      if (where === 'leg') return BLACK;
      if (where === 'body') return mix(WHITE, BLACK, smooth(0.085, 0.06, Math.abs(p.z - 0.12))); // the black band over the shoulders
      return WHITE;
    },
  });
  const { head, hr } = Q;
  for (const sx of SIDES) {
    ear(head, sx, [0.62 * hr, 0.7 * hr, -0.15 * hr], [0.45, 1, -0.1], [0.3, 0, 1], { len: 0.5 * hr, width: 0.58 * hr, widest: 0.5, round: 0.4, base: 0.5, cup: 0.45, color: BLACK });
    const patch = part(head, ball(0.2 * hr, 12), BLACK, sx * 0.38 * hr, 0.1 * hr, 0.7 * hr, 1, 1.45, 0.55);
    patch.rotation.set(-0.35, sx * 0.45, sx * 0.55);
    eye(head, [sx * 0.39 * hr, 0.16 * hr, 0.8 * hr], [sx * 0.4, 0.05, 1], 0.075 * hr, { iris: 0x1a1210, pupil: 'none' });
  }
  noseTip(head, Q.nose, 0.03);
  const tail = new THREE.Group();
  tail.position.copy(Q.tailRoot);
  Q.g.add(tail);
  Q.parts.tail = tail;
  part(tail, ball(0.045, 10), WHITE, 0, 0, 0, 1, 0.8, 1);
  return done(Q, [0, Q.headPos.y + hr * 0.95, Q.headPos.z]);
}

function unicorn(stage) {
  const COAT = 0xfdfbff, SHADOW = 0xeae4f2, MANE = [0xff7ab0, 0xffd23f, 0x7fd4ff, 0xb48cff];
  const Q = quadruped({
    r: 0.135, len: 0.36, chest: 1.15, chestW: 0.88, waist: 0.86, legLen: 0.32, legT: 0.034, foot: 'hoof', hoof: 0xd8c2ff,
    neck: [0.2, 1.0, 0.62], crest: 0.25, head: { r: 0.1, w: 0.78, h: 0.95, muzzle: [0.17, 0.06], drop: 0.5, tip: 0.95, jaw: 0.4 },
    coat: (where, d) => mix(COAT, SHADOW, smooth(-0.1, -0.9, d.y)),
  });
  const { head, hr } = Q;
  for (const sx of SIDES) {
    ear(head, sx, [0.4 * hr, 0.72 * hr, -0.45 * hr], [0.18, 1, 0.05], [0.4, 0, 1], { len: 0.75 * hr, width: 0.45 * hr, widest: 0.35, round: 0.9, base: 0.5, cup: 0.45, color: COAT, inner: 0xe8d6e8 });
    eye(head, [sx * 0.68 * hr, 0.14 * hr, 0.02 * hr], [sx * 1.0, 0.12, 0.6], 0.17 * hr, { iris: 0x3a2040, pupil: 'none', lid: 0xd8cce4 });
    part(head, ball(0.009, 6), 0x7a5a6a, sx * Q.mr * 0.45, Q.nose[1] + 0.006, Q.nose[2] - 0.012, 0.7, 1.2, 0.5); // nostrils
  }
  // mane: locks along the crest of the neck, falling to one side; a forelock between the ears
  const lock = (parent, from, l, side, c, r0 = 0.02) => part(parent, tube([
    [from.x, from.y, from.z, r0], [from.x + side * l * 0.25, from.y + l * 0.12, from.z - l * 0.15, r0 * 0.9],
    [from.x + side * l * 0.55, from.y - l * 0.2, from.z - l * 0.3, r0 * 0.6], [from.x + side * l * 0.65, from.y - l * 0.65, from.z - l * 0.35, r0 * 0.1],
  ], { seg: 6, steps: 3, paint: (d, v) => shade(c, 0.15 - v * 0.25) }));
  const crestAt = (u) => Q.neck.userData.at(0.1 + u * 0.85, 0);
  for (let i = 0; i < 12; i++) lock(Q.g, crestAt(i / 11).p, 0.15 - i * 0.004, i % 3 ? 1 : -0.4, MANE[i % 4], 0.024);
  for (let i = 0; i < 3; i++) lock(head, V((i - 1) * 0.012, 0.8 * hr, -0.25 * hr), 0.09, (i - 1) * 0.6, MANE[(i + 1) % 4], 0.018).rotation.y = Math.PI;
  const tail = new THREE.Group();
  tail.position.copy(Q.tailRoot);
  Q.g.add(tail);
  Q.parts.tail = tail;
  for (let i = 0; i < 8; i++) part(tail, tube([[0, 0, 0, 0.026], [((i % 3) - 1) * 0.02, -0.02, -0.08, 0.03], [((i % 4) - 1.5) * 0.04, -0.14, -0.14, 0.022], [((i % 4) - 1.5) * 0.06, -0.3, -0.14 + (i % 2) * 0.03, 0.004]],
    { seg: 6, paint: (d, v) => shade(MANE[i % 4], 0.1 - v * 0.25) }));
  if (stage >= 1) { // a spiralled horn
    const horn = tube([[0, 0, 0, 0.026], [0, 0.09, 0.03, 0.017], [0, 0.18, 0.06, 0.008], [0, 0.23, 0.075, 0.001]], { seg: 10, paint: (d, v, p, a) => mix(0xffd23f, 0xfff4b0, smooth(0.3, 0.7, Math.sin((a + v * 4) * Math.PI * 2))) });
    const m = part(head, horn, new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0x664400, roughness: 0.3, metalness: 0.3 }), 0, 0.72 * hr, 0.2 * hr);
    m.rotation.x = 0.35;
  }
  if (stage >= 2) backWings(Q, [0.08, Q.by + 0.1, Q.f * 0.55], 0.34, (row, s, u, i) => shade(mix(0xffffff, MANE[i % 4], smooth(0.45, 1, u) * (row === 'covert' ? 0.25 : 0.75)), smooth(0.1, 0, Math.abs(s)) * -0.08));
  return done(Q, [0, Q.headPos.y + hr * 0.95, Q.headPos.z]);
}

function dragon() {
  const GREEN = 0x4fb860, DEEP = 0x2f7a3a, BELLY = 0xf2e09a, HORN = 0xfff3c0;
  const scales = (c, p) => shade(c, Math.sin(p.x * 140 + p.y * 30) * Math.sin(p.z * 140 + p.y * 50) * 0.08);
  const plates = (p) => mix(BELLY, 0xc8b060, smooth(0.8, 0.95, Math.sin(p.z * 110 + p.y * 40) * 0.5 + 0.5));
  const Q = quadruped({
    r: 0.14, len: 0.3, chest: 1.1, waist: 0.8, rump: 0.95, legLen: 0.19, legT: 0.038, foot: 'claw', claws: 0xf6efd0,
    neck: [0.15, 0.85, 0.5], head: { r: 0.115, w: 0.85, h: 0.75, muzzle: [0.13, 0.052], drop: 0.15, tip: 0.75, jaw: 0.25 },
    coat(where, d, v, p) {
      const top = scales(mix(GREEN, DEEP, smooth(0.3, 1, d.y)), p);
      if (where === 'leg') return top;
      return mix(top, plates(p), smooth(-0.35, -0.6, d.y));
    },
  });
  const { head, hr } = Q;
  for (const sx of SIDES) {
    part(head, tube([[sx * 0.25 * hr, 0.42 * hr, 0.6 * hr, 0.08 * hr], [sx * 0.45 * hr, 0.45 * hr, 0.25 * hr, 0.13 * hr], [sx * 0.55 * hr, 0.4 * hr, -0.15 * hr, 0.06 * hr]], { color: DEEP })); // brow ridge
    eye(head, [sx * 0.5 * hr, 0.27 * hr, 0.3 * hr], [sx * 0.7, 0.1, 1], 0.15 * hr, { iris: 0xf0b020, pupil: 'slit', lid: DEEP });
    for (const [k, l] of [[0, 1], [1, 0.55]]) part(head, tube([ // swept-back horns
      [sx * (0.45 - k * 0.15) * hr, (0.55 - k * 0.15) * hr, (-0.2 - k * 0.2) * hr, 0.13 * hr * l],
      [sx * (0.55 - k * 0.1) * hr, (0.8 - k * 0.1) * hr, (-0.7 - k * 0.1) * hr, 0.09 * hr * l],
      [sx * (0.6 - k * 0.1) * hr, (0.85 - k * 0.15) * hr, (-0.7 - 1.0 * l) * hr, 0.01],
    ], { seg: 8, paint: (d, v) => mix(HORN, 0xd8c890, Math.sin(v * 30) * 0.5 + 0.5) }));
    placed(head, new THREE.ConeGeometry(0.008, 0.028, 5).rotateX(-Math.PI / 2), 0xffffff, [sx * Q.mr * 0.55, Q.nose[1] - Q.mr * 0.75, Q.nose[2] - 0.03], [0, -1, 0.15]); // fangs
    part(head, ball(0.008, 6), 0x1a2a1a, sx * Q.mr * 0.4, Q.nose[1] + 0.01, Q.nose[2] - 0.006, 0.8, 1, 0.5);
  }
  // spines down the back, from the neck to the end of the tail
  const spine = (parent, p, s) => placed(parent, new THREE.ConeGeometry(0.022 * s, 0.07 * s, 4).rotateX(Math.PI / 2).translate(0, 0, 0.03 * s), DEEP, p, [0, 1, -0.6]);
  for (let i = 0; i < 6; i++) spine(Q.g, Q.neck.userData.at(0.15 + i * 0.14, 0).p, 0.8);
  for (let i = 0; i < 7; i++) spine(Q.g, Q.torso.userData.at(0.15 + i * 0.12, 0).p, 1);
  const { tail, geo } = tailTube(Q, [[0, 0, 0.02, 0.07, 0.065], [0, -0.07, -0.15, 0.05], [0, -0.13, -0.3, 0.032], [0.04, -0.14, -0.45, 0.018], [0.08, -0.1, -0.56, 0.008]],
    (d, v, p) => mix(scales(mix(GREEN, DEEP, smooth(0.3, 1, d.y)), p), BELLY, smooth(-0.4, -0.7, d.y)));
  for (let i = 0; i < 6; i++) spine(tail, geo.userData.at(0.1 + i * 0.14, 0).p, 0.8 - i * 0.08);
  const tipAt = geo.userData.at(0.97, 0);
  for (const sx of SIDES) placed(tail, leaf(0.08, 0.07, { widest: 0.4, round: 1, base: 0.1 }), DEEP, tipAt.p, tipAt.t.clone().add(V(sx * 0.6, 0, 0)), [0, 1, 0]); // spade
  // leathery wings: arm, three long fingers, membrane between
  Q.parts.wings = [];
  for (const sx of SIDES) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * Q.r * 0.55, Q.by + Q.r * 0.75, Q.f * 0.4);
    Q.g.add(pivot);
    Q.parts.wings.push(pivot);
    const wrist = V(sx * 0.17, 0.16, -0.05);
    part(pivot, tube([[0, 0, 0, 0.022], [sx * 0.09, 0.1, 0.0, 0.016], [wrist.x, wrist.y, wrist.z, 0.013]], { color: GREEN }));
    const tips = [V(sx * 0.3, 0.02, -0.12), V(sx * 0.24, -0.05, -0.26), V(sx * 0.13, -0.06, -0.33)];
    let prev = V(0, -0.02, -0.15);
    for (const t of tips) {
      part(pivot, tube([[wrist.x, wrist.y, wrist.z, 0.009], [(wrist.x + t.x) / 2, (wrist.y + t.y) / 2 + 0.02, (wrist.z + t.z) / 2, 0.007], [t.x, t.y, t.z, 0.002]], { color: GREEN, seg: 6 }));
      const span = new THREE.BufferGeometry().setFromPoints([wrist, prev, t]); // a membrane triangle
      span.setIndex([0, 1, 2]);
      span.computeVertexNormals();
      part(pivot, span, mix(GREEN, 0x7ad070, 0.4));
      prev = t;
    }
  }
  return done(Q, [0, Q.headPos.y + hr * 0.8, Q.headPos.z]);
}

function axolotl() {
  const PINK = 0xffb3d1, PALE = 0xffd6e6, GILL = 0xff4a8e;
  const g = new THREE.Group(), parts = { legs: [] };
  const body = tube([[0, 0.08, -0.42, 0.005, 0.03], [0, 0.09, -0.3, 0.025, 0.06], [0, 0.1, -0.16, 0.06, 0.07], [0, 0.1, 0.0, 0.09, 0.075], [0, 0.1, 0.12, 0.085, 0.07], [0, 0.11, 0.2, 0.07, 0.065]],
    { seg: 16, paint: (d, v, p) => mix(shade(PINK, Math.sin(p.z * 90) * Math.sin(p.x * 120) * 0.05), PALE, smooth(-0.2, -0.7, d.y)) });
  part(g, body);
  // a fin along the back, down the tail
  part(g, tube([[0, 0.17, -0.02, 0.004, 0.005], [0, 0.18, -0.15, 0.004, 0.03], [0, 0.15, -0.3, 0.004, 0.07], [0, 0.09, -0.43, 0.003, 0.04]], { seg: 6, color: shade(PINK, 0.2) }));
  const head = new THREE.Group();
  head.position.set(0, 0.11, 0.27);
  g.add(head);
  parts.head = head;
  const skull = tube([[0, 0, -0.1, 0.06, 0.05], [0, 0.005, -0.03, 0.12, 0.07], [0, 0, 0.05, 0.12, 0.06], [0, -0.005, 0.1, 0.085, 0.045], [0, -0.01, 0.125, 0.02, 0.015]],
    { seg: 18, paint: (d) => mix(PINK, PALE, smooth(-0.2, -0.7, d.y)) });
  part(head, skull);
  const smile = [];
  for (let i = 0; i <= 10; i++) { const a = -1.3 + (i / 10) * 2.6; smile.push([Math.sin(a) * 0.095, -0.022 + Math.abs(Math.sin(a)) * 0.01, 0.03 + Math.cos(a) * 0.07, 0.0035]); }
  part(head, tube(smile, { seg: 5, steps: 2, color: 0xb04a74 }));
  for (const sx of SIDES) {
    eye(head, [sx * 0.085, 0.03, 0.06], [sx * 0.8, 0.4, 0.6], 0.014, { iris: 0x0a0a0a, pupil: 'none', lid: PINK });
    for (let k = 0; k < 3; k++) { // three feathery gills a side
      const from = V(sx * 0.105, 0.04 - k * 0.025, -0.06), d = V(sx * (0.6 - k * 0.1), 0.75 - k * 0.55, -0.6).normalize();
      const stalk = tube([[from.x, from.y, from.z, 0.012], [from.x + d.x * 0.05, from.y + d.y * 0.05, from.z + d.z * 0.05 - 0.01, 0.009], [from.x + d.x * 0.11, from.y + d.y * 0.11 + 0.01, from.z + d.z * 0.11 - 0.02, 0.003]], { seg: 6, color: GILL });
      part(head, stalk);
      for (let i = 0; i < 9; i++) { // filaments on both sides of each stalk
        const { p, t } = stalk.userData.at(0.15 + i * 0.09, 0);
        for (const side of SIDES) placed(head, leaf(0.03 - i * 0.002, 0.008, { bend: 0.3, widest: 0.3 }), shade(GILL, 0.1 + rnd(i + k) * 0.1), p, t.clone().multiplyScalar(0.5).add(V(0, side, 0)), [sx, 0, 0]);
      }
    }
  }
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { // little splayed legs with fingers
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.075, 0.075, sz > 0 ? 0.13 : -0.1);
    pivot.rotation.z = -sx * 0.9;
    g.add(pivot);
    parts.legs.push(pivot);
    part(pivot, tube([[0, 0.01, 0, 0.018], [0, -0.04, 0.0, 0.012], [0, -0.075, 0.01, 0.01]], { seg: 6, color: PINK }));
    for (let i = 0; i < 4; i++) placed(pivot, tube([[0, 0, 0, 0.0045], [0, 0, 0.022, 0.003]], { seg: 4, steps: 1, color: PALE }), PALE, [0, -0.078, 0.005], [Math.sin((i - 1.5) * 0.4) * sx, -0.5, Math.cos((i - 1.5) * 0.4)]);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.08, -0.3);
  g.add(tail);
  parts.tail = tail;
  bake(g);
  return { body: g, parts, headTop: [0, 0.22, 0.27], neck: { at: [0, 0.11, 0.19], dir: [0, 0, 1], r: 0.085 } };
}

// ------------------------------------------------------------------ small mammals

function mouse() {
  const FUR = 0xa89c98, BELLY = 0xebe2de, PINKY = 0xf2a8b0;
  const g = new THREE.Group(), parts = { legs: [] };
  const coat = (d, v, p) => mix(shade(FUR, Math.sin(p.x * 200) * Math.sin(p.z * 180) * 0.05), BELLY, smooth(-0.2, -0.7, d.y));
  const body = tube([[0, 0.1, -0.2, 0.04], [0, 0.115, -0.15, 0.1, 0.095], [0, 0.125, -0.04, 0.11, 0.105], [0, 0.11, 0.08, 0.085, 0.08], [0, 0.11, 0.14, 0.055]], { seg: 16, paint: coat });
  part(g, body);
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const x = sx * 0.06, z = sz > 0 ? 0.08 : -0.12;
    part(g, tube([[x, 0.06, z, 0.025], [x * 1.05, 0.02, z + 0.005, 0.012]], { seg: 6, color: FUR }));
    part(g, tube([[x, 0.008, z - 0.01, 0.008, 0.006], [x, 0.007, z + 0.015, 0.012, 0.005], [x, 0.006, z + 0.03, 0.006, 0.004]], { seg: 6, color: PINKY }));
  }
  const head = new THREE.Group();
  head.position.set(0, 0.12, 0.17);
  g.add(head);
  parts.head = head;
  part(head, tube([[0, 0, -0.07, 0.035], [0, 0.01, -0.03, 0.065, 0.06], [0, 0.005, 0.02, 0.058, 0.052], [0, -0.008, 0.07, 0.032, 0.028], [0, -0.014, 0.11, 0.012, 0.011]], { seg: 14, paint: coat }));
  part(head, ball(0.011, 8), 0xe88a9a, 0, -0.014, 0.117);
  for (const sx of SIDES) {
    ear(head, sx, [0.03, 0.045, -0.02], [0.55, 1, -0.3], [0.3, 0, 1], { len: 0.075, width: 0.075, widest: 0.55, round: 0.4, base: 0.3, cup: 0.35, color: FUR, inner: PINKY });
    eye(head, [sx * 0.036, 0.022, 0.03], [sx * 0.8, 0.15, 0.7], 0.014, { iris: 0x060606, pupil: 'none', lid: FUR });
  }
  whiskers(head, [0.012, -0.016, 0.095], 0.09, 0xe8e8e8);
  const tail = new THREE.Group();
  tail.position.set(0, 0.1, -0.21);
  g.add(tail);
  parts.tail = tail;
  const path = [];
  for (let i = 0; i <= 11; i++) path.push([Math.sin(i * 0.6) * 0.02, -0.04 * Math.min(1, i / 3) + Math.sin(i * 0.4) * 0.015, -i * 0.03, 0.011 - i * 0.0008]);
  part(tail, tube(path, { seg: 6, paint: (d, v) => mix(PINKY, 0xd88a94, smooth(0.6, 1, Math.sin(v * 160)) * 0.5) }));
  bake(g);
  return { body: g, parts, headTop: [0, 0.2, 0.15], neck: { at: [0, 0.115, 0.13], dir: [0, 0.3, 1], r: 0.06 } };
}

function hamster() {
  const GOLD = 0xe8a050, WHITE = 0xfff3e6, PINKY = 0xf5b0b0;
  const g = new THREE.Group(), parts = { legs: [] };
  const coat = (d) => mix(GOLD, WHITE, smooth(-0.05, -0.55, d.y));
  const body = tube([[0, 0.17, -0.22, 0.07], [0, 0.19, -0.16, 0.2, 0.18], [0, 0.2, -0.02, 0.23, 0.21], [0, 0.19, 0.12, 0.2, 0.18], [0, 0.21, 0.2, 0.13]], { seg: 18, paint: coat });
  part(g, body);
  cover(g, body, { n: 110, a0: 0.1, a1: 0.9, len: 0.045, width: 0.028, color: (p, n) => coat(n), lift: 0.08, droop: 0, seed: 2 });
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.12, 0.08, sz > 0 ? 0.12 : -0.1);
    g.add(pivot);
    parts.legs.push(pivot);
    part(pivot, tube([[0, 0.03, 0, 0.04], [0, -0.04, 0.01, 0.022], [0, -0.065, 0.015, 0.016]], { seg: 8, color: WHITE }));
    part(pivot, tube([[0, -0.07, -0.01, 0.015, 0.01], [0, -0.072, 0.02, 0.022, 0.009], [0, -0.075, 0.04, 0.012, 0.006]], { seg: 8, color: PINKY }));
  }
  const head = new THREE.Group();
  head.position.set(0, 0.25, 0.2);
  g.add(head);
  parts.head = head;
  const skull = tube([[0, 0, -0.1, 0.1], [0, 0.01, -0.04, 0.15, 0.14], [0, 0, 0.04, 0.135, 0.12], [0, -0.025, 0.11, 0.07, 0.06], [0, -0.03, 0.145, 0.024, 0.022]], { seg: 18, paint: (d, v, p) => mix(GOLD, WHITE, Math.max(smooth(-0.1, -0.5, d.y), smooth(0.08, 0.13, p.z) * 0.8)) });
  part(head, skull);
  for (const sx of SIDES) {
    part(head, ball(0.06, 14), mix(WHITE, GOLD, 0.15), sx * 0.085, -0.04, 0.04, 1, 0.85, 1.1); // stuffed cheek pouches
    ear(head, sx, [0.08, 0.1, -0.04], [0.5, 1, -0.2], [0.35, 0, 1], { len: 0.055, width: 0.06, widest: 0.55, round: 0.4, base: 0.3, cup: 0.4, color: GOLD, inner: PINKY });
    eye(head, [sx * 0.075, 0.035, 0.075], [sx * 0.85, 0.1, 0.6], 0.02, { iris: 0x050505, pupil: 'none', lid: GOLD });
  }
  part(head, ball(0.012, 8), 0xe88a9a, 0, -0.024, 0.155, 1.3, 0.8, 0.8);
  whiskers(head, [0.02, -0.035, 0.135], 0.08);
  bake(g);
  return { body: g, parts, headTop: [0, 0.4, 0.18], neck: { at: [0, 0.22, 0.15], dir: [0, 0.4, 1], r: 0.15 } };
}

function hedgehog() {
  const FACE = 0xc8a07a, BELLY = 0xe8d6bc, SPINE = 0x5a3e28, TIP = 0xf2e6cc;
  const g = new THREE.Group(), parts = { legs: [] };
  const body = tube([[0, 0.12, -0.24, 0.05], [0, 0.155, -0.18, 0.18, 0.15], [0, 0.165, -0.02, 0.21, 0.17], [0, 0.15, 0.12, 0.17, 0.14], [0, 0.13, 0.2, 0.1, 0.09]], { seg: 16, paint: (d) => mix(SPINE, BELLY, smooth(-0.1, -0.5, d.y)) });
  part(g, body);
  const quill = tube([[0, 0, 0, 0.0075], [0, 0, 0.05, 0.005], [0, 0, 0.1, 0.0005]], { seg: 4, steps: 2, paint: (d, v) => (v < 0.45 ? TIP : v < 0.85 ? SPINE : TIP) });
  for (let i = 0; i < 170; i++) { // spines over the back and sides, pointing backwards
    const along = 0.05 + 0.85 * ((i + rnd(i) * 0.8) / 170), around = (i * 0.618) % 1;
    const { p, n, t } = body.userData.at(along, around);
    if (n.y < -0.15) continue;
    const s = 0.85 + rnd(i * 5) * 0.35;
    const m = placed(g, quill, 0xffffff, p.addScaledVector(n, -0.01), n.clone().multiplyScalar(0.55).addScaledVector(t, -0.85), n);
    m.scale.setScalar(s);
  }
  const head = new THREE.Group();
  head.position.set(0, 0.14, 0.22);
  g.add(head);
  parts.head = head;
  part(head, tube([[0, 0.01, -0.07, 0.06], [0, 0.01, -0.02, 0.09, 0.085], [0, -0.01, 0.05, 0.07, 0.06], [0, -0.03, 0.11, 0.034, 0.03], [0, -0.035, 0.155, 0.012]], { seg: 14, paint: (d) => mix(FACE, BELLY, smooth(0, -0.6, d.y)) }));
  part(head, ball(0.016, 8), 0x1a1010, 0, -0.034, 0.16);
  for (const sx of SIDES) {
    eye(head, [sx * 0.05, 0.02, 0.045], [sx * 0.7, 0.15, 0.7], 0.015, { iris: 0x050505, pupil: 'none', lid: 0x7a5a3a });
    ear(head, sx, [0.06, 0.06, -0.01], [0.6, 1, -0.2], [0.4, 0, 1], { len: 0.03, width: 0.03, widest: 0.5, round: 0.4, base: 0.4, color: FACE });
  }
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.11, 0.06, sz * 0.13);
    g.add(pivot);
    parts.legs.push(pivot);
    part(pivot, tube([[0, 0.02, 0, 0.03], [0, -0.04, 0.01, 0.018], [0, -0.05, 0.03, 0.016, 0.01]], { seg: 6, color: FACE }));
    for (let i = 0; i < 3; i++) placed(pivot, new THREE.ConeGeometry(0.004, 0.015, 4).rotateX(Math.PI / 2), 0x2a1a10, [(i - 1) * 0.008, -0.056, 0.045], [0, -0.3, 1]);
  }
  bake(g);
  return { body: g, parts, headTop: [0, 0.3, 0.2], neck: { at: [0, 0.13, 0.18], dir: [0, 0.2, 1], r: 0.095 } };
}

// ------------------------------------------------------------------ frog, turtle, bee, snail

function frog() {
  const GREEN = 0x5fb84a, SPOT = 0x2f6a24, BELLY = 0xe8f0c0, RIDGE = 0x9ad070;
  const g = new THREE.Group(), parts = { legs: [] };
  const skinPaint = (d, v, p) => {
    const spots = smooth(0.55, 0.75, Math.sin(p.x * 55 + 1) * Math.sin(p.z * 48) * Math.sin(p.y * 30 + p.x * 20) * 2.2);
    return mix(mix(GREEN, SPOT, spots * smooth(-0.3, 0.2, d.y)), BELLY, smooth(-0.3, -0.7, d.y));
  };
  // sitting up: the rump low, the wide flat head high
  const body = tube([[0, 0.09, -0.2, 0.05, 0.04], [0, 0.13, -0.15, 0.16, 0.11], [0, 0.17, -0.03, 0.2, 0.13], [0, 0.205, 0.08, 0.19, 0.12], [0, 0.225, 0.17, 0.16, 0.09], [0, 0.225, 0.24, 0.11, 0.055], [0, 0.22, 0.28, 0.04, 0.025]],
    { seg: 20, paint: skinPaint });
  part(g, body);
  const at = body.userData.at;
  const mouth = [];
  for (let i = 0; i <= 12; i++) { // the wide mouth: back along one side of the jaw, round the front, down the other
    const u = i / 12, { p } = at(0.6 + Math.sin(u * Math.PI) * 0.38, u < 0.5 ? 0.3 : 0.7);
    mouth.push([p.x, p.y, p.z, 0.004]);
  }
  part(g, tube(mouth, { seg: 4, steps: 2, color: 0x2a4a1a }));
  for (const sx of SIDES) {
    part(g, tube([[sx * 0.12, 0.25, 0.1, 0.012], [sx * 0.14, 0.24, -0.02, 0.014], [sx * 0.12, 0.2, -0.13, 0.008]], { seg: 6, color: RIDGE })); // ridge down the back
    part(g, ball(0.055, 14), GREEN, sx * 0.1, 0.27, 0.15); // eye bump
    eye(g, [sx * 0.11, 0.29, 0.155], [sx * 0.8, 0.55, 0.35], 0.042, { iris: 0xd8a020, pupil: 'bar', lid: GREEN, lidWidth: 0.25 });
    placed(g, new THREE.CylinderGeometry(0.028, 0.028, 0.006, 16).rotateX(Math.PI / 2), 0x8a8a4a, [sx * 0.165, 0.235, 0.07], [sx, 0.2, -0.1]); // eardrum
    part(g, ball(0.005, 6), 0x1a2a10, sx * 0.02, 0.235, 0.283); // nostril
    // front arms with splayed fingers
    part(g, tube([[sx * 0.11, 0.14, 0.15, 0.04], [sx * 0.17, 0.08, 0.17, 0.026], [sx * 0.16, 0.015, 0.22, 0.018]], { seg: 8, paint: skinPaint, round: true }));
    for (let i = 0; i < 4; i++) placed(g, tube([[0, 0, 0, 0.007], [0, 0, 0.035, 0.005], [0, 0, 0.04, 0.008]], { seg: 5, steps: 1, color: GREEN }), GREEN, [sx * 0.16, 0.01, 0.22], [Math.sin((i - 1.5) * 0.45 + sx * 0.3), -0.05, Math.cos((i - 1.5) * 0.45)]);
    // the long back legs, folded in a Z at the sides
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.13, 0.12, -0.12);
    g.add(pivot);
    parts.legs.push(pivot);
    part(pivot, tube([[0, 0.01, -0.02, 0.06, 0.05], [sx * 0.05, -0.03, 0.08, 0.045, 0.04], [sx * 0.085, -0.06, 0.13, 0.03], [sx * 0.08, -0.085, 0.02, 0.025], [sx * 0.07, -0.1, -0.06, 0.018]], { seg: 10, paint: skinPaint }));
    part(pivot, tube([[sx * 0.07, -0.105, -0.07, 0.016, 0.01], [sx * 0.085, -0.11, 0.0, 0.02, 0.008], [sx * 0.1, -0.112, 0.06, 0.012, 0.006]], { seg: 8, color: GREEN }));
    for (let i = 0; i < 5; i++) placed(pivot, tube([[0, 0, 0, 0.006], [0, 0, 0.05, 0.004], [0, 0, 0.056, 0.007]], { seg: 5, steps: 1, color: GREEN }), GREEN, [sx * 0.1, -0.112, 0.06], [Math.sin((i - 2) * 0.28 + sx * 0.35), 0, Math.cos((i - 2) * 0.28)]);
    placed(pivot, leaf(0.055, 0.075, { widest: 0.8, round: 0.4 }), shade(GREEN, 0.1), [sx * 0.1, -0.113, 0.06], [sx * 0.35, 0, 1], [0, 1, 0]); // web
  }
  bake(g);
  return { body: g, parts, headTop: [0, 0.34, 0.15], neck: { at: [0, 0.18, 0.12], dir: [0, 0.4, 1], r: 0.17 } };
}

/** A domed shell with real scutes: each plate raised a little, with growth rings and dark seams. */
function shellGeometry(rx, ry, rz, color, seam) {
  const geo = new THREE.SphereGeometry(1, 72, 28, 0, Math.PI * 2, 0, Math.PI / 2);
  const centres = [];
  for (let i = 0; i < 5; i++) centres.push(V(0, 1, 0).applyAxisAngle(V(1, 0, 0), (i - 2) * 0.42)); // down the middle
  for (const sx of SIDES) for (let i = 0; i < 4; i++) centres.push(V(0, 1, 0).applyAxisAngle(V(0, 0, 1), -sx * 0.75).applyAxisAngle(V(1, 0, 0), (i - 1.5) * 0.5));
  for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; centres.push(V(Math.sin(a), 0.05, Math.cos(a)).normalize()); } // rim
  const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), c = new THREE.Color(), p = V(0, 0, 0);
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    let d1 = 9, d2 = 9, k1 = 0;
    centres.forEach((q, k) => { const d = p.distanceTo(q); if (d < d1) { d2 = d1; d1 = d; k1 = k; } else if (d < d2) d2 = d; });
    const e = d2 - d1; // 0 on a seam, growing towards the middle of the plate
    const growth = smooth(0.35, 0.65, (e * 30) % 1) * smooth(0.02, 0.05, e) * 0.1; // annual rings follow the plate's outline
    c.set(mix(mix(shade(color, (rnd(k1) - 0.5) * 0.25 - growth), 0xb8843e, smooth(0.05, 0.22, e) * 0.5), seam, 1 - smooth(0.006, 0.022, e)));
    cols.set([c.r, c.g, c.b], i * 3);
    const bump = 1 + smooth(0, 0.15, e) * 0.04;
    pos.setXYZ(i, p.x * rx * bump, p.y * ry * bump, p.z * rz * bump);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  return geo;
}

function turtle() {
  const SKIN = 0x7a9a50, SPOT = 0xc8c870, SHELL = 0x7a5530, SEAM = 0x2e1e10, BELLY = 0xd9b76a;
  const g = new THREE.Group(), parts = { legs: [] };
  const scaly = (d, v, p) => mix(SKIN, SPOT, smooth(0.6, 0.85, Math.sin(p.x * 160) * Math.sin(p.z * 150 + p.y * 90)));
  part(g, shellGeometry(0.34, 0.25, 0.4, SHELL, SEAM), 0xffffff, 0, 0.11, 0);
  part(g, new THREE.SphereGeometry(1, 28, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), BELLY, 0, 0.115, 0, 0.33, 0.06, 0.38); // plastron
  part(g, new THREE.TorusGeometry(1, 0.025, 6, 40), mix(SHELL, SEAM, 0.3), 0, 0.115, 0, 0.345, 0.405, 1).rotation.x = Math.PI / 2;
  const head = new THREE.Group();
  head.position.set(0, 0.16, 0.44);
  g.add(head);
  parts.head = head;
  parts.headZ = 0.44;
  part(head, tube([[0, -0.03, -0.2, 0.06], [0, -0.015, -0.1, 0.055], [0, 0, -0.04, 0.06, 0.055]], { seg: 10, paint: scaly })); // neck, slides out of the shell
  part(head, tube([[0, 0, -0.06, 0.06], [0, 0.012, -0.01, 0.08, 0.072], [0, 0.01, 0.05, 0.078, 0.065], [0, -0.005, 0.1, 0.05, 0.044], [0, -0.012, 0.125, 0.022, 0.018]], { seg: 14, paint: scaly }));
  part(head, tube([[-0.07, -0.025, 0.04, 0.004], [-0.04, -0.03, 0.1, 0.004], [0, -0.032, 0.124, 0.004], [0.04, -0.03, 0.1, 0.004], [0.07, -0.025, 0.04, 0.004]], { seg: 4, steps: 2, color: 0x3a3a20 })); // beak edge
  for (const sx of SIDES) {
    eye(head, [sx * 0.058, 0.025, 0.055], [sx * 0.85, 0.15, 0.55], 0.02, { iris: 0x3a2a10, pupil: 'round', lid: shade(SKIN, -0.15), lidWidth: 0.3 });
    part(head, ball(0.004, 6), 0x1a1a10, sx * 0.012, 0.0, 0.128);
  }
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { // stumpy scaly legs with claws
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.25, 0.06, sz * 0.25);
    g.add(pivot);
    parts.legs.push(pivot);
    part(pivot, tube([[sx * -0.04, 0.08, 0, 0.07, 0.06], [0, 0.03, sz * 0.02, 0.065, 0.055], [sx * 0.015, -0.03, sz * 0.03, 0.05, 0.045], [sx * 0.02, -0.055, sz * 0.04, 0.045, 0.012]], { seg: 10, paint: scaly }));
    for (let i = 0; i < 3; i++) placed(pivot, new THREE.ConeGeometry(0.008, 0.025, 4).rotateX(Math.PI / 2), 0x3a3020, [sx * 0.02 + (i - 1) * 0.022, -0.055, sz * 0.04 + 0.04], [(i - 1) * 0.3, -0.3, sz]);
  }
  parts.legY = 0.06;
  part(g, tube([[0, 0.12, -0.38, 0.03], [0, 0.1, -0.45, 0.018], [0, 0.08, -0.5, 0.003]], { seg: 6, paint: scaly }));
  bake(g);
  return { body: g, parts, headTop: [0, 0.3, 0.44], neck: { at: [0, 0.15, 0.36], dir: [0, 0.2, 1], r: 0.06 } };
}

function bee() {
  const YELLOW = 0xf5c033, BLACK = 0x2a2420, FUZZ = 0xe8b040;
  const g = new THREE.Group(), parts = {};
  const abdomen = tube([[0, 0.56, -0.05, 0.06], [0, 0.56, -0.12, 0.15, 0.14], [0, 0.54, -0.24, 0.17, 0.16], [0, 0.52, -0.36, 0.13, 0.12], [0, 0.5, -0.45, 0.05], [0, 0.49, -0.48, 0.01]],
    { seg: 16, paint: (d, v) => mix(YELLOW, BLACK, smooth(0.25, 0.4, Math.sin(v * 26 - 1.2) * 0.5 + 0.5) * (v > 0.2 ? 1 : 0.3)) });
  part(g, abdomen);
  cover(g, abdomen, { n: 90, len: 0.028, width: 0.01, nu: 3, droop: 0, color: (p, n, a) => (Math.sin(a * 26 - 1.2) > -0.3 && a > 0.2 ? BLACK : FUZZ), lift: 0.9, back: 0.3, seed: 8 });
  placed(g, new THREE.ConeGeometry(0.012, 0.06, 6).rotateX(Math.PI / 2), BLACK, [0, 0.49, -0.48], [0, -0.2, -1]);
  const thorax = tube([[0, 0.58, -0.06, 0.05], [0, 0.6, 0.0, 0.12, 0.12], [0, 0.6, 0.09, 0.11], [0, 0.58, 0.15, 0.05]], { seg: 14, color: FUZZ });
  part(g, thorax);
  cover(g, thorax, { n: 160, len: 0.032, width: 0.01, color: (p) => (p.y < 0.52 ? BLACK : shade(FUZZ, (rnd(p.x * 99) - 0.5) * 0.2)), lift: 1.2, back: 0.2, droop: 0, bend: 0.2, nu: 3, seed: 9 });
  const head = new THREE.Group();
  head.position.set(0, 0.57, 0.2);
  g.add(head);
  parts.head = head;
  part(head, tube([[0, 0.01, -0.05, 0.05], [0, 0.01, 0, 0.08, 0.08], [0, -0.02, 0.05, 0.06, 0.07], [0, -0.05, 0.08, 0.025, 0.03]], { seg: 14, color: BLACK }));
  for (const sx of SIDES) {
    const compound = new THREE.Mesh(ball(0.05, 16), std(0x2a1c10, { roughness: 0.15 }));
    compound.position.set(sx * 0.062, 0.01, 0.015);
    compound.scale.set(0.55, 1.1, 0.8);
    compound.rotation.y = sx * 0.4;
    head.add(compound);
    part(head, tube([[sx * 0.025, 0.06, 0.06, 0.007], [sx * 0.05, 0.15, 0.09, 0.006], [sx * 0.06, 0.16, 0.1, 0.006], [sx * 0.09, 0.19, 0.18, 0.005], [sx * 0.095, 0.195, 0.2, 0.008]], { seg: 5, steps: 2, color: BLACK })); // elbowed antennae
    for (let k = 0; k < 3; k++) { // three legs a side, bent at the knee
      const z = 0.08 - k * 0.07, x = sx * 0.07;
      part(g, tube([[x, 0.52, z, 0.012], [x + sx * 0.08, 0.5, z + 0.02, 0.01], [x + sx * 0.11, 0.38, z - 0.01 - k * 0.02, 0.008], [x + sx * 0.12, 0.32, z + 0.02 - k * 0.03, 0.005]], { seg: 5, steps: 2, color: BLACK }));
      if (k === 2) part(g, ball(0.03, 10), 0xffa020, x + sx * 0.11, 0.37, z - 0.05, 1, 1.2, 1); // pollen basket
    }
  }
  parts.wings = [];
  const wingMat = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.2, depthWrite: false });
  const vein = (s, u) => mix(0xf0f8ff, 0x3a3a3a, Math.max(smooth(0.1, 0, Math.abs(s - 0.2)), smooth(0.08, 0, Math.abs(u - 0.5)) * 0.8, smooth(0.85, 1, Math.abs(s))));
  for (const sx of SIDES) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.05, 0.69, 0.04);
    g.add(pivot);
    parts.wings.push(pivot);
    for (const [l, w, a] of [[0.36, 0.14, 0.0], [0.24, 0.1, 0.4]]) {
      const m = new THREE.Mesh(leaf(l, w, { widest: 0.6, round: 0.5, nu: 6, ns: 3, paint: vein }), wingMat);
      aim(m, [sx * (0.55 + a), 0.12, -1], [0, 1, 0]);
      pivot.add(m);
    }
  }
  parts.hover = g;
  bake(g);
  return { body: g, parts, headTop: [0, 0.8, 0.2], neck: { at: [0, 0.58, 0.15], dir: [0, 0, 1], r: 0.08 } };
}

function snail() {
  const FOOT = 0xc8c89a, SHELL = 0xc0703a, BAND = 0x6a3a1a;
  const g = new THREE.Group(), parts = {};
  const skinPaint = (d, v, p) => mix(shade(FOOT, Math.sin(p.x * 220) * Math.sin(p.z * 200) * 0.08), 0xe0e0c0, smooth(-0.3, -0.8, d.y));
  part(g, tube([[0, 0.025, -0.3, 0.01], [0, 0.035, -0.22, 0.05, 0.03], [0, 0.045, -0.05, 0.085, 0.045], [0, 0.06, 0.15, 0.08, 0.055], [0, 0.1, 0.27, 0.06, 0.06], [0, 0.14, 0.32, 0.045]], { seg: 14, paint: skinPaint }));
  // a real coiled shell: one tube spiralling inwards, with stripes along the whorls
  const shell = new THREE.Group();
  shell.position.set(0, 0.22, -0.06);
  g.add(shell);
  parts.shell = shell;
  const coil = [];
  for (let i = 0; i <= 44; i++) {
    const a = i * 0.36, k = Math.exp(-0.15 * a);
    coil.push([0.07 * (1 - k), -Math.cos(a) * 0.16 * k, Math.sin(a) * 0.16 * k - 0.0, 0.095 * k]);
  }
  part(shell, tube(coil, { seg: 14, steps: 2, paint: (d, v, p, a) => mix(mix(SHELL, 0xe0a060, smooth(0.3, 0.7, Math.sin(a * Math.PI * 6))), BAND, smooth(0.7, 0.9, Math.sin(v * 140)) * 0.4) }));
  const head = new THREE.Group();
  head.position.set(0, 0.15, 0.33);
  g.add(head);
  parts.head = head;
  part(head, ball(0.05, 12), FOOT, 0, 0, 0, 1, 0.9, 1.1);
  for (const sx of SIDES) {
    part(head, tube([[sx * 0.02, 0.02, 0, 0.012], [sx * 0.04, 0.1, 0.03, 0.008], [sx * 0.055, 0.17, 0.06, 0.007]], { seg: 6, color: FOOT }));
    eye(head, [sx * 0.055, 0.177, 0.062], [sx * 0.3, 0.3, 1], 0.014, { iris: 0x1a1a10, pupil: 'none' });
    part(head, tube([[sx * 0.025, -0.02, 0.03, 0.008], [sx * 0.035, -0.035, 0.07, 0.005]], { seg: 5, color: FOOT }));
  }
  bake(g);
  return { body: g, parts, headTop: [0, 0.45, 0.0], neck: { at: [0, 0.12, 0.27], dir: [0, 0.6, 1], r: 0.065 } };
}

// ------------------------------------------------------------------ the snake

/**
 * A snake lying along the ground, built from overlapping segments so it can slither (the view
 * waves them side to side), with slit-pupil eyes and a flicking forked tongue. The Royal Cobra
 * spreads a hood.
 */
function snake(stage) {
  const BASE = [0x5aa04a, 0x9a7a44, 0x2c2c36][stage], DARK = [0x2a5a26, 0x4a3018, 0xd8b040][stage], BELLY = [0xe8e0a0, 0xeadbb4, 0xf0d890][stage];
  const g = new THREE.Group(), parts = { segs: [] };
  const N = 12, R = 0.075, Z0 = -0.7, LEN = 1.08;
  const radius = (u) => R * (0.12 + 0.88 * Math.sin(Math.min(1, u * 1.2) * Math.PI / 2)); // thin tail, full body
  const skin = (z0, r) => (d, v, p) => {
    if (d.y < -0.35) return shade(BELLY, Math.sin((p.z + z0) * 160) * 0.06); // belly scales
    const q = (p.z + z0) * 14, w = Math.abs((((q % 1) + 1) % 1) - 0.5) * 2; // diamonds down the back
    const back = smooth(0.2, 0.05, Math.abs(p.x) / Math.max(r, 1e-3) - (1 - w) * 0.75);
    const scale = Math.sin(p.x * 260) * Math.sin((p.z + z0) * 260) * 0.05;
    return shade(mix(BASE, DARK, back * (d.y > -0.1 ? 1 : 0.4)), scale);
  };
  for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N, z0 = Z0 + u0 * LEN, z1 = Z0 + u1 * LEN + 0.025;
    const seg = new THREE.Group();
    seg.position.z = z0;
    g.add(seg);
    const r0 = radius(u0), r1 = radius(u1);
    part(seg, tube([[0, r0 * 0.85, 0, r0, r0 * 0.85], [0, r1 * 0.85, z1 - z0, r1, r1 * 0.85]], { seg: 12, steps: 1, round: true, paint: skin(z0, R) }));
    parts.segs.push(seg);
  }
  const head = new THREE.Group();
  head.position.set(0, R * 0.85, Z0 + LEN);
  g.add(head);
  parts.head = head;
  part(head, tube([[0, 0, -0.03, R * 0.85, R * 0.75], [0, 0.006, 0.035, R * 1.2, R * 0.7], [0, -0.004, 0.095, R * 0.8, R * 0.45], [0, -0.01, 0.125, R * 0.35, R * 0.25]],
    { seg: 14, round: true, paint: (d, v, p) => (d.y < -0.4 ? BELLY : shade(mix(BASE, DARK, smooth(0.3, 0.8, d.y) * 0.5), Math.sin(p.x * 300) * Math.sin(p.z * 300) * 0.05)) }));
  for (const sx of SIDES) {
    eye(head, [sx * R * 0.85, R * 0.32, 0.05], [sx, 0.35, 0.55], R * 0.28, { iris: stage === 2 ? 0xff5030 : 0xffc020, pupil: 'slit', lid: DARK, lidWidth: 0.15 });
    part(head, ball(0.004, 5), 0x111111, sx * R * 0.3, 0.004, 0.12); // nostrils
  }
  const tongue = new THREE.Group();
  tongue.position.set(0, -0.012, 0.12);
  head.add(tongue);
  parts.tongue = tongue;
  part(tongue, tube([[0, 0, 0, 0.004], [0, -0.002, 0.04, 0.003]], { seg: 5, steps: 1, color: 0xd8304a }));
  for (const sx of SIDES) part(tongue, tube([[0, -0.002, 0.04, 0.003], [sx * 0.012, -0.004, 0.065, 0.0012]], { seg: 5, steps: 1, color: 0xd8304a }));
  if (stage >= 1) for (let i = 0; i < 6; i++) part(head, ball(0.012, 6), DARK, 0, R * 0.62, -0.02 + i * 0.016, 1.4, 0.4, 1); // ridge of scales on the head
  if (stage >= 2) { // the cobra's hood, spread behind the head, with two eye-spots
    const hood = leaf(0.2, 0.28, { widest: 0.55, round: 0.95, cup: 0.18, nu: 8, ns: 4,
      paint: (s, u) => { const spot = Math.hypot(Math.abs(s) - 0.45, u - 0.62); return spot < 0.12 ? (spot < 0.06 ? 0x111111 : 0xf0e0a0) : mix(BASE, DARK, smooth(0.7, 1, Math.abs(s))); } });
    placed(head, hood, 0xffffff, [0, -0.01, -0.03], [0, 1, -0.35], [0, 0.3, -1]);
  }
  bake(g);
  return { body: g, parts, headTop: [0, R * 2 + (stage >= 2 ? 0.2 : 0.08), Z0 + LEN], neck: { at: [0, R * 0.85, Z0 + LEN - 0.03], dir: [0, 0, 1], r: R * 1.05 } };
}

// ------------------------------------------------------------------ the fairy

/** A tiny fairy: petal dress, pointy ears, a star wand and butterfly wings; she hovers and sheds glitter. */
function fairy(stage) {
  const SKIN_C = 0xffdcc4, DRESS = [0x8fe0a8, 0xf7a0d4, 0xb8a0ff][stage], HAIR = [0xffe27a, 0xff9ac8, 0xf2f4ff][stage];
  const WING = [[0xc8ffd8, 0x7fe0ff], [0xffd0f0, 0xb48cff], [0xfff0b0, 0xff8ad8]][stage];
  const g = new THREE.Group(), parts = { wings: [] };
  // petal skirt: pointed petals round the hips, over a little bodice
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    placed(g, leaf(0.13, 0.08, { widest: 0.55, round: 0.8, cup: 0.25, paint: (s, u) => mix(shade(DRESS, 0.1), shade(DRESS, -0.15), u) }), 0xffffff,
      [Math.sin(a) * 0.02, 0.22, Math.cos(a) * 0.02], [Math.sin(a) * 0.55, -1, Math.cos(a) * 0.55], [Math.sin(a), 0.4, Math.cos(a)]);
  }
  part(g, tube([[0, 0.2, 0, 0.04, 0.035], [0, 0.26, 0, 0.045, 0.04], [0, 0.31, 0, 0.04, 0.035], [0, 0.335, 0, 0.018]], { seg: 12, paint: (d, v) => (v > 0.85 ? SKIN_C : DRESS) }));
  for (const sx of SIDES) {
    part(g, tube([[sx * 0.02, 0.2, 0, 0.012], [sx * 0.024, 0.1, 0.01, 0.01], [sx * 0.026, 0.02, 0.005, 0.008]], { seg: 6, color: SKIN_C })); // legs
    part(g, ball(0.014, 8), shade(DRESS, -0.3), sx * 0.026, 0.012, 0.012, 1, 0.7, 1.5); // slippers
    part(g, tube([[sx * 0.04, 0.315, 0, 0.011], [sx * 0.075, 0.27, 0.02, 0.009], [sx * 0.085, 0.22, 0.05, 0.008]], { seg: 6, color: SKIN_C })); // arms
  }
  // the wand, held up in her right hand, with a glowing star
  part(g, tube([[0.085, 0.22, 0.05, 0.004], [0.1, 0.33, 0.08, 0.004]], { seg: 5, steps: 1, color: 0xf6efe0 }));
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffc020, emissiveIntensity: 0.8, roughness: 0.3 }));
  star.position.set(0.1, 0.345, 0.08);
  g.add(star);
  parts.star = star;
  const head = new THREE.Group();
  head.position.set(0, 0.4, 0);
  g.add(head);
  parts.head = head;
  part(head, ball(0.062, 16), SKIN_C, 0, 0, 0, 1, 1.05, 0.98);
  part(head, ball(0.068, 16), HAIR, 0, 0.012, -0.012, 1.02, 0.98, 1); // hair over the back and top
  part(head, ball(0.035, 10), HAIR, 0, 0.055, -0.05); // a bun
  for (const sx of SIDES) {
    part(head, ball(0.03, 10), HAIR, sx * 0.045, 0.03, 0.035, 0.9, 0.6, 0.6); // fringe
    eye(head, [sx * 0.024, -0.004, 0.054], [sx * 0.25, 0, 1], 0.012, { iris: 0x3a5aff, pupil: 'round' });
    part(head, ball(0.01, 6), 0xff9a9a, sx * 0.04, -0.022, 0.045, 1, 0.6, 0.4); // rosy cheeks
    placed(head, leaf(0.05, 0.022, { widest: 0.3, round: 0.9, base: 0.5 }), SKIN_C, [sx * 0.058, 0.0, 0.0], [sx, 0.5, -0.3], [0, 0, 1]); // pointy ears
  }
  if (stage >= 2) for (let i = 0; i < 5; i++) { // a little tiara
    const a = (i - 2) * 0.35;
    part(head, new THREE.ConeGeometry(0.008, 0.03 + (i === 2 ? 0.015 : 0), 5), 0xffd23f, Math.sin(a) * 0.06, 0.06 + Math.cos(a) * 0.01, Math.cos(a) * 0.035);
  }
  // butterfly wings: translucent, shimmering from the root to the tips, a pair each side
  const wingMat = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.7, side: THREE.DoubleSide, roughness: 0.2, emissive: 0x332244, depthWrite: false });
  const ws = [1, 1.2, 1.45][stage];
  for (const sx of SIDES) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.015, 0.31, -0.03);
    g.add(pivot);
    parts.wings.push(pivot);
    for (const [l, w, dy] of [[0.2, 0.15, 0.7], [0.13, 0.1, -0.6]]) {
      const m = new THREE.Mesh(leaf(l * ws, w * ws, { widest: 0.65, round: 0.6, nu: 6, ns: 3,
        paint: (s, u) => mix(mix(WING[0], WING[1], u), 0xffffff, smooth(0.85, 1, Math.abs(s)) * 0.6 + smooth(0.95, 1, u) * 0.4) }), wingMat);
      aim(m, [sx, dy, -0.35], [0, 0, 1]);
      pivot.add(m);
    }
  }
  // glitter drifting down from her
  const dust = new THREE.Group();
  g.add(dust);
  parts.dust = dust;
  for (let i = 0; i < 6; i++) dust.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.008, 0), new THREE.MeshBasicMaterial({ color: [0xffffff, 0xfff27a, WING[1]][i % 3] })));
  bake(g);
  return { body: g, parts, headTop: [0, 0.5, 0], neck: { at: [0, 0.335, 0], dir: [0, 1, 0], r: 0.03 } };
}

// ------------------------------------------------------------------ birds

/**
 * A bird: a teardrop body leaning back at `tilt`, overlapping contour feathers (or fluffy down),
 * folded wings of real feather rows, a tail fan, a head with a beak, scaly legs with toes.
 */
function bird(B) {
  const g = new THREE.Group(), parts = { legs: [], wings: [] };
  const { r, len, tilt } = B, by = B.by;
  const d = V(0, Math.sin(tilt), Math.cos(tilt)), u = V(0, Math.cos(tilt), -Math.sin(tilt));
  const C = V(0, by, 0);
  const pt = (s, up, wFac, hFac) => { const p = C.clone().addScaledVector(d, s * len).addScaledVector(u, up * r); return [0, p.y, p.z, wFac * r * 0.88, hFac * r]; };
  // plumage: rows of overlapping feathers sculpted into the skin, each with a fringe at its tip
  // (or soft fluffy down on chicks)
  const F = B.feathers;
  const plumage = (where, rows, cols, depth, fade = () => 1) => ({
    seg: 44, steps: 8,
    paint: (dir, v, p, a) => {
      const c = B.paint(where, dir, v, p);
      if (!F) return shade(c, (curly(p, 0.03) - 0.5) * 0.12);
      const f = scallops(v, a, rows, cols), k = fade(v);
      return mix(mix(c, shade(c, -0.2), smooth(0.3, 0, f) * k), F.fringe ?? shade(c, 0.25), smooth(0.8, 1, f) * 0.55 * k);
    },
    bump: (p, dir, v, a) => (F ? scallops(v, a, rows, cols) * depth * fade(v) : curly(p, 0.03) * 0.012),
  });
  const body = tube([pt(-0.55, 0.1, 0.12, 0.12), pt(-0.38, 0.05, 0.6, 0.6), pt(-0.12, -0.08, 0.98, 1.0), pt(0.15, -0.04, 1.0, 1.0), pt(0.38, 0.02, 0.8, 0.82), pt(0.55, 0.05, 0.42, 0.45)],
    plumage('body', F?.rows ?? 14, F?.cols ?? 13, r * 0.045));
  part(g, body);
  if (B.down) cover(g, body, { n: B.down, len: 0.026, width: 0.012, color: (p, n) => B.paint('body', n, 0, p), lift: 0.3, back: 1, droop: 0, bend: 0.2, seed: 12, round: 0.6, nu: 3, edge: B.downTip });
  // neck + head
  const hr = B.head, headPos = V(0, B.headAt[0], B.headAt[1]);
  const neckFrom = C.clone().addScaledVector(d, 0.42 * len);
  part(g, tube([[0, neckFrom.y, neckFrom.z, r * 0.5], [0, (neckFrom.y + headPos.y) / 2 + (B.neckCurve ?? 0), (neckFrom.z + headPos.z) / 2 - (B.neckCurve ?? 0), B.neckR ?? r * 0.4], [0, headPos.y - hr * 0.3, headPos.z - hr * 0.2, hr * 0.62]],
    { ...plumage('neck', 6, 11, r * 0.03), round: true }));
  const head = new THREE.Group();
  head.position.copy(headPos);
  g.add(head);
  parts.head = head;
  const skull = tube([[0, -0.05 * hr, -0.85 * hr, 0.35 * hr], [0, 0.05 * hr, -0.45 * hr, 0.9 * hr, 0.92 * hr], [0, 0.02 * hr, 0.12 * hr, 0.88 * hr * (B.headW ?? 1), 0.86 * hr], [0, -0.04 * hr, 0.58 * hr, 0.5 * hr, 0.52 * hr], [0, -0.06 * hr, 0.82 * hr, 0.2 * hr, 0.24 * hr]],
    plumage('head', 9, 14, hr * 0.03, (v) => smooth(0.62, 0.35, v)));
  part(head, skull);
  if (B.headFluff) cover(head, skull, { n: B.headFluff, a0: 0.05, a1: 0.6, len: 0.025, width: 0.01, color: (p, n) => B.paint('head', n, 0, p), lift: 0.9, back: 0.4, droop: 0, bend: 0.2, seed: 14, nu: 3, edge: B.downTip });
  const bz = 0.72 * hr, beak = B.beak;
  if (beak.bill) { // a duck's flat bill
    part(head, tube([[0, -0.02 * hr, bz - 0.05, beak.w * 0.8, beak.h], [0, -0.06 * hr, bz + beak.len * 0.4, beak.w, beak.h * 0.55], [0, -0.1 * hr, bz + beak.len * 0.9, beak.w * 0.95, beak.h * 0.4], [0, -0.1 * hr, bz + beak.len, beak.w * 0.5, beak.h * 0.3]],
      { seg: 14, paint: (dir, v) => (v > 0.9 && dir.y > 0 ? shade(beak.color, -0.3) : beak.color) }));
    for (const sx of SIDES) part(head, ball(0.004, 6), 0x3a1a0a, sx * beak.w * 0.3, -0.03 * hr + beak.h * 0.35, bz + beak.len * 0.25);
  } else {
    const hook = beak.hook ?? 0;
    part(head, tube([[0, beak.y ?? 0, bz - 0.01, beak.w, beak.h], [0, (beak.y ?? 0) - beak.h * 0.1, bz + beak.len * 0.5, beak.w * 0.55, beak.h * 0.6], [0, (beak.y ?? 0) - beak.h * (0.25 + hook), bz + beak.len * (1 - hook * 0.3), beak.w * 0.12, beak.h * 0.12]],
      { seg: 10, paint: (dir, v) => (beak.stripe && dir.y < -0.3 ? beak.stripe : beak.color) }));
  }
  for (const sx of SIDES) eye(head, [sx * B.eye[0] * hr, B.eye[1] * hr, B.eye[2] * hr], [sx * B.eye[3], 0.05, 1], B.eye[4] * hr, { iris: B.iris ?? 0x120a06, pupil: B.iris ? 'round' : 'none', lid: B.lid });
  // wings
  for (const sx of SIDES) {
    const pivot = new THREE.Group();
    const s = C.clone().addScaledVector(d, 0.25 * len).addScaledVector(u, 0.4 * r);
    pivot.position.set(sx * r * 0.8, s.y, s.z);
    g.add(pivot);
    parts.wings.push(pivot);
    B.wing(pivot, sx, d, u);
  }
  // tail
  const tailAt = C.clone().addScaledVector(d, -0.5 * len).addScaledVector(u, 0.15 * r);
  if (B.tail) B.tail(g, tailAt, d, u);
  // legs: scaly shanks, three toes forward and one back (webbed for ducks and penguins)
  for (const sx of SIDES) {
    const hip = C.clone().addScaledVector(d, B.legAt ?? 0).addScaledVector(u, -0.6 * r);
    const pivot = new THREE.Group();
    pivot.position.set(sx * r * 0.35, hip.y, hip.z);
    g.add(pivot);
    parts.legs.push(pivot);
    const L = hip.y, legT = B.legT ?? 0.014, c = B.legColor;
    part(pivot, tube([[0, 0.02, 0, legT * 2.4], [0, -L * 0.45, 0.0, legT], [0, -L + legT, 0.01, legT * 0.9]], { seg: 8, paint: (dir, v) => (B.featherLegs && v < 0.75 ? B.paint('body', V(0, -1, 0), 0, V(0, 0, 0)) : shade(c, smooth(0.5, 0.9, Math.sin(v * 60)) * -0.15)) }));
    const toe = B.toe ?? 0.05;
    for (const [a, l] of [[-0.45, 0.9], [0, 1], [0.45, 0.9], [Math.PI, 0.5]]) {
      const dx = Math.sin(a) * toe * l, dz = Math.cos(a) * toe * l;
      part(pivot, tube([[0, -L + legT, 0.01, legT * 0.85], [dx * 0.6, -L + legT * 0.8, 0.01 + dz * 0.6, legT * 0.7], [dx, -L + legT * 0.6, 0.01 + dz, legT * 0.45]], { seg: 6, color: c }));
      if (B.talons) placed(pivot, new THREE.ConeGeometry(legT * 0.5, legT * 2.2, 5).rotateX(Math.PI / 2).translate(0, 0, legT), 0x1a1410, [dx, -L + legT * 0.6, 0.01 + dz], [dx, -legT * 6, dz]);
    }
    if (B.webbed) placed(pivot, leaf(toe * 1.05, toe * 1.5, { widest: 0.85, round: 0.35, base: 0.1 }), shade(c, -0.08), [0, -L + legT * 0.7, 0.01], [0, -0.05, 1], [0, 1, 0]);
  }
  bake(g);
  const neckDir = headPos.clone().sub(neckFrom).normalize();
  const neck = { at: neckFrom.clone().lerp(headPos, 0.45).toArray(), dir: neckDir.toArray(), r: (B.neckR ?? r * 0.4) * 1.1 };
  return { body: g, parts, headTop: [0, headPos.y + hr * (B.crownUp ?? 1), headPos.z], neck };
}

/** The usual folded wing: plain feathers in one colour with a pale fringe and a darker tip. */
const plainWing = (len, c, { tip = shade(c, -0.25), fringe = shade(c, 0.2), bars, width } = {}) => (pivot, sx, d, u) =>
  featherWing(pivot, sx, { len, back: d.clone().negate().addScaledVector(u, -0.15), down: u.clone().negate(), width,
    paint: (row, s, w, i) => {
      let col = row === 'primary' ? mix(c, tip, smooth(0.4, 1, w)) : c;
      if (bars) col = mix(col, bars, smooth(0.55, 0.8, Math.sin(w * 20 + i)) * 0.8);
      return mix(mix(col, shade(col, 0.25), smooth(0.08, 0, Math.abs(s)) * 0.6), fringe, smooth(0.75, 1, Math.max(Math.abs(s), w)) * 0.5);
    } });

/** A fan of tail feathers pointing back (and up by `lift`). */
const fanTail = (n, l, w, colorAt, { lift = 0.2, spread = 0.9, round = 0.6 } = {}) => (g, at, d, u) => {
  for (let i = 0; i < n; i++) {
    const k = n > 1 ? i / (n - 1) - 0.5 : 0;
    const dir = d.clone().negate().addScaledVector(u, lift).add(V(k * spread, 0, 0));
    placed(g, leaf(l * (1 - Math.abs(k) * 0.3), w, { widest: 0.6, round, bend: 0.05, paint: (s, v) => colorAt(s, v, i) }), 0xffffff, at.clone().add(V(k * w * 0.8, 0, 0)), dir, u.clone().add(V(0, 0.2, 0)));
  }
};

function chick(stage) {
  const hen = stage >= 1, phoenix = stage >= 2;
  const DOWN = 0xffe066, GOLD = phoenix ? 0xff8a2a : 0xf0b848, DEEP = phoenix ? 0xd8301a : 0xb87828, RED = 0xe0302a;
  const c = hen ? GOLD : DOWN;
  const built = bird({
    r: hen ? 0.17 : 0.16, len: hen ? 0.44 : 0.34, tilt: hen ? 0.35 : 0.55, by: hen ? 0.3 : 0.24,
    head: hen ? 0.085 : 0.1, headAt: hen ? [0.47, 0.17] : [0.42, 0.11], neckR: hen ? 0.06 : 0.07,
    paint: (where, d, v, p) => (phoenix ? mix(GOLD, DEEP, smooth(0.1, 0.45, -p.z * 1.5 + 0.2)) : mix(c, shade(c, 0.25), smooth(0, -0.8, d.y))),
    down: hen ? 0 : 150, downTip: shade(DOWN, 0.2), headFluff: hen ? 0 : 40, feathers: hen && { rows: 13, cols: 12, fringe: phoenix ? 0xffd040 : shade(GOLD, -0.2) },
    beak: { len: 0.05, w: 0.018, h: 0.016, color: 0xf0a020, hook: hen ? 0.25 : 0 },
    eye: [0.6, 0.18, 0.4, 0.9, 0.17], iris: hen ? 0xe08a20 : undefined,
    legColor: 0xf0a030, legT: 0.012, toe: 0.05,
    wing: hen ? plainWing(0.25, GOLD, { tip: DEEP }) : (pivot, sx, d, u) => { // stubby downy wings
      for (let i = 0; i < 7; i++) placed(pivot, leaf(0.07 - i * 0.004, 0.035, { round: 0.5, bend: 0.2 }), shade(DOWN, rnd(i) * 0.2), [sx * 0.005, -i * 0.012, -i * 0.01], d.clone().negate().addScaledVector(u, -0.6), [sx, 0, 0]);
    },
    tail: hen ? fanTail(phoenix ? 9 : 7, phoenix ? 0.42 : 0.2, phoenix ? 0.06 : 0.05, (s, v, i) => (phoenix ? mix(0xffc030, i % 2 ? RED : 0xff7a20, v) : mix(DEEP, 0x3a2a1a, smooth(0.3, 1, v))), { lift: phoenix ? 0.9 : 1.6, spread: 0.6 }) : null,
  });
  if (hen) { // comb and wattles
    const head = built.parts.head;
    for (let i = 0; i < 5; i++) placed(head, leaf(0.04 + Math.sin((i / 4) * Math.PI) * 0.02, 0.03, { round: 0.4 }), RED, [0, 0.07, 0.05 - i * 0.022], [0, 1, 0.2 - i * 0.1], [1, 0, 0]);
    for (const sx of SIDES) placed(head, leaf(0.04, 0.025, { round: 0.4, widest: 0.7 }), RED, [sx * 0.008, -0.04, 0.06], [0, -1, 0.1], [sx, 0, 0]);
    bake(head);
  }
  return built;
}

function duck() {
  const YEL = 0xfff07a, DEEP = 0xf0d050;
  return bird({
    r: 0.17, len: 0.48, tilt: 0.12, by: 0.24, head: 0.085, headAt: [0.47, 0.2], neckR: 0.055, neckCurve: 0.03,
    paint: (where, d) => mix(YEL, DEEP, smooth(0.2, 0.9, d.y) * 0.5), feathers: { rows: 15, cols: 13, fringe: shade(YEL, 0.35) },
    beak: { bill: true, len: 0.09, w: 0.035, h: 0.022, color: 0xff8a1a },
    eye: [0.62, 0.22, 0.25, 1.1, 0.15],
    legColor: 0xff9020, legT: 0.012, toe: 0.06, webbed: true, legAt: 0.05,
    wing: plainWing(0.3, YEL, { tip: DEEP }),
    tail: fanTail(7, 0.11, 0.05, (s, v) => mix(YEL, DEEP, v), { lift: 1.1, spread: 0.7 }),
  });
}

function penguin(stage) {
  const adult = stage >= 1;
  const BLACK = 0x1e2230, WHITE = 0xfafafa, GREY = 0x8a8a92, GOLD = 0xffb030;
  const built = bird({
    r: 0.19, len: 0.56, tilt: 1.4, by: 0.33, head: 0.12, headAt: [0.65, 0.06], neckR: 0.12,
    paint(where, d, v, p) {
      if (!adult) return where === 'head' ? (d.z > 0.35 && p.y < 0.73 ? WHITE : BLACK) : mix(GREY, shade(GREY, 0.2), smooth(0, -0.8, d.y));
      const front = smooth(0.05, 0.35, d.z);
      if (where === 'head') return d.z > 0.6 && d.y < -0.1 ? mix(WHITE, GOLD, 0.6) : BLACK;
      return mix(BLACK, mix(WHITE, GOLD, smooth(0.62, 0.7, p.y) * 0.6), front);
    },
    down: adult ? 0 : 200, downTip: 0xa8a8b0, headFluff: adult ? 0 : 40, feathers: adult && { rows: 22, cols: 20, fringe: null },
    beak: { len: 0.1, w: 0.016, h: 0.018, y: -0.01, color: 0x1a1a1a, stripe: adult ? 0xff8a3a : undefined, hook: 0.1 },
    eye: [0.45, 0.2, 0.35, 0.8, 0.12], lid: adult ? BLACK : undefined,
    legColor: 0x2a2a30, legT: 0.016, toe: 0.06, webbed: true, legAt: -0.42,
    wing: (pivot, sx, d) => { // stiff flippers
      part(pivot, tube([[0, 0.02, 0, 0.012, 0.04], [sx * 0.02, -0.12, -0.04, 0.01, 0.045], [sx * 0.03, -0.26, -0.06, 0.006, 0.02]], { seg: 8, paint: (dir) => (dir.x * sx > 0 ? BLACK : WHITE) }));
    },
    tail: fanTail(5, 0.06, 0.03, () => BLACK, { lift: -0.6, spread: 0.6 }),
  });
  if (adult) for (const sx of SIDES) placed(built.parts.head, leaf(0.06, 0.04, { round: 0.5 }), GOLD, [sx * 0.1, 0.0, -0.02], [0, -1, 0.2], [sx, 0, 0]); // ear patches
  bake(built.parts.head);
  return built;
}

function owl() {
  const BROWN = 0x8a5a30, DARK = 0x4a2e18, CREAM = 0xe9d2a8, DISC = 0xf0dcb8;
  const streaky = (base, p, k = 1) => mix(base, DARK, smooth(0.6, 0.85, Math.sin(p.y * 120 + Math.sin(p.x * 80) * 2)) * 0.7 * k);
  const built = bird({
    r: 0.2, len: 0.5, tilt: 1.2, by: 0.32, head: 0.15, headAt: [0.66, 0.08], neckR: 0.14, headW: 1.15, crownUp: 0.95,
    paint(where, d, v, p) {
      if (where === 'head') return d.z > 0.4 ? DISC : streaky(BROWN, p, 0.6);
      const front = smooth(-0.1, 0.4, d.z);
      return mix(streaky(BROWN, p, 0.8), streaky(CREAM, p), front);
    },
    feathers: { rows: 14, cols: 13, fringe: CREAM },
    beak: { len: 0.05, w: 0.018, h: 0.025, y: -0.03, color: 0x4a4038, hook: 0.6 },
    eye: [0.38, 0.12, 0.72, 0.15, 0.22], iris: 0xffa020, lid: DARK,
    legColor: 0x8a8070, legT: 0.016, toe: 0.06, talons: true, featherLegs: true,
    wing: plainWing(0.36, BROWN, { tip: DARK, fringe: CREAM, bars: CREAM }),
    tail: fanTail(7, 0.14, 0.05, (s, v) => mix(BROWN, CREAM, smooth(0.6, 0.85, Math.sin(v * 20)) * 0.8), { lift: -0.3, spread: 0.6 }),
  });
  const head = built.parts.head, hr = 0.15;
  for (const sx of SIDES) {
    for (let i = 0; i < 16; i++) { // the facial disc: fine feathers radiating out from each eye
      const a = (i / 16) * Math.PI * 2, dir = V(Math.cos(a), Math.sin(a), 0.15);
      placed(head, leaf(hr * 0.5, hr * 0.12, { widest: 0.5, round: 0.8, paint: (s, u) => mix(DISC, DARK, smooth(0.8, 1, u) * 0.8) }), 0xffffff, [sx * 0.38 * hr, 0.12 * hr, 0.72 * hr], dir, [0, 0, 1]);
    }
    for (let i = 0; i < 4; i++) placed(head, leaf(0.075 - i * 0.008, 0.018, { bend: -0.15, paint: (s, u) => mix(BROWN, DARK, u * 0.8) }), 0xffffff, [sx * (0.6 - i * 0.06) * hr, 0.72 * hr, (0.15 - i * 0.04) * hr], [sx * (0.3 + i * 0.08), 1, -0.2], [0, 0, 1]); // ear tufts
  }
  bake(head);
  return built;
}

// ------------------------------------------------------------------ the species list

/** Every pet: how it moves (its animation) and how to build it at an evolution stage (0-2). */
const MODELS = {
  maple: ['quad', maple], fox: ['quad', fox], cat: ['quad', cat], bunny: ['quad', bunny], piglet: ['quad', piglet],
  panda: ['quad', panda], axolotl: ['quad', axolotl], dragon: ['quad', dragon], unicorn: ['quad', unicorn],
  mouse: ['mouse', mouse], hamster: ['round', hamster], hedgehog: ['hog', hedgehog],
  chick: ['bird', chick], duck: ['bird', duck], penguin: ['bird', penguin], owl: ['bird', owl],
  frog: ['frog', frog], turtle: ['turtle', turtle], bee: ['bee', bee], snail: ['snail', snail],
  snake: ['snake', snake], fairy: ['fairy', fairy],
};

/** Some pets are bigger than the rest at every stage: a unicorn stands about chest-high to its rider. */
const SPECIES_SIZE = { unicorn: 1.6 };
/** How big a pet is drawn: its evolution stage times its species' size. */
const petScale = (kind, level) => STAGE_SCALE[petStage(level)] * (SPECIES_SIZE[kind] ?? 1);

const twinkle = (r, color) => new THREE.Mesh(new THREE.OctahedronGeometry(r, 0), new THREE.MeshBasicMaterial({ color }));

/**
 * A new look every 5 levels (see TIER_LOOKS in shared/pets.js); they stack up:
 * 5 scarf · 10 evolve · 15 orbiting sparkles · 20 evolve + crown · 25 glowing ring ·
 * 30 golden scarf + crown gem · 35 halo · 40 rainbow ring · 45 soft light · 50 golden shimmer ·
 * 55 more stars · 60 floating gems · 65 fairy wings · 70 jewelled crown · 75 sparkle trail ·
 * 80 diamond collar · 85 aurora ring · 90 starlight wings · 95 a little moon · 100 legendary rainbow aura
 */
function decorate(built, level) {
  const tier = petTier(level);
  const fx = built.parts.fx = {};
  if (tier < 1) return;
  const [x, y, z] = built.headTop;
  const goldMat = () => std(0xffcf3f, { metalness: 0.8, roughness: 0.25, side: THREE.DoubleSide });
  const neck = built.neck ?? { at: [x, y - 0.24, z - 0.02], dir: [0, 1, 0], r: 0.15 };
  if (!built.noScarf) { // (a mini boss has no neck to tie one round)
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(neck.r, Math.max(0.018, neck.r * 0.28), 8, 20), tier >= 6 ? goldMat() : std(0xe8433a, { roughness: 0.9 }));
    scarf.position.set(...neck.at);
    aim(scarf, neck.dir, [0, 0, 1]); // the ring goes round the neck
    built.body.add(scarf);
  }
  const box = new THREE.Box3().setFromObject(built.body), mid = box.getCenter(new THREE.Vector3()), top = box.max.y;
  if (tier >= 16) { // diamond collar, sparkling round the scarf
    const collar = new THREE.Group();
    collar.position.set(...neck.at);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const d = new THREE.Mesh(new THREE.OctahedronGeometry(Math.max(0.02, neck.r * 0.18), 0), std(0xdff6ff, { metalness: 0.9, roughness: 0.05, emissive: 0x5a7a8a }));
      d.position.set(Math.cos(a) * neck.r * 1.12, Math.sin(a) * neck.r * 1.12, 0);
      collar.add(d);
    }
    aim(collar, neck.dir, [0, 0, 1]);
    built.body.add(collar);
  }
  if (tier >= 11) { // a second ring of stars, turning the other way
    const orbit = new THREE.Group();
    orbit.position.set(0, top * 0.95, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2, star = twinkle(0.04, [0xb8ff9a, 0xffc27a, 0xc8a8ff, 0xffffff][i]);
      star.position.set(Math.cos(a) * 0.6, Math.sin(a * 2) * 0.05, Math.sin(a) * 0.6);
      orbit.add(star);
    }
    built.body.add(orbit);
    fx.orbit2 = orbit;
  }
  if (tier >= 17) { // aurora: a wider ring that ripples green to violet
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.66, 40), new THREE.MeshBasicMaterial({ color: 0x5affc0, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    built.body.add(ring);
    fx.aurora = ring;
  }
  if (tier >= 12) { // three gems floating around the head
    const gems = new THREE.Group();
    gems.position.set(x, y + 0.12, z);
    [0xff3d6e, 0x3dff8a, 0x3d8aff].forEach((c, i) => {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), std(c, { emissive: c, emissiveIntensity: 0.4, metalness: 0.5, roughness: 0.2 }));
      const a = (i / 3) * Math.PI * 2;
      gem.position.set(Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22);
      gem.scale.y = 1.5;
      gems.add(gem);
    });
    built.body.add(gems);
    fx.gems = gems;
  }
  if (tier >= 13) { // fairy wings on its back (starlight wings from 90)
    fx.fairy = [];
    const bright = tier >= 18;
    const mat = new THREE.MeshBasicMaterial({ color: bright ? 0xfff6c8 : 0xc8e8ff, transparent: true, opacity: bright ? 0.75 : 0.5, side: THREE.DoubleSide, depthWrite: false, blending: bright ? THREE.AdditiveBlending : THREE.NormalBlending });
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.04, mid.y + (top - mid.y) * 0.55, mid.z - 0.02);
      const upper = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), mat);
      upper.scale.set(1, 0.6, 1);
      upper.position.set(s * 0.18, 0.12, 0);
      upper.rotation.set(-Math.PI / 2 + 0.5, 0, s * 0.5);
      const lower = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), mat);
      lower.scale.set(1, 0.7, 1);
      lower.position.set(s * 0.12, -0.02, -0.06);
      lower.rotation.set(-Math.PI / 2 + 0.3, 0, -s * 0.4);
      pivot.add(upper, lower);
      if (bright) for (let i = 0; i < 4; i++) {
        const st = twinkle(0.018, 0xffffff);
        st.position.set(s * (0.1 + i * 0.06), 0.08 + Math.sin(i * 2) * 0.05, 0.01);
        pivot.add(st);
      }
      built.body.add(pivot);
      fx.fairy.push(pivot);
    }
  }
  if (tier >= 15) { // a trail of sparkles drifting up around it
    fx.sparkles = [];
    for (let i = 0; i < 10; i++) {
      const sp = twinkle(0.025, [0xffffff, 0xfff27a, 0x9fe8ff, 0xff9ad5][i % 4]);
      built.body.add(sp);
      fx.sparkles.push(sp);
    }
    fx.sparkleTop = top + 0.3;
  }
  if (tier >= 19) { // a little moon of its own
    const moon = new THREE.Group();
    moon.position.set(0, top + 0.28, 0);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 11), std(0xfff4c8, { emissive: 0xaa9a60 }));
    m.position.x = 0.5;
    for (let i = 0; i < 3; i++) {
      const crater = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), std(0xd8c890, { emissive: 0x6a5a30 }));
      crater.position.set(Math.cos(i * 2.1) * 0.04, Math.sin(i * 2.1) * 0.04, 0.055);
      crater.scale.z = 0.4;
      m.add(crater);
    }
    moon.add(m);
    built.body.add(moon);
    fx.moon = moon;
  }
  if (tier >= 20) { // legendary: a soft rainbow aura
    const r = Math.max(box.max.x - box.min.x, top, box.max.z - box.min.z) * 0.62;
    const aura = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    aura.position.copy(mid);
    built.body.add(aura);
    fx.aura = aura;
  }
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
      if (tier >= 14) { // jewelled crown
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.014, 0), std([0x3dff8a, 0x3d8aff, 0xff3d6e, 0xffd23f, 0xc86aff][i], { emissive: 0x333333 }));
        gem.position.set(Math.cos(a + 0.6) * 0.092, 0, Math.sin(a + 0.6) * 0.092);
        crown.add(gem);
      }
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
  if (tier >= 10) { // golden shimmer over the whole body (rainbow at 100)
    fx.shimmer = [];
    fx.legend = tier >= 20;
    built.body.traverse((o) => {
      if (!o.isMesh || !o.material.isMeshStandardMaterial) return;
      o.material = o.material.clone();
      fx.shimmer.push(o.material);
    });
  }
}

const STAGE_SCALE = [1, 1.3, 1.6];

/** A mini boss: the boss's own model, shrunk to pet size (it keeps its own walk, wings, fire...). */
const MINI_HEIGHT = 0.95;
function miniBoss(kind) {
  const mob = buildMobModel(PET_SPECIES[kind].mini, true);
  const s = MINI_HEIGHT / mob.height;
  mob.group.scale.setScalar(s);
  for (const m of mob.meshes) { // at pet size the skin grain would only be speckle: smooth, with the rim light
    const u = m.material.userData.creatureUniforms;
    if (u) { u.uGrain.value = 0; u.uCavity.value = 0.05; }
  }
  const body = new THREE.Group();
  body.add(mob.group);
  return { body, noScarf: true, parts: { ...mob.parts, mob }, headTop: [0, MINI_HEIGHT + 0.05, 0], neck: { at: [0, MINI_HEIGHT * 0.62, 0.05], dir: [0, 1, 0], r: 0.2 } };
}

export function buildPet(kind, level = 1) {
  const [, build] = isMiniPet(kind) ? ['mob', miniBoss.bind(null, kind)] : MODELS[kind] ?? MODELS.maple;
  const built = build(petStage(level));
  decorate(built, level);
  return built;
}

export class PetView {
  constructor(kind, level = 1) {
    this.kind = kind;
    this.shape = isMiniPet(kind) ? 'mob' : (MODELS[kind] ?? MODELS.maple)[0];
    const built = buildPet(kind, level);
    this.root = new THREE.Group();
    this.root.add(built.body);
    this.root.scale.setScalar(petScale(kind, level));
    dropTinyShadows(this.root);
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
          const u = Math.sin((1 - this.jump / 0.45) * Math.PI);
          b.position.y = u * 0.35;
          b.rotation.x = -u * 0.35;
          for (const l of P.legs) l.rotation.x = u * 1.1; // kick the long legs out behind
        } else {
          const breathe = 1 + Math.sin(t * 3) * 0.03;
          b.scale.set(breathe, 1 / breathe, 1);
          for (const l of P.legs) l.rotation.x = 0;
        }
        break;
      }
      case 'turtle': {
        const w = moving ? Math.sin(t * 6) : 0;
        b.rotation.z = w * 0.04;
        P.legs.forEach((l, i) => { l.position.y = P.legY + Math.max(0, Math.sin(t * 6 + (i % 3 ? Math.PI : 0))) * (moving ? 0.04 : 0); });
        P.head.position.z = P.headZ + (moving ? Math.sin(t * 6) * 0.02 : Math.sin(t * 0.8) * 0.05);
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
        b.position.y = moving ? Math.abs(Math.sin(w * (this.hop ? 0.6 : 1))) * (this.hop ? 0.16 : 0.03) : 0;
        P.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(w + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.5 : 0; });
        if (P.tail) P.tail.rotation.y = Math.sin(t * (moving ? 10 : 3)) * 0.5; // wag
        if (P.head) P.head.rotation.z = moving ? 0 : Math.sin(t * 0.9) * 0.12;
        if (P.wings) P.wings.forEach((wg, i) => { wg.rotation.z = (i ? -1 : 1) * Math.sin(t * 6) * 0.3; });
        if (this.shape === 'round') b.rotation.z = moving ? Math.sin(w) * 0.06 : 0;
        break;
      }
      case 'bird': {
        b.rotation.z = moving ? Math.sin(t * 12) * 0.1 : 0; // waddle
        b.position.y = moving ? Math.abs(Math.sin(t * 12)) * 0.03 : 0;
        P.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(t * 12 + i * Math.PI) * 0.45 : 0; });
        P.wings.forEach((wg, i) => { wg.rotation.z = (i ? -1 : 1) * (moving ? Math.abs(Math.sin(t * 16)) * 0.5 : Math.sin(t * 2) * 0.04); });
        P.head.rotation.x = moving ? 0 : Math.sin(t * 1.4) * 0.1;
        P.head.rotation.y = moving ? 0 : Math.sin(t * 0.5) * 0.4; // looking about
        break;
      }
      case 'bee':
        b.position.y = 0.2 + Math.sin(t * 4) * 0.08;
        P.wings.forEach((wg, i) => { wg.rotation.z = (i ? -1 : 1) * Math.sin(t * 40) * 0.6; });
        break;
      case 'snake': { // a wave travelling down the body, bigger towards the tail; the tongue flicks now and then
        const sp = moving ? 9 : 1.6, amp = moving ? 0.05 : 0.018, n = P.segs.length;
        P.segs.forEach((s, i) => {
          const ph = t * sp - i * 0.75, k = 0.35 + 0.65 * (1 - i / n);
          s.position.x = Math.sin(ph) * amp * k;
          s.rotation.y = Math.cos(ph) * amp * k * 4;
        });
        P.head.position.x = Math.sin(t * sp - n * 0.75) * amp * 0.3;
        P.head.rotation.y = Math.cos(t * sp - n * 0.75) * amp * 2;
        P.tongue.scale.z = (t * 1.3) % 1.7 < 0.22 ? 1 : 0.05;
        break;
      }
      case 'fairy': // hovering at shoulder height, wings a blur, glitter falling
        b.position.y = 0.5 + Math.sin(t * 3) * 0.06;
        b.rotation.z = Math.sin(t * 1.7) * 0.06;
        P.wings.forEach((wg, i) => { wg.rotation.y = (i ? -1 : 1) * (0.25 + Math.sin(t * 24) * 0.45); });
        P.star.rotation.y = t * 3;
        P.dust.children.forEach((d, i) => {
          const u = (t * 0.5 + i / P.dust.children.length) % 1;
          d.position.set(Math.sin(i * 2.3) * 0.07, 0.2 - u * 0.65, Math.cos(i * 1.7) * 0.07 - 0.03);
          d.scale.setScalar(1 - u);
        });
        break;
      case 'mob': { // a mini boss moves like the real one
        const inner = P.mob.group;
        inner.position.y = 0;
        inner.rotation.set(0, 0, 0);
        animateMob(P.mob.kind, P.mob.parts, inner, t, moving);
        break;
      }
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
    if (fx.orbit2) fx.orbit2.rotation.y = -t * 1.4;
    if (fx.gems) { fx.gems.rotation.y = t * 1.1; fx.gems.children.forEach((g, i) => { g.position.y = Math.sin(t * 2 + i * 2) * 0.03; g.rotation.y = t * 3; }); }
    if (fx.aurora) {
      fx.aurora.rotation.z = t * 0.5;
      fx.aurora.material.color.setHSL(0.38 + Math.sin(t * 0.7) * 0.18, 0.9, 0.55);
      fx.aurora.material.opacity = 0.22 + Math.sin(t * 2.3) * 0.1;
    }
    if (fx.fairy) fx.fairy.forEach((wg, i) => { wg.rotation.y = (i ? -1 : 1) * Math.sin(t * 9) * 0.35; });
    if (fx.sparkles) fx.sparkles.forEach((sp, i) => {
      const u = (t * 0.35 + i / fx.sparkles.length) % 1, a = i * 2.4 + t * 0.8;
      sp.position.set(Math.cos(a) * 0.4, u * fx.sparkleTop, Math.sin(a) * 0.4);
      sp.scale.setScalar(Math.sin(u * Math.PI));
      sp.rotation.y = t * 4;
    });
    if (fx.moon) fx.moon.rotation.y = t * 0.6;
    if (fx.aura) fx.aura.material.color.setHSL((t * 0.15) % 1, 0.8, 0.6);
    if (fx.shimmer) {
      const g = 0.12 + Math.sin(t * 2.5) * 0.1;
      for (const m of fx.shimmer) {
        if (fx.legend) m.emissive.setHSL((t * 0.15) % 1, 0.9, g * 0.8);
        else m.emissive.setRGB(g, g * 0.8, 0);
      }
    }
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
    const top = (this.species === 'fairy' ? 1.1 : 1.0) * petScale(this.species, this.level) + 0.3;
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
    this.hpFg.center.x = f > 0 ? 0.5 / f : 0.5; // left-aligned on screen, whichever way the pet faces
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
