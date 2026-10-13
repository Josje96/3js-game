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

/**
 * Halloween costumes and Santa's suit (views.js SEASON_WEAR / forceWear): a hat-frame piece
 * (head 1 wide, y 0 on top) and the clothes it goes with ({ jacket, legs, extra } like CLOTHES).
 */
export const COSTUMES = {
  witch:   { name: 'Witch',        clothes: { jacket: 0x3a2350, legs: 0x2a1a3a, extra: 'robe' } },
  pumpkin: { name: 'Pumpkin head', clothes: { jacket: 0x2f6a2a, legs: 0x2a4a22 } },
  ghost:   { name: 'Ghost',        clothes: { jacket: 0xf4f4f8, legs: 0xf4f4f8, extra: 'gown' } },
  devil:   { name: 'Little devil', clothes: { jacket: 0xb8202a, legs: 0x8a1a20 } },
  vampire: { name: 'Vampire',      clothes: { jacket: 0x141018, legs: 0x141018, extra: 'bowtie' } },
  cat:     { name: 'Black cat',    clothes: { jacket: 0x1a1a20, legs: 0x1a1a20 } },
  mummy:   { name: 'Mummy',        clothes: { jacket: 0xe8e0c8, legs: 0xd8cfb4 } },
  skeleton: { name: 'Skeleton',    clothes: { jacket: 0x1a1a1a, legs: 0x1a1a1a } },
  pirate:  { name: 'Pirate',       clothes: { jacket: 0x8a1a1a, legs: 0x2a2a2a, extra: 'sash' } },
  santa:   { name: 'Santa',        clothes: { jacket: 0xc8202a, legs: 0xc8202a, extra: 'coat' } },
  grandma: { name: 'Grandma',      clothes: { jacket: 0xd8c8f4, legs: 0xf6c8dc, extra: 'gown' } }, // pastel lavender and pink
};
export const HALLOWEEN_COSTUMES = ['witch', 'pumpkin', 'ghost', 'devil', 'vampire', 'cat', 'mummy', 'skeleton', 'pirate'];

