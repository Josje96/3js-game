// Fancy clothes, tailored: one smooth fitted torso with slim sleeves, skinned to the character's own
// skeleton (so it bends with the arms and body), with each outfit's details lying on its surface.
// The KayKit bodies under them are sculpted (padded armour, hoods, belts, bracers, a pear-shaped belly):
// recoloured, they looked like puffy winter jackets. views.js setClothes hides the body and the arms
// (all but the hands) and puts this on instead.
//
// Everything is built in the body's bind space: the character stands in a T-pose facing +z, its left
// arm out along +x; y = 0 at the feet. Bone bind positions come from the skeleton, so it fits any rig
// of the same shape.
import * as THREE from 'three';

// the torso: a rounded-box cross-section (superellipse, exponent N) at each height: [y, half-width, half-depth, z centre]
const N = 2.6;
const PROFILE = [
  [0.38, 0.37, 0.31, 0.0],
  [0.5, 0.38, 0.32, 0.01],
  [0.65, 0.37, 0.315, 0.01],
  [0.8, 0.345, 0.3, 0.0],
  [0.95, 0.315, 0.28, 0.0],
  [1.08, 0.305, 0.265, -0.01],
  [1.16, 0.27, 0.235, -0.02],
  [1.22, 0.21, 0.19, -0.02],
  [1.29, 0.13, 0.13, -0.02],
];
const TOP = 1.29, FRONT = Math.PI / 2; // angle round the body: 0 = the left side (+x), PI/2 = the front (+z)

function profileAt(y) {
  const P = PROFILE;
  if (y <= P[0][0]) return P[0].slice(1);
  for (let i = 1; i < P.length; i++) {
    if (y <= P[i][0]) { // a smooth curve through the rows (Catmull-Rom), so the light runs evenly down the body
      const t = (y - P[i - 1][0]) / (P[i][0] - P[i - 1][0]);
      const p0 = P[Math.max(0, i - 2)], p1 = P[i - 1], p2 = P[i], p3 = P[Math.min(P.length - 1, i + 1)];
      return [1, 2, 3].map((k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t));
    }
  }
  return P.at(-1).slice(1);
}
const sp = (c) => Math.sign(c) * Math.abs(c) ** (2 / N);
/** A point on the torso at height y, angle a, `lift` out from the surface. */
function surface(y, a, lift = 0) {
  const [A, B, zc] = profileAt(y);
  return [(A + lift) * sp(Math.cos(a)), y, zc + (B + lift) * sp(Math.sin(a))];
}

/** Collects pieces into one skinned geometry: positions, vertex colours, two bone weights each. */
class Cloth {
  constructor(bones) {
    this.bones = bones; // name -> { index, at: Vector3 bind position }
    this.pos = []; this.col = []; this.si = []; this.sw = []; this.idx = [];
  }
  bone(name) { return this.bones[name]?.index ?? 0; }
  /** Add a vertex; `w` = [[boneName, weight], ...] (up to 2). */
  vert(p, color, w) {
    const c = new THREE.Color(color);
    this.pos.push(p[0], p[1], p[2]);
    this.col.push(c.r, c.g, c.b);
    const a = w[0], b = w[1] ?? [w[0][0], 0];
    this.si.push(this.bone(a[0]), this.bone(b[0]), 0, 0);
    const tot = a[1] + b[1] || 1;
    this.sw.push(a[1] / tot, b[1] / tot, 0, 0);
    return this.pos.length / 3 - 1;
  }
  /** A grid of vertices rows x cols (from fn(i, j) -> [p, color, weights]), joined into quads. `wrap`: the columns close round. */
  grid(rows, cols, fn, wrap = false) {
    const base = this.pos.length / 3, nc = wrap ? cols : cols + 1;
    for (let i = 0; i <= rows; i++) for (let j = 0; j < nc; j++) this.vert(...fn(i, j));
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const a = base + i * nc + j, b = base + i * nc + ((j + 1) % nc), c = a + nc, d = b + nc;
      this.idx.push(a, c, b, b, c, d);
    }
  }
  /** A little ellipsoid (buttons, knots, pearls, puffs) centred at p, radii r = [x, y, z], on one bone. */
  blob(p, r, color, w, seg = 8) {
    const base = this.pos.length / 3, rows = Math.max(4, seg >> 1);
    for (let i = 0; i <= rows; i++) {
      const th = (i / rows) * Math.PI;
      for (let j = 0; j < seg; j++) {
        const ph = (j / seg) * Math.PI * 2;
        this.vert([p[0] + r[0] * Math.sin(th) * Math.cos(ph), p[1] + r[1] * Math.cos(th), p[2] + r[2] * Math.sin(th) * Math.sin(ph)], color, w);
      }
    }
    for (let i = 0; i < rows; i++) for (let j = 0; j < seg; j++) {
      const a = base + i * seg + j, b = base + i * seg + ((j + 1) % seg), c = a + seg, d = b + seg;
      this.idx.push(a, b, c, b, d, c);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    return g;
  }
}

