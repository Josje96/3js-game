// Seasons you can see outdoors (shared/seasons.js): the grass, tufts and trees read SEASON_LOOK
// in their shaders (client/nature.js) and blend between spring, summer, autumn and winter colours;
// SeasonParticles drifts petals, summer sun motes, falling leaves or snow around the player.
import * as THREE from 'three';
import { glowTexture } from './effects.js';

/** How much of each season the outdoors shows: (spring, summer, autumn, winter), eased when it changes. */
export const SEASON_LOOK = { value: new THREE.Vector4(1, 0, 0, 0) };
const ORDER = ['spring', 'summer', 'autumn', 'winter'];

/** How wintry it is right here (0..1): the town's share of winter; 0 indoors and in the dungeons. Freezes water, snows on roofs. */
export const WINTER = { value: 0 };

/**
 * Snow settles on top of things in winter: any surface facing up, above head height (roofs,
 * tower tops, canopies, wall tops), turns snowy as WINTER rises. Patches the materials of a
 * finished scene once (things that already have their own shader, or see-through, are left alone).
 */
export function snowOnTops(root, skip = () => false) {
  const done = new Set();
  const visit = (o) => {
    if (skip(o)) return;
    if (o.isMesh && !o.isSkinnedMesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || done.has(m) || m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile || m.transparent || !(m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshToonMaterial)) continue;
      done.add(m);
      m.onBeforeCompile = (shader) => {
        shader.uniforms.uWinter = WINTER;
        shader.vertexShader = `varying vec3 vSnowN;\nvarying float vSnowY;\n${shader.vertexShader}`.replace('#include <project_vertex>', `
          #include <project_vertex>
          vec4 snowP = vec4(transformed, 1.0);
          vec3 snowN = objectNormal;
          #ifdef USE_INSTANCING
            snowP = instanceMatrix * snowP;
            snowN = mat3(instanceMatrix) * snowN;
          #endif
          snowP = modelMatrix * snowP;
          vSnowY = snowP.y;
          vSnowN = normalize(mat3(modelMatrix) * snowN);`);
        shader.fragmentShader = `uniform float uWinter;\nvarying vec3 vSnowN;\nvarying float vSnowY;\n${shader.fragmentShader}`.replace('#include <map_fragment>', `
          #include <map_fragment>
          float snowy = uWinter * smoothstep(0.35, 0.7, normalize(vSnowN).y) * smoothstep(1.3, 1.9, vSnowY);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.97, 1.0), snowy * 0.92);`);
      };
      m.customProgramCacheKey = () => 'snowtop';
      m.needsUpdate = true;
    }
    for (const c of o.children) visit(c);
  };
  visit(root);
}

/** Ease the shared look towards `season` (call every frame; snaps when entering a place). */
export function easeSeasonLook(season, dt, snap = false) {
  const target = ORDER.map((s) => (s === season ? 1 : 0));
  const v = SEASON_LOOK.value, k = snap ? 1 : 1 - Math.exp(-dt * 0.8);
  v.set(v.x + (target[0] - v.x) * k, v.y + (target[1] - v.y) * k, v.z + (target[2] - v.z) * k, v.w + (target[3] - v.w) * k);
}

/**
 * The seasonal recolour, for a fragment shader where `diffuseColor` is set: grass & leaves turn
 * gold in summer, orange-red in autumn and snowy in winter. `LEAF` (0..1) says how leafy it is.
 */
export const SEASON_GLSL = `
  vec3 seasonalIn(vec3 c, float leaf, float grain, vec4 uSeason) {
    float lum = dot(c, vec3(0.3, 0.59, 0.11));
    vec3 summer = c * vec3(0.86, 1.16, 0.72); // lush, deep green
    vec3 autumn = mix(c, mix(vec3(lum * 1.5, lum * 1.0, lum * 0.4), vec3(lum * 1.7, lum * 0.6, lum * 0.3), grain), 0.7); // dry, dead-grass tones
    vec3 winter = mix(c, vec3(0.9, 0.94, 1.0), 0.78);
    vec3 out_ = c * uSeason.x + summer * uSeason.y + autumn * uSeason.z + winter * uSeason.w;
    return mix(c, out_, leaf);
  }
  vec3 seasonal(vec3 c, float leaf, float grain) { return seasonalIn(c, leaf, grain, uSeason); }
  // a leafy tree's autumn colour: bright yellow, orange or red (by grain: each tree picks its own)
  vec3 treeAutumn(vec3 c, float grain) {
    float lum = dot(c, vec3(0.3, 0.59, 0.11));
    vec3 yellow = vec3(0.95, 0.78, 0.18) * (0.55 + lum), orange = vec3(0.98, 0.5, 0.12) * (0.55 + lum), red = vec3(0.85, 0.2, 0.12) * (0.55 + lum);
    return grain < 0.5 ? mix(yellow, orange, grain * 2.0) : mix(orange, red, grain * 2.0 - 1.0);
  }`;

