// Draw-call savers for static scenery. Every Mesh is one draw call (two with shadows), so a
// cottage of 15 boxes costs 30 calls. mergeStatic bakes a group that never moves into one mesh
// per look (material); trimBlock drops the faces of a voxel block nobody can see.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Materials that render the same can share one draw call. */
function lookKey(o) {
  const m = o.material;
  return [
    m.type, m.color?.getHex(), m.emissive?.getHex(), m.emissiveIntensity, m.roughness, m.metalness,
    m.flatShading, m.transparent, m.opacity, m.side, m.map?.uuid, m.vertexColors, o.castShadow, o.receiveShadow,
  ].join('|');
}

/**
 * Bake every mesh under `root` into one mesh per look, in root's own space. Only for things that
 * never move, change colour or hide parts: a cottage, a bench, a fence. Lights and other
 * non-mesh objects are kept. Returns the merged geometries (the caller disposes them).
 */
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const groups = new Map(); // key -> { material, castShadow, receiveShadow, geos }
  const keep = [];
  const walk = (o) => {
    if (o !== root) {
      if (o.isLight || (o.isMesh && (o.isSkinnedMesh || o.isInstancedMesh || Array.isArray(o.material)))) {
        keep.push(o); // kept whole, children and all
        return;
      }
      if (o.isMesh) {
        const key = lookKey(o);
        if (!groups.has(key)) groups.set(key, { material: o.material, castShadow: o.castShadow, receiveShadow: o.receiveShadow, geos: [] });
        const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        const wanted = ['position', 'normal', 'uv', ...(o.material.vertexColors ? ['color'] : [])];
        for (const name of Object.keys(g.attributes)) if (!wanted.includes(name)) g.deleteAttribute(name);
        g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
        groups.get(key).geos.push(g);
      }
    }
    for (const c of o.children) walk(c);
  };
  walk(root);
  // lift the things we keep up to root, in root's space
  for (const o of keep) {
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    o.removeFromParent();
    m.decompose(o.position, o.quaternion, o.scale);
    root.add(o);
  }
  for (const c of [...root.children]) if (!keep.includes(c)) c.removeFromParent();
  const made = [];
  for (const { material, castShadow, receiveShadow, geos } of groups.values()) {
    // uv only if every piece has one (merging needs the same attributes everywhere)
    if (!geos.every((g) => g.attributes.uv)) for (const g of geos) g.deleteAttribute('uv');
    const geo = mergeGeometries(geos);
    for (const g of geos) g.dispose();
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    root.add(mesh);
    made.push(geo);
  }
  return made;
}

const trimmed = new Map();
/**
 * A voxel block's geometry without the faces nobody sees. 'ground': only the top and its bevels
 * (the block sits in the ground; sides and bottom are buried). 'wall': everything but the bottom
 * (the camera always looks down). Cached per source geometry + mode.
 */
export function trimBlock(geometry, mode) {
  const id = `${geometry.uuid}|${mode}`;
  if (trimmed.has(id)) return trimmed.get(id);
  geometry.computeBoundingBox();
  const top = geometry.boundingBox.max.y, h = top - geometry.boundingBox.min.y;
  const src = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = src.attributes.position;
  const keepTri = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    n.subVectors(b, a).cross(c.clone().sub(a)).normalize();
    const cy = (a.y + b.y + c.y) / 3;
    const keep = mode === 'ground' ? n.y > 0.2 && cy > top - h * 0.25 : n.y > -0.2;
    if (keep) keepTri.push(i);
  }
  const out = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(src.attributes)) {
    const size = attr.itemSize, arr = new attr.array.constructor(keepTri.length * 3 * size);
    keepTri.forEach((t, k) => arr.set(attr.array.subarray(t * size, (t + 3) * size), k * 3 * size));
    out.setAttribute(name, new THREE.BufferAttribute(arr, size, attr.normalized));
  }
  if (src !== geometry) src.dispose();
  out.computeBoundingSphere();
  trimmed.set(id, out);
  return out;
}

/**
 * Tiny parts (eyes, buttons, a hair bun) needn't cast shadows: their shadow lands inside the
 * body's, but each one is another draw call in the shadow pass. `size` is a radius in metres.
 */
export function dropTinyShadows(root, size = 0.12) {
  root.updateMatrixWorld(true);
  const s = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || !o.castShadow || o.isInstancedMesh) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    o.getWorldScale(s);
    if (o.geometry.boundingSphere.radius * Math.max(s.x, s.y, s.z) < size) o.castShadow = false;
  });
}
