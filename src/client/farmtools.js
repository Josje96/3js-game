// Farm tools to fight with (shared/items.js `build`): pitchfork, sickle, spade and scythe, made in code
// since KayKit has no farm tools. Laid out like the KayKit weapons so the hand slot holds them the same
// way: the grip at the origin, the handle up +y, the head flat in the x-y plane at the top (~1.4-2.1 long).
import * as THREE from 'three';

const WOOD = 0x9a6a3c, METAL = 0xc8d0d8;

function part(g, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}
const wood = () => new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.85 });
const metal = (tint) => new THREE.MeshStandardMaterial({ color: tint ?? METAL, roughness: 0.4, metalness: 0.25 });
/** A wooden handle from y0 to y1. */
const handle = (g, y0, y1, r = 0.045) => part(g, new THREE.CylinderGeometry(r, r * 1.1, y1 - y0, 8), wood(), 0, (y0 + y1) / 2, 0);
/** A flat blade from a 2D outline (x-y), `depth` thick, centred on z. */
function flat(points, depth) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

export const FARM_TOOLS = {
  pitchfork(def) { // three long tines on a crossbar, a long ash handle
    const g = new THREE.Group(), m = metal(def.tint);
    handle(g, -0.45, 1.22);
    part(g, new THREE.CylinderGeometry(0.06, 0.05, 0.14, 8), m, 0, 1.22, 0); // the socket
    part(g, new THREE.BoxGeometry(0.4, 0.05, 0.05), m, 0, 1.3, 0); // the crossbar
    for (const x of [-0.18, 0, 0.18]) {
      part(g, new THREE.CylinderGeometry(0.022, 0.022, 0.44, 6), m, x, 1.52, 0);
      part(g, new THREE.ConeGeometry(0.022, 0.09, 6), m, x, 1.78, 0);
    }
    return g;
  },
  sickle(def) { // a short handle and a hooked crescent blade
    const g = new THREE.Group();
    handle(g, -0.3, 0.3, 0.05);
    part(g, new THREE.CylinderGeometry(0.058, 0.058, 0.06, 8), metal(0x8a8a90), 0, 0.3, 0); // the ferrule
    const pts = [];
    for (let i = 0; i <= 12; i++) { const a = -0.25 + (i / 12) * Math.PI * 1.15; pts.push([0.3 - Math.cos(a) * 0.32, 0.62 + Math.sin(a) * 0.36]); } // the outer (sharp) edge
    for (let i = 12; i >= 0; i--) { const a = -0.25 + (i / 12) * Math.PI * 1.15; pts.push([0.3 - Math.cos(a) * 0.25 * (0.6 + 0.4 * i / 12), 0.62 + Math.sin(a) * 0.27]); } // the back, thinner at the tip
    part(g, flat(pts, 0.03), metal(def.tint));
    return g;
  },
  spade(def) { // a T-grip handle and a broad pointed blade
    const g = new THREE.Group(), m = metal(def.tint);
    handle(g, -0.4, 0.95);
    part(g, new THREE.BoxGeometry(0.26, 0.06, 0.06), wood(), 0, -0.42, 0); // the T at the end
    part(g, new THREE.CylinderGeometry(0.06, 0.07, 0.2, 8), m, 0, 0.98, 0); // the socket
    part(g, flat([[-0.19, 1.05], [0.19, 1.05], [0.2, 1.42], [0, 1.6], [-0.2, 1.42]], 0.035), m);
    return g;
  },
  scythe(def) { // a tall snath with a side grip, and a long curved blade sweeping out sideways at the top
    const g = new THREE.Group(), m = metal(def.tint);
    handle(g, -0.5, 1.55);
    const grip = part(g, new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6), wood(), 0.1, 0.55, 0); // the second hand's grip
    grip.rotation.z = Math.PI / 2;
    part(g, new THREE.BoxGeometry(0.12, 0.12, 0.09), m, 0, 1.55, 0); // the tang clamp
    const pts = [];
    for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push([-u * 1.05, 1.6 - Math.sin(u * Math.PI * 0.6) * 0.05 - u * u * 0.32]); } // the back of the blade
    for (let i = 14; i >= 0; i--) { const u = i / 14; pts.push([-u * 1.0, 1.6 - 0.15 * (1 - u) - Math.sin(u * Math.PI * 0.6) * 0.05 - u * u * 0.3]); } // the edge, to a point
    part(g, flat(pts, 0.025), m);
    return g;
  },
};