const KINDS = {
  spring: { count: 70, color: [0xffb3cc, 0xffffff, 0xffd6e4], size: 0.16, fall: 0.6, sway: 1.2, spin: 2 },
  summer: { count: 50, color: [0xfff2a0, 0xffe27a], size: 0.12, fall: -0.15, sway: 0.6, spin: 0, glow: true },
  autumn: { count: 90, color: [0xd8782a, 0xc0392b, 0xffb03a, 0x8a4a1a], size: 0.22, fall: 1.0, sway: 1.6, spin: 4 },
  winter: { count: 220, color: [0xffffff, 0xeaf4ff], size: 0.09, fall: 1.4, sway: 0.5, spin: 0 },
  rain: { count: 1100, color: [0xb8d0ec, 0xe0ecf8], size: 1, fall: 24, sway: 0, spin: 0, streak: true },
};
const BOX = { w: 60, h: 14, d: 44 };

/** Drifting seasonal things around the player (one season at a time). */
export class SeasonParticles {
  constructor(group, bounds = { w: 144, h: 104 }) {
    this.group = group;
    this.bounds = bounds;
    this.season = null;
    this.mesh = null;
    this.rays = null;
  }

  setSeason(season) {
    if (season === this.season) return;
    this.season = season;
    this.mesh?.removeFromParent();
    this.rays?.removeFromParent();
    this.rays = null;
    const k = KINDS[season];
    const geo = k.streak ? new THREE.BoxGeometry(0.04, 0.9, 0.04) : k.glow ? new THREE.PlaneGeometry(1, 1) : season === 'winter' ? new THREE.SphereGeometry(0.5, 6, 4) : new THREE.CircleGeometry(0.5, 5);
    const mat = k.glow
      ? new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
      : k.streak ? new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, depthWrite: false })
      : new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 1 });
    this.mesh = new THREE.InstancedMesh(geo, mat, k.count);
    this.mesh.frustumCulled = false;
    this.bits = Array.from({ length: k.count }, (_, i) => ({
      x: Math.random() * BOX.w, y: Math.random() * BOX.h, z: Math.random() * BOX.d,
      ph: Math.random() * 10, s: k.size * (0.7 + Math.random() * 0.6),
    }));
    const c = new THREE.Color();
    this.bits.forEach((_, i) => this.mesh.setColorAt(i, c.set(k.color[i % k.color.length])));
    this.group.add(this.mesh);
    if (season === 'summer') { // long soft shafts of sunlight slanting down
      this.rays = new THREE.Group();
      const mat2 = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      // fixed over the town (they stay put as you walk under them)
      let i = 0;
      for (let z = 8; z < this.bounds.h; z += 22) for (let x = 6 + (z % 3) * 7; x < this.bounds.w; x += 24, i++) {
        const ray = new THREE.Mesh(new THREE.PlaneGeometry(4 + i % 3, 30), mat2);
        ray.position.set(x, 10, z);
        ray.rotation.set(0, 0.3, 0.45);
        this.rays.add(ray);
      }
      this.group.add(this.rays);
    }
  }

  /** Keep the drift in a box around `at` (the player), wrapping round its edges. */
  update(dt, time, at) {
    if (!this.mesh) return;
    const k = KINDS[this.season], m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const x0 = at.x - BOX.w / 2, z0 = at.z - BOX.d / 2;
    this.bits.forEach((b, i) => {
      b.y -= k.fall * dt * (0.7 + (i % 5) * 0.12);
      if (b.y < 0) b.y += BOX.h;
      if (b.y > BOX.h) b.y -= BOX.h;
      const wx = x0 + ((((b.x + Math.sin(time * 0.7 + b.ph) * k.sway - x0) % BOX.w) + BOX.w) % BOX.w);
      const wz = z0 + ((((b.z + Math.cos(time * 0.5 + b.ph) * k.sway * 0.6 - z0) % BOX.d) + BOX.d) % BOX.d);
      e.set(time * k.spin + b.ph, time * k.spin * 0.7, b.ph);
      if (k.glow || k.streak) q.identity(); else q.setFromEuler(e);
      const s = k.streak ? 1 : k.glow ? b.s * (2 + Math.sin(time * 2 + b.ph)) : b.s;
      this.mesh.setMatrixAt(i, m.compose(v.set(wx, b.y, wz), q, sc.set(s, s, s)));
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.rays) {
      this.rays.children.forEach((r, i) => { r.material.opacity = 0.09 + Math.sin(time * 0.4 + i) * 0.03; });
    }
  }
}

