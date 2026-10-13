// Non-slime enemies, built from simple shapes. They're 'slime' entities on the server
// (see ENEMIES in shared/dungeons.js); `body` picks the model here.
import * as THREE from 'three';
import { ENEMIES } from '../shared/dungeons.js';
import { creatureLook } from './creaturelook.js';

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
/** Menacing eyes: a dark narrowed socket, a glowing slanted iris and an angry brow. */
function eyes(parent, y, z, spread, r, color = 0xff3a2a) {
  const socket = new THREE.MeshBasicMaterial({ color: 0x0a0606 }), iris = glow(color), brow = mat(0x1a1214, { roughness: 0.9 });
  for (const s of [-1, 1]) {
    add(parent, ball(r * 0.95, 10), socket, s * spread, y, z - r * 0.2, 1.3, 0.7, 0.55);
    add(parent, ball(r * 0.85, 10), iris, s * spread, y, z + r * 0.42, 1.35, 0.62, 0.5).rotation.z = s * 0.35;
    add(parent, new THREE.BoxGeometry(r * 2.6, r * 0.5, r * 0.8), brow, s * spread * 1.05, y + r * 0.78, z + r * 0.1).rotation.z = -s * 0.45; // slanting down to the middle
  }
}

/** A tapered rod from point a to point b (bones, branches, claws), radius r0 at a and r1 at b. */
function limb(parent, a, b, r0, r1, m) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const mesh = add(parent, new THREE.CylinderGeometry(r1, r0, d.length(), 7), m, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}

/** Goblin skin for each of the kinds that used to be slimes (ids unchanged: saves and drops keep them). */
const GOBLIN_SKIN = { green: 0x6aa84a, blue: 0x4a7ac8, red: 0xc84a3a, purple: 0x8a5ac0, black: 0x4a4a54, iceslime: 0x9ad0e8, king: 0x5a9a3a, emperor: 0x6a4ac0, practice: 0xc8a888 };

