// Builds the static 3D scene for a layout: floors, walls, buildings, props, lights.
import * as THREE from 'three';
import { CELL } from '../shared/config.js';
import { hashSeed } from '../shared/rng.js';
import { instanced, cloneModel } from './assets.js';
import { CharacterView, makeGlow } from './views.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { makeGrass, makeWater, makeTrees } from './nature.js';
import { PetView } from './pets.js';

/** Wooden signpost for the healing spring. */
function makeSpringSign() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.85 });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.6, 0.18), wood);
  post.position.y = 0.8;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c99a63';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#7a5030';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 120);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8456b';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText('♥ Spring', 128, 58);
  ctx.fillStyle = '#5a3a1c';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText('5 gold', 128, 104);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 0.08), [wood, wood, wood, wood, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), wood]);
  board.position.y = 1.55;
  for (const m of [post, board]) { m.castShadow = true; g.add(m); }
  return g;
}

/** A standing mirror that really reflects (only in the fort, so the extra render is fine). */
function makeMirror() {
  const g = new THREE.Group();
  const glass = new Reflector(new THREE.PlaneGeometry(1.3, 2.2), {
    textureWidth: 512, textureHeight: 868, color: 0xc8d0d8, clipBias: 0.003,
  });
  glass.position.set(0, 1.55, 0.08);
  g.add(glass);
  const wood = new THREE.MeshStandardMaterial({ color: 0xc99a5a, roughness: 0.6 });
  const box = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
  };
  box(1.5, 0.12, 0.14, 0, 2.7, 0.06);   // frame
  box(1.5, 0.12, 0.14, 0, 0.4, 0.06);
  box(0.12, 2.42, 0.14, -0.71, 1.55, 0.06);
  box(0.12, 2.42, 0.14, 0.71, 1.55, 0.06);
  box(1.3, 2.2, 0.04, 0, 1.55, -0.01); // back
  box(0.9, 0.1, 0.5, 0, 0.05, 0.1);    // stand
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshStandardMaterial({ color: 0xff7aa8 }));
  heart.position.set(0, 2.82, 0.08);
  heart.scale.set(1.3, 1, 0.6);
  g.add(heart);
  return g;
}

/** A cosy painted wardrobe built from boxes (the KayKit packs don't have one). */
function makeWardrobe() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x5e3a20, roughness: 0.85 });
  const paint = new THREE.MeshStandardMaterial({ color: 0x6f9fd8, roughness: 0.7 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 0.7, roughness: 0.3 });
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  box(2.6, 3.4, 1.1, wood, 0, 1.9, 0);              // body
  box(2.8, 0.25, 1.3, dark, 0, 3.7, 0);             // crown
  box(2.7, 0.2, 1.2, dark, 0, 0.1, 0);              // base
  for (const s of [-1, 1]) {
    box(1.12, 2.9, 0.08, paint, s * 0.6, 1.95, 0.56); // doors
    box(0.8, 1.0, 0.04, wood, s * 0.6, 2.6, 0.61);    // door panels
    box(0.8, 1.0, 0.04, wood, s * 0.6, 1.3, 0.61);
    box(0.1, 0.1, 0.12, brass, s * 0.13, 1.95, 0.64); // knobs
    box(0.25, 0.3, 0.25, dark, s * 1.1, 0.15, 0.4);   // feet
  }
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshStandardMaterial({ color: 0xff7aa8, roughness: 0.5 }));
  heart.position.set(0, 3.85, 0.4);
  heart.scale.set(1.3, 1, 0.6);
  g.add(heart);
  return g;
}

