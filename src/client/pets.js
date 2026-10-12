// Pet models + animation. Pets are 'pet' entities on the host (they follow and fight);
// PetEntityView shows one, PetView is the model itself (also used on the pet stall and for icons).
// Every species is built from simple shapes but follows its real animal: jointed legs ending in paws,
// hooves, claws or webbed feet; the right ears, tails, markings and eyes (slit pupils for cats, foxes
// and dragons, a frog's bar pupil, an owl's big yellow eyes). Many change colour as they evolve
// (a duckling grows into a mallard, then a swan). Afterwards the still pieces are merged per
// material, so a detailed pet is only a few draw calls. Look at them all: tools/pet-gallery.html.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { petStage, petTier } from '../shared/pets.js';

// ------------------------------------------------------------------ building blocks

const MATS = new Map();
/** A shared standard material: one per colour + options, reused by every pet. */
function std(color, extra) {
  const key = `${color}|${extra ? JSON.stringify(extra) : ''}`;
  let m = MATS.get(key);
  if (!m) MATS.set(key, (m = new THREE.MeshStandardMaterial({ color, roughness: 0.62, ...extra })));
  return m;
}
const SHARED = () => new Set(MATS.values());
const GLINT = new THREE.MeshBasicMaterial({ color: 0xffffff }), PUPIL = new THREE.MeshBasicMaterial({ color: 0x0c0806 });
const EYE_DARK = std(0x1c120c, { roughness: 0.15 });

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const vec = (p) => (p.isVector3 ? p : V(...p));
const UP = V(0, 1, 0);

function part(parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  parent.add(m);
  return m;
}
const ball = (r, seg = 14) => new THREE.SphereGeometry(r, seg, Math.max(6, (seg * 0.7) | 0));
/** A capsule lying along z (bodies, snouts, feet...). */
const capsuleZ = (r, len) => new THREE.CapsuleGeometry(r, Math.max(0.001, len), 6, 14).rotateX(Math.PI / 2);
/** The top cap of a sphere (stripes, shells). */
const dome = (r, cut = 0.45) => new THREE.SphereGeometry(r, 18, 6, 0, Math.PI * 2, 0, Math.PI * cut);
/** A cone pointing along +z (claws, spines, beaks), to be turned with aim(). */
const spike = (r, h, seg = 6) => new THREE.ConeGeometry(r, h, seg).rotateX(Math.PI / 2);

/** Turns `obj` so its +z points along `dir`, with its +y as close to `up` as it can. */
function aim(obj, dir, up = UP) {
  const z = vec(dir).clone().normalize();
  let x = V().crossVectors(up, z);
  if (x.lengthSq() < 1e-6) x = V().crossVectors(V(0, 0, 1), z);
  x.normalize();
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, V().crossVectors(z, x), z));
  return obj;
}

/** A tapered rod from a (radius r) to b (radius r2): legs, necks, antennae, whiskers. */
function limb(parent, a, b, r, mat, r2 = r) {
  a = vec(a); b = vec(b);
  const d = V().subVectors(b, a), len = d.length();
  const m = part(parent, new THREE.CylinderGeometry(r2, r, len, 10), mat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  if (r > 0.006) {
    part(parent, ball(r, 10), mat, a.x, a.y, a.z);
    part(parent, ball(r2, 10), mat, b.x, b.y, b.z);
  }
  return m;
}

/** Balls strung along a smooth curve: tails, swan necks, horns. `radius` / `mat` may be functions of u (0..1). */
function beads(parent, pts, n, radius, mat, squash = [1, 1, 1]) {
  const curve = new THREE.CatmullRomCurve3(pts.map(vec));
  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) : 0, p = curve.getPoint(u);
    part(parent, ball(typeof radius === 'function' ? radius(u) : radius, 10), typeof mat === 'function' ? mat(u, i) : mat, p.x, p.y, p.z, ...squash);
  }
  return curve;
}

/** A flat leaf shape from `at` along `dir`: feathers, hair strands, fins. `up` is the side it faces. */
function feather(parent, at, dir, len, w, mat, up = UP, thick = 0.2) {
  at = vec(at);
  const d = vec(dir).clone().normalize();
  const f = part(parent, ball(0.5, 10), mat, at.x + (d.x * len) / 2, at.y + (d.y * len) / 2, at.z + (d.z * len) / 2, w, w * thick, len);
  return aim(f, d, up);
}

/** A thin sheet through points (wing membranes). */
function sheet(parent, pts, tris, mat) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap((p) => vec(p).toArray()), 3));
  geo.setIndex(tris.flat());
  geo.computeVertexNormals();
  return part(parent, geo, mat);
}

/**
 * Two eyes looking forward (+z) and turned out by `side` (prey animals look sideways).
 * Dark and glossy by default; `iris` + `pupil` ('round' | 'slit' | 'bar') for cats, owls, frogs...
 */
function eyes(parent, y, z, spread, size, o = {}) {
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(s * spread, y, z);
    e.rotation.y = s * (o.side ?? 0.3);
    parent.add(e);
    part(e, ball(size, 12), o.iris ? std(o.iris, { roughness: 0.2 }) : EYE_DARK);
    if (o.iris) {
      const [px, py] = o.pupil === 'slit' ? [0.22, 0.8] : o.pupil === 'bar' ? [0.75, 0.3] : [0.55, 0.55];
      part(e, ball(size, 10), PUPIL, 0, 0, size * 0.42, px, py, 0.6);
    }
    part(e, ball(size * 0.24, 6), GLINT, size * 0.32, size * 0.36, size * 0.8);
  }
}

/** Whiskers fanning out from both sides of a muzzle. */
function whiskers(parent, at, len, color = 0xf4f4f4) {
  const m = std(color);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const from = V(s * at.x, at.y, at.z);
    limb(parent, from, from.clone().add(V(s * len, (i - 1) * len * 0.2 + len * 0.04, -len * 0.18)), 0.0032, m);
  }
}

// ------------------------------------------------------------------ what every species looks like

