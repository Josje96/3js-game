// Non-slime enemies, built from simple shapes. They're 'slime' entities on the server
// (see ENEMIES in shared/dungeons.js); `body` picks the model here.
import * as THREE from 'three';
import { ENEMIES } from '../shared/dungeons.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const glow = (color) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, roughness: 0.4 });
const ball = (r, seg = 14) => new THREE.SphereGeometry(r, seg, Math.max(6, (seg * 0.7) | 0));
function add(parent, geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
function eyes(parent, y, z, spread, r, color = 0x111111) {
  const white = mat(0xffffff), black = new THREE.MeshBasicMaterial({ color });
  for (const s of [-1, 1]) {
    add(parent, ball(r, 10), white, s * spread, y, z);
    add(parent, ball(r * 0.55, 8), black, s * spread, y, z + r * 0.6);
  }
}

// Each builder returns { group, parts, height } — `parts` are what the animation moves.
const BODIES = {
  bat(fire) {
    const g = new THREE.Group();
    const fur = mat(fire ? 0x8a2a1a : 0x4a3a5e), wing = mat(fire ? 0xff7a2a : 0x6a4f86, { side: THREE.DoubleSide });
    add(g, ball(0.35), fur, 0, 0, 0, 1, 0.9, 1);
    for (const s of [-1, 1]) {
      const ear = add(g, new THREE.ConeGeometry(0.1, 0.25, 4), fur, s * 0.17, 0.32, 0);
      ear.rotation.z = -s * 0.3;
    }
    eyes(g, 0.05, 0.27, 0.12, 0.08, fire ? 0xffd23f : 0xff3355);
    const wings = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.x = s * 0.25;
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(s * 0.9, 0.35); shape.lineTo(s * 0.75, -0.05); shape.lineTo(s * 1.0, -0.25); shape.lineTo(s * 0.5, -0.2); shape.lineTo(0, -0.15);
      const w = add(pivot, new THREE.ShapeGeometry(shape), wing);
      w.rotation.x = -Math.PI / 2;
      g.add(pivot);
      wings.push(pivot);
    }
    return { group: g, parts: { wings }, height: 1.6 };
  },
  yeti() {
    const g = new THREE.Group();
    const fur = mat(0xf2f6ff, { roughness: 1 }), face = mat(0x8fb6d8);
    add(g, ball(0.8, 16), fur, 0, 0.9, 0, 1, 1.1, 0.9);
    add(g, ball(0.45), face, 0, 1.15, 0.5, 1, 0.9, 0.5);
    eyes(g, 1.25, 0.72, 0.16, 0.08);
    add(g, new THREE.BoxGeometry(0.3, 0.08, 0.05), new THREE.MeshBasicMaterial({ color: 0x223344 }), 0, 0.98, 0.74);
    const arms = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.75, 1.3, 0);
      add(pivot, ball(0.28), fur, 0, -0.5, 0, 0.9, 1.8, 0.9);
      g.add(pivot);
      arms.push(pivot);
      add(g, ball(0.28), fur, s * 0.35, 0.18, 0, 1, 0.7, 1.2); // feet
    }
    return { group: g, parts: { arms }, height: 2.3 };
  },
  shroom() {
    const g = new THREE.Group();
    add(g, new THREE.CylinderGeometry(0.32, 0.42, 0.8, 12), mat(0xf5ead6), 0, 0.45, 0);
    const cap = add(g, new THREE.SphereGeometry(0.75, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xe8433a), 0, 0.8, 0, 1, 0.8, 1);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, r = i % 2 ? 0.45 : 0.3;
      add(cap, ball(0.1, 8), mat(0xffffff), Math.cos(a) * r, 0.5 + (i % 2 ? 0 : 0.18), Math.sin(a) * r, 1, 0.5, 1);
    }
    eyes(g, 0.6, 0.3, 0.13, 0.08);
    const feet = [];
    for (const s of [-1, 1]) feet.push(add(g, ball(0.15), mat(0xd9c9ad), s * 0.2, 0.08, 0.05, 1, 0.6, 1.3));
    return { group: g, parts: { cap, feet }, height: 1.6 };
  },
  spider() {
    const g = new THREE.Group();
    const body = mat(0x3a2f45), stripe = mat(0xb48cff);
    add(g, ball(0.5), body, 0, 0.6, -0.35, 1, 0.85, 1.15);
    add(g, ball(0.18, 8), stripe, 0, 1.0, -0.35, 1.6, 0.3, 1.2);
    add(g, ball(0.32), body, 0, 0.55, 0.3);
    for (let i = 0; i < 4; i++) add(g, ball(0.06, 6), glow(0xff4a8a), (i % 2 ? 1 : -1) * (0.08 + (i > 1 ? 0.1 : 0)), 0.68 + (i > 1 ? -0.07 : 0), 0.58);
    const legs = [];
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const pivot = new THREE.Group();
        pivot.position.set(s * 0.3, 0.6, 0.35 - i * 0.22);
        pivot.rotation.y = s * (0.5 - i * 0.35);
        const upper = add(pivot, new THREE.CylinderGeometry(0.04, 0.05, 0.7, 6), body, s * 0.3, 0.15, 0);
        upper.rotation.z = -s * 1.1;
        const lower = add(pivot, new THREE.CylinderGeometry(0.03, 0.04, 0.75, 6), body, s * 0.72, -0.25, 0);
        lower.rotation.z = s * 0.35;
        g.add(pivot);
        legs.push(pivot);
      }
    }
    return { group: g, parts: { legs }, height: 1.5 };
  },
  imp() {
    const g = new THREE.Group();
    const skin = mat(0xe8433a), dark = mat(0x5a1a14);
    add(g, ball(0.35), skin, 0, 0, 0, 1, 1.1, 0.9);
    add(g, ball(0.3), skin, 0, 0.5, 0.05);
    for (const s of [-1, 1]) {
      const horn = add(g, new THREE.ConeGeometry(0.07, 0.25, 6), mat(0xffe3a0), s * 0.15, 0.78, 0);
      horn.rotation.z = -s * 0.4;
    }
    eyes(g, 0.55, 0.26, 0.1, 0.07, 0xffd23f);
    const tail = add(g, new THREE.CylinderGeometry(0.03, 0.05, 0.6, 6), skin, 0, -0.2, -0.4);
    tail.rotation.x = 1.0;
    add(g, new THREE.ConeGeometry(0.08, 0.15, 4), dark, 0, -0.05, -0.68).rotation.x = 1.6;
    const wings = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.25, 0.15, -0.2);
      const w = add(pivot, new THREE.ConeGeometry(0.25, 0.6, 3), dark, s * 0.3, 0, 0, 1, 1, 0.15);
      w.rotation.z = -s * 1.3;
      g.add(pivot);
      wings.push(pivot);
    }
    // a little fireball in its hand
    const flame = add(g, ball(0.13, 8), glow(0xffa030), 0.35, 0.1, 0.25);
    return { group: g, parts: { wings, flame }, height: 1.9 };
  },
  golem() {
    const g = new THREE.Group();
    const rock = mat(0x4a403c, { flatShading: true, roughness: 1 }), lava = glow(0xff6a1a);
    const chunk = (r, x, y, z) => add(g, new THREE.DodecahedronGeometry(r, 0), rock, x, y, z);
    chunk(0.75, 0, 1.2, 0);
    chunk(0.45, 0, 2.05, 0.1);
    add(g, ball(0.08, 6), lava, -0.15, 2.1, 0.5);
    add(g, ball(0.08, 6), lava, 0.15, 2.1, 0.5);
    add(g, new THREE.BoxGeometry(0.9, 0.06, 0.05), lava, 0, 1.3, 0.72); // glowing crack
    const arms = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.85, 1.6, 0);
      add(pivot, new THREE.DodecahedronGeometry(0.38, 0), rock, 0, -0.45, 0);
      add(pivot, new THREE.DodecahedronGeometry(0.3, 0), rock, 0, -0.95, 0.1);
      g.add(pivot);
      arms.push(pivot);
      chunk(0.35, s * 0.4, 0.35, 0);
    }
    return { group: g, parts: { arms }, height: 2.7 };
  },
  dragon() {
    const g = new THREE.Group();
    const scale = mat(0xc8352a), belly = mat(0xffb36b), dark = mat(0x6a1a14, { side: THREE.DoubleSide });
    add(g, ball(0.7, 16), scale, 0, 0.9, 0, 1, 0.85, 1.3);
    add(g, ball(0.45), belly, 0, 0.75, 0.35, 1, 0.9, 0.9);
    const neck = new THREE.Group();
    neck.position.set(0, 1.2, 0.7);
    g.add(neck);
    add(neck, new THREE.CylinderGeometry(0.22, 0.3, 0.7, 10), scale, 0, 0.3, 0.1).rotation.x = 0.5;
    const head = new THREE.Group();
    head.position.set(0, 0.7, 0.35);
    neck.add(head);
    add(head, ball(0.35), scale, 0, 0, 0, 1, 0.85, 1.2);
    add(head, ball(0.2), belly, 0, -0.08, 0.32, 1, 0.7, 1);
    eyes(head, 0.12, 0.25, 0.15, 0.07, 0xffd23f);
    for (const s of [-1, 1]) add(head, new THREE.ConeGeometry(0.07, 0.35, 6), mat(0xffe3a0), s * 0.15, 0.3, -0.15).rotation.x = -0.6;
    const wings = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.45, 1.4, -0.1);
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(s * 1.4, 0.7); shape.lineTo(s * 1.2, 0.1); shape.lineTo(s * 1.5, -0.3); shape.lineTo(s * 0.9, -0.3); shape.lineTo(s * 0.8, -0.7); shape.lineTo(0, -0.3);
      const w = add(pivot, new THREE.ShapeGeometry(shape), dark);
      w.rotation.x = -1.1;
      g.add(pivot);
      wings.push(pivot);
    }
    const tail = add(g, new THREE.ConeGeometry(0.25, 1.4, 8), scale, 0, 0.6, -1.3);
    tail.rotation.x = -1.35;
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) add(g, ball(0.18), scale, x * 0.45, 0.2, z * 0.45, 1, 1.2, 1);
    return { group: g, parts: { wings, head }, height: 2.6 };
  },
};