export function buildCostumeHat(kind) {
  const g = new THREE.Group();
  if (kind === 'witch') { // a tall crooked hat with a wide brim and a buckled band
    const black = mat(0x1e1828, { roughness: 0.8 });
    g.add(mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.04, 28), black, 0, -0.12, 0));
    const cone = mesh(new THREE.ConeGeometry(0.42, 1.0, 20, 4), black, 0, 0.36, 0);
    const pos = cone.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) + 0.5; pos.setX(i, pos.getX(i) - y * y * 0.35); } // the tip flops over
    cone.geometry.computeVertexNormals();
    g.add(cone);
    g.add(mesh(new THREE.CylinderGeometry(0.405, 0.42, 0.1, 20), mat(0x7a3fb8), 0, -0.05, 0));
    g.add(mesh(new THREE.BoxGeometry(0.14, 0.12, 0.03), mat(0xffd23f, { metalness: 0.7, roughness: 0.3 }), 0, -0.05, 0.41));
  } else if (kind === 'pumpkin') { // a carved jack-o'-lantern over the whole head, glowing inside
    const orange = mat(0xf07a1a, { roughness: 0.55 });
    for (let i = 0; i < 8; i++) { // ribs
      const a = (i / 8) * Math.PI * 2;
      g.add(mesh(new THREE.SphereGeometry(0.36, 14, 12), orange, Math.sin(a) * 0.3, -0.48, Math.cos(a) * 0.3, 0.75, 1.15, 0.75));
    }
    g.add(mesh(new THREE.SphereGeometry(0.6, 20, 14), orange, 0, -0.48, 0, 1.05, 0.92, 1.05));
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.22, 8), mat(0x4a6a2a), 0.02, 0.1, 0)).children.at(-1).rotation.z = 0.3;
    const glow = new THREE.MeshBasicMaterial({ color: 0xffd040 });
    const face = (shape, x, y, s, rz = 0) => { const m = new THREE.Mesh(shape, glow); m.position.set(x, y, 0.6); m.scale.setScalar(s); m.rotation.z = rz; g.add(m); };
    const tri = new THREE.CircleGeometry(1, 3);
    face(tri, -0.2, -0.38, 0.11, Math.PI / 2);
    face(tri, 0.2, -0.38, 0.11, Math.PI / 2);
    face(tri, 0, -0.5, 0.06, -Math.PI / 2);
    const grin = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.26, 16, 1, Math.PI * 1.15, Math.PI * 0.7), glow);
    grin.position.set(0, -0.48, 0.6);
    g.add(grin);
  } else if (kind === 'ghost') { // a white sheet over the head with two dark eye holes
    const sheet = mat(0xf6f6fa, { roughness: 0.9 });
    g.add(mesh(new THREE.SphereGeometry(0.63, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), sheet, 0, -0.5, 0));
    const lowered = mesh(new THREE.CylinderGeometry(0.6, 0.66, 0.5, 22, 1, true), sheet, 0, -0.95, 0);
    lowered.material = sheet.clone();
    lowered.material.side = THREE.DoubleSide;
    g.add(lowered);
    for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(0x101018), s * 0.17, -0.45, 0.58, 1, 1.4, 0.4));
  } else if (kind === 'devil') { // little red horns and a pointy tail is all a devil needs
    const red = mat(0xd02a2a, { roughness: 0.4 });
    for (const s of [-1, 1]) {
      const horn = mesh(new THREE.ConeGeometry(0.09, 0.32, 10), red, s * 0.25, 0.05, 0.05);
      horn.rotation.z = -s * 0.35;
      g.add(horn);
    }
  } else if (kind === 'vampire') { // slicked-back black hair with a widow's peak, and a tall red-lined collar
    const black = mat(0x141018, { roughness: 0.5 });
    g.add(mesh(new THREE.SphereGeometry(0.6, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), black, 0, -0.5, -0.02));
    g.add(mesh(new THREE.ConeGeometry(0.08, 0.22, 4), black, 0, -0.08, 0.5)).children.at(-1).rotation.x = Math.PI * 0.95; // the peak
    for (const s of [-1, 1]) {
      const collar = mesh(new THREE.PlaneGeometry(0.5, 0.7), mat(0x8a0a1a, { side: THREE.DoubleSide, roughness: 0.6 }), s * 0.32, -0.95, -0.15);
      collar.rotation.set(-0.2, s * 0.7, 0);
      g.add(collar);
    }
  } else if (kind === 'cat') { // black cat ears with pink insides
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.ConeGeometry(0.16, 0.34, 4), mat(0x1a1a20), s * 0.3, 0.05, 0, 1, 1, 0.5)).children.at(-1).rotation.z = -s * 0.3;
      g.add(mesh(new THREE.ConeGeometry(0.09, 0.22, 4), mat(0xff9ab8), s * 0.3, 0.03, 0.05, 1, 1, 0.3)).children.at(-1).rotation.z = -s * 0.3;
    }
  } else if (kind === 'mummy') { // a head wrapped in bandages, two dark eyes peeping out
    const wrap = mat(0xe8e0c8, { roughness: 1 });
    g.add(mesh(new THREE.SphereGeometry(0.61, 18, 12), wrap, 0, -0.5, 0));
    for (let i = 0; i < 6; i++) g.add(mesh(new THREE.TorusGeometry(0.6 - Math.abs(i - 2.5) * 0.06, 0.035, 4, 24), mat(0xd8cfb4), 0, -0.2 - i * 0.12, 0, 1, 1, 1)).children.at(-1).rotation.set(Math.PI / 2 + (i % 2 ? 0.15 : -0.12), 0, 0);
    for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(0x101010), s * 0.18, -0.45, 0.56, 1.2, 0.7, 0.4));
  } else if (kind === 'skeleton') { // a skull mask
    const bone = mat(0xf2ede0, { roughness: 0.7 }), dark = mat(0x101010);
    g.add(mesh(new THREE.SphereGeometry(0.6, 18, 12), bone, 0, -0.5, 0.02));
    for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.13, 10, 8), dark, s * 0.2, -0.45, 0.52, 1, 1.1, 0.5));
    g.add(mesh(new THREE.ConeGeometry(0.06, 0.1, 3), dark, 0, -0.62, 0.58)).children.at(-1).rotation.x = Math.PI;
    for (let i = 0; i < 5; i++) g.add(mesh(new THREE.BoxGeometry(0.05, 0.08, 0.02), dark, -0.12 + i * 0.06, -0.8, 0.5));
  } else if (kind === 'pirate') { // a red bandana with its knot, and an eyepatch
    g.add(mesh(new THREE.SphereGeometry(0.6, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), mat(0xc0202a, { roughness: 0.8 }), 0, -0.48, 0));
    for (let i = 0; i < 9; i++) g.add(mesh(new THREE.SphereGeometry(0.03, 6, 4), mat(0xffffff), Math.sin(i * 0.7) * 0.5, -0.2 + (i % 3) * 0.08, Math.cos(i * 0.7) * 0.45));
    g.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(0xc0202a), 0.35, -0.3, -0.45));
    g.add(mesh(new THREE.CircleGeometry(0.1, 12), mat(0x101010), 0.19, -0.45, 0.6));
    g.add(mesh(new THREE.TorusGeometry(0.6, 0.012, 4, 30), mat(0x101010), 0, -0.4, 0)).children.at(-1).rotation.set(Math.PI / 2 - 0.35, 0.3, 0);
  } else if (kind === 'grandma') { // a crown of spring flowers in her curls
    g.add(HAT_BUILDERS.flowers());
  } else if (kind === 'santa') { // a floppy red hat with a white fur brim and a pompom
    const red = mat(0xc8202a, { roughness: 0.8 }), fur = mat(0xf8f8f4, { roughness: 1 });
    const cone = mesh(new THREE.ConeGeometry(0.5, 0.95, 20, 4), red, 0, 0.3, -0.02);
    const pos = cone.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) + 0.48; pos.setZ(i, pos.getZ(i) - y * y * 0.45); pos.setY(i, pos.getY(i) - y * y * 0.18); }
    cone.geometry.computeVertexNormals();
    g.add(cone);
    g.add(mesh(new THREE.TorusGeometry(0.5, 0.1, 10, 28), fur, 0, -0.17, 0, 1, 1, 1.4)).children.at(-1).rotation.x = Math.PI / 2;
    g.add(mesh(new THREE.IcosahedronGeometry(0.12, 1), fur, 0, 0.42, -0.62));
  }
  return g;
}