// Four-legged animals are built from proportions (all in units; characters are ~2.5 tall):
//   body: [radius, length]  legs: [length, thickness]  neck: [length, tilt up]  head: radius
//   snout: [length, radius, 'round' | 'pointy' | 'flat' | 'long' | 'none']; ears, paws and tails: see makeQuad.
// Birds set `bird: true` (see makeBird). `stages` override the look at each evolution (0, 1, 2).
const LOOKS = {
  maple:    { body: [0.15, 0.22], legs: [0.13, 0.045], neck: [0.07, 0.95], head: 0.165, snout: [0.055, 0.068, 'round'],
              fur: 0xf0ae76, belly: 0xf6cda0, muzzle: 0xf6cda0, curls: 0xf5b884, ears: 'floppy', earColor: 0xe39a62,
              tail: 'plume', nose: 0x2a1d17, mouth: true, tongue: true, eye: { side: 0.15, size: 0.21 } },
  fox:      { body: [0.12, 0.32], legs: [0.19, 0.034], neck: [0.1, 0.65], head: 0.13, snout: [0.13, 0.055, 'pointy'],
              fur: 0xe8742a, belly: 0xfff4e6, muzzle: 0xfff4e6, bib: 0xfff4e6, cheeks: true, socks: 0x2a1a14,
              ears: 'tall', earInner: 0xfff0e0, earTip: 0x2a1a14, tail: 'bushy', tip: 0xfff4e6, nose: 0x1a1210,
              eye: { iris: 0xd9922a, pupil: 'slit', side: 0.25 },
              stages: [{ fur: 0xc98a5a, head: 0.145, legs: [0.15, 0.034], earSize: 1.15 }, {}, { tails: 9 }] },
  cat:      { body: [0.115, 0.28], legs: [0.17, 0.033], neck: [0.06, 0.8], head: 0.135, snout: [0.03, 0.056, 'round'],
              fur: 0xf09a4a, belly: 0xffe6c8, muzzle: 0xffe6c8, bib: 0xffe6c8, stripes: 0xc4612a, cheeks: true,
              ears: 'pointy', earInner: 0xffb3c9, tail: 'long', nose: 0xf28aa0, noseShape: 'tri', whiskers: 0xffffff, mouth: true,
              eye: { iris: 0x9ccf3a, pupil: 'slit', side: 0.2, size: 0.22 },
              stages: [{ head: 0.15, body: [0.105, 0.23], legs: [0.13, 0.03], eye: { iris: 0x6fa8dc, pupil: 'round', side: 0.2, size: 0.25 } }, {}, {}] },
  bunny:    { body: [0.15, 0.17], legs: [0.07, 0.038], haunch: 1.3, hindFoot: true, neck: [0.03, 1.1], head: 0.125, snout: [0.035, 0.06, 'round'],
              fur: 0xf4f1ee, belly: 0xffffff, muzzle: 0xffffff, ears: 'long', earInner: 0xffb3c9, tail: 'puff', tailColor: 0xffffff,
              nose: 0xff8aa8, noseShape: 'tri', whiskers: 0xd8d0c8, mouth: true, hop: true, eye: { side: 0.6, size: 0.24, spread: 0.55, z: 0.68 },
              stages: [{}, { fur: 0xa88a6a, belly: 0xeadcc8, muzzle: 0xeadcc8, earInner: 0xd8a8a0, earTip: 0x2a2420, earSize: 1.3, legs: [0.1, 0.04] },
                { fur: 0xf6f8ff, earInner: 0xb8c8ff, glow: 0x262c48 }] },
  piglet:   { body: [0.17, 0.24], legs: [0.09, 0.045], neck: [0.02, 0.3], head: 0.15, snout: [0.06, 0.07, 'flat'],
              fur: 0xffb3c6, belly: 0xffc4d2, snoutColor: 0xff98b2, ears: 'flop', earInner: 0xff98b2, tail: 'curl', paw: 'cloven', hooves: 0x9a6a6a,
              eye: { side: 0.3, size: 0.17 },
              stages: [{}, {}, { fur: 0x6a4a32, belly: 0x7a5a40, snoutColor: 0x4a3428, earInner: 0x4a3428, ears: 'pointy', tusks: 0xfff4dc, bristles: 0x2e2018, hooves: 0x2a2020 }] },
  panda:    { body: [0.2, 0.24], legs: [0.14, 0.07], neck: [0.04, 0.6], head: 0.17, snout: [0.05, 0.075, 'round'],
              fur: 0xf4f4ee, belly: 0xf4f4ee, muzzle: 0xf4f4ee, limbs: 0x24242a, shoulders: 0x24242a, ears: 'round', earColor: 0x24242a,
              patches: 0x24242a, nose: 0x24242a, mouth: true, tail: 'puff', tailColor: 0xf4f4ee, eye: { side: 0.2, size: 0.17, spread: 0.38, y: 0.1, z: 0.8 },
              stages: [{ head: 0.19 }, {}, {}] },
  axolotl:  { body: [0.09, 0.34], legs: [0.06, 0.022], splay: true, neck: [0.01, 0.1], head: 0.13, headFlat: true, snout: [0, 0.1, 'none'],
              fur: 0xffb8d0, belly: 0xffd8e4, gills: 0xff4f8e, tail: 'fin', fin: 0xffd6e4, smile: 0x9a3a5a, paw: 'fingers',
              eye: { side: 0.6, size: 0.14, spread: 0.9, y: 0.28, z: 0.55 },
              stages: [{}, {}, { fur: 0xffe08a, belly: 0xfff0c0, gills: 0xff8a4a, fin: 0xfff0c8 }] },
  dragon:   { body: [0.15, 0.3], legs: [0.14, 0.05], neck: [0.16, 0.9], head: 0.13, snout: [0.12, 0.07, 'long'],
              fur: 0x4fb85a, belly: 0xf2e49a, muzzle: 0x4fb85a, horns: 0xf5ecc8, wings: 'bat', wingColor: 0x2f8a40, membrane: 0x9ad88a,
              tail: 'dragon', spines: 0x2f8a40, plates: 0xe8d47a, paw: 'claw', claws: 0xf5ecc8, nostril: 0x1e4a24,
              eye: { iris: 0xffd23f, pupil: 'slit', side: 0.35, size: 0.2 },
              stages: [{ head: 0.15, wingSize: 0.75 }, {},
                { fur: 0x2f8a6a, muzzle: 0x2f8a6a, wingColor: 0x1f5a48, membrane: 0x6ac8a8, spines: 0x1f5a48, wingSize: 1.25, hornLen: 1.5 }] },
  unicorn:  { body: [0.15, 0.36], legs: [0.3, 0.04], paw: 'hoof', hooves: 0xd8c2ff, neck: [0.2, 1.05], head: 0.115, headLong: 1.15, headTilt: 0.4,
              snout: [0.13, 0.068, 'long'], fur: 0xffffff, belly: 0xfaf6ff, muzzle: 0xfff0f6, ears: 'horse', earInner: 0xffd6ea,
              mane: [0xff7ab0, 0xffd23f, 0x7fd4ff, 0xb48cff], tail: 'horse', horn: 0xffd23f, nostril: 0xd8a0b8,
              eye: { side: 0.6, size: 0.22, spread: 0.55, z: 0.7 },
              stages: [{ body: [0.16, 0.3], legs: [0.22, 0.045], head: 0.13, shaggy: true }, {}, { wings: 'feather', wingColor: 0xffffff, wingTips: 0xd8c8ff }] },

  chick:    { bird: true, R: 0.2, shape3: [1, 0.95, 1], legH: 0.05, head: [0.13, 0.85, 0.4], fur: 0xffe066, belly: 0xffeb8a,
              beak: 'cone', beakColor: 0xff9a2a, legColor: 0xff9a2a, feet: 'toes', fluffy: true, tail: 'none', wingLen: 0.6,
              stages: [{},
                { R: 0.21, shape3: [0.95, 0.9, 1.2], legH: 0.1, head: [0.11, 1.15, 0.72], fur: 0xb5552a, belly: 0xc8703a, wingColor: 0x8a3a1a,
                  comb: 0xe02a2a, tail: 'fan', tailColor: 0x3a2418, legColor: 0xf2c94c, beakColor: 0xf2c94c, fluffy: false, wingLen: 1 },
                { R: 0.21, shape3: [0.95, 0.9, 1.2], legH: 0.1, head: [0.11, 1.15, 0.72], fur: 0xff5a1f, belly: 0xffb02a, wingColor: 0xd8261a,
                  primaries: 0xffd23f, crest: 0xffd23f, tail: 'plume', tailColors: [0xff3a1a, 0xffa21a, 0xffd23f], glow: 0x5a1400,
                  legColor: 0xffb02a, beakColor: 0xffd23f, fluffy: false, wingLen: 1.2 }] },
  duck:     { bird: true, R: 0.19, shape3: [1, 0.85, 1.3], legH: 0.05, head: [0.13, 1.1, 0.75], fur: 0xffe066, belly: 0xffeb8a,
              beak: 'bill', beakColor: 0xf0a040, legColor: 0xf09a2a, feet: 'webbed', fluffy: true, tail: 'none', wingLen: 0.7,
              stages: [{},
                { R: 0.2, shape3: [1, 0.82, 1.45], head: [0.11, 1.15, 1.05], fur: 0xb4b4ac, belly: 0xc8c8c0, headColor: 0x1f6e3e, headShine: true,
                  neckColor: 0x1f6e3e, collar: 0xffffff, breast: 0x7a4026, wingColor: 0x8a8070, speculum: 0x3050c8, beakColor: 0xe8d040,
                  tail: 'perky', tailColor: 0xf0f0f0, curl: 0x1a1a1a, fluffy: false, wingLen: 1, legColor: 0xff8a2a },
                { R: 0.22, shape3: [1, 0.8, 1.5], fur: 0xffffff, belly: 0xffffff, wingColor: 0xf6f6f6,
                  neckPts: [[0, 0.5, 0.95], [0, 1.2, 1.15], [0, 1.9, 0.8], [0, 2.3, 1.0]], head: [0.1, 0, 0],
                  beakColor: 0xff7a2a, knob: 0x1a1a1a, nail: 0x1a1a1a, tail: 'perky', fluffy: false, wingLen: 1.25, legColor: 0x2a2a2a }] },
  penguin:  { bird: true, R: 0.2, shape3: [1, 1.3, 0.95], legH: 0.02, head: [0.14, 1.05, 0.12], fur: 0x9a9aa4, belly: 0xb8b8c0,
              headColor: 0x1e1e26, mask: 0xffffff, fluffy: true, beak: 'dagger', beakColor: 0x1e1e26, flippers: true, wingColor: 0x8a8a94,
              legColor: 0x2a2a30, feet: 'webbed', tail: 'wedge',
              stages: [{},
                { fur: 0x1e1e2a, belly: 0xffffff, headColor: 0x1e1e2a, wingColor: 0x1e1e2a, mask: null, brow: 0xffffff, fluffy: false,
                  beakColor: 0xff7a2a, legColor: 0xff8a3a, head: [0.13, 1.0, 0.15] },
                { R: 0.21, shape3: [1, 1.45, 0.95], fur: 0x1e1e2a, belly: 0xffffff, headColor: 0x1e1e2a, wingColor: 0x1e1e2a, mask: null,
                  earPatch: 0xffa020, chestWash: 0xfff0b8, fluffy: false, beakColor: 0x1e1e26, beakStripe: 0xff7a4a, head: [0.12, 0.98, 0.18] }] },
  owl:      { bird: true, R: 0.2, shape3: [1, 1.2, 0.95], legH: 0.04, head: [0.16, 1.0, 0.12], fur: 0xe8e2d8, belly: 0xf6f2ea, fluffy: true,
              disc: 0xf8f4ee, beak: 'hook', beakColor: 0x5a5048, feet: 'talons', legColor: 0xc8b070, wingColor: 0xbcb0a0, tail: 'wedge',
              eye: { iris: 0xffc21a, pupil: 'round', side: 0.12, size: 0.28, spread: 0.38, y: 0.08, z: 0.86 },
              stages: [{},
                { fur: 0x9a6a3c, belly: 0xd8b88a, disc: 0xc89a68, discRim: 0x6a4424, spots: 0x5a3a1e, wingColor: 0x7a5030, fluffy: false,
                  eye: { side: 0.12, size: 0.26, spread: 0.38, y: 0.08, z: 0.86 } },
                { fur: 0x8a6a48, belly: 0xd8c09a, disc: 0xd89a5a, discRim: 0x2a2018, tufts: true, bib: 0xffffff, spots: 0x4a3220,
                  wingColor: 0x6a4a30, fluffy: false }] },

  frog:     { fur: 0x5fbf45, belly: 0xe8f5c0, spots: 0x3f8a2e, iris: 0xd8a52a,
              stages: [{}, { fur: 0x6f8f3a, belly: 0xf2e7b0, throat: 0xe8d870, spots: 0x4a6a2a }, { fur: 0x52cf62, spots: 0x2f8a3e, iris: 0xffcf3f }] },
  turtle:   { fur: 0x6f8a4a, shell: 0x6a4a2a, plates: 0x7a5530, rings: 0xd8a040, belly: 0xe0c070, skinSpots: 0xe8b030, iris: 0xc84a20,
              stages: [{}, { plates: 0x6a4a2a, shell: 0x5a3e22 },
                { fur: 0x8a8070, shell: 0x4a3e30, plates: 0x5a4c3a, rings: 0x8a7a5a, belly: 0xa89a7a, skinSpots: null, iris: 0x2a2018, dome: 0.95, legs: 1.35 }] },
  mouse:    { fur: 0xa8968a, belly: 0xefe4dc, stages: [{}, { fur: 0x9a8070 }, { fur: 0xdcd6dc, belly: 0xffffff }] },
  hamster:  { fur: 0xe0a050, belly: 0xfff4e4, stages: [{}, { fur: 0xd08a3a }, { fur: 0xc87a30, belly: 0xffffff }] },
  hedgehog: { fur: 0xc8a07a, belly: 0xf0dcc0, spikes: 0x5a3e26, spikeTips: 0xf4ead8,
              stages: [{ spikes: 0x8a6a4a }, {}, { spikes: 0x3a2a20, spikeTips: 0xfff0c0 }] },
  snail:    { fur: 0xc8bc98, belly: 0xe8e0c4, shell: 0xb07a3a, band: 0x5a3418, lip: 0xf0dcb0,
              stages: [{}, { shell: 0xe8b84a, band: 0xd84a2a }, { shell: 0x3a7ae8, band: 0xffffff, lip: 0xffd23f }] },
  bee:      { fur: 0xf0b030, thorax: 0x9a6a2a, bands: [[0.32, 0.12, 0x2a1a0c], [0.55, 0.12, 0x2a1a0c], [0.76, 0.12, 0x2a1a0c], [0.93, 0.12, 0x2a1a0c]],
              stages: [{}, { fur: 0x1e1a18, thorax: 0xffd23f, round: 1.15, bands: [[0.22, 0.2, 0xffd23f], [0.88, 0.24, 0xffffff]] },
                { abdomen: 1.4 }] },
};

function lookFor(kind, stage) {
  const L = LOOKS[kind] ?? LOOKS.maple;
  return { ...L, ...(L.stages?.[stage] ?? {}) };
}

// ------------------------------------------------------------------ four-legged animals

function paw(pivot, L, at, r, mat) {
  const kind = L.paw ?? 'paw';
  if (kind === 'hoof') {
    part(pivot, new THREE.CylinderGeometry(r * 0.95, r * 1.25, r * 1.5, 12), std(L.hooves ?? 0x3a2a20), at.x, at.y + r * 0.1, at.z);
  } else if (kind === 'cloven') { // pigs: two toes per foot
    for (const s of [-1, 1]) part(pivot, new THREE.CylinderGeometry(r * 0.45, r * 0.6, r * 1.2, 8), std(L.hooves ?? 0x5a3a3a), at.x + s * r * 0.42, at.y + r * 0.05, at.z + r * 0.15, 1, 1, 1.3);
  } else if (kind === 'fingers') { // axolotl: four thin splayed fingers
    for (let i = 0; i < 4; i++) {
      const a = (i - 1.5) * 0.45;
      limb(pivot, at, V(at.x + Math.sin(a) * r * 2.6, at.y - r * 0.2, at.z + Math.cos(a) * r * 2.6), r * 0.4, mat, r * 0.3);
    }
  } else {
    part(pivot, ball(r * 1.3, 10), mat, at.x, at.y, at.z + r * 0.4, 1, 0.6, 1.35);
    for (const tx of [-0.62, 0, 0.62]) {
      if (kind === 'claw') aim(part(pivot, spike(r * 0.24, r * 0.9), std(L.claws ?? 0xf0e6c8), at.x + tx * r, at.y - r * 0.15, at.z + r * 1.9), V(tx * 0.3, -0.35, 1));
      else part(pivot, ball(r * 0.42, 8), mat, at.x + tx * r * 1.05, at.y - r * 0.12, at.z + r * 1.4, 1, 0.75, 1); // toe beans
    }
  }
}

