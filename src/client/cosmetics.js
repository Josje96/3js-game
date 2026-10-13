// Little hand-made accessories for the wardrobe (the KayKit packs don't have these).
// Hats are built for a head 1 unit wide sitting at y = 0 (the top of the head) and are
// scaled to the real head; back items are built against a back at z = 0, facing -z.
import * as THREE from 'three';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const mesh = (geo, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  return m;
};

const HAT_BUILDERS = {
  party() {
    const g = new THREE.Group();
    const cone = mesh(new THREE.ConeGeometry(0.28, 0.75, 20), mat(0xff7ac0), 0, 0.3, 0);
    g.add(cone);
    for (const [y, r] of [[0.08, 0.25], [0.32, 0.17], [0.52, 0.09]]) { // stripes
      g.add(mesh(new THREE.TorusGeometry(r, 0.025, 6, 20), mat(0xfff27a), 0, y, 0)).children.at(-1).rotation.x = Math.PI / 2;
    }
    g.add(mesh(new THREE.SphereGeometry(0.09, 10, 8), mat(0x7fe3ff), 0, 0.7, 0));
    g.rotation.z = 0.25;
    g.position.x = 0.1;
    return g;
  },
  flowers() {
    const g = new THREE.Group();
    const ring = mesh(new THREE.TorusGeometry(0.42, 0.045, 8, 32), mat(0x4f9a3a), 0, -0.02, 0);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const colors = [0xffffff, 0xff9ad5, 0xffe066, 0xb48cff, 0xff8a65];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const f = mesh(new THREE.SphereGeometry(0.085, 8, 6), mat(colors[i % colors.length]), Math.cos(a) * 0.42, 0.02, Math.sin(a) * 0.42);
      f.scale.y = 0.6;
      g.add(f);
      g.add(mesh(new THREE.SphereGeometry(0.035, 6, 4), mat(0xf5b82e), Math.cos(a) * 0.42, 0.06, Math.sin(a) * 0.42));
    }
    return g;
  },
  bunny() {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      const outer = mesh(new THREE.SphereGeometry(0.12, 12, 10), mat(0xffffff), 0, 0.35, 0);
      outer.scale.set(0.9, 3.2, 0.45);
      const inner = mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(0xffb3c9), 0, 0.33, 0.04);
      inner.scale.set(0.9, 3.4, 0.4);
      ear.add(outer, inner);
      ear.position.x = s * 0.18;
      ear.rotation.z = -s * 0.2;
      g.add(ear);
    }
    return g;
  },
  cat() {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(0.16, 0.3, 4), mat(0xff9a3c), s * 0.27, 0.1, 0);
      ear.rotation.set(0, Math.PI / 4, -s * 0.3);
      const inner = mesh(new THREE.ConeGeometry(0.08, 0.18, 4), mat(0xffc9d6), s * 0.27, 0.08, 0.06);
      inner.rotation.copy(ear.rotation);
      g.add(ear, inner);
    }
    return g;
  },
  tophat() {
    const g = new THREE.Group();
    const black = mat(0x26222e, { roughness: 0.4 });
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 28), black, 0, 0, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.6, 28), black, 0, 0.32, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.1, 28), mat(0xd94a5a), 0, 0.1, 0));
    g.rotation.z = -0.12;
    return g;
  },
  viking() {
    const g = new THREE.Group();
    const dome = mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x9aa3ad, { metalness: 0.6, roughness: 0.35 }), 0, -0.22, 0);
    g.add(dome);
    g.add(mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 28), mat(0xc79a4a, { metalness: 0.5 }), 0, -0.2, 0)).children.at(-1).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) {
      const horn = mesh(new THREE.ConeGeometry(0.09, 0.45, 12), mat(0xf3ead6), s * 0.55, 0.05, 0);
      horn.rotation.z = -s * 1.0;
      g.add(horn);
    }
    return g;
  },
  crown() {
    const g = new THREE.Group();
    const gold = mat(0xffcf3f, { metalness: 0.8, roughness: 0.25 });
    g.add(mesh(new THREE.CylinderGeometry(0.36, 0.34, 0.18, 24, 1, true), gold, 0, 0.06, 0)).children.at(-1).material.side = THREE.DoubleSide;
    const gems = [0xff4d6d, 0x4dc3ff, 0x6dff8a];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(mesh(new THREE.ConeGeometry(0.07, 0.2, 6), gold, Math.cos(a) * 0.34, 0.24, Math.sin(a) * 0.34));
      g.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), mat(gems[i % 3], { roughness: 0.2 }), Math.cos(a) * 0.36, 0.07, Math.sin(a) * 0.36));
    }
    return g;
  },
};

