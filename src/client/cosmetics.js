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
  cowboy() { // a wide brim curling up at the sides, a pinched crown and a dark band
    const g = new THREE.Group(), felt = mat(0x9a6434, { roughness: 0.8 });
    const brim = new THREE.LatheGeometry([[0.3, -0.06], [0.5, -0.07], [0.64, -0.04], [0.74, 0.04], [0.76, 0.07]].map(([x, y]) => new THREE.Vector2(x, y)), 32);
    g.add(mesh(brim, mat(0x9a6434, { roughness: 0.8, side: THREE.DoubleSide }), 0, 0, 0, 1, 1, 0.85));
    g.add(mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.4, 24), felt, 0, 0.13, 0, 1, 1, 0.9));
    g.add(mesh(new THREE.SphereGeometry(0.3, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), felt, 0, 0.33, 0, 1, 0.25, 0.9)); // the top, dented
    g.add(mesh(new THREE.CylinderGeometry(0.365, 0.37, 0.08, 24), mat(0x3a2414), 0, -0.01, 0, 1, 1, 0.9));
    g.rotation.x = -0.08;
    return g;
  },
  pirate() { // a black tricorn: three brims turned up into a triangle, gold trim, a little skull at the front
    const g = new THREE.Group(), black = mat(0x22202a, { roughness: 0.7, side: THREE.DoubleSide });
    g.add(mesh(new THREE.SphereGeometry(0.42, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), black, 0, -0.08, 0, 1, 1.05, 1)); // the crown, showing above the brims
    g.add(mesh(new THREE.CylinderGeometry(0.66, 0.56, 0.3, 3, 1, true), black, 0, 0.06, 0.03)); // three brims turned up (a point to the front)
    const trim = mesh(new THREE.TorusGeometry(0.66, 0.025, 4, 3), mat(0xe0b84a, { metalness: 0.6, roughness: 0.3 }), 0, 0.21, 0.03);
    trim.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    g.add(trim);
    const bone = mat(0xf3ead6);
    g.add(mesh(new THREE.SphereGeometry(0.075, 10, 8), bone, 0, 0.1, 0.5));
    for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.018, 6, 4), mat(0x111111), s * 0.028, 0.105, 0.57));
    return g;
  },
  beret() { // a soft red beret slouched to one side, with a little stalk on top
    const g = new THREE.Group(), red = mat(0xc8324a, { roughness: 0.9 });
    g.add(mesh(new THREE.SphereGeometry(0.46, 24, 12), red, 0.06, 0.06, 0, 1, 0.3, 1));
    g.add(mesh(new THREE.TorusGeometry(0.37, 0.035, 6, 28), mat(0x8a1e30, { roughness: 0.9 }), 0, -0.02, 0)).children.at(-1).rotation.x = Math.PI / 2;
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.08, 6), red, 0.06, 0.2, 0));
    g.rotation.z = -0.22;
    return g;
  },
  halo() { // a glowing gold ring floating above the head, bobbing gently
    const g = new THREE.Group();
    const ring = mesh(new THREE.TorusGeometry(0.3, 0.035, 10, 32), mat(0xffe27a, { emissive: 0xffc83a, emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.3 }), 0, 0.3, 0);
    ring.rotation.x = Math.PI / 2 - 0.15;
    ring.castShadow = false;
    g.add(ring);
    g.userData.update = (t) => { ring.position.y = 0.3 + Math.sin(t * 2) * 0.04; };
    return g;
  },
  unicorn() { // a pearly twisted horn with a gold spiral, and two little ears
    const g = new THREE.Group(), pearl = mat(0xfff4fb, { roughness: 0.3, emissive: 0x332233 });
    const horn = new THREE.Group();
    horn.add(mesh(new THREE.ConeGeometry(0.12, 0.6, 16), pearl, 0, 0.3, 0));
    for (let i = 0; i < 5; i++) { // the spiral: tilted rings, thinner as it rises
      const y = 0.06 + i * 0.1, r = 0.12 * (1 - y / 0.6) + 0.01;
      const ring = mesh(new THREE.TorusGeometry(r, 0.012, 4, 16), mat(0xffcf3f, { metalness: 0.7, roughness: 0.3 }), 0, y, 0);
      ring.rotation.set(Math.PI / 2 + 0.35, 0, 0);
      horn.add(ring);
    }
    horn.position.set(0, -0.04, 0.2);
    horn.rotation.x = 0.35;
    g.add(horn);
    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(0.08, 0.2, 8), mat(0xffffff), s * 0.3, 0.0, 0.0, 1, 1, 0.5);
      ear.rotation.z = -s * 0.45;
      g.add(ear, mesh(new THREE.ConeGeometry(0.045, 0.13, 8), mat(0xffb3d9), s * 0.29, -0.01, 0.025, 1, 1, 0.4));
      g.children.at(-1).rotation.z = -s * 0.45;
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
  angel() { // big white feathered wings: a scalloped wing with rows of feathers layered on it, gently beating
    const g = new THREE.Group();
    // one wing (pointing +x): up and out from the shoulder to the tip, then a scalloped trailing edge back in
    const wing = (k) => {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0.05 * k);
      sh.bezierCurveTo(0.3 * k, 0.45 * k, 0.75 * k, 0.6 * k, 1.0 * k, 0.55 * k); // the leading edge
      const tips = [[0.95, 0.25], [0.82, -0.02], [0.66, -0.24], [0.48, -0.4], [0.28, -0.42], [0.1, -0.25]];
      let [px, py] = [1.0, 0.55];
      for (const [x, y] of tips) { // each feather tip a rounded bump
        sh.quadraticCurveTo(((px + x) / 2 + 0.06) * k, ((py + y) / 2 - 0.06) * k, x * k, y * k);
        [px, py] = [x, y];
      }
      sh.lineTo(0, 0.05 * k);
      return new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 8 });
    };
    const layers = [[1, 0xffffff, 0], [0.72, 0xf2f4ff, -0.05], [0.45, 0xe6eaff, -0.1]]; // flight feathers, then coverts on top
    g.userData.wings = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      for (const [k, color, z] of layers) {
        const m = mesh(wing(k), mat(color, { roughness: 0.75 }), 0, 0.12 + (1 - k) * 0.12, z);
        m.scale.x = s;
        pivot.add(m);
      }
      pivot.userData.side = s;
      pivot.position.set(s * 0.12, 0.05, -0.08);
      g.add(pivot);
      g.userData.wings.push(pivot);
    }
    g.userData.update = (t) => { for (const w of g.userData.wings) w.rotation.y = w.userData.side * (0.25 + Math.sin(t * 2.5) * 0.15); };
    return g;
  },
  butterfly() { // bright orange butterfly wings with black edges and white spots, fluttering
    const g = new THREE.Group();
    const orange = mat(0xff9a2a, { side: THREE.DoubleSide, roughness: 0.5 }), black = mat(0x1a1a1a, { side: THREE.DoubleSide }), dot = mat(0xffffff, { side: THREE.DoubleSide });
    g.userData.wings = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      for (const [x, y, r, sx, sy, tilt] of [[0.42, 0.32, 0.4, 1.0, 0.75, 0.45], [0.3, -0.18, 0.27, 1.0, 0.85, -0.5]]) {
        const edge = mesh(new THREE.CircleGeometry(r, 24), black, s * x, y, 0, sx, sy, 1);
        edge.rotation.z = s * tilt;
        const fill = mesh(new THREE.CircleGeometry(r * 0.8, 24), orange, s * x, y, -0.006, sx, sy, 1);
        fill.rotation.z = s * tilt;
        pivot.add(edge, fill);
      }
      for (const [x, y] of [[0.62, 0.48], [0.7, 0.3], [0.5, 0.56]]) pivot.add(mesh(new THREE.CircleGeometry(0.04, 10), dot, s * x, y, -0.01));
      pivot.userData.side = s;
      pivot.position.z = -0.08;
      g.add(pivot);
      g.userData.wings.push(pivot);
    }
    g.add(mesh(new THREE.CapsuleGeometry(0.05, 0.4, 4, 8), black, 0, 0.1, -0.06)); // the body between them
    g.userData.update = (t) => { for (const w of g.userData.wings) w.rotation.y = w.userData.side * (0.5 + Math.sin(t * 7) * 0.45); };
    return g;
  },
  jetpack() { // two silver tanks with red caps, flickering flames out of the nozzles
    const g = new THREE.Group(), steel = mat(0xc8ccd4, { metalness: 0.7, roughness: 0.3 }), red = mat(0xd8302a, { metalness: 0.3, roughness: 0.4 });
    g.add(mesh(new THREE.BoxGeometry(0.42, 0.5, 0.12), mat(0x4a4f5a, { metalness: 0.5 }), 0, 0, -0.06));
    const flames = [];
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.CapsuleGeometry(0.15, 0.5, 6, 16), steel, s * 0.2, 0.0, -0.2));
      g.add(mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), red, s * 0.2, 0.25, -0.2, 1, 1.1, 1));
      g.add(mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.12, 12), mat(0x333338, { metalness: 0.6 }), s * 0.2, -0.45, -0.2));
      const flame = new THREE.Group();
      flame.add(mesh(new THREE.ConeGeometry(0.09, 0.3, 10), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.85 }), 0, -0.15, 0));
      flame.add(mesh(new THREE.ConeGeometry(0.05, 0.18, 8), new THREE.MeshBasicMaterial({ color: 0xfff27a }), 0, -0.1, 0));
      flame.children.forEach((c) => { c.rotation.x = Math.PI; c.castShadow = false; });
      flame.position.set(s * 0.2, -0.51, -0.2);
      g.add(flame);
      flames.push(flame);
    }
    g.userData.update = (t) => flames.forEach((f, i) => f.scale.set(1, 0.8 + Math.abs(Math.sin(t * 13 + i * 1.7)) * 0.5, 1));
    return g;
  },
  shell() { // a turtle shell: a green dome with darker plates and a light rim
    const g = new THREE.Group();
    const dome = mesh(new THREE.SphereGeometry(0.5, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x4f9a3a, { roughness: 0.6 }), 0, -0.05, -0.02, 0.95, 0.6, 1.15); // (scaled before it's turned: y = how far it bulges)
    dome.rotation.x = -Math.PI / 2;
    g.add(dome);
    const rim = mesh(new THREE.TorusGeometry(0.47, 0.05, 8, 32), mat(0xd8c07a, { roughness: 0.7 }), 0, -0.05, -0.03, 1, 1.2, 1);
    g.add(rim);
    const plate = mat(0x2f6a28, { roughness: 0.6 });
    const plates = [[0, 0.02, 0.18], [0, 0.32, 0.12], [0, -0.3, 0.12], [0.27, 0.16, 0.11], [-0.27, 0.16, 0.11], [0.27, -0.16, 0.11], [-0.27, -0.16, 0.11]];
    for (const [x, y, r] of plates) {
      const zOn = -0.02 - 0.3 * Math.sqrt(Math.max(0, 1 - (x / 0.475) ** 2 - (y / 0.575) ** 2)); // on the dome's surface
      const m = mesh(new THREE.CylinderGeometry(r, r, 0.03, 6), plate, x, y - 0.05, zOn - 0.005);
      m.rotation.x = Math.PI / 2;
      m.lookAt(new THREE.Vector3(x * 2.2, (y - 0.05) * 2, zOn - 0.3)); // face outward
      m.rotateX(Math.PI / 2);
      g.add(m);
    }
    return g;
  },
  balloon() { // a red heart balloon on a string, floating above your head and swaying
    const g = new THREE.Group();
    const heart = new THREE.Shape();
    heart.moveTo(0, -0.25);
    heart.bezierCurveTo(-0.05, -0.15, -0.3, -0.05, -0.3, 0.1);
    heart.bezierCurveTo(-0.3, 0.28, -0.08, 0.32, 0, 0.17);
    heart.bezierCurveTo(0.08, 0.32, 0.3, 0.28, 0.3, 0.1);
    heart.bezierCurveTo(0.3, -0.05, 0.05, -0.15, 0, -0.25);
    const geo = new THREE.ExtrudeGeometry(heart, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 4, curveSegments: 16 });
    geo.center();
    const sway = new THREE.Group();
    sway.add(mesh(geo, mat(0xff3a5a, { roughness: 0.25, metalness: 0.1 }), 0, 1.9, 0));
    sway.add(mesh(new THREE.ConeGeometry(0.04, 0.06, 8), mat(0xff3a5a), 0, 1.6, 0));
    sway.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.6, 4), mat(0xffffff), 0, 0.8, 0));
    sway.position.set(0.25, -0.2, -0.15);
    g.add(sway);
    g.userData.update = (t) => { sway.rotation.z = -0.15 + Math.sin(t * 1.3) * 0.08; sway.rotation.x = -0.12 + Math.sin(t * 0.9) * 0.05; };
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
  g.userData.shell = { down, open, r };
  return g;
}