function buildTail(t, L, bodyR, sz, fur, glow) {
  const T = (pts) => pts.map(([x, y, z]) => [x * sz, y * sz, z * sz]);
  switch (L.tail) {
    case 'puff': { // a cotton tail
      const m = std(L.tailColor ?? L.fur, glow);
      part(t, ball(bodyR * 0.38), m);
      for (let i = 0; i < 6; i++) part(t, ball(bodyR * 0.24, 8), m, Math.cos(i * 1.05) * bodyR * 0.24, Math.sin(i * 1.05) * bodyR * 0.24, -bodyR * 0.1);
      break;
    }
    case 'plume': { // a curly tail carried up over the back
      const m = std(L.curls ?? L.fur);
      const pts = T([[0, 0, 0], [0, 0.08, -0.05], [0, 0.16, -0.02], [0, 0.19, 0.06]]);
      beads(t, pts, 9, bodyR * 0.27, m);
      for (const s of [-1, 1]) beads(t, pts.map(([x, y, z]) => [x + s * bodyR * 0.2, y - bodyR * 0.05, z]), 6, bodyR * 0.2, m);
      break;
    }
    case 'bushy': { // fox brush with a white tip
      const tip = std(L.tip ?? L.fur);
      beads(t, T([[0, 0, 0], [0, -0.06, -0.12], [0, -0.1, -0.27], [0, -0.07, -0.4]]), 16,
        (u) => bodyR * (0.3 + Math.sin(Math.min(1, u * 1.1) * Math.PI * 0.9) * 0.5), (u) => (u > 0.8 ? tip : fur));
      break;
    }
    case 'long': { // cat: up in a question mark, ringed on a tabby
      const band = L.stripes ? std(L.stripes) : fur;
      beads(t, T([[0, 0, 0], [0, 0.0, -0.1], [0, 0.1, -0.2], [0, 0.24, -0.22], [0, 0.31, -0.15]]), 18,
        (u) => bodyR * (0.26 - u * 0.06), (u, i) => (i % 4 >= 2 && u > 0.15 ? band : fur));
      break;
    }
    case 'curl': { // pig: a little corkscrew
      const pts = [];
      for (let i = 0; i <= 12; i++) { const a = i * 0.75; pts.push([Math.cos(a) * 0.022 * sz, 0.012 * sz + Math.sin(a) * 0.022 * sz, -i * 0.006 * sz]); }
      beads(t, pts, 20, bodyR * 0.085, std(L.fur, glow));
      break;
    }
    case 'fin': { // axolotl: a long flat tail with a fin top and bottom
      beads(t, T([[0, 0, 0], [0, -0.02, -0.12], [0, 0, -0.24], [0, 0.03, -0.34]]), 13, (u) => bodyR * (0.8 - u * 0.62), fur, [0.6, 1, 1]);
      part(t, ball(0.5, 16), std(L.fin), 0, 0, -0.18 * sz, 0.012, bodyR * 2.3, 0.44 * sz);
      break;
    }
    case 'dragon': { // tapering, spined, with a spade on the end
      const sp = std(L.spines);
      const curve = beads(t, T([[0, 0, 0], [0, -0.05, -0.15], [0.02, -0.1, -0.3], [0.08, -0.12, -0.42], [0.16, -0.12, -0.5]]), 20,
        (u) => bodyR * (0.55 - u * 0.45), fur);
      for (let i = 1; i < 8; i++) {
        const u = i / 9, p = curve.getPoint(u);
        aim(part(t, spike(bodyR * 0.14 * (1 - u * 0.5), bodyR * 0.4 * (1 - u * 0.5), 4), sp, p.x, p.y + bodyR * (0.5 - u * 0.4), p.z), V(0, 1, -0.6));
      }
      const end = curve.getPoint(1), d = curve.getTangent(1);
      part(t, new THREE.OctahedronGeometry(1, 0), sp, end.x + d.x * bodyR * 0.3, end.y, end.z + d.z * bodyR * 0.3, bodyR * 0.35, bodyR * 0.07, bodyR * 0.45).rotation.y = Math.atan2(d.x, d.z);
      break;
    }
    case 'horse': { // long flowing strands
      const cols = (L.mane ?? [L.fur]).map((c) => std(c, glow));
      part(t, ball(bodyR * 0.24), fur);
      for (let i = 0; i < 9; i++) {
        const a = (i - 4) * 0.09;
        feather(t, [Math.sin(a) * bodyR * 0.2, -bodyR * 0.05, 0], V(Math.sin(a) * 0.6, -0.9, -0.55), (L.body[1] + 0.06) * 0.95, bodyR * 0.42, cols[i % cols.length], V(1, 0, 0), 0.5);
      }
      break;
    }
  }
}

function batWing(parent, s, size, bone, skin) {
  const P = (x, y, z) => V(s * x * size, y * size, z * size);
  const A = P(0, 0, 0.06), B = P(0, 0, -0.14), W = P(0.2, 0.2, -0.02), F1 = P(0.42, 0.14, -0.06), F2 = P(0.38, 0.0, -0.18), F3 = P(0.24, -0.04, -0.26);
  const dip = (a, b) => a.clone().lerp(b, 0.5).lerp(W, 0.22); // the scallops between the fingers
  sheet(parent, [A, W, F1, dip(F1, F2), F2, dip(F2, F3), F3, dip(F3, B), B], [[1, 2, 3], [1, 3, 4], [1, 4, 5], [1, 5, 6], [1, 6, 7], [1, 7, 8], [1, 8, 0]], skin);
  limb(parent, A, W, 0.018 * size, bone, 0.013 * size);
  for (const F of [F1, F2, F3]) limb(parent, W, F, 0.01 * size, bone, 0.004 * size);
  aim(part(parent, spike(0.01 * size, 0.04 * size), bone, W.x, W.y + 0.015 * size, W.z), V(0, 1, 0.3));
}

function featherWing(parent, s, size, main, tips) {
  const W = V(s * 0.2 * size, 0.2 * size, -0.04 * size);
  limb(parent, V(), W, 0.028 * size, main, 0.02 * size);
  for (let i = 0; i < 9; i++) {
    const u = i / 8, at = V().lerp(W, 0.25 + u * 0.75);
    feather(parent, at, V(s * (0.15 + u * 0.85), 0.05 * u, -1 + u * 0.7), (0.15 + u * 0.12) * size, 0.07 * size, i > 5 ? tips : main);
  }
  for (let i = 0; i < 5; i++) feather(parent, V().lerp(W, 0.2 + i * 0.18), V(s * 0.3, 0, -1), 0.1 * size, 0.07 * size, main); // coverts
}

/**
 * A four-legged animal from its LOOKS: a body with chest and haunches, jointed legs that swing from
 * the hip (hind legs bend back at the hock), a neck, a head with snout, eyes, ears, and a tail.
 */