/** Which bones carry the torso at height y. */
function torsoWeights(y) {
  const blend = (a, b, y0, y1) => { const t = THREE.MathUtils.clamp((y - y0) / (y1 - y0), 0, 1); return [[a, 1 - t], [b, t]]; };
  if (y < 0.72) return blend('hips', 'spine', 0.5, 0.72);
  return blend('spine', 'chest', 0.8, 1.0);
}

const lighter = (c, k) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), k).getHex();
const darker = (c, k) => new THREE.Color(c).multiplyScalar(1 - k).getHex();

/**
 * The torso: rings from the hem up to the neck. `paint(y, a)` gives the colour at a point (one colour
 * per vertex, so keep sharp edges for the panels laid on top).
 */
function torso(cl, color, bottom = 0.38) {
  const rows = 26, cols = 40;
  cl.grid(rows, cols, (i, j) => {
    const y = bottom + (TOP - bottom) * (i / rows), a = (j / cols) * Math.PI * 2;
    return [surface(y, a), color, torsoWeights(y)];
  }, true);
}

/**
 * A panel lying on the torso: between heights y0..y1, from angle lo(y) to hi(y) (functions of y), `lift`
 * off the surface (higher panels sit over lower ones).
 */
function panel(cl, y0, y1, lo, hi, lift, color, rows = 12, cols = 6) {
  cl.grid(rows, cols, (i, j) => {
    const y = y0 + (y1 - y0) * (i / rows), a0 = Math.min(lo(y), hi(y)), a1 = Math.max(lo(y), hi(y)); // (always the same way round, or it faces inwards and vanishes)
    const a = a0 + (a1 - a0) * (j / cols);
    return [surface(y, a, lift), color, torsoWeights(y)];
  });
}

/** A band running all the way round the torso, its height at each angle from `yAt(a)`, `h` tall. */
function band(cl, yAt, h, lift, color) {
  const cols = 40;
  cl.grid(1, cols, (i, j) => {
    const a = (j / cols) * Math.PI * 2, y = yAt(a) + (i ? h / 2 : -h / 2);
    return [surface(y, a, lift), color, torsoWeights(y)];
  }, true);
}

/** A sleeve on side s (1 = left, +x): a tube from inside the shoulder to the wrist, bending at the elbow. */
function sleeve(cl, s, color, { cuff = null, cuffColor = 0xffffff, puff = null } = {}) {
  const side = s > 0 ? 'l' : 'r', B = cl.bones;
  const sh = B[`upperarm${side}`].at, el = B[`lowerarm${side}`].at, wr = B[`wrist${side}`].at;
  const x0 = Math.abs(sh.x) - 0.1, x1 = Math.abs(wr.x) - (cuff ? 0.05 : 0.01), ex = Math.abs(el.x);
  const weight = (x) => {
    const t = (a, b) => THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
    if (x < Math.abs(sh.x)) return [['chest', 1 - t(x0, Math.abs(sh.x))], [`upperarm${side}`, t(x0, Math.abs(sh.x))]];
    if (x < ex + 0.08) return [[`upperarm${side}`, 1 - t(ex - 0.08, ex + 0.08)], [`lowerarm${side}`, t(ex - 0.08, ex + 0.08)]];
    return [[`lowerarm${side}`, 1 - t(Math.abs(wr.x) - 0.06, Math.abs(wr.x))], [`wrist${side}`, t(Math.abs(wr.x) - 0.06, Math.abs(wr.x))]];
  };
  const tube = (xa, xb, r0, r1, col, rows) => cl.grid(rows, 16, (i, j) => {
    const x = xa + (xb - xa) * (i / rows), r = r0 + (r1 - r0) * (i / rows), a = -s * (j / 16) * Math.PI * 2; // (wound so it faces out on both sides)
    const yc = sh.y + (wr.y - sh.y) * ((x - x0) / (x1 - x0)), zc = sh.z + (wr.z - sh.z) * ((x - x0) / (x1 - x0));
    return [[s * x, yc + r * Math.cos(a), zc + r * Math.sin(a)], col, weight(x)];
  }, true);
  tube(x0, x1, 0.13, 0.105, color, 10);
  if (cuff) tube(x1 - 0.005, x1 + 0.05, 0.11, 0.105, cuffColor, 2);
  // the end caps would show from inside only: the tube is closed by the body at one end, the hand at the other
  if (puff) cl.blob([s * (Math.abs(sh.x) + 0.06), sh.y + 0.03, sh.z], [0.17, 0.17, 0.18], puff, [[`upperarm${side}`, 1]], 12);
}

