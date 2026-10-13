// Living outdoor ground: a painted grass carpet with swaying tufts, and moving water.
// Everything here is client-only decoration, so Math.random is fine for the textures
// (they're drawn once per page), but placement uses the layout's seeded `rand`.
import * as THREE from 'three';
import { CELL } from '../shared/config.js';
import { SEASON_LOOK, SEASON_GLSL, WINTER } from './seasonfx.js';

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
/** `skip(x, z)`: no tufts there (under the pond's water). */
export function makeGrass(cells, rand, uTime, { skip = null } = {}) {
  const group = new THREE.Group();
  // big-scale tint per corner so the repeating texture doesn't read as a grid
  const tint = (x, z) => {
    const n = rand(Math.round(x / CELL), Math.round(z / CELL), 'tint');
    const k = 0.86 + n * 0.22;
    return [k * (0.95 + n * 0.08), k, k * 0.92];
  };
  const carpetMat = new THREE.MeshStandardMaterial({ map: grassTexture(), vertexColors: true, roughness: 1 });
  seasonalShader(carpetMat, '1.0', '0.5 + 0.5 * sin(vMapUv.x * 2.3 + sin(vMapUv.y * 1.7) * 2.0)'); // a soft, slow change of shade (no stripes)
  const carpet = new THREE.Mesh(cellQuads(cells, 0.02, GRASS_TILE, tint), carpetMat);
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
    seasonFragment(shader, '1.0', 'vColor.g');
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
      const x = cx * CELL + rand(cx, cz, `tx${i}`) * CELL, z = cz * CELL + rand(cx, cz, `tz${i}`) * CELL;
      if (skip?.(x, z)) continue;
      spots.push({
        x, z,
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

/** The water's swell at a point (matches WAVES in the shader), so floating things bob with it. */
const WAVE_MAX = 0.045 * 2 + 0.025;
function waveHeight(x, z, t) {
  return (Math.sin(x * 0.55 + t * 1.3) + Math.sin(z * 0.7 - t * 1.1)) * 0.045 + Math.sin((x + z) * 0.9 + t * 1.9) * 0.025;
}

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
  if (disc) { // a round pool: one disc instead of square cells (`disc.edge(angle)` = an uneven shore)
    const g = new THREE.CircleGeometry(1, 64);
    const p = g.attributes.position;
    for (let i = 1; i < p.count; i++) {
      const a = Math.atan2(p.getY(i), p.getX(i)), r = disc.edge ? disc.edge(a) : disc.r;
      p.setXY(i, Math.cos(a) * r, Math.sin(a) * r);
    }
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
    shader.uniforms.uWinter = WINTER; // winter: the water freezes over (no waves, pale cracked ice)
    shader.vertexShader = `uniform float uTime;\nuniform float uWinter;\n${WAVES}\n${shader.vertexShader}`
      .replace('#include <beginnormal_vertex>', `
        vec3 wv = waterWave(position.xz) * (1.0 - uWinter);
        vec3 objectNormal = normalize(vec3(-wv.y, 1.0, -wv.z));`)
      .replace('#include <begin_vertex>', `
        vec3 transformed = vec3(position);
        transformed.y += wv.x;`);
    shader.fragmentShader = `uniform float uTime;\nuniform float uWinter;\n${shader.fragmentShader}`.replace('#include <map_fragment>', `
      float flow = uTime * (1.0 - uWinter);
      float r1 = texture2D(map, vMapUv + vec2(flow * 0.035, flow * 0.02)).r;
      float r2 = texture2D(map, vMapUv * 1.37 + vec2(-flow * 0.025, flow * 0.04)).r;
      float shine = smoothstep(0.55, 1.2, r1 + r2);
      diffuseColor.rgb = mix(diffuseColor.rgb * (0.9 + 0.15 * r1), vec3(0.85, 0.96, 1.0), shine * 0.75);
      // ice: frosty blue-white, cloudy patches, thin dark cracks and a dusting of snow
      float i1 = texture2D(map, vMapUv * 0.45).r, i2 = texture2D(map, vMapUv * 1.9 + 0.37).r;
      float crack = 1.0 - (1.0 - smoothstep(0.0, 0.035, abs(i1 - 0.5))) * 0.45;
      vec3 ice = mix(vec3(0.62, 0.8, 0.92), vec3(0.9, 0.96, 1.0), smoothstep(0.3, 0.8, i2)) * crack;
      ice = mix(ice, vec3(0.97, 0.98, 1.0), smoothstep(0.62, 0.85, i1 * 0.6 + i2 * 0.5) * 0.8);
      diffuseColor.rgb = mix(diffuseColor.rgb, ice, uWinter);
      diffuseColor.a = mix(diffuseColor.a, 0.97, uWinter);`);
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
    if (disc) {
      const a = rand(cx, cz, 'lx') * Math.PI * 2, d = (0.3 + rand(cx, cz, 'lz') * 0.5) * (disc.edge ? disc.edge(a) : disc.r);
      holder.position.set(disc.x + Math.cos(a) * d, level + 0.03, disc.z - Math.sin(a) * d);
    } else holder.position.set(cx * CELL + 0.8 + rand(cx, cz, 'lx') * (CELL - 1.6), level + 0.03, cz * CELL + 0.8 + rand(cx, cz, 'lz') * (CELL - 1.6));
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
      if (disc) { const a = rand(cx, cz, `sx${i}`) * Math.PI * 2, d = Math.sqrt(rand(cx, cz, `sz${i}`)) * disc.r * 0.8; s.userData.x = disc.x + Math.cos(a) * d; s.userData.z = disc.z + Math.sin(a) * d; }
      group.add(s);
      sparkles.push(s);
    }
  }

  group.userData.update = (time) => {
    for (const s of sparkles) { // float up, fade out, start again
      const u = (time * 0.35 + s.userData.phase) % 1;
      s.position.set(s.userData.x + Math.sin(time * 2 + s.userData.phase * 9) * 0.25, level + u * 2.4, s.userData.z);
      s.material.opacity = Math.sin(u * Math.PI) * (disc ? 0.55 : 0.9);
      s.scale.setScalar((disc ? 0.6 : 1) * (0.35 + 0.3 * Math.sin(u * Math.PI)));
    }
    for (const p of pads) p.visible = WINTER.value < 0.5; // no lily pads on the ice
    for (const p of pads) { // always on top: just over the highest wave (WAVE_MAX), bobbing a touch with the swell
      p.position.y = level + WAVE_MAX + 0.02 + (waveHeight(p.position.x, p.position.z, time) + WAVE_MAX) * 0.15;
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
  const treeMat = (evergreen) => {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
    mat.onBeforeCompile = (shader) => {
    // only the leaves change with the season (green-ish vertex colours), not trunks or blossom
    // blossom trees only flower in spring: the rest of the year their pink turns to leaves, which then follow the season
    // each leafy tree turns its own autumn colour (yellow, orange or red); pines stay green (but take the snow)
    seasonFragment(shader, 'max(clamp((vColor.g - max(vColor.r, vColor.b)) * 14.0, 0.0, 1.0), bloom)', 'fract(vTreeSeed + fract(vColor.b * 13.0 + vColor.r * 7.0) * 0.22)', `
      float bloom = clamp((vColor.r - vColor.g) * 4.0, 0.0, 1.0) * step(0.55, vColor.b);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.58, 0.24) * (0.8 + vColor.r * 0.4), bloom * (1.0 - uSeason.x));`, evergreen ? 'vec4(uSeason.x + uSeason.z, uSeason.y, 0.0, uSeason.w)' : 'uSeason', 'varying float vTreeSeed;', evergreen ? '' : `
      diffuseColor.rgb = mix(diffuseColor.rgb, treeAutumn(preSeason, fract(vTreeSeed + fract(vColor.b * 13.0 + vColor.r * 7.0) * 0.22)), uSeason.z * clamp((vColor.g - max(vColor.r, vColor.b)) * 14.0, 0.0, 1.0) * 0.9);`);
    shader.uniforms.uTime = uTime;
    shader.vertexShader = `uniform float uTime;\nvarying float vTreeSeed;\n${shader.vertexShader}`.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 base = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
      #else
        vec2 base = vec2(0.0);
      #endif
      vTreeSeed = fract(sin(dot(base, vec2(12.9898, 78.233))) * 43758.5453);
      float bend = max(position.y - 2.0, 0.0);
      float sway = sin(uTime * 1.1 + base.x * 0.17 + base.y * 0.11) * 0.7 + sin(uTime * 2.3 + base.x * 0.5) * 0.3;
      transformed.x += sway * bend * 0.035;
      transformed.z += sway * bend * 0.015;`);
    };
    mat.customProgramCacheKey = () => (evergreen ? 'tree-evergreen' : 'tree');
    return mat;
  };
  const mat = treeMat(false), pineMat = treeMat(true);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (const [kind, list] of Object.entries(byKind)) {
    if (!list.length) continue;
    const inst = new THREE.InstancedMesh(treeGeos[kind], kind === 'pine' ? pineMat : mat, list.length);
    list.forEach((t, i) => {
      q.setFromAxisAngle(up, t.rot);
      inst.setMatrixAt(i, m.compose(new THREE.Vector3(t.x, 0, t.z), q, new THREE.Vector3(t.s, t.s, t.s)));
    });
    inst.computeBoundingSphere();
    inst.castShadow = inst.receiveShadow = true;
    group.add(inst);
  }
  group.userData.spots = Object.entries(byKind).flatMap(([kind, list]) => list.map((t) => ({ ...t, kind }))); // for Christmas lights
  return group;
}

/** An uneven, roughly round shoreline: radius at each angle, `r` on average. */
export function pondEdge(r, rand) {
  const a1 = rand(0, 0, 'pe1') * 6.3, a2 = rand(0, 0, 'pe2') * 6.3, a3 = rand(0, 0, 'pe3') * 6.3;
  return (a) => r * (1 + 0.07 * Math.sin(2 * a + a1) + 0.05 * Math.sin(3 * a + a2) + 0.03 * Math.sin(5 * a + a3));
}

/**
 * The healing spring's banks: a deep-teal pool bed under the water, smooth stones ringing the
 * shore, and clumps of reeds and cattails. Nothing glows: it's a calm, safe place.
 */
export function makeSpringBanks(cx, cz, edge, rand) {
  const group = new THREE.Group();
  // the pool bed: darker in the middle, so the water has some depth
  const bed = new THREE.CircleGeometry(1, 64);
  const p = bed.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) {
    // a little smaller than the water, so its pale rim never peeks out between the shore stones
    const a = Math.atan2(p.getY(i), p.getX(i)), k = i === 0 ? 0 : 1, r = Math.max(0.5, edge(a) - 0.25);
    p.setXY(i, Math.cos(a) * r * k, Math.sin(a) * r * k);
    col.push(...(k ? [0.36, 0.55, 0.42] : [0.1, 0.3, 0.36]));
  }
  bed.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  bed.rotateX(-Math.PI / 2);
  const bedMesh = new THREE.Mesh(bed, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  bedMesh.position.set(cx, 0.03, cz);
  bedMesh.receiveShadow = true;
  group.add(bedMesh);

  // smooth river stones along the shore, a few gaps so it doesn't look like a wall
  const stoneGeo = new THREE.IcosahedronGeometry(1, 1);
  const stoneMat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
  const stones = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + rand(i, 0, 'sa') * 0.05;
    if (rand(i, 1, 'gap') < 0.18) continue;
    const r = edge(a) + 0.15 + rand(i, 2, 'sr') * 0.35, s = 0.28 + rand(i, 3, 'ss') * 0.3;
    stones.push({ x: cx + Math.cos(a) * r, z: cz - Math.sin(a) * r, s, rot: rand(i, 4, 'sy') * 6.3, shade: 0.7 + rand(i, 5, 'sc') * 0.3 });
  }
  const stoneInst = new THREE.InstancedMesh(stoneGeo, stoneMat, stones.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  stones.forEach((st, i) => {
    q.setFromAxisAngle(up, st.rot);
    stoneInst.setMatrixAt(i, m.compose(new THREE.Vector3(st.x, st.s * 0.15, st.z), q, new THREE.Vector3(st.s * 1.3, st.s * 0.55, st.s)));
    stoneInst.setColorAt(i, c.setRGB(0.62 * st.shade, 0.64 * st.shade, 0.66 * st.shade));
  });
  stoneInst.castShadow = stoneInst.receiveShadow = true;
  group.add(stoneInst);

  // reeds and cattails in a few clumps at the water's edge, swaying a little
  const reedGeo = new THREE.CylinderGeometry(0.025, 0.04, 1, 4);
  reedGeo.translate(0, 0.5, 0);
  const headGeo = new THREE.CapsuleGeometry(0.07, 0.22, 2, 6);
  const reedMat = new THREE.MeshStandardMaterial({ color: 0x5f9a3a, roughness: 1 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0x7a4a26, roughness: 1 });
  const reeds = [];
  for (let k = 0; k < 6; k++) {
    const a0 = (k / 6) * Math.PI * 2 + rand(k, 0, 'ca') * 0.6;
    for (let j = 0; j < 7; j++) {
      const a = a0 + (rand(k, j, 'cj') - 0.5) * 0.25, r = edge(a) - 0.2 + rand(k, j, 'cr') * 0.5;
      reeds.push({ x: cx + Math.cos(a) * r, z: cz - Math.sin(a) * r, h: 1 + rand(k, j, 'ch') * 0.9, lean: (rand(k, j, 'cl') - 0.5) * 0.25, head: rand(k, j, 'hd') > 0.55 });
    }
  }
  const sway = [];
  for (const r of reeds) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(reedGeo, reedMat);
    stem.scale.y = r.h;
    g.add(stem);
    if (r.head) { const h = new THREE.Mesh(headGeo, headMat); h.position.y = r.h + 0.05; g.add(h); }
    g.position.set(r.x, 0, r.z);
    g.rotation.z = r.lean;
    g.userData.lean = r.lean;
    group.add(g);
    sway.push(g);
  }
  group.userData.update = (time) => {
    for (const g of sway) g.rotation.z = g.userData.lean + Math.sin(time * 1.4 + g.position.x * 0.7) * 0.05;
  };
  return group;
}

/** Make a material follow the season (client/seasonfx.js): `leaf` = how much it changes, `grain` = autumn's orange/red mix. */
function seasonFragment(shader, leaf, grain, pre = '', season = 'uSeason', decl = '', post = '') {
  shader.uniforms.uSeason = SEASON_LOOK;
  shader.fragmentShader = `uniform vec4 uSeason;\n${decl}\n${SEASON_GLSL}\n${shader.fragmentShader}`.replace('#include <color_fragment>', `
    #include <color_fragment>
    ${pre}
    vec3 preSeason = diffuseColor.rgb;
    diffuseColor.rgb = seasonalIn(diffuseColor.rgb, ${leaf}, ${grain}, ${season});
    ${post}`);
}
function seasonalShader(mat, leaf, grain) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSeason = SEASON_LOOK;
    shader.fragmentShader = `uniform vec4 uSeason;\n${SEASON_GLSL}\n${shader.fragmentShader}`.replace('#include <map_fragment>', `
      #include <map_fragment>
      diffuseColor.rgb = seasonal(diffuseColor.rgb, ${leaf}, ${grain});`);
  };
}