function makeQuad(L, stage) {
  const g = new THREE.Group(), parts = { legs: [], ears: [] };
  const glow = L.glow ? { emissive: L.glow } : undefined;
  const fur = std(L.fur, glow), belly = std(L.belly ?? L.fur, glow), limbs = std(L.limbs ?? L.fur, glow);
  const socks = std(L.socks ?? L.limbs ?? L.fur, glow), muzzle = std(L.muzzle ?? L.belly ?? L.fur, glow);
  const [bodyR, bodyLen] = L.body, [legLen, legR] = L.legs, haunch = L.haunch ?? 1;
  const hipY = legLen + bodyR * 0.75, front = bodyLen / 2, back = -bodyLen / 2;

  // body: a capsule with a deeper chest, round haunches and a paler belly
  part(g, capsuleZ(bodyR, bodyLen), fur, 0, hipY, 0, 1, 0.95, 1);
  part(g, ball(bodyR * 1.08), fur, 0, hipY + bodyR * 0.05, front * 0.75, 1, 1.05, 0.9);
  part(g, ball(bodyR * 1.02 * haunch), fur, 0, hipY + bodyR * (haunch - 1) * 0.5, back * 0.8);
  part(g, capsuleZ(bodyR * 0.75, bodyLen * 0.8), belly, 0, hipY - bodyR * 0.35, 0, 1, 0.6, 1);
  if (L.bib) part(g, ball(bodyR * 0.75), std(L.bib, glow), 0, hipY - bodyR * 0.05, front + bodyR * 0.3, 0.9, 1.15, 0.6);
  if (L.shoulders) part(g, capsuleZ(bodyR * 1.05, bodyLen * 0.2), std(L.shoulders), 0, hipY, front * 0.5);
  if (L.stripes) for (let i = 0; i < 6; i++) { // tabby stripes over the back
    const st = part(g, dome(bodyR * 1.05, 0.38), std(L.stripes), 0, hipY, back * 0.85 + (i * (front * 0.55 - back * 0.85)) / 5, 1, 0.97, 0.13);
    st.rotation.x = (i % 2 ? 1 : -1) * 0.12;
  }
  if (L.curls) for (let i = 0; i < 46; i++) { // a curly coat
    const a = ((i * 2.399) % 4.4) - 2.2, along = back - bodyR * 0.3 + ((i * 0.618) % 1) * (bodyLen + bodyR * 0.9);
    part(g, ball(bodyR * 0.3, 8), std(L.curls), Math.sin(a) * bodyR * 0.9, hipY + Math.cos(a) * bodyR * 0.86, along);
  }
  if (L.bristles) for (let i = 0; i < 11; i++) { // a boar's ridge of bristles
    aim(part(g, spike(0.014, 0.08, 4), std(L.bristles), 0, hipY + bodyR * 0.92, front + bodyR * 0.3 - (i * (bodyLen + bodyR)) / 10), V(0, 1, -0.9));
  }
  if (L.spines) for (let i = 0; i < 6; i++) {
    aim(part(g, spike(0.03 * (1 - i * 0.08), 0.1 * (1 - i * 0.08), 4), std(L.spines), 0, hipY + bodyR * 0.92, front * 0.8 - (i * bodyLen) / 5), V(0, 1, -0.6));
  }
  if (L.plates) for (let i = 0; i < 5; i++) { // belly scales
    part(g, dome(bodyR * 0.99, 0.32), std(L.plates), 0, hipY - bodyR * 0.02, front * 0.75 - (i * bodyLen) / 4.5, 1, 0.97, 0.15).rotation.z = Math.PI;
  }
  if (L.fin) part(g, ball(0.5, 16), std(L.fin), 0, hipY + bodyR * 0.8, back * 0.3, 0.012, bodyR * 0.8, bodyLen * 0.9); // axolotl back fin

  // legs hang from pivots at shoulder and hip, so swinging them looks like walking
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const hind = z < 0, pivot = new THREE.Group(), py = hipY - bodyR * 0.3;
    pivot.position.set(x * bodyR * (L.splay ? 1.05 : 0.58), py, hind ? back * 0.8 : front * 0.72);
    if (L.splay) pivot.rotation.z = -x * 0.9;
    g.add(pivot);
    parts.legs.push(pivot);
    const D = L.splay ? legLen + bodyR * 0.3 : py - legR * 0.55;
    const r = legR * (hind ? 1.1 * haunch : 1.05);
    let foot;
    if (hind && L.hindFoot) { // rabbit: a big folded thigh and a long foot flat on the ground
      const knee = V(0, -D * 0.4, D * 0.35), heel = V(0, -D, -D * 0.3);
      limb(pivot, V(), knee, r * 1.6, limbs, r * 1.2);
      limb(pivot, knee, heel, r * 1.0, socks, legR * 0.85);
      part(pivot, capsuleZ(legR * 0.85, D * 0.8), socks, 0, -D, D * 0.15, 1, 0.7, 1);
      foot = null;
    } else if (hind) {
      const knee = V(0, -D * 0.38, D * 0.16), hock = V(0, -D * 0.72, -D * 0.12);
      foot = V(0, -D, -D * 0.02);
      limb(pivot, V(), knee, r * 1.35, limbs, r);
      limb(pivot, knee, hock, r * 0.9, socks, legR * 0.8);
      limb(pivot, hock, foot, legR * 0.8, socks, legR * 0.75);
    } else {
      const elbow = V(0, -D * 0.45, -D * 0.05);
      foot = V(0, -D, D * 0.04);
      limb(pivot, V(), elbow, r * 1.15, limbs, r * 0.9);
      limb(pivot, elbow, foot, r * 0.85, socks, legR * 0.75);
    }
    if (L.curls) for (let i = 0; i < 3; i++) part(pivot, ball(legR * 1.15, 8), std(L.curls), Math.sin(i * 2) * legR * 0.5, -D * (0.15 + i * 0.25), 0);
    if (foot) paw(pivot, L, foot, legR, socks);
  }

  // neck + head
  const [neckLen, tilt] = L.neck, hr = L.head;
  const neckBase = V(0, hipY + bodyR * 0.35, front + bodyR * 0.3);
  const headPos = neckBase.clone().add(V(0, Math.sin(tilt) * (neckLen + hr * 0.6), Math.cos(tilt) * (neckLen + hr * 0.4)));
  if (neckLen > 0.03) limb(g, neckBase, headPos.clone().add(V(0, -hr * 0.2, -hr * 0.3)), bodyR * 0.62, fur, hr * 0.7);
  const head = new THREE.Group();
  head.position.copy(headPos);
  head.rotation.x = L.headTilt ?? 0;
  g.add(head);
  parts.head = head;
  part(head, ball(hr, 18), fur, 0, 0, 0, L.headFlat ? 1.35 : 1, L.headFlat ? 0.75 : 1, L.headLong ?? 1);
  if (L.cheeks) for (const s of [-1, 1]) part(head, ball(hr * 0.42), muzzle, s * hr * 0.5, -hr * 0.32, hr * 0.38);
  if (L.stripes) for (const dx of [-1, 0, 1]) { // the tabby "M" on the forehead
    const st = part(head, ball(hr * 0.3, 8), std(L.stripes), dx * hr * 0.24, hr * 0.62, hr * 0.62, 0.16, 0.75, 0.4);
    st.rotation.set(-0.6, 0, -dx * 0.3);
  }
  if (L.curls) for (let i = 0; i < 12; i++) { // a fluffy top-knot and beard
    const a = (i / 12) * Math.PI * 2;
    part(head, ball(hr * 0.3, 8), std(L.curls), Math.cos(a) * hr * 0.68, hr * 0.42 + Math.sin(a * 2) * hr * 0.14, Math.sin(a) * hr * 0.55 - hr * 0.08);
  }

  // snout + nose
  const [snLen, snR, snKind] = L.snout;
  let tip = null;
  if (snKind === 'round') { // dogs, cats, rabbits, pandas: a muzzle with whisker pads and a chin
    const zc = hr * 0.62 + snLen * 0.5, front = zc + snLen * 0.5;
    part(head, capsuleZ(snR, snLen), muzzle, 0, -hr * 0.3, zc, 1, 0.85, 1);
    for (const s of [-1, 1]) part(head, ball(snR * 0.62, 10), muzzle, s * snR * 0.45, -hr * 0.36, front + snR * 0.15);
    part(head, ball(snR * 0.55, 10), muzzle, 0, -hr * 0.3 - snR * 0.55, zc + snLen * 0.3);
    tip = V(0, -hr * 0.3 + snR * 0.45, front + snR * 0.72);
  } else if (snKind === 'pointy') { // fox: long and narrow, with a pale lower jaw
    const len = snLen + hr * 0.5, zc = hr * 0.6 + len * 0.45;
    part(head, new THREE.ConeGeometry(snR, len, 12), fur, 0, -hr * 0.22, zc, 1, 1, 0.8).rotation.x = Math.PI / 2;
    part(head, ball(snR * 0.85, 10), muzzle, 0, -hr * 0.4, hr * 0.55 + len * 0.2, 0.9, 0.55, 1.6);
    tip = V(0, -hr * 0.22, zc + len * 0.5 - snR * 0.15);
  } else if (snKind === 'flat') { // pig: a round snout disc with two nostrils
    part(head, new THREE.CylinderGeometry(snR, snR * 1.08, snLen + 0.03, 16), std(L.snoutColor ?? L.belly, glow), 0, -hr * 0.2, hr * 0.85 + snLen * 0.3).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) part(head, ball(snR * 0.22, 8), std(0x5a2a34), s * snR * 0.36, -hr * 0.2, hr * 0.85 + snLen * 0.8 + 0.015, 0.8, 1.2, 0.4);
  } else if (snKind === 'long') { // horse / dragon face, with nostrils at the end
    const zc = hr * 0.55 + snLen * 0.5;
    part(head, capsuleZ(snR, snLen), muzzle, 0, -hr * 0.28, zc, 1, 0.9, 1);
    part(head, ball(snR * 1.12, 12), muzzle, 0, -hr * 0.3, zc + snLen * 0.5, 1, 0.95, 0.9);
    for (const s of [-1, 1]) part(head, ball(snR * 0.25, 8), std(L.nostril ?? 0x3a2a2a), s * snR * 0.5, -hr * 0.18, zc + snLen * 0.5 + snR * 0.85, 0.8, 1, 0.5);
  }
  if (L.nose && tip) {
    if (L.noseShape === 'tri') part(head, new THREE.ConeGeometry(snR * 0.4, snR * 0.36, 3), std(L.nose), tip.x, tip.y, tip.z, 1, 1, 0.6).rotation.x = Math.PI;
    else part(head, ball(Math.max(0.018, snR * 0.36), 10), std(L.nose, { roughness: 0.25 }), tip.x, tip.y, tip.z, 1.3, 0.85, 0.85);
  }
  if (L.mouth && tip) for (const s of [-1, 1]) { // the little "w" under the nose
    part(head, new THREE.TorusGeometry(snR * 0.28, 0.0045, 4, 10, Math.PI), std(0x3a2420), s * snR * 0.28, tip.y - snR * 0.62, tip.z - snR * 0.3).rotation.z = Math.PI;
  }
  if (L.tongue && tip) part(head, ball(snR * 0.34, 8), std(0xff7a8a), 0, tip.y - snR * 1.0, tip.z - snR * 0.25, 0.95, 0.35, 1.1);
  if (L.whiskers && tip) whiskers(head, V(snR * 0.55, tip.y - snR * 0.45, tip.z - snR * 0.45), hr * 0.95, L.whiskers);
  if (L.tusks) for (const s of [-1, 1]) aim(part(head, spike(snR * 0.15, snR * 0.9), std(L.tusks), s * snR * 0.8, -hr * 0.3, hr * 0.8 + snLen * 0.4), V(s * 0.4, 1, 0.3));
  if (L.smile) {
    const m = part(head, new THREE.TorusGeometry(hr * 0.98, 0.006, 4, 24, Math.PI * 0.7).rotateZ(Math.PI * 0.15), std(L.smile), 0, -hr * 0.18, 0, 1.35, 1, 1);
    m.rotation.x = Math.PI / 2;
  }

  // eyes (in dark patches for a panda)
  const eo = L.eye ?? {};
  if (L.patches) for (const s of [-1, 1]) part(head, ball(hr * 0.3, 10), std(L.patches), s * hr * 0.4, hr * 0.06, hr * 0.8, 0.85, 1.3, 0.55).rotation.z = s * 0.7;
  eyes(head, hr * (eo.y ?? 0.18), hr * (eo.z ?? 0.78), hr * (eo.spread ?? 0.42), hr * (eo.size ?? 0.2), eo);

  // ears, on pivots so they can twitch
  const earMat = std(L.earColor ?? L.fur, glow), inner = L.earInner && std(L.earInner), k = L.earSize ?? 1;
  for (const s of [-1, 1]) {
    const ear = new THREE.Group();
    head.add(ear);
    parts.ears.push(ear);
    if (L.ears === 'floppy') { // a soft hanging ear, curly on a Maltipoo
      ear.position.set(s * hr * 0.78, hr * 0.35, -hr * 0.05);
      ear.rotation.z = s * 0.25;
      part(ear, ball(hr * 0.42), earMat, 0, -hr * 0.45, 0, 0.42, 1.2, 0.8);
      if (L.curls) for (let i = 0; i < 7; i++) part(ear, ball(hr * 0.17, 8), earMat, s * hr * 0.1, -hr * (0.1 + i * 0.13), Math.sin(i * 2.1) * hr * 0.18);
    } else if (L.ears === 'flop') { // pig: a triangle folding forward
      ear.position.set(s * hr * 0.5, hr * 0.72, hr * 0.05);
      ear.rotation.set(0.95, 0, -s * 0.5);
      part(ear, new THREE.ConeGeometry(hr * 0.36 * k, hr * 0.7 * k, 12), earMat, 0, hr * 0.32 * k, 0, 1, 1, 0.3);
      if (inner) part(ear, new THREE.ConeGeometry(hr * 0.24 * k, hr * 0.5 * k, 12), inner, 0, hr * 0.26 * k, hr * 0.035, 1, 1, 0.2);
    } else if (L.ears === 'long') { // rabbit
      const len = hr * 1.75 * k;
      ear.position.set(s * hr * 0.32, hr * 0.78, -hr * 0.15);
      ear.rotation.set(-0.22, 0, -s * 0.2);
      part(ear, ball(0.5, 12), earMat, 0, len * 0.5, 0, hr * 0.42, len, hr * 0.16);
      if (inner) part(ear, ball(0.5, 12), inner, 0, len * 0.5, hr * 0.06, hr * 0.26, len * 0.86, hr * 0.08);
      if (L.earTip) part(ear, ball(0.5, 10), std(L.earTip), 0, len * 0.9, 0, hr * 0.3, len * 0.22, hr * 0.18);
    } else if (L.ears === 'pointy' || L.ears === 'tall' || L.ears === 'horse') {
      const horse = L.ears === 'horse';
      const h = hr * (L.ears === 'tall' ? 1.0 : horse ? 0.75 : 0.68) * k, w = hr * (horse ? 0.2 : 0.34) * k;
      ear.position.set(s * hr * (horse ? 0.38 : 0.52), hr * 0.72, -hr * 0.05);
      ear.rotation.set(horse ? 0.15 : -0.05, 0, -s * (horse ? 0.15 : 0.32));
      part(ear, new THREE.ConeGeometry(w, h, 12), earMat, 0, h * 0.5, 0, 1, 1, 0.45);
      if (inner) part(ear, new THREE.ConeGeometry(w * 0.62, h * 0.7, 12), inner, 0, h * 0.4, w * 0.32, 1, 1, 0.3);
      if (L.earTip) part(ear, new THREE.ConeGeometry(w * 0.45, h * 0.4, 12), std(L.earTip), 0, h * 0.82, 0, 1, 1, 0.5);
    } else if (L.ears === 'round') {
      ear.position.set(s * hr * 0.66, hr * 0.7, -hr * 0.05);
      ear.rotation.z = -s * 0.4;
      part(ear, ball(hr * 0.3 * k), earMat, 0, hr * 0.1, 0, 1, 1, 0.5);
      if (inner) part(ear, ball(hr * 0.19 * k), inner, 0, hr * 0.1, hr * 0.06, 1, 1, 0.3);
    }
  }

  if (L.gills) { // axolotl: three feathery gill stalks each side
    const gm = std(L.gills, glow);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const base = V(s * hr * 1.15, hr * (0.3 - i * 0.28), -hr * 0.3), dir = V(s * 0.55, 0.75 - i * 0.55, -0.55).normalize();
      const end = base.clone().addScaledVector(dir, hr * (1.05 - i * 0.12));
      limb(head, base, end, hr * 0.07, gm, hr * 0.05);
      for (let j = 1; j <= 5; j++) {
        const p = base.clone().lerp(end, j / 6);
        for (const f of [-1, 1]) part(head, ball(hr * 0.05, 6), gm, p.x, p.y + f * hr * 0.08, p.z + hr * 0.03, 1, 1.7, 1);
      }
    }
  }
  if (L.horns) for (const s of [-1, 1]) { // swept back, longer on an elder
    const n = L.hornLen ?? 1;
    beads(head, [[s * hr * 0.35, hr * 0.62, -hr * 0.25], [s * hr * 0.5, hr * 0.95, -hr * (0.55 + 0.1 * n)], [s * hr * 0.55, hr * (1.0 + 0.1 * n), -hr * (0.9 + 0.4 * n)]],
      8 + Math.round(n * 3), (u) => hr * (0.19 - u * 0.14), std(L.horns));
  }
  if (L.horn && stage >= 1) { // the unicorn's spiral horn
    const horn = new THREE.Group(), hm = std(L.horn, { emissive: 0x664400, metalness: 0.3, roughness: 0.3 }), H = hr * 2.1;
    horn.position.set(0, hr * 0.8, hr * 0.35);
    horn.rotation.x = 0.45;
    head.add(horn);
    part(horn, new THREE.ConeGeometry(hr * 0.2, H, 12), hm, 0, H / 2, 0);
    for (let i = 0; i < 24; i++) {
      const u = i / 24, a = i * 0.9;
      part(horn, ball(hr * 0.05 * (1 - u) + 0.004, 6), hm, Math.cos(a) * hr * 0.19 * (1 - u), u * H, Math.sin(a) * hr * 0.19 * (1 - u));
    }
  }
  if (L.mane) { // strands falling down one side of the neck, and a forelock
    const cols = L.mane.map((c) => std(c, glow)), n = L.shaggy ? 12 : 9;
    for (let i = 0; i < n; i++) {
      const p = neckBase.clone().lerp(headPos, 0.05 + (i / (n - 1)) * 0.8);
      p.y += bodyR * 0.62;
      p.z -= bodyR * 0.35;
      part(g, ball(bodyR * 0.3, 8), cols[i % cols.length], p.x, p.y, p.z, 0.8, 1, 1.2);
      feather(g, p.clone().add(V(bodyR * 0.3, 0, 0)), V(0.7, -1, -0.25), bodyR * (L.shaggy ? 1.2 : 0.95), bodyR * 0.55, cols[i % cols.length], V(1, 0.5, 0), 0.35);
    }
    for (let i = 0; i < 2; i++) feather(head, [0, hr * 0.85, hr * (0.05 - i * 0.2)], V((i - 0.5) * 0.4, -0.35, 1), hr * 0.9, hr * 0.4, cols[i], V(0, 1, 0.4), 0.35);
  }

  // tail(s), from the rump
  const tail = new THREE.Group();
  tail.position.set(0, hipY + bodyR * 0.35, back - bodyR * 0.85);
  g.add(tail);
  parts.tail = tail;
  const n = L.tails ?? 1, sz = bodyLen / 0.3; // tail shapes are drawn for a 0.3-long body
  for (let i = 0; i < n; i++) {
    let holder = tail;
    if (n > 1) { // a fan of tails (the Nine-Tail Fox)
      holder = new THREE.Group();
      holder.rotation.set(0.55, (i - (n - 1) / 2) * 0.26, 0);
      tail.add(holder);
    }
    buildTail(holder, L, bodyR, sz, fur, glow);
  }

  if (L.wings) {
    parts.wings = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * bodyR * 0.55, hipY + bodyR * 0.75, front * 0.35);
      g.add(pivot);
      parts.wings.push(pivot);
      if (L.wings === 'bat') batWing(pivot, s, (L.wingSize ?? 1) * (bodyLen / 0.3), std(L.wingColor), std(L.membrane, { side: THREE.DoubleSide }));
      else featherWing(pivot, s, (bodyLen / 0.3) * 1.1, std(L.wingColor, glow), std(L.wingTips ?? L.wingColor, glow));
    }
  }
  return { body: g, parts, headTop: [0, headPos.y + hr, headPos.z], hop: L.hop };
}