// Each builder returns { group, parts, height } — `parts` are what the animation moves.
const BODIES = {
  goblin(fire, variant = 'green') { // what used to be the slimes: hunched, big-eared goblins, a colour (and kit) for each kind
    const g = new THREE.Group();
    const skinC = GOBLIN_SKIN[variant] ?? ENEMIES[variant]?.color ?? 0x6aa84a;
    const skin = mat(skinC, { roughness: 0.7 }), dark = mat(new THREE.Color(skinC).multiplyScalar(0.6).getHex(), { roughness: 0.8 });
    const leather = mat(0x5a3a22, { roughness: 0.9 }), cloth = mat(0x6b5a3a, { roughness: 1 }), tooth = mat(0xf0e6c8), iron = mat(0x6a6a72, { metalness: 0.6, roughness: 0.45 });
    const legs = [], arms = [];
    for (const s of [-1, 1]) { // short bowed legs, big bare feet
      const leg = new THREE.Group();
      leg.position.set(s * 0.17, 0.62, 0);
      g.add(leg);
      limb(leg, [0, 0, 0], [s * 0.08, -0.3, 0.04], 0.09, 0.075, skin);
      limb(leg, [s * 0.08, -0.3, 0.04], [s * 0.04, -0.56, -0.02], 0.075, 0.06, skin);
      add(leg, ball(0.1, 8), skin, s * 0.04, -0.58, 0.1, 0.9, 0.5, 1.5);
      for (let i = 0; i < 3; i++) add(leg, new THREE.ConeGeometry(0.02, 0.05, 4), tooth, s * 0.04 + (i - 1) * 0.045, -0.6, 0.24).rotation.x = Math.PI / 2; // toenails
      legs.push(leg);
    }
    // a hunched body with a pot belly, a ragged leather vest, a belt and a loincloth
    const body = add(g, ball(0.34, 14), skin, 0, 0.88, 0.02, 1, 1.05, 0.9);
    body.rotation.x = 0.3;
    add(g, ball(0.25, 12), skin, 0, 0.78, 0.15, 1, 0.9, 0.9); // belly
    add(g, new THREE.CylinderGeometry(0.33, 0.36, 0.42, 12, 1, true, Math.PI * 0.3, Math.PI * 1.4), leather, 0, 0.95, -0.01).material.side = THREE.DoubleSide;
    add(g, new THREE.TorusGeometry(0.33, 0.04, 5, 16), leather, 0, 0.66, 0.02).rotation.x = Math.PI / 2;
    add(g, new THREE.BoxGeometry(0.08, 0.06, 0.04), iron, 0, 0.66, 0.36); // buckle
    add(g, new THREE.ConeGeometry(0.2, 0.3, 4), cloth, 0, 0.5, 0.2, 1, 1, 0.3).rotation.x = Math.PI; // loincloth
    // the head: big and wide, long pointed ears, a hooked nose, a toothy underbite, mean eyes
    const head = new THREE.Group();
    head.position.set(0, 1.3, 0.12);
    g.add(head);
    add(head, ball(0.3, 14), skin, 0, 0, 0, 1.15, 0.95, 1);
    add(head, ball(0.2, 10), skin, 0, -0.13, 0.12, 1.25, 0.6, 1); // a heavy jaw
    for (const s of [-1, 1]) {
      const ear = add(head, new THREE.ConeGeometry(0.1, 0.5, 6), skin, s * 0.42, 0.06, -0.02, 1, 1, 0.35);
      ear.rotation.set(0, 0, -s * 1.25);
      add(head, new THREE.ConeGeometry(0.05, 0.3, 5), dark, s * 0.4, 0.06, 0.0, 1, 1, 0.3).rotation.z = -s * 1.25; // inside the ear
      add(head, new THREE.ConeGeometry(0.03, 0.1, 4), tooth, s * 0.12, -0.12, 0.3).rotation.x = -0.15; // tusks jutting up
    }
    const nose = limb(head, [0, 0.0, 0.26], [0, -0.1, 0.46], 0.07, 0.025, skin);
    nose.castShadow = false;
    eyes(head, 0.06, 0.24, 0.12, 0.06, fire ? 0xff7a1a : 0xffd23f);
    add(head, new THREE.BoxGeometry(0.26, 0.03, 0.04), new THREE.MeshBasicMaterial({ color: 0x1a0a06 }), 0, -0.17, 0.3); // a wide sneer
    for (let i = 0; i < 4; i++) add(head, new THREE.ConeGeometry(0.018, 0.05, 3), tooth, -0.075 + i * 0.05, -0.155, 0.31);
    for (let i = 0; i < 5; i++) add(head, new THREE.ConeGeometry(0.03, 0.14, 4), dark, (i - 2) * 0.07, 0.28, -0.05 - Math.abs(i - 2) * 0.04).rotation.x = -0.3; // scraggly tufts
    for (const s of [-1, 1]) { // long arms down to the knees
      const arm = new THREE.Group();
      arm.position.set(s * 0.32, 1.05, 0.05);
      g.add(arm);
      limb(arm, [0, 0, 0], [s * 0.1, -0.32, 0.06], 0.07, 0.06, skin);
      limb(arm, [s * 0.1, -0.32, 0.06], [s * 0.12, -0.6, 0.14], 0.06, 0.05, skin);
      add(arm, ball(0.08, 8), skin, s * 0.12, -0.64, 0.15);
      arms.push(arm);
    }
    // a crude spiked club in the right hand
    const club = new THREE.Group();
    limb(club, [0, -0.1, 0], [0, 0.55, 0.05], 0.035, 0.09, mat(0x6b4a2c, { roughness: 1 }));
    for (let i = 0; i < 6; i++) { const a = i * 1.05; add(club, new THREE.ConeGeometry(0.025, 0.1, 4), iron, Math.cos(a) * 0.09, 0.42 + (i % 2) * 0.1, 0.05 + Math.sin(a) * 0.09).rotation.set(Math.sin(a) * 1.5, 0, -Math.cos(a) * 1.5); }
    club.position.set(0.12, -0.66, 0.16);
    club.rotation.x = 0.6;
    arms[1].add(club);
    // each kind kits itself out a little differently
    const kit = {
      blue: () => add(head, new THREE.SphereGeometry(0.32, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.42), mat(0x2a4a8a, { roughness: 1 }), 0, 0.03, -0.02), // a bandana
      red: () => { add(head, new THREE.SphereGeometry(0.33, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), iron, 0, 0.02, -0.02); for (const s of [-1, 1]) limb(head, [s * 0.22, 0.2, 0], [s * 0.36, 0.42, -0.05], 0.05, 0.01, tooth); }, // a horned helmet
      purple: () => { const hood = add(head, new THREE.ConeGeometry(0.36, 0.6, 12, 1, true), mat(0x4a2a6a, { side: THREE.DoubleSide, roughness: 1 }), 0, 0.2, -0.06); hood.rotation.x = -0.2; }, // a shaman's hood
      black: () => { add(head, new THREE.SphereGeometry(0.34, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), iron, 0, 0.0, -0.02); add(g, new THREE.BoxGeometry(0.5, 0.3, 0.06), iron, 0, 0.95, 0.3); }, // helm and breastplate
      iceslime: () => add(head, ball(0.34, 12), mat(0xf4f8ff, { roughness: 1 }), 0, 0.1, -0.06, 1.05, 0.7, 1), // a fur hat
      crystalslime: () => { for (let i = 0; i < 5; i++) add(g, new THREE.OctahedronGeometry(0.1, 0), glow(ENEMIES.crystalslime?.color ?? 0xc8a8ff), (i - 2) * 0.12, 1.15 + (i % 2) * 0.1, -0.3).scale.set(0.6, 1.6, 0.6); }, // crystals growing out of its back
      goldslime: () => { add(g, ball(0.2, 10), mat(0xa07a3a, { roughness: 1 }), -0.32, 0.62, -0.25, 1, 1.2, 1); for (let i = 0; i < 3; i++) add(g, new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10), mat(0xffd23f, { metalness: 0.8, roughness: 0.3 }), -0.32 + i * 0.03, 0.85 + i * 0.03, -0.25); }, // a sack of gold
      shadowslime: () => { const hood = add(head, new THREE.ConeGeometry(0.38, 0.65, 12, 1, true), mat(0x1a1424, { side: THREE.DoubleSide, roughness: 1 }), 0, 0.15, -0.08); hood.rotation.x = -0.3; },
      pearlslime: () => add(head, new THREE.SphereGeometry(0.33, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), mat(0xfff0f6, { metalness: 0.3, roughness: 0.2 }), 0, 0.02, -0.02), // a shell cap
      practice: () => { add(g, ball(0.3, 10), mat(0xe0c070, { roughness: 1 }), 0, 0.92, 0.12, 1.1, 1.0, 0.7); club.visible = false; }, // a padded training jerkin, no club
    };
    kit[variant]?.();
    return { group: g, parts: { arms, legs, head }, height: 1.75 };
  },

  skeleton() {
    const g = new THREE.Group();
    const bone = mat(0xf0e8d6, { roughness: 0.8 }), dark = new THREE.MeshBasicMaterial({ color: 0x141414 });
    const head = new THREE.Group();
    head.position.set(0, 1.85, 0);
    g.add(head);
    add(head, ball(0.34, 14), bone, 0, 0, 0, 1, 0.95, 1);
    add(head, new THREE.BoxGeometry(0.4, 0.16, 0.3), bone, 0, -0.27, 0.06); // jaw
    for (const s of [-1, 1]) add(head, ball(0.09, 8), glow(0xff5a3a), s * 0.13, 0.03, 0.27); // glowing eyes
    add(head, new THREE.BoxGeometry(0.06, 0.08, 0.05), dark, 0, -0.1, 0.32);
    add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), bone, 0, 1.15, 0); // spine
    for (let i = 0; i < 4; i++) add(g, new THREE.TorusGeometry(0.26 - i * 0.03, 0.035, 5, 14, Math.PI * 1.4), bone, 0, 1.5 - i * 0.13, 0.02).rotation.set(Math.PI / 2, 0, Math.PI * 0.8);
    add(g, new THREE.BoxGeometry(0.45, 0.12, 0.2), bone, 0, 0.72, 0); // hips
    const arms = [], legs = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.32, 1.55, 0);
      add(arm, new THREE.CylinderGeometry(0.045, 0.04, 0.75, 6), bone, 0, -0.38, 0);
      add(arm, ball(0.07, 6), bone, 0, -0.78, 0.02);
      g.add(arm);
      arms.push(arm);
      const leg = new THREE.Group();
      leg.position.set(s * 0.15, 0.68, 0);
      add(leg, new THREE.CylinderGeometry(0.055, 0.045, 0.65, 6), bone, 0, -0.33, 0);
      add(leg, new THREE.BoxGeometry(0.14, 0.06, 0.24), bone, 0, -0.66, 0.06);
      g.add(leg);
      legs.push(leg);
    }
    // a rusty sword
    const sword = new THREE.Group();
    add(sword, new THREE.BoxGeometry(0.07, 0.8, 0.02), mat(0x9a8a7a, { metalness: 0.5 }), 0, -0.45, 0.25);
    add(sword, new THREE.BoxGeometry(0.25, 0.05, 0.05), mat(0x6b4a2c), 0, -0.05, 0.25);
    arms[1].add(sword);
    sword.position.y = -0.75;
    return { group: g, parts: { arms, legs, head }, height: 2.3 };
  },
  ghost() { // a wraith: a hooded, tattered shroud with nothing inside but two cold eyes, and bony claws
    const g = new THREE.Group();
    const shroud = mat(0x8a98aa, { transparent: true, opacity: 0.88, emissive: 0x1a2a44, emissiveIntensity: 0.5, side: THREE.DoubleSide, roughness: 0.95 });
    const dark = new THREE.MeshBasicMaterial({ color: 0x04050a }), bone = mat(0xd8d2c0, { roughness: 0.7 });
    add(g, new THREE.ConeGeometry(0.42, 0.85, 14, 1, true), shroud, 0, 0.62, -0.04); // the hood
    add(g, ball(0.3, 12), dark, 0, 0.42, 0.06, 1, 1.15, 0.8);                      // darkness inside it
    for (const s of [-1, 1]) add(g, ball(0.055, 8), glow(0x7ae8ff), s * 0.1, 0.46, 0.3, 1.4, 0.6, 0.5);
    const skirt = add(g, new THREE.CylinderGeometry(0.34, 0.66, 1.0, 16, 1, true), shroud, 0, -0.12, 0);
    const tails = [];
    for (let i = 0; i < 9; i++) { // ragged strips trailing off the hem
      const a = (i / 9) * Math.PI * 2;
      tails.push(add(g, new THREE.ConeGeometry(0.12, 0.6, 4), shroud, Math.cos(a) * 0.6, -0.8, Math.sin(a) * 0.6));
      tails.at(-1).rotation.x = Math.PI;
    }
    const arms = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.36, 0.22, 0.1);
      add(arm, new THREE.ConeGeometry(0.14, 0.6, 8, 1, true), shroud, s * 0.22, -0.05, 0.12).rotation.z = s * 1.75; // a sleeve
      for (let f = 0; f < 3; f++) limb(arm, [s * 0.5, -0.12, 0.16], [s * 0.72, -0.22 + f * 0.06, 0.24 + (f - 1) * 0.07], 0.018, 0.004, bone); // claws
      g.add(arm);
      arms.push(arm);
    }
    return { group: g, parts: { arms, skirt, tails }, height: 1.5 };
  },
  crab() {
    const g = new THREE.Group();
    const shell = mat(0xe0553a, { roughness: 0.5 }), under = mat(0xffb28a);
    add(g, ball(0.5, 16), shell, 0, 0.5, 0, 1.35, 0.6, 1);
    add(g, ball(0.42, 12), under, 0, 0.42, 0.05, 1.25, 0.45, 0.9);
    for (const s of [-1, 1]) { // eyes on stalks
      add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), shell, s * 0.18, 0.85, 0.3);
      add(g, ball(0.08, 8), glow(0xffc02a), s * 0.18, 1.02, 0.3);
      add(g, ball(0.03, 6), new THREE.MeshBasicMaterial({ color: 0x111111 }), s * 0.18, 1.03, 0.37, 0.4, 1.6, 1); // slit pupils
    }
    const claws = [], legs = [];
    for (const s of [-1, 1]) {
      const claw = new THREE.Group();
      claw.position.set(s * 0.6, 0.55, 0.35);
      add(claw, new THREE.CylinderGeometry(0.07, 0.07, 0.4, 6), shell, s * 0.15, 0, 0.1).rotation.z = s * 1.2;
      add(claw, ball(0.2, 10), shell, s * 0.35, 0.12, 0.25, 1, 0.7, 1.3);
      const pincer = add(claw, new THREE.ConeGeometry(0.08, 0.25, 6), shell, s * 0.35, 0.22, 0.45);
      pincer.rotation.x = Math.PI / 2;
      g.add(claw);
      claws.push(claw);
      for (let i = 0; i < 3; i++) {
        const leg = add(g, new THREE.CylinderGeometry(0.04, 0.03, 0.55, 5), shell, s * 0.62, 0.25, -0.2 + i * 0.22);
        leg.rotation.z = s * 0.9;
        legs.push(leg);
      }
    }
    return { group: g, parts: { claws, legs }, height: 1.3 };
  },
  bat(fire) {
    const g = new THREE.Group();
    const fur = mat(fire ? 0x8a2a1a : 0x4a3a5e), wing = mat(fire ? 0xff7a2a : 0x6a4f86, { side: THREE.DoubleSide });
    add(g, ball(0.35), fur, 0, 0, 0, 1, 0.9, 1);
    for (const s of [-1, 1]) {
      const ear = add(g, new THREE.ConeGeometry(0.1, 0.25, 4), fur, s * 0.17, 0.32, 0);
      ear.rotation.z = -s * 0.3;
    }
    eyes(g, 0.05, 0.27, 0.12, 0.08, fire ? 0xffd23f : 0xff2a4a);
    const wings = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.x = s * 0.25;
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(s * 0.9, 0.35); shape.lineTo(s * 0.75, -0.05); shape.lineTo(s * 1.0, -0.25); shape.lineTo(s * 0.5, -0.2); shape.lineTo(0, -0.15);
      const w = add(pivot, new THREE.ShapeGeometry(shape), wing);
      w.rotation.x = -Math.PI / 2;
      for (const [x, y] of [[0.9, 0.35], [1.0, -0.25], [0.5, -0.2]]) limb(pivot, [0, 0.01, 0], [s * x, 0.01, -y], 0.025, 0.01, fur); // bony fingers through the wing
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
    eyes(g, 1.25, 0.72, 0.16, 0.09, 0x6ae0ff);
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
    add(g, new THREE.CylinderGeometry(0.32, 0.42, 0.8, 12), mat(0xd8c8a8), 0, 0.45, 0);
    const cap = add(g, new THREE.SphereGeometry(0.75, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xa8202a), 0, 0.8, 0, 1, 0.8, 1);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, r = i % 2 ? 0.45 : 0.3;
      add(cap, ball(0.1, 8), mat(0xffffff), Math.cos(a) * r, 0.5 + (i % 2 ? 0 : 0.18), Math.sin(a) * r, 1, 0.5, 1);
    }
    eyes(g, 0.62, 0.3, 0.13, 0.08, 0x9aff3a);
    const feet = [];
    for (const s of [-1, 1]) feet.push(add(g, ball(0.15), mat(0xd9c9ad), s * 0.2, 0.08, 0.05, 1, 0.6, 1.3));
    return { group: g, parts: { cap, feet }, height: 1.6 };
  },
  spider() {
    const g = new THREE.Group();
    const body = mat(0x221a28, { roughness: 0.3, metalness: 0.25 }), stripe = mat(0xd0202a);
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
      limb(g, [s * 0.13, 0.7, 0], [s * 0.3, 0.92, -0.05], 0.07, 0.045, mat(0x2a1410));
      limb(g, [s * 0.3, 0.92, -0.05], [s * 0.3, 1.12, -0.18], 0.045, 0.005, mat(0x2a1410)); // curling back
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
      for (const [x, y] of [[1.4, 0.7], [1.5, -0.3], [0.8, -0.7]]) { // wing bones, along the membrane (tilted with it)
        const tip = new THREE.Vector3(s * x, y, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), -1.1);
        limb(pivot, [0, 0, 0], [tip.x, tip.y, tip.z], 0.045, 0.015, scale);
      }
      g.add(pivot);
      wings.push(pivot);
    }
    const tail = add(g, new THREE.ConeGeometry(0.25, 1.4, 8), scale, 0, 0.6, -1.3);
    tail.rotation.x = -1.35;
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) add(g, ball(0.18), scale, x * 0.45, 0.2, z * 0.45, 1, 1.2, 1);
    return { group: g, parts: { wings, head }, height: 2.6 };
  },
};