/**
 * Winter wear (views.js SEASON_WEAR): a knitted bobble hat (hat frame: head 1 wide, y 0 on top)
 * and a striped scarf (front frame, like the tie). `color` = the knit's main colour.
 */
export function buildWinterWear(color) {
  const knit = mat(color, { roughness: 1 }), cream = mat(0xf4efe4, { roughness: 1 });
  const hat = new THREE.Group();
  hat.add(mesh(new THREE.SphereGeometry(0.62, 24, 12, 0, Math.PI * 2, 0, 1.25), knit, 0, -0.5, 0));
  // a turned-up ribbed brim hugging the bottom edge, and a stripe higher up
  hat.add(mesh(new THREE.TorusGeometry(0.58, 0.07, 8, 28), cream, 0, -0.29, 0, 1, 1, 1.7)).children.at(-1).rotation.x = Math.PI / 2;
  hat.add(mesh(new THREE.TorusGeometry(0.43, 0.03, 6, 24), cream, 0, -0.05, 0)).children.at(-1).rotation.x = Math.PI / 2;
  hat.add(mesh(new THREE.IcosahedronGeometry(0.13, 1), cream, 0, 0.15, 0)); // the bobble
  const scarf = new THREE.Group();
  const wrap = mesh(new THREE.TorusGeometry(0.36, 0.1, 8, 24), knit, 0, 0.33, -0.42);
  wrap.rotation.x = Math.PI / 2 + 0.18;
  scarf.add(wrap);
  for (const [x, y, len, rz] of [[0.13, 0.1, 0.42, 0.12], [0.0, 0.14, 0.3, -0.08]]) { // two ends hanging down the front
    const end = new THREE.Group();
    end.add(mesh(new THREE.BoxGeometry(0.15, len, 0.05), knit, 0, -len / 2, 0));
    for (const k of [0.3, 0.6]) end.add(mesh(new THREE.BoxGeometry(0.155, 0.04, 0.055), cream, 0, -len * k, 0));
    for (let i = 0; i < 4; i++) end.add(mesh(new THREE.BoxGeometry(0.02, 0.06, 0.02), cream, -0.055 + i * 0.037, -len - 0.03, 0)); // fringe
    end.position.set(x, y + 0.14, 0.05 + (x ? 0.02 : 0));
    end.rotation.z = rz;
    scarf.add(end);
  }
  return { hat, scarf };
}

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
  RogueHooded: 0.555, // (the head mesh is named without the underscore)
};