// ------------------------------------------------------------------ birds

/** A bird from its LOOKS: an egg-shaped body, head (on an S-neck for a swan), beak, folded wings, tail and feet. */
function makeBird(L) {
  const g = new THREE.Group(), parts = { legs: [], wings: [] };
  const glow = L.glow ? { emissive: L.glow } : undefined;
  const fur = std(L.fur, glow), belly = std(L.belly ?? L.fur, glow), wingMat = std(L.wingColor ?? L.fur, glow);
  const R = L.R, [sx, sy, sz] = L.shape3 ?? [1, 1, 1], legH = L.legH ?? 0.05;
  const c = V(0, legH + R * sy * 0.92, 0);
  part(g, ball(R, 20), fur, c.x, c.y, c.z, sx, sy, sz);
  // the paler front, and a point on it for markings
  const bc = V(0, c.y - R * sy * 0.06, R * sz * 0.34), br = [R * 0.9 * sx * 0.9, R * 0.9 * sy * 0.92, R * 0.9 * sz * 0.78];
  part(g, ball(R * 0.9, 20), belly, bc.x, bc.y, bc.z, sx * 0.9, sy * 0.92, sz * 0.78);
  const onFront = (x, y) => bc.z + br[2] * Math.sqrt(Math.max(0, 1 - (x / br[0]) ** 2 - ((y - bc.y) / br[1]) ** 2));
  if (L.breast) part(g, ball(R * 0.62, 14), std(L.breast), 0, c.y + R * sy * 0.22, R * sz * 0.5, sx * 0.95, 0.9, 0.8);
  if (L.chestWash) part(g, ball(R * 0.55, 14), std(L.chestWash), 0, c.y + R * sy * 0.4, onFront(0, c.y + R * sy * 0.4) - R * 0.38, 1, 0.8, 0.75);
  if (L.bib) part(g, ball(R * 0.3, 12), std(L.bib), 0, c.y + R * sy * 0.6, onFront(0, c.y + R * sy * 0.6) - R * 0.22, 1.3, 0.7, 0.8);
  if (L.spots) for (let i = 0; i < 11; i++) { // chest bars / streaks
    const row = Math.floor(i / 3), x = ((i % 3) - 1) * R * 0.3 + (row % 2) * R * 0.12, y = c.y + R * sy * (0.25 - row * 0.25);
    part(g, ball(R * 0.07, 6), std(L.spots), x, y, onFront(x, y), 1.6, 0.5, 0.45);
  }
  if (L.fluffy) for (let i = 0; i < 3; i++) { // a fuzzy tuft of down for a tail
    feather(g, [0, c.y, -R * sz * 0.85], V((i - 1) * 0.5, 0.4, -1), R * 0.35, R * 0.22, fur, UP, 0.5);
  }

  // neck + head
  const [hr, hUp, hFwd] = L.head;
  const neckMat = L.neckColor ? std(L.neckColor, { metalness: 0.35, roughness: 0.35 }) : fur;
  let hp, collarAt = null, neckDir = UP;
  if (L.neckPts) { // a swan's S-curved neck
    const pts = L.neckPts.map(([x, y, z]) => V(x * R, c.y + y * R, z * R));
    beads(g, pts, 40, (u) => R * (0.3 - u * 0.1), neckMat);
    hp = pts.at(-1).clone().add(V(0, hr * 0.3, hr * 0.4));
  } else {
    hp = V(0, c.y + R * sy * hUp, R * sz * hFwd);
    const base = V(0, c.y + R * sy * 0.55, R * sz * 0.45);
    if (hp.distanceTo(base) > hr * 0.6) {
      limb(g, base, hp, hr * 0.72, neckMat, hr * 0.7);
      collarAt = base.clone().lerp(hp, 0.3);
      neckDir = V().subVectors(hp, base);
    }
  }
  if (L.collar && collarAt) aim(part(g, new THREE.TorusGeometry(hr * 0.74, hr * 0.1, 6, 18), std(L.collar), collarAt.x, collarAt.y, collarAt.z), neckDir);
  const head = new THREE.Group();
  head.position.copy(hp);
  g.add(head);
  parts.head = head;
  part(head, ball(hr, 18), L.headColor ? std(L.headColor, L.headShine ? { metalness: 0.35, roughness: 0.35 } : glow) : fur, 0, 0, 0, 1, 1, 1.05);
  if (L.mask) part(head, ball(hr * 0.8, 14), std(L.mask), 0, -hr * 0.15, hr * 0.42, 1.05, 0.85, 0.65); // emperor chick's white face
  if (L.brow) for (const s of [-1, 1]) part(head, ball(hr * 0.24, 10), std(L.brow), s * hr * 0.45, hr * 0.48, hr * 0.5, 1.4, 0.55, 0.6); // gentoo's white patch
  if (L.earPatch) for (const s of [-1, 1]) part(head, ball(hr * 0.42, 12), std(L.earPatch), s * hr * 0.75, -hr * 0.42, -hr * 0.05, 0.42, 1.15, 0.85);
  if (L.disc) { // owl facial disc with a dark rim
    part(head, ball(hr * 0.88, 18), std(L.disc), 0, -hr * 0.05, hr * 0.5, 1.15, 1.0, 0.45);
    if (L.discRim) part(head, new THREE.TorusGeometry(hr * 0.86, hr * 0.06, 6, 28), std(L.discRim), 0, -hr * 0.05, hr * 0.55, 1.15, 1, 1);
  }
  const eo = L.eye ?? {};
  eyes(head, hr * (eo.y ?? 0.15), hr * (eo.z ?? 0.62), hr * (eo.spread ?? 0.7), hr * (eo.size ?? 0.17), { side: 0.9, ...eo });

  // beak
  const bm = std(L.beakColor ?? 0xffa030, glow), bz = hr * 0.97;
  if (L.beak === 'bill') { // flat duck bill with nostrils and a nail at the tip
    part(head, ball(0.5, 14), bm, 0, -hr * 0.22, bz + hr * 0.42, hr * 0.62, hr * 0.2, hr * 1.0);
    part(head, ball(0.5, 12), bm, 0, -hr * 0.32, bz + hr * 0.35, hr * 0.55, hr * 0.14, hr * 0.85);
    part(head, ball(hr * 0.09, 8), std(L.nail ?? 0x6a4a2a), 0, -hr * 0.2, bz + hr * 0.88, 1.4, 0.6, 0.8);
    for (const s of [-1, 1]) part(head, ball(hr * 0.035, 6), PUPIL, s * hr * 0.1, -hr * 0.13, bz + hr * 0.25);
    if (L.knob) part(head, ball(hr * 0.17, 10), std(L.knob), 0, -hr * 0.08, bz + hr * 0.02, 1, 1, 1.2);
  } else if (L.beak === 'hook') { // owl: short and hooked down
    aim(part(head, spike(hr * 0.14, hr * 0.38, 8), bm, 0, -hr * 0.18, bz + hr * 0.05), V(0, -0.7, 1));
  } else if (L.beak === 'dagger') { // penguin: long and pointed
    aim(part(head, spike(hr * 0.17, hr * 0.95, 10), bm, 0, -hr * 0.12, bz + hr * 0.38, 1, 0.8, 1), V(0, -0.15, 1));
    if (L.beakStripe) part(head, ball(0.5, 10), std(L.beakStripe), 0, -hr * 0.2, bz + hr * 0.3, hr * 0.22, hr * 0.07, hr * 0.62);
  } else {
    part(head, spike(hr * 0.24, hr * 0.5, 10), bm, 0, -hr * 0.1, bz + hr * 0.18);
  }
  if (L.comb) { // hen: red comb on top, wattles under the beak
    const m = std(L.comb);
    for (let i = 0; i < 4; i++) part(head, ball(hr * (0.22 - Math.abs(i - 1.2) * 0.03), 8), m, 0, hr * (0.92 + Math.sin(i * 1.3) * 0.03), hr * (0.45 - i * 0.28), 0.45, 1.1, 0.9);
    for (const s of [-1, 1]) part(head, ball(hr * 0.17, 8), m, s * hr * 0.08, -hr * 0.55, bz - hr * 0.05, 0.6, 1.4, 0.8);
  }
  if (L.crest) for (let i = 0; i < 5; i++) feather(head, [0, hr * 0.75, -hr * 0.1], V((i - 2) * 0.12, 0.9 - Math.abs(i - 2) * 0.15, -0.8), hr * (1.4 - Math.abs(i - 2) * 0.2), hr * 0.3, std(L.crest, { emissive: 0x553300 }), V(1, 0, 0));
  if (L.tufts) for (const s of [-1, 1]) feather(head, [s * hr * 0.5, hr * 0.72, hr * 0.15], V(s * 0.35, 1, -0.15), hr * 0.65, hr * 0.32, fur, V(0, 0, 1), 0.3);
  if (L.fluffy) for (let i = 0; i < 3; i++) feather(head, [0, hr * 0.85, -hr * 0.1], V((i - 1) * 0.5, 1, -0.3), hr * 0.45, hr * 0.2, L.headColor ? std(L.headColor) : fur, V(0, 0, 1), 0.4);

  // folded wings (flippers on a penguin)
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(), wl = R * (L.wingLen ?? 1);
    pivot.position.set(s * R * sx * 0.88, c.y + R * sy * 0.3, R * sz * 0.1);
    g.add(pivot);
    parts.wings.push(pivot);
    if (L.flippers) {
      part(pivot, ball(0.5, 12), wingMat, s * R * 0.07, -wl * 0.45, -R * 0.05, R * 0.14, wl * 0.95, R * 0.34).rotation.z = s * 0.18;
      continue;
    }
    part(pivot, ball(0.5, 14), wingMat, s * R * 0.08, -R * 0.22, -R * 0.2, R * 0.22, R * 0.75, wl * 1.25).rotation.x = 0.35;
    for (let i = 0; i < 3; i++) { // the long flight feathers crossing over the tail
      feather(pivot, [s * R * 0.1, -R * (0.38 + i * 0.05), -R * 0.5], V(s * 0.05, -0.3 - i * 0.12, -1), wl * (0.62 - i * 0.08), R * 0.2, L.primaries ? std(L.primaries, glow) : wingMat, V(s, 0, 0));
    }
    if (L.speculum) part(pivot, ball(0.5, 10), std(L.speculum, { metalness: 0.4, roughness: 0.3 }), s * R * 0.19, -R * 0.3, -R * 0.35, R * 0.04, R * 0.18, R * 0.38);
  }

  // tail
  const tz = -R * sz * 0.88, ty = c.y + R * sy * 0.1;
  if (L.tail === 'fan') { // hen: an upright fan
    for (let i = 0; i < 7; i++) {
      const a = (i - 3) * 0.16;
      feather(g, [0, ty, tz], V(Math.sin(a), 1.1, -0.7), R * 1.0, R * 0.38, std(L.tailColor ?? L.fur, { metalness: 0.2, roughness: 0.4 }), V(Math.cos(a), 0, Math.sin(a)));
    }
  } else if (L.tail === 'perky') { // duck: a short tail tipped up (a drake has a black curl)
    feather(g, [0, ty, tz + R * 0.1], V(0, 0.6, -1), R * 0.5, R * 0.42, std(L.tailColor ?? L.fur), UP, 0.3);
    if (L.curl) part(g, new THREE.TorusGeometry(R * 0.07, R * 0.025, 6, 12, Math.PI * 1.5), std(L.curl), 0, ty + R * 0.3, tz - R * 0.15).rotation.y = Math.PI / 2;
  } else if (L.tail === 'plume') { // phoenix: long trailing feathers
    const cols = L.tailColors.map((col) => std(col, { emissive: col, emissiveIntensity: 0.35 }));
    for (let i = 0; i < 5; i++) feather(g, [0, ty, tz], V((i - 2) * 0.25, 0.25 - Math.abs(i - 2) * 0.15, -1), R * (2.0 - Math.abs(i - 2) * 0.3), R * 0.32, cols[i % cols.length]);
  } else if (L.tail === 'wedge') {
    feather(g, [0, ty - R * 0.25, tz + R * 0.1], V(0, -0.5, -1), R * 0.5, R * 0.5, std(L.tailColor ?? L.wingColor ?? L.fur), UP, 0.3);
  }

  // legs + feet
  const lm = std(L.legColor ?? 0xff9a2a);
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(), hy = legH + R * 0.25;
    pivot.position.set(s * R * sx * 0.38, hy, R * sz * 0.05);
    g.add(pivot);
    parts.legs.push(pivot);
    const foot = V(0, -hy + R * 0.04, 0);
    if (L.feet === 'talons') limb(pivot, V(), foot.clone().add(V(0, R * 0.08, 0)), R * 0.13, fur, R * 0.1); // feathered owl legs
    else limb(pivot, V(0, -R * 0.1, 0), foot, R * 0.055, lm, R * 0.05);
    if (L.feet === 'webbed') {
      part(pivot, ball(0.5, 10), lm, 0, foot.y - R * 0.02, R * 0.17, R * 0.55, R * 0.05, R * 0.42);
      for (const a of [-0.5, 0, 0.5]) limb(pivot, foot, foot.clone().add(V(Math.sin(a) * R * 0.34, -R * 0.02, Math.cos(a) * R * 0.34)), R * 0.035, lm, R * 0.025);
    } else {
      for (const a of [-0.55, 0, 0.55, Math.PI]) { // three toes forward, one back
        const len = R * (a === Math.PI ? 0.18 : 0.3), d = V(Math.sin(a), -0.08, Math.cos(a)), end = foot.clone().addScaledVector(d, len);
        limb(pivot, foot, end, R * 0.03, lm, R * 0.024);
        if (L.feet === 'talons') aim(part(pivot, spike(R * 0.03, R * 0.1, 5), std(0x2a2420), end.x, end.y, end.z), V(d.x, -0.6, d.z));
      }
    }
  }
  return { body: g, parts, headTop: [0, hp.y + hr, hp.z] };
}