/**
 * Finer detail on top of each body (teeth, claws, horns, fur, plates, spots...), so nothing reads
 * as a plain blob. Runs before tinting, so a tinted boss gets its details tinted too.
 */
const DETAILS = {
  skeleton({ group: g, parts: P }) {
    const bone = mat(0xf0e8d6, { roughness: 0.8 }), rust = mat(0x6b4a2c);
    for (let i = 0; i < 5; i++) add(P.head, new THREE.BoxGeometry(0.045, 0.06, 0.03), bone, -0.12 + i * 0.06, -0.2, 0.2); // teeth
    add(P.head, new THREE.TorusGeometry(0.1, 0.012, 4, 10), glow(0xff5a3a), -0.13, 0.03, 0.29).scale.set(1, 1, 0.3);
    for (const [i, arm] of P.arms.entries()) {
      add(arm, ball(0.12, 8), rust, 0, 0.05, 0, 1, 0.6, 1); // shoulder pad
      for (let f = 0; f < 3; f++) add(arm, new THREE.CylinderGeometry(0.012, 0.012, 0.12, 4), bone, -0.04 + f * 0.04, -0.88, 0.04);
      if (i === 0) add(arm, new THREE.BoxGeometry(0.3, 0.38, 0.04), rust, 0, -0.55, 0.12); // a battered shield
    }
    for (const leg of P.legs) add(leg, ball(0.06, 6), bone, 0, -0.33, 0.04); // kneecaps
    const iron = mat(0x3a3a42, { metalness: 0.6, roughness: 0.45 });
    add(P.head, new THREE.SphereGeometry(0.37, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), iron, 0, 0.02, -0.02); // a battered helm
    for (const s of [-1, 1]) limb(P.head, [s * 0.28, 0.18, 0], [s * 0.5, 0.48, -0.08], 0.06, 0.01, mat(0xe8dcc0)); // horns
    const cape = new THREE.PlaneGeometry(0.62, 1.1, 4, 5), cp = cape.attributes.position;
    for (let i = 0; i < cp.count; i++) { const u = cp.getX(i), v = cp.getY(i); cp.setZ(i, Math.sin(u * 5) * 0.04); if (v < -0.4) cp.setY(i, v + Math.abs(Math.sin(u * 13)) * 0.25); } // ragged hem
    cape.computeVertexNormals();
    add(g, cape, mat(0x3a1418, { side: THREE.DoubleSide, roughness: 1 }), 0, 1.15, -0.17).rotation.x = 0.12;
    add(g, new THREE.BoxGeometry(0.5, 0.06, 0.24), rust, 0, 0.8, 0);   // belt
    add(g, new THREE.BoxGeometry(0.08, 0.08, 0.04), mat(0xc9a43a, { metalness: 0.6 }), 0, 0.8, 0.12);
  },
  ghost({ group: g, parts: P }) {
    const chain = mat(0x8a8aa0, { metalness: 0.6, roughness: 0.4 });
    for (const arm of P.arms) for (let i = 0; i < 3; i++) add(arm, new THREE.TorusGeometry(0.05, 0.015, 4, 8), chain, (arm.position.x > 0 ? 1 : -1) * (0.3 + i * 0.07), -0.1 - i * 0.05, 0.12).rotation.y = i; // shackles
    const wisp = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x6aa8e0, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
    wisp.scale.setScalar(2.0);
    wisp.position.y = 0.3;
    g.add(wisp);
  },
  crab({ group: g, parts: P }) {
    const shell = mat(0xe0553a, { roughness: 0.5 }), spot = mat(0xffb28a);
    for (let i = 0; i < 7; i++) add(g, ball(0.08, 6), i % 2 ? spot : shell, -0.45 + i * 0.15, 0.78, -0.1 + Math.sin(i) * 0.15, 1, 0.5, 1); // shell bumps
    for (const claw of P.claws) {
      const s = claw.position.x > 0 ? 1 : -1;
      for (let i = 0; i < 3; i++) add(claw, new THREE.ConeGeometry(0.025, 0.07, 4), mat(0xfff0e0), s * (0.3 + i * 0.05), 0.14, 0.52).rotation.x = Math.PI;
    }
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; add(g, new THREE.ConeGeometry(0.05, 0.22, 5), mat(0x7a2014), Math.cos(a) * 0.48, 0.72, Math.sin(a) * 0.35).rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); } // a spiked shell rim
  },
  bat({ group: g }) {
    const fang = mat(0xffffff);
    for (const s of [-1, 1]) {
      add(g, new THREE.ConeGeometry(0.025, 0.09, 4), fang, s * 0.05, -0.13, 0.3).rotation.x = Math.PI;
      add(g, new THREE.ConeGeometry(0.05, 0.14, 4), mat(0xff9ab8), s * 0.17, 0.33, 0.04).rotation.z = -s * 0.3; // inner ears
    }
    add(g, ball(0.18, 10), mat(0x2a2236, { roughness: 1 }), 0, -0.1, 0.12, 1, 0.8, 0.6); // fluffy chest
  },
  yeti({ group: g, parts: P }) {
    const fur = mat(0xf2f6ff, { roughness: 1 }), horn = mat(0xd8c8a8), claw = mat(0x2a3a4a);
    for (const s of [-1, 1]) {
      const h = add(g, new THREE.ConeGeometry(0.1, 0.45, 6), horn, s * 0.42, 1.75, 0.1);
      h.rotation.z = -s * 0.7;
      add(g, new THREE.ConeGeometry(0.04, 0.16, 4), mat(0xffffff), s * 0.08, 0.92, 0.75).rotation.x = Math.PI; // tusks
    }
    for (let i = 0; i < 14; i++) { // shaggy tufts
      const a = (i / 14) * Math.PI * 2;
      add(g, new THREE.ConeGeometry(0.12, 0.3, 5), fur, Math.cos(a) * 0.72, 1.35 + Math.sin(i * 1.7) * 0.15, Math.sin(a) * 0.62).rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    }
    add(g, new THREE.BoxGeometry(0.45, 0.07, 0.1), mat(0x6a8eb0), 0, 1.4, 0.7); // brow
    for (const arm of P.arms) for (let i = 0; i < 3; i++) add(arm, new THREE.ConeGeometry(0.04, 0.14, 4), claw, -0.1 + i * 0.1, -0.98, 0.12).rotation.x = Math.PI * 0.8;
  },
  shroom({ group: g, parts: P }) {
    const gill = mat(0xf0d0b0, { side: THREE.DoubleSide });
    const under = add(P.cap, new THREE.RingGeometry(0.3, 0.74, 24), gill, 0, 0.02, 0);
    under.rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) { const a = i * 1.05; add(P.cap, ball(0.06, 6), mat(0xffffff), Math.cos(a) * 0.6, 0.25, Math.sin(a) * 0.6, 1, 0.5, 1); }
    add(g, new THREE.BoxGeometry(0.34, 0.1, 0.05), new THREE.MeshBasicMaterial({ color: 0x140806 }), 0, 0.46, 0.37); // a gaping mouth
    for (let i = 0; i < 6; i++) add(g, new THREE.ConeGeometry(0.022, 0.07, 3), mat(0xf0e8d0), -0.13 + i * 0.052, i % 2 ? 0.43 : 0.49, 0.39).rotation.z = i % 2 ? 0 : Math.PI; // jagged teeth
    for (let i = 0; i < 9; i++) add(P.cap, ball(0.04, 5), glow(0x9aff3a), Math.cos(i * 2.1) * 0.5, 0.42 + Math.sin(i * 1.3) * 0.12, Math.sin(i * 2.1) * 0.5); // glowing spores
  },
  spider({ group: g }) {
    const hair = mat(0x2a2236), fang = mat(0xd8d0c0);
    for (let i = 0; i < 12; i++) add(g, new THREE.ConeGeometry(0.03, 0.14, 4), hair, Math.cos(i * 1.3) * 0.4, 0.85 + Math.sin(i) * 0.15, -0.35 + Math.sin(i * 2.1) * 0.4); // bristles
    for (const s of [-1, 1]) add(g, new THREE.ConeGeometry(0.035, 0.14, 4), fang, s * 0.07, 0.4, 0.58).rotation.x = Math.PI;
    for (const s of [-1, 1]) add(g, new THREE.ConeGeometry(0.12, 0.2, 3), mat(0xd0202a), 0, 1.04, -0.35 + s * 0.1, 1, 1, 0.4).rotation.x = s > 0 ? -Math.PI / 2 : Math.PI / 2; // a red hourglass
  },
  imp({ group: g }) {
    const skin = mat(0xe8433a), dark = mat(0x5a1a14);
    for (const s of [-1, 1]) add(g, new THREE.ConeGeometry(0.05, 0.18, 4), skin, s * 0.3, 0.55, 0).rotation.z = -s * 1.2; // pointy ears
    for (let i = 0; i < 4; i++) add(g, new THREE.ConeGeometry(0.02, 0.05, 3), mat(0xffffff), -0.06 + i * 0.04, 0.4, 0.3).rotation.x = Math.PI; // a toothy grin
    add(g, ball(0.12, 8), dark, 0, -0.05, 0.25, 1.2, 0.8, 0.5); // belly
  },
  golem({ group: g, parts: P }) {
    const moss = mat(0x5a8a3a, { roughness: 1 }), rock = mat(0x5a504a, { flatShading: true, roughness: 1 }), rune = glow(0x6ae0ff);
    for (const [x, y, z, r] of [[0.3, 1.7, 0.45, 0.22], [-0.45, 1.5, 0.35, 0.18], [0.1, 2.35, 0.2, 0.2], [-0.2, 0.95, 0.6, 0.16]]) add(g, ball(r, 8), moss, x, y, z, 1, 0.4, 1);
    for (let i = 0; i < 6; i++) add(g, new THREE.DodecahedronGeometry(0.12, 0), rock, Math.cos(i * 1.1) * 0.7, 1.1 + Math.sin(i * 2) * 0.3, Math.sin(i * 1.1) * 0.5);
    for (const [x, y] of [[-0.25, 1.55], [0.25, 1.05]]) add(g, new THREE.TorusGeometry(0.09, 0.02, 4, 12), rune, x, y, 0.72);
    for (let i = 0; i < 6; i++) add(g, new THREE.BoxGeometry(0.04, 0.4 + (i % 3) * 0.15, 0.04), glow(0xff6a1a), Math.cos(i * 1.7) * 0.55, 1.1 + Math.sin(i * 2.3) * 0.35, 0.45 + Math.sin(i) * 0.15).rotation.set(0.2 * i, 0, i * 0.8); // lava veins
    for (const arm of P.arms) for (let i = 0; i < 3; i++) add(arm, new THREE.DodecahedronGeometry(0.08, 0), rock, -0.12 + i * 0.12, -1.22, 0.15); // knuckles
  },
  dragon({ group: g, parts: P }) {
    const plate = mat(0xffe3a0), horn = mat(0x3a2a2a), fang = mat(0xffffff);
    for (let i = 0; i < 7; i++) add(g, new THREE.ConeGeometry(0.1 - i * 0.008, 0.28, 4), plate, 0, 1.55 - i * 0.07, 0.4 - i * 0.28).rotation.x = -0.4; // back spikes
    for (let i = 0; i < 4; i++) add(g, new THREE.BoxGeometry(0.5 - i * 0.05, 0.05, 0.1), plate, 0, 0.55 + i * 0.13, 0.72 + i * 0.02); // belly plates
    for (const s of [-1, 1]) {
      add(P.head, new THREE.ConeGeometry(0.03, 0.1, 4), fang, s * 0.1, -0.16, 0.4).rotation.x = Math.PI;
      add(P.head, ball(0.03, 6), new THREE.MeshBasicMaterial({ color: 0x220000 }), s * 0.07, 0.0, 0.53); // nostrils
      add(P.head, new THREE.ConeGeometry(0.05, 0.2, 4), horn, s * 0.25, 0.15, -0.05).rotation.z = -s * 1.0;
    }
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) for (let i = 0; i < 3; i++) add(g, new THREE.ConeGeometry(0.03, 0.1, 4), horn, x * 0.45 - 0.06 + i * 0.06, 0.05, z * 0.45 + 0.15).rotation.x = Math.PI / 2; // claws
  },
};