const HAIR_BUILDERS = {
  bald() {
    return new THREE.Group(); // just the scalp
  },
  suave(m) { // slicked back, with a swoop at the front and a neat side part
    const g = new THREE.Group();
    g.add(hairShell(m, 0.56, 1.05, HEAD_R * 1.01));
    const quiff = mesh(new THREE.SphereGeometry(0.3, 18, 10), m, 0.08, -0.1, 0.28, 1.35, 0.55, 0.9);
    quiff.rotation.set(-0.35, 0, -0.15);
    g.add(quiff);
    g.add(mesh(new THREE.BoxGeometry(0.02, 0.05, 0.5), mat(0x000000, { transparent: true, opacity: 0.25 }), -0.2, 0.02, 0.0)).children.at(-1).rotation.z = 0.2;
    return g;
  },
  spiky(m) {
    const g = new THREE.Group();
    g.add(hairShell(m, 0.54));
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
    g.add(hairShell(m, 0.56)); // down over the ears, like the others
    g.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), mat(0xff6b8a), 0, -0.3, -0.5));
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.SphereGeometry(0.15 - i * 0.02, 12, 8), m, 0, -0.38 - i * 0.16, -0.6 - i * 0.04));
    return g;
  },
  pigtails(m) {
    const g = new THREE.Group();
    g.add(hairShell(m, 0.56)); // down over the ears, like the others
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), mat(0x7fd4ff), s * 0.52, -0.42, -0.08));
      for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(0.14 - i * 0.02, 12, 8), m, s * (0.6 + i * 0.05), -0.52 - i * 0.15, -0.1));
    }
    return g;
  },
  curly(m) {
    const g = new THREE.Group();
    g.add(hairShell(m, 0.56, 1.0, HEAD_R * 1.02));
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
    g.add(hairShell(m, 0.56)); // down over the ears, like the others
    g.add(mesh(new THREE.SphereGeometry(0.2, 14, 10), m, 0, 0.08, -0.12));
    return g;
  },
  pixie(m) { // a short crop, with soft locks swept over from a side part
    const g = new THREE.Group();
    g.add(hairShell(m, 0.5, 1.0, HEAD_R * 1.01));
    for (const [x, y, z, rz] of [[-0.05, -0.06, 0.3, -0.5], [0.12, -0.04, 0.2, -0.35], [0.22, -0.12, 0.06, -0.6]]) {
      const lock = mesh(new THREE.SphereGeometry(0.2, 14, 8), m, x, y, z, 1.2, 0.42, 0.8);
      lock.rotation.set(-0.3, 0.2, rz);
      g.add(lock);
    }
    return g;
  },
  wavy(m) { // long hair falling in waves down the back
    const g = new THREE.Group();
    g.add(hairShell(m, 0.62, 0.85));
    g.add(mesh(new THREE.SphereGeometry(0.4, 16, 10), m, 0, -0.72, -0.26, 1.1, 0.9, 0.5));
    for (let k = 0; k < 5; k++) { // five locks, each a column of curls swaying side to side
      const x0 = (k - 2) * 0.17, zb = -0.3 - Math.cos((k - 2) * 0.5) * 0.12;
      for (let i = 0; i < 4; i++) {
        const y = -0.78 - i * 0.15, x = x0 + Math.sin(i * 1.7 + k) * 0.04;
        g.add(mesh(new THREE.SphereGeometry(0.12 - i * 0.012, 10, 8), m, x * (1 - i * 0.05), y, zb + i * 0.02, 1, 1, 0.75));
      }
    }
    return g;
  },
  braid(m) { // one long plait down the back with a hair tie and a bow at the end
    const g = new THREE.Group();
    g.add(hairShell(m, 0.58));
    g.add(mesh(new THREE.SphereGeometry(0.16, 12, 8), m, 0, -0.62, -0.5, 1, 1, 0.9)); // gathered at the nape
    for (let i = 0; i < 7; i++) { // the plait: overlapping twists leaning left and right
      const s = i % 2 ? 1 : -1, w = 0.11 - i * 0.006;
      const twist = mesh(new THREE.SphereGeometry(w, 10, 8), m, s * 0.025, -0.76 - i * 0.1, -0.52 + i * 0.015, 1.05, 1.25, 0.85);
      twist.rotation.z = s * 0.5;
      g.add(twist);
    }
    const ribbon = mat(0xff6b8a, { roughness: 0.5 }), by = -1.48;
    g.add(mesh(new THREE.SphereGeometry(0.04, 8, 6), ribbon, 0, by, -0.42));
    for (const s of [-1, 1]) {
      const loop = mesh(new THREE.ConeGeometry(0.06, 0.13, 8), ribbon, s * 0.07, by, -0.42, 1, 1, 0.5);
      loop.rotation.z = s * Math.PI / 2;
      g.add(loop);
    }
    g.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), m, 0, by - 0.08, -0.42, 0.8, 1.2, 0.8)); // the tuft below the bow
    return g;
  },
  spacebuns(m) { // two round buns high on the head, each wrapped with a little band
    const g = new THREE.Group();
    g.add(hairShell(m, 0.56));
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.SphereGeometry(0.17, 14, 10), m, s * 0.3, -0.04, -0.06));
      const band = mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 16), mat(0x7fd4ff, { roughness: 0.5 }), s * 0.25, -0.12, -0.05);
      band.rotation.set(Math.PI / 2, 0, s * 0.6);
      g.add(band);
    }
    return g;
  },
  afro(m) { // a big round cloud of curls, set back on the head so the face shows through the front (left off under a hat)
    const g = new THREE.Group();
    g.add(hairShell(m, 0.56, 1.0, HEAD_R * 1.02));
    const geo = new THREE.SphereGeometry(0.56, 36, 24);
    const pos = geo.attributes.position, q = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { // bumpy all over: little curls
      q.fromBufferAttribute(pos, i);
      const k = 1 + 0.04 * Math.sin(q.x * 31) * Math.sin(q.y * 29) * Math.sin(q.z * 27);
      pos.setXYZ(i, q.x * k, q.y * k, q.z * k);
    }
    geo.computeVertexNormals();
    const puff = mesh(geo, m, 0, HEAD_Y + 0.22, -0.22, 1.1, 1, 1);
    puff.userData.crown = true;
    g.add(puff);
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
// Real skin (the peach swatches, 240+ red): SKIN also takes in the Knight's sandy blond hair (218,174,125).
const PEACH = (c) => SKIN(c) && c[0] >= 235;
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
// you pick in the mirror (buildBrows) drawn exactly where they were, each lying along the forehead.
const browCache = new WeakMap();
// One brow's shape: where it is, how long, and how it lies on the face — `yaw` follows the forehead
// curving back towards the temples (measured on the skin under it: some outfits' own brows are flat
// slabs that stick out), `roll` the brow's own slant (outer end up or down).
function browShape(geo, island, cols) {
  const pos = geo.attributes.position, idx = geo.index.array, v = new THREE.Vector3();
  const box = new THREE.Box3();
  let inner = null, outer = null; // the vertices nearest to / farthest from the middle of the face
  for (const t of island.tris) for (let k = 0; k < 3; k++) {
    v.fromBufferAttribute(pos, idx[t * 3 + k]);
    box.expandByPoint(v);
    if (!inner || Math.abs(v.x) < Math.abs(inner.x)) inner = v.clone();
    if (!outer || Math.abs(v.x) > Math.abs(outer.x)) outer = v.clone();
  }
  const side = Math.sign(island.x), dx = Math.abs(outer.x - inner.x);
  // how far forward the skin is at x, at the brow's height: the front-most skin vertex there (not hair or hood)
  const skin = (x) => {
    let z = -Infinity;
    for (let t = 0; t < idx.length / 3; t++) {
      if (!SKIN(cols[t])) continue;
      for (let k = 0; k < 3; k++) {
        v.fromBufferAttribute(pos, idx[t * 3 + k]);
        if (Math.abs(v.x - x) < 0.05 && v.y > box.min.y - 0.03 && v.y < box.max.y && v.z > z) z = v.z;
      }
    }
    return z;
  };
  const zIn = skin(inner.x), zOut = skin(outer.x), zMid = skin(island.x);
  const onSkin = [zIn, zOut, zMid].every((z) => z > box.min.z - 0.15 && z < box.max.z + 0.05);
  return {
    side,
    // half sunk into the skin, like the old one (no skin found, e.g. the Barbarian's: the slab's middle)
    pos: new THREE.Vector3(island.x, island.y, onSkin ? Math.max(zMid, (zIn + zOut) / 2) + 0.01 : (island.z + box.max.z) / 2 - 0.02),
    len: dx,
    height: box.max.y - box.min.y,
    yaw: side * (onSkin ? Math.atan2(zIn - zOut, dx) : 0.4), // the outer end curves back (0.4: these heads' usual curve)
    roll: side * Math.atan2(outer.y - inner.y, dx),
  };
}
/**
 * Where a face's eyes and cheeks really are (head-mesh space), so glasses, an eyepatch and blush sit ON
 * them: guessing from the head's box put them low or floating whenever the outfit's hair made it taller.
 * `eyes` = { y, z, spread } (the eyes' height, front and half-distance apart); `cheeks` = { x, y, z, yaw }
 * of the right cheek (the left mirrors it): where the skin is, and how far it turns to face sideways.
 */
const faceCache = new WeakMap();
export function faceSpotsOf(geo, image) {
  if (faceCache.has(geo)) return faceCache.get(geo);
  const cols = triangleColours(geo, image), list = islandsOf(geo, cols);
  const eyes = list.filter((i) => i.n < 150 && i.z > 0.3 && i.dark > i.n * 0.8 && Math.abs(i.x) > 0.1 && Math.abs(i.x) < 0.3);
  if (eyes.length < 2) { faceCache.set(geo, null); return null; }
  const eyeY = Math.min(...eyes.map((e) => e.y)), pair = eyes.filter((e) => Math.abs(e.y - eyeY) < 0.03);
  const pos = geo.attributes.position, idx = geo.index.array, v = new THREE.Vector3();
  // the front of the eyes, and of the skin at a point: the front-most vertex of those triangles near it
  let eyeZ = -Infinity;
  for (const e of pair) for (const t of e.tris) for (let k = 0; k < 3; k++) eyeZ = Math.max(eyeZ, v.fromBufferAttribute(pos, idx[t * 3 + k]).z);
  const skinZ = (x, y, r = 0.06) => {
    let z = -Infinity;
    for (let t = 0; t < idx.length / 3; t++) {
      if (!SKIN(cols[t])) continue;
      for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, idx[t * 3 + k]); if (Math.abs(v.x - x) < r && Math.abs(v.y - y) < r && v.z > z) z = v.z; }
    }
    return z;
  };
  const spread = Math.max(...pair.map((e) => Math.abs(e.x)));
  const cx = spread * 1.3, cy = eyeY - 0.13, cz = skinZ(cx, cy);
  const yaw = Math.atan2(skinZ(cx - 0.06, cy) - skinZ(cx + 0.06, cy), 0.12); // how much the cheek turns away
  const out = { eyes: { y: eyeY, z: eyeZ, spread }, cheeks: Number.isFinite(cz) ? { x: cx, y: cy, z: cz, yaw: Number.isFinite(yaw) ? yaw : 0.4 } : null };
  faceCache.set(geo, out);
  return out;
}