// ------------------------------------------------------------------ small critters, by hand

const BUILDERS = {
  frog(L) {
    const g = new THREE.Group(), skin = std(L.fur), pale = std(L.belly), dark = std(L.spots), parts = { legs: [] };
    part(g, ball(0.3, 22), skin, 0, 0.23, -0.02, 1.12, 0.7, 1.08);
    part(g, ball(0.25, 18), pale, 0, 0.17, 0.05, 1.0, 0.55, 0.95);
    part(g, ball(0.15, 14), std(L.throat ?? L.belly), 0, 0.17, 0.19, 1.35, 0.55, 0.9);
    const mouth = part(g, new THREE.TorusGeometry(0.3, 0.007, 4, 28, Math.PI * 0.7).rotateZ(Math.PI * 0.15), std(0x2f4a22), 0, 0.225, 0, 1.1, 1, 1);
    mouth.rotation.x = Math.PI / 2;
    for (let i = 0; i < 10; i++) { // dark spots on the back
      const a = i * 2.399, r = 0.05 + (i % 4) * 0.05, x = Math.cos(a) * r, z = -0.06 + Math.sin(a) * r * 0.9;
      const y = 0.23 + 0.21 * Math.sqrt(Math.max(0, 1 - (x / 0.336) ** 2 - ((z + 0.02) / 0.324) ** 2));
      part(g, ball(0.03 + (i % 3) * 0.012, 8), dark, x, y, z, 1, 0.25, 1);
    }
    for (const s of [-1, 1]) {
      part(g, ball(0.1, 14), skin, s * 0.15, 0.4, 0.13);                    // eye bulges on top of the head
      part(g, ball(0.05, 10), dark, s * 0.298, 0.32, 0.03, 0.3, 1, 1);       // eardrum
      part(g, ball(0.012, 6), PUPIL, s * 0.045, 0.335, 0.29);                // nostril
      // front legs with four splayed fingers
      const hand = V(s * 0.21, 0.025, 0.27);
      limb(g, V(s * 0.17, 0.15, 0.17), hand, 0.045, skin, 0.03);
      for (const a of [-0.9, -0.3, 0.3, 0.9]) {
        const end = hand.clone().add(V(Math.sin(a + s * 0.3) * 0.06, -0.015, Math.cos(a + s * 0.3) * 0.06));
        limb(g, hand, end, 0.012, skin, 0.01);
        part(g, ball(0.017, 6), pale, end.x, end.y, end.z);
      }
      // folded back legs: thigh forward, shin back, long webbed foot forward
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.24, 0.16, -0.12);
      g.add(pivot);
      parts.legs.push(pivot);
      const knee = V(s * 0.1, -0.02, 0.14), ankle = V(s * 0.05, -0.1, -0.1), toes = V(s * 0.06, -0.14, 0.1);
      limb(pivot, V(), knee, 0.085, skin, 0.06);
      limb(pivot, knee, ankle, 0.055, skin, 0.035);
      limb(pivot, ankle, toes, 0.035, skin, 0.025);
      part(pivot, ball(0.5, 10), std(L.web ?? L.fur), toes.x, toes.y, toes.z + 0.045, 0.12, 0.008, 0.08);
      for (const a of [-0.6, -0.3, 0, 0.3, 0.6]) {
        const end = toes.clone().add(V(Math.sin(a) * 0.08 + s * 0.015, -0.005, Math.cos(a) * 0.08));
        limb(pivot, toes, end, 0.012, skin, 0.01);
        part(pivot, ball(0.016, 6), pale, end.x, end.y, end.z);
      }
    }
    eyes(g, 0.43, 0.18, 0.165, 0.075, { iris: L.iris, pupil: 'bar', side: 0.5 });
    return { body: g, parts, headTop: [0, 0.5, 0.13] };
  },

  turtle(L) {
    const g = new THREE.Group(), skin = std(L.fur), parts = { legs: [] };
    const R = 0.34, S = [1, L.dome ?? 0.72, 1.18], cy = 0.12, k = L.legs ?? 1;
    part(g, new THREE.SphereGeometry(R, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(L.shell), 0, cy, 0, ...S);
    part(g, new THREE.CylinderGeometry(R * 0.97, R * 0.9, 0.05, 28), std(L.belly), 0, cy - 0.015, 0, 1, 1, S[2]); // plastron
    const plate = std(L.plates), ring = std(L.rings);
    /** A six-sided scute lying on the dome: theta from the top, phi around (0 = front). */
    const scute = (theta, phi, size, mat, inner) => {
      const u = V(Math.sin(theta) * Math.sin(phi), Math.cos(theta), Math.sin(theta) * Math.cos(phi));
      const n = V(u.x / S[0], u.y / S[1], u.z / S[2]).normalize();
      const p = V(u.x * R * S[0], cy + u.y * R * S[1], u.z * R * S[2]);
      const m = part(g, new THREE.CylinderGeometry(size, size * 0.9, 0.026, 6), mat, p.x, p.y, p.z, 1, 1, 1.15);
      m.quaternion.setFromUnitVectors(UP, n);
      if (inner) {
        const r2 = part(g, new THREE.CylinderGeometry(size * 0.5, size * 0.45, 0.032, 6), inner, p.x, p.y, p.z, 1, 1, 1.15);
        r2.quaternion.copy(m.quaternion);
      }
    };
    for (const t of [-0.9, -0.45, 0, 0.45, 0.9]) scute(Math.abs(t), t < 0 ? Math.PI : 0, 0.085, plate, ring); // along the spine
    for (const s of [-1, 1]) for (const a of [0.55, 1.2, 1.9, 2.55]) scute(0.98, s * a, 0.08, plate, ring);   // the sides
    for (let i = 0; i < 24; i++) scute(1.42, (i / 24) * Math.PI * 2, 0.042, plate);                           // the rim
    // head on a neck that pokes in and out
    const head = new THREE.Group();
    head.position.set(0, 0.2, R * S[2] + 0.08);
    head.userData.z0 = head.position.z;
    g.add(head);
    parts.head = head;
    limb(head, V(0, -0.07, -0.17), V(0, -0.015, -0.03), 0.06, skin, 0.055);
    part(head, ball(0.085, 16), skin, 0, 0, 0, 0.95, 0.85, 1.2);
    aim(part(head, spike(0.03, 0.05, 8), std(0x4a4030), 0, -0.03, 0.095), V(0, -0.6, 1)); // horny beak
    if (L.skinSpots) for (let i = 0; i < 8; i++) {
      const a = i * 2.2, y = Math.sin(i * 1.7) * 0.04;
      part(head, ball(0.012, 6), std(L.skinSpots), Math.cos(a) * 0.075, y, Math.sin(a) * 0.06 - 0.02, 1, 1, 1);
    }
    eyes(head, 0.02, 0.05, 0.056, 0.022, { iris: L.iris, pupil: 'round', side: 0.75 });
    // stumpy legs with claws, and a little pointed tail
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const leg = new THREE.Group();
      leg.position.set(x * 0.25, 0.08, z * 0.25);
      leg.userData.y0 = leg.position.y;
      g.add(leg);
      parts.legs.push(leg);
      part(leg, new THREE.CylinderGeometry(0.05 * k, 0.06 * k, 0.12, 10), skin, x * 0.03, -0.01, z * 0.03, 1, 1, z > 0 ? 1.3 : 1).rotation.z = -x * 0.5;
      part(leg, ball(0.06 * k, 10), skin, x * 0.06, -0.06, z * 0.05, 1, 0.5, 1.2);
      for (const a of [-0.4, 0, 0.4]) {
        const d = V(x * 0.4 + Math.sin(a), -0.3, z > 0 ? Math.cos(a) : -Math.cos(a) * 0.4).normalize();
        aim(part(leg, spike(0.012, 0.04, 5), std(0x3a3020), x * 0.06 + d.x * 0.065 * k, -0.065, z * 0.05 + d.z * 0.065 * k), d);
      }
    }
    aim(part(g, spike(0.035, 0.12, 8), skin, 0, 0.09, -R * S[2] - 0.03), V(0, -0.3, -1));
    return { body: g, parts, headTop: [0, 0.28, R * S[2] + 0.08] };
  },

  mouse(L) {
    const g = new THREE.Group(), fur = std(L.fur), pale = std(L.belly), pink = std(0xffa8b8), parts = { legs: [] };
    part(g, ball(0.15, 18), fur, 0, 0.15, -0.02, 0.95, 0.85, 1.35);
    part(g, ball(0.12, 14), pale, 0, 0.11, 0.02, 0.9, 0.65, 1.2);
    const head = new THREE.Group();
    head.position.set(0, 0.19, 0.17);
    g.add(head);
    parts.head = head;
    part(head, ball(0.1, 16), fur, 0, 0, 0, 0.95, 0.9, 1.1);
    part(head, new THREE.ConeGeometry(0.075, 0.16, 14), fur, 0, -0.025, 0.11).rotation.x = Math.PI / 2;
    part(head, ball(0.05, 10), pale, 0, -0.05, 0.08, 1, 0.6, 1.4);
    part(head, ball(0.02, 8), pink, 0, -0.025, 0.195);
    whiskers(head, V(0.03, -0.03, 0.16), 0.12, 0x5a5050);
    for (const s of [-1, 1]) { // big round ears, pink inside
      const ear = new THREE.Group();
      ear.position.set(s * 0.07, 0.085, -0.02);
      ear.rotation.set(-0.15, s * 0.35, -s * 0.35);
      head.add(ear);
      part(ear, ball(0.075, 14), fur, 0, 0.04, 0, 1, 1, 0.25);
      part(ear, ball(0.056, 12), pink, 0, 0.04, 0.012, 1, 1, 0.2);
    }
    eyes(head, 0.025, 0.065, 0.055, 0.026, { side: 0.6 });
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { // four little pink feet
      const pivot = new THREE.Group();
      pivot.position.set(x * 0.08, 0.08, z > 0 ? 0.1 : -0.12);
      g.add(pivot);
      parts.legs.push(pivot);
      limb(pivot, V(), V(0, -0.065, 0.01), z > 0 ? 0.025 : 0.035, fur, 0.016);
      part(pivot, capsuleZ(0.014, z > 0 ? 0.03 : 0.05), pink, 0, -0.07, 0.02, 1, 0.6, 1);
    }
    const tail = new THREE.Group();
    tail.position.set(0, 0.11, -0.21);
    g.add(tail);
    parts.tail = tail;
    beads(tail, [[0, 0, 0], [0, -0.05, -0.12], [0.04, -0.09, -0.26], [0.1, -0.1, -0.38], [0.16, -0.08, -0.46]], 30, (u) => 0.017 - u * 0.011, pink);
    return { body: g, parts, headTop: [0, 0.36, 0.16] };
  },

  hamster(L) { // a golden hamster: round, white tummy and cheek pouches, paws held to the chest
    const g = new THREE.Group(), fur = std(L.fur), white = std(L.belly), pink = std(0xffa8b8), parts = { legs: [] };
    part(g, ball(0.24, 22), fur, 0, 0.22, -0.02, 1.02, 0.9, 1.12);
    part(g, ball(0.2, 18), white, 0, 0.16, 0.06, 1.0, 0.82, 0.95);
    part(g, ball(0.085, 14), white, 0, 0.2, 0.22, 1.2, 0.85, 0.9);
    for (const s of [-1, 1]) part(g, ball(0.085, 14), white, s * 0.1, 0.19, 0.17);
    part(g, new THREE.ConeGeometry(0.02, 0.018, 3), pink, 0, 0.245, 0.29, 1, 1, 0.6).rotation.x = Math.PI;
    for (const s of [-1, 1]) part(g, new THREE.BoxGeometry(0.013, 0.02, 0.006), std(0xfffbf0), s * 0.0075, 0.2, 0.287); // two front teeth
    whiskers(g, V(0.04, 0.225, 0.27), 0.13);
    eyes(g, 0.3, 0.2, 0.1, 0.034, { side: 0.5 });
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.13, 0.4, 0.04);
      ear.rotation.set(0, s * 0.3, -s * 0.3);
      g.add(ear);
      part(ear, ball(0.055, 12), fur, 0, 0, 0, 1, 1, 0.32);
      part(ear, ball(0.04, 10), pink, 0, 0, 0.012, 1, 1, 0.22);
      limb(g, V(s * 0.09, 0.17, 0.2), V(s * 0.055, 0.12, 0.25), 0.022, white, 0.018); // arms
      parts.legs.push(part(g, ball(0.026, 8), pink, s * 0.05, 0.115, 0.255, 1, 0.8, 1));
      parts.legs.push(part(g, ball(0.04, 10), pink, s * 0.12, 0.02, 0.06, 1, 0.45, 1.6));
    }
    part(g, ball(0.025, 8), fur, 0, 0.12, -0.28);
    parts.head = g;
    return { body: g, parts, headTop: [0, 0.45, 0.05] };
  },

  hedgehog(L) {
    const g = new THREE.Group(), fur = std(L.fur), face = std(L.belly), spineM = std(L.spikes), tipM = std(L.spikeTips), parts = { legs: [] };
    part(g, ball(0.22, 18), fur, 0, 0.19, -0.03, 1, 0.78, 1.3);
    part(g, ball(0.17, 14), face, 0, 0.13, 0.05, 0.95, 0.6, 1.2);
    // a dense coat of spines over the back, dark with pale tips, pointing back and out
    for (let i = 0, N = 90; i < N; i++) {
      const y = 1 - ((i + 0.5) / N) * 1.12;
      const rr = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.399, u = V(Math.cos(a) * rr, y, Math.sin(a) * rr);
      if (u.z > 0.5 || y < -0.1) continue;
      const p = V(u.x * 0.22, 0.19 + u.y * 0.172, -0.03 + u.z * 0.286), d = V(u.x * 0.8, u.y * 0.7 + 0.25, u.z - 0.9).normalize();
      aim(part(g, spike(0.02, 0.13, 5), spineM, p.x + d.x * 0.04, p.y + d.y * 0.04, p.z + d.z * 0.04), d);
      aim(part(g, spike(0.009, 0.045, 5), tipM, p.x + d.x * 0.11, p.y + d.y * 0.11, p.z + d.z * 0.11), d);
    }
    const head = new THREE.Group();
    head.position.set(0, 0.16, 0.25);
    g.add(head);
    parts.head = head;
    part(head, ball(0.1, 16), face, 0, 0, 0, 1, 0.9, 1.05);
    part(head, new THREE.ConeGeometry(0.06, 0.15, 12), face, 0, -0.025, 0.12, 1, 1, 0.85).rotation.x = Math.PI / 2;
    part(head, ball(0.024, 8), std(0x1a120c, { roughness: 0.2 }), 0, -0.025, 0.2);
    whiskers(head, V(0.025, -0.035, 0.16), 0.08, 0x3a2a20);
    eyes(head, 0.025, 0.07, 0.055, 0.024, { side: 0.55 });
    for (const s of [-1, 1]) {
      part(head, ball(0.03, 8), face, s * 0.075, 0.07, -0.01, 1, 1, 0.5);
      part(head, ball(0.018, 6), std(0x8a6a5a), s * 0.075, 0.07, 0.003, 1, 1, 0.3);
    }
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const pivot = new THREE.Group();
      pivot.position.set(x * 0.12, 0.08, z * 0.14);
      g.add(pivot);
      parts.legs.push(pivot);
      limb(pivot, V(), V(0, -0.055, 0.01), 0.03, face, 0.024);
      part(pivot, ball(0.03, 8), face, 0, -0.06, 0.02, 1, 0.5, 1.3);
      for (const a of [-0.4, 0, 0.4]) aim(part(pivot, spike(0.006, 0.02, 4), std(0x3a2a20), Math.sin(a) * 0.02, -0.07, 0.055), V(Math.sin(a), -0.3, 1));
    }
    return { body: g, parts, headTop: [0, 0.3, 0.24] };
  },

  snail(L) {
    const g = new THREE.Group(), skin = std(L.fur), parts = {};
    // the foot: long and low, with a paler fringe, bumpy skin and a pointed tail end
    part(g, capsuleZ(0.07, 0.36), skin, 0, 0.065, 0.02, 1.0, 0.6, 1);
    part(g, capsuleZ(0.08, 0.36), std(L.belly), 0, 0.025, 0.02, 1.0, 0.25, 1);
    aim(part(g, spike(0.05, 0.14, 10), skin, 0, 0.045, -0.26, 1, 0.6, 1), V(0, -0.1, -1));
    for (let i = 0; i < 16; i++) part(g, ball(0.016, 6), std(L.belly), Math.sin(i * 2.4) * 0.04, 0.1, i < 8 ? 0.12 + i * 0.012 : -0.32 + i * 0.012, 1, 0.5, 1.3);
    limb(g, V(0, 0.08, 0.16), V(0, 0.15, 0.27), 0.062, skin, 0.055);
    const head = new THREE.Group();
    head.position.set(0, 0.16, 0.28);
    g.add(head);
    parts.head = head;
    part(head, ball(0.066, 12), skin, 0, 0, 0, 1, 0.9, 1.1);
    for (const s of [-1, 1]) {
      limb(head, V(s * 0.025, 0.04, 0.02), V(s * 0.06, 0.2, 0.06), 0.013, skin, 0.009); // eye stalks
      part(head, ball(0.022, 10), skin, s * 0.06, 0.2, 0.06);
      limb(head, V(s * 0.03, -0.02, 0.05), V(s * 0.055, -0.04, 0.1), 0.01, skin, 0.008); // feelers
    }
    eyes(head, 0.205, 0.072, 0.06, 0.016, { side: 0.25 });
    // the shell: a coil of shrinking whorls with a dark band running along them
    const shell = new THREE.Group(), sm = std(L.shell), band = std(L.band), lip = std(L.lip);
    shell.position.set(0, 0.25, -0.06);
    g.add(shell);
    parts.shell = shell;
    for (let i = 0, N = 90; i < N; i++) {
      const t = (i / (N - 1)) * 3.1 * Math.PI, r = 0.15 * Math.exp(-0.2 * t), x = 0.07 * (1 - Math.exp(-0.25 * t));
      const y = -r * Math.cos(t), z = -r * Math.sin(t), s = r * 0.62 + 0.005;
      part(shell, ball(s, 12), i < 4 ? lip : sm, x, y, z);
      for (const side of [-1, 1]) part(shell, ball(s * 0.3, 6), band, x + side * s * 0.86, y * 0.98, z * 0.98);
    }
    return { body: g, parts, headTop: [0, 0.38, 0.28] };
  },

  bee(L) { // head, fuzzy thorax and striped abdomen; six legs, two pairs of wings, elbowed antennae
    const g = new THREE.Group(), parts = { legs: [], wings: [] }, k = L.round ?? 1;
    const dark = std(0x1e1610), thorax = std(L.thorax);
    part(g, ball(0.12 * k, 16), thorax, 0, 0.42, 0.02);
    for (let i = 0; i < 40; i++) { // fuzz
      const y = 1 - ((i + 0.5) / 40) * 1.7, rr = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.399;
      part(g, ball(0.02 * k, 6), thorax, Math.cos(a) * rr * 0.118 * k, 0.42 + y * 0.118 * k, 0.02 + Math.sin(a) * rr * 0.118 * k);
    }
    const abd = new THREE.Group(), ar = 0.15 * k, al = ar * 1.3 * (L.abdomen ?? 1);
    abd.position.set(0, 0.38, -0.08 - al * 0.85);
    abd.rotation.x = 0.3;
    g.add(abd);
    part(abd, ball(ar, 20), std(L.fur), 0, 0, 0, 1, 0.92, al / ar);
    const rAt = (z) => ar * Math.sqrt(Math.max(0, 1 - (z / al) ** 2)) * 1.025;
    for (const [u, w, col] of L.bands) { // stripes are slices that follow the abdomen's curve
      const z1 = al * (1 - 2 * Math.min(1, u + w / 2)), z0 = al * (1 - 2 * Math.max(0, u - w / 2));
      const band = part(abd, new THREE.CylinderGeometry(rAt(z0), Math.max(0.004, rAt(z1)), z0 - z1, 18), std(col), 0, 0, (z0 + z1) / 2, 1, 1, 0.92);
      band.rotation.x = -Math.PI / 2;
    }
    aim(part(abd, spike(0.012, 0.06, 6), dark, 0, 0, -al - 0.02), V(0, 0, -1)); // stinger
    // head: dark, with big compound eyes and elbowed antennae
    const head = new THREE.Group();
    head.position.set(0, 0.45, 0.17);
    g.add(head);
    parts.head = head;
    part(head, ball(0.095, 16), dark, 0, 0, 0, 1.1, 1, 0.85);
    part(head, ball(0.05, 10), std(L.thorax), 0, -0.02, 0.06, 1.1, 1, 0.5); // fuzzy face
    for (const s of [-1, 1]) {
      part(head, ball(0.055, 12), std(0x2a1c14, { roughness: 0.12 }), s * 0.075, 0.015, 0.025, 0.6, 1.25, 0.9);
      part(head, ball(0.012, 6), GLINT, s * 0.095, 0.04, 0.05);
      const base = V(s * 0.03, 0.07, 0.06), elbow = V(s * 0.05, 0.16, 0.06), tip = V(s * 0.09, 0.19, 0.15);
      limb(head, base, elbow, 0.008, dark);
      limb(head, elbow, tip, 0.008, dark, 0.011);
      aim(part(head, spike(0.012, 0.03, 5), dark, s * 0.02, -0.07, 0.04), V(-s * 0.4, -1, 0.3)); // mandibles
    }
    // six legs from under the thorax; the hind ones carry pollen baskets
    for (const s of [-1, 1]) for (const [i, z] of [[0, 0.08], [1, 0.02], [2, -0.05]]) {
      const hip = V(s * 0.06, 0.34, z), knee = V(s * 0.15, 0.3 - i * 0.01, z + (i - 1) * 0.04), foot = V(s * 0.17, 0.17, z + (i - 1) * 0.08);
      limb(g, hip, knee, 0.014, dark, 0.012);
      limb(g, knee, foot, 0.012, dark, 0.007);
      if (i === 2) part(g, ball(0.03, 8), std(0xffa62a), (knee.x + foot.x) / 2, (knee.y + foot.y) / 2, (knee.z + foot.z) / 2, 1, 1.2, 1);
    }
    // wings: a big front pair and a small back pair, see-through
    const wingMat = std(0xe8f6ff, { transparent: true, opacity: 0.45, side: THREE.DoubleSide, roughness: 0.1, metalness: 0.2 });
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.05, 0.52 * (k > 1 ? 1.03 : 1), 0.02);
      g.add(pivot);
      parts.wings.push(pivot);
      part(pivot, ball(0.5, 14), wingMat, s * 0.13, 0.03, -0.06, 0.27, 0.006, 0.11).rotation.y = s * 0.35;
      part(pivot, ball(0.5, 12), wingMat, s * 0.09, 0.02, -0.13, 0.17, 0.005, 0.07).rotation.y = s * 0.55;
    }
    return { body: g, parts, headTop: [0, 0.56, 0.17] };
  },
};

