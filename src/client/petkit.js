// A small sculpting kit for the pets (client/pets.js): smooth tubes for bodies, necks, legs and
// tails; thin curved blades for feathers, ears, fur tufts and fins; glossy eyes; and bake(),
// which merges each moving part's pieces into one vertex-coloured mesh. Lots of pieces, few draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Soft lumps about `size` across, 0..1: a curly coat when used as a tube's bump. */
export function curly(p, size = 0.04) {
  const k = (Math.PI * 2) / size;
  const n = Math.sin(p.x * k + Math.sin(p.y * k * 0.8) * 1.7) * Math.sin(p.y * k + Math.sin(p.z * k * 0.9) * 1.7) * Math.sin(p.z * k + Math.sin(p.x * k * 0.7) * 1.7);
  return Math.pow(Math.abs(n), 0.6);
}

/**
 * Overlapping rows of feathers or scales over a tube (along, around = 0..1, tips towards along = 0),
 * like roof shingles: 0 at a feather's base, rising to 1 at its rounded free tip.
 */
export function scallops(along, around, rows, cols) {
  const r = along * rows, row = Math.floor(r);
  const c = around * cols + (row % 2) * 0.5, x = c - Math.floor(c) - 0.5;
  const y = r - row + (1 - 4 * x * x) * 0.45; // the tip bulges out in the middle of each feather
  return 1 - (y - Math.floor(y));
}

/** Every baked piece shares this material: colour lives in the vertices. */
export const SKIN = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, side: THREE.DoubleSide });

const _a = new THREE.Color(), _b = new THREE.Color();
const clamp01 = (x) => Math.max(0, Math.min(1, x));
/** Colour between a and b (hex numbers), t = 0..1. */
export const mix = (a, b, t) => _a.set(a).lerp(_b.set(b), clamp01(t)).getHex();
/** 0 below e0, 1 above e1, smooth between (e0 > e1 works too). */
export const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
/** A repeatable 0..1 "random" number for index i: every client draws the same pet. */
export const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
/** Slightly lighter or darker, for natural variation. */
export const shade = (c, k) => (k >= 0 ? mix(c, 0xffffff, k) : mix(c, 0x000000, -k));

const v3 = (a) => (a.isVector3 ? a : new THREE.Vector3(a[0], a[1], a[2]));