// ---- the seasonal bosses: creatures you meet nowhere else
const SEASON_BODIES = {
  treant() { // spring: a walking blossom tree with a bark face and root feet
    const g = new THREE.Group();
    const bark = mat(0x6b4a2c, { roughness: 1, flatShading: true }), bloom = mat(0xffb3cc, { roughness: 1 }), leaf = mat(0x5fae4a, { roughness: 1 });
    add(g, new THREE.CylinderGeometry(0.45, 0.6, 1.8, 9), bark, 0, 1.1, 0);
    for (let i = 0; i < 8; i++) add(g, new THREE.BoxGeometry(0.06, 1.4, 0.05), mat(0x4a3220), Math.cos(i * 0.8) * 0.5, 1.1, Math.sin(i * 0.8) * 0.5).rotation.y = -i * 0.8; // bark grooves
    const crown = new THREE.Group();
    crown.position.y = 2.3;
    g.add(crown);
    for (const [x, y, z, r, m] of [[0, 0.4, 0, 0.9, bloom], [0.7, 0.1, 0.2, 0.6, bloom], [-0.7, 0.15, 0, 0.65, bloom], [0.1, 0.1, 0.65, 0.55, leaf], [0, 0.2, -0.6, 0.6, leaf], [0.35, 0.75, -0.2, 0.5, bloom]]) add(crown, ball(r, 10), m, x, y, z);
    for (let i = 0; i < 12; i++) add(crown, ball(0.09, 6), mat(0xffffff), Math.cos(i * 2.4) * 0.8, 0.3 + Math.sin(i) * 0.4, Math.sin(i * 2.4) * 0.8);
    for (const s of [-1, 1]) add(g, ball(0.09, 8), glow(0x9aff6a), s * 0.17, 1.55, 0.45); // eyes
    add(g, new THREE.BoxGeometry(0.3, 0.08, 0.05), new THREE.MeshBasicMaterial({ color: 0x2a1a10 }), 0, 1.3, 0.5);
    const arms = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.5, 1.6, 0);
      const branch = add(arm, new THREE.CylinderGeometry(0.08, 0.15, 1.1, 6), bark, s * 0.35, -0.3, 0);
      branch.rotation.z = s * 1.0;
      for (let i = 0; i < 3; i++) add(arm, ball(0.18, 8), i % 2 ? leaf : bloom, s * (0.75 + i * 0.1), -0.6 + i * 0.15, (i - 1) * 0.15);
      g.add(arm);
      arms.push(arm);
    }
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(g, new THREE.ConeGeometry(0.14, 0.7, 5), bark, Math.cos(a) * 0.6, 0.15, Math.sin(a) * 0.6).rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); } // roots
    return { group: g, parts: { arms, crown }, height: 3.3 };
  },
  sunserpent() { // summer: a coiled golden serpent with a blazing sun halo
    const g = new THREE.Group();
    const gold = mat(0xffb020, { metalness: 0.4, roughness: 0.35 }), belly = mat(0xfff0a0), flame = glow(0xff7a1a);
    const segs = [];
    for (let i = 0; i < 9; i++) {
      const seg = add(g, ball(0.42 - i * 0.025, 12), i % 2 ? gold : mat(0xff9a1a, { metalness: 0.4, roughness: 0.35 }), 0, 0.4, 0);
      segs.push(seg);
      add(seg, new THREE.ConeGeometry(0.08, 0.22, 4), belly, 0, 0.4, 0); // a ridge spike on each
    }
    const head = new THREE.Group();
    head.position.set(0, 2.0, 0.3);
    g.add(head);
    add(head, ball(0.42, 14), gold, 0, 0, 0, 1, 0.85, 1.3);
    add(head, ball(0.25, 10), belly, 0, -0.12, 0.38, 1, 0.6, 1);
    eyes(head, 0.14, 0.3, 0.2, 0.08, 0xff3a1a);
    for (const s of [-1, 1]) add(head, new THREE.ConeGeometry(0.04, 0.14, 4), mat(0xffffff), s * 0.1, -0.24, 0.45).rotation.x = Math.PI;
    const halo = new THREE.Group();
    halo.position.set(0, 0.1, -0.35);
    head.add(halo);
    add(halo, new THREE.TorusGeometry(0.75, 0.06, 6, 28), flame);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const ray = add(halo, new THREE.ConeGeometry(0.1, 0.45, 4), flame, Math.cos(a) * 0.98, Math.sin(a) * 0.98, 0); ray.rotation.z = a - Math.PI / 2; }
    return { group: g, parts: { segs, head, halo }, height: 2.8 };
  },
  pumpkinking() { // autumn: the Pumpkin Horror — a towering thing of roots and thorns with a burning jack-o'-lantern for a head
    const g = new THREE.Group();
    const bark = mat(0x3a2a1e, { roughness: 1, flatShading: true }), vine = mat(0x34501f, { roughness: 0.9 }), thorn = mat(0x1e140c, { roughness: 0.8 });
    const cloth = mat(0x2a1812, { roughness: 1, side: THREE.DoubleSide }), rind = mat(0xf07a1a, { roughness: 0.5 }), rindDark = mat(0xc0580e, { roughness: 0.6 });
    const fire = glow(0xffb020), hot = glow(0xff5a10);
    const legs = [];
    for (const s of [-1, 1]) { // gnarled root legs with root toes
      const leg = new THREE.Group();
      leg.position.set(s * 0.38, 1.35, 0);
      g.add(leg);
      limb(leg, [0, 0, 0], [s * 0.12, -0.7, 0.12], 0.2, 0.15, bark);
      limb(leg, [s * 0.12, -0.7, 0.12], [s * 0.08, -1.32, -0.05], 0.15, 0.11, bark);
      for (let i = 0; i < 3; i++) limb(leg, [s * 0.08, -1.3, -0.05], [s * 0.08 + (i - 1) * 0.22, -1.38, 0.38], 0.08, 0.02, bark);
      legs.push(leg);
    }
    // a twisted trunk of a body, broad in the shoulders, wrapped in vines, glowing through the cracks
    add(g, new THREE.CylinderGeometry(0.78, 0.42, 1.5, 9), bark, 0, 2.1, 0);
    for (let i = 0; i < 5; i++) add(g, new THREE.TorusGeometry(0.62 - i * 0.04, 0.06, 5, 14, Math.PI * 1.3), vine, 0, 2.6 - i * 0.25, 0.04).rotation.set(Math.PI / 2, 0, Math.PI * 0.85 + i * 0.4);
    for (let i = 0; i < 4; i++) add(g, new THREE.BoxGeometry(0.05, 0.5, 0.05), hot, -0.3 + i * 0.2, 2.1 + Math.sin(i * 2) * 0.2, 0.62 - Math.abs(i - 1.5) * 0.06).rotation.z = (i - 1.5) * 0.4;
    // a tattered cloak hanging off the shoulders, ragged at the hem
    const cloak = add(g, new THREE.CylinderGeometry(0.85, 1.25, 2.1, 14, 1, true, Math.PI * 0.55, Math.PI * 0.9), cloth, 0, 1.75, -0.05);
    cloak.rotation.y = Math.PI;
    for (let i = 0; i < 9; i++) { const a = Math.PI * (0.62 + i * 0.1); add(g, new THREE.ConeGeometry(0.13, 0.55, 4), cloth, Math.sin(a) * 1.22, 0.6, Math.cos(a) * 1.22).rotation.x = Math.PI; }
    for (const s of [-1, 1]) { // spiked shoulders
      add(g, new THREE.DodecahedronGeometry(0.36, 0), bark, s * 0.78, 2.85, 0);
      for (let i = 0; i < 3; i++) add(g, new THREE.ConeGeometry(0.07, 0.45, 5), thorn, s * (0.78 + i * 0.08), 3.15, -0.15 + i * 0.15).rotation.z = -s * (0.3 + i * 0.2);
    }
    // the head: a huge ribbed jack-o'-lantern, carved with an angry face, fire roaring out of the top
    const head = new THREE.Group();
    head.position.set(0, 3.55, 0.08);
    g.add(head);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; add(head, ball(0.5, 12), i % 2 ? rind : rindDark, Math.sin(a) * 0.42, 0, Math.cos(a) * 0.4, 0.62, 1.05, 0.62); }
    add(head, ball(0.62, 16), rind, 0, 0, 0, 1.2, 0.95, 1.15);
    const stem = limb(head, [0, 0.5, 0], [0.12, 0.85, -0.08], 0.1, 0.05, mat(0x3a4a1a));
    stem.castShadow = false;
    for (const s of [-1, 1]) { // jagged, slanting eyes
      const eye = add(head, new THREE.CircleGeometry(0.2, 3), fire, s * 0.28, 0.14, 0.715, 1.3, 0.75, 1);
      eye.rotation.z = s > 0 ? Math.PI * 0.95 : Math.PI * 0.05 + Math.PI / 3;
    }
    add(head, new THREE.CircleGeometry(0.08, 3), fire, 0, -0.04, 0.73).rotation.z = -Math.PI / 2; // nose
    const mouth = add(head, new THREE.RingGeometry(0.22, 0.4, 20, 1, Math.PI * 1.12, Math.PI * 0.76), hot, 0, -0.08, 0.7);
    mouth.scale.set(1.15, 0.9, 1);
    for (let i = 0; i < 6; i++) { const a = Math.PI * (1.18 + i * 0.13); add(head, new THREE.ConeGeometry(0.05, 0.14, 3), rind, Math.cos(a) * 0.33 * 1.15, -0.08 + Math.sin(a) * 0.33 * 0.9 + (i % 2 ? 0.09 : -0.06), 0.725).rotation.z = i % 2 ? Math.PI : 0; } // jagged teeth
    const flames = [];
    for (let i = 0; i < 6; i++) { // fire licking out of the top
      const a = (i / 6) * Math.PI * 2, f = add(head, new THREE.ConeGeometry(0.15 - (i % 2) * 0.04, 0.7, 6), i % 2 ? fire : hot, Math.cos(a) * 0.22, 0.75, Math.sin(a) * 0.22);
      f.geometry.translate(0, 0.25, 0);
      flames.push(f);
    }
    // long gaunt arms ending in thorn claws
    const arms = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.95, 2.8, 0);
      g.add(arm);
      limb(arm, [0, 0, 0], [s * 0.35, -0.95, 0.2], 0.15, 0.11, vine);
      limb(arm, [s * 0.35, -0.95, 0.2], [s * 0.45, -1.85, 0.5], 0.11, 0.08, vine);
      for (let i = 0; i < 4; i++) limb(arm, [s * 0.45, -1.85, 0.5], [s * (0.35 + i * 0.08), -2.3, 0.72 + (i % 2) * 0.1], 0.05, 0.005, thorn);
      arms.push(arm);
    }
    const scythe = new THREE.Group(); // a great scythe in the right hand
    limb(scythe, [0, -1.4, 0], [0, 2.0, 0], 0.06, 0.05, mat(0x2a1a10));
    const blade = add(scythe, new THREE.TorusGeometry(1.0, 0.09, 4, 20, Math.PI * 0.62), mat(0x9aa0aa, { metalness: 0.85, roughness: 0.3 }), 0.95, 1.85, 0, 1, 1, 0.35);
    blade.rotation.z = Math.PI * 0.32;
    add(scythe, new THREE.TorusGeometry(1.0, 0.02, 3, 20, Math.PI * 0.62), hot, 0.95, 1.85, 0.03).rotation.z = Math.PI * 0.32; // a glowing edge
    scythe.position.set(0.45, -1.85, 0.5);
    scythe.rotation.x = 0.25;
    arms[1].add(scythe);
    // vine tentacles writhing out of its back (chains of segments, each bending a little more)
    const tentacles = [];
    for (let k = 0; k < 4; k++) {
      const chain = [];
      let parent = new THREE.Group();
      parent.position.set((k - 1.5) * 0.35, 2.4 + (k % 2) * 0.3, -0.45);
      parent.rotation.set(-0.9, (k - 1.5) * 0.5, 0);
      g.add(parent);
      for (let i = 0; i < 6; i++) {
        const seg = new THREE.Group();
        if (i) seg.position.y = 0.38;
        parent.add(seg);
        limb(seg, [0, 0, 0], [0, 0.4, 0], 0.09 - i * 0.012, 0.08 - i * 0.012, vine);
        if (i % 2) add(seg, new THREE.ConeGeometry(0.03, 0.14, 4), thorn, 0.08, 0.2, 0).rotation.z = -1.2;
        chain.push(seg);
        parent = seg;
      }
      tentacles.push(chain);
    }
    const embers = new THREE.Group(); // embers drifting round it
    for (let i = 0; i < 14; i++) add(embers, ball(0.05, 5), i % 3 ? fire : hot, Math.cos(i * 0.9) * (1.4 + (i % 3) * 0.3), 1 + (i * 0.37) % 3, Math.sin(i * 0.9) * (1.4 + (i % 3) * 0.3));
    g.add(embers);
    const crows = new THREE.Group(); // two crows circling overhead
    for (let i = 0; i < 2; i++) {
      const crow = new THREE.Group();
      crow.position.set(i ? -2.4 : 2.4, 4.6 + i * 0.4, 0);
      crow.rotation.y = i ? Math.PI : 0;
      add(crow, ball(0.14, 8), mat(0x15151c), 0, 0, 0, 0.9, 0.8, 1.4);
      add(crow, ball(0.09, 8), mat(0x15151c), 0, 0.06, 0.18);
      add(crow, new THREE.ConeGeometry(0.03, 0.1, 4), mat(0xd8a020), 0, 0.06, 0.29).rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) add(crow, new THREE.ConeGeometry(0.12, 0.42, 3), mat(0x15151c, { side: THREE.DoubleSide }), s * 0.22, 0.02, -0.02, 1, 1, 0.2).rotation.z = s * 1.45;
      crows.add(crow);
    }
    g.add(crows);
    const outer = new THREE.Group(); // built big; shown at 3/4 (the boss is scaled up again on top)
    g.scale.setScalar(0.75);
    outer.add(g);
    return { group: outer, parts: { arms, legs, head, flames, tentacles, embers, crows }, height: 4.6 * 0.75 };
  },
  icetitan() { // winter: a giant of ice crystals with a snowy beard and an ice crown
    const g = new THREE.Group();
    const ice = mat(0xbfeaff, { roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92, flatShading: true }), deep = mat(0x6ab8e8, { roughness: 0.2, flatShading: true }), snow = mat(0xffffff, { roughness: 1 });
    add(g, new THREE.IcosahedronGeometry(0.85, 0), ice, 0, 1.3, 0, 1, 1.15, 0.85);
    add(g, new THREE.IcosahedronGeometry(0.5, 0), ice, 0, 2.35, 0.05);
    for (let i = 0; i < 9; i++) { const a = i * 0.7; const c = add(g, new THREE.ConeGeometry(0.12, 0.6, 5), deep, Math.cos(a) * 0.6, 1.9 + Math.sin(i) * 0.2, Math.sin(a) * 0.45 - 0.2); c.rotation.set(-0.4, 0, Math.cos(a) * -0.5); } // shoulder shards
    for (let i = 0; i < 7; i++) add(g, new THREE.ConeGeometry(0.1, 0.45, 5), snow, -0.24 + i * 0.08, 2.0, 0.42).rotation.x = Math.PI * 0.95; // snowy beard
    for (const s of [-1, 1]) add(g, ball(0.08, 8), glow(0x6ae0ff), s * 0.16, 2.45, 0.43);
    const crown = new THREE.Group();
    crown.position.y = 2.85;
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; add(crown, new THREE.ConeGeometry(0.07, 0.4 + (i % 2) * 0.2, 5), deep, Math.cos(a) * 0.3, 0.15, Math.sin(a) * 0.3); }
    g.add(crown);
    const arms = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.95, 1.85, 0);
      add(arm, new THREE.IcosahedronGeometry(0.32, 0), ice, 0, -0.4, 0, 0.9, 1.4, 0.9);
      add(arm, new THREE.IcosahedronGeometry(0.3, 0), deep, 0, -1.0, 0.1);
      g.add(arm);
      arms.push(arm);
      add(g, new THREE.IcosahedronGeometry(0.35, 0), ice, s * 0.4, 0.35, 0, 1, 1, 1.2); // feet
    }
    const mist = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
    mist.scale.setScalar(3.5);
    mist.position.y = 1.3;
    g.add(mist);
    return { group: g, parts: { arms, crown }, height: 3.2 };
  },
};
Object.assign(BODIES, SEASON_BODIES);

