// Living outdoor ground: a painted grass carpet with swaying tufts, and moving water.
// Everything here is client-only decoration, so Math.random is fine for the textures
// (they're drawn once per page), but placement uses the layout's seeded `rand`.
import * as THREE from 'three';
import { CELL } from '../shared/config.js';

const GRASS_TILE = CELL * 2;   // world units per repeat of the grass texture
const WATER_Y = -0.2;          // water surface (the water blocks' tops sit at -0.3)

let grassTex = null, waterTex = null;

/** Seamless 512² grass: mottled base, thousands of little blades, a few flowers. */
function grassTexture() {
  if (grassTex) return grassTex;
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#5fae3f';
  g.fillRect(0, 0, S, S);
  // draws a shape 9 times so anything crossing an edge wraps around
  const wrap = (fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy); };
  const rnd = (a, b) => a + Math.random() * (b - a);

  for (let i = 0; i < 70; i++) { // soft light/dark patches
    const x = rnd(0, S), y = rnd(0, S), r = rnd(30, 90);
    const col = Math.random() < 0.5 ? 'rgba(40,110,40,0.18)' : 'rgba(170,220,90,0.16)';
    wrap((ox, oy) => {
      const grad = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      grad.addColorStop(0, col);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    });
  }
  const blades = ['#3f8a2c', '#4c9a33', '#6dbd48', '#7fcb52', '#93d861', '#56a53a'];
  g.lineCap = 'round';
  for (let i = 0; i < 4200; i++) {
    const x = rnd(0, S), y = rnd(0, S), len = rnd(4, 11), lean = rnd(-3, 3);
    g.strokeStyle = blades[Math.floor(Math.random() * blades.length)];
    g.lineWidth = rnd(1, 2.2);
    wrap((ox, oy) => {
      if (x + ox < -12 || x + ox > S + 12 || y + oy < -12 || y + oy > S + 12) return;
      g.beginPath();
      g.moveTo(x + ox, y + oy);
      g.quadraticCurveTo(x + ox + lean * 0.3, y + oy - len * 0.6, x + ox + lean, y + oy - len);
      g.stroke();
    });
  }
  const petals = ['#ffffff', '#fff27a', '#ffb3d9', '#c9b3ff'];
  for (let i = 0; i < 26; i++) { // tiny flowers
    const x = rnd(0, S), y = rnd(0, S), col = petals[Math.floor(Math.random() * petals.length)];
    wrap((ox, oy) => {
      g.fillStyle = col;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.beginPath(); g.arc(x + ox + Math.cos(a) * 2.6, y + oy + Math.sin(a) * 2.6, 2, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#f5b82e';
      g.beginPath(); g.arc(x + ox, y + oy, 1.6, 0, Math.PI * 2); g.fill();
    });
  }
  grassTex = new THREE.CanvasTexture(c);
  grassTex.colorSpace = THREE.SRGBColorSpace;
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.anisotropy = 8;
  return grassTex;
}