export function browsOf(geo, image) {
  if (browCache.has(geo)) return browCache.get(geo);
  const cols = triangleColours(geo, image), list = islandsOf(geo, cols);
  geo.computeBoundingBox();
  const H = geo.boundingBox.max.y - geo.boundingBox.min.y;
  // the eyes: a mirrored pair of small, dark islands on the front of the face
  const eyes = list.filter((i) => i.n < 150 && i.z > 0.3 && i.dark > i.n * 0.8 && Math.abs(i.x) > 0.1 && Math.abs(i.x) < 0.3);
  const eyeY = eyes.length ? Math.min(...eyes.map((e) => e.y)) : null; // the lowest pair (black brows look like eyes too: the Mage's)
  // the brows: small front islands a little above the eyes, out to the sides
  const brows = eyeY == null ? [] : list.filter((i) => i.n < 150 && i.z > 0.3 && Math.abs(i.x) > 0.12 && Math.abs(i.x) < 0.32 && i.y > eyeY + H * 0.05 && i.y < eyeY + H * 0.25);
  const tris = new Set(brows.flatMap((b) => b.tris));
  const out = brows.length === 2 ? {
    tris,
    each: brows.sort((a, b) => a.x - b.x).map((b) => browShape(geo, b, cols)),
  } : null;
  browCache.set(geo, out);
  return out;
}