/** The separate pieces (islands) of a mesh: union-find over its vertices, joining ones at the same point. */
function islandsOf(geo, cols) {
  const pos = geo.attributes.position, idx = geo.index.array;
  const parent = new Int32Array(pos.count).map((_, i) => i);
  const find = (a) => { while (parent[a] !== a) a = parent[a] = parent[parent[a]]; return a; };
  const join = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
  const at = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    if (at.has(k)) join(i, at.get(k)); else at.set(k, i);
  }
  for (let t = 0; t < idx.length; t += 3) { join(idx[t], idx[t + 1]); join(idx[t], idx[t + 2]); }
  const islands = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const r = find(idx[t]), isl = islands.get(r) ?? { tris: [], x: 0, y: 0, z: 0, dark: 0 };
    for (let k = 0; k < 3; k++) { isl.x += pos.getX(idx[t + k]) / 3; isl.y += pos.getY(idx[t + k]) / 3; isl.z += pos.getZ(idx[t + k]) / 3; }
    if (Math.max(...cols[t / 3]) < 70) isl.dark++;
    isl.tris.push(t / 3);
    islands.set(r, isl);
  }
  return [...islands.values()].map((i) => ({ ...i, x: i.x / i.tris.length, y: i.y / i.tris.length, z: i.z / i.tris.length, n: i.tris.length }));
}

// The outfit's own eyebrows are two little raised shapes (islands in the head mesh) sitting just
// above the two eyes (the dark islands). browsOf finds them, so they can be cut out and the brows
// you pick in the mirror (buildBrows) drawn exactly where they were, instead of floating over them.
const browCache = new WeakMap();
export function browsOf(geo, image) {
  if (browCache.has(geo)) return browCache.get(geo);
  const list = islandsOf(geo, triangleColours(geo, image));
  geo.computeBoundingBox();
  const H = geo.boundingBox.max.y - geo.boundingBox.min.y;
  // the eyes: a mirrored pair of small, dark islands on the front of the face
  const eyes = list.filter((i) => i.n < 150 && i.z > 0.3 && i.dark > i.n * 0.8 && Math.abs(i.x) > 0.1 && Math.abs(i.x) < 0.3);
  const eyeY = eyes.length ? Math.max(...eyes.map((e) => e.y)) : null;
  // the brows: small front islands a little above the eyes, out to the sides
  const brows = eyeY == null ? [] : list.filter((i) => i.n < 150 && i.z > 0.3 && Math.abs(i.x) > 0.12 && Math.abs(i.x) < 0.32 && i.y > eyeY + H * 0.05 && i.y < eyeY + H * 0.25);
  const out = brows.length === 2 ? {
    tris: new Set(brows.flatMap((b) => b.tris)),
    centre: new THREE.Vector3(0, (brows[0].y + brows[1].y) / 2, (brows[0].z + brows[1].z) / 2),
  } : null;
  browCache.set(geo, out);
  return out;
}

// Some heads paint a lighter "skin" band where their own hair meets the forehead (the Knight's,
// under his helmet): above this height only the scalp ball and the new hair should show.
const SKIN_TOP_PER_OUTFIT = { Knight: 0.6 };

