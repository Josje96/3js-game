// The title screen's hero: your character standing on a stone pedestal between two torches,
// turning slowly, wearing your saved look. Changes when you pick another class.
import * as THREE from 'three';
import { cleanLook } from '../shared/config.js';
import { CharacterView } from './views.js';

export class HeroStage {
  constructor(el) {
    this.el = el;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.prepend(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    this.camera.position.set(0, 2.3, 7.2);
    this.camera.lookAt(0, 1.35, 0);
    this.scene.add(new THREE.HemisphereLight(0xc8c0ff, 0x302040, 1.1));
    const key = new THREE.DirectionalLight(0xfff0d8, 2.2);
    key.position.set(2, 5, 4);
    this.scene.add(key);
    // the pedestal
    const stone = new THREE.MeshStandardMaterial({ color: 0x6a6378, roughness: 0.9, flatShading: true });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.5, 10), stone);
    base.position.y = -0.25;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.06, 6, 30), new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.7, roughness: 0.3 }));
    rim.rotation.x = Math.PI / 2;
    this.scene.add(base, rim);
    // torches either side, flickering
    this.flames = [];
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x4a3020 }));
      post.position.set(s * 2.1, 1.0, -0.4);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff7a1a, emissiveIntensity: 2 }));
      flame.position.set(s * 2.1, 2.4, -0.4);
      const light = new THREE.PointLight(0xffa050, 10, 8, 1.5);
      light.position.copy(flame.position);
      this.scene.add(post, flame, light);
      this.flames.push({ flame, light, phase: s * 3 });
    }
    this.clock = new THREE.Clock();
    this.resize = () => {
      const w = el.clientWidth || 300, h = el.clientHeight || 400;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    };
    addEventListener('resize', this.resize);
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  show(cls, look) {
    this.view?.dispose();
    this.view = new CharacterView({ cls, look: cleanLook(look), name: null, weapon: null });
    this.view.play('cheer');
    this.scene.add(this.view.root);
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.1), t = this.clock.elapsedTime;
    if (this.view) { this.view.root.rotation.y = Math.sin(t * 0.5) * 0.6; this.view.update(dt); }
    for (const f of this.flames) {
      f.flame.scale.set(1 + Math.sin(t * 13 + f.phase) * 0.1, 1 + Math.sin(t * 9 + f.phase) * 0.2, 1);
      f.light.intensity = 9 + Math.sin(t * 11 + f.phase) * 2;
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    removeEventListener('resize', this.resize);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