// Some heads paint a lighter "skin" band where their own hair meets the forehead (the Knight's,
// under his helmet): above this height only the scalp ball and the new hair should show.
const SKIN_TOP_PER_OUTFIT = { Knight: 0.45 }; // (his blond hair passes for skin: below this it can't be hair)

/** The head's skin colour (the average of its skin triangles), and whether it's bald already (the Barbarian's). */
function skullLook(geo, cols, skull) {
  return { color: skinColourOf(geo, cols), own: skull.max.y > geo.boundingBox.max.y - 0.12 }; // its skin goes right up to the top
}

/** One even skin colour for a head: the average of its peach triangles (the texture shades them top to bottom). */
function skinColourOf(geo, cols) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let t = 0; t < geo.index.count / 3; t++) if (PEACH(cols[t])) { r += cols[t][0]; g += cols[t][1]; b += cols[t][2]; n++; }
  return n ? new THREE.Color().setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace) : new THREE.Color(0xf5b993);
}

/**
 * The texture paints a head's skin in a dozen shades (darker down the face, a pinker nose), which next to
 * the scalp and the new hair looked patchy. `smoothSkin` = the same head in two material groups: 0 = its
 * skin (drawn in one flat colour: `skinColour`), 1 = everything else (eyes, own hair: the texture).
 */