const hairlessCache = new WeakMap();
export function hairlessHead(geo, image, outfit) {
  if (!hairlessCache.has(geo)) {
    geo.computeBoundingBox();
    const bb = geo.boundingBox, height = bb.max.y - bb.min.y;
    const hi = FACE_HI_PER_OUTFIT[outfit] ?? FACE_HI;
    const brows = browsOf(geo, image);
    const kept = filterTriangles(geo, image, (t, col, [x, y, z]) => {
      const rel = (y - bb.min.y) / height;
      if (brows?.tris.has(t)) return false; // the outfit's own brows: yours are drawn instead
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

/** The head with its own hair, minus its own eyebrows (they're replaced by the mirror's, see browsOf). */
const browlessCache = new WeakMap();
export function browlessHead(geo, image) {
  const brows = browsOf(geo, image);
  if (!brows) return geo;
  if (!browlessCache.has(geo)) browlessCache.set(geo, filterTriangles(geo, image, (t) => !brows.tris.has(t)));
  return browlessCache.get(geo);
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
/**
 * Just the body itself, without the outfit's extras stuck on it (belt buckles, strap buckles,
 * pouches, a fur collar): under fancy clothes they'd show as odd cloth-coloured squares and lumps.
 */
const bareCache = new WeakMap();
export function bareBody(geo, image) {
  if (!bareCache.has(geo)) {
    const islands = islandsOf(geo, triangleColours(geo, image));
    const main = islands.reduce((a, b) => (b.n > a.n ? b : a));
    const keep = new Set(main.tris);
    bareCache.set(geo, filterTriangles(geo, image, (t) => keep.has(t)));
  }
  return bareCache.get(geo);
}

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
/**
 * A piece of cloth lying ON the chest (the 'front' frame: body 1 wide, the chest's front at z ~0.06):
 * a strip of a cylinder wrapped round the torso like the armor's breastplate, so its edges follow the
 * body instead of sticking out like a flat board. `w` wide (along the surface), `h` tall, centred at
 * height `y` and `x` across; `lift` = how far out from the chest.
 */
function chestPanel(w, h, y, m, lift = 0.005, x = 0) {
  const R = 0.5 + lift, half = w / 2 / R, at = x / R;
  const geo = new THREE.CylinderGeometry(R, R * 0.94, h, 10, 1, true, at - half, half * 2);
  const out = mesh(geo, m, 0, y, -0.44);
  out.material = m.clone();
  out.material.side = THREE.DoubleSide;
  return out;
}

const CLOTHES_BUILDERS = {
  tie(tieColor = 0xc0303a) {
    const g = new THREE.Group();
    g.add(chestPanel(0.24, 0.42, 0.12, mat(0xf4f4f4), 0.004)); // the shirt front, lying on the chest
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.07, 0.04), mat(tieColor), 0, 0.27, 0.075)); // the knot
    const tie = mesh(new THREE.ConeGeometry(0.06, 0.42, 4), mat(tieColor, { roughness: 0.4 }), 0, 0.04, 0.07, 1, 1, 0.35);
    tie.rotation.set(Math.PI, Math.PI / 4, 0);
    g.add(tie);
    return { front: g };
  },
  bowtie(tieColor = 0x111111) {
    const g = new THREE.Group();
    g.add(chestPanel(0.24, 0.42, 0.12, mat(0xffffff), 0.004));
    for (const s of [-1, 1]) g.add(mesh(new THREE.ConeGeometry(0.06, 0.12, 4), mat(tieColor), s * 0.06, 0.26, 0.08, 1, 1, 0.5)).children.at(-1).rotation.z = s * Math.PI / 2;
    for (const y of [0.1, -0.02]) g.add(mesh(new THREE.SphereGeometry(0.018, 6, 4), mat(0x111111), 0, y, 0.07));
    return { front: g };
  },
  vest() { // a waistcoat: two panels wrapped round the chest, open in a V at the top, brass buttons
    const g = new THREE.Group(), cloth = mat(0x8a5a34, { roughness: 0.8 });
    for (const s of [-1, 1]) g.add(chestPanel(0.26, 0.5, 0.0, cloth, 0.006, s * 0.13));
    for (const y of [0.12, 0.0, -0.12]) g.add(mesh(new THREE.SphereGeometry(0.022, 6, 4), mat(0xffcf3f, { metalness: 0.6 }), 0.035, y, 0.07));
    return { front: g };
  },
  gown(_, color = 0xd8649f) { // a princess ball gown: a big poofy bell skirt, draped swags with roses, a petticoat ruffle, sparkles, puff sleeves
    const base = new THREE.Color(color), light = base.clone().lerp(new THREE.Color(0xffffff), 0.2).getHex(), deep = base.clone().multiplyScalar(0.72).getHex();
    const silk = mat(color, { roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide }), lace = mat(0xfffaf4, { roughness: 0.8 }), trim = mat(light, { roughness: 0.4 });
    const skirt = new THREE.Group();
    // the bell: a smooth lathe from the waist, puffing out and down to a wide hem
    const TOP = 0.05, HEM = -1.08, R0 = 0.42, R1 = 1.22, pts = [];
    const rAt = (y) => { const t = (y - TOP) / (HEM - TOP); return R0 + (R1 - R0) * Math.pow(Math.sin(t * Math.PI / 2), 0.62) + Math.sin(t * Math.PI) * 0.05; };
    for (let i = 0; i <= 16; i++) { const y = TOP + (HEM - TOP) * (i / 16); pts.push(new THREE.Vector2(rAt(y), y)); }
    const bell = mesh(new THREE.LatheGeometry(pts, 40), silk, 0, 0, 0);
    skirt.add(bell);
    // a short overskirt in a lighter shade, scalloped at its hem, over the top of the bell
    const OVER = -0.32, over = [];
    for (let i = 0; i <= 12; i++) { const y = TOP + (OVER - TOP) * (i / 12); over.push(new THREE.Vector2(rAt(y) + 0.035, y)); }
    const overGeo = new THREE.LatheGeometry(over, 48), op = overGeo.attributes.position;
    for (let i = 0; i < op.count; i++) { // scallops: the hem dips between the swags
      const y = op.getY(i);
      if (y < TOP + (OVER - TOP) * 0.6) { const a = Math.atan2(op.getZ(i), op.getX(i)); op.setY(i, y - Math.abs(Math.sin(a * 3)) * 0.16 * ((TOP - y) / (TOP - OVER))); }
    }
    overGeo.computeVertexNormals();
    skirt.add(mesh(overGeo, mat(light, { roughness: 0.4, side: THREE.DoubleSide }), 0, 0, 0));
    // the petticoat: a white lace ruffle peeking out under the hem
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      skirt.add(mesh(new THREE.SphereGeometry(0.13, 8, 6), lace, Math.cos(a) * (R1 + 0.02), HEM + 0.02, Math.sin(a) * (R1 + 0.02), 1.3, 0.55, 0.7)).children.at(-1).rotation.y = -a;
    }
    // a rose (in the dress's deep shade) at each point of the overskirt's scallops
    for (let i = 0; i < 6; i++) {
      const ra = (i / 6) * Math.PI * 2, rr = rAt(OVER) + 0.06;
      const rose = new THREE.Group();
      rose.position.set(Math.cos(ra) * rr, OVER + 0.02, Math.sin(ra) * rr);
      rose.add(mesh(new THREE.SphereGeometry(0.075, 8, 6), mat(deep, { roughness: 0.5 }), 0, 0, 0));
      for (let k = 0; k < 5; k++) rose.add(mesh(new THREE.SphereGeometry(0.05, 6, 5), trim, Math.cos(k * 1.26) * 0.04, 0, Math.sin(k * 1.26) * 0.04));
      rose.add(mesh(new THREE.SphereGeometry(0.04, 6, 5), mat(0xfff0f6), 0, 0.02, 0));
      skirt.add(rose);
    }
    skirt.add(mesh(new THREE.TorusGeometry(R0 + 0.01, 0.045, 6, 28), trim, 0, TOP, 0)).children.at(-1).rotation.x = Math.PI / 2; // the waistband
    const sparkle = mat(0xffffff, { emissive: 0xfff4d0, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.2 });
    for (let i = 0; i < 26; i++) { // sparkles scattered over the skirt
      const t = 0.5 + ((i * 0.37) % 0.45), a = i * 2.4, y = TOP + (HEM - TOP) * t, r = rAt(y) + 0.02; // over the bright skirt, below the overskirt
      skirt.add(mesh(new THREE.OctahedronGeometry(0.03, 0), sparkle, Math.cos(a) * r, y, Math.sin(a) * r));
    }
    skirt.userData.cone = { topY: TOP, hemY: HEM, rTop: R0, rBot: R1 }; // flared by the view so feet stay inside
    // the bodice: a lace sweetheart neckline, a pearl necklace and a bow
    const front = new THREE.Group();
    for (const s of [-1, 1]) front.add(mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 12, Math.PI), lace, s * 0.1, 0.24, 0.0)).children.at(-1).rotation.z = Math.PI;
    for (let i = 0; i < 9; i++) { const a = Math.PI * (1.15 + i * 0.0875); front.add(mesh(new THREE.SphereGeometry(0.022, 6, 5), mat(0xfffaf0, { roughness: 0.15, metalness: 0.2 }), Math.cos(a) * 0.2, 0.42 + Math.sin(a) * 0.12, 0.02)); }
    for (const s of [-1, 1]) front.add(mesh(new THREE.ConeGeometry(0.06, 0.12, 4), trim, s * 0.06, -0.16, 0.04)).children.at(-1).rotation.z = s * Math.PI / 2;
    front.add(mesh(new THREE.SphereGeometry(0.03, 6, 5), trim, 0, -0.16, 0.05));
    // puff sleeves on the shoulders
    const puff = () => {
      const g = new THREE.Group();
      g.add(mesh(new THREE.SphereGeometry(0.5, 14, 10), silk, 0, -0.05, 0, 1.05, 0.85, 1.05));
      for (let k = 0; k < 6; k++) g.add(mesh(new THREE.BoxGeometry(0.03, 0.75, 0.06), trim, Math.cos(k * 1.05) * 0.5, -0.05, Math.sin(k * 1.05) * 0.5)).children.at(-1).rotation.y = -k * 1.05; // gathers
      g.add(mesh(new THREE.TorusGeometry(0.42, 0.05, 6, 18), lace, 0, -0.38, 0)).children.at(-1).rotation.x = Math.PI / 2;
      return g;
    };
    return { front, hips: skirt, shoulderl: puff(), shoulderr: puff() };
  },
  sash() { // a pirate captain: a gold sash round the body from shoulder to hip, brass buttons and a lace jabot
    const g = new THREE.Group();
    const sash = mesh(new THREE.TorusGeometry(0.5, 0.045, 6, 28), mat(0xe0b84a, { metalness: 0.4, roughness: 0.4 }), 0, 0.02, -0.44, 1, 1, 1.15);
    sash.rotation.set(Math.PI / 2, 0.75, 0);
    g.add(sash);
    for (const y of [0.15, 0.0, -0.15]) for (const x of [-0.12, 0.12]) g.add(mesh(new THREE.SphereGeometry(0.025, 6, 4), mat(0xd9a93a, { metalness: 0.7 }), x, y, 0.06));
    g.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), mat(0xffffff), 0, 0.24, 0.06, 1, 0.8, 0.5));
    return { front: g };
  },
  apron() { // chef whites: a big white apron, double row of buttons, a red neckerchief
    const g = new THREE.Group();
    g.add(chestPanel(0.46, 0.5, -0.12, mat(0xffffff, { roughness: 0.9 }), 0.01));
    for (const y of [0.22, 0.12]) for (const x of [-0.08, 0.08]) g.add(mesh(new THREE.SphereGeometry(0.02, 6, 4), mat(0xdddddd), x, y, 0.07));
    g.add(mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12), mat(0xd8302a), 0, 0.27, 0.04, 1, 0.5, 1));
    return { front: g };
  },
  bib() { // farmer overalls: a denim bib with two straps and a patch pocket
    const g = new THREE.Group(), denim = mat(0x3b5f9a, { roughness: 0.9 });
    g.add(chestPanel(0.34, 0.28, -0.08, denim, 0.008));
    for (const s of [-1, 1]) g.add(chestPanel(0.06, 0.3, 0.18, denim, 0.008, s * 0.13));
    g.add(chestPanel(0.12, 0.1, -0.06, mat(0x2f4f80), 0.02));
    for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.025, 6, 4), mat(0xd9a93a, { metalness: 0.7 }), s * 0.13, 0.05, 0.075));
    return { front: g };
  },
  coat() { // winter coat (views.js SEASON_WEAR): fur down the front, toggle buttons, a short flared hem
    const front = new THREE.Group(), fur = mat(0xf6f2ea, { roughness: 1 }), toggle = mat(0x6b4a2c, { roughness: 0.6 });
    for (let i = 0; i < 6; i++) front.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), fur, 0, 0.22 - i * 0.09, 0.01, 1, 1, 0.6));
    for (const y of [0.13, 0.0, -0.13]) front.add(mesh(new THREE.CapsuleGeometry(0.018, 0.07, 3, 6), toggle, 0.09, y, 0.035)).children.at(-1).rotation.z = Math.PI / 2;
    const hips = new THREE.Group();
    const hem = mesh(new THREE.CylinderGeometry(0.47, 0.6, 0.38, 20, 1, true), mat(0x8a3a3a, { roughness: 0.9 }), 0, -0.14, 0);
    hem.material.side = THREE.DoubleSide;
    hips.add(hem, mesh(new THREE.TorusGeometry(0.6, 0.06, 6, 24), fur, 0, -0.33, 0));
    hips.children.at(-1).rotation.x = Math.PI / 2;
    hips.userData.cone = { topY: 0.05, hemY: -0.33, rTop: 0.47, rBot: 0.6 };
    return { front, hips };
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
  const built = CLOTHES_BUILDERS[extra]?.(tie, color) ?? {};
  if (color != null && (extra === 'robe' || extra === 'coat')) built.hips?.children[0]?.material.color.set(color); // (a gown is built in its colour)
  return built;
}

