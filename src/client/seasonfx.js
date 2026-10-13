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
  vec3 seasonal(vec3 c, float leaf, float grain) {
    float lum = dot(c, vec3(0.3, 0.59, 0.11));
    vec3 summer = c * vec3(1.18, 1.1, 0.62);
    vec3 autumn = mix(c, mix(vec3(lum * 1.5, lum * 1.0, lum * 0.4), vec3(lum * 1.7, lum * 0.6, lum * 0.3), grain), 0.7 + leaf * 0.0);
    vec3 winter = mix(c, vec3(0.9, 0.94, 1.0), 0.78);
    vec3 out_ = c * uSeason.x + summer * uSeason.y + autumn * uSeason.z + winter * uSeason.w;
    return mix(c, out_, leaf);
  }`;

const KINDS = {
  spring: { count: 70, color: [0xffb3cc, 0xffffff, 0xffd6e4], size: 0.16, fall: 0.6, sway: 1.2, spin: 2 },
  summer: { count: 50, color: [0xfff2a0, 0xffe27a], size: 0.12, fall: -0.15, sway: 0.6, spin: 0, glow: true },
  autumn: { count: 90, color: [0xd8782a, 0xc0392b, 0xffb03a, 0x8a4a1a], size: 0.22, fall: 1.0, sway: 1.6, spin: 4 },
  winter: { count: 220, color: [0xffffff, 0xeaf4ff], size: 0.09, fall: 1.4, sway: 0.5, spin: 0 },
};
const BOX = { w: 60, h: 14, d: 44 };

/** Drifting seasonal things around the player (one season at a time). */
export class SeasonParticles {
  constructor(group) {
    this.group = group;
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
    const geo = k.glow ? new THREE.PlaneGeometry(1, 1) : season === 'winter' ? new THREE.SphereGeometry(0.5, 6, 4) : new THREE.CircleGeometry(0.5, 5);
    const mat = k.glow
      ? new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
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
      for (let i = 0; i < 6; i++) {
        const ray = new THREE.Mesh(new THREE.PlaneGeometry(4 + i % 3, 30), mat2);
        ray.position.set((i - 2.5) * 9, 10, -6 + (i % 2) * 8);
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
      if (k.glow) q.identity(); else q.setFromEuler(e);
      const s = k.glow ? b.s * (2 + Math.sin(time * 2 + b.ph)) : b.s;
      this.mesh.setMatrixAt(i, m.compose(v.set(wx, b.y, wz), q, sc.set(s, s, s)));
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.rays) {
      this.rays.position.set(at.x, 0, at.z);
      this.rays.children.forEach((r, i) => { r.material.opacity = 0.09 + Math.sin(time * 0.4 + i) * 0.03; });
    }
  }
}