/** Each creature's finish (client/creaturelook.js): its rim-light colour, how grainy its skin is and how fine. */
const LOOKS = {
  skeleton: { rim: 0x6ad8ff, grain: 0.5, scale: 7 },
  goblin: { rim: 0xffc060, grain: 0.6, scale: 9 },
  ghost: { rim: 0x8ae8ff, grain: 0.15, scale: 3, rimStrength: 0.8 },
  crab: { rim: 0xff8a5a, grain: 0.7, scale: 6 },
  bat: { rim: 0xb070ff, grain: 0.6, scale: 10 },
  yeti: { rim: 0x8ad0ff, grain: 0.9, scale: 12 },
  shroom: { rim: 0x9aff6a, grain: 0.5, scale: 5 },
  spider: { rim: 0xc070ff, grain: 0.5, scale: 9 },
  imp: { rim: 0xff7a2a, grain: 0.6, scale: 7 },
  golem: { rim: 0xff6a1a, grain: 1.0, scale: 3, cavity: 0.28 },
  dragon: { rim: 0xff9a3a, grain: 0.9, scale: 9 },
  treant: { rim: 0xffb3e0, grain: 1.0, scale: 4, cavity: 0.28 },
  sunserpent: { rim: 0xffd060, grain: 0.7, scale: 8 },
  pumpkinking: { rim: 0xff7a1a, grain: 0.8, scale: 4, cavity: 0.28, rimStrength: 0.6 },
  icetitan: { rim: 0x9ae8ff, grain: 0.3, scale: 3 },
};

