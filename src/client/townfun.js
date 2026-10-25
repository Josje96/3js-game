// Pebble Town's festive touches, all up in the air or drifting about so nobody bumps into them:
// a maypole on the fountain with bunting out to every lamp post (and lamp to lamp round the square),
// butterflies over the flower beds, and smoke curling up from the cottage chimneys.
// Few draw calls: all the flags are one instanced mesh, all the butterflies another.
import * as THREE from 'three';
import { CELL } from '../shared/config.js';
import { glowTexture } from './effects.js';

/** The town's flags change with the season: spring a rainbow, summer orange, yellow and blue, autumn red, orange, yellow and brown, winter red and green. */
export const FLAG_SEASONS = {
  spring: [0xff4a4a, 0xff9a2a, 0xffd23f, 0x5fcf4a, 0x3f9aff, 0x9a6aff],
  summer: [0xff8a1a, 0xffd23f, 0x2f7fff, 0xffb02a, 0x6ac0ff],
  autumn: [0xc8302a, 0xe8721a, 0xf0b030, 0x7a4a24],
  winter: [0xd02028, 0x2a8a3a],
};
const FLAG_COLORS = FLAG_SEASONS.spring;
const BUTTERFLY_COLORS = [0xffb03a, 0x7fd8ff, 0xff8ad8, 0xfff27a, 0xffffff, 0xb48cff];
const MAYPOLE_TOP = 9;
const LAMP_TOP = 3.9;