const smoothCache = new WeakMap();
export function smoothSkin(geo, image) {
  if (!smoothCache.has(geo)) {
    const cols = triangleColours(geo, image), idx = geo.index.array, skin = [], rest = [];
    for (let t = 0; t < idx.length; t += 3) (PEACH(cols[t / 3]) ? skin : rest).push(idx[t], idx[t + 1], idx[t + 2]);
    const out = new THREE.BufferGeometry();
    for (const name of Object.keys(geo.attributes)) out.setAttribute(name, geo.attributes[name]);
    out.setIndex([...skin, ...rest]);
    out.addGroup(0, skin.length, 0);
    out.addGroup(skin.length, rest.length, 1);
    smoothCache.set(geo, out);
  }
  return smoothCache.get(geo);
}
export function skinColour(geo, image) { return skinColourOf(geo, triangleColours(geo, image)); }

/**
 * A smaller, cuter nose: the KayKit nose is its own little skin island in the middle of the face.
 * Shrinks it towards where it meets the face — once per vertex buffer (every copy of the head shares it).
 */
const nosed = new WeakSet();
export function cuteNose(geo, image) {
  const pos = geo.attributes.position;
  if (!image || nosed.has(pos)) return;
  nosed.add(pos);
  const cols = triangleColours(geo, image), idx = geo.index.array;
  const nose = islandsOf(geo, cols).find((i) => i.n < 150 && Math.abs(i.x) < 0.05 && i.z > 0.38 && i.tris.every((t) => PEACH(cols[t])));
  if (!nose) return;
  const verts = new Set();
  for (const t of nose.tris) for (let k = 0; k < 3; k++) verts.add(idx[t * 3 + k]);
  let back = Infinity;
  for (const i of verts) back = Math.min(back, pos.getZ(i));
  for (const i of verts) {
    pos.setXYZ(i, nose.x + (pos.getX(i) - nose.x) * 0.72, nose.y + (pos.getY(i) - nose.y) * 0.72, back + (pos.getZ(i) - back) * 0.6);
  }
  pos.needsUpdate = true;
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
}

