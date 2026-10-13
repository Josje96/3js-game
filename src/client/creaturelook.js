// A finish for creature materials so nothing reads as smooth playdoh: fine surface grain (a
// procedural bump — scales, hide, bark, stone, by `scale`), darker crevices, and a coloured rim
// light around the silhouette (`rim`), the "epic" edge. Works on MeshStandardMaterial; patch a
// material once, after any clone() (clones don't keep onBeforeCompile).
import * as THREE from 'three';

const NOISE = `
  float cl_hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float cl_noise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(cl_hash(i + vec3(0, 0, 0)), cl_hash(i + vec3(1, 0, 0)), f.x), mix(cl_hash(i + vec3(0, 1, 0)), cl_hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(cl_hash(i + vec3(0, 0, 1)), cl_hash(i + vec3(1, 0, 1)), f.x), mix(cl_hash(i + vec3(0, 1, 1)), cl_hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float cl_grain(vec3 p) { // two octaves, with ridged cells for a scaly/leathery feel
    float a = cl_noise(p), b = cl_noise(p * 2.7 + 11.0);
    return a * 0.65 + (1.0 - abs(b * 2.0 - 1.0)) * 0.35;
  }`;

/**
 * `grain` = bump strength (0 = smooth), `scale` = how fine (bigger = finer), `rim` = edge-light
 * colour (null = none), `rimStrength`, `cavity` = how much the crevices darken (0..1).
 */
export function creatureLook(mat, { grain = 0.5, scale = 14, rim = null, rimStrength = 0.45, cavity = 0.18 } = {}) {
  if (!mat?.isMeshStandardMaterial || mat.userData.creatureLook) return mat;
  mat.userData.creatureLook = true;
  const uniforms = { uGrain: { value: grain }, uScale: { value: scale }, uRim: { value: new THREE.Color(rim ?? 0x000000) }, uRimK: { value: rim == null ? 0 : rimStrength }, uCavity: { value: cavity } };
  mat.userData.creatureUniforms = uniforms; // tweakable afterwards (mini-boss pets turn the grain off)
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `varying vec3 vClPos;\n${shader.vertexShader}`.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vClPos = position;`);
    shader.fragmentShader = `varying vec3 vClPos;\nuniform float uGrain, uScale, uRimK, uCavity;\nuniform vec3 uRim;\n${NOISE}\n${shader.fragmentShader}`
      .replace('#include <color_fragment>', `
        #include <color_fragment>
        vec3 clP = vClPos * uScale;
        float clFade = 1.0 - smoothstep(0.35, 0.9, length(fwidth(clP))); // too fine to see at this distance: smooth it away, no sparkle
        float clH = mix(0.5, cl_grain(clP), clFade);
        diffuseColor.rgb *= mix(1.0 - uCavity, 1.0 + uCavity * 0.2, smoothstep(0.25, 0.75, clH)); // dark in the crevices`)
      .replace('#include <normal_fragment_maps>', `
        #include <normal_fragment_maps>
        { // bump from the grain (like three's perturbNormalArb, with a procedural height)
          vec3 dpdx = dFdx(-vViewPosition), dpdy = dFdy(-vViewPosition);
          float dhdx = dFdx(clH), dhdy = dFdy(clH);
          vec3 r1 = cross(dpdy, normal), r2 = cross(normal, dpdx);
          float det = dot(dpdx, r1);
          vec3 grad = sign(det) * (dhdx * r1 + dhdy * r2);
          normal = normalize(abs(det) * normal - grad * uGrain * 0.05);
        }`)
      .replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        float clRim = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 2.6);
        totalEmissiveRadiance += uRim * clRim * uRimK;`);
  };
  mat.customProgramCacheKey = () => 'creatureLook';
  mat.needsUpdate = true;
  return mat;
}