const BACK_BUILDERS = {
  backpack() {
    const g = new THREE.Group();
    const brown = mat(0x9a6a3c);
    g.add(mesh(new THREE.BoxGeometry(0.75, 0.85, 0.4), brown, 0, -0.1, -0.2));
    g.add(mesh(new THREE.BoxGeometry(0.78, 0.3, 0.44), mat(0x7a5030), 0, 0.25, -0.2));        // flap
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.35, 0.12), mat(0xb58250), 0, -0.25, -0.44));      // pocket
    g.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), mat(0xffcf3f, { metalness: 0.7 }), 0, 0.12, -0.43)); // buckle
    return g;
  },
  fairy() {
    const g = new THREE.Group();
    const wingMat = mat(0xbfefff, { transparent: true, opacity: 0.6, side: THREE.DoubleSide, emissive: 0x335566, roughness: 0.2 });
    const wingMat2 = mat(0xffc6ef, { transparent: true, opacity: 0.6, side: THREE.DoubleSide, emissive: 0x553344, roughness: 0.2 });
    g.userData.wings = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      const top = mesh(new THREE.CircleGeometry(0.5, 20), wingMat, s * 0.45, 0.3, 0);
      top.scale.set(1, 0.65, 1);
      top.rotation.z = s * 0.5;
      const low = mesh(new THREE.CircleGeometry(0.32, 16), wingMat2, s * 0.32, -0.2, 0);
      low.scale.set(1, 0.7, 1);
      low.rotation.z = -s * 0.5;
      pivot.add(top, low);
      pivot.userData.side = s;
      pivot.position.z = -0.08;
      g.add(pivot);
      g.userData.wings.push(pivot);
    }
    g.userData.update = (t) => { for (const w of g.userData.wings) w.rotation.y = w.userData.side * (0.35 + Math.sin(t * 9) * 0.35); };
    return g;
  },
  bat() {
    const g = new THREE.Group();
    const wingMat = mat(0x4a2f5e, { side: THREE.DoubleSide, roughness: 0.7 });
    g.userData.wings = [];
    for (const s of [-1, 1]) {
      // a scalloped fan: triangles from the shoulder out to three finger tips
      const pts = [[0, 0], [s * 0.5, 0.45], [s * 0.6, 0.05], [s * 0.85, 0.3], [s * 0.8, -0.15], [s * 1.0, 0.0], [s * 0.7, -0.35]];
      const pos = [];
      for (let i = 1; i < pts.length - 1; i++) pos.push(0, 0, 0, ...pts[i], 0, ...pts[i + 1], 0);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      const pivot = new THREE.Group();
      pivot.add(mesh(geo, wingMat));
      pivot.userData.side = s;
      pivot.position.set(s * 0.1, 0.15, -0.08);
      g.add(pivot);
      g.userData.wings.push(pivot);
    }
    g.userData.update = (t) => { for (const w of g.userData.wings) w.rotation.y = w.userData.side * (0.3 + Math.sin(t * 4) * 0.25); };
    return g;
  },
};

export function buildHat(id) { return HAT_BUILDERS[id]?.() ?? null; }
export function buildBack(id) { return BACK_BUILDERS[id]?.() ?? null; }

// ------------------------------------------------------------------ mirror: hair + face

// Hair is built for the same head as hats: 1 unit wide, y = 0 at the top of the head.
// The head is roughly a ball of radius 0.5 centred at y = -0.47; the face looks along +z.
const HEAD_Y = -0.5, HEAD_R = 0.56;

/**
 * Hair over the head: a full cap on top (covers the forehead and the outfit's own hair),
 * plus sides/back that reach `down` (0..1) and leave the face open.
 */