/** Seamless grayscale ripple pattern; the shader scrolls two copies across each other. */
function waterTexture() {
  if (waterTex) return waterTex;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, S, S);
  g.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * S, y = Math.random() * S, w = 10 + Math.random() * 34;
    g.strokeStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.5})`;
    g.lineWidth = 1.5 + Math.random() * 2.5;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      g.beginPath();
      g.moveTo(x + ox - w / 2, y + oy);
      g.quadraticCurveTo(x + ox, y + oy - 5, x + ox + w / 2, y + oy);
      g.stroke();
    }
  }
  waterTex = new THREE.CanvasTexture(c);
  waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;
  return waterTex;
}

/** Flat quads (one per cell) merged into one geometry, with world-space UVs. */
function cellQuads(cells, y, uvScale, colorAt) {
  const pos = [], uv = [], col = [], idx = [];
  for (const [cx, cz] of cells) {
    const x0 = cx * CELL, z0 = cz * CELL, base = pos.length / 3;
    for (const [x, z] of [[x0, z0], [x0 + CELL, z0], [x0, z0 + CELL], [x0 + CELL, z0 + CELL]]) {
      pos.push(x, y, z);
      uv.push(x / uvScale, -z / uvScale);
      if (colorAt) col.push(...colorAt(x, z));
    }
    idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (colorAt) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Grass carpet + tufts for every grassy cell.
 * @param cells  [[cx, cz], ...]
 * @param rand   (cx, cz, salt) => [0, 1) stable per cell
 * @param uTime  shared { value } uniform for the wind
 */
export function makeGrass(cells, rand, uTime) {
  const group = new THREE.Group();
  // big-scale tint per corner so the repeating texture doesn't read as a grid
  const tint = (x, z) => {
    const n = rand(Math.round(x / CELL), Math.round(z / CELL), 'tint');
    const k = 0.86 + n * 0.22;
    return [k * (0.95 + n * 0.08), k, k * 0.92];
  };
  const carpet = new THREE.Mesh(
    cellQuads(cells, 0.02, GRASS_TILE, tint),
    new THREE.MeshStandardMaterial({ map: grassTexture(), vertexColors: true, roughness: 1 }),
  );
  carpet.receiveShadow = true;
  group.add(carpet);

  // tufts: a little fan of blades, darker at the root, swaying with the wind
  const blades = 5, pos = [], col = [];
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI + Math.random() * 0.3, h = 0.45 + Math.random() * 0.35;
    const dx = Math.cos(a) * 0.09, dz = Math.sin(a) * 0.09, lean = (i - (blades - 1) / 2) * 0.09;
    pos.push(-dx, 0, -dz, dx, 0, dz, lean, h, lean * 0.5);
    col.push(0.2, 0.42, 0.15, 0.2, 0.42, 0.15, 0.55, 0.85, 0.35);
  }
  const tuftGeo = new THREE.BufferGeometry();
  tuftGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  tuftGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  tuftGeo.computeVertexNormals();
  const tuftMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 1 });
  tuftMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 root = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
      #else
        vec2 root = vec2(0.0);
      #endif
      float sway = sin(uTime * 1.7 + root.x * 0.31 + root.y * 0.23) * 0.6 + sin(uTime * 3.3 + root.x * 0.9) * 0.2;
      float bend = position.y * position.y;
      transformed.x += sway * bend * 0.5;
      transformed.z += sway * bend * 0.2;`);
  };

  const spots = [];
  for (const [cx, cz] of cells) {
    const n = 4 + Math.floor(rand(cx, cz, 'tn') * 5);
    for (let i = 0; i < n; i++) {
      spots.push({
        x: cx * CELL + rand(cx, cz, `tx${i}`) * CELL,
        z: cz * CELL + rand(cx, cz, `tz${i}`) * CELL,
        rot: rand(cx, cz, `tr${i}`) * Math.PI * 2,
        s: 0.7 + rand(cx, cz, `ts${i}`) * 0.8,
      });
    }
  }
  const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  spots.forEach((t, i) => {
    q.setFromAxisAngle(up, t.rot);
    tufts.setMatrixAt(i, m.compose(new THREE.Vector3(t.x, 0, t.z), q, new THREE.Vector3(t.s, t.s, t.s)));
  });
  tufts.computeBoundingSphere();
  tufts.receiveShadow = true;
  group.add(tufts);
  return group;
}

// shared wave function: height + its slope, so lighting moves with the waves
const WAVES = `
  vec3 waterWave(vec2 p) {
    float t = uTime;
    float a = sin(p.x * 0.55 + t * 1.3), b = sin(p.y * 0.7 - t * 1.1), c = sin((p.x + p.y) * 0.9 + t * 1.9);
    float h = (a + b) * 0.045 + c * 0.025;
    float dx = cos(p.x * 0.55 + t * 1.3) * 0.55 * 0.045 + cos((p.x + p.y) * 0.9 + t * 1.9) * 0.9 * 0.025;
    float dz = cos(p.y * 0.7 - t * 1.1) * 0.7 * 0.045 +cos((p.x + p.y) * 0.9 + t * 1.9) * 0.9 * 0.025;
    return vec3(h, dx, dz);
  }`;