const SHAPES = { frog: 'frog', turtle: 'turtle', mouse: 'mouse', hamster: 'round', hedgehog: 'hog', bee: 'bee', snail: 'snail' };

// ------------------------------------------------------------------ merging, level looks

/** Merges the still meshes under each group, per material, so a detailed pet stays a few draw calls. */
function compact(built) {
  const keep = new Set();
  const collect = (v) => {
    if (v?.isObject3D) keep.add(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') Object.values(v).forEach(collect);
  };
  collect(built.parts);
  const visit = (obj) => {
    const groups = new Map();
    for (const c of obj.children) {
      if (c.isMesh && !keep.has(c) && !c.children.length) {
        if (!groups.has(c.material)) groups.set(c.material, []);
        groups.get(c.material).push(c);
      } else visit(c);
    }
    for (const [mat, list] of groups) {
      if (list.length < 2) continue;
      const geos = list.map((m) => {
        m.updateMatrix();
        const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal') geo.deleteAttribute(name);
        return geo.applyMatrix4(m.matrix);
      });
      const merged = mergeGeometries(geos);
      if (!merged) continue;
      for (const m of list) obj.remove(m);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = true;
      obj.add(mesh);
    }
  };
  visit(built.body);
}

/** Tiny glowing star. */
const twinkle = (r, color) => new THREE.Mesh(new THREE.OctahedronGeometry(r, 0), new THREE.MeshBasicMaterial({ color }));

/**
 * A new look every 5 levels (see TIER_LOOKS in shared/pets.js); they stack up:
 * 5 scarf · 10 evolve · 15 orbiting sparkles · 20 evolve + crown · 25 glowing ring · 30 golden scarf + crown gem ·
 * 35 halo · 40 rainbow ring · 45 soft light · 50 golden shimmer · 55 more stars · 60 floating gems · 65 fairy wings ·
 * 70 jewelled crown · 75 sparkle trail · 80 diamond collar · 85 aurora ring · 90 starlight wings · 95 a little moon ·
 * 100 legendary rainbow aura
 */
function decorate(built, level) {
  const tier = petTier(level);
  const fx = built.parts.fx = {};
  if (tier < 1) return;
  const box = new THREE.Box3().setFromObject(built.body), mid = box.getCenter(V()), top = box.max.y;
  const [x, y, z] = built.headTop;
  const goldMat = () => std(0xffcf3f, { metalness: 0.8, roughness: 0.25, side: THREE.DoubleSide });
  const scarf = part(built.body, new THREE.TorusGeometry(0.15, 0.04, 8, 16), tier >= 6 ? goldMat() : std(0xe8433a), x, y - 0.24, z - 0.02);
  scarf.rotation.x = Math.PI / 2;
  if (tier >= 16) for (let i = 0; i < 10; i++) { // diamond collar
    const a = (i / 10) * Math.PI * 2;
    const d = part(built.body, new THREE.OctahedronGeometry(0.028, 0), std(0xdff6ff, { metalness: 0.9, roughness: 0.05, emissive: 0x5a7a8a }), x + Math.cos(a) * 0.17, y - 0.24, z - 0.02 + Math.sin(a) * 0.17);
    d.rotation.y = a;
  }
  if (tier >= 3) { // little stars circling the pet
    const orbit = new THREE.Group();
    orbit.position.set(0, y * 0.6, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2, star = twinkle(0.05, [0xfff27a, 0x9fe8ff, 0xff9ad5][i]);
      star.position.set(Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45);
      orbit.add(star);
    }
    built.body.add(orbit);
    fx.orbit = orbit;
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
  if (tier >= 4) { // crown (jewelled from 70)
    const crown = new THREE.Group();
    crown.position.set(x, y - 0.02, z);
    const gold = goldMat();
    crown.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.085, 0.06, 12, 1, true), gold));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 4), gold);
      tip.position.set(Math.cos(a) * 0.085, 0.055, Math.sin(a) * 0.085);
      crown.add(tip);
      if (tier >= 14) {
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
  if (tier >= 17) { // aurora: a wider ring that ripples green to violet
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.66, 40), new THREE.MeshBasicMaterial({ color: 0x5affc0, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    built.body.add(ring);
    fx.aurora = ring;
  }
  if (tier >= 7) { // halo
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 6, 20), new THREE.MeshBasicMaterial({ color: 0xfff6b0 }));
    halo.rotation.x = Math.PI / 2;
    halo.position.set(x, y + 0.16, z);
    built.body.add(halo);
    fx.halo = halo;
    fx.haloY = halo.position.y;
  }
  if (tier >= 9) { // its own soft light
    const light = new THREE.PointLight(0xfff0c0, 3, 4, 1.5);
    light.position.set(0, y + 0.3, 0);
    built.body.add(light);
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
    const m = new THREE.Mesh(ball(0.07, 16), std(0xfff4c8, { emissive: 0xaa9a60 }));
    m.position.x = 0.5;
    for (let i = 0; i < 3; i++) part(m, ball(0.018, 8), std(0xd8c890, { emissive: 0x6a5a30 }), Math.cos(i * 2.1) * 0.04, Math.sin(i * 2.1) * 0.04, 0.055, 1, 1, 0.4);
    moon.add(m);
    built.body.add(moon);
    fx.moon = moon;
  }
  if (tier >= 20) { // legendary: a soft rainbow aura
    const r = Math.max(box.max.x - box.min.x, top, box.max.z - box.min.z) * 0.62;
    const aura = new THREE.Mesh(ball(r, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    aura.position.copy(mid);
    built.body.add(aura);
    fx.aura = aura;
  }
  if (tier >= 10) { // golden shimmer over the whole body (rainbow at 100)
    fx.shimmer = [];
    fx.legend = tier >= 20;
    const shared = SHARED();
    built.body.traverse((o) => {
      if (!o.isMesh || !o.material.isMeshStandardMaterial || !shared.has(o.material)) return;
      o.material = o.material.clone();
      fx.shimmer.push(o.material);
    });
  }
}

const STAGE_SCALE = [1, 1.3, 1.6];

export function buildPet(kind, level = 1) {
  const stage = petStage(level), L = lookFor(kind, stage);
  const built = BUILDERS[kind] ? BUILDERS[kind](L, stage) : L.bird ? makeBird(L, stage) : makeQuad(L, stage);
  compact(built);
  decorate(built, level);
  return built;
}

export class PetView {
  constructor(kind, level = 1) {
    this.kind = kind;
    this.shape = SHAPES[kind] ?? (LOOKS[kind]?.bird ? 'bird' : 'quad');
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
          const u = Math.sin((1 - this.jump / 0.45) * Math.PI);
          b.position.y = u * 0.35;
          b.scale.set(1 - u * 0.1, 1 + u * 0.15, 1);
          b.rotation.x = -u * 0.25;
          for (const l of P.legs) l.rotation.x = u * 0.9; // legs kick out behind
        } else {
          const breathe = 1 + Math.sin(t * 3) * 0.03;
          b.scale.set(breathe, 1 / breathe, 1);
          for (const l of P.legs) l.rotation.x = 0;
        }
        break;
      }
      case 'turtle': {
        const w = moving ? Math.sin(t * 6) : 0;
        b.rotation.z = w * 0.05;
        P.legs.forEach((l, i) => { l.position.y = l.userData.y0 + Math.max(0, Math.sin(t * 6 + (i % 3 ? Math.PI : 0))) * (moving ? 0.04 : 0); });
        P.head.position.z = P.head.userData.z0 + (moving ? Math.sin(t * 6) * 0.02 : Math.sin(t * 0.8) * 0.05 - 0.02);
        break;
      }
      case 'mouse': {
        const w = t * 22;
        b.position.y = moving ? Math.abs(Math.sin(w)) * 0.025 : 0;
        P.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(w + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.7 : 0; });
        P.tail.rotation.y = Math.sin(t * (moving ? 14 : 3)) * 0.35;
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
        if (P.ears) P.ears.forEach((e, i) => { e.rotation.y = Math.max(0, Math.sin(t * 1.7 + i * 2.5) - 0.92) * 4 * (i ? -1 : 1); }); // a twitch now and then
        if (P.wings) P.wings.forEach((wg, i) => { wg.rotation.z = (i ? 1 : -1) * (Math.sin(t * (moving ? 7 : 2.5)) * 0.35 + 0.1); });
        if (this.shape === 'round') b.rotation.z = moving ? Math.sin(w) * 0.08 : 0;
        break;
      }
      case 'bird': {
        const w = t * 12;
        b.rotation.z = moving ? Math.sin(w) * 0.12 : 0; // waddle
        b.position.y = moving ? Math.abs(Math.sin(w)) * 0.03 : 0;
        P.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(w + i * Math.PI) * 0.5 : 0; });
        P.wings.forEach((wg, i) => { wg.rotation.z = (i ? 1 : -1) * (moving ? Math.abs(Math.sin(t * 16)) * 0.5 : Math.abs(Math.sin(t * 2)) * 0.05); });
        P.head.rotation.x = moving ? Math.sin(w * 2) * 0.08 : Math.sin(t * 1.4) * 0.1;
        break;
      }
      case 'bee':
        b.position.y = 0.2 + Math.sin(t * 4) * 0.08;
        b.rotation.x = Math.sin(t * 2) * 0.05;
        P.wings.forEach((wg, i) => { wg.rotation.z = (i ? 1 : -1) * (Math.sin(t * 40) * 0.6 + 0.2); });
        break;
      case 'snail':
        P.shell.rotation.z = Math.sin(t * 3) * 0.04;
        b.scale.z = 1 + (moving ? Math.sin(t * 8) * 0.06 : 0);
        P.head.rotation.x = Math.sin(t * 1.3) * 0.1;
        break;
    }
    const fx = P.fx ?? {};
    if (fx.orbit) fx.orbit.rotation.y = t * 2.2;
    if (fx.orbit2) fx.orbit2.rotation.y = -t * 1.4;
    if (fx.gems) { fx.gems.rotation.y = t * 1.1; fx.gems.children.forEach((g, i) => { g.position.y = Math.sin(t * 2 + i * 2) * 0.03; g.rotation.y = t * 3; }); }
    if (fx.ring) {
      fx.ring.material.opacity = 0.25 + Math.sin(t * 3) * 0.12;
      if (fx.rainbow) fx.ring.material.color.setHSL((t * 0.25) % 1, 0.9, 0.6);
    }
    if (fx.aurora) {
      fx.aurora.rotation.z = t * 0.5;
      fx.aurora.material.color.setHSL(0.38 + Math.sin(t * 0.7) * 0.18, 0.9, 0.55);
      fx.aurora.material.opacity = 0.22 + Math.sin(t * 2.3) * 0.1;
    }
    if (fx.halo) fx.halo.position.y = fx.haloY + Math.sin(t * 2) * 0.02;
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
    const shared = SHARED();
    this.root.traverse((o) => {
      o.geometry?.dispose();
      if (o.material && !shared.has(o.material) && o.material !== GLINT && o.material !== PUPIL) o.material.dispose();
    });
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
