// Dev page (/lab.html): every class side by side playing one animation.
// Pick a clip, scrub with the slider (or press play). Handy after `npm run make-anims`.
import * as THREE from 'three';
import { preloadAll, characterClips } from './client/assets.js';
import { CharacterView } from './client/views.js';
import { CLASSES } from './shared/config.js';

const LINEUP = [
  ['Knight', 'sword'], ['Barbarian', 'greataxe'], ['Mage', 'staff'],
  ['Ranger', 'dagger'], ['Rogue', 'axe'], ['Rogue_Hooded', 'royalsword'],
];

await preloadAll();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2236);
scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(-5, 10, 8);
scene.add(sun);
const grid = new THREE.GridHelper(40, 20, 0x666688, 0x443355);
scene.add(grid);
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'front';
camera.position.set(...(view === 'side' ? [-14, 3, 0] : view === 'top' ? [0, 18, 9] : [0, 3.5, 16]));
camera.lookAt(0, 1.3, 0);

const chars = LINEUP.filter(([c]) => CLASSES[c]).map(([cls, weapon], i) => {
  const v = new CharacterView({ cls, name: `${cls} · ${weapon}`, weapon });
  // side view: line them up front-to-back so they don't hide each other
  if (view === 'side') v.root.position.set(0, 0, (i - 2.5) * 3.2);
  else v.root.position.set((i - 2.5) * 3.2, 0, 0);
  v.mixer.stopAllAction();
  scene.add(v.root);
  return v;
});

let clipName = params.get('clip') ?? 'Attack_Slash';
let playing = !params.has('t');
let t = Number(params.get('t') ?? 0);
const ui = document.getElementById('ui');
const slider = Object.assign(document.createElement('input'), { type: 'range', min: 0, max: 1, step: 0.001, value: 0 });
const clips = characterClips();
function select(name) {
  clipName = name;
  for (const v of chars) {
    v.mixer.stopAllAction();
    v.active = v.mixer.clipAction(clips[name]).play();
  }
  for (const b of ui.querySelectorAll('button[data-clip]')) b.classList.toggle('on', b.dataset.clip === name);
}
for (const name of Object.keys(clips).sort()) {
  const b = Object.assign(document.createElement('button'), { textContent: name });
  b.dataset.clip = name;
  b.onclick = () => select(name);
  ui.append(b);
}
const playBtn = Object.assign(document.createElement('button'), { textContent: '⏯' });
playBtn.onclick = () => { playing = !playing; };
slider.oninput = () => { playing = false; t = Number(slider.value) * clips[clipName].duration; };
ui.append(playBtn, slider);
select(clipName);
window.lab = { setTime: (s) => { playing = false; t = s; }, select, chars, THREE };

let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  if (playing) t = (t + (now - last) / 1000) % clips[clipName].duration;
  last = now;
  slider.value = t / clips[clipName].duration;
  for (const v of chars) { v.active.time = t; v.mixer.update(0); }
  renderer.render(scene, camera);
});