function hairShell(m, down = 0.42, open = 1.0, r = HEAD_R) {
  const g = new THREE.Group();
  const capTo = Math.PI * 0.3;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, capTo), m);
  const sides = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, Math.PI / 2 + open, Math.PI * 2 - open * 2, capTo - 0.02, Math.max(0.05, Math.PI * down - capTo)), m);
  for (const x of [cap, sides]) { x.position.y = HEAD_Y; x.castShadow = true; g.add(x); }
  return g;
}

const HAIR_BUILDERS = {
  bald() {
    return new THREE.Group(); // just the scalp
  },
  suave(m) { // slicked back, with a swoop at the front and a neat side part
    const g = new THREE.Group();
    g.add(hairShell(m, 0.4, 1.05, HEAD_R * 1.01));
    const quiff = mesh(new THREE.SphereGeometry(0.3, 18, 10), m, 0.08, -0.1, 0.28, 1.35, 0.55, 0.9);
    quiff.rotation.set(-0.35, 0, -0.15);
    g.add(quiff);
    g.add(mesh(new THREE.BoxGeometry(0.02, 0.05, 0.5), mat(0x000000, { transparent: true, opacity: 0.25 }), -0.2, 0.02, 0.0)).children.at(-1).rotation.z = 0.2;
    return g;
  },
  spiky(m) {
    const g = new THREE.Group();
    g.add(hairShell(m, 0.36));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, tilt = 0.5 + (i % 2) * 0.2;
      g.add(mesh(new THREE.ConeGeometry(0.1, 0.32, 5), m, Math.sin(a) * 0.28, -0.02, Math.cos(a) * 0.28 - 0.04)).children.at(-1).rotation.set(Math.cos(a) * tilt, 0, -Math.sin(a) * tilt);
    }
    return g;
  },
  bob(m) {
    const g = new THREE.Group();
    g.add(hairShell(m, 0.62, 0.85));
    return g;
  },
  long(m) {
    const g = new THREE.Group();
    g.add(hairShell(m, 0.62, 0.85));
    g.add(mesh(new THREE.SphereGeometry(0.42, 16, 10), m, 0, -0.85, -0.22, 1.15, 1.2, 0.55));
    return g;
  },
  ponytail(m) {
    const g = new THREE.Group();
    g.add(hairShell(m, 0.45));
    g.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), mat(0xff6b8a), 0, -0.3, -0.5));
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.SphereGeometry(0.15 - i * 0.02, 12, 8), m, 0, -0.38 - i * 0.16, -0.6 - i * 0.04));
    return g;
  },
  pigtails(m) {
    const g = new THREE.Group();
    g.add(hairShell(m, 0.45));
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), mat(0x7fd4ff), s * 0.52, -0.42, -0.08));
      for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(0.14 - i * 0.02, 12, 8), m, s * (0.6 + i * 0.05), -0.52 - i * 0.15, -0.1));
    }
    return g;
  },
  curly(m) {
    const g = new THREE.Group();
    g.add(hairShell(m, 0.4, 1.0, HEAD_R * 1.02));
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 * 3, ring = Math.floor(i / 9);
      const th = 0.25 + ring * 0.38, ph = a;
      const x = Math.sin(th) * Math.sin(ph) * 0.55, y = HEAD_Y + Math.cos(th) * 0.55, z = Math.sin(th) * Math.cos(ph) * 0.55;
      if (z > 0.3 && y < -0.2) continue; // keep the face clear
      g.add(mesh(new THREE.SphereGeometry(0.13, 8, 6), m, x, y, z - 0.03));
    }
    return g;
  },
  mohawk(m) {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const a = -0.6 + i * 0.32;
      g.add(mesh(new THREE.ConeGeometry(0.07, 0.38, 4), m, 0, HEAD_Y + Math.cos(a) * 0.55 + 0.05, Math.sin(a) * 0.55)).children.at(-1).rotation.x = a;
    }
    return g;
  },
  bun(m) {
    const g = new THREE.Group();
    g.add(hairShell(m, 0.45));
    g.add(mesh(new THREE.SphereGeometry(0.2, 14, 10), m, 0, 0.08, -0.12));
    return g;
  },
};