/** Eyebrows in the hair colour, drawn over the face's own (face frame: head 1 wide, y 0 at the eyes). */
export function buildBrows(color, style = 'soft') {
  const g = new THREE.Group(), m = mat(color, { roughness: 0.8 });
  // a straight brow: thickness r, length len, `tilt` > 0 lifts the outer ends, < 0 drops them (a scowl)
  const bar = (r, len, tilt, y = 0) => {
    for (const s of [-1, 1]) {
      const brow = mesh(new THREE.CapsuleGeometry(r, len, 4, 8), m, s * 0.2, y, 0.03);
      brow.rotation.z = Math.PI / 2 + s * tilt;
      g.add(brow);
    }
  };
  if (style === 'thick') bar(0.045, 0.13, 0.08);
  else if (style === 'thin') bar(0.016, 0.13, 0.14);
  else if (style === 'angry') bar(0.032, 0.13, -0.42, -0.01); // inner ends down: fierce
  else if (style === 'worried') bar(0.026, 0.12, 0.5, 0.01); // inner ends up
  else if (style === 'arched') {
    for (const s of [-1, 1]) {
      const arc = mesh(new THREE.TorusGeometry(0.09, 0.022, 6, 14, Math.PI * 0.75), m, s * 0.2, -0.04, 0.03);
      arc.rotation.z = Math.PI * 0.125;
      g.add(arc);
    }
  } else if (style === 'bushy') {
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) g.add(mesh(new THREE.SphereGeometry(0.038 + (i % 2) * 0.008, 8, 6), m, s * (0.13 + i * 0.035), Math.sin(i * 0.9) * 0.012, 0.035, 1.2, 0.9, 0.8));
  } else if (style === 'unibrow') {
    const brow = mesh(new THREE.CapsuleGeometry(0.032, 0.42, 4, 8), m, 0, 0, 0.035);
    brow.rotation.z = Math.PI / 2;
    g.add(brow);
  } else bar(0.028, 0.12, 0.12); // soft
  return g;
}

