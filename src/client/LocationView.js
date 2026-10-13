// Builds the static 3D scene for a layout: floors, walls, buildings, props, lights.
import * as THREE from 'three';
import { CELL, SPRING_COST } from '../shared/config.js';
import { hashSeed } from '../shared/rng.js';
import { instanced, cloneModel } from './assets.js';
import { CharacterView, makeGlow, SEASON_WEAR } from './views.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { makeGrass, makeWater, makeTrees, makeSpringBanks, pondEdge } from './nature.js';
import { wallpaperTexture } from './wallpaper.js';
import { PetView } from './pets.js';
import { DECORATIONS } from './decorations.js';
import { makeCottage, makeTowerTop, makeFence, makeStall, makeFountain, makeLampPost, makeFlowers, makeFairies, makeChains, makeBench, makeEnchanterTent, makeBankBooth, makePlanter, makeCart, makeNoticeBoard, makeFeastTable, makeSeasonalStall } from './town.js';
import { Villagers } from './villagers.js';
import { TOWNSFOLK } from '../shared/townsfolk.js';
import { FLOOR_STYLES, WALL_STYLES } from '../shared/furniture.js';
import { roomIndexAt } from '../shared/locations.js';
import { THEMES } from './themes.js';
import { mergeStatic, dropTinyShadows } from './merge.js';
import { buildTownFun } from './townfun.js';
import { seasonOf } from '../shared/seasons.js';
import { SeasonParticles, easeSeasonLook, SEASON_LOOK, WINTER, snowOnTops } from './seasonfx.js';

/** Wooden signpost for the healing spring. */
function makeSpringSign() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.85 });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.6, 0.18), wood);
  post.position.y = 0.8;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c99a63';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#7a5030';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 498, 242);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8456b';
  ctx.font = 'bold 76px system-ui, sans-serif';
  ctx.fillText('♥ Healing Spring', 256, 110);
  ctx.fillStyle = '#5a3a1c';
  ctx.font = 'bold 60px system-ui, sans-serif';
  ctx.fillText(`${SPRING_COST} gold`, 256, 190);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // the words are on both faces, so it reads from either side of the pond (the back copy is flipped back the right way round)
  const back = tex.clone();
  back.repeat.x = -1; back.offset.x = 1; back.needsUpdate = true;
  const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  const behind = new THREE.MeshStandardMaterial({ map: back, roughness: 0.9 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 0.08), [wood, wood, wood, wood, front, behind]);
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


const N = [0, -1], E = [1, 0], S = [0, 1], W = [-1, 0];
// wall rotation so its front faces into the walkable cell
const EDGE_ROT = new Map([[N, 0], [S, Math.PI], [W, Math.PI / 2], [E, -Math.PI / 2]]);

export class LocationView {
  constructor(layout, world) {
    this.layout = layout;
    this.world = world;
    this.group = new THREE.Group();
    this.lights = [];
    this.animated = [];   // things with update(dt)
    this.gates = {};       // dungeon id -> { closed, open, glow, chains } (town only)
    this.flagged = [];     // things hidden until a world flag is set (the Decorator's stall)
    this.lampLights = [];
    this.merged = [];      // geometries made by still(), freed in dispose()
    this.theme = THEMES[layout.theme];
    const r = (cx, cz, salt = '') => hashSeed(layout.seed, cx, cz, salt) / 2 ** 32; // stable per-cell randomness
    this.rand = r;
    this.uTime = { value: 0 }; // shared by the grass and water shaders

    this.setSeasonWear();
    if (layout.theme === 'outdoor') this.buildOutdoor();
    else this.buildIndoor();
    this.buildProps();
    if (layout.key === 'town') snowOnTops(this.group, (o) => o.userData.noSnow);
    dropTinyShadows(this.group);
    this.setWorld(world);
  }