// ------------------------------------------------------------------ reading the KayKit textures
// Each triangle of a KayKit character samples one flat colour swatch of the texture atlas, so we
// can tell skin from hair/clothes by looking up the colour under the triangle.
// Skin comes in a light swatch (240,176,128) and a shadowed one (208,160,112) — both must count
// as skin or faces like the Rogue's (mostly shadowed) get carved away, leaving the scalp ball
// showing through where the eyes should be. Greys and whites (armor 240,240,240) must NOT match,
// so the swatch has to lean yellow-brown: green well below red, blue below green.

export const SKIN = ([r, g, b]) => r >= 200 && g >= 140 && b >= 95 && g <= r - 20 && b <= g - 20;
const pixelCache = new WeakMap();   // texture image -> { data, w, h }
const colourCache = new WeakMap();  // geometry -> [[r, g, b] per triangle]

function pixels(image) {
  if (!pixelCache.has(image)) {
    const c = document.createElement('canvas');
    c.width = image.width; c.height = image.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(image, 0, 0);
    pixelCache.set(image, { data: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height });
  }
  return pixelCache.get(image);
}

function triangleColours(geo, image) {
  if (colourCache.has(geo)) return colourCache.get(geo);
  const { data, w, h } = pixels(image);
  const uv = geo.attributes.uv, idx = geo.index.array, out = [];
  for (let t = 0; t < idx.length; t += 3) {
    let u = 0, v = 0;
    for (let k = 0; k < 3; k++) { u += uv.getX(idx[t + k]) / 3; v += uv.getY(idx[t + k]) / 3; }
    const x = Math.min(w - 1, Math.max(0, Math.floor(u * w))), y = Math.min(h - 1, Math.max(0, Math.floor(v * h)));
    const i = (y * w + x) * 4;
    out.push([data[i], data[i + 1], data[i + 2]]);
  }
  colourCache.set(geo, out);
  return out;
}

/** A copy of `geo` that only draws the triangles `keep(t, colour, centre)` says yes to (shares the vertex data). */
function filterTriangles(geo, image, keep) {
  const cols = triangleColours(geo, image), pos = geo.attributes.position, idx = geo.index.array, kept = [];
  for (let t = 0; t < idx.length; t += 3) {
    const c = [0, 1, 2].map((a) => (pos.getComponent(idx[t], a) + pos.getComponent(idx[t + 1], a) + pos.getComponent(idx[t + 2], a)) / 3);
    if (keep(t / 3, cols[t / 3], c)) kept.push(idx[t], idx[t + 1], idx[t + 2]);
  }
  const out = new THREE.BufferGeometry();
  for (const name of Object.keys(geo.attributes)) out.setAttribute(name, geo.attributes[name]);
  out.setIndex(kept); // a plain array: three wraps it (a raw typed array would leave the index empty)
  return out;
}

// The outfit's own hair is part of its head mesh, and the head is hollow underneath it.
// For a new hairstyle (or 'bald') we drop every triangle that isn't skin (except the eyes and
// brows, which live in a small window on the front of the face) and put a skin-coloured skull
// (see buildScalp) in the gap. The window must stay TIGHT but generous enough for a whole eye:
// the Mage's black fringe hangs right where his brows are, and a too-generous box keeps it as
// shards over the eyes, while a too-tight one cuts the outer halves of the eyes off (fine from
// the front, broken from the game's three-quarter camera). Bounds are measured per outfit:
// rel = fraction of head height from its bottom, from the KayKit meshes.
const FACE_LO = 0.25, FACE_HI = 0.56, FACE_X = 0.26, FACE_Z = 0.32;
const FACE_HI_PER_OUTFIT = {
  Barbarian: 0.68,    // his beard hangs from just above his brows: keep the whole beard
  Mage: 0.53,         // his fringe starts at 0.54
  Ranger: 0.47,       // his fringe starts at 0.47
  Rogue: 0.555,       // brows end at 0.55, his fringe starts right there
  Rogue_Hooded: 0.555,
};

// Some heads paint a lighter "skin" band where their own hair meets the forehead (the Knight's,
// under his helmet): above this height only the scalp ball and the new hair should show.
const SKIN_TOP_PER_OUTFIT = { Knight: 0.6 };