function makeHpBar(width) {
  const group = new THREE.Group();
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x220000, depthTest: false }));
  const fg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff4040, depthTest: false }));
  bg.scale.set(width, 0.16, 1);
  fg.scale.set(width, 0.12, 1);
  bg.renderOrder = 11; fg.renderOrder = 12;
  group.add(bg, fg);
  return { group, set(f) { f = Math.max(0, Math.min(1, f)); fg.scale.x = width * f; fg.position.x = -(width * (1 - f)) / 2; } };
}

const smooth = (dt, rate) => 1 - Math.exp(-dt * rate);

export class MobView {
  constructor(e, makeLabel) {
    const def = ENEMIES[e.variant] ?? {};
    this.kind = def.body;
    this.fly = !!def.fly;
    const built = BODIES[def.body](e.variant === 'firebat');
    this.root = new THREE.Group();
    this.body = built.group;
    this.parts = built.parts;
    const s = e.scale ?? 1;
    this.body.scale.setScalar(s);
    this.baseY = this.fly ? 1.4 : 0;
    this.root.add(this.body);
    // own materials so the hit flash only lights up this one
    this.meshes = [];
    this.body.traverse((o) => {
      if (!o.isMesh || !o.material.isMeshStandardMaterial) return;
      o.material = o.material.clone();
      o.userData.baseEmissive = o.material.emissive.getHex();
      this.meshes.push(o);
    });
    this.flashing = false;
    this.hpBar = makeHpBar(e.boss ? 3 : 1.2);
    this.hpBar.group.position.y = this.baseY + built.height * s * (this.fly ? 0.5 : 1) + 0.3;
    this.hpBar.group.visible = !!e.boss;
    this.root.add(this.hpBar.group);
    if (e.boss && makeLabel) {
      const label = makeLabel(e.name, '#ffd23f');
      label.position.y = this.hpBar.group.position.y + 0.6;
      this.root.add(label);
    }
    this.maxHp = e.maxHp;
    this.t = Math.random() * 10;
    this.flash = 0;
    this.root.position.set(e.x, 0, e.z);
    this.apply(e);
  }

