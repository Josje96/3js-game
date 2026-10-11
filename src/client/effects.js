// Short-lived visual effects. Each one is { root, update(dt), done, dispose() }; GameClient.addEffect
// adds it to the scene, ticks it every frame and throws it away when `done`.
// Client-only decoration: Math.random is fine here.
import * as THREE from 'three';

const canvasTexture = (size, draw) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

let ringTex, runeTex, glowTex;
/** A ring that's brightest at its outer edge and fades inwards (a shockwave). */
function shockTexture() {
  return (ringTex ??= canvasTexture(256, (g, s) => {
    const grad = g.createRadialGradient(s / 2, s / 2, s * 0.2, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(120,220,255,0)');
    grad.addColorStop(0.7, 'rgba(120,220,255,0.15)');
    grad.addColorStop(0.9, 'rgba(200,245,255,0.9)');
    grad.addColorStop(0.96, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  }));
}

/** A magic circle: rings, runes and a star, drawn once. */
function runeTexture() {
  return (runeTex ??= canvasTexture(512, (g, s) => {
    const c = s / 2;
    g.strokeStyle = 'rgba(190,240,255,0.95)';
    g.shadowColor = '#7fe8ff';
    g.shadowBlur = 12;
    for (const [r, w] of [[0.47, 6], [0.4, 3], [0.22, 3]]) { g.lineWidth = w; g.beginPath(); g.arc(c, c, s * r, 0, Math.PI * 2); g.stroke(); }
    g.lineWidth = 4;
    g.beginPath();
    for (let i = 0; i <= 5; i++) { // a five-pointed star
      const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
      const x = c + Math.cos(a) * s * 0.4, y = c + Math.sin(a) * s * 0.4;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
    g.font = `bold ${s * 0.05}px serif`;
    g.fillStyle = 'rgba(220,250,255,0.95)';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.save();
      g.translate(c + Math.cos(a) * s * 0.435, c + Math.sin(a) * s * 0.435);
      g.rotate(a + Math.PI / 2);
      g.fillText(runes[i % runes.length], 0, 0);
      g.restore();
    }
  }));
}

export function glowTexture() {
  return (glowTex ??= canvasTexture(64, (g, s) => {
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  }));
}

const additive = (opts) => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, ...opts });

/**
 * The area spell: a rune circle flares under the caster, a pillar of light shoots up, two
 * shockwaves race out to the spell's edge, and sparks fly. `radius` is the real hit radius.
 */
export class NovaBlast {
  constructor(x, z, radius, color = 0x7fe8ff) {
    this.root = new THREE.Group();
    this.root.position.set(x, 0, z);
    this.radius = radius;
    this.t = 0;
    this.life = 1.6;

    const flat = (mat, size) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat); m.rotation.x = -Math.PI / 2; this.root.add(m); return m; };
    this.runes = flat(additive({ map: runeTexture(), color, opacity: 0 }), 1);
    this.runes.position.y = 0.09;
    this.waves = [0, 0.18].map((delay) => ({ delay, mesh: flat(additive({ map: shockTexture(), color: 0xffffff, opacity: 0 }), 1) }));
    for (const w of this.waves) w.mesh.position.y = 0.12;

    this.pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, 9, 24, 1, true), additive({ color, opacity: 0, map: pillarTexture() }));
    this.pillar.position.y = 4.5;
    this.root.add(this.pillar);

    this.light = new THREE.PointLight(color, 0, radius * 3, 1.4);
    this.light.position.y = 2;
    this.root.add(this.light);

    // sparks: sprites thrown outwards
    const sparkMat = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.sparks = [];
    for (let i = 0; i < 46; i++) {
      const s = new THREE.Sprite(sparkMat.clone());
      const a = Math.random() * Math.PI * 2, sp = radius * (0.9 + Math.random() * 0.9);
      s.userData = { vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 2 + Math.random() * 6, size: 0.25 + Math.random() * 0.45 };
      s.position.set(0, 0.6, 0);
      s.scale.setScalar(s.userData.size);
      this.root.add(s);
      this.sparks.push(s);
    }
  }

  get done() { return this.t >= this.life; }

  update(dt) {
    this.t += dt;
    const t = this.t;
    // rune circle: grows in fast, spins, fades
    const rIn = Math.min(1, t / 0.15);
    this.runes.scale.setScalar(this.radius * 2 * (0.6 + 0.4 * rIn));
    this.runes.rotation.z = t * 1.5;
    this.runes.material.opacity = t < 0.15 ? rIn : Math.max(0, 1 - (t - 0.15) / 1.1);
    // shockwaves race out to the edge of the spell
    for (const w of this.waves) {
      const u = Math.max(0, Math.min(1, (t - w.delay) / 0.45));
      const ease = 1 - (1 - u) ** 3;
      w.mesh.scale.setScalar(this.radius * 2.15 * (0.1 + 0.9 * ease));
      w.mesh.material.opacity = u <= 0 ? 0 : u < 1 ? 1 - u * 0.4 : Math.max(0, 0.6 - (t - w.delay - 0.45) * 2);
    }
    // the pillar flashes up and thins out
    const p = Math.max(0, 1 - t / 0.6);
    this.pillar.material.opacity = p * 0.9;
    this.pillar.scale.set(0.4 + p, 1 + (1 - p) * 0.5, 0.4 + p);
    this.light.intensity = 90 * Math.max(0, 1 - t / 0.5);
    for (const s of this.sparks) {
      const v = s.userData;
      v.vy -= 14 * dt;
      v.vx *= 0.97; v.vz *= 0.97;
      s.position.x += v.vx * dt; s.position.z += v.vz * dt;
      s.position.y = Math.max(0.15, s.position.y + v.vy * dt);
      s.material.opacity = Math.max(0, 1 - t / this.life);
      s.scale.setScalar(v.size * (1 - t / this.life * 0.6));
    }
  }

  dispose() {
    this.root.traverse((o) => { o.geometry?.dispose(); if (o.material) o.material.dispose(); });
    this.root.removeFromParent();
  }
}

let pillarTex;
function pillarTexture() {
  return (pillarTex ??= canvasTexture(64, (g, s) => {
    const grad = g.createLinearGradient(0, 0, 0, s); // bright at the bottom, gone at the top
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  }));
}