/**
 * Little spring birds: a few flocks wheeling over town and some birds hopping about on the grass.
 * `spots` = grass points to hop around. update(t) animates them.
 */
export class SpringBirds {
  constructor(group, spots, centre) {
    this.group = new THREE.Group();
    group.add(this.group);
    const COLS = [0x8a5a3a, 0x3a6ac0, 0xd8402a, 0xe8c040];
    const bird = (c) => {
      const b = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
      b.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), m));
      b.children[0].scale.set(0.9, 0.85, 1.3);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), m);
      head.position.set(0, 0.08, 0.13);
      b.add(head);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 4), new THREE.MeshStandardMaterial({ color: 0xffb020 }));
      beak.position.set(0, 0.07, 0.22);
      beak.rotation.x = Math.PI / 2;
      b.add(beak);
      b.userData.wings = [-1, 1].map((s) => {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.12), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.8 }));
        w.geometry.translate(s * 0.11, 0, 0);
        w.rotation.x = -Math.PI / 2;
        w.position.y = 0.04;
        const pivot = new THREE.Group();
        pivot.add(w);
        b.add(pivot);
        return pivot;
      });
      return b;
    };
    this.flocks = [];
    for (let f = 0; f < 3; f++) {
      const flock = { r: 14 + f * 9, h: 11 + f * 3, speed: 0.25 + f * 0.07, ph: f * 2, birds: [] };
      for (let i = 0; i < 5; i++) { const b = bird(COLS[(f + i) % COLS.length]); this.group.add(b); flock.birds.push(b); }
      this.flocks.push(flock);
    }
    this.centre = centre;
    this.hoppers = spots.slice(0, 10).map((s, i) => { const b = bird(COLS[i % COLS.length]); b.position.set(s.x, 0.12, s.z); this.group.add(b); return { b, s, ph: i * 1.7 }; });
  }

  set visible(v) { this.group.visible = v; }

  update(t) {
    for (const f of this.flocks) f.birds.forEach((b, i) => { // wheeling in a loose V, wings beating
      const a = t * f.speed + f.ph - i * 0.08;
      b.position.set(this.centre.x + Math.cos(a) * (f.r + (i % 2) * 1.2), f.h + Math.sin(t * 2 + i) * 0.4, this.centre.z + Math.sin(a) * (f.r + (i % 2) * 1.2));
      b.rotation.y = -a;
      for (const [k, w] of b.userData.wings.entries()) w.rotation.z = (k ? -1 : 1) * Math.sin(t * 14 + i) * 0.7;
    });
    for (const h of this.hoppers) { // peck, hop, look about
      const u = (t * 0.6 + h.ph) % 4;
      const hop = u < 1 ? Math.abs(Math.sin(u * Math.PI * 3)) * 0.12 : 0;
      h.b.position.set(h.s.x + Math.sin(Math.floor(t * 0.15 + h.ph) * 2.3) * 0.8, 0.12 + hop, h.s.z + Math.cos(Math.floor(t * 0.15 + h.ph) * 1.7) * 0.8);
      h.b.rotation.y = Math.floor(t * 0.5 + h.ph) * 1.3;
      h.b.rotation.x = u > 2 && u < 2.3 ? 0.6 : 0; // a peck at the ground
      for (const w of h.b.userData.wings) w.rotation.z = 0;
    }
  }
}