/** Buttons straight down the front at angle offset `da` from the middle. */
function buttons(cl, ys, color, da = 0, lift = 0.012, r = 0.022) {
  for (const y of ys) cl.blob(surface(y, FRONT + da, lift), [r, r, r * 0.6], color, torsoWeights(y), 8);
}

/** The jacket opening: half-angle of the V at height y, from 0 at `yv` to `w` at the collar. */
const vee = (yv, w) => (y) => Math.max(0, w * (y - yv) / (TOP - 0.03 - yv));

const STYLES = {
  // suit: a white shirt in a V, lapels, a slim tie tucked under the buttoned jacket, shirt cuffs
  tie(cl, c, tie = 0xc0303a) { // an open jacket over a white shirt; the tie runs all the way down and tucks in at the belt
    torso(cl, c);
    const lap = darker(c, 0.18);
    const sw = (y) => (y < 0.95 ? 0.24 : 0.24 + 0.38 * (y - 0.95) / (TOP - 0.03 - 0.95)); // the shirt showing: a strip, opening into a V at the collar
    panel(cl, 0.45, TOP - 0.03, (y) => FRONT - sw(y), (y) => FRONT + sw(y), 0.006, 0xf6f6f6, 16, 6);
    for (const s of [-1, 1]) panel(cl, 0.9, TOP - 0.05, (y) => FRONT + s * sw(y), (y) => FRONT + s * (sw(y) + 0.17), 0.016, lap, 10, 3); // lapels
    panel(cl, 0.5, 0.57, () => FRONT - 0.26, () => FRONT + 0.26, 0.01, 0x2a2a2e, 1, 6); // the belt
    const tw = (y) => (y < 0.66 ? 0.095 * Math.max(0.15, (y - 0.57) / 0.09) : 0.065 + (1.17 - y) * 0.06); // widening down, a point at the bottom
    panel(cl, 0.57, 1.17, (y) => FRONT - tw(y), (y) => FRONT + tw(y), 0.013, tie, 16, 2);
    cl.blob(surface(1.19, FRONT, 0.025), [0.045, 0.035, 0.025], darker(tie, 0.1), torsoWeights(1.19));
    for (const s of [-1, 1]) sleeve(cl, s, c, { cuff: true });
  },
  // tuxedo: satin lapels, a crisp white shirt with studs and a bow tie
  bowtie(cl, c, tie = 0x111111) {
    torso(cl, c);
    const yv = 0.84, w = vee(yv, 0.66), satin = lighter(c, 0.12);
    panel(cl, yv, TOP - 0.03, (y) => FRONT - w(y), (y) => FRONT + w(y), 0.006, 0xffffff);
    for (const s of [-1, 1]) panel(cl, yv - 0.04, TOP - 0.05, (y) => FRONT + s * w(y), (y) => FRONT + s * (w(y) + 0.2), 0.016, satin, 12, 3);
    for (const s of [-1, 1]) cl.blob(surface(1.18, FRONT + s * 0.09, 0.03), [0.055, 0.04, 0.02], tie, torsoWeights(1.18));
    cl.blob(surface(1.18, FRONT, 0.035), [0.022, 0.025, 0.02], darker(tie, 0.2), torsoWeights(1.18));
    buttons(cl, [1.08, 0.98, 0.9], 0x222222, 0, 0.01, 0.014);
    buttons(cl, [0.76], darker(c, 0.5));
    for (const s of [-1, 1]) sleeve(cl, s, c, { cuff: true });
  },
  // waistcoat over a shirt in the outfit's colour
  vest(cl, c) {
    torso(cl, c);
    const brown = 0x8a5a34, w = vee(0.95, 0.5);
    for (const s of [-1, 1]) panel(cl, 0.5, 1.2, (y) => FRONT + s * (y > 0.95 ? w(y) : 0), (y) => FRONT + s * 1.25, 0.008, brown, 12, 6);
    buttons(cl, [0.9, 0.78, 0.66], 0xffcf3f, 0, 0.016);
    for (const s of [-1, 1]) sleeve(cl, s, c, { cuff: true, cuffColor: lighter(c, 0.3) });
  },
  // a pirate captain's coat: a gold sash from shoulder to hip, brass buttons, a lace jabot
  sash(cl, c) {
    torso(cl, c);
    const gold = 0xe0b84a;
    band(cl, (a) => 0.86 + 0.28 * Math.cos(a - 0.6), 0.09, 0.012, gold); // high on the left shoulder, low on the right hip
    for (const y of [1.0, 0.88, 0.76]) for (const s of [-1, 1]) cl.blob(surface(y, FRONT + s * 0.28, 0.012), [0.022, 0.022, 0.014], 0xd9a93a, torsoWeights(y));
    for (let i = 0; i < 4; i++) cl.blob(surface(1.2 - i * 0.05, FRONT, 0.03), [0.06 - i * 0.008, 0.035, 0.03], 0xffffff, torsoWeights(1.2));
    for (const s of [-1, 1]) sleeve(cl, s, c, { cuff: true, cuffColor: gold });
  },
  // chef whites: double-breasted with two rows of buttons and a stand-up collar
  apron(cl, c) {
    torso(cl, c);
    const edge = darker(c, 0.06);
    panel(cl, 0.42, 1.2, () => FRONT - 0.32, () => FRONT + 0.05, 0.006, c, 12, 4); // the overlapping front flap
    panel(cl, 0.42, 1.2, () => FRONT - 0.33, () => FRONT - 0.31, 0.008, edge, 12, 1);
    for (const s of [-1, 1]) buttons(cl, [1.05, 0.9, 0.75, 0.6], 0xdddddd, s * 0.24, 0.014);
    band(cl, () => 1.21, 0.07, 0.02, c); // the collar
    for (const s of [-1, 1]) sleeve(cl, s, c, { cuff: true, cuffColor: edge });
  },
  // farmer overalls: a denim bib and straps over a shirt in the outfit's colour
  bib(cl, c) {
    torso(cl, c);
    const denim = 0x3b5f9a;
    panel(cl, 0.38, 0.62, () => 0, () => Math.PI * 2, 0.006, denim, 4, 40); // the trousers' top round the waist
    panel(cl, 0.6, 0.95, () => FRONT - 0.48, () => FRONT + 0.48, 0.008, denim);
    panel(cl, 0.72, 0.84, () => FRONT - 0.16, () => FRONT + 0.16, 0.014, 0x2f4f80, 3, 3); // the pocket
    for (const s of [-1, 1]) {
      panel(cl, 0.93, 1.24, () => FRONT + s * 0.36, () => FRONT + s * 0.48, 0.01, denim, 6, 1);
      panel(cl, 0.6, 1.24, () => FRONT + Math.PI + s * 0.36, () => FRONT + Math.PI + s * 0.48, 0.01, denim, 8, 1);
      cl.blob(surface(0.93, FRONT + s * 0.42, 0.018), [0.025, 0.025, 0.015], 0xd9a93a, torsoWeights(0.93));
    }
    for (const s of [-1, 1]) sleeve(cl, s, c, { cuff: true, cuffColor: darker(c, 0.15) });
  },
  // a robe: a gold band down the front and a white fur collar (the long skirt hangs from the hips)
  robe(cl, c) {
    torso(cl, c);
    panel(cl, 0.38, TOP - 0.04, () => FRONT - 0.07, () => FRONT + 0.07, 0.01, 0xffcf3f, 12, 2);
    for (let i = 0; i < 14; i++) { const a = FRONT + Math.PI + (i / 13 - 0.5) * Math.PI * 1.7; cl.blob(surface(1.16, a, 0.03), [0.07, 0.06, 0.07], 0xffffff, torsoWeights(1.16)); }
    for (const s of [-1, 1]) sleeve(cl, s, c, { cuff: true, cuffColor: 0xffcf3f });
  },
  // winter coat: fur down the front, toggles, fur cuffs
  coat(cl, c) {
    torso(cl, c);
    for (let i = 0; i < 9; i++) cl.blob(surface(0.42 + i * 0.1, FRONT, 0.02), [0.06, 0.06, 0.04], 0xf6f2ea, torsoWeights(0.42 + i * 0.1));
    for (const y of [1.0, 0.85, 0.7]) cl.blob(surface(y, FRONT + 0.22, 0.016), [0.045, 0.014, 0.014], 0x6b4a2c, torsoWeights(y));
    for (const s of [-1, 1]) sleeve(cl, s, c, { cuff: true, cuffColor: 0xf6f2ea });
  },
  // a princess gown's bodice: fitted, a lace neckline, pearls, a ribbon at the waist and puff sleeves
  gown(cl, c) {
    torso(cl, c, 0.62);
    const light = lighter(c, 0.25), lace = 0xfffaf4;
    band(cl, (a) => 1.2 - 0.05 * Math.max(0, Math.sin(a)), 0.04, 0.012, lace); // the neckline, dipping at the front
    band(cl, () => 0.76, 0.06, 0.012, light);                                    // the waist ribbon, just over the skirt
    cl.blob(surface(0.76, FRONT, 0.03), [0.05, 0.04, 0.03], light, torsoWeights(0.76));
    for (const s of [-1, 1]) cl.blob(surface(0.76, FRONT + s * 0.14, 0.03), [0.06, 0.035, 0.02], light, torsoWeights(0.76));
    for (let i = 0; i < 9; i++) { // a pearl necklace
      const u = (i / 8 - 0.5) * 1.3, y = 1.13 + 0.06 * Math.abs(u) ** 1.5;
      cl.blob(surface(y, FRONT + u, 0.022), [0.018, 0.018, 0.018], 0xfffaf0, torsoWeights(y), 6);
    }
    for (const s of [-1, 1]) sleeve(cl, s, light, { cuff: true, cuffColor: lace, puff: c });
  },
};

