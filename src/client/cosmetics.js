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

// The outfit's own hair is part of its head mesh, so a new hairstyle would sit on top of it.
// Cut the top band of the head out (triangles entirely above the cut line); the hairstyle covers that band.
const hairlessCache = new WeakMap();
export function hairlessHead(geo) {
  if (hairlessCache.has(geo)) return hairlessCache.get(geo);
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const cut = max.y - (max.y - min.y) * 0.36;
  const pos = geo.attributes.position, index = geo.index?.array ?? null;
  const n = index ? index.length : pos.count;
  const keep = [];
  for (let t = 0; t < n; t += 3) {
    const a = index ? index[t] : t, b = index ? index[t + 1] : t + 1, c = index ? index[t + 2] : t + 2;
    if (pos.getY(a) > cut && pos.getY(b) > cut && pos.getY(c) > cut) continue;
    keep.push(a, b, c);
  }
  const out = new THREE.BufferGeometry();
  for (const name of Object.keys(geo.attributes)) out.setAttribute(name, geo.attributes[name]);
  out.setIndex(keep); // a plain array: three wraps it in a BufferAttribute (a raw typed array would leave the index empty)
  hairlessCache.set(geo, out);
  return out;
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
