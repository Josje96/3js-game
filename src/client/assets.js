// Model loading + caching. Paths look like "dungeon/wall" (-> public/models/dungeon/wall.gltf).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { ITEMS } from '../shared/items.js';
import { PROPS } from '../shared/props.js';
import { CLASSES } from '../shared/config.js';
import { FURNITURE, FLOOR_STYLES } from '../shared/furniture.js';
import { THEMES, EXTRA_MODELS } from './themes.js';

const BASE = './models/';
const loader = new GLTFLoader();
const pending = new Map();
const loaded = new Map();

function url(path) {
  const glb = path.startsWith('characters/') || path.startsWith('anims/');
  return `${BASE}${path}${glb ? '.glb' : '.gltf'}`;
}

export function loadModel(path) {
  if (!pending.has(path)) {
    pending.set(path, loader.loadAsync(url(path)).then((gltf) => {
      gltf.scene.traverse((o) => {
        if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
      });
      gltf.scene.updateMatrixWorld(true);
      loaded.set(path, gltf);
      return gltf;
    }));
  }
  return pending.get(path);
}

/** Everything the game can show, so nothing pops in mid-play. */
export function allModelPaths() {
  const paths = new Set([
    'dungeon/floor_tile_large', 'dungeon/floor_tile_large_rocks', 'dungeon/floor_dirt_large', 'dungeon/floor_dirt_large_rocky',
    'dungeon/floor_wood_large', 'dungeon/floor_wood_large_dark',
    'dungeon/wall', 'dungeon/wall_cracked', 'dungeon/wall_broken', 'dungeon/wall_doorway', 'dungeon/wall_arched',
    'dungeon/wall_gated', 'dungeon/wall_shelves', 'dungeon/stairs_narrow', 'dungeon/floor_tile_big_grate_open',
    'dungeon/chest', 'dungeon/chest_gold', 'dungeon/barrel_large', 'dungeon/barrel_small', 'dungeon/keg', 'dungeon/banner_patternA_blue', 'dungeon/banner_shield_red', 'dungeon/table_long',
    'blocks/dirt_with_grass', 'blocks/gravel', 'blocks/water', 'blocks/tree', 'blocks/grass', 'blocks/bricks_A', 'blocks/stone',
    'blocks/stone_dark', 'blocks/wood', 'blocks/striped_block_red', 'blocks/striped_block_blue', 'blocks/sand_A',
    'anims/Rig_Medium_General', 'anims/Rig_Medium_MovementBasic', 'anims/Rig_Medium_Combat',
  ]);
  for (const c of Object.values(CLASSES)) paths.add(`characters/${c.model}`);
  for (const it of Object.values(ITEMS)) if (it.model) paths.add(it.model);
  for (const p of Object.values(PROPS)) if (p.model) paths.add(p.model);
  for (const f of Object.values(FURNITURE)) if (f.model) paths.add(f.model);
  for (const f of Object.values(FLOOR_STYLES)) if (f.model) paths.add(f.model);
  for (const t of Object.values(THEMES)) for (const m of [...(t.floors ?? []), ...(t.walls ?? [])]) paths.add(m);
  for (const m of EXTRA_MODELS) paths.add(m);
  return [...paths];
}

export async function preloadAll(onProgress) {
  const paths = allModelPaths();
  let done = 0;
  await Promise.all(paths.map((p) => loadModel(p).then(() => onProgress?.(++done / paths.length))));
}

function get(path) {
  const g = loaded.get(path);
  if (!g) throw new Error(`model not preloaded: ${path}`);
  return g;
}

/** A plain copy of a static model (shares geometry & materials). */
export function cloneModel(path) {
  return get(path).scene.clone(true);
}

/** A copy of a skinned character with its own skeleton. */
export function cloneCharacter(model) {
  return SkeletonUtils.clone(get(`characters/${model}`).scene);
}

/** The original (shared) scene of a character model, for borrowing hats and capes. */
export function characterScene(model) {
  return get(`characters/${model}`).scene;
}

let clips = null;
export function characterClips() {
  if (!clips) {
    clips = {};
    for (const p of ['anims/Rig_Medium_General', 'anims/Rig_Medium_MovementBasic', 'anims/Rig_Medium_Combat']) {
      for (const clip of get(p).animations) clips[clip.name] = clip;
    }
  }
  return clips;
}

/**
 * Many copies of one static model as InstancedMeshes (1 draw call per sub-mesh).
 * `transforms` is a list of { x, y, z, rot, sx, sy, sz }.
 */
export function instanced(path, transforms) {
  const group = new THREE.Group();
  if (!transforms.length) return group;
  const meshes = [];
  get(path).scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (const mesh of meshes) {
    const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, transforms.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    transforms.forEach((t, i) => {
      q.setFromAxisAngle(up, t.rot ?? 0);
      p.set(t.x, t.y ?? 0, t.z);
      s.set(t.sx ?? t.s ?? 1, t.sy ?? t.s ?? 1, t.sz ?? t.s ?? 1);
      m.compose(p, q, s).multiply(mesh.matrixWorld);
      inst.setMatrixAt(i, m);
    });
    inst.computeBoundingSphere();
    group.add(inst);
  }
  return group;
}