const hairlessCache = new WeakMap();
export function hairlessHead(geo, image, outfit) {
  if (!hairlessCache.has(geo)) {
    geo.computeBoundingBox();
    const bb = geo.boundingBox, height = bb.max.y - bb.min.y;
    const hi = FACE_HI_PER_OUTFIT[outfit] ?? FACE_HI;
    const kept = filterTriangles(geo, image, (_, col, [x, y, z]) => {
      const rel = (y - bb.min.y) / height;
      const face = z > FACE_Z && Math.abs(x) < FACE_X && rel > FACE_LO && rel < hi;
      return (SKIN(col) && rel < (SKIN_TOP_PER_OUTFIT[outfit] ?? 1)) || face;
    });
    // the bounds of the skin that's left = the skull. The scalp ball only has to plug the opening
    // where the hair was (the top of the head), so it rides high and sits BACK, behind the eye
    // domes — a full-ball-in-the-middle fill leans out over the eyes and covers them.
    const pos = geo.attributes.position, idx = kept.index;
    const skull = new THREE.Box3();
    for (let i = 0; i < idx.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, idx.getX(i));
      skull.expandByPoint(v);
    }
    const c = skull.getCenter(new THREE.Vector3()), s = skull.getSize(new THREE.Vector3());
    const scalp = { cx: c.x, cy: c.y + s.y * 0.2, cz: c.z - s.z * 0.12, sx: s.x * 0.88, sy: s.y * 0.78, sz: s.z * 0.74 };
    // new hair sits ON the skull (centred on it, its top just over the scalp ball's top, as wide as
    // the skull) rather than on the old head mesh, whose hair mass made it float or left the scalp poking out
    scalp.hair = { x: c.x, y: scalp.cy + scalp.sy / 2 + 0.02, z: c.z, size: s.x };
    hairlessCache.set(geo, { geo: kept, scalp });
  }
  return hairlessCache.get(geo).geo;
}

/** Where the scalp ball goes for a carved head (see hairlessHead), or null when there's no carve. */
export function scalpOf(geo, image, outfit) {
  if (!image) return null;
  hairlessHead(geo, image, outfit); // fills the cache
  return hairlessCache.get(geo)?.scalp ?? null;
}

/** The skull under a new hairstyle: a ball the anchor stretches to the head's size. */
export function buildScalp(tone) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), mat(new THREE.Color(0xf5b993).multiply(new THREE.Color(tone ?? 0xffffff)), { roughness: 0.8 }));
  m.castShadow = true;
  return m;
}

/**
 * Fancy clothes: split a body part into its skin triangles (hands, neck — drawn as before)
 * and everything else (drawn in a flat cloth colour). Returns geometry with two groups.
 */
const splitCache = new WeakMap();
export function skinSplit(geo, image) {
  if (!splitCache.has(geo)) {
    const cols = triangleColours(geo, image), idx = geo.index.array, skin = [], cloth = [];
    for (let t = 0; t < idx.length; t += 3) (SKIN(cols[t / 3]) ? skin : cloth).push(idx[t], idx[t + 1], idx[t + 2]);
    const out = new THREE.BufferGeometry();
    for (const name of Object.keys(geo.attributes)) out.setAttribute(name, geo.attributes[name]);
    out.setIndex([...skin, ...cloth]);
    out.addGroup(0, skin.length, 0);
    out.addGroup(skin.length, cloth.length, 1);
    splitCache.set(geo, out);
  }
  return splitCache.get(geo);
}

/**
 * Little extras for fancy clothes. 'front' things are built for a chest 1 unit wide with z = 0 at
 * the front of the body, y = 0 at the middle of the chest; 'hips' things hang from the waist.
 */
