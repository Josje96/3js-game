// Little pictures of items, furniture and pets for the menus, rendered once from the real 3D
// models (so a new item gets an icon for free) and cached as image URLs.
import * as THREE from 'three';
import { ITEMS } from '../shared/items.js';
import { FURNITURE } from '../shared/furniture.js';
import { cloneModel } from './assets.js';
import { tintModel } from './views.js';
import { FURNITURE_BUILDERS } from './furniture.js';
import { PetView } from './pets.js';
import { buildHelmet } from './cosmetics.js';

const SIZE = 96;
const cache = new Map();
let r = null, scene, camera;

function setup() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  r.setSize(SIZE, SIZE, false);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 1.6));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
  sun.position.set(2, 4, 3);
  scene.add(sun);
  camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
}

/** Render `obj` centred and filling the frame, at a friendly three-quarter angle. */
function snapshot(obj, { yaw = 0.7, tilt = 0.35, roll = 0 } = {}) {
  if (!r) setup();
  const holder = new THREE.Group();
  const spin = new THREE.Group(); // yaw first, then lean the whole thing (a sword lies corner to corner)
  spin.add(obj);
  spin.rotation.y = yaw;
  holder.add(spin);
  holder.rotation.set(tilt, 0, roll);
  scene.add(holder);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder);
  const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.62 || 1;
  camera.position.set(centre.x, centre.y, centre.z + radius / Math.tan((camera.fov * Math.PI) / 360));
  camera.lookAt(centre);
  r.render(scene, camera);
  const url = r.domElement.toDataURL();
  scene.remove(holder);
  return url;
}

function cached(key, make) {
  if (!cache.has(key)) {
    try { cache.set(key, make()); } catch (err) { console.warn('icon failed', key, err); cache.set(key, null); }
  }
  return cache.get(key);
}

/** An item's picture (a data: URL), or null if its model isn't loaded. */
export function itemIcon(id) {
  const def = ITEMS[id];
  if (def?.kind === 'helmet') return cached(`item:${id}`, () => snapshot(buildHelmet(def), { yaw: 0.6, tilt: 0.35 })); // (no model: the one people wear)
  if (!def?.model) return null;
  const weapon = def.kind === 'weapon';
  return cached(`item:${id}`, () => snapshot(tintModel(cloneModel(def.model), def.tint), weapon ? { yaw: Math.PI / 2, tilt: 0.15, roll: -Math.PI / 4 } : { yaw: 0.6, tilt: 0.35 }));
}

export function furnitureIcon(id) {
  const def = FURNITURE[id];
  if (!def) return null;
  return cached(`furniture:${id}`, () => snapshot(def.build ? FURNITURE_BUILDERS[def.build](def) : cloneModel(def.model), { yaw: 0.6, tilt: 0.45 }));
}

export function petIcon(species, level = 1) {
  return cached(`pet:${species}:${level}`, () => snapshot(new PetView(species, level).root, { yaw: 0.5, tilt: 0.25 }));
}

/** `<img>` markup for an icon (empty if there's no picture). */
export function iconImg(url, cls = 'icon') {
  return url ? `<img class="${cls}" src="${url}" alt="">` : '';
}