  apply(e) {
    this.target = { x: e.x ?? this.target?.x, z: e.z ?? this.target?.z, rot: e.rot ?? this.target?.rot ?? 0 };
    if ('anim' in e) this.anim = e.anim;
    if (e.hp != null && e.hp < this.maxHp) {
      this.hpBar.group.visible = true;
      this.hpBar.set(e.hp / this.maxHp);
    }
  }

  hit() { this.flash = 0.15; }

  update(dt) {
    const p = this.root.position;
    const moving = Math.hypot(this.target.x - p.x, this.target.z - p.z) > 0.03;
    const k = smooth(dt, 14);
    p.x += (this.target.x - p.x) * k;
    p.z += (this.target.z - p.z) * k;
    let r = this.target.rot - this.root.rotation.y;
    r = Math.atan2(Math.sin(r), Math.cos(r));
    this.root.rotation.y += r * k;
    this.t += dt;
    const t = this.t, P = this.parts, b = this.body;
    b.position.y = this.baseY;
    switch (this.kind) {
      case 'bat':
        b.position.y += Math.sin(t * 3) * 0.2;
        for (const [i, w] of P.wings.entries()) w.rotation.z = (i ? -1 : 1) * Math.sin(t * 22) * 0.7;
        break;
      case 'yeti':
      case 'golem':
        b.position.y += moving ? Math.abs(Math.sin(t * 6)) * 0.12 : 0;
        b.rotation.z = moving ? Math.sin(t * 6) * 0.06 : 0;
        for (const [i, a] of P.arms.entries()) a.rotation.x = moving ? Math.sin(t * 6 + i * Math.PI) * 0.6 : Math.sin(t * 1.5) * 0.08;
        break;
      case 'shroom':
        b.position.y += moving ? Math.abs(Math.sin(t * 8)) * 0.15 : 0;
        P.cap.rotation.z = Math.sin(t * 4) * 0.08;
        for (const [i, f] of P.feet.entries()) f.position.z = 0.05 + (moving ? Math.sin(t * 8 + i * Math.PI) * 0.15 : 0);
        break;
      case 'spider': {
        const crouch = this.anim === 'crouch', leap = this.anim === 'leap';
        b.position.y += crouch ? -0.2 : leap ? 0.5 : 0;
        b.rotation.x = crouch ? 0.15 : leap ? -0.25 : 0;
        for (const [i, l] of P.legs.entries()) l.rotation.x = moving ? Math.sin(t * 16 + i * 1.3) * 0.35 : 0;
        break;
      }
      case 'imp':
        b.position.y += Math.sin(t * 2.5) * 0.25;
        for (const [i, w] of P.wings.entries()) w.rotation.y = (i ? -1 : 1) * Math.sin(t * 14) * 0.5;
        P.flame.scale.setScalar(1 + Math.sin(t * 20) * 0.2);
        break;
      case 'dragon':
        b.position.y += Math.sin(t * 1.5) * 0.1;
        for (const [i, w] of P.wings.entries()) w.rotation.z = (i ? -1 : 1) * (0.2 + Math.sin(t * 3) * 0.35);
        P.head.rotation.x = Math.sin(t * 1.2) * 0.15;
        break;
    }
    this.flash = Math.max(0, this.flash - dt);
    if ((this.flash > 0) !== this.flashing) {
      this.flashing = this.flash > 0;
      for (const o of this.meshes) o.material.emissive.setHex(this.flashing ? 0xffffff : o.userData.baseEmissive);
    }
  }

  dispose() { this.root.removeFromParent(); }
}

export function hasMobBody(variant) {
  return !!ENEMIES[variant]?.body;
}