const CLOTHES_BUILDERS = {
  tie(tieColor = 0xc0303a) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.ConeGeometry(0.2, 0.42, 3), mat(0xf4f4f4), 0, 0.12, 0.0, 1, 1, 0.12)).children.at(-1).rotation.z = Math.PI; // shirt front
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.07, 0.05), mat(tieColor), 0, 0.27, 0.03));
    const tie = mesh(new THREE.ConeGeometry(0.06, 0.42, 4), mat(tieColor, { roughness: 0.4 }), 0, 0.04, 0.03);
    tie.rotation.set(Math.PI, Math.PI / 4, 0);
    g.add(tie);
    return { front: g };
  },
  bowtie(tieColor = 0x111111) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.ConeGeometry(0.2, 0.42, 3), mat(0xffffff), 0, 0.12, 0.0, 1, 1, 0.12)).children.at(-1).rotation.z = Math.PI;
    for (const s of [-1, 1]) g.add(mesh(new THREE.ConeGeometry(0.06, 0.12, 4), mat(tieColor), s * 0.06, 0.26, 0.04)).children.at(-1).rotation.z = s * Math.PI / 2;
    for (const y of [0.1, -0.02]) g.add(mesh(new THREE.SphereGeometry(0.018, 6, 4), mat(0x111111), 0, y, 0.04));
    return { front: g };
  },
  vest() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.5, 0.04), mat(0x8a5a34), 0, 0.02, 0.0));
    for (const y of [0.15, 0.03, -0.09]) g.add(mesh(new THREE.SphereGeometry(0.022, 6, 4), mat(0xffcf3f, { metalness: 0.6 }), 0, y, 0.03));
    return { front: g };
  },
  gown() {
    const skirt = new THREE.Group();
    const cloth = mat(0xd8649f, { roughness: 0.5 });
    const cone = mesh(new THREE.CylinderGeometry(0.42, 0.95, 1.1, 24, 1, true), cloth, 0, -0.5, 0);
    cone.material.side = THREE.DoubleSide;
    skirt.add(cone);
    skirt.add(mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 24), mat(0xffd6ea), 0, 0.04, 0)).children.at(-1).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) { // ruffle along the hem
      const a = (i / 8) * Math.PI * 2;
      skirt.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), mat(0xffd6ea), Math.cos(a) * 0.93, -1.04, Math.sin(a) * 0.93, 1.3, 0.5, 1.3));
    }
    const front = new THREE.Group();
    front.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0xffffff, { roughness: 0.2 }), 0, 0.22, 0.03)); // a pearl
    skirt.userData.cone = { topY: 0.05, hemY: -1.05, rTop: 0.42, rBot: 0.95 }; // flared by the view so feet stay inside
    return { front, hips: skirt };
  },
  sash() { // a pirate captain: a gold sash across the chest, brass buttons and a lace jabot
    const g = new THREE.Group();
    const sash = mesh(new THREE.BoxGeometry(0.12, 0.7, 0.04), mat(0xe0b84a, { metalness: 0.4, roughness: 0.4 }), 0, 0.02, 0.02);
    sash.rotation.z = 0.7;
    g.add(sash);
    for (const y of [0.15, 0.0, -0.15]) for (const x of [-0.12, 0.12]) g.add(mesh(new THREE.SphereGeometry(0.025, 6, 4), mat(0xd9a93a, { metalness: 0.7 }), x, y, 0.03));
    g.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), mat(0xffffff), 0, 0.24, 0.03, 1, 0.8, 0.5));
    return { front: g };
  },
  apron() { // chef whites: a big white apron, double row of buttons, a red neckerchief
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.42, 0.5, 0.03), mat(0xffffff, { roughness: 0.9 }), 0, -0.12, 0.03));
    for (const y of [0.22, 0.12]) for (const x of [-0.08, 0.08]) g.add(mesh(new THREE.SphereGeometry(0.02, 6, 4), mat(0xdddddd), x, y, 0.03));
    g.add(mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12), mat(0xd8302a), 0, 0.27, 0.0, 1, 0.5, 1));
    return { front: g };
  },
  bib() { // farmer overalls: a denim bib with two straps and a patch pocket
    const g = new THREE.Group(), denim = mat(0x3b5f9a, { roughness: 0.9 });
    g.add(mesh(new THREE.BoxGeometry(0.34, 0.28, 0.035), denim, 0, -0.08, 0.03));
    for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.06, 0.3, 0.03), denim, s * 0.13, 0.18, 0.03));
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.1, 0.02), mat(0x2f4f80), 0, -0.06, 0.05));
    for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.025, 6, 4), mat(0xd9a93a, { metalness: 0.7 }), s * 0.13, 0.05, 0.05));
    return { front: g };
  },
  robe() {
    const front = new THREE.Group();
    const gold = mat(0xffcf3f, { metalness: 0.7, roughness: 0.3 });
    front.add(mesh(new THREE.BoxGeometry(0.08, 0.6, 0.04), gold, 0, 0, 0.01));
    const fur = mat(0xffffff, { roughness: 1 });
    for (let i = 0; i < 7; i++) front.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), fur, -0.3 + i * 0.1, 0.3, -0.02 - Math.abs(i - 3) * 0.02));
    const hips = new THREE.Group();
    const hem = mesh(new THREE.CylinderGeometry(0.46, 0.7, 0.75, 20, 1, true), mat(0x6a35b8), 0, -0.32, 0);
    hem.material.side = THREE.DoubleSide;
    hips.add(hem, mesh(new THREE.TorusGeometry(0.7, 0.035, 6, 24), gold, 0, -0.69, 0));
    hips.children.at(-1).rotation.x = Math.PI / 2;
    hips.userData.cone = { topY: 0.055, hemY: -0.695, rTop: 0.46, rBot: 0.7 };
    return { front, hips };
  },
};