let sparkleTex = null;
function sparkleTexture() {
  if (sparkleTex) return sparkleTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,190,230,0.9)');
  grad.addColorStop(1, 'rgba(255,150,220,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  sparkleTex = new THREE.CanvasTexture(c);
  return sparkleTex;
}

/**
 * Moving water surface for every water cell, plus a few bobbing lily pads.
 * `healing` adds pink sparkles drifting up off the water (the healing spring).
 */
export function makeWater(cells, rand, uTime, { healing = false, disc = null, lilyPads = true } = {}) {
  const group = new THREE.Group();
  // subdivide each cell so the vertex waves have something to bend
  const geos = [];
  if (disc) { // a round pool: one disc instead of square cells
    const g = new THREE.CircleGeometry(disc.r, 48);
    g.rotateX(-Math.PI / 2);
    g.translate(disc.x, disc.y, disc.z);
    geos.push(g);
  } else for (const [cx, cz] of cells) {
    const g = new THREE.PlaneGeometry(CELL, CELL, 8, 8);
    g.rotateX(-Math.PI / 2);
    g.translate(cx * CELL + CELL / 2, WATER_Y, cz * CELL + CELL / 2);
    geos.push(g);
  }
  for (const g of geos) {
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 6, -p.getZ(i) / 6);
  }
  const geo = mergeGeometries(geos);
  const level = disc ? disc.y : WATER_Y; // where the surface is (a round pool sits just above the grass)
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3aa6dd, map: waterTexture(), roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.88,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = `uniform float uTime;\n${WAVES}\n${shader.vertexShader}`
      .replace('#include <beginnormal_vertex>', `
        vec3 wv = waterWave(position.xz);
        vec3 objectNormal = normalize(vec3(-wv.y, 1.0, -wv.z));`)
      .replace('#include <begin_vertex>', `
        vec3 transformed = vec3(position);
        transformed.y += wv.x;`);
    shader.fragmentShader = `uniform float uTime;\n${shader.fragmentShader}`.replace('#include <map_fragment>', `
      float r1 = texture2D(map, vMapUv + vec2(uTime * 0.035, uTime * 0.02)).r;
      float r2 = texture2D(map, vMapUv * 1.37 + vec2(-uTime * 0.025, uTime * 0.04)).r;
      float shine = smoothstep(0.55, 1.2, r1 + r2);
      diffuseColor.rgb = mix(diffuseColor.rgb * (0.9 + 0.15 * r1), vec3(0.85, 0.96, 1.0), shine * 0.75);`);
  };
  const surface = new THREE.Mesh(geo, mat);
  surface.receiveShadow = true;
  group.add(surface);

  // lily pads: flat green discs with a notch, gently bobbing and turning
  const padMat = new THREE.MeshStandardMaterial({ color: 0x4fa83a, roughness: 0.8, side: THREE.DoubleSide });
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffb7d5, roughness: 0.6 });
  const pads = [];
  for (const [cx, cz] of cells) {
    if (!lilyPads || rand(cx, cz, 'lily') < 0.45) continue;
    const r = 0.45 + rand(cx, cz, 'lr') * 0.3;
    const pad = new THREE.Mesh(new THREE.CircleGeometry(r, 20, 0.35, Math.PI * 2 - 0.35), padMat);
    pad.rotation.x = -Math.PI / 2;
    const holder = new THREE.Group();
    holder.add(pad);
    if (rand(cx, cz, 'lf') > 0.5) {
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6), flowerMat);
      flower.scale.y = 0.6;
      flower.position.set(r * 0.2, 0.06, 0);
      holder.add(flower);
    }
    holder.position.set(cx * CELL + 0.8 + rand(cx, cz, 'lx') * (CELL - 1.6), level + 0.03, cz * CELL + 0.8 + rand(cx, cz, 'lz') * (CELL - 1.6));
    holder.rotation.y = rand(cx, cz, 'la') * Math.PI * 2;
    holder.userData.phase = rand(cx, cz, 'lp') * 10;
    group.add(holder);
    pads.push(holder);
  }
  const sparkles = [];
  if (healing && cells.length) {
    const mat = new THREE.SpriteMaterial({ map: sparkleTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    for (let i = 0; i < 28; i++) {
      const [cx, cz] = cells[i % cells.length];
      const s = new THREE.Sprite(mat.clone());
      s.userData = { x: cx * CELL + rand(cx, cz, `sx${i}`) * CELL, z: cz * CELL + rand(cx, cz, `sz${i}`) * CELL, phase: rand(cx, cz, `sp${i}`) };
      group.add(s);
      sparkles.push(s);
    }
  }

  group.userData.update = (time) => {
    for (const s of sparkles) { // float up, fade out, start again
      const u = (time * 0.35 + s.userData.phase) % 1;
      s.position.set(s.userData.x + Math.sin(time * 2 + s.userData.phase * 9) * 0.25, level + u * 2.4, s.userData.z);
      s.material.opacity = Math.sin(u * Math.PI) * 0.9;
      s.scale.setScalar(0.35 + 0.3 * Math.sin(u * Math.PI));
    }
    for (const p of pads) {
      p.position.y = level + 0.05 + Math.sin(time * 1.3 + p.userData.phase) * 0.04;
      p.rotation.y += Math.sin(time * 0.3 + p.userData.phase) * 0.0015;
    }
  };
  return group;
}

function mergeGeometries(geos) {
  const pos = [], nor = [], uv = [], idx = [];
  for (const g of geos) {
    const base = pos.length / 3;
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
    uv.push(...g.attributes.uv.array);
    for (const i of g.index.array) idx.push(base + i);
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setIndex(idx);
  return out;
}

// ------------------------------------------------------------------ trees

/** One tree shape as a single geometry with baked vertex colours (so a kind = one draw call). */
function treeGeometry(kind) {
  const pieces = [];
  const add = (geo, color, x, y, z, jitter = 0.06) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.translate(x, y, z);
    const c = new THREE.Color(color), col = [];
    for (let i = 0; i < g.attributes.position.count; i += 3) {
      // flat-shaded low-poly look: each face a slightly different shade
      const k = 1 - jitter + Math.random() * jitter * 2;
      for (let v = 0; v < 3; v++) col.push(c.r * k, c.g * k, c.b * k);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.deleteAttribute('uv');
    pieces.push(g);
  };
  const trunk = (h, r) => add(new THREE.CylinderGeometry(r * 0.7, r, h, 7), 0x7a5232, 0, h / 2, 0, 0.1);
  const blob = (r, color, x, y, z) => add(new THREE.IcosahedronGeometry(r, 1), color, x, y, z, 0.1);

  if (kind === 'pine') {
    trunk(1.6, 0.35);
    const greens = [0x2f7a45, 0x358a4e, 0x3f9a58];
    [[2.1, 2.4, 2.0], [1.7, 2.1, 3.3], [1.25, 1.8, 4.5], [0.7, 1.3, 5.5]].forEach(([r, h, y], i) =>
      add(new THREE.ConeGeometry(r, h, 8), greens[i % 3], 0, y, 0, 0.12));
  } else {
    trunk(3.0, 0.42);
    const leaf = kind === 'blossom' ? [0xffa8cf, 0xffc4dc, 0xff8fc0] : [0x5cb84a, 0x4fa83f, 0x6fcf55];
    blob(1.9, leaf[0], 0, 4.0, 0);
    blob(1.3, leaf[1], 1.2, 3.5, 0.4);
    blob(1.25, leaf[2], -1.1, 3.6, -0.3);
    blob(1.1, leaf[1], 0.2, 5.1, -0.4);
    blob(1.0, leaf[2], -0.3, 3.4, 1.1);
    if (kind === 'apple') {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2, y = 3.3 + (i % 3) * 0.7;
        add(new THREE.IcosahedronGeometry(0.2, 0), 0xe8413a, Math.cos(a) * 1.75, y, Math.sin(a) * 1.75, 0.05);
      }
    }
    if (kind === 'blossom') {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2, y = 3.2 + Math.random() * 2.2;
        add(new THREE.IcosahedronGeometry(0.14, 0), 0xffffff, Math.cos(a) * 1.85, y, Math.sin(a) * 1.85, 0.02);
      }
    }
  }
  const merged = mergeNonIndexed(pieces);
  merged.computeVertexNormals();
  return merged;
}