function makeHpBar(width) {
  const group = new THREE.Group();
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x220000, depthTest: false }));
  const fg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff4040, depthTest: false }));
  bg.scale.set(width, 0.16, 1);
  fg.scale.set(width, 0.12, 1);
  bg.renderOrder = 11; fg.renderOrder = 12;
  group.add(bg, fg);
  return { group, set(f) { f = Math.max(0, Math.min(1, f)); fg.scale.x = width * f; fg.center.x = f > 0 ? 0.5 / f : 0.5; } }; // the red stays left-aligned on screen whichever way the body faces
}

const smooth = (dt, rate) => 1 - Math.exp(-dt * rate);

/** Recolour a body (eyes and other near-black / near-white bits keep their colours). */
function tintBody(group, tint) {
  const c = new THREE.Color(tint);
  group.traverse((o) => {
    if (!o.isMesh || !o.material.color) return;
    const hsl = {};
    o.material.color.getHSL(hsl, THREE.SRGBColorSpace); // judge dark/light as it looks, not in linear (where dark rock read as black)
    if (hsl.l < 0.1 || hsl.l > 0.93) return;
    o.material = o.material.clone();
    o.material.color.lerp(c, 0.7);
    if (o.material.emissive && o.material.emissive.getHex()) o.material.emissive.lerp(c, 0.5);
  });
}