// Every outfit's head is the same head underneath, and the Barbarian's is bald: the top of HIS head is
// the scalp for everyone else's carved one. It fits exactly, faceted like the rest (a round ball on top
// looked like a separate ball — wider than the head, a mushroom from behind).
const CRANIUM_FROM = 0.15; // from this far up the head (0 = chin, 1 = top): down the back of the neck, where some hair hung low
const CRANIUM_IN = 0.99; // shrunk a touch towards the middle, so where a head has its own skin, that shows
const craniumCache = new WeakMap();
export function craniumOf(geo, image) {
  if (!craniumCache.has(geo)) {
    geo.computeBoundingBox();
    const bb = geo.boundingBox, from = bb.min.y + (bb.max.y - bb.min.y) * CRANIUM_FROM;
    const mid = bb.getCenter(new THREE.Vector3());
    const top = filterTriangles(geo, image, (t, col, [, y]) => SKIN(col) && y > from);
    // its own copy of the positions, pulled in a little
    const pos = geo.attributes.position.clone();
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, mid.x + (pos.getX(i) - mid.x) * CRANIUM_IN, mid.y + (pos.getY(i) - mid.y) * CRANIUM_IN, mid.z + (pos.getZ(i) - mid.z) * CRANIUM_IN);
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', pos);
    out.setAttribute('normal', geo.attributes.normal);
    out.setIndex([...top.index.array]);
    craniumCache.set(geo, out);
  }
  return craniumCache.get(geo);
}

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
      return (PEACH(col) && rel < (SKIN_TOP_PER_OUTFIT[outfit] ?? 1)) || face; // (not the Knight's sandy hair: see PEACH)
    });
    // the bounds of the skin that's left = the skull
    const pos = geo.attributes.position, idx = kept.index;
    const skull = new THREE.Box3();
    for (let i = 0; i < idx.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, idx.getX(i));
      skull.expandByPoint(v);
    }
    const c = skull.getCenter(new THREE.Vector3()), s = skull.getSize(new THREE.Vector3());
    const scalp = skullLook(geo, triangleColours(geo, image), skull);
    // new hair sits ON the skull (centred on it, its top just over where the old scalp ball's top was,
    // as wide as the skull) rather than on the old head mesh, whose hair mass made it float or left the scalp poking out
    scalp.hair = { x: c.x, y: c.y + s.y * 0.59 + 0.02, z: c.z, size: s.x };
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

/**
 * The top of a carved head: the Barbarian's bald cranium (`cranium`, see craniumOf) in this head's own
 * skin colour (`color`, times the skin `tone`). Its anchor puts it exactly where that head is.
 */
export function buildScalp(material, cranium) {
  const m = new THREE.Mesh(cranium, material); // (the face's own skin material: no seam where they meet)
  m.castShadow = true;
  return m;
}

/**
 * Hair that hugs the head: a hairstyle's round shell (hairShell) stood off the sides of these boxy heads
 * and let their corners poke through. Instead, take the skull itself (`cranium`, head-mesh space, see
 * craniumOf), push it out a little all round, and keep the part the shell covered: down to `down`, with the
 * face left open `open` either side of the front. Measured round the skull's dome ({ centre, r }, the same
 * ball the hairstyle's extras are placed round). Removes the round shells from `hair`; returns the new one
 * (attach it to the 'scalp' anchor), or null when the style has none.
 */