const THEMES = {
  dungeon: { floors: ['dungeon/floor_tile_large', 'dungeon/floor_tile_large', 'dungeon/floor_tile_large', 'dungeon/floor_tile_large', 'dungeon/floor_tile_large', 'dungeon/floor_tile_large_rocks'], walls: ['dungeon/wall', 'dungeon/wall', 'dungeon/wall', 'dungeon/wall_cracked'], bg: 0x120e18, ambient: 0.35, sun: 0.25 },
  ruins:   { floors: ['dungeon/floor_dirt_large', 'dungeon/floor_dirt_large_rocky'], walls: ['dungeon/wall_cracked', 'dungeon/wall_broken', 'dungeon/wall'], bg: 0x0d1a16, ambient: 0.35, sun: 0.25 },
  // deeper biomes: the mine's tiles, recoloured, plus their own decorations along the walls
  frost:   { floors: ['dungeon/floor_tile_large', 'dungeon/floor_tile_large_rocks'], walls: ['dungeon/wall', 'dungeon/wall_cracked'], tint: 0xb8dcff, bg: 0x0c1824, ambient: 0.5, sun: 0.3, lantern: 0xcfe8ff, deco: 'ice' },
  grotto:  { floors: ['dungeon/floor_dirt_large', 'dungeon/floor_dirt_large_rocky'], walls: ['dungeon/wall', 'dungeon/wall_broken'], tint: 0xc9a8e8, bg: 0x140c1e, ambient: 0.4, sun: 0.2, lantern: 0xe4c8ff, deco: 'mushroom' },
  lava:    { floors: ['dungeon/floor_tile_large_rocks', 'dungeon/floor_dirt_large_rocky'], walls: ['dungeon/wall_cracked', 'dungeon/wall'], tint: 0xc07060, bg: 0x1e0a06, ambient: 0.45, sun: 0.25, lantern: 0xffb070, deco: 'ember' },
  wood:    { floors: ['dungeon/floor_wood_large'], walls: ['dungeon/wall', 'dungeon/wall_shelves', 'dungeon/wall'], bg: 0x1b1410, ambient: 1.0, sun: 0.9 },
  outdoor: { bg: 0x8fd3ff, ambient: 1.3, sun: 2.2 },
};

const N = [0, -1], E = [1, 0], S = [0, 1], W = [-1, 0];
// wall rotation so its front faces into the walkable cell
const EDGE_ROT = new Map([[N, 0], [S, Math.PI], [W, Math.PI / 2], [E, -Math.PI / 2]]);

export class LocationView {
  constructor(layout, world) {
    this.layout = layout;
    this.group = new THREE.Group();
    this.lights = [];
    this.animated = [];   // things with update(dt)
    this.gate = null;
    this.theme = THEMES[layout.theme];
    const r = (cx, cz, salt = '') => hashSeed(layout.seed, cx, cz, salt) / 2 ** 32; // stable per-cell randomness
    this.rand = r;
    this.uTime = { value: 0 }; // shared by the grass and water shaders

    if (layout.theme === 'outdoor') this.buildOutdoor();
    else this.buildIndoor();
    this.buildProps();
    this.setFlags(world?.flags ?? {});
  }