/** Catmull-Rom through rows of numbers, `steps` points per span. */
function spline(rows, steps) {
  if (steps <= 1 || rows.length < 3) return rows;
  const out = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const p0 = rows[Math.max(0, i - 1)], p1 = rows[i], p2 = rows[i + 1], p3 = rows[Math.min(rows.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push(p1.map((_, k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(rows[rows.length - 1]);
  return out;
}

function geometry(pos, col, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (col) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A smooth closed tube through rings [x, y, z, halfWidth, halfHeight?]. Width is across (+x where
 * the tube allows), height is "up" (for a tube along +z that is +y; for one going down, forward).
 * `paint(dir, along, point, around)` colours it: dir = outward unit vector, along = 0..1 from the
 * first ring, around = 0..1 starting at the top. `bump(point, dir, along)` pushes the surface out
 * (curly coats, feathers, scales; it also gets `around`); give it plenty of seg/steps. Returns a geometry; `geo.userData.at(along, around)`
 * gives { p, n } on the surface, for placing feathers and tufts.
 */
export function tube(rings, { seg = 12, steps = 3, paint, color, round = false, bump } = {}) {
  let rows = rings.map((r) => [r[0], r[1], r[2], r[3], r[4] ?? r[3]]);
  if (round) { // dome both ends, like a capsule, so a joint never shows a flat rim
    const dome = (a, b) => {
      const dir = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], l = Math.hypot(...dir) || 1, k = Math.min(a[3], a[4]) * 0.55 / l;
      return [a[0] + dir[0] * k, a[1] + dir[1] * k, a[2] + dir[2] * k, a[3] * 0.6, a[4] * 0.6];
    };
    rows = [dome(rows[0], rows[1]), ...rows, dome(rows[rows.length - 1], rows[rows.length - 2])];
  }
  const R = spline(rows, steps);
  const n = R.length;
  const P = R.map((r) => new THREE.Vector3(r[0], r[1], r[2]));
  const T = P.map((p, i) => new THREE.Vector3().subVectors(P[Math.min(n - 1, i + 1)], P[Math.max(0, i - 1)]).normalize());
  // frames carried along the tube (no sudden flips): S across, N = T x S "up"
  const S = [], N = [];
  let s = Math.abs(T[0].x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  for (let i = 0; i < n; i++) {
    if (i > 0) s = s.clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(T[i - 1], T[i]));
    s = s.clone().addScaledVector(T[i], -s.dot(T[i])).normalize();
    S.push(s);
    N.push(new THREE.Vector3().crossVectors(T[i], s));
  }
  const dist = [0];
  for (let i = 1; i < n; i++) dist.push(dist[i - 1] + P[i].distanceTo(P[i - 1]));
  const total = dist[n - 1] || 1;
  const pos = [], idx = [], col = paint || color != null ? [] : null; // unpainted: part() colours it
  const d = new THREE.Vector3(), q = new THREE.Vector3();
  const put = (pt, dir, along, around) => {
    pos.push(pt.x, pt.y, pt.z);
    if (!col) return;
    _a.set(paint ? paint(dir, along, pt, around) : color);
    col.push(_a.r, _a.g, _a.b);
  };
  for (let i = 0; i < n; i++) {
    const w = Math.max(0, R[i][3]), h = Math.max(0, R[i][4]);
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      d.copy(S[i]).multiplyScalar(Math.sin(a)).addScaledVector(N[i], Math.cos(a));
      q.copy(P[i]).addScaledVector(S[i], Math.sin(a) * w).addScaledVector(N[i], Math.cos(a) * h);
      if (bump) q.addScaledVector(d, bump(q, d, dist[i] / total, k / seg) * Math.min(1, w / 0.02, h / 0.02));
      put(q, d, dist[i] / total, k / seg);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < seg; k++) {
      const a = i * seg + k, b = i * seg + ((k + 1) % seg), c = a + seg, e = b + seg;
      idx.push(a, c, b, b, c, e);
    }
  }
  const c0 = pos.length / 3; put(P[0], T[0].clone().negate(), 0, 0);
  const c1 = pos.length / 3; put(P[n - 1], T[n - 1], 1, 0);
  for (let k = 0; k < seg; k++) {
    const k1 = (k + 1) % seg;
    idx.push(c0, k, k1);
    idx.push(c1, (n - 1) * seg + k1, (n - 1) * seg + k);
  }
  const geo = geometry(pos, col, idx);
  geo.userData.at = (along, around) => {
    const target = clamp01(along) * total;
    let i = 0;
    while (i < n - 2 && dist[i + 1] < target) i++;
    const f = clamp01((target - dist[i]) / ((dist[i + 1] - dist[i]) || 1));
    const lerp = (A) => A[i].clone().lerp(A[i + 1], f);
    const w = R[i][3] + (R[i + 1][3] - R[i][3]) * f, h = R[i][4] + (R[i + 1][4] - R[i][4]) * f;
    const a = around * Math.PI * 2, Si = lerp(S).normalize(), Ni = lerp(N).normalize();
    const p = lerp(P).addScaledVector(Si, Math.sin(a) * w).addScaledVector(Ni, Math.cos(a) * h);
    const nrm = Si.clone().multiplyScalar(Math.sin(a) / Math.max(w, 1e-4)).addScaledVector(Ni, Math.cos(a) / Math.max(h, 1e-4)).normalize();
    return { p, n: nrm, t: lerp(T).normalize() };
  };
  return geo;
}

/**
 * A thin curved blade: base at the origin, tip at +z, `width` across x, facing +y. Feathers,
 * ears, fur tufts, fins, wing membranes. widest = where along it is widest (0..1), round < 1
 * gives a blunter outline, base = width kept at the root (ears), bend curls the tip towards +y,
 * cup curls the edges towards +y. `paint(across -1..1, along 0..1)`.
 */
export function leaf(len, width, { widest = 0.5, round = 0.7, base = 0, bend = 0, cup = 0, twist = 0, nu = 5, ns = 2, paint, color } = {}) {
  const q = Math.log(0.5) / Math.log(Math.min(0.95, Math.max(0.05, widest)));
  const pos = [], idx = [], cols = ns * 2 + 1, col = paint || color != null ? [] : null;
  for (let iu = 0; iu <= nu; iu++) {
    const u = iu / nu;
    const hw = (width / 2) * Math.max(base * (1 - u), Math.pow(Math.sin(Math.PI * Math.pow(u, q)), round));
    const tw = twist * u, ct = Math.cos(tw), st = Math.sin(tw);
    for (let is = -ns; is <= ns; is++) {
      const s = is / ns, x = s * hw;
      const y = bend * len * u * u + cup * (x * x) / Math.max(1e-4, width / 2);
      pos.push(x * ct - y * st, x * st + y * ct, u * len);
      if (!col) continue;
      _a.set(paint ? paint(s, u) : color);
      col.push(_a.r, _a.g, _a.b);
    }
  }
  for (let iu = 0; iu < nu; iu++) {
    for (let is = 0; is < cols - 1; is++) {
      const a = iu * cols + is, b = a + 1, c = a + cols, e = c + 1;
      idx.push(a, c, b, b, c, e);
    }
  }
  return geometry(pos, col, idx);
}

const _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
/** Turn obj so its +z points along `dir` and its +y faces `face` as nearly as it can. */
export function aim(obj, dir, face = [0, 1, 0]) {
  _z.copy(v3(dir)).normalize();
  _y.copy(v3(face));
  _x.crossVectors(_y, _z);
  if (_x.lengthSq() < 1e-8) { // face is along dir: any sideways will do
    _y.set(Math.abs(_z.z) > 0.9 ? 1 : 0, 0, Math.abs(_z.z) > 0.9 ? 0 : 1);
    _x.crossVectors(_y, _z);
  }
  _x.normalize();
  _y.crossVectors(_z, _x);
  obj.quaternion.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
  return obj;
}

/**
 * Add a piece. `look` is a hex colour (baked into SKIN; ignored if the geometry is already
 * painted) or a material of its own (kept as a separate mesh: eyes, glass, glow).
 */
export function part(parent, geo, look, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const own = look?.isMaterial;
  const m = new THREE.Mesh(geo, own ? look : SKIN);
  if (!own) m.userData.paint = look ?? 0xffffff;
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  parent.add(m);
  return m;
}

/** A piece at `pos`, its +z along `dir`, its face (+y) towards `face`. */
export function placed(parent, geo, look, pos, dir, face) {
  const m = part(parent, geo, look, ...v3(pos).toArray());
  return aim(m, dir, face);
}

/** A ball (for joints, toes, noses). */
export const ball = (r, seg = 10) => new THREE.SphereGeometry(r, seg, Math.max(6, (seg * 0.7) | 0));

/**
 * Merge every SKIN piece into one mesh per group (head, each leg, each wing... stay separate so
 * they can still move). Run once a model is finished.
 */
export function bake(root) {
  const visit = (g) => {
    const geos = [];
    for (const c of [...g.children]) {
      if (c.isMesh && c.material === SKIN && c.children.length === 0) {
        c.updateMatrix();
        const geo = c.geometry.clone();
        for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'color'].includes(name)) geo.deleteAttribute(name);
        if (!geo.index) geo.setIndex([...Array(geo.attributes.position.count).keys()]);
        if (!geo.attributes.color) {
          _a.set(c.userData.paint);
          const cnt = geo.attributes.position.count, arr = new Float32Array(cnt * 3);
          for (let i = 0; i < cnt; i++) arr.set([_a.r, _a.g, _a.b], i * 3);
          geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
        }
        geo.applyMatrix4(c.matrix);
        geos.push(geo);
        c.removeFromParent();
        c.geometry.dispose();
      } else visit(c);
    }
    if (geos.length) {
      const mesh = new THREE.Mesh(geos.length > 1 ? mergeGeometries(geos) : geos[0], SKIN);
      mesh.castShadow = true;
      g.add(mesh);
      if (geos.length > 1) for (const geo of geos) geo.dispose();
    }
  };
  visit(root);
}

// ------------------------------------------------------------------ eyes

const irisMats = new Map();
const glossy = (c) => {
  if (!irisMats.has(c)) irisMats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.12, metalness: 0.05 }));
  return irisMats.get(c);
};
const GLINT = new THREE.MeshBasicMaterial({ color: 0xffffff });