/** Adds everything to `group`; returns { update(time) } for the moving parts and setSeason(id) for the bunting's colours. */
export function buildTownFun(layout, group, rand) {
  const parts = [];
  const lamps = layout.props.filter((p) => p.build === 'lamp');
  const fountain = layout.props.find((p) => p.build === 'fountain');

  // --- a mosaic inlaid in the paving round the fountain: two rings of tiles and blue spokes
  if (fountain) {
    const tiles = [];
    for (const [r, n, colors] of [[6.0, 40, [0xc8643a, 0xf0e2c0]], [7.1, 48, [0xf0e2c0, 0x4f7fc0]]]) {
      for (let i = 0; i < n; i++) tiles.push({ a: (i / n) * Math.PI * 2, r, color: colors[i % 2], w: (2 * Math.PI * r) / n * 0.86, d: 0.8 });
    }
    for (let i = 0; i < 8; i++) for (let k = 0; k < 4; k++) tiles.push({ a: (i / 8) * Math.PI * 2 + Math.PI / 8, r: 2.7 + k * 0.75, color: k % 2 ? 0xf0e2c0 : 0x4f7fc0, w: 0.55, d: 0.6 });
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.04, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), tiles.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    tiles.forEach((t, i) => {
      q.setFromAxisAngle(up, -t.a + Math.PI / 2);
      inst.setMatrixAt(i, m.compose(new THREE.Vector3(fountain.x + Math.cos(t.a) * t.r, 0.07, fountain.z + Math.sin(t.a) * t.r), q, new THREE.Vector3(t.w, 1, t.d)));
      inst.setColorAt(i, new THREE.Color(t.color));
    });
    inst.receiveShadow = true;
    group.add(inst);
  }

  // --- bunting: strings of little pennants
  const strings = [];
  if (fountain) {
    const mp = { x: fountain.x, z: fountain.z - 4.6 }; // just north of the fountain, between its benches
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, MAYPOLE_TOP, 8), new THREE.MeshStandardMaterial({ color: 0xf4efe6 }));
    pole.position.set(mp.x, MAYPOLE_TOP / 2, mp.z);
    group.add(pole);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffb020, emissiveIntensity: 0.6, metalness: 0.4 }));
    star.position.set(mp.x, MAYPOLE_TOP + 0.3, mp.z);
    group.add(star);
    parts.push((t) => { star.rotation.y = t * 0.8; });
    for (const l of lamps) strings.push([{ x: mp.x, y: MAYPOLE_TOP, z: mp.z }, { x: l.x, y: LAMP_TOP, z: l.z }]);
  }
  // lamp to lamp round the square: each lamp to its nearest neighbours (not across the whole town)
  const seen = new Set();
  for (const a of lamps) {
    const near = lamps.filter((b) => b !== a).sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z)).slice(0, 2);
    for (const b of near) {
      const key = [a.id, b.id].sort().join();
      if (seen.has(key) || Math.hypot(b.x - a.x, b.z - a.z) > 45) continue;
      seen.add(key);
      strings.push([{ x: a.x, y: LAMP_TOP, z: a.z }, { x: b.x, y: LAMP_TOP, z: b.z }]);
    }
  }
  const flags = [];
  const linePts = [];
  let setColors = () => {};
  for (const [a, b] of strings) {
    const len = Math.hypot(b.x - a.x, b.z - a.z), sag = len * 0.05, n = Math.floor(len / 1.1);
    const at = (u) => new THREE.Vector3(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u - sag * 4 * u * (1 - u), a.z + (b.z - a.z) * u);
    for (let i = 0; i < 24; i++) linePts.push(at(i / 24), at((i + 1) / 24));
    const rot = Math.atan2(-(b.z - a.z), b.x - a.x);
    const start = flags.length; // (k counts up one flag at a time, so winter's two colours alternate along every string)
    for (let i = 1; i < n; i++) { const k = start + i; flags.push({ p: at(i / n), rot, k, color: FLAG_COLORS[k % FLAG_COLORS.length] }); }
  }
  if (linePts.length) group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(linePts), new THREE.LineBasicMaterial({ color: 0x6b4a2c })));
  if (flags.length) {
    const tri = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.32, 0, 0), new THREE.Vector3(0.32, 0, 0), new THREE.Vector3(0, -0.6, 0)]);
    tri.computeVertexNormals();
    const inst = new THREE.InstancedMesh(tri, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), flags.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    flags.forEach((f, i) => {
      inst.setMatrixAt(i, m.compose(f.p, q.setFromAxisAngle(up, f.rot), one));
      inst.setColorAt(i, new THREE.Color(f.color));
    });
    group.add(inst);
    setColors = (colors) => {
      flags.forEach((f, i) => inst.setColorAt(i, new THREE.Color(colors[f.k % colors.length])));
      inst.instanceColor.needsUpdate = true;
    };
    // a gentle flutter: the whole set sways a touch in the breeze
    parts.push((t) => {
      flags.forEach((f, i) => {
        const sway = Math.sin(t * 2.2 + i * 0.7) * 0.25;
        q.setFromAxisAngle(up, f.rot).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), sway));
        inst.setMatrixAt(i, m.compose(f.p, q, one));
      });
      inst.instanceMatrix.needsUpdate = true;
    });
  }

  // --- butterflies over the flower beds (two wings each, hinged at the body)
  const beds = layout.decor.filter((d) => d.kind === 'flowers');
  const flies = [];
  beds.forEach((b, i) => { for (let k = 0; k < 2; k++) flies.push({ c: b, ph: rand(i, k, 'bfly') * 10, color: BUTTERFLY_COLORS[(i * 2 + k) % BUTTERFLY_COLORS.length] }); });
  if (flies.length) {
    const wing = new THREE.CircleGeometry(0.16, 8);
    wing.translate(0.16, 0, 0); // hinge on the body
    wing.rotateX(-Math.PI / 2);
    const inst = new THREE.InstancedMesh(wing, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), flies.length * 2);
    flies.forEach((f, i) => { inst.setColorAt(i * 2, new THREE.Color(f.color)); inst.setColorAt(i * 2 + 1, new THREE.Color(f.color)); });
    const d = new THREE.Object3D();
    group.add(inst);
    parts.push((t) => {
      flies.forEach((f, i) => {
        const s = t * 0.6 + f.ph;
        d.position.set(f.c.x + Math.sin(s) * 2.6, 1.1 + Math.sin(s * 2.3) * 0.45, f.c.z + Math.cos(s * 0.8) * 2.6);
        const heading = Math.atan2(Math.cos(s), -0.8 * Math.sin(s * 0.8));
        const flap = Math.sin(t * 18 + f.ph) * 0.9;
        for (const side of [1, -1]) {
          d.rotation.set(0, heading, 0);
          d.rotateZ(side * flap);
          d.scale.set(side, 1, 1);
          d.updateMatrix();
          inst.setMatrixAt(i * 2 + (side > 0 ? 0 : 1), d.matrix);
        }
      });
      inst.instanceMatrix.needsUpdate = true;
    });
  }

  // --- chimney smoke: soft grey puffs rising and fading from every cottage
  const chimneys = [];
  for (let cz = 0; cz < layout.h; cz++) {
    for (let cx = 0; cx < layout.w; cx++) {
      if (layout.cell(cx, cz) !== 'E' || layout.cell(cx - 1, cz) === 'E' || layout.cell(cx, cz - 1) === 'E') continue;
      chimneys.push({ x: (cx + 1) * CELL + 0.9 * 1.9, y: 5.3 * 1.9, z: (cz + 1) * CELL - 0.5 * 1.9 }); // matches makeCottage
    }
  }
  const puffs = [];
  chimneys.forEach((c, ci) => {
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xe4e0dc, transparent: true, opacity: 0, depthWrite: false }));
      group.add(s);
      puffs.push({ s, c, k: i / 5 + ci * 0.13 });
    }
  });
  if (puffs.length) {
    parts.push((t) => {
      for (const p of puffs) {
        const u = (t * 0.18 + p.k) % 1;
        p.s.position.set(p.c.x + Math.sin(u * 4 + p.k * 9) * 0.35 + u * 1.2, p.c.y + u * 4.5, p.c.z + Math.cos(u * 3 + p.k * 7) * 0.3);
        p.s.scale.setScalar(0.8 + u * 2.2);
        p.s.material.opacity = 0.55 * Math.sin(u * Math.PI);
      }
    });
  }

  let season = null;
  return {
    update: (t) => { for (const f of parts) f(t); },
    setSeason: (id) => { if (id !== season && FLAG_SEASONS[id]) { season = id; setColors(FLAG_SEASONS[id]); } },
  };
}