/**
 * Armor: a chest plate (built like the 'front' clothes extras) and two shoulder pads (a unit-wide
 * dome sitting on each upper arm). Better tiers get a rim and a little gem.
 */
export function buildArmor(color, tier = 0) {
  const metal = mat(color, { metalness: 0.65, roughness: 0.35 });
  const trim = mat(tier >= 2 ? 0xffd23f : 0x6b4a2c, { metalness: 0.5, roughness: 0.4 });
  // a breastplate: a curved shell wrapped round the front of the chest, with a ridge down the middle
  const chest = new THREE.Group();
  const shell = new THREE.CylinderGeometry(0.5, 0.44, 0.52, 20, 1, true, -Math.PI * 0.42, Math.PI * 0.84);
  const plate = mesh(shell, metal, 0, 0.02, -0.44);
  plate.material = metal.clone();
  plate.material.side = THREE.DoubleSide;
  chest.add(plate);
  chest.add(mesh(new THREE.BoxGeometry(0.05, 0.5, 0.06), trim, 0, 0.02, 0.05));
  const belt = mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.07, 20, 1, true, -Math.PI * 0.42, Math.PI * 0.84), trim, 0, -0.24, -0.44);
  belt.material = trim.clone();
  belt.material.side = THREE.DoubleSide;
  chest.add(belt);
  if (tier >= 1) chest.add(mesh(new THREE.OctahedronGeometry(0.06, 0), mat(tier >= 3 ? 0xb48cff : 0x7fd8ff, { emissive: 0x223355, roughness: 0.2 }), 0, 0.1, 0.09));
  const pad = () => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), metal, 0, -0.1, 0, 1, 0.75, 1));
    g.add(mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 18), trim, 0, -0.1, 0)).children.at(-1).rotation.x = Math.PI / 2;
    if (tier >= 3) g.add(mesh(new THREE.ConeGeometry(0.1, 0.35, 6), trim, 0, 0.3, 0));
    return g;
  };
  return { chest, left: pad(), right: pad() };
}

/** A fancy outfit's extras: `color` = its jacket colour (skirts follow it), `tie` = the tie colour. */
export function buildClothes(extra, color, tie) {
  const built = CLOTHES_BUILDERS[extra]?.(tie) ?? {};
  if (color != null && (extra === 'gown' || extra === 'robe')) built.hips?.children[0]?.material.color.set(color);
  return built;
}

/** Eyebrows in the hair colour, drawn over the face's own (face frame: head 1 wide, y 0 at the eyes). */
export function buildBrows(color) {
  const g = new THREE.Group(), m = mat(color, { roughness: 0.8 });
  for (const s of [-1, 1]) {
    const brow = mesh(new THREE.CapsuleGeometry(0.028, 0.12, 4, 8), m, s * 0.17, 0.135, 0.035);
    brow.rotation.z = Math.PI / 2 + s * 0.12;
    g.add(brow);
  }
  return g;
}

export function buildHair(style, color) {
  const b = HAIR_BUILDERS[style];
  return b ? b(mat(color, { roughness: 0.8 })) : null;
}