export function fitHair(hair, cranium, dome, underHat = false, bangs = 'none') {
  if (!hair || !cranium || !dome) return null;
  const shells = [];
  hair.traverse((o) => { if (o.userData.shell) shells.push(o); });
  if (!shells.length) return null;
  const { down, open, r: shellR } = shells[0].userData.shell;
  const material = shells[0].children.find((c) => c.isMesh)?.material ?? hair.children.find((c) => c.isMesh)?.material;
  for (const s of shells) s.removeFromParent();
  if (!material) return null;
  const c = dome.centre, lift = dome.r * (0.05 + (shellR / HEAD_R - 1) * 1.5);
  const src = cranium.attributes.position, nrm = cranium.attributes.normal, v = new THREE.Vector3();
  // where each corner sits round the dome: theta from the top (0) down, phi round from the face (0)
  const angles = (x, y, z) => {
    v.set(x, y, z).sub(c);
    return [Math.acos(THREE.MathUtils.clamp(v.y / (v.length() || 1), -1, 1)), Math.atan2(v.x, v.z)];
  };
  // The hair is what's left after cutting away (each a test that is >= 0 where the hair stays):
  const P = Math.PI, from = underHat ? P * 0.38 : 0, to = P * down, line = hairline(bangs, open);
  const keep = [
    (th) => to - th,                                              // below the hair's length
    (th) => th - from,                                            // under a hat's brim
    (th, ph) => Math.max(line(ph) - th, Math.abs(ph) - open),     // the face, up to the hairline (or bangs)
    (th, ph) => ((th - P * 0.545) / 0.27) ** 2 + ((Math.abs(ph) - 1.59) / 0.24) ** 2 - 1, // a round gap round each ear (they stick out of the skull there)
  ];
  // Cut each triangle against each test (Sutherland-Hodgman), so the edges are smooth lines along the
  // head instead of the stair-steps of whole triangles.
  const out = [], norms = [], idx = cranium.index.array;
  const corner = (i) => ({ p: new THREE.Vector3().fromBufferAttribute(src, i), n: new THREE.Vector3().fromBufferAttribute(nrm, i) });
  for (let t = 0; t < idx.length; t += 3) {
    let poly = [corner(idx[t]), corner(idx[t + 1]), corner(idx[t + 2])];
    for (const test of keep) {
      const g = poly.map((q) => test(...angles(q.p.x, q.p.y, q.p.z)));
      if (g.every((x) => x >= 0)) continue;
      if (g.every((x) => x < 0)) { poly = []; break; }
      const next = [];
      for (let i = 0; i < poly.length; i++) {
        const j = (i + 1) % poly.length, a = poly[i], b = poly[j];
        if (g[i] >= 0) next.push(a);
        if ((g[i] >= 0) !== (g[j] >= 0)) {
          const k = g[i] / (g[i] - g[j]);
          next.push({ p: a.p.clone().lerp(b.p, k), n: a.n.clone().lerp(b.n, k).normalize() });
        }
      }
      poly = next;
      if (poly.length < 3) break;
    }
    for (let i = 1; i + 1 < poly.length; i++) {
      for (const q of [poly[0], poly[i], poly[i + 1]]) {
        v.copy(q.p).sub(c); // pushed out from the dome's centre, off the skin
        const d = v.length() || 1;
        v.multiplyScalar(1 + lift / d).add(c);
        out.push(v.x, v.y, v.z);
        norms.push(q.n.x, q.n.y, q.n.z);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
  const m = new THREE.Mesh(geo, material.clone());
  m.material.side = THREE.DoubleSide; // (seen from below, the inside shows: hair, not a hole)
  m.castShadow = true;
  return m;
}

/**
 * The front hairline (BANGS in config.js): how far down the forehead the hair comes (theta, from the top
 * of the dome) at each angle `phi` across the face (0 = the middle, +-open = the temples).
 */
function hairline(bangs, open) {
  const P = Math.PI;
  switch (bangs) {
    case 'straight': return () => P * 0.33;                                                  // a blunt fringe, just above the brows
    case 'side': return (ph) => P * (0.24 + 0.1 * THREE.MathUtils.clamp(0.5 - ph / open, 0, 1)); // swept across, longer on one side
    case 'curtain': return (ph) => P * (0.19 + 0.13 * Math.min(1, Math.abs(ph) / (open * 0.8))); // parted in the middle, framing the face
    case 'choppy': return (ph) => P * (0.29 + 0.035 * Math.abs((((ph / open) * 3.5 % 2) + 2) % 2 - 1)); // short wispy points
    default: return () => P * 0.25;                                                           // none: the forehead shows
  }
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
    const TOP = 0.12, HEM = -0.56, R0 = 0.46, R1 = 0.76, pts = []; // (hips frame: the body ~1 wide; the ground is ~0.58 down)
    const rAt = (y) => { const t = (y - TOP) / (HEM - TOP); return R0 + (R1 - R0) * Math.pow(t, 0.8) + Math.sin(t * Math.PI) * 0.06; }; // a soft bell
    for (let i = 0; i <= 16; i++) { const y = TOP + (HEM - TOP) * (i / 16); pts.push(new THREE.Vector2(rAt(y), y)); }
    const bell = mesh(new THREE.LatheGeometry(pts, 40), silk, 0, 0, 0);
    skirt.add(bell);
    // a short overskirt in a lighter shade, scalloped at its hem, over the top of the bell
    const OVER = -0.14, over = [];
    for (let i = 0; i <= 12; i++) { const y = TOP + (OVER - TOP) * (i / 12); over.push(new THREE.Vector2(rAt(y) + 0.035, y)); }
    const overGeo = new THREE.LatheGeometry(over, 48), op = overGeo.attributes.position;
    for (let i = 0; i < op.count; i++) { // scallops: the hem dips between the swags
      const y = op.getY(i);
      if (y < TOP + (OVER - TOP) * 0.6) { const a = Math.atan2(op.getZ(i), op.getX(i)); op.setY(i, y - Math.abs(Math.sin(a * 3)) * 0.1 * ((TOP - y) / (TOP - OVER))); }
    }
    overGeo.computeVertexNormals();
    skirt.add(mesh(overGeo, mat(light, { roughness: 0.4, side: THREE.DoubleSide }), 0, 0, 0));
    // the petticoat: a white lace ruffle peeking out under the hem
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      skirt.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), lace, Math.cos(a) * (R1 + 0.01), HEM + 0.04, Math.sin(a) * (R1 + 0.01), 1.3, 0.55, 0.7)).children.at(-1).rotation.y = -a;
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
        const sparkle = mat(0xffffff, { emissive: 0xfff4d0, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.2 });
    for (let i = 0; i < 26; i++) { // sparkles scattered over the skirt
      const t = 0.5 + ((i * 0.37) % 0.45), a = i * 2.4, y = TOP + (HEM - TOP) * t, r = rAt(y) + 0.02; // over the bright skirt, below the overskirt
      skirt.add(mesh(new THREE.OctahedronGeometry(0.03, 0), sparkle, Math.cos(a) * r, y, Math.sin(a) * r));
    }
    skirt.userData.cone = { topY: TOP, hemY: HEM, rTop: R0, rBot: R1 }; // flared by the view so feet stay inside
    return { hips: skirt }; // (the bodice and puff sleeves: tailor.js)
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
    const hem = mesh(new THREE.CylinderGeometry(0.47, 0.7, 0.66, 20, 1, true), mat(0x6a35b8), 0, -0.24, 0); // (down to the ground: ~0.58 below the hips)
    hem.material.side = THREE.DoubleSide;
    hips.add(hem, mesh(new THREE.TorusGeometry(0.7, 0.035, 6, 24), gold, 0, -0.56, 0));
    hips.children.at(-1).rotation.x = Math.PI / 2;
    hips.userData.cone = { topY: 0.09, hemY: -0.57, rTop: 0.47, rBot: 0.7 };
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

/**
 * Eyebrows in the hair colour: a group of two, one per side (`userData.side` -1 / 1), each built round
 * its own middle so it can sit exactly on the outfit's own brow (views.js), or as a pair on the face
 * (face frame: head 1 wide, y 0 at the eyes).
 */
export function buildBrows(color, style = 'soft') {
  const g = new THREE.Group(), m = mat(color, { roughness: 0.8 });
  for (const s of [-1, 1]) { // s: the side; the brow's outer end is towards +s x
    const one = new THREE.Group();
    one.userData.side = s;
    one.position.set(s * 0.2, 0, 0.03);
    // a straight brow: thickness r, length len, `tilt` > 0 lifts the outer end, < 0 drops it (a scowl)
    const bar = (r, len, tilt, y = 0, x = 0) => {
      const brow = mesh(new THREE.CapsuleGeometry(r, len, 4, 8), m, x, y, 0);
      brow.rotation.z = Math.PI / 2 + s * tilt;
      one.add(brow);
    };
    if (style === 'thick') bar(0.045, 0.13, 0.08);
    else if (style === 'thin') bar(0.016, 0.13, 0.14);
    else if (style === 'angry') bar(0.032, 0.13, -0.42, -0.01); // inner end down: fierce
    else if (style === 'worried') bar(0.026, 0.12, 0.5, 0.01); // inner end up
    else if (style === 'arched') {
      const arc = mesh(new THREE.TorusGeometry(0.09, 0.022, 6, 14, Math.PI * 0.75), m, 0, -0.04, 0);
      arc.rotation.z = Math.PI * 0.125;
      one.add(arc);
    } else if (style === 'bushy') {
      for (let i = 0; i < 5; i++) one.add(mesh(new THREE.SphereGeometry(0.038 + (i % 2) * 0.008, 8, 6), m, s * (i * 0.035 - 0.07), Math.sin(i * 0.9) * 0.012, 0.005, 1.2, 0.9, 0.8));
    }
    else bar(0.028, 0.12, 0.12); // soft
    g.add(one);
  }
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
    if (o.userData.crown || o.position.y > HEAD_Y + Math.cos(BRIM) * HEAD_R) cut.push(o); // spikes, buns, top curls: under the hat
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
  hearts() { // heart-shaped red glasses
    const g = new THREE.Group(), red = mat(0xff3a6a, { roughness: 0.3 }), lens = mat(0xffb3cc, { transparent: true, opacity: 0.45, roughness: 0.1 });
    const heart = (r) => {
      const h = new THREE.Shape();
      h.moveTo(0, -r);
      h.bezierCurveTo(-r * 0.2, -r * 0.6, -r * 1.2, -r * 0.2, -r * 1.2, r * 0.4);
      h.bezierCurveTo(-r * 1.2, r * 1.1, -r * 0.3, r * 1.3, 0, r * 0.65);
      h.bezierCurveTo(r * 0.3, r * 1.3, r * 1.2, r * 1.1, r * 1.2, r * 0.4);
      h.bezierCurveTo(r * 1.2, -r * 0.2, r * 0.2, -r * 0.6, 0, -r);
      return h;
    };
    const rim = heart(0.11), hole = heart(0.075);
    rim.holes.push(hole);
    const frame = new THREE.ExtrudeGeometry(rim, { depth: 0.025, bevelEnabled: false, curveSegments: 12 });
    for (const s of [-1, 1]) {
      g.add(mesh(frame, red, s * 0.17, -0.01, 0.015));
      g.add(mesh(new THREE.ShapeGeometry(heart(0.08), 12), lens, s * 0.17, -0.01, 0.025));
    }
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), red, 0, 0.03, 0.025));
    return g;
  },
  goggles() { // brass aviator goggles with green lenses and a leather strap round the head
    const g = new THREE.Group(), brass = mat(0xc89a4a, { metalness: 0.7, roughness: 0.35 }), leather = mat(0x5a3a22, { roughness: 0.9 });
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.07, 20), brass, s * 0.17, 0, 0.03)).children.at(-1).rotation.x = Math.PI / 2;
      g.add(mesh(new THREE.CircleGeometry(0.095, 20), mat(0x6ad8b0, { roughness: 0.05, metalness: 0.4 }), s * 0.17, 0, 0.066));
      g.add(mesh(new THREE.TorusGeometry(0.105, 0.015, 6, 20), brass, s * 0.17, 0, 0.066));
    }
    g.add(mesh(new THREE.BoxGeometry(0.1, 0.035, 0.03), leather, 0, 0.0, 0.03));
    const strap = mesh(new THREE.TorusGeometry(0.5, 0.025, 4, 32), leather, 0, 0.0, -0.42, 0.97, 0.9, 1); // (snug round the head: x across, y (turned) front to back)
    strap.rotation.x = Math.PI / 2;
    g.add(strap);
    return g;
  },
  clown() { // a round red clown nose
    const g = new THREE.Group();
    g.add(mesh(new THREE.SphereGeometry(0.068, 16, 12), mat(0xff2a2a, { roughness: 0.25 }), 0, -0.075, 0.02)); // right over the nose
    return g;
  },
  whiskers(_, __, cheek) { // a pink cat nose and three whiskers on each cheek
    const g = new THREE.Group(), line = mat(0x2a2222);
    g.add(mesh(new THREE.SphereGeometry(0.04, 10, 8), mat(0xff8ab0, { roughness: 0.4 }), 0, -0.075, 0.0, 1.3, 0.8, 0.7)); // over the nose
    for (const s of [-1, 1]) for (const tilt of [0.2, 0, -0.2]) {
      const w = onCheek(mesh(new THREE.BoxGeometry(0.2, 0.012, 0.006), line), s, cheek, 0.02, 0.03 + tilt * 0.25);
      w.rotation.z = s * tilt;
      g.add(w);
    }
    return g;
  },
  goatee(_, hair) { // a little pointed chin beard, in your hair colour
    const g = new THREE.Group(), m = mat(hair, { roughness: 0.9 });
    // (the chin curves back under the mouth: the tuft hangs off the front of it, pointing down and a little out)
    g.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), m, 0, -0.26, -0.02, 1.1, 0.8, 0.8));
    const tuft = mesh(new THREE.ConeGeometry(0.07, 0.2, 10), m, 0, -0.35, -0.0, 1, 1, 0.75);
    tuft.rotation.x = Math.PI - 0.35;
    g.add(tuft);
    return g;
  },
  blush(_, __, cheek) {
    const g = new THREE.Group(), pink = new THREE.MeshBasicMaterial({ color: 0xff8aa8, transparent: true, opacity: 0.7, depthWrite: false });
    for (const s of [-1, 1]) g.add(onCheek(mesh(new THREE.CircleGeometry(0.075, 16), pink), s, cheek, 0, 0));
    return g;
  },
  freckles(_, __, cheek) {
    const g = new THREE.Group(), dot = new THREE.MeshBasicMaterial({ color: 0x9a5a34 });
    for (const s of [-1, 1]) for (const [dx, dy] of [[-0.06, 0.03], [0, -0.01], [0.06, 0.04], [-0.02, -0.05]]) g.add(onCheek(mesh(new THREE.CircleGeometry(0.015, 8), dot), s, cheek, dx, dy));
    return g;
  },
};

/**
 * Lay a flat thing on a cheek (face frame): `cheek` = { x, y, z, yaw } from faceSpotsOf, already in the
 * face frame; (dx, dy) moves it across the cheek. Without a measured cheek: the old spot.
 */
function onCheek(m, s, cheek, dx, dy) {
  const c = cheek ?? { x: 0.26, y: -0.13, z: 0, yaw: 0 };
  const x = c.x + dx;
  m.position.set(s * x, c.y + dy, c.z + 0.006 - Math.sin(c.yaw) * dx);
  m.rotation.y = s * c.yaw;
  return m;
}

/** A face extra (glasses, blush...). `cheek`: the cheek spot in the face frame (views.js, from faceSpotsOf). */
export function buildFace(id, hairColor, cheek) {
  return FACE_BUILDERS[id]?.(null, hairColor, cheek) ?? null;
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