  /** Collect transforms per model then emit one instanced group per model (`opts`: see instanced()). */
  batch(opts) {
    const map = new Map();
    const tint = this.theme?.tint;
    return {
      // `tintOverride` recolours just this model (e.g. the fort's chosen wall colour)
      add: (path, t, tintOverride) => {
        const key = tintOverride != null ? `${path}|${tintOverride}` : path;
        if (!map.has(key)) map.set(key, { path, tint: tintOverride ?? tint, list: [] });
        map.get(key).list.push(t);
      },
      flush: () => {
        for (const { path, tint: c, list } of map.values()) {
          const g = instanced(path, list, opts);
          if (c != null) for (const m of g.children) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(c)); }
          this.group.add(g);
        }
      },
    };
  }

  buildIndoor() {
    const L = this.layout, b = this.batch(), th = this.theme;
    // the common room uses the family's chosen floor and wall colour (bought from the Decorator);
    // each family member's room has its own (plain stone and oak until they pick something)
    const home = L.key === 'house' ? { floor: FLOOR_STYLES[this.world?.house?.floor] ?? FLOOR_STYLES.oak, wall: WALL_STYLES[this.world?.house?.wall] ?? WALL_STYLES.stone } : null;
    const roomStyles = home ? (this.world?.house?.roomStyles ?? {}) : null;
    const papers = []; // wallpapered wall faces: { style, x, z, rot, sy }
    for (let cz = 0; cz < L.h; cz++) {
      for (let cx = 0; cx < L.w; cx++) {
        if (L.isSolidCell(cx, cz)) continue;
        const x = cx * CELL + CELL / 2, z = cz * CELL + CELL / 2;
        const fi = Math.floor(this.rand(cx, cz, 'f') * th.floors.length);
        // whose room is this? (a room's slot is its index: one bed slot per room)
        const room = home ? roomIndexAt(L, cx, cz) : -1;
        const rs = room >= 0 ? roomStyles?.[room] : null;
        const floorStyle = room >= 0 ? FLOOR_STYLES[rs?.floor] ?? FLOOR_STYLES.oak : home?.floor;
        const wallStyle = room >= 0 ? WALL_STYLES[rs?.wall] ?? WALL_STYLES.stone : home?.wall;
        // wallpaper goes over a plain wall; the wall's own colour stays stone
        const wallTint = wallStyle?.pattern ? 0xffffff : wallStyle?.tint ?? 0xffffff;
        if (home) b.add(floorStyle.model, { x, z, rot: Math.floor(this.rand(cx, cz, 'r') * 4) * Math.PI / 2 }, floorStyle.tint ?? 0xffffff);
        else b.add(th.floors[fi], { x, z, rot: Math.floor(this.rand(cx, cz, 'r') * 4) * Math.PI / 2 });

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
          if (wallStyle?.pattern && ch !== 'D') { path = 'dungeon/wall'; papers.push({ style: wallStyle, x: ex, z: ez, rot, sy }); }
          b.add(path, { x: ex, z: ez, rot, sy }, home ? wallTint : undefined);
        }
      }
    }
    b.flush();
    if (papers.length) this.buildWallpaper(papers);
    if (home) this.buildWallTops();
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

  /** Wallpaper: a patterned panel just in front of each papered wall face, over a wooden skirting board. */
  buildWallpaper(papers) {
    const plane = new THREE.PlaneGeometry(CELL, 3.6);
    plane.translate(0, 1.8, 0);
    const skirt = new THREE.BoxGeometry(CELL, 0.3, 0.08);
    skirt.translate(0, 0.15, 0);
    this.merged.push(plane, skirt);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3();
    const place = (inst, list, out, sy) => list.forEach((p, i) => {
      q.setFromAxisAngle(up, p.rot);
      inst.setMatrixAt(i, m.compose(v.set(p.x + Math.sin(p.rot) * out, 0, p.z + Math.cos(p.rot) * out), q, new THREE.Vector3(1, sy(p), 1)));
    });
    const byStyle = new Map();
    for (const p of papers) { if (!byStyle.has(p.style)) byStyle.set(p.style, []); byStyle.get(p.style).push(p); }
    for (const [style, list] of byStyle) {
      const inst = new THREE.InstancedMesh(plane, new THREE.MeshStandardMaterial({ map: wallpaperTexture(style.pattern), roughness: 0.85 }), list.length);
      place(inst, list, 0.52, (p) => p.sy);
      inst.receiveShadow = true;
      this.group.add(inst);
    }
    const skirting = new THREE.InstancedMesh(skirt, new THREE.MeshStandardMaterial({ color: 0x5e3a20, roughness: 0.7 }), papers.length);
    place(skirting, papers, 0.56, (p) => Math.min(1, p.sy * 4));
    this.group.add(skirting);
  }

  /**
   * The fort's walls are a whole cell thick: from above you'd see down between the two faces.
   * A stone top over each wall cell makes them read as solid. Where the wall in front of the
   * camera is cut down (so you can see into the room), its top sits low too.
   */
  buildWallTops() {
    const TOP_LIFT = 0.05;
    const L = this.layout, tops = [];
    for (let cz = 0; cz < L.h; cz++) {
      for (let cx = 0; cx < L.w; cx++) {
        if (!L.isSolidCell(cx, cz) || L.portals[L.cell(cx, cz)]) continue;
        let near = false;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (!L.isSolidCell(cx + dx, cz + dz)) near = true;
        if (near) tops.push({ x: cx * CELL + CELL / 2, z: cz * CELL + CELL / 2, y: L.isSolidCell(cx, cz - 1) ? 4 : 0.88 });
      }
    }
    // a hair above the wall models' own top face (exactly at 4) and a hair wider than a cell, so
    // the two never flicker against each other and neighbouring tops leave no seams
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL + 0.06, 0.2, CELL + 0.06), new THREE.MeshStandardMaterial({ color: 0x4a4652, roughness: 0.9 }), tops.length);
    const m = new THREE.Matrix4();
    tops.forEach((t, i) => inst.setMatrixAt(i, m.makeTranslation(t.x, t.y - 0.1 + TOP_LIFT, t.z)));
    inst.receiveShadow = true;
    this.group.add(inst);
    this.merged.push(inst.geometry);
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
    const deco = DECORATIONS[kind];
    if (!deco) return;
    const lights = [];
    for (const s of spots) {
      const g = new THREE.Group();
      g.position.set(s.x, 0, s.z);
      g.rotation.y = s.r * Math.PI * 2;
      deco.build(g, s.r);
      this.group.add(g);
      if (deco.update) this.animated.push({ update: () => deco.update(g, this.uTime.value) });
      if (lights.length < 5 && s.r > 0.6) lights.push(s);
    }
    // a few real lights so the glow spills onto the floor
    if (deco.light != null) {
      for (const s of lights) {
        const light = new THREE.PointLight(deco.light, 10, 9, 1.6);
        light.position.set(s.x, 1.2, s.z);
        this.group.add(light);
      }
    }
  }

  buildOutdoor() {
    const L = this.layout, b = this.batch({ trim: 'wall' });
    // blocks sunk into the ground only ever show their top: no sides, no shadows
    const ground = this.batch({ trim: 'ground', shadow: false });
    const trees = [], fences = [];
    const block = (path, cx, cz, y, s = 2, extra = {}) =>
      (y < 0 ? ground : b).add(path, { x: cx * CELL + CELL / 2 + (extra.dx ?? 0), z: cz * CELL + CELL / 2 + (extra.dz ?? 0), y, s, rot: extra.rot ?? 0 });

    // the healing spring: a pond you can wade into
    const pondCells = [];
    for (let cz = 0; cz < L.h; cz++) for (let cx = 0; cx < L.w; cx++) if (L.cell(cx, cz) === '~') pondCells.push([cx, cz]);
    const spring = L.props.some((p) => p.interact === 'spring') && pondCells.length > 0;
    const pond0 = spring ? {
      x: pondCells.reduce((a, [cx]) => a + (cx + 0.5) * CELL, 0) / pondCells.length,
      z: pondCells.reduce((a, [, cz]) => a + (cz + 0.5) * CELL, 0) / pondCells.length,
    } : null;
    // the spring is a round pool inside its square of cells, with a slightly uneven shore
    const pondR = spring ? Math.min(...['x', 'z'].map((k) => {
      const v = pondCells.map((c) => c[k === 'x' ? 0 : 1]);
      return (Math.max(...v) - Math.min(...v) + 1) * CELL / 2;
    })) * 0.88 : 0;
    const edge = spring ? pondEdge(pondR, this.rand) : null;
    const inPond = (x, z) => spring && Math.hypot(x - pond0.x, z - pond0.z) < edge(Math.atan2(-(z - pond0.z), x - pond0.x)) + 0.3;

    for (let cz = 0; cz < L.h; cz++) {
      for (let cx = 0; cx < L.w; cx++) {
        const ch = L.cell(cx, cz);
        // ground (top surface at y = 0)
        if (ch === '~' && !spring) block('blocks/water', cx, cz, -2.9); // pond bed, under the animated surface
        else if (ch === '=') { // cobblestone: flat stone tiles, turned at random
          block('blocks/gravel', cx, cz, -2);
          b.add('dungeon/floor_tile_large', {
            x: cx * CELL + CELL / 2, z: cz * CELL + CELL / 2, y: 0, rot: Math.floor(this.rand(cx, cz, 'cr') * 4) * Math.PI / 2,
          });
        }
        else if (ch === 'R' || ch === 'm') block('blocks/sand_A', cx, cz, -2);
        else block('blocks/dirt_with_grass', cx, cz, -2);

        // the south edge is between the camera and the town, so walls there are kept low
        const south = cz === L.h - 1;
        if (ch === '#' || ch === 't') {
          trees.push([cx, cz]); // see makeTrees
        } else if (ch === 'H' || ch === 'd') {
          // the family fort: brick walls with battlements
          block('blocks/bricks_A', cx, cz, 2);
          block('blocks/bricks_A', cx, cz, 6);
          for (const [dx, dz] of [[-1, -1], [1, 1]]) block('blocks/stone', cx, cz, 9, 1, { dx, dz });
        } else if (ch === 'X' || ch === 'Y') {
          // the castle wall around the town; towers stand taller with a roof and a flag
          block('blocks/stone', cx, cz, 2);
          if (!south) {
            block('blocks/bricks_B', cx, cz, 6);
            for (const [dx, dz] of [[-1, -1], [1, 1], [-1, 1], [1, -1]]) if (this.rand(cx, cz, `cr${dx}${dz}`) > 0.35) block('blocks/stone', cx, cz, 9, 1, { dx, dz });
          }
          if (ch === 'Y' && !south) {
            block('blocks/bricks_B', cx, cz, 10);
            const top = makeTowerTop(cx * CELL + CELL / 2, cz * CELL + CELL / 2, 12, this.rand(cx, cz, 'tw'));
            this.group.add(top);
            this.animated.push({ update: () => top.userData.update(this.uTime.value) });
          }
        } else if (ch === 'Q' || ch === 'q') {
          block('blocks/stone_dark', cx, cz, 2);
          block('blocks/stone_dark', cx, cz, 6);
        } else if (ch === 'E') {
          // one house per 2x2 block of E's, built from its top-left cell
          if (L.cell(cx - 1, cz) !== 'E' && L.cell(cx, cz - 1) !== 'E') this.group.add(this.still(makeCottage((cx + 1) * CELL, (cz + 1) * CELL, this.rand(cx, cz, 'co'))));
        } else if (ch === '+') {
          fences.push([cx, cz]);
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
    ground.flush();

    // painted grass with swaying tufts, and moving water, on top of the blocks
    const grass = [], water = [];
    for (let cz = 0; cz < L.h; cz++) {
      for (let cx = 0; cx < L.w; cx++) {
        const ch = L.cell(cx, cz);
        if (ch === '~') water.push([cx, cz]);
        if ((ch === '~' && spring) || ch === '.' || ch === '#' || ch === 't' || ch === '+' || ch === 'E') grass.push([cx, cz]);
      }
    }
    this.group.add(makeGrass(grass, this.rand, this.uTime, { skip: inPond }));
    this.group.add(makeTrees(trees, this.rand, this.uTime));
    if (L.key === 'town') { // the season shows outdoors: colours (shaders) and drifting petals/leaves/snow
      this.seasonFx = new SeasonParticles(this.group);
      easeSeasonLook(seasonOf(this.world?.day ?? 1).id, 0, true);
    }
    const disc = spring ? { x: pond0.x, z: pond0.z, y: 0.1, r: pondR, edge } : null;
    const pond = makeWater(water, this.rand, this.uTime, { healing: spring, disc });
    this.group.add(pond);
    this.animated.push({ update: () => pond.userData.update(this.uTime.value) });
    if (spring) {
      const banks = makeSpringBanks(pond0.x, pond0.z, edge, this.rand);
      this.group.add(banks);
      this.animated.push({ update: () => banks.userData.update(this.uTime.value) });
      // fairies dancing over the water, and flowers all round the edge
      const fairies = makeFairies(pond0.x, pond0.z, Math.max(2, pondR - 1.5));
      this.group.add(fairies);
      this.animated.push({ update: () => fairies.userData.update(this.uTime.value) });
      const ringSpots = Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.3;
        return { x: pond0.x + Math.cos(a) * (pondR + 2), z: pond0.z + Math.sin(a) * (pondR + 2), r: 0.9, n: 9 };
      }).filter((s) => !L.isSolidCell(Math.floor(s.x / CELL), Math.floor(s.z / CELL)));
      this.group.add(this.springOnly(makeFlowers(ringSpots, this.rand)));
    }
    const beds = (L.decor ?? []).filter((d) => d.kind === 'flowers');
    if (beds.length) this.group.add(this.springOnly(makeFlowers(beds, this.rand)));
    if (fences.length) this.group.add(this.still(makeFence(fences, (cx, cz) => L.cell(cx, cz) === '+')));
    if (L.key === 'town') this.buildTownLife();

    // faces for the portals
    for (const portal of Object.values(L.portals)) {
      const [dx, dz] = portal.dir;
      const rot = Math.atan2(dx, dz); // face outwards toward the walkable cell
      const x = portal.cx * CELL + CELL / 2 + dx * (CELL / 2 + 0.05);
      const z = portal.cz * CELL + CELL / 2 + dz * (CELL / 2 + 0.05);
      if (portal.dungeon && portal.dungeon !== 'mine') {
        // a dungeon gate: barred and chained shut until the dungeon before it is completed
        const glowColor = portal.dungeon === 'keep' ? 0xb04aff : 0x6bd0ff;
        const gate = { closed: cloneModel('dungeon/wall_gated'), open: cloneModel('dungeon/wall_arched'), glow: makeGlow(glowColor) };
        for (const o of Object.values(gate)) { o.position.set(x, 0, z); o.rotation.y = rot; this.group.add(o); }
        gate.glow.position.y = 1.8;
        gate.chains = makeChains();
        gate.chains.group.position.set(x + dx * 0.2, 0, z + dz * 0.2);
        gate.chains.group.rotation.y = rot;
        this.group.add(gate.chains.group);
        gate.at = { x: x + dx * 2, z: z + dz * 2, dx, dz };
        this.gates[portal.dungeon] = gate;
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
      if (!portal.dungeon || portal.dungeon === 'mine') this.group.add(hole);
    }

  }

  /** Pebble Town's extras: villagers strolling, bunting, butterflies, chimney smoke, banners on the walls. */
  buildTownLife() {
    const L = this.layout;
    const villagers = new Villagers(L, this.rand);
    villagers.addTo(this.group);
    this.animated.push({ update: (dt) => villagers.update(dt, this.uTime.value), dispose: () => villagers.dispose() });
    const fun = buildTownFun(L, this.group, this.rand); // bunting, butterflies, chimney smoke
    this.animated.push({ update: () => fun.update(this.uTime.value) });
    // banners hanging on the inside of the north castle wall, and either side of the fort's door
    const colors = ['red', 'blue', 'yellow', 'green'];
    for (let cx = 2; cx < L.w - 2; cx += 4) {
      if (L.cell(cx, 0) !== 'X' || L.cell(cx, 1) !== '.') continue;
      const banner = cloneModel(`dungeon/banner_patternA_${colors[(cx / 4) % colors.length | 0]}`);
      banner.position.set(cx * CELL + CELL / 2, 3.2, CELL + 0.05);
      this.group.add(banner);
    }
    const door = L.portals.d;
    if (door) {
      for (const s of [-1, 1]) {
        const banner = cloneModel('dungeon/banner_shield_blue');
        banner.position.set(door.cx * CELL + CELL / 2 + s * 3.2, 3.6, (door.cz + 1) * CELL + 0.05);
        this.group.add(banner);
      }
    }
  }

  buildProps() {
    const torchLights = [];
    let lamps = 0;
    for (const p of this.layout.props) {
      let obj;
      const folk = p.townsfolk ? TOWNSFOLK[p.folk % TOWNSFOLK.length] : null;
      if (p.npc || folk) {
        const npc = new CharacterView({ cls: folk?.cls ?? p.npc, look: { hat: 'own', cape: 'own', ...(folk?.look ?? p.npcLook) }, name: folk?.name ?? p.npcName ?? 'Shopkeeper', weapon: null });
        npc.root.position.set(p.x, 0, p.z);
        npc.root.rotation.y = folk ? this.rand(Math.round(p.x), Math.round(p.z), 'face') * 1.2 - 0.6 : p.rot;
        this.animated.push(npc);
        obj = npc.root;
      } else if (p.build === 'lamp') {
        obj = this.still(makeLampPost(lamps++ < 6));
        obj.position.set(p.x, 0, p.z);
        if (obj.userData.light) this.lampLights.push(obj.userData.light);
      } else {
        const builders = { wardrobe: makeWardrobe, springSign: makeSpringSign, mirror: makeMirror, fountain: makeFountain, bench: makeBench, planter: makePlanter, cart: makeCart, noticeboard: makeNoticeBoard, feast: makeFeastTable };
        obj = builders[p.build]?.() ?? (p.model ? cloneModel(p.model) : new THREE.Group());
        if (['wardrobe', 'springSign', 'bench', 'planter', 'cart', 'noticeboard'].includes(p.build)) this.still(obj);
        obj.position.set(p.x, p.y ?? 0, p.z);
        obj.rotation.y = p.rot ?? 0;
        if (obj.userData.update) this.animated.push({ update: () => obj.userData.update(this.uTime.value) });
      }
      const holder = new THREE.Group(); // so a stall + its keeper can be hidden together
      holder.add(obj);
      this.group.add(holder);
      if (p.stall) {
        const stall = p.pets ? this.buildPetStall(p, p.stall) : this.still(makeStall(p.stall, p.interact === 'decorator' ? 'decor' : 'shop'));
        if (!p.pets) { stall.position.set(p.x, 0, p.z); holder.add(stall); }
      }
      if (p.build === 'forge') this.buildForge(p);
      if (p.build === 'seasonalStall') { // the Seasonal Trader: the stall changes with the season
        const stall = makeSeasonalStall();
        stall.position.set(p.x, 0, p.z);
        holder.add(stall);
        this.animated.push({ update: () => stall.userData.setSeason(seasonOf(this.world?.day ?? 1).id) });
      }
      if (p.build === 'enchanterTent' || p.build === 'bankBooth') { // a corner or booth round its keeper
        const tent = p.build === 'bankBooth' ? makeBankBooth() : makeEnchanterTent();
        tent.position.set(p.x, 0, p.z);
        tent.rotation.y = p.rot ?? 0;
        holder.add(tent);
        this.animated.push({ update: () => tent.userData.update(this.uTime.value) });
      }
      if (p.light && !p.build) torchLights.push(p);
      if (p.requiresFlag) this.flagged.push({ holder, flag: p.requiresFlag });
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
  buildPetStall(p, color = 0xff9ab8) {
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
    const stripes = [color, 0xffffff];
    for (let i = 0; i < 8; i++) { // sloped awning in pink and white stripes
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 2.6), new THREE.MeshStandardMaterial({ color: stripes[i % 2], roughness: 0.8 }));
      s.position.set(-1.75 + i * 0.5, 3.5, 0.9);
      s.rotation.x = -0.32;
      s.castShadow = true;
      stall.add(s);
    }
    this.still(stall); // the stall itself never moves; the pets on it do
    const kinds = ['maple', 'frog', 'bunny', 'cat', 'dragon']; // a few of the 20 on display
    kinds.forEach((kind, i) => {
      const pet = new PetView(kind);
      pet.root.position.set(-1.4 + i * 0.7, 1.02, 1.35);
      pet.root.scale.setScalar(0.85);
      stall.add(pet.root);
      this.animated.push({ update: (dt) => { pet.t += dt; pet.animate(dt, false); } });
    });
    this.group.add(stall);
    return stall;
  }

  /**
   * The world changed (a boss was beaten, a dungeon completed): show stalls that have opened and
   * gates that are unchained. A gate whose chains are mid-way through breaking keeps them.
   */
  setWorld(world) {
    const flags = world?.flags ?? {};
    for (const f of this.flagged) f.holder.visible = !!flags[f.flag];
    for (const [id, gate] of Object.entries(this.gates)) {
      const open = !!world?.dungeons?.[id]?.unlocked;
      gate.closed.visible = !open && !gate.chains.breaking;
      gate.open.visible = open || gate.chains.breaking;
      gate.glow.visible = open;
      gate.chains.group.visible = gate.chains.breaking ? !gate.chains.done : !open || gate.keepChains;
    }
  }

  /**
   * Keep the chains up on an unlocked gate until playUnlock (the first time this player sees
   * it open). Returns where the camera should look.
   */
  holdChains(dungeonId) {
    const gate = this.gates[dungeonId];
    if (!gate) return null;
    gate.keepChains = true;
    gate.chains.group.visible = true;
    gate.closed.visible = true;
    gate.open.visible = false;
    return gate.at;
  }

  /** The lock-breaking moment: the padlock shakes, cracks, chains fall, the gate opens. */
  playUnlock(dungeonId) {
    const gate = this.gates[dungeonId];
    if (!gate) return;
    gate.chains.breakApart();
    this.animated.push({ update: (dt) => {
      gate.chains.update(dt);
      if (gate.chains.done && gate.keepChains) {
        gate.keepChains = false;
        gate.chains.group.visible = false;
        gate.closed.visible = false;
        gate.open.visible = true;
        gate.glow.visible = true;
      }
    } });
  }

  update(dt, time, focus = null) {
    this.uTime.value = time;
    if (this.seasonFx) {
      const season = seasonOf(this.world?.day ?? 1).id;
      easeSeasonLook(season, dt);
      WINTER.value = SEASON_LOOK.value.w;
      this.setSeasonWear();
      this.seasonFx.setSeason(season);
      if (focus) this.seasonFx.update(dt, time, focus);
    }
    for (const a of this.animated) a.update(dt);
    for (const [i, l] of this.lights.entries()) l.intensity = 16 + Math.sin(time * 9 + i * 7) * 2 + Math.sin(time * 23 + i) * 1.5;
    for (const gate of Object.values(this.gates)) if (gate.glow.visible) gate.glow.material.opacity = 0.55 + Math.sin(time * 3) * 0.2;
  }

  /** Flowers: gone under the snow in winter. */
  springOnly(obj) {
    this.animated.push({ update: () => { obj.visible = WINTER.value < 0.5; } });
    return obj;
  }

  /** What everyone wears out here this time of year (views.js SEASON_WEAR): winter coats in town. */
  setSeasonWear() {
    const town = this.layout.key === 'town';
    if (!town) WINTER.value = 0;
    SEASON_WEAR.value = town && seasonOf(this.world?.day ?? 1).id === 'winter' ? 'winter' : null;
  }

  /** Bake a thing that never moves into a few meshes (fewer draw calls; see merge.js). */
  still(obj) {
    this.merged.push(...mergeStatic(obj));
    return obj;
  }

  dispose() {
    for (const a of this.animated) a.dispose?.();
    for (const g of this.merged) g.dispose();
    this.group.removeFromParent();
  }
}
