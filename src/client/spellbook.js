// A spellbook in hand is alive: glowing runes circle it, loose pages lift off and flutter away, and a
// soft light pulses over its pages. Casting flares it all up: the runes spin out wide, pages burst out.
// The effects live on the character (not the book), so the runes circle level whatever the hand does.
import * as THREE from 'three';
import { glowTexture } from './effects.js';

// runes as strokes in a 0..1 box (drawn, not typed: family devices may lack a runic font)
const RUNES = [
  [[0.35, 0.05, 0.35, 0.95], [0.35, 0.3, 0.7, 0.12], [0.35, 0.55, 0.7, 0.37]], // fehu
  [[0.5, 0.05, 0.5, 0.95], [0.2, 0.3, 0.8, 0.7], [0.8, 0.3, 0.2, 0.7]], // a star-cross
  [[0.3, 0.95, 0.5, 0.05], [0.5, 0.05, 0.7, 0.95], [0.38, 0.6, 0.62, 0.6]], // an arrow-A
  [[0.5, 0.05, 0.5, 0.95], [0.5, 0.35, 0.2, 0.08], [0.5, 0.35, 0.8, 0.08]], // algiz
  [[0.25, 0.95, 0.25, 0.05], [0.25, 0.05, 0.7, 0.3], [0.7, 0.3, 0.25, 0.5], [0.25, 0.5, 0.75, 0.95]], // raido
  [[0.5, 0.05, 0.2, 0.4], [0.2, 0.4, 0.5, 0.75], [0.5, 0.05, 0.8, 0.4], [0.8, 0.4, 0.5, 0.75], [0.2, 0.95, 0.5, 0.75], [0.5, 0.75, 0.8, 0.95]], // othala
  [[0.2, 0.1, 0.8, 0.9], [0.8, 0.1, 0.2, 0.9], [0.2, 0.1, 0.2, 0.9], [0.8, 0.1, 0.8, 0.9]], // dagaz
  [[0.7, 0.1, 0.3, 0.5], [0.3, 0.5, 0.7, 0.9]], // kenaz
];
let runeTextures = null;
function runes() {
  runeTextures ??= RUNES.map((strokes) => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.strokeStyle = '#fff';
    g.lineCap = 'round';
    g.shadowColor = '#fff';
    for (const [blur, width] of [[12, 7], [0, 4]]) { // a soft halo, then the crisp stroke
      g.shadowBlur = blur;
      g.lineWidth = width;
      for (const [x0, y0, x1, y1] of strokes) {
        g.beginPath();
        g.moveTo(8 + x0 * 48, 8 + y0 * 48);
        g.lineTo(8 + x1 * 48, 8 + y1 * 48);
        g.stroke();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
  return runeTextures;
}

const glow = (color, opacity) => new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
}));

const CAST_TIME = 0.8; // how long a cast's flare lasts
const N_RUNES = 6, N_PAGES = 4;
const RUNE_RISE = 0.35; // the runes circle a little above the book (it's held low, at the hip)

/**
 * Effects for the book `book`, added to `holder` (the character's root, so they don't tumble with the hand).
 * Returns { update(dt, time), cast(), dispose() }.
 */
export function spellbookFx(book, holder, color = 0xb98cff) {
  const group = new THREE.Group();
  holder.add(group);
  const light = glow(color, 0.5);
  light.scale.setScalar(0.7);
  group.add(light);
  const textures = runes();
  const runeSprites = [], haloes = [];
  for (let i = 0; i < N_RUNES; i++) {
    const halo = glow(color, 0.5); // a coloured glow behind each rune, so it shows up even in bright sun
    group.add(halo);
    haloes.push(halo);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures[i % textures.length], color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.3), transparent: true, depthWrite: false }));
    group.add(s);
    runeSprites.push(s);
  }
  const paper = new THREE.MeshBasicMaterial({ color: 0xfff4dc, side: THREE.DoubleSide, transparent: true, depthWrite: false });
  const pageGeo = new THREE.PlaneGeometry(0.09, 0.12);
  const pages = [];
  for (let i = 0; i < N_PAGES; i++) {
    const m = new THREE.Mesh(pageGeo, paper.clone());
    group.add(m);
    pages.push({ m, age: (i / N_PAGES) * 1.6, life: 1.6, a: i * 2.4, speed: 1 });
  }
  const where = new THREE.Vector3();
  let castT = null, spin = 0;
  return {
    cast() {
      castT = 0;
      for (const p of pages) { p.age = Math.random() * 0.2; p.life = 0.7 + Math.random() * 0.3; p.speed = 2.6; p.a = Math.random() * Math.PI * 2; }
    },
    update(dt, t) {
      // follow the book (it moves with the hand), in the character's space
      book.getWorldPosition(where);
      group.position.copy(holder.worldToLocal(where));
      if (castT != null && (castT += dt) > CAST_TIME) castT = null;
      const flare = castT == null ? 0 : Math.sin(Math.min(1, castT / CAST_TIME) * Math.PI); // 0 → 1 → 0 over a cast
      spin += dt * (1.1 + flare * 6);
      const r = 0.4 + flare * 0.4;
      runeSprites.forEach((s, i) => {
        const a = spin + (i / N_RUNES) * Math.PI * 2;
        s.position.set(Math.cos(a) * r, RUNE_RISE + Math.sin(t * 2 + i) * 0.06 + flare * 0.15, Math.sin(a) * r);
        s.material.opacity = Math.min(1, 0.75 + Math.sin(t * 3 + i * 1.3) * 0.2 + flare * 0.3);
        s.scale.setScalar(0.26 + flare * 0.1);
        haloes[i].position.copy(s.position);
        haloes[i].material.opacity = 0.6 + flare * 0.3;
        haloes[i].scale.setScalar(0.42 + flare * 0.2);
      });
      light.material.opacity = 0.35 + Math.sin(t * 2.5) * 0.12 + flare * 0.5;
      light.scale.setScalar(0.6 + flare * 0.9);
      for (const p of pages) {
        p.age += dt * p.speed;
        if (p.age > p.life) { p.age -= p.life; p.life = 1.6; p.speed = 1; p.a = Math.random() * Math.PI * 2; }
        const u = p.age / p.life;
        // up out of the book, drifting outwards in a slow spiral, flipping over and over, fading
        const out = u * (0.25 + (p.speed > 1 ? 0.35 : 0));
        p.m.position.set(Math.cos(p.a + u * 2) * out, 0.05 + u * 0.5, Math.sin(p.a + u * 2) * out);
        p.m.rotation.set(Math.sin(t * 7 + p.a) * 0.9, p.a + u * 4, Math.cos(t * 5 + p.a) * 0.5);
        p.m.material.opacity = Math.min(1, u * 6) * (1 - u) * 0.95;
      }
    },
    dispose() {
      group.removeFromParent();
      paper.dispose();
      pageGeo.dispose();
      for (const p of pages) p.m.material.dispose();
      for (const s of [...runeSprites, ...haloes, light]) s.material.dispose();
    },
  };
}