function mergeNonIndexed(geos) {
  const pos = [], col = [];
  for (const g of geos) {
    pos.push(...g.attributes.position.array);
    col.push(...g.attributes.color.array);
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}

let treeGeos = null;

/**
 * Trees for the given cells: a mix of oaks, pines, apple and blossom trees with
 * random size/turn/offset, swaying a little in the wind (only the crowns move).
 */
export function makeTrees(cells, rand, uTime) {
  treeGeos ??= Object.fromEntries(['oak', 'pine', 'apple', 'blossom'].map((k) => [k, treeGeometry(k)]));
  const group = new THREE.Group();
  const byKind = { oak: [], pine: [], apple: [], blossom: [] };
  for (const [cx, cz] of cells) {
    const r = rand(cx, cz, 'kind');
    const kind = r < 0.42 ? 'oak' : r < 0.8 ? 'pine' : r < 0.9 ? 'apple' : 'blossom';
    byKind[kind].push({
      x: cx * CELL + CELL / 2 + (rand(cx, cz, 'tx') - 0.5) * 1.4,
      z: cz * CELL + CELL / 2 + (rand(cx, cz, 'tz') - 0.5) * 1.4,
      rot: rand(cx, cz, 'tr') * Math.PI * 2,
      s: 0.8 + rand(cx, cz, 'ts') * 0.45,
    });
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 base = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
      #else
        vec2 base = vec2(0.0);
      #endif
      float bend = max(position.y - 2.0, 0.0);
      float sway = sin(uTime * 1.1 + base.x * 0.17 + base.y * 0.11) * 0.7 + sin(uTime * 2.3 + base.x * 0.5) * 0.3;
      transformed.x += sway * bend * 0.035;
      transformed.z += sway * bend * 0.015;`);
  };
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (const [kind, list] of Object.entries(byKind)) {
    if (!list.length) continue;
    const inst = new THREE.InstancedMesh(treeGeos[kind], mat, list.length);
    list.forEach((t, i) => {
      q.setFromAxisAngle(up, t.rot);
      inst.setMatrixAt(i, m.compose(new THREE.Vector3(t.x, 0, t.z), q, new THREE.Vector3(t.s, t.s, t.s)));
    });
    inst.computeBoundingSphere();
    inst.castShadow = inst.receiveShadow = true;
    group.add(inst);
  }
  return group;
}

/**
 * The healing spring's magic: a glowing ring around the pool's edge, and a ring of flowers
 * outside the stone rim. `rim` = the radius the pool's stones sit on.
 */
/** A rounded-rectangle path (used for the spring's halo). */
function roundedRect(path, hw, hh, k) {
  path.moveTo(-hw + k, -hh);
  path.lineTo(hw - k, -hh);
  path.absarc(hw - k, -hh + k, k, -Math.PI / 2, 0, false);
  path.lineTo(hw, hh - k);
  path.absarc(hw - k, hh - k, k, 0, Math.PI / 2, false);
  path.lineTo(-hw + k, hh);
  path.absarc(-hw + k, hh - k, k, Math.PI / 2, Math.PI, false);
  path.lineTo(-hw, -hh + k);
  path.absarc(-hw + k, -hh + k, k, Math.PI, -Math.PI / 2, false);
}

/**
 * The healing spring's magic: a glowing halo that hugs the (square) pond's edge, an inner ring
 * breathing the other way, glowing orbs on the rim, little lights rising like fireflies, and
 * a soft light over the water.
 */
export function makeSpringRing(cx, cz, hw, hh, rand) {
  const group = new THREE.Group();
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x8ff3ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  // the halo lies on the ground just outside the water, following the pond's shape
  const outer = new THREE.Shape();
  roundedRect(outer, hw + 0.55, hh + 0.55, Math.min(hw, hh) * 0.42);
  const inner = new THREE.Path();
  roundedRect(inner, hw + 0.22, hh + 0.22, Math.min(hw, hh) * 0.42 - 0.33);
  outer.holes.push(inner);
  const halo = new THREE.Mesh(new THREE.ShapeGeometry(outer, 12), glowMat);
  halo.rotation.x = -Math.PI / 2;
  halo.position.set(cx, 0.07, cz);
  group.add(halo);

  const innerMat = glowMat.clone();
  innerMat.color.set(0xd0f6ff);
  const innerShape = new THREE.Shape();
  roundedRect(innerShape, hw + 0.1, hh + 0.1, Math.min(hw, hh) * 0.3);
  const innerRing = new THREE.Mesh(new THREE.ShapeGeometry(innerShape, 12), innerMat);
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.set(cx, 0.06, cz);
  group.add(innerRing);

  // glowing orbs around the rim (no green, so they read as magic rather than plants)
  const colors = [0xff8ac6, 0xffe066, 0x9fe8ff, 0xb48cff];
  const orbGeo = new THREE.SphereGeometry(0.1, 10, 8);
  const orbs = [];
  const perim = 2 * (hw + hh);
  for (let i = 0; i < 12; i++) {
    let d = (i / 12) * perim + rand(i, 0, 'fa') * 0.6;
    let x, z;
    if (d < 2 * hw) { x = -hw + d; z = -hh; }                       // south edge, west->east
    else if (d < 2 * hw + 2 * hh) { x = hw; z = -hh + (d - 2 * hw); } // east edge
    else if (d < 4 * hw) { x = hw - (d - 2 * hw - 2 * hh); z = hh; }  // north edge
    else { x = -hw; z = hh - (d - 4 * hw); }                          // west edge
    const color = colors[i % colors.length];
    const orb = new THREE.Mesh(orbGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.3, emissive: color, emissiveIntensity: 0.6 }));
    orb.position.set(cx + x * 1.12, 0.14, cz + z * 1.12);
    orb.userData = { phase: rand(i, 1, 'fp') * 10 };
    group.add(orb);
    orbs.push(orb);
  }

  // little lights that drift up out of the water and fade, like fireflies
  const moteMat = new THREE.SpriteMaterial({ map: sparkleTexture(), color: 0xafe8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const motes = [];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(moteMat.clone());
    s.position.set(cx + (rand(i, 2, 'mx') - 0.5) * 2 * hw, 0.2, cz + (rand(i, 2, 'mz') - 0.5) * 2 * hh);
    s.scale.setScalar(0.22 + rand(i, 3, 'ms') * 0.2);
    s.userData = { speed: 0.25 + rand(i, 4, 'mv') * 0.35, phase: rand(i, 5, 'mp') };
    group.add(s);
    motes.push(s);
  }

  // a soft light over the water so the pool itself glows
  const light = new THREE.PointLight(0x9fe8ff, 26, Math.max(hw, hh) * 3.4, 1.8);
  light.position.set(cx, 2.2, cz);
  group.add(light);

  group.userData.update = (time) => {
    glowMat.opacity = 0.5 + 0.25 * Math.sin(time * 2.2);
    innerMat.opacity = 0.35 + 0.3 * Math.sin(time * 2.2 + Math.PI);
    light.intensity = 22 + 5 * Math.sin(time * 1.7);
    for (const orb of orbs) orb.position.y = 0.14 + 0.08 * (1 + Math.sin(time * 2.4 + orb.userData.phase));
    for (const s of motes) {
      const rise = ((time * s.userData.speed + s.userData.phase) % 1.4);
      s.position.y = 0.2 + rise;
      s.material.opacity = Math.min(1, rise * 3) * (1 - rise / 1.4) * 0.9;
    }
  };
  return group;
}