  /** Collect transforms per model then emit one instanced group per model. */
  batch() {
    const map = new Map();
    const tint = this.theme?.tint;
    return {
      add: (path, t) => { if (!map.has(path)) map.set(path, []); map.get(path).push(t); },
      flush: () => {
        for (const [path, list] of map) {
          const g = instanced(path, list);
          if (tint != null) for (const m of g.children) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(tint)); }
          this.group.add(g);
        }
      },
    };
  }

  buildIndoor() {
    const L = this.layout, b = this.batch(), th = this.theme;
    for (let cz = 0; cz < L.h; cz++) {
      for (let cx = 0; cx < L.w; cx++) {
        if (L.isSolidCell(cx, cz)) continue;
        const x = cx * CELL + CELL / 2, z = cz * CELL + CELL / 2;
        const fi = Math.floor(this.rand(cx, cz, 'f') * th.floors.length);
        b.add(th.floors[fi], { x, z, rot: Math.floor(this.rand(cx, cz, 'r') * 4) * Math.PI / 2 });

        for (const dir of [N, E, S, W]) {
          const nx = cx + dir[0], nz = cz + dir[1];
          if (!L.isSolidCell(nx, nz)) continue;
          const ch = L.cell(nx, nz);
          const ex = x + dir[0] * CELL / 2, ez = z + dir[1] * CELL / 2;
          const rot = EDGE_ROT.get(dir);
          if (ch === 'U') {
            // stairs leading up out of the dungeon, built into the wall cell,
            // bottom step facing the room (the model climbs towards its local -z)
            // (here `dir` points from the room into the stairs cell)
            b.add('dungeon/stairs_narrow', { x: nx * CELL + CELL / 2 + dir[0] * CELL / 2, z: nz * CELL + CELL / 2 + dir[1] * CELL / 2, rot: Math.atan2(-dir[0], -dir[1]) });
            continue;
          }
          let path = th.walls[Math.floor(this.rand(nx, nz, `w${dir}`) * th.walls.length)];
          if (ch === 'D') path = 'dungeon/wall_doorway';
          // walls between the camera and the room are cut down so you can see in
          const sy = dir === S ? 0.22 : 1;
          b.add(path, { x: ex, z: ez, rot, sy });
        }
      }
    }
    b.flush();
    if (th.deco) this.buildDecorations(th.deco);
    // soft glow on the floor in front of each exit so they're easy to find
    for (const portal of Object.values(L.portals)) {
      const glow = makeGlow(0xffcf6b);
      glow.rotation.x = -Math.PI / 2;
      glow.rotation.z = Math.atan2(portal.dir[0], portal.dir[1]);
      glow.scale.set(1, 0.8, 1);
      glow.position.set(portal.x + portal.dir[0] * 1.2, 0.08, portal.z + portal.dir[1] * 1.2);
      this.group.add(glow);
    }
    // a big dark plane under everything hides gaps between tiles
    const under = new THREE.Mesh(new THREE.PlaneGeometry(L.w * CELL + 40, L.h * CELL + 40), new THREE.MeshBasicMaterial({ color: th.bg }));
    under.rotation.x = -Math.PI / 2;
    under.position.set(L.w * CELL / 2, -0.12, L.h * CELL / 2);
    this.group.add(under);
  }

  /** Glowing crystals / mushrooms / embers tucked against the walls (looks only, no collision). */
  buildDecorations(kind) {
    const L = this.layout, spots = [];
    for (let cz = 0; cz < L.h; cz++) {
      for (let cx = 0; cx < L.w; cx++) {
        if (L.isSolidCell(cx, cz) || this.rand(cx, cz, 'deco') > 0.3) continue;
        const walls = [N, E, W].filter(([dx, dz]) => L.cell(cx + dx, cz + dz) === '#');
        if (!walls.length) continue;
        const [dx, dz] = walls[Math.floor(this.rand(cx, cz, 'dw') * walls.length)];
        const along = (this.rand(cx, cz, 'da') - 0.5) * 2.4;
        spots.push({
          x: cx * CELL + CELL / 2 + dx * 1.45 + (dz ? along : 0),
          z: cz * CELL + CELL / 2 + dz * 1.45 + (dx ? along : 0),
          r: this.rand(cx, cz, 'dr'),
        });
      }
    }
    const lights = [];
    for (const s of spots) {
      const g = new THREE.Group();
      g.position.set(s.x, 0, s.z);
      g.rotation.y = s.r * Math.PI * 2;
      if (kind === 'ice') {
        const m = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x3a9fd8, emissiveIntensity: 0.8, roughness: 0.1, transparent: true, opacity: 0.85, flatShading: true });
        for (let i = 0; i < 3; i++) {
          const h = 0.8 + ((s.r * 7 + i) % 1) * 1.2;
          const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, h, 5), m);
          c.position.set((i - 1) * 0.3, h / 2, (i % 2) * 0.2);
          c.rotation.z = (i - 1) * 0.3;
          g.add(c);
        }
      } else if (kind === 'mushroom') {
        const colors = [0xff7ad9, 0x7affe8, 0xb48cff];
        for (let i = 0; i < 2 + Math.floor(s.r * 3); i++) {
          const h = 0.4 + ((s.r * 13 + i * 0.37) % 1) * 0.9, col = colors[(i + Math.floor(s.r * 3)) % 3];
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, h, 6), new THREE.MeshStandardMaterial({ color: 0xf5ead6 }));
          stem.position.set((i - 1) * 0.35, h / 2, (i % 2) * 0.25);
          const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25 + h * 0.15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.7 }));
          cap.position.set(stem.position.x, h, stem.position.z);
          g.add(stem, cap);
        }
      } else if (kind === 'ember') {
        const rock = new THREE.MeshStandardMaterial({ color: 0x3a2a24, flatShading: true, roughness: 1 });
        const hot = new THREE.MeshStandardMaterial({ color: 0xff6a1a, emissive: 0xff4a0a, emissiveIntensity: 1.4 });
        for (let i = 0; i < 3; i++) {
          const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + i * 0.08, 0), i === 1 ? hot : rock);
          r.position.set((i - 1) * 0.4, 0.15, (i % 2) * 0.2);
          g.add(r);
        }
      }
      this.group.add(g);
      if (lights.length < 5 && s.r > 0.6) lights.push(s);
    }
    // a few real lights so the glow spills onto the floor
    const color = { ice: 0x7fd4ff, mushroom: 0xd08aff, ember: 0xff7a2a }[kind];
    for (const s of lights) {
      const light = new THREE.PointLight(color, 10, 9, 1.6);
      light.position.set(s.x, 1.2, s.z);
      this.group.add(light);
    }
  }

  buildOutdoor() {
    const L = this.layout, b = this.batch();
    const trees = [];
    const block = (path, cx, cz, y, s = 2, extra = {}) =>
      b.add(path, { x: cx * CELL + CELL / 2 + (extra.dx ?? 0), z: cz * CELL + CELL / 2 + (extra.dz ?? 0), y, s, rot: extra.rot ?? 0 });

    for (let cz = 0; cz < L.h; cz++) {
      for (let cx = 0; cx < L.w; cx++) {
        const ch = L.cell(cx, cz);
        // ground (top surface at y = 0)
        if (ch === '~') block('blocks/water', cx, cz, -2.9); // pond bed, under the animated surface
        else if (ch === '=') block('blocks/gravel', cx, cz, -2);
        else if (ch === 'R' || ch === 'm') block('blocks/sand_A', cx, cz, -2);
        else block('blocks/dirt_with_grass', cx, cz, -2);

        if (ch === '#') {
          trees.push([cx, cz]); // see makeTrees
        } else if (ch === 'H' || ch === 'd') {
          // the family fort: brick walls with battlements
          block('blocks/bricks_A', cx, cz, 2);
          for (const [dx, dz] of [[-1, -1], [1, 1]]) block('blocks/stone', cx, cz, 5, 1, { dx, dz });
        } else if (ch === 'S') {
          block('blocks/wood', cx, cz, 2);
          block(cz % 2 ? 'blocks/striped_block_red' : 'blocks/striped_block_blue', cx, cz, 5, 1.6);
        } else if (ch === 'R' || ch === 'm') {
          block('blocks/stone_dark', cx, cz, 2);
          if (ch === 'R' && this.rand(cx, cz, 'r') > 0.3) block('blocks/stone', cx, cz, 5, 1, { dx: this.rand(cx, cz, 'x') - 0.5 });
        } else if (ch === 'G' || ch === 'g') {
          block('blocks/stone', cx, cz, 2);
          block('blocks/stone', cx, cz, 6);
        }
      }
    }
    b.flush();

    // painted grass with swaying tufts, and moving water, on top of the blocks
    const grass = [], water = [];
    for (let cz = 0; cz < L.h; cz++) {
      for (let cx = 0; cx < L.w; cx++) {
        const ch = L.cell(cx, cz);
        if (ch === '~') water.push([cx, cz]);
        else if (ch === '.' || ch === '#') grass.push([cx, cz]);
      }
    }
    this.group.add(makeGrass(grass, this.rand, this.uTime));
    this.group.add(makeTrees(trees, this.rand, this.uTime));
    const pond = makeWater(water, this.rand, this.uTime, { healing: L.props.some((p) => p.interact === 'spring') });
    this.group.add(pond);
    this.animated.push({ update: () => pond.userData.update(this.uTime.value) });

    // faces for the portals
    for (const portal of Object.values(L.portals)) {
      const [dx, dz] = portal.dir;
      const rot = Math.atan2(dx, dz); // face outwards toward the walkable cell
      const x = portal.cx * CELL + CELL / 2 + dx * (CELL / 2 + 0.05);
      const z = portal.cz * CELL + CELL / 2 + dz * (CELL / 2 + 0.05);
      if (portal.id === 'g') {
        this.gate = { closed: cloneModel('dungeon/wall_gated'), open: cloneModel('dungeon/wall_arched'), glow: makeGlow(0x9b6bff) };
        for (const o of Object.values(this.gate)) { o.position.set(x, 0, z); o.rotation.y = rot; this.group.add(o); }
        this.gate.glow.position.y = 1.8;
      } else {
        const door = cloneModel('dungeon/wall_doorway');
        door.position.set(x, 0, z);
        door.rotation.y = rot;
        this.group.add(door);
        const banner = cloneModel(portal.id === 'm' ? 'dungeon/banner_shield_red' : 'dungeon/banner_patternA_blue');
        banner.position.set(x + Math.cos(rot) * 2.6, 0.5, z - Math.sin(rot) * 2.6);
        banner.rotation.y = rot;
        this.group.add(banner);
      }
      // dark opening so doorways read as "go in here"
      const hole = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3), new THREE.MeshBasicMaterial({ color: 0x0a0806 }));
      hole.position.set(x - dx * 0.06, 1.5, z - dz * 0.06);
      hole.rotation.y = rot;
      if (portal.id !== 'g') this.group.add(hole);
    }

    // a shop counter in front of the shopkeeper
    const keeper = L.props.find((p) => p.type === 'shopkeeper');
    if (keeper) {
      const counter = cloneModel('dungeon/table_long');
      counter.position.set(keeper.x, 0, keeper.z + 1.3);
      counter.rotation.y = Math.PI / 2;
      this.group.add(counter);
    }
  }

  buildProps() {
    const torchLights = [];
    for (const p of this.layout.props) {
      let obj;
      if (p.npc) {
        const npc = new CharacterView({ cls: p.npc, name: p.npcName ?? 'Shopkeeper', weapon: null });
        npc.root.position.set(p.x, 0, p.z);
        npc.root.rotation.y = p.rot;
        this.animated.push(npc);
        obj = npc.root;
      } else {
        const builders = { wardrobe: makeWardrobe, springSign: makeSpringSign, mirror: makeMirror };
        obj = builders[p.build]?.() ?? cloneModel(p.model);
        obj.position.set(p.x, p.y ?? 0, p.z);
        obj.rotation.y = p.rot ?? 0;
      }
      this.group.add(obj);
      if (p.stall) this.buildPetStall(p);
      if (p.build === 'forge') this.buildForge(p);
      if (p.light) torchLights.push(p);
    }
    // real lights are expensive: only light a handful of torches
    for (const t of torchLights.slice(0, 6)) {
      const light = new THREE.PointLight(0xffa040, 18, 14, 1.6);
      light.position.set(t.x, 3.2, t.z + 0.8);
      this.group.add(light);
      this.lights.push(light);
    }
    if (this.layout.theme === 'wood') {
      const lamp = new THREE.PointLight(0xffc477, 40, 30, 1.2);
      lamp.position.set(this.layout.w * CELL / 2, 6, this.layout.h * CELL / 2);
      this.group.add(lamp);
    }
  }

  /** Anvil + a stone furnace with flickering fire, in front of the blacksmith. */
  buildForge(p) {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    const iron = new THREE.MeshStandardMaterial({ color: 0x3d4148, metalness: 0.7, roughness: 0.4 });
    const stone = new THREE.MeshStandardMaterial({ color: 0x77706a, roughness: 1, flatShading: true });
    const box = (w, h, d, mat, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
      return m;
    };
    // anvil in front of the smith
    box(0.5, 0.6, 0.5, new THREE.MeshStandardMaterial({ color: 0x6b4a2c }), 0, 0.3, 1.4); // stump
    box(0.9, 0.18, 0.45, iron, 0, 0.7, 1.4);
    box(0.4, 0.2, 0.3, iron, 0, 0.52, 1.4);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 8), iron);
    horn.rotation.z = Math.PI / 2;
    horn.position.set(0.66, 0.7, 1.4);
    g.add(horn);
    // furnace to the side
    box(1.6, 1.6, 1.4, stone, -2.2, 0.8, 0.2);
    box(0.6, 1.4, 0.6, stone, -2.2, 2.3, 0.0); // chimney
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshBasicMaterial({ color: 0xff7a1a }));
    mouth.position.set(-2.2, 0.6, 0.91);
    g.add(mouth);
    const fire = new THREE.PointLight(0xff8a30, 14, 9, 1.6);
    fire.position.set(-2.2, 0.8, 1.4);
    g.add(fire);
    this.animated.push({ update: () => {
      const t = performance.now() / 1000;
      fire.intensity = 12 + Math.sin(t * 11) * 3 + Math.sin(t * 27) * 2;
      mouth.material.color.setHSL(0.07 + Math.sin(t * 7) * 0.015, 1, 0.55);
    } });
    this.group.add(g);
  }

  /** Counter with a striped awning, and every pet sitting on display. */
  buildPetStall(p) {
    const stall = new THREE.Group();
    stall.position.set(p.x, 0, p.z);
    const counter = cloneModel('dungeon/table_long');
    counter.position.set(0, 0, 1.3);
    counter.rotation.y = Math.PI / 2;
    stall.add(counter);
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.85 });
    for (const sx of [-1.9, 1.9]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 8), wood);
      pole.position.set(sx, 1.8, 1.9);
      pole.castShadow = true;
      stall.add(pole);
    }
    const stripes = [0xff9ab8, 0xffffff];
    for (let i = 0; i < 8; i++) { // sloped awning in pink and white stripes
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 2.6), new THREE.MeshStandardMaterial({ color: stripes[i % 2], roughness: 0.8 }));
      s.position.set(-1.75 + i * 0.5, 3.5, 0.9);
      s.rotation.x = -0.32;
      s.castShadow = true;
      stall.add(s);
    }
    const kinds = ['maple', 'frog', 'bunny', 'cat', 'dragon']; // a few of the 20 on display
    kinds.forEach((kind, i) => {
      const pet = new PetView(kind);
      pet.root.position.set(-1.4 + i * 0.7, 1.02, 1.35);
      pet.root.scale.setScalar(0.85);
      stall.add(pet.root);
      this.animated.push({ update: (dt) => { pet.t += dt; pet.animate(dt, false); } });
    });
    this.group.add(stall);
  }

  /** World flags changed (e.g. boss beaten) — update the ancient gate. */
  setFlags(flags) {
    if (!this.gate) return;
    const open = !!flags.mineCleared;
    this.gate.closed.visible = !open;
    this.gate.open.visible = open;
    this.gate.glow.visible = open;
  }

  update(dt, time) {
    this.uTime.value = time;
    for (const a of this.animated) a.update(dt);
    for (const [i, l] of this.lights.entries()) l.intensity = 16 + Math.sin(time * 9 + i * 7) * 2 + Math.sin(time * 23 + i) * 1.5;
    if (this.gate?.glow.visible) this.gate.glow.material.opacity = 0.55 + Math.sin(time * 3) * 0.2;
  }

  dispose() {
    for (const a of this.animated) a.dispose?.();
    this.group.removeFromParent();
  }
}