/** Bosses wear a crown. */
function addCrown(group, height) {
  const gold = mat(0xffd23f, { metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide });
  const crown = new THREE.Group();
  add(crown, new THREE.CylinderGeometry(0.28, 0.25, 0.18, 10, 1, true), gold);
  for (let i = 0; i < 5; i++) add(crown, new THREE.ConeGeometry(0.06, 0.18, 4), gold, Math.cos((i / 5) * Math.PI * 2) * 0.27, 0.17, Math.sin((i / 5) * Math.PI * 2) * 0.27);
  crown.position.y = height * 0.92;
  group.add(crown);
}

/**
 * An enemy's model (also the mini-boss pets, client/pets.js): its body, details, tint, crown and
 * finish. Returns { group, parts, height, kind, meshes } — `meshes` have their own materials.
 */
export function buildMobModel(variant, boss = false) {
  const def = ENEMIES[variant] ?? {};
  const kind = def.body ?? 'goblin'; // no body of its own = one of the old slimes: a goblin now
  const built = BODIES[kind](!!def.fire, variant);
  DETAILS[kind]?.(built);
  if (def.tint != null) tintBody(built.group, def.tint);
  if (def.crown || (kind === 'goblin' && boss)) addCrown(built.group, built.height);
  const meshes = [], look = LOOKS[kind] ?? { rim: 0xff6a4a, grain: 0.5 };
  built.group.traverse((o) => {
    if (!o.isMesh || !o.material.isMeshStandardMaterial) return;
    o.material = o.material.clone();
    o.userData.baseEmissive = o.material.emissive.getHex();
    if (!o.userData.baseEmissive || kind === 'ghost') creatureLook(o.material, look); // glowing bits (eyes, fire) stay as they are
    meshes.push(o);
  });
  return { ...built, kind, meshes };
}