/** Bone name -> { index, at: bind-space position } for a skinned mesh. */
function bindBones(skinned) {
  const out = {}, m = new THREE.Matrix4();
  skinned.skeleton.bones.forEach((b, i) => {
    m.copy(skinned.skeleton.boneInverses[i]).invert();
    out[b.name] = { index: i, at: new THREE.Vector3().setFromMatrixPosition(m) };
  });
  return out;
}

export const TAILORED = Object.keys(STYLES);

/**
 * The tailored top for an outfit (`extra` from CLOTHES in config.js, or 'coat' / 'robe'), skinned onto
 * `body` (the outfit's skinned body mesh): add it next to the body. Null if the rig doesn't fit.
 */
export function buildTailored(extra, color, tieColor, body) {
  const style = STYLES[extra] ?? STYLES.tie;
  const bones = bindBones(body);
  if (!['hips', 'spine', 'chest', 'upperarml', 'lowerarml', 'wristl', 'upperarmr', 'lowerarmr', 'wristr'].every((n) => bones[n])) return null;
  const cl = new Cloth(bones);
  style(cl, color, tieColor);
  const m = new THREE.SkinnedMesh(cl.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
  m.name = 'Tailored';
  m.bind(body.skeleton, body.bindMatrix);
  m.frustumCulled = false;
  m.castShadow = true;
  return m;
}

/** An arm mesh's hand only (bind space: the part out past the wrist), for under a tailored sleeve. */
const handCache = new WeakMap();
export function handOnly(geo, wristX) {
  if (!handCache.has(geo)) {
    const pos = geo.attributes.position, idx = geo.index.array, keep = [];
    for (let t = 0; t < idx.length; t += 3) {
      const cx = (Math.abs(pos.getX(idx[t])) + Math.abs(pos.getX(idx[t + 1])) + Math.abs(pos.getX(idx[t + 2]))) / 3;
      if (cx > wristX + 0.01) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    }
    const out = new THREE.BufferGeometry();
    for (const name of Object.keys(geo.attributes)) out.setAttribute(name, geo.attributes[name]);
    out.setIndex(keep);
    handCache.set(geo, out);
  }
  return handCache.get(geo);
}

export { bindBones };