/**
 * A hairstyle. `underHat`: tucked under a hat — the crown of it (top, spikes, bun, mohawk, top curls)
 * is left off so nothing pokes through the hat; the sides, fringe and anything hanging down stay.
 */
export function buildHair(style, color, underHat = false) {
  const b = HAIR_BUILDERS[style];
  const g = b ? b(mat(color, { roughness: 0.8 })) : null;
  if (!g || !underHat) return g;
  const BRIM = Math.PI * 0.38; // how far down from the top of the head a hat covers
  const cut = [];
  g.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.parameters;
    if (o.geometry.type === 'SphereGeometry' && p.radius > HEAD_R * 0.9 && Math.abs(o.position.y - HEAD_Y) < 0.01) { // the shell round the head
      const t0 = p.thetaStart, t1 = p.thetaStart + p.thetaLength;
      if (t1 <= BRIM + 0.02) { cut.push(o); return; } // the cap: all under the hat
      if (t0 < BRIM) o.geometry = new THREE.SphereGeometry(p.radius, p.widthSegments, p.heightSegments, p.phiStart, p.phiLength, BRIM, t1 - BRIM);
      return;
    }
    if (o.position.y > HEAD_Y + Math.cos(BRIM) * HEAD_R) cut.push(o); // spikes, buns, top curls: under the hat
  });
  for (const o of cut) o.removeFromParent();
  return g;
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