/** How each kind of body moves: `b` is the body group (its y already at its resting height), `P` its parts. */
export function animateMob(kind, P, b, t, moving, anim) {
  switch (kind) {
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
      const crouch = anim === 'crouch', leap = anim === 'leap';
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
    case 'goblin': // a scurrying, hunched run; a twitchy, menacing sway when it stops
      b.position.y += moving ? Math.abs(Math.sin(t * 10)) * 0.08 : 0;
      b.rotation.x = moving ? 0.12 : 0;
      for (const [i, a] of P.arms.entries()) a.rotation.x = moving ? Math.sin(t * 10 + i * Math.PI) * 0.8 : -0.3 + Math.sin(t * 2 + i) * 0.12;
      for (const [i, l] of P.legs.entries()) l.rotation.x = moving ? Math.sin(t * 10 + i * Math.PI + Math.PI) * 0.7 : 0;
      P.head.rotation.y = moving ? 0 : Math.sin(t * 1.3) * 0.4;
      break;
    case 'skeleton':
      b.position.y += moving ? Math.abs(Math.sin(t * 8)) * 0.06 : 0;
      for (const [i, a] of P.arms.entries()) a.rotation.x = moving ? Math.sin(t * 8 + i * Math.PI) * 0.7 : -0.2 + Math.sin(t * 2) * 0.05;
      for (const [i, l] of P.legs.entries()) l.rotation.x = moving ? Math.sin(t * 8 + i * Math.PI + Math.PI) * 0.6 : 0;
      P.head.rotation.z = Math.sin(t * 3) * 0.06; // rattle
      break;
    case 'ghost':
      b.position.y += Math.sin(t * 2) * 0.25 - 0.6;
      for (const [i, tl] of P.tails.entries()) tl.position.y = -0.45 + Math.sin(t * 6 + i) * 0.06;
      for (const [i, a] of P.arms.entries()) a.rotation.z = (i ? -1 : 1) * Math.sin(t * 3) * 0.3;
      break;
    case 'crab':
      b.rotation.z = moving ? Math.sin(t * 14) * 0.05 : 0;
      for (const [i, c] of P.claws.entries()) c.rotation.x = Math.sin(t * (moving ? 10 : 3) + i * 1.5) * 0.25;
      for (const [i, l] of P.legs.entries()) l.rotation.x = moving ? Math.sin(t * 18 + i) * 0.4 : 0;
      break;
    case 'treant':
      b.position.y += moving ? Math.abs(Math.sin(t * 4)) * 0.1 : 0;
      b.rotation.z = Math.sin(t * (moving ? 4 : 1.2)) * 0.05;
      for (const [i, a] of P.arms.entries()) a.rotation.z = (i ? -1 : 1) * (Math.sin(t * (moving ? 4 : 1.5) + i) * 0.25);
      P.crown.rotation.y = Math.sin(t * 0.8) * 0.1;
      break;
    case 'sunserpent':
      P.segs.forEach((s, i) => { const a = t * 2 - i * 0.6; s.position.set(Math.sin(a) * 0.35 * (1 - i / 12), 0.35 + i * 0.2, -i * 0.12 + Math.cos(a) * 0.15); });
      P.head.position.y = 2.0 + Math.sin(t * 2) * 0.12;
      P.halo.rotation.z = t * 0.8;
      break;
    case 'pumpkinking': // lurching steps, swaying head, roaring fire, writhing vines, circling crows
      b.position.y += moving ? Math.abs(Math.sin(t * 4)) * 0.14 : Math.sin(t * 1.3) * 0.05;
      for (const [i, a] of P.arms.entries()) a.rotation.x = moving ? Math.sin(t * 4 + i * Math.PI) * 0.45 : -0.15 + Math.sin(t * 1.6 + i) * 0.12;
      for (const [i, l] of P.legs.entries()) l.rotation.x = moving ? Math.sin(t * 4 + i * Math.PI + Math.PI) * 0.4 : 0;
      P.head.rotation.z = Math.sin(t * 1.7) * 0.08;
      P.head.rotation.y = Math.sin(t * 0.6) * 0.25;
      P.flames.forEach((f, i) => { f.scale.set(1, 0.75 + Math.abs(Math.sin(t * 8 + i * 1.3)) * 0.7, 1); });
      P.tentacles.forEach((chain, k) => chain.forEach((seg, i) => { seg.rotation.x = Math.sin(t * 2 + k + i * 0.6) * 0.35; seg.rotation.z = Math.cos(t * 1.6 + k * 2 + i * 0.5) * 0.3; }));
      P.embers.rotation.y = t * 0.6;
      P.embers.children.forEach((e, i) => { e.position.y = 0.8 + ((t * 0.5 + i * 0.37) % 3.5); });
      P.crows.rotation.y = t * 0.9;
      break;
    case 'icetitan':
      b.position.y += moving ? Math.abs(Math.sin(t * 4)) * 0.12 : 0;
      for (const [i, a] of P.arms.entries()) a.rotation.x = moving ? Math.sin(t * 4 + i * Math.PI) * 0.55 : Math.sin(t * 1.2 + i) * 0.1;
      P.crown.rotation.y = t * 0.3;
      break;
    case 'dragon':
      b.position.y += Math.sin(t * 1.5) * 0.1;
      for (const [i, w] of P.wings.entries()) w.rotation.z = (i ? -1 : 1) * (0.2 + Math.sin(t * 3) * 0.35);
      P.head.rotation.x = Math.sin(t * 1.2) * 0.15;
      break;
  }
}

export class MobView {
  constructor(e, makeLabel) {
    const def = ENEMIES[e.variant] ?? {};
    const built = buildMobModel(e.variant, e.boss);
    this.kind = built.kind;
    this.fly = !!def.fly;
    this.root = new THREE.Group();
    this.body = built.group;
    this.parts = built.parts;
    const s = e.scale ?? 1;
    this.body.scale.setScalar(s);
    this.baseY = this.fly ? 1.4 : 0;
    this.root.add(this.body);
    this.meshes = built.meshes; // own materials, so the hit flash only lights up this one
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
    animateMob(this.kind, P, b, t, moving, this.anim);
    this.flash = Math.max(0, this.flash - dt);
    if ((this.flash > 0) !== this.flashing) {
      this.flashing = this.flash > 0;
      for (const o of this.meshes) o.material.emissive.setHex(this.flashing ? 0xffffff : o.userData.baseEmissive);
    }
  }

  dispose() { this.root.removeFromParent(); }
}

/** Every enemy has a body now: the old slimes are goblins. */
export function hasMobBody(variant) {
  return !!ENEMIES[variant];
}