// Face things sit on the front of the head: built for a head 1 unit wide, y = 0 at eye
// height, z = 0 at the front of the face.
const FACE_BUILDERS = {
  glasses() {
    const g = new THREE.Group(), frame = mat(0x2a2a2a, { roughness: 0.3 });
    for (const s of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 20), frame, s * 0.17, 0, 0.02));
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), frame, 0, 0.02, 0.02));
    return g;
  },
  sunglasses() {
    const g = new THREE.Group(), lens = mat(0x111122, { roughness: 0.1, metalness: 0.5 });
    for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 20), lens, s * 0.17, 0, 0.02)).children.at(-1).rotation.x = Math.PI / 2;
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.03, 0.02), lens, 0, 0.07, 0.02));
    return g;
  },
  stars() {
    const g = new THREE.Group(), pink = mat(0xff6bb5, { roughness: 0.3 });
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.06 : 0.14, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
    for (const s of [-1, 1]) g.add(mesh(geo, pink, s * 0.18, 0, 0.02));
    return g;
  },
  monocle() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 20), mat(0xffcf3f, { metalness: 0.8, roughness: 0.3 }), 0.17, 0, 0.03));
    g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.35, 4), mat(0xffcf3f), 0.27, -0.2, 0.02));
    return g;
  },
  eyepatch() {
    const g = new THREE.Group(), black = mat(0x151515);
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16), black, -0.17, 0, 0.02)).children.at(-1).rotation.x = Math.PI / 2;
    const strap = mesh(new THREE.TorusGeometry(0.5, 0.012, 4, 32), black, 0, 0.02, -0.45);
    strap.rotation.set(0, 0, 0.35);
    strap.scale.set(1.05, 1, 1);
    strap.rotation.x = Math.PI / 2 - 0.15;
    g.add(strap);
    return g;
  },
  mustache(_, hair) {
    const g = new THREE.Group(), m = mat(hair, { roughness: 0.8 });
    for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.09, 10, 8), m, s * 0.08, -0.2, 0.01, 1.3, 0.5, 0.6)).children.at(-1).rotation.z = s * 0.3;
    return g;
  },
  beard(_, hair) {
    const g = new THREE.Group(), m = mat(hair, { roughness: 0.9 });
    g.add(mesh(new THREE.SphereGeometry(0.3, 14, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), m, 0, -0.2, -0.12, 1.1, 1.1, 0.8));
    for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.09, 10, 8), m, s * 0.08, -0.2, 0.02, 1.3, 0.5, 0.6));
    return g;
  },
  blush() {
    const g = new THREE.Group(), pink = new THREE.MeshBasicMaterial({ color: 0xff8aa8, transparent: true, opacity: 0.7 });
    for (const s of [-1, 1]) g.add(mesh(new THREE.CircleGeometry(0.07, 16), pink, s * 0.26, -0.13, 0.0));
    return g;
  },
  freckles() {
    const g = new THREE.Group(), dot = new THREE.MeshBasicMaterial({ color: 0x9a5a34 });
    for (const s of [-1, 1]) for (const [dx, dy] of [[0.18, -0.1], [0.24, -0.14], [0.3, -0.09], [0.22, -0.18]]) g.add(mesh(new THREE.CircleGeometry(0.015, 8), dot, s * dx, dy, 0.0));
    return g;
  },
};

export function buildFace(id, hairColor) {
  return FACE_BUILDERS[id]?.(null, hairColor) ?? null;
}

/**
 * KayKit capes hang straight down behind the legs and only follow the hips and spine, so a boot
 * swinging back while running pokes out through the bottom. Sweep the lower part of the cape
 * backwards (more the lower it goes), like a cape trailing behind you. Shared per geometry.
 */
const CAPE_SWEEP_FROM = 0.9, CAPE_SWEEP = 0.5;
const capeCache = new WeakMap();
export function sweptCape(geo) {
  if (!capeCache.has(geo)) {
    const out = geo.clone(), pos = out.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y >= CAPE_SWEEP_FROM) continue;
      const u = (CAPE_SWEEP_FROM - y) / CAPE_SWEEP_FROM; // 0 at the sweep line, 1 at the floor
      pos.setZ(i, pos.getZ(i) - CAPE_SWEEP * u ** 1.2);
    }
    pos.needsUpdate = true;
    out.computeBoundingBox();
    out.computeBoundingSphere();
    capeCache.set(geo, out);
  }
  return capeCache.get(geo);
}