/**
 * A glossy eye at `pos` looking along `dir`. iris colour; pupil 'round', 'slit' (cats, foxes),
 * 'bar' (frogs, goats) or 'none' (dark eyes); lid = colour of a thin rim of skin around it.
 */
export function eye(parent, pos, dir, r, { iris = 0x2a1810, pupil = 'round', lid, lidWidth = 0.22, glint = true } = {}) {
  const g = new THREE.Group();
  g.position.copy(v3(pos));
  aim(g, dir, [0, 1, 0]);
  parent.add(g);
  g.add(new THREE.Mesh(ball(r, 14), glossy(iris)));
  if (pupil !== 'none') {
    const [sx, sy] = pupil === 'slit' ? [0.28, 0.95] : pupil === 'bar' ? [0.72, 0.42] : [0.62, 0.62];
    const p = new THREE.Mesh(ball(r * 0.98, 12), glossy(0x050505));
    p.scale.set(sx, sy, 0.5);
    p.position.z = r * 0.55;
    g.add(p);
  }
  if (glint) {
    const s = new THREE.Mesh(ball(r * 0.16, 6), GLINT);
    s.position.set(r * 0.32, r * 0.36, r * 0.86);
    g.add(s);
  }
  if (lid != null) {
    const ring = new THREE.TorusGeometry(r * 0.96, r * lidWidth, 6, 18);
    const m = part(parent, ring, lid);
    m.position.copy(v3(pos)).addScaledVector(v3(dir).clone().normalize(), r * 0.18);
    aim(m, dir, [0, 1, 0]);
  }
  return g;
}

/** Count the triangles in a model (for keeping pets light). */
export function triangles(root) {
  let n = 0;
  root.traverse((o) => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  return n;
}
