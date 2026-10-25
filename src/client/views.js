// 3D views for things that move or change: characters, slimes, rocks, drops...
import * as THREE from 'three';
import { FLY_HEIGHT, JUMP_TIME, JUMP_HEIGHT, CLASSES, HATS, CAPES, BACKS, DYES, HAIR_COLORS, SKINS, CLOTHES, TIE_COLORS } from '../shared/config.js';
import { ITEMS, SWING_COOLDOWN, SWING_IMPACT } from '../shared/items.js';
import { ROLL_TIME } from '../shared/config.js';
import { cloneCharacter, cloneModel, characterClips, characterScene } from './assets.js';
import { buildTailored, bindBones, handOnly } from './tailor.js';
import { browsOf, browlessHead, buildCostumeHat, COSTUMES, HALLOWEEN_COSTUMES, buildWinterWear, buildHat, buildHelmet, buildBack, buildHair, buildFace, buildScalp, craniumOf, cuteNose, faceSpotsOf, fitHair, buildClothes, buildArmor, hairlessHead, scalpOf, skinColour, skinSplit, smoothSkin, sweptCape, buildBrows } from './cosmetics.js';
import { PetEntityView } from './pets.js';
import { MobView, hasMobBody } from './enemies.js';
import { ENEMIES } from '../shared/dungeons.js';
import { FurnitureView, BEDSIDE_TABLE } from './furniture.js';
import { dropTinyShadows } from './merge.js';
import { enchantWeapon } from './enchant.js';
import { spellbookFx } from './spellbook.js';
import { glowTexture } from './effects.js';
import { SOLSTICE_ARENA } from '../shared/seasons.js';
import { makeChristmasCorner, makeEasterCorner, makeSolsticeArena } from './town.js';

// sitting on a chair: how far the body drops and leans back, and how the legs and arms bend (radians)
const SIT_DROP = 0.12, SIT_BACK = -0.1, SIT_HIP = -1.5, SIT_KNEE = 1.5, SIT_ARM = 0.5;
// lying in bed: the body (feet first) sits this far towards the foot of the bed so the head lands on the pillow
const SLEEP_FORWARD = 0.5;
/** The dodge roll spins round this height (the middle of the curled-up body, ~2.55 tall), hopping this high. */
const ROLL_PIVOT = 1.25, ROLL_HOP = 0.2;
export { BEDSIDE_TABLE }; // (from furniture.js: where the hat goes at bedtime)
const SKIRT_GAP = 0.15, SKIRT_MAX_FLARE = 1.7; // skirts: room left round a leg (in body widths), and how far they may flare

// how a crossbow sits in the hand slot (which holds things pointing out to the side): its +z ahead, its top up
const CROSSBOW_GRIP = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0)));
const BOOK_OUT = 0.16; // a spellbook, held this far out from the hand (away from the body)
const AIM_E = new THREE.Euler(), AIM_P3 = new THREE.Quaternion();
const AIM_A = new THREE.Vector3(), AIM_B = new THREE.Vector3(), AIM_C = new THREE.Vector3(), AIM_M = new THREE.Matrix4();
const AIM_Q = new THREE.Quaternion(), AIM_P = new THREE.Quaternion(), AIM_P2 = new THREE.Quaternion();
const SWING_CLEAR = 0.85; // how far (radians) a melee swing's arm leans out from the shoulder, away from the head and body
const SC_M = new THREE.Matrix4(), SC_A = new THREE.Vector3(), SC_B = new THREE.Vector3(), SC_X = new THREE.Vector3();

const HAIR_HEAD_R = 0.56, HAIR_HEAD_DROP = 0.5; // the head ball hairstyles are built round (cosmetics.js HEAD_R, -HEAD_Y)

/**
 * The ball round the top of a skull geometry: centred over the middle of the dome, big enough that
 * every point of the skull above its centre is inside it (hair built round it then covers it all).
 */
function skullDome(geo) {
  const pos = geo.attributes.position, idx = geo.index, v = new THREE.Vector3(), pts = [];
  for (let i = 0; i < idx.count; i++) pts.push(v.fromBufferAttribute(pos, idx.getX(i)).toArray());
  const top = Math.max(...pts.map((p) => p[1]));
  const dome = pts.filter((p) => p[1] > top - 0.35);
  const cx = (Math.min(...dome.map((p) => p[0])) + Math.max(...dome.map((p) => p[0]))) / 2;
  const cz = (Math.min(...dome.map((p) => p[2])) + Math.max(...dome.map((p) => p[2]))) / 2;
  let r = (Math.max(...dome.map((p) => p[0])) - cx); // start: half the dome's width, then grow to hold it all
  for (let k = 0; k < 4; k++) {
    const cy = top - r;
    r = Math.max(...pts.filter((p) => p[1] >= cy).map((p) => Math.hypot(p[0] - cx, p[1] - cy, p[2] - cz)));
  }
  return { centre: new THREE.Vector3(cx, top - r, cz), r };
}

// hats that cover the top of the head: hair tucks in under them (the rest sit on top of it)
const COVERING_HATS = new Set(['helmet', 'bear', 'wizard', 'tophat', 'viking', 'cowboy', 'pirate', 'bandana', 'captain', 'mushroom', 'chef', 'straw', 'fedora', 'boater', 'sunhat', 'pith', 'pumpkinhat', 'santahat']);

const ANIMS = {
  idle: 'Idle_A',
  run: 'Running_A',
  walk: 'Walking_A',
  slash: 'Attack_Slash',
  chop: 'Attack_Chop',
  stab: 'Attack_Stab',
  cast: 'Attack_Cast',
  hurt: 'Hit_A',
  dead: 'Death_A',
  cheer: 'Interact',
  tuck: 'Jump_Idle',
};

/** Recolour a copied model (forged weapons): its own materials, tinted over the texture. */
export function tintModel(obj, color) {
  if (color == null) return obj;
  obj.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    o.material.color.set(color);
  });
  return obj;
}

export function makeGlow(color) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 3.2),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  return m;
}

const smooth = (dt, rate = 12) => 1 - Math.exp(-dt * rate);

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** Floating name tag (canvas sprite). */
export function makeLabel(text, color = '#fff') {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  let size = 30; // long names (bosses) shrink to fit
  do ctx.font = `bold ${size}px system-ui, sans-serif`; while (ctx.measureText(text).width > 240 && (size -= 2) > 14);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeText(text, 128, 32);
  ctx.fillStyle = color;
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set(3, 0.75, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/** Little billboard health bar. */
function makeHpBar(width = 1.4) {
  const group = new THREE.Group();
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x220000, depthTest: false }));
  const fg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff4040, depthTest: false }));
  bg.scale.set(width, 0.16, 1);
  fg.scale.set(width, 0.12, 1);
  bg.renderOrder = 11; fg.renderOrder = 12;
  group.add(bg, fg);
  return {
    group,
    set(frac) {
      frac = Math.max(0, Math.min(1, frac));
      fg.scale.x = width * frac;
      fg.center.x = frac > 0 ? 0.5 / frac : 0.5; // left-aligned on screen (a sprite's offset would swing with the body's turn)
    },
  };
}

// ------------------------------------------------------------------ characters

const HAT_PART = /_(Helmet|HelmetVisor|BearHat|Hat|Mask)$/;
const FACE_EYE_HEIGHT = 0.38;
const LOW_HP = 0.3;              // flash red at or below this share of max health // eyes, as a fraction of the head's height from the bottom
const CAPE_PART = /_Cape$/;

/**
 * What the season dresses everyone in (set by LocationView each frame): null, 'winter' (in town
 * in winter: a bobble hat, a scarf and a warm coat over whatever you wear) or 'halloween' (a
 * costume each: witch, pumpkin head, ghost or little devil). Just a look: your own outfit stays
 * saved, and a CharacterView with `noSeasonWear` (trying clothes on) is left alone. `forceWear`
 * dresses one character whatever the season ('santa').
 */
export const SEASON_WEAR = { value: null };
const WINTER_HATS = ['bobble', 'trapper', 'earmuffs'];
const COATS = [0xb8333a, 0x2f4f8a, 0x2f7a4a, 0x7a3f8a, 0xc9862e, 0x3f8a8a];

/**
 * A cape that moves: its lower part ripples in a breeze, and `uPush` (0..1) lifts it out behind,
 * `uSide` swings it away from the weapon hand. Done in the vertex shader, in the cape's bind space
 * (before skinning, so it still follows the body). Returns the uniforms to drive each frame.
 */
function windCape(material) {
  const u = { uTime: { value: 0 }, uPush: { value: 0 }, uSide: { value: 0 } };
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'uniform float uTime;\nuniform float uPush;\nuniform float uSide;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float capeK = clamp((1.15 - position.y) / 1.05, 0.0, 1.0); // 0 at the shoulders, 1 at the hem
      float flap = sin(uTime * 3.1 + position.y * 5.0 + position.x * 2.0) * 0.05 + sin(uTime * 1.7 + position.x * 3.0) * 0.035;
      transformed.z -= capeK * capeK * (0.05 + uPush * 0.28) + capeK * flap * (1.0 + uPush * 0.5);
      transformed.y += capeK * capeK * uPush * 0.16;
      transformed.x -= capeK * capeK * uSide * 0.3 + capeK * sin(uTime * 2.3 + position.y * 3.0) * 0.025;`);
  };
  material.customProgramCacheKey = () => 'cape-wind';
  return u;
}

export class CharacterView {
  /** How high someone on a jetpack flies at (x, z): GameClient points this at the current place's stalls. */
  static flyHeight = () => FLY_HEIGHT;

  constructor({ cls, look, name, weapon, ench = 0, shield = null, armor = null, helmet = null, isLocal = false }) {
    this.root = new THREE.Group();
    this.cls = cls;
    this.model = cloneCharacter((CLASSES[cls] ?? CLASSES.Knight).model);
    // our own copies of the (shared) materials, so flashing red when hurt only colours us
    this.model.traverse((o) => { if (o.isMesh) o.material = o.material.clone(); });
    this.root.add(this.model);
    this.time = 0;
    this.borrowed = [];   // meshes/accessories added by the current look
    this.anchors = this.computeAnchors();
    this.root.userData.noSnow = true; // characters don't get the town's snowy tops (seasonfx.js)
    const hash = [...String(name ?? '')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
    this.coatColor = COATS[hash % COATS.length];
    this.winterHat = WINTER_HATS[(hash >>> 3) % WINTER_HATS.length]; // the same one every winter
    this.costume = HALLOWEEN_COSTUMES[(Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 16) % HALLOWEEN_COSTUMES.length]; // the same costume every Halloween
    this.helmetId = ITEMS[helmet]?.kind === 'helmet' ? helmet : null; // (worn instead of the hat: setLook)
    this.setLook(look);
    this.mixer = new THREE.AnimationMixer(this.model);
    const clips = characterClips();
    this.actions = {};
    for (const [key, clipName] of Object.entries(ANIMS)) {
      if (!clips[clipName]) continue;
      const action = this.mixer.clipAction(clips[clipName]);
      if (!['idle', 'run', 'walk'].includes(key)) action.setLoop(THREE.LoopOnce);
      if (key === 'dead') action.clampWhenFinished = true;
      if (SWING_COOLDOWN[key]) action.timeScale = clips[clipName].duration / (SWING_COOLDOWN[key] * 1.35);
      this.actions[key] = action;
    }
    this.base = null;
    this.oneShot = null;
    this.mixer.addEventListener('finished', (e) => {
      if (e.action === this.oneShot) { this.oneShot = null; this.fadeTo(this.base, 0.15); }
    });
    this.setBase('idle');

    // GLTFLoader strips '.' from node names: 'handslot.r' -> 'handslotr'
    this.hand = this.model.getObjectByName('handslotr') ?? this.model.getObjectByName('handslot.r');
    this.weaponObj = null;
    this.setWeapon(weapon, ench);
    this.offHand = this.model.getObjectByName('handslotl') ?? this.model.getObjectByName('handslot.l');
    this.setShield(shield);
    this.setArmor(armor);

    if (name) {
      this.label = makeLabel(name, isLocal ? '#ffe680' : '#ffffff');
      this.label.position.y = 3.1;
      this.root.add(this.label);
    }
    this.target = null; // for remote interpolation
  }

  /** The weapon in hand; `ench` = its enchant level (glow, size, sparkles, flames: client/enchant.js). */
  setWeapon(id, ench = 0) {
    ench = ench | 0;
    if (this.weaponId === id && this.weaponEnch === ench) return;
    this.weaponId = id;
    this.weaponEnch = ench;
    this.weaponObj?.removeFromParent();
    this.weaponObj = null;
    this.weaponFx = null;
    this.bookFx?.dispose();
    this.bookFx = null;
    const model = ITEMS[id]?.model;
    if (model && this.hand) {
      this.weaponObj = tintModel(cloneModel(model), ITEMS[id].tint);
      if (ench > 0) this.weaponFx = enchantWeapon(this.weaponObj, ench);
      this.hand.add(this.weaponObj);
      // the hand slot holds things pointing out to the side: a crossbow turns to point ahead (its +z, the
      // bolt end, forwards; its top up), and a book is held a little out from the body, not in it
      if (/crossbow/.test(model)) this.weaponObj.quaternion.copy(CROSSBOW_GRIP);
      if (model === 'items/spellbook_open') this.weaponObj.position.z = BOOK_OUT;
      if (model === 'items/spellbook_open') this.bookFx = spellbookFx(this.weaponObj, this.root, ITEMS[id].tint); // runes and pages
      this.flashMats = null; // new materials: collect them again for the low-health flash
    }
  }

  /** A helmet (ITEMS kind 'helmet'): worn on the head instead of your hat; null takes it off. */
  setHelmet(id) {
    id = ITEMS[id]?.kind === 'helmet' ? id : null;
    if (id === this.helmetId) return;
    this.helmetId = id;
    this.lookKey = null;
    this.setLook(this.look);
  }

  /** Armor: shoulder pads and a chest plate in the armor's colour (built in cosmetics.js). */
  setArmor(id) {
    if (this.armorId === id) return;
    this.armorId = id;
    for (const h of this.armorParts ?? []) h.removeFromParent();
    this.armorParts = [];
    const def = ITEMS[id];
    if (!def?.color) return;
    const parts = buildArmor(def.color, def.tier ?? (def.epic ? 4 : 0));
    const before = this.borrowed.length;
    this.attach('front', parts.chest);
    this.attach('shoulderl', parts.left);
    this.attach('shoulderr', parts.right);
    this.armorParts = this.borrowed.splice(before); // not part of the look: survives setLook
    this.showArmor();
    this.flashMats = null;
    dropTinyShadows(this.root);
  }

  /** Fancy clothes go over the armor: it still protects you, you just don't see it poking through. */
  showArmor() {
    for (const h of this.armorParts ?? []) h.visible = !this.clothed;
  }

  setShield(id) {
    if (this.shieldId === id) return;
    this.shieldId = id;
    this.shieldObj?.removeFromParent();
    this.shieldObj = null;
    const model = ITEMS[id]?.model;
    if (model && this.offHand) {
      this.shieldObj = tintModel(cloneModel(model), ITEMS[id].tint);
      this.offHand.add(this.shieldObj);
    }
  }

  /** A slot on a bone: `pos`/`size` in world units, remembered as the bone-local transform. */
  anchorAt(boneName, pos, size) {
    const bone = this.model.getObjectByName(boneName);
    if (!bone) return null;
    const scale = size.isVector3 ? size : new THREE.Vector3(size, size, size);
    const local = bone.matrixWorld.clone().invert()
      .multiply(new THREE.Matrix4().compose(pos, new THREE.Quaternion(), scale));
    return { bone, local };
  }

  /**
   * Where hand-made hats and back items go, measured once in the rest pose:
   * a bone to follow plus the bone-local transform of "top of the head" / "middle of the back".
   */
  computeAnchors() {
    this.model.updateMatrixWorld(true);
    const find = (re) => { let m = null; this.model.traverse((o) => { if (!m && o.isMesh && re.test(o.name)) m = o; }); return m; };
    const head = find(/_Head$/), body = find(/_Body$/);
    const anchor = (boneName, pos, size, turn = new THREE.Quaternion()) => {
      const bone = this.model.getObjectByName(boneName);
      if (!bone) return null;
      const scale = size.isVector3 ? size : new THREE.Vector3(size, size, size);
      const local = bone.matrixWorld.clone().invert()
        .multiply(new THREE.Matrix4().compose(pos, turn, scale));
      return { bone, local };
    };
    const out = {};
    if (head) {
      if (head.material.map?.image) cuteNose(head.geometry, head.material.map.image); // first: everything below measures the face
      const b = new THREE.Box3().setFromObject(head);
      out.hat = anchor('head', new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y - 0.05, (b.min.z + b.max.z) / 2), b.max.x - b.min.x);
      // the face: front of the head, a bit below the middle (where the eyes are on these chibi heads)
      out.face = anchor('head', new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y + (b.max.y - b.min.y) * FACE_EYE_HEIGHT, b.max.z - 0.02), b.max.x - b.min.x);
      // better: right on the outfit's own eyes (glasses over them, blush on the cheeks; cosmetics.js faceSpotsOf)
      const spots = head.material.map?.image ? faceSpotsOf(head.geometry, head.material.map.image) : null;
      if (spots) {
        const W = b.max.x - b.min.x;
        out.face = anchor('head', new THREE.Vector3(0, spots.eyes.y, spots.eyes.z).applyMatrix4(head.matrixWorld), W, head.getWorldQuaternion(new THREE.Quaternion()));
        const c = spots.cheeks;
        this.faceCheek = c && { x: c.x / W, y: (c.y - spots.eyes.y) / W, z: (c.z - spots.eyes.z) / W, yaw: c.yaw };
        this.faceEyeLine = spots.eyeLine.map((e) => ({ y: e.y / W, z: e.z / W }));
      }
      // the eyebrows: each exactly where the outfit's own was, lying along the face the same way and
      // as long (cosmetics.js browsOf) — one shared spot for the pair floated off the sides of rounder faces
      const ownBrows = head.material.map?.image ? browsOf(head.geometry, head.material.map.image) : null;
      const W = b.max.x - b.min.x, headTurn = head.getWorldQuaternion(new THREE.Quaternion());
      ownBrows?.each.forEach((brow, i) => {
        const turn = headTurn.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, brow.yaw, brow.roll, 'YZX')));
        const stretch = THREE.MathUtils.clamp(brow.len / (0.19 * W), 0.8, 1.5); // a buildBrows brow is ~0.19 heads long
        out[`brow${i}`] = anchor('head', brow.pos.clone().applyMatrix4(head.matrixWorld), new THREE.Vector3(W * stretch, W, W), turn);
      });
      // the skull under a new hairstyle (the head mesh is hollow where its own hair was)
      const size = b.getSize(new THREE.Vector3());
      const centre = b.getCenter(new THREE.Vector3()).add(new THREE.Vector3(0, size.y * 0.06, -size.z * 0.02));
      out.scalp = anchor('head', centre, new THREE.Vector3(size.x * 0.93, size.y * 0.86, size.z * 0.9));
      // under a new hairstyle: the skull ball and the hair both sit on the skin left after carving the
      // old hair away (cosmetics.js). Measured here, in the rest pose — measuring later, mid-animation,
      // put them wherever the head happened to be bobbing (floating hair, a scalp poking through)
      const img = head.material.map?.image, s = img ? scalpOf(head.geometry, img, head.name.replace(/_Head$/, '')) : null;
      if (s) {
        // the scalp: the Barbarian's bald head top, laid exactly over this head (same head underneath)
        const barb = this.barbarianHead();
        out.scalp = barb && anchor('head', head.getWorldPosition(new THREE.Vector3()), head.getWorldScale(new THREE.Vector3()), head.getWorldQuaternion(new THREE.Quaternion()));
        this.cranium = barb && craniumOf(barb.geometry, barb.material.map.image);
        this.scalpOwn = !!s.own; // already bald (the Barbarian): nothing to add
        this.scalpColor = s.color;
        // new hair sits on that skull: its top just over the skull's top (it's taller than the old ball was,
        // so hair placed for the ball let the bald top show through)
        let hairX = s.hair.x, hairY = s.hair.y, hairZ = s.hair.z, hairSize = s.hair.size;
        if (this.cranium) {
          // fit the hair to that skull: a hairstyle is built round a ball of radius HAIR_HEAD_R, HAIR_HEAD_DROP
          // below its anchor (cosmetics.js HEAD_R / HEAD_Y), so put that ball just outside the skull's dome
          const { centre, r } = this.dome = skullDome(this.cranium);
          hairSize = (r * 1.06) / HAIR_HEAD_R; // (a little over: the skull is low-poly, its corners poke out)
          const at = centre.clone().add(new THREE.Vector3(0, HAIR_HEAD_DROP * hairSize, 0)).applyMatrix4(head.matrixWorld);
          hairX = at.x; hairY = at.y; hairZ = at.z;
        }
        out.hair = anchor('head', new THREE.Vector3(hairX, hairY, hairZ), hairSize);
      }
      this.headMesh = head;
    }
    if (body) {
      const b = new THREE.Box3().setFromObject(body);
      out.back = anchor('chest', new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y + (b.max.y - b.min.y) * 0.62, b.min.z + 0.05), b.max.x - b.min.x);
      out.front = anchor('chest', new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y + (b.max.y - b.min.y) * 0.55, b.max.z - 0.02), b.max.x - b.min.x);
      for (const side of ['l', 'r']) { // shoulder pads sit on top of the upper arms
        const arm = this.model.getObjectByName(`upperarm${side}`) ?? this.model.getObjectByName(`upperarm.${side}`);
        if (arm) out[`shoulder${side}`] = anchor(arm.name, arm.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0)), (b.max.x - b.min.x) * 0.5);
      }
      out.hips = anchor('hips', new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y + 0.08, (b.min.z + b.max.z) / 2), b.max.x - b.min.x);
    }
    return out;
  }

  /** The Barbarian's head mesh (bald: its top is everyone's scalp under a new hairstyle). */
  barbarianHead() {
    let m = null;
    characterScene('Barbarian').traverse((o) => { if (!m && o.isMesh && /_Head$/.test(o.name) && o.material.map?.image) m = o; });
    if (m) cuteNose(m.geometry, m.material.map.image); // (the scalp is cut from it)
    return m;
  }

  /** Put `obj` on an anchor (hat, hair, face...). `headwear`: it's worn on the head (a hat, a helmet), so it comes off at bedtime. */
  attach(slot, obj, headwear = false) {
    const a = this.anchors[slot];
    if (!a || !obj) return;
    const holder = new THREE.Group();
    a.local.decompose(holder.position, holder.quaternion, holder.scale);
    holder.add(obj);
    holder.userData.slot = slot;
    holder.userData.headwear = headwear;
    if (headwear && (this.inBed || this.hatOff)) holder.visible = false;
    a.bone.add(holder);
    this.borrowed.push(holder);
  }

  /**
   * Hats come off in bed (they went through the headboard and pillow) and sit on the bedside table,
   * and go back on when you get up. `hatOff`: taken off for the bedtime film (GameClient).
   */
  showHats() {
    const off = this.inBed || this.hatOff;
    this.model.traverse((o) => { if (o.isMesh && HAT_PART.test(o.name) && !/_Mask$/.test(o.name)) o.visible = (o.userData.hatShown ?? true) && !off; });
    for (const h of this.borrowed) if (h.userData.headwear) h.visible = !off;
  }

  /** The meshes of whatever is worn on the head right now: the outfit's own hat, a picked hat, a helmet, a winter hat. */
  headwearParts() {
    const out = [];
    this.model.traverse((o) => { if (o.isMesh && HAT_PART.test(o.name) && !/_Mask$/.test(o.name) && o.userData.hatShown) out.push(o); });
    for (const h of this.borrowed) if (h.userData.headwear) h.traverse((o) => { if (o.isMesh) out.push(o); });
    return out;
  }

  /**
   * A still copy of the headwear, as it sits on our head standing up straight, for putting down
   * somewhere (the bedside table). `group` has its origin under the middle of the hat; `from` is where
   * that point was on us (root space). Null if nothing is on our head.
   */
  headwearCopy() {
    const parts = this.headwearParts();
    if (!parts.length) return null;
    const rotX = this.model.rotation.x, at = this.model.position.clone();
    this.model.rotation.x = 0; // (lying in bed: stand up for a moment, so the copy is upright)
    this.model.position.set(0, 0, 0);
    this.root.updateMatrixWorld(true);
    const toRoot = this.root.matrixWorld.clone().invert(), v = new THREE.Vector3(), box = new THREE.Box3();
    const group = new THREE.Group();
    for (const o of parts) {
      const geo = o.geometry.clone(), pos = geo.attributes.position;
      const m = new THREE.Matrix4().multiplyMatrices(toRoot, o.matrixWorld);
      for (let i = 0; i < pos.count; i++) {
        if (o.isSkinnedMesh) o.getVertexPosition(i, v); else v.fromBufferAttribute(pos, i); // (skinned: posed by the bones)
        pos.setXYZ(i, ...v.applyMatrix4(m).toArray());
      }
      for (const name of ['skinIndex', 'skinWeight']) if (geo.attributes[name]) geo.deleteAttribute(name);
      geo.computeVertexNormals();
      geo.computeBoundingBox();
      box.union(geo.boundingBox);
      const mesh = new THREE.Mesh(geo, o.material);
      mesh.castShadow = true;
      group.add(mesh);
    }
    this.model.rotation.x = rotX;
    this.model.position.copy(at);
    this.root.updateMatrixWorld(true);
    const from = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
    for (const mesh of group.children) mesh.geometry.translate(-from.x, -from.y, -from.z);
    return { group, from };
  }

  /** In bed, the headwear rests on the bedside table (the bed and we share a spot and a direction). */
  putHatOnTable(asleep) {
    if (this.tableHat) {
      this.tableHat.removeFromParent();
      for (const m of this.tableHat.children) m.geometry.dispose();
      this.tableHat = null;
    }
    if (!asleep) return;
    const copy = this.headwearCopy();
    if (!copy) return;
    this.tableHat = copy.group;
    this.tableHat.position.copy(BEDSIDE_TABLE).divide(this.root.scale);
    this.tableHat.rotation.y = 0.5; // (set down a little askew)
    this.root.add(this.tableHat);
  }

  /** Show/hide the outfit's own hat & cape, borrow other characters' pieces, add accessories, clothes and dye. */
  setLook(look) {
    this.look = look;
    const wear = this.wear = this.seasonWear();
    const fancy = look?.clothes && look.clothes !== 'none';
    const costume = wear === 'halloween' ? this.costume : wear === 'santa' || wear === 'grandma' ? wear : null;
    const C = COSTUMES[costume], masked = !!C?.mask; // (a mask covers the whole head: no hair, brows or face under it)
    if (wear === 'winter' || costume) look = { ...look, hat: 'none' }; // the bobble hat (or costume) goes on instead
    const helm = !costume && ITEMS[this.helmetId]?.kind === 'helmet' ? ITEMS[this.helmetId] : null; // a helmet goes on instead of any hat
    if (helm) look = { ...look, hat: 'none' };
    const { hat: picked = 'own', cape = 'own', back = 'none', dye = 'none', clothes = 'none', hair = 'none', bangs = 'none', hairColor = 'brown', face = 'none', skin = 'none', tie = 'red', brows = 'soft' } = look ?? {};
    // fancy clothes come with their own matching hat (a chef's hat with the chef whites...), worn instead of the outfit's
    const matching = picked === 'own' && !costume ? CLOTHES[clothes]?.hat ?? null : null;
    const hat = matching ?? picked;
    // a hat that covers the head, over the outfit's own (big, sculpted) hair: that hair poked out through it,
    // so it goes, and a neat tucked-in style in your hair colour shows under the brim instead
    const covered = COVERING_HATS.has(hat) || !!helm || (wear === 'winter' && this.winterHat !== 'earmuffs') || (!!costume && costume !== 'grandma'); // (Grandma's flower crown sits on her curls)
    const hairStyle = masked ? 'none' : hair === 'none' && covered && this.anchors.scalp ? 'bob' : hair;
    const key = `${hat}/${cape}/${back}/${dye}/${clothes}/${hair}/${bangs}/${hairColor}/${face}/${skin}/${tie}/${brows}/${wear}/${this.helmetId}`;
    if (key === this.lookKey) return;
    this.lookKey = key;
    for (const m of this.borrowed) m.removeFromParent();
    this.borrowed = [];
    this.skirt = null;
    this.model.traverse((o) => {
      if (!o.isMesh) return;
      // the outfit's own hat — but picking a hairstyle takes it off, so the style shows (a hat you pick
      // yourself still goes on over it, tucking it in). The hooded Rogue's mask isn't a hat: it stays.
      if (HAT_PART.test(o.name)) {
        o.userData.hatShown = (hat === 'own' || (!!matching && /_Mask$/.test(o.name))) && (hair === 'none' || /_Mask$/.test(o.name));
        o.visible = o.userData.hatShown && (!this.inBed || /_Mask$/.test(o.name)); // (off in bed: showHats)
      }
      else if (CAPE_PART.test(o.name)) {
        o.visible = cape === 'own' && back === 'none' && !costume; // (something on your back replaces the cape; a costume takes both off)
        o.userData.unsweptGeo ??= o.geometry;
        o.geometry = sweptCape(o.userData.unsweptGeo);
      }
    });
    const h = HATS[hat], c = CAPES[cape], bk = BACKS[back];
    if (h?.from) for (const part of h.parts) this.borrow(h.from, part, true);
    if (h?.build) this.attach(hairStyle !== 'none' && this.anchors.hair ? 'hair' : 'hat', buildHat(h.build), true); // with a new hairstyle: on top of it
    if (c && back === 'none' && !costume) this.borrow(c.from, 'Cape');
    if (bk?.from && !costume) for (const part of bk.parts) this.borrow(bk.from, part);
    if (bk?.build && !costume) this.attach('back', buildBack(bk.build));
    // mirror: hair, face and skin
    const hc = HAIR_COLORS[hairColor]?.color ?? HAIR_COLORS.brown.color;
    const tone = SKINS[skin]?.color;
    if (this.headMesh) {
      const hm = this.headMesh;
      hm.userData.baseGeo ??= hm.geometry;
      const image = (hm.userData.baseMat ?? hm.material).map?.image, outfit = hm.name.replace(/_Head$/, '');
      // a new hairstyle carves the outfit's hair away; either way its own brows go (yours are drawn instead)
      const geo = !image ? hm.userData.baseGeo : hairStyle !== 'none' || masked ? hairlessHead(hm.userData.baseGeo, image, outfit) : browlessHead(hm.userData.baseGeo, image);
      hm.visible = true; // (a ghost's sheet hides it: below)
      hm.userData.baseMat ??= hm.material;
      for (const m of [hm.material].flat()) if (m !== hm.userData.baseMat) m.dispose();
      const textured = hm.userData.baseMat; // (eyes, mouth, brows: as they are)
      if (image) {
        // the skin in one even colour (the texture shades it in patches), shared with the scalp
        hm.geometry = smoothSkin(geo, image);
        this.skinMat = hm.userData.baseMat.clone();
        this.skinMat.map = null;
        this.skinMat.color.set(tone ?? skinColour(hm.userData.baseGeo, image)); // the tone as named, or the outfit's own (Pale)
        hm.material = [this.skinMat, textured];
      } else {
        hm.geometry = geo;
        hm.material = textured;
        this.skinMat = null;
      }
      // (the scalp and hair anchors are measured once, in the rest pose: computeAnchors)
    }
    if (hairStyle !== 'none') {
      // under a hat the hair tucks in (no crown poking through it); a closed helmet hides it all
      // (winter's bobble hat and the holiday costumes put a hat on too)
      const hatOn = covered; // (a crown, ears or a party hat sit on the hair)
      const helmet = hat === 'helmet';
      if (!helmet) {
        const style = buildHair(hairStyle, hc, hatOn);
        const hug = this.anchors.scalp && fitHair(style, this.cranium, this.dome, hatOn, bangs); // its round shell, remade round the skull
        this.attach(this.anchors.hair ? 'hair' : 'hat', style);
        if (hug) this.attach('scalp', hug);
      }
      if (!this.scalpOwn && this.cranium) this.attach('scalp', buildScalp(this.skinMat ?? new THREE.MeshStandardMaterial({ color: this.scalpColor, roughness: 0.8 }), this.cranium));
    }
    // your eyebrows, in your hair colour, each where the outfit's own was (they're cut out)
    const pair = buildBrows(hc, brows);
    if (masked) { /* under the mask */ } else if (this.anchors.brow0 && this.anchors.brow1) for (const one of [...pair.children]) { one.position.set(0, 0, 0); this.attach(one.userData.side < 0 ? 'brow0' : 'brow1', one); }
    else this.attach('face', pair);
    if (face !== 'none' && !masked) this.attach('face', buildFace(face, hc, this.faceCheek, this.skinMat?.color.getHex(), this.faceEyeLine)); // (skin: a scarred eye's lid)
    // winter: a warm coat (unless you're in fancy clothes, which stay on), a bobble hat and a scarf
    this.setClothes(C ? C.clothes : CLOTHES[clothes] ?? (wear === 'winter' && !fancy ? { jacket: this.coatColor, extra: 'parka' } : undefined), TIE_COLORS[tie]?.color);
    const hatSlot = hairStyle !== 'none' && this.anchors.hair ? 'hair' : 'hat'; // (round the skull, over the tucked hair)
    if (costume) this.attach(hatSlot, buildCostumeHat(costume), true);
    if (C?.hideBody) { // the ghost: just the sheet (no hands, feet, head or armor poking out of it)
      this.model.traverse((o) => { if (o.isMesh && /_(Body|ArmLeft|ArmRight|LegLeft|LegRight|Head)$/.test(o.name)) o.visible = false; });
      for (const a of this.armorParts ?? []) a.visible = false;
      if (this.tailored) this.tailored.visible = false;
    }
    else if (wear === 'winter') {
      const ww = buildWinterWear(this.coatColor === COATS[1] ? COATS[0] : COATS[(COATS.indexOf(this.coatColor) + 1) % COATS.length], this.winterHat);
      if (!helm) this.attach(hatSlot, ww.hat, true); // (a helmet stays on in winter; the scarf goes on anyway)
      this.attach('front', ww.scarf);
    }
    if (helm) this.attach(hatSlot, buildHelmet(helm), true);
    // dye: give cape meshes their own copy of the (shared) material, painted a flat colour
    // (multiplying over a red cape's texture would just give muddy red)
    const tint = DYES[dye]?.color;
    const capes = [];
    this.model.traverse((o) => { if (o.isMesh && CAPE_PART.test(o.name) && o.visible) capes.push(o); });
    this.capeWind = [];
    for (const m of capes) {
      m.userData.baseMat ??= m.material;
      if (m.material !== m.userData.baseMat) m.material.dispose();
      m.material = m.userData.baseMat.clone(); // (each cape its own: it blows in its own wind)
      if (tint) { m.material.map = null; m.material.color.set(tint); }
      this.capeWind.push(windCape(m.material));
    }
    this.flashMats = null; // materials changed: collect them again for the low-health flash
    dropTinyShadows(this.root);
  }

  /** What the season (or a holiday) has this character wearing right now: see SEASON_WEAR. */
  seasonWear() {
    return this.forceWear ?? (this.noSeasonWear ? null : SEASON_WEAR.value);
  }

  /**
   * Fancy clothes: a tailored top (client/tailor.js: a smooth fitted jacket, bodice or coat with slim sleeves,
   * skinned to the skeleton) instead of the outfit's own sculpted body and arms (only the hands are kept),
   * trousers in the outfit's colour, and a skirt or robe hanging from the hips.
   */
  setClothes(def, tieColor) {
    this.clothed = !!def;
    this.showArmor();
    this.tailored?.removeFromParent();
    this.tailored?.geometry.dispose();
    this.tailored = null;
    let body = null;
    this.model.traverse((o) => { if (!body && o.isSkinnedMesh && /_Body$/.test(o.name)) body = o; });
    const top = def && body ? buildTailored(def.extra, def.jacket, tieColor, body) : null;
    const wristX = body ? Math.abs(bindBones(body).wristl?.at.x ?? 0.71) : 0.71;
    this.model.traverse((o) => {
      if (!o.isMesh || !/_(Body|ArmLeft|ArmRight|LegLeft|LegRight)$/.test(o.name)) return;
      o.userData.baseGeo ??= o.geometry;
      o.userData.baseMat ??= o.material;
      if (Array.isArray(o.material) && o.material[1] !== o.userData.baseMat) o.material[1].dispose(); // (trousers' cloth; skinMat belongs to the head)
      o.geometry = o.userData.baseGeo;
      o.material = o.userData.baseMat;
      o.visible = true;
      const image = o.userData.baseMat.map?.image;
      // the skin (hands, arms, a bare chest or legs) in the mirror's skin colour, like the face
      const skin = (cloth) => { if (this.skinMat && image) { o.geometry = skinSplit(o.userData.baseGeo, image); o.material = [this.skinMat, cloth]; } };
      if (/_Body$/.test(o.name) && def && top) { o.visible = false; return; } // under the tailored top
      if (/_Arm/.test(o.name) && def && top) { // the sleeves cover the rest; bare hands (no gauntlets or gloves with a suit)
        o.geometry = handOnly(o.userData.baseGeo, wristX);
        o.material = this.skinMat ?? o.userData.baseMat;
        return;
      }
      if (/_Leg/.test(o.name) && def?.legs != null && image) { // trousers (bare feet stay skin)
        o.geometry = skinSplit(o.userData.baseGeo, image);
        o.material = [this.skinMat ?? o.userData.baseMat, new THREE.MeshStandardMaterial({ color: def.legs, roughness: 0.65 })];
        return;
      }
      skin(o.userData.baseMat);
    });
    if (!def) return;
    if (top) {
      body.parent.add(top);
      this.tailored = top;
    }
    const extra = buildClothes(def.extra, def.jacket, tieColor);
    if (extra.hips) this.attach('hips', extra.hips);
    if (extra.hips?.userData.cone && extra.hips.parent) this.skirt = extra.hips;
  }

  /**
   * A gown or robe is a stiff cone round the hips, but legs swing when running: flare it out
   * each frame so it always reaches past the knees and feet instead of them poking through.
   */
  fitSkirt(dt) {
    const sk = this.skirt;
    this.legBones ??= ['lowerlegl', 'footl', 'toesl', 'lowerlegr', 'footr', 'toesr'].map((n) => this.model.getObjectByName(n));
    if (this.legBones.some((b) => !b)) return;
    const { topY, hemY, rTop, rBot } = sk.userData.cone;
    const holder = sk.parent;
    // everything from one fresh pass (the root may have moved this frame), so bones and skirt agree
    this.root.updateMatrixWorld(true);
    const inv = holder.matrixWorld.clone().invert();
    const pts = this.legBones.map((b) => new THREE.Vector3().setFromMatrixPosition(b.matrixWorld).applyMatrix4(inv));
    let need = 1;
    for (const leg of [pts.slice(0, 3), pts.slice(3)]) {
      for (let i = 0; i < 2; i++) { // knee→ankle, ankle→toes: check points along the shin and foot
        for (let k = 0; k <= 4; k++) {
          const q = leg[i].clone().lerp(leg[i + 1], k / 4);
          if (q.y > topY || q.y < hemY) continue;
          const r = rTop + (rBot - rTop) * (topY - q.y) / (topY - hemY);
          need = Math.max(need, (Math.hypot(q.x, q.z) + SKIRT_GAP) / r);
        }
      }
    }
    need = Math.min(need, SKIRT_MAX_FLARE);
    // flare out at once, settle back gently
    const s = need > sk.scale.x ? need : sk.scale.x + (need - sk.scale.x) * Math.min(1, dt * 6);
    sk.scale.set(s, 1, s);
  }

  borrow(model, part, headwear = false) {
    const src = characterScene(model).getObjectByName(`${model.replace('_', '')}_${part}`);
    if (!src?.isSkinnedMesh) return;
    // same rig everywhere: rebuild the skeleton from our own bones (matched by name)
    const bones = src.skeleton.bones.map((b) => this.model.getObjectByName(b.name));
    if (bones.some((b) => !b)) return;
    const mesh = src.clone();
    mesh.material = src.material.clone();
    if (part === 'Cape') mesh.geometry = sweptCape(src.geometry);
    mesh.bind(new THREE.Skeleton(bones, src.skeleton.boneInverses), src.bindMatrix);
    mesh.userData.headwear = headwear;
    mesh.visible = !(headwear && (this.inBed || this.hatOff));
    (this.model.getObjectByName(src.parent.name) ?? this.model).add(mesh);
    this.borrowed.push(mesh);
  }

  fadeTo(name, t = 0.2) {
    const next = this.actions[name === 'sleep' || name === 'sit' ? 'idle' : name];
    if (!next) return;
    for (const a of Object.values(this.actions)) if (a !== next && a.isRunning()) a.fadeOut(t);
    next.reset().fadeIn(t).play();
  }

  setBase(name) {
    if (this.base === name) return;
    this.base = name;
    // asleep: lying on our back on the bed, head on the pillow at its -z end (no sleeping clip: tip the idle pose over)
    const asleep = name === 'sleep';
    if (asleep !== !!this.inBed) {
      if (asleep) this.model.rotation.x = 0; // (still standing: the table copy is taken upright)
      this.putHatOnTable(asleep);
      this.inBed = asleep;
      this.showHats();
    }
    this.model.rotation.x = asleep ? -Math.PI / 2 : 0;
    this.model.position.set(0, asleep ? 1.05 : name === 'sit' ? SIT_DROP : 0, asleep ? SLEEP_FORWARD : name === 'sit' ? SIT_BACK : 0);
    if (this.label) this.label.visible = !asleep;
    if (!this.oneShot) this.fadeTo(asleep ? 'idle' : name);
  }

  /** Dodge roll: a tucked forward somersault (the rig has no roll clip). */
  /** J: a hop, knees tucked up, then down again. `jumpY` is the height off the ground right now. */
  jump() {
    this.jumpT = 0;
    if (this.rollT == null) this.fadeTo('tuck', 0.08);
  }

  get jumping() { return this.jumpT != null; }

  roll(duration) {
    this.rollT = 0;
    this.rollDur = duration;
    this.oneShot = null;
    this.fadeTo('tuck', 0.05);
  }

  play(name) {
    this.swingAttack = name === 'attack'; // (the cape flares out of the way of attacks: update)
    if (name === 'attack') {
      const def = ITEMS[this.weaponId];
      // bows and crossbows: no clip in the rig fits, so draw, aim and loose by hand (shootPose)
      if (def?.ranged === 'arrow') { this.shootT = 0; return; }
      if (def?.swing === 'cast') this.bookFx?.cast();
      name = def?.swing ?? 'slash';
    }
    if (!this.actions[name]) return;
    this.oneShot = this.actions[name];
    this.swingAction = this.swingAttack ? this.oneShot : null; // (swingClear: until it has faded right out)
    this.fadeTo(name, 0.08);
  }

  /** Below LOW_HP of their health, characters pulse red so everyone notices. */
  setHealth(frac) {
    this.lowHp = frac > 0 && frac <= LOW_HP;
  }

  /** Every material on the character (for the low-health flash), collected once per look. */
  materials() {
    if (!this.flashMats) {
      const set = new Set();
      this.model.traverse((o) => {
        if (!o.isMesh || !o.visible) return;
        for (const m of [o.material].flat()) if (m.emissive && m.emissive.getHex() === 0) set.add(m);
      });
      this.flashMats = [...set];
    }
    return this.flashMats;
  }

  /** Remote players: ease towards the latest snapshot. */
  setTarget(s) {
    if (!this.target) this.root.position.set(s.x, 0, s.z);
    this.target = s;
  }

  update(dt) {
    this.time += dt;
    if (this.seasonWear() !== this.wear) this.setLook(this.look); // the season changed (or we went in/out)
    for (const b of this.borrowed) b.children[0]?.userData.update?.(this.time, this); // flapping wings, a jetpack's flames
    // capes: always a little breeze; streaming back when running; flung back and away from the weapon when
    // attacking, so the weapon (right hand) swings under it instead of through it
    if (this.capeWind?.length) {
      const attacking = (this.oneShot != null && this.swingAttack) || this.shootT != null;
      const push = attacking ? 1 : this.base === 'run' || this.flying ? 0.45 : 0;
      for (const u of this.capeWind) {
        u.uTime.value = this.time;
        u.uPush.value += (push - u.uPush.value) * Math.min(1, dt * (attacking ? 14 : 4));
        u.uSide.value += ((attacking ? 1 : 0) - u.uSide.value) * Math.min(1, dt * (attacking ? 14 : 4));
      }
    }
    this.weaponFx?.update(this.time);
    if (this.target) {
      const k = smooth(dt);
      this.root.position.x += (this.target.x - this.root.position.x) * k;
      this.root.position.z += (this.target.z - this.root.position.z) * k;
      this.root.rotation.y = lerpAngle(this.root.rotation.y, this.target.rot, k);
      this.flying = this.target.anim === 'fly'; // up on a jetpack
      const flyTo = this.flying ? CharacterView.flyHeight(this.root.position.x, this.root.position.z) + Math.sin(this.time * 2.5) * 0.08 : 0;
      this.lift = (this.lift ?? 0) + (flyTo - (this.lift ?? 0)) * Math.min(1, dt * (flyTo > (this.lift ?? 0) ? 7 : 3));
      if (this.target.anim !== 'jump') this.jumpSeen = false; // one hop per jump
      else if (!this.jumpSeen) { this.jumpSeen = true; this.jump(); }
      this.root.position.y = this.lift + (this.jumpY ?? 0);
      // one somersault per roll, even if the 'roll' state lingers a little over the network
      if (this.target.anim !== 'roll') this.rollSeen = false;
      else if (!this.rollSeen) { this.rollSeen = true; this.roll(ROLL_TIME); }
      this.setBase(['run', 'sleep', 'sit'].includes(this.target.anim) ? this.target.anim : 'idle');
    }
    this.jumpY = 0;
    if (this.jumpT != null) {
      this.jumpT += dt;
      const u = Math.min(1, this.jumpT / JUMP_TIME);
      this.jumpY = 4 * JUMP_HEIGHT * u * (1 - u);
      if (u >= 1) { this.jumpT = null; if (this.rollT == null) this.fadeTo(this.base, 0.12); }
    }
    if (this.rollT != null) {
      this.rollT += dt;
      const u = Math.min(1, this.rollT / this.rollDur);
      const a = (0.5 - 0.5 * Math.cos(u * Math.PI)) * Math.PI * 2; // (eased: tucks in, tumbles over, settles)
      // spin round the middle of the curled-up body, not the feet (that swung the head through the floor),
      // with a little hop so nothing scrapes the ground
      this.model.rotation.x = a;
      this.model.position.y = ROLL_PIVOT * (1 - Math.cos(a)) + Math.sin(u * Math.PI) * ROLL_HOP;
      this.model.position.z = -ROLL_PIVOT * Math.sin(a);
      if (u >= 1) {
        this.rollT = null;
        this.model.rotation.x = 0;
        this.model.position.set(0, 0, 0);
        this.fadeTo(this.base, 0.1);
      }
    }
    if (this.lowHp || this.flashing) {
      const glow = this.lowHp ? (0.5 + 0.5 * Math.sin(this.time * 9)) * 0.55 : 0;
      for (const m of this.materials()) m.emissive.setRGB(glow, 0, 0);
      this.flashing = this.lowHp;
    }
    this.mixer.update(dt);
    if (this.swingAction && this.rollT == null) this.swingClear();
    if (this.base === 'sit' && this.rollT == null) this.sitPose();
    if (this.shootT != null) this.shootPose(dt);
    this.bookFx?.update(dt, this.time);
    if (this.skirt) this.fitSkirt(dt);
  }

  /** Sitting (no clip for it either): bend the idle pose at the hips and knees, hands in the lap. */
  sitPose() {
    this.legs ??= ['upperlegl', 'upperlegr', 'lowerlegl', 'lowerlegr', 'upperarml', 'upperarmr'].map((n) => this.model.getObjectByName(n));
    const [ul, ur, ll, lr, al, ar] = this.legs;
    if (!ul || !ll) return;
    for (const b of [ul, ur]) b?.rotateX(SIT_HIP);
    for (const b of [ll, lr]) b?.rotateX(SIT_KNEE);
    for (const b of [al, ar]) b?.rotateX(SIT_ARM);
  }

  /**
   * Shooting a bow or crossbow, over whatever the legs are doing: the arms come up to aim, the string
   * is drawn back, and at the moment the arrow flies (SWING_IMPACT) it's loosed with a little kick.
   * Each bone is set to point a way in the character's own space (+z ahead, +x its left) with a set
   * twist round itself, blended over the animation by `w`: turning bones "the shortest way" from
   * wherever the animation had them left the weapon twisted differently each time.
   */
  shootPose(dt) {
    const t = (this.shootT += dt), impact = SWING_IMPACT.cast, end = impact + 0.4;
    if (t > end || this.rollT != null || this.base === 'sleep') {
      this.shootT = null;
      if (/crossbow/.test(ITEMS[this.weaponId]?.model)) this.weaponObj?.quaternion.copy(CROSSBOW_GRIP); // back in the resting grip
      return;
    }
    this.arms ??= ['upperarml', 'lowerarml', 'wristl', 'upperarmr', 'lowerarmr', 'wristr', 'chest'].map((n) => this.model.getObjectByName(n));
    const [ul, ll, wl, ur, lr, wr, chest] = this.arms;
    if (!ul || !ll || !wl || !ur || !lr || !wr) return;
    const ease = (u) => u * u * (3 - 2 * u);
    const w = t < impact ? ease(Math.min(1, t / (impact * 0.6))) : 1 - ease(Math.max(0, (t - impact - 0.12) / 0.28)); // up, hold, down
    const draw = ease(THREE.MathUtils.clamp((t - impact * 0.35) / (impact * 0.6), 0, 1)); // the string comes back
    const kick = t > impact ? Math.exp(-(t - impact) * 14) : 0; // the jolt as it looses
    const crossbow = /crossbow/.test(ITEMS[this.weaponId]?.model);
    if (chest) chest.rotateY(-0.35 * w * (crossbow ? 0.4 : 1)); // turn side-on to the target
    if (crossbow) {
      // crossbow: raised to the shoulder in both hands, the left one under it; it kicks up as it fires
      this.setBone(ur, 0.05, 0.12 + kick * 0.5, 1, 0, w);
      this.setBone(lr, 0.08, 0.1 + kick * 0.8, 1, 0, w);
      this.setBone(wr, 0.08, 0.1 + kick * 0.8, 1, Math.PI * 0.25, w); // level, limbs out ahead
      this.setBone(ul, -0.35, -0.35 + kick * 0.4, 1, 0, w);
      this.setBone(ll, -1, 0.25 + kick * 0.5, 0.7, 0, w);
      // and the crossbow itself aims dead ahead (tipping up as it kicks), whatever the wrist ended up doing
      const wo = this.weaponObj;
      if (wo) {
        this.hand.updateWorldMatrix(true, false);
        const aim = AIM_Q.setFromEuler(AIM_E.set(-kick * 0.35, 0, 0));
        const want = this.root.getWorldQuaternion(AIM_P).multiply(aim);
        const local = AIM_P2.copy(this.hand.getWorldQuaternion(AIM_P3)).invert().multiply(want);
        wo.quaternion.copy(CROSSBOW_GRIP).slerp(local, w);
      }
    } else {
      // bow (in the right hand): that arm straight out ahead, the left draws the string back to the cheek
      this.setBone(ur, -0.18, 0.12 + kick * 0.2, 1, 0, w);
      this.setBone(lr, -0.12, 0.1 + kick * 0.2, 1, 0, w);
      this.setBone(wr, -0.12, 0.1 + kick * 0.2, 1, Math.PI, w); // the bow upright, string towards the archer
      const back = draw + kick * 0.5; // after loosing, the drawing hand flies on back a little
      this.setBone(ul, 0.25 + back * 0.55, 0.12, 1 - back * 1.25, 0, w);
      this.setBone(ll, -0.15 - back * 0.85, 0.1, 1 - back * 0.75, 0, w);
    }
  }

  /**
   * Point `bone` (its +y runs down the limb) along (x, y, z) in character space, twisted `roll` radians
   * round itself from "front facing up", by `w` (0..1) over its animated pose.
   */
  /**
   * Melee swings: the clips swing the weapon close past the head (through a hat) and across the belly. Lean
   * the weapon arm out from the shoulder, the hand moving away from the middle of the body whichever way the
   * arm points (up past the head, down across the front), so the weapon's whole arc stays clear of both.
   */
  swingClear() {
    const w = this.swingAction.getEffectiveWeight();
    if (w <= 0.001) { if (!this.swingAction.isRunning()) this.swingAction = null; return; }
    if (this.swingArm === undefined) { // the weapon arm: its shoulder, then its elbow (which leans out a little more)
      const up = (re) => { let b = this.hand; while (b && !re.test(b.name)) b = b.parent; return b ?? null; };
      this.swingArm = [[up(/^upperarm/), SWING_CLEAR], [up(/^lowerarm/), SWING_CLEAR * 0.5]].filter(([b]) => b);
    }
    for (const [bone, angle] of this.swingArm) {
      this.root.updateWorldMatrix(true, true);
      const inv = SC_M.copy(this.root.matrixWorld).invert();
      const from = SC_A.setFromMatrixPosition(bone.matrixWorld).applyMatrix4(inv), hand = SC_B.setFromMatrixPosition(this.hand.matrixWorld).applyMatrix4(inv);
      const side = Math.sign(from.x) || 1;
      const along = hand.sub(from).normalize();
      const axis = SC_X.set(side, 0, 0).cross(along).negate(); // turns `along` towards the arm's own side
      if (axis.lengthSq() < 1e-4) continue;
      axis.transformDirection(this.root.matrixWorld);
      const world = AIM_Q.setFromAxisAngle(axis, angle * w).multiply(bone.getWorldQuaternion(AIM_P));
      bone.quaternion.copy(bone.parent.getWorldQuaternion(AIM_P2).invert().multiply(world));
    }
  }

  setBone(bone, x, y, z, roll, w) {
    if (w <= 0) return;
    this.root.getWorldQuaternion(AIM_P);
    const along = AIM_A.set(x, y, z).normalize().applyQuaternion(AIM_P);
    const side = AIM_B.set(0, 1, 0).applyQuaternion(AIM_P); // "up" for the twist; forward if the limb points up or down
    if (Math.abs(side.dot(along)) > 0.9) side.set(0, 0, 1).applyQuaternion(AIM_P);
    side.addScaledVector(along, -side.dot(along)).normalize().applyAxisAngle(along, roll);
    AIM_M.makeBasis(AIM_C.crossVectors(along, side), along, side);
    const want = AIM_Q.setFromRotationMatrix(AIM_M);
    bone.parent.updateWorldMatrix(true, false);
    const local = AIM_P2.copy(bone.parent.getWorldQuaternion(AIM_P)).invert().multiply(want);
    bone.quaternion.slerp(local, w);
  }

  dispose() {
    this.bookFx?.dispose();
    this.mixer.stopAllAction();
    this.root.removeFromParent();
  }
}

// ------------------------------------------------------------------ slimes

const SLIME_COLORS = { green: 0x6ee05a, blue: 0x4fa8ff, red: 0xff5a4f, purple: 0xb070ff, black: 0x3a3550, iceslime: 0xa8ecff, king: 0x8ae04a, emperor: 0x7040e0 };
const slimeGeo = new THREE.SphereGeometry(0.75, 20, 14);
slimeGeo.translate(0, 0.75, 0);
const eyeGeo = new THREE.SphereGeometry(0.11, 8, 6);
const SLIME_SHINE_GEO = new THREE.SphereGeometry(0.035, 6, 4);
const SLIME_SHINE = new THREE.MeshBasicMaterial({ color: 0xffffff });
const SLIME_CORE_GEO = new THREE.SphereGeometry(0.32, 12, 10);
const SLIME_GLOSS_GEO = new THREE.SphereGeometry(0.2, 10, 6);
SLIME_GLOSS_GEO.scale(1, 0.35, 0.6);
const SLIME_GLOSS = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
const SLIME_MOUTH_GEO = new THREE.TorusGeometry(0.1, 0.025, 4, 10, Math.PI);
const SLIME_BUBBLE_GEO = new THREE.SphereGeometry(0.06, 8, 6);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

export class SlimeView {
  constructor(e) {
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.mat = new THREE.MeshStandardMaterial({
      color: ENEMIES[e.variant]?.color ?? SLIME_COLORS[e.variant] ?? 0x88ff88, roughness: 0.25, metalness: 0, transparent: true, opacity: 0.6,
      emissive: 0x000000,
    });
    const blob = new THREE.Mesh(slimeGeo, this.mat);
    blob.castShadow = true;
    this.body.add(blob);
    for (const sx of [-0.25, 0.25]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(sx, 0.95, 0.62);
      this.body.add(eye);
      const shine = new THREE.Mesh(SLIME_SHINE_GEO, SLIME_SHINE); // a twinkle in each eye
      shine.position.set(sx + 0.04, 1.0, 0.71);
      this.body.add(shine);
    }
    // a jelly that looks like jelly: a darker core, a glossy highlight, a little mouth and bubbles
    const tint = new THREE.Color(this.mat.color);
    const core = new THREE.Mesh(SLIME_CORE_GEO, new THREE.MeshStandardMaterial({ color: tint.clone().multiplyScalar(0.55), roughness: 0.5 }));
    core.position.set(0, 0.6, -0.05);
    this.body.add(core);
    const gloss = new THREE.Mesh(SLIME_GLOSS_GEO, SLIME_GLOSS);
    gloss.position.set(-0.3, 1.15, 0.4);
    gloss.rotation.set(-0.6, -0.5, 0.4);
    this.body.add(gloss);
    const mouth = new THREE.Mesh(SLIME_MOUTH_GEO, eyeMat);
    mouth.position.set(0, 0.78, 0.7);
    mouth.rotation.z = Math.PI;
    this.body.add(mouth);
    this.bubbles = [];
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(SLIME_BUBBLE_GEO, new THREE.MeshStandardMaterial({ color: tint.clone().lerp(new THREE.Color(0xffffff), 0.5), transparent: true, opacity: 0.6, roughness: 0.2 }));
      this.body.add(b);
      this.bubbles.push(b);
    }
    if (e.boss) {
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.36, 0.32, 6, 1, true),
        new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }),
      );
      crown.position.y = 1.6;
      this.body.add(crown);
      for (let i = 0; i < 6; i++) { // jewels on the crown
        const a = (i / 6) * Math.PI * 2;
        const gem = new THREE.Mesh(SLIME_BUBBLE_GEO, new THREE.MeshStandardMaterial({ color: [0xff3d6e, 0x3d8aff, 0x3dff8a][i % 3], roughness: 0.2 }));
        gem.position.set(Math.cos(a) * 0.4, 1.6, Math.sin(a) * 0.4);
        this.body.add(gem);
      }
    }
    this.body.scale.setScalar(e.scale ?? 1);
    this.root.add(this.body);
    this.hpBar = makeHpBar(e.boss ? 3 : 1.2);
    this.hpBar.group.position.y = 2 * (e.scale ?? 1) + 0.3;
    this.hpBar.group.visible = !!e.boss;
    this.root.add(this.hpBar.group);
    if (e.boss) {
      const label = makeLabel(e.name, '#ffd23f');
      label.position.y = this.hpBar.group.position.y + 0.6;
      this.root.add(label);
    }
    this.maxHp = e.maxHp;
    this.phase = Math.random() * 10;
    this.flash = 0;
    this.root.position.set(e.x, 0, e.z);
    this.apply(e);
  }

  apply(e) {
    this.target = { x: e.x ?? this.target?.x, z: e.z ?? this.target?.z, rot: e.rot ?? this.target?.rot ?? 0 };
    if (e.hp != null && e.hp < this.maxHp) {
      this.hpBar.group.visible = true;
      this.hpBar.set(e.hp / this.maxHp);
    }
  }

  hit() {
    this.flash = 0.15;
  }

  update(dt) {
    this.bubbleT = (this.bubbleT ?? 0) + dt;
    if (this.bubbles) this.bubbles.forEach((b, n) => { // bubbles rising inside the jelly
      const u = (this.bubbleT * 0.3 + n / 3) % 1;
      b.position.set(Math.sin(n * 2.1) * 0.3, 0.2 + u * 1.0, Math.cos(n * 2.1) * 0.25);
      b.scale.setScalar(1 - u * 0.6);
    });
    const k = smooth(dt, 14);
    const p = this.root.position;
    const moving = Math.hypot(this.target.x - p.x, this.target.z - p.z) > 0.02;
    p.x += (this.target.x - p.x) * k;
    p.z += (this.target.z - p.z) * k;
    this.root.rotation.y = lerpAngle(this.root.rotation.y, this.target.rot, k);
    // hop + squash
    this.phase += dt * (moving ? 7 : 3);
    const hop = Math.abs(Math.sin(this.phase));
    this.body.position.y = moving ? hop * 0.6 : 0;
    const squash = 1 + (moving ? (hop - 0.5) * 0.25 : Math.sin(this.phase) * 0.05);
    const s = this.body.scale.x;
    this.body.scale.y = s * squash;
    this.flash = Math.max(0, this.flash - dt);
    this.mat.emissive.setScalar(this.flash > 0 ? 0.9 : 0);
  }

  dispose() { this.root.removeFromParent(); }
}

// ------------------------------------------------------------------ simple props

const ROCK_MODELS = { stone: 'blocks/stone', copper: 'blocks/stone_with_copper', silver: 'blocks/stone_with_silver', goldore: 'blocks/stone_with_gold' };
// rocks of the deeper ores reuse a block model, recoloured like the ore's item
const ROCK_LOOKS = (ore) => ({ model: ROCK_MODELS[ore] ?? ITEMS[ore]?.model ?? 'blocks/stone', tint: ROCK_MODELS[ore] ? null : ITEMS[ore]?.tint });

// metal ores glint now and then in this colour; gems glint in their own
const ORE_GLINT = { silver: 0xeef6ff, goldore: 0xfff0a0, mythril: 0xbff0ff, obsidian: 0xe0b8ff, starstone: 0xfff8d8 };

export class RockView {
  constructor(e) {
    this.root = new THREE.Group();
    this.body = new THREE.Group(); // everything that shakes when hit
    this.root.add(this.body);
    const def = ITEMS[e.ore], seed = Math.abs(e.x * 13 + e.z * 7);
    const s = 0.85;
    const look = def?.gem ? { model: 'blocks/stone', tint: null } : ROCK_LOOKS(e.ore);
    const model = tintModel(cloneModel(look.model), look.tint);
    model.scale.setScalar(s);
    model.position.y = s;
    model.rotation.y = (seed % 4) * Math.PI / 2 + 0.2;
    this.body.add(model);
    this.time = (seed % 100) / 10;
    this.gems = [];
    if (def?.gem) {
      // a cluster of glowing crystals bursting out of the top, and smaller ones from the sides
      for (const [x, y, z, k, tilt] of [[0, 1.4, 0, 1.35, 0], [0.75, 0.9, 0.2, 0.6, -0.9], [-0.6, 0.7, -0.45, 0.55, 0.8]]) {
        const c = cloneModel('props/crystalcluster');
        const box = new THREE.Box3().setFromObject(c), size = box.getSize(new THREE.Vector3());
        c.scale.setScalar((1.5 / Math.max(size.x, size.z, 0.01)) * k);
        c.position.set(x, y, z);
        c.rotation.set(0, seed + x * 3, tilt);
        c.traverse((o) => {
          if (!o.isMesh) return;
          o.material = new THREE.MeshStandardMaterial({ color: def.tint, emissive: def.glow, emissiveIntensity: 0.55, roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.92 });
          this.gems.push(o.material);
        });
        this.body.add(c);
      }
      this.rainbow = !!def.rainbow;
    }
    // glints: little stars that flash on the rock's surface
    const glint = def?.gem ? 0xffffff : ORE_GLINT[e.ore];
    this.glints = [];
    if (glint != null) {
      const n = def?.gem ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: glint, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
        const a = (seed + i * 2.4) % (Math.PI * 2);
        sp.position.set(Math.cos(a) * 0.8, 0.5 + ((seed * (i + 1)) % 10) / 8, Math.sin(a) * 0.8);
        sp.userData = { phase: i * 1.7 + seed, speed: 0.9 + (i % 3) * 0.35 };
        this.body.add(sp);
        this.glints.push(sp);
      }
    }
    this.root.position.set(e.x, 0, e.z);
    this.shake = 0;
  }
  apply() { this.shake = 0.2; }
  hit() { this.shake = 0.2; }
  update(dt) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt);
    this.body.position.x = this.shake > 0 ? Math.sin(this.shake * 90) * 0.12 : 0;
    for (const g of this.glints) { // a quick twinkle every couple of seconds
      const k = Math.max(0, Math.sin(this.time * g.userData.speed * 2 + g.userData.phase)) ** 12;
      g.material.opacity = k;
      g.scale.setScalar(0.25 + k * 0.6);
    }
    if (this.gems.length) {
      const pulse = 0.45 + Math.sin(this.time * 2.2) * 0.2;
      for (const m of this.gems) {
        m.emissiveIntensity = pulse;
        if (this.rainbow) { // an opal: colours drift through the rainbow
          m.color.setHSL((this.time * 0.08) % 1, 0.7, 0.72);
          m.emissive.setHSL((this.time * 0.08 + 0.1) % 1, 0.9, 0.45);
        }
      }
    }
  }
  dispose() { this.root.removeFromParent(); }
}

const BARREL_MODELS = { barrel: 'dungeon/barrel_large', keg: 'dungeon/keg', small: 'dungeon/barrel_small' };

export class BarrelView {
  constructor(e) {
    this.root = new THREE.Group();
    this.inner = cloneModel(BARREL_MODELS[e.style] ?? BARREL_MODELS.barrel);
    this.inner.rotation.y = e.rot ?? 0;
    this.root.add(this.inner);
    this.root.position.set(e.x, 0, e.z);
    this.shake = 0;
  }
  apply() {}
  hit() { this.shake = 0.25; }
  update(dt) {
    this.shake = Math.max(0, this.shake - dt);
    const w = this.shake > 0 ? Math.sin(this.shake * 70) * this.shake * 0.5 : 0;
    this.inner.rotation.z = w;
    this.inner.scale.set(1 + this.shake * 0.3, 1 - this.shake * 0.3, 1 + this.shake * 0.3);
  }
  dispose() { this.root.removeFromParent(); }
}

/** Bits flying off smashed barrels and rocks. */
const debrisGeo = new THREE.BoxGeometry(1, 1, 1);
export class Debris {
  constructor(x, z, colors, count = 14) {
    this.root = new THREE.Group();
    this.bits = [];
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(debrisGeo, new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.9, transparent: true }));
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
      m.scale.set(0.12 + Math.random() * 0.2, 0.1 + Math.random() * 0.15, 0.25 + Math.random() * 0.35);
      m.position.set(x, 0.6 + Math.random() * 0.8, z);
      m.userData = { vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 3 + Math.random() * 5, spin: (Math.random() - 0.5) * 20 };
      this.root.add(m);
      this.bits.push(m);
    }
    this.life = 1.1;
  }
  get done() { return this.life <= 0; }
  update(dt) {
    this.life -= dt;
    for (const m of this.bits) {
      const v = m.userData;
      v.vy -= 22 * dt;
      m.position.x += v.vx * dt; m.position.z += v.vz * dt; m.position.y += v.vy * dt;
      if (m.position.y < 0.08) { m.position.y = 0.08; v.vy *= -0.3; v.vx *= 0.6; v.vz *= 0.6; v.spin *= 0.5; }
      m.rotation.x += v.spin * dt; m.rotation.y += v.spin * 0.7 * dt;
      m.material.opacity = Math.min(1, this.life * 3);
    }
  }
  dispose() {
    for (const m of this.bits) m.material.dispose();
    this.root.removeFromParent();
  }
}

export class DropView {
  constructor(e) {
    this.root = new THREE.Group();
    const def = ITEMS[e.item];
    const model = tintModel(cloneModel(def?.model ?? 'dungeon/coin'), def?.tint);
    const s = e.item === 'gold' ? 2.2 : def?.kind === 'loot' && def.model.startsWith('blocks/') ? 0.28 : 0.9;
    model.scale.setScalar(s);
    this.inner = model;
    this.root.add(model);
    this.root.position.set(e.x, 0, e.z);
    this.target = { x: e.x, z: e.z };
    this.t = Math.random() * 6;
  }
  apply(e) { this.target = { x: e.x, z: e.z }; }
  update(dt) {
    this.t += dt;
    const k = smooth(dt, 15);
    this.root.position.x += (this.target.x - this.root.position.x) * k;
    this.root.position.z += (this.target.z - this.root.position.z) * k;
    this.inner.position.y = 0.5 + Math.sin(this.t * 3) * 0.15;
    this.inner.rotation.y += dt * 2.5;
  }
  dispose() { this.root.removeFromParent(); }
}

/** The training dummy in town: a straw man on a post with a target on his chest. Wobbles when hit. */
export class DummyView {
  constructor(e) {
    this.root = new THREE.Group();
    this.root.position.set(e.x, 0, e.z);
    this.inner = new THREE.Group();
    this.root.add(this.inner);
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.9 });
    const straw = new THREE.MeshStandardMaterial({ color: 0xe0c070, roughness: 1 });
    const sack = new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 1 });
    const part = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; this.inner.add(o); return o; };
    part(new THREE.CylinderGeometry(0.1, 0.12, 2.2, 8), wood, 0, 1.1, 0);
    part(new THREE.CylinderGeometry(0.5, 0.42, 1.0, 12), sack, 0, 1.45, 0);
    part(new THREE.SphereGeometry(0.34, 12, 10), sack, 0, 2.25, 0);
    part(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 6), wood, 0, 1.75, 0).rotation.z = Math.PI / 2; // arms
    for (const s of [-1, 1]) part(new THREE.ConeGeometry(0.18, 0.4, 8), straw, s * 0.95, 1.75, 0).rotation.z = s * Math.PI / 2;
    const ring = (r, c) => part(new THREE.RingGeometry(r * 0.6, r, 24), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide }), 0, 1.5, 0.51);
    ring(0.36, 0xffffff); ring(0.22, 0xe0393b);
    part(new THREE.CircleGeometry(0.1, 16), new THREE.MeshStandardMaterial({ color: 0xe0393b }), 0, 1.5, 0.52);
    for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.08, 0.08, 0.02), new THREE.MeshBasicMaterial({ color: 0x3a2a1c }), s * 0.12, 2.3, 0.33); // stitched eyes
    this.wobble = 0;
  }
  apply() {}
  hit() { this.wobble = 1; }
  update(dt) {
    this.wobble = Math.max(0, this.wobble - dt * 1.5);
    this.inner.rotation.x = Math.sin(this.wobble * 18) * this.wobble * 0.35;
    this.inner.rotation.z = Math.cos(this.wobble * 13) * this.wobble * 0.15;
  }
  dispose() { this.root.removeFromParent(); }
}

export class ChestView {
  constructor(e) {
    this.root = cloneModel('dungeon/chest_gold');
    this.root.position.set(e.x, 0, e.z);
  }
  apply() {}
  update() {}
  dispose() { this.root.removeFromParent(); }
}

let pitTex = null;
function pitTexture() {
  // dark in the middle, earthy at the edge, so a flat disc reads as a deep hole
  if (pitTex) return pitTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, '#000');
  grad.addColorStop(0.55, '#07050a');
  grad.addColorStop(0.85, '#2a1d14');
  grad.addColorStop(1, '#4a3626');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  pitTex = new THREE.CanvasTexture(c);
  pitTex.colorSpace = THREE.SRGBColorSpace;
  return pitTex;
}

export class LadderView {
  constructor(e) {
    this.root = new THREE.Group();
    const pit = new THREE.Mesh(new THREE.CircleGeometry(1.35, 28), new THREE.MeshBasicMaterial({ map: pitTexture() }));
    pit.rotation.x = -Math.PI / 2;
    pit.position.y = 0.07; // just above the floor tiles (their tops are at y = 0.05)
    this.root.add(pit);
    // rough stone rim
    const stone = new THREE.MeshStandardMaterial({ color: 0x77706a, roughness: 1, flatShading: true });
    const rimGeo = new THREE.DodecahedronGeometry(0.3, 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.2;
      const r = new THREE.Mesh(rimGeo, stone);
      r.position.set(Math.cos(a) * 1.4, 0.12, Math.sin(a) * 1.4);
      r.scale.set(1 + Math.random() * 0.6, 0.5 + Math.random() * 0.4, 0.8 + Math.random() * 0.4);
      r.rotation.set(Math.random(), Math.random() * 3, Math.random());
      r.castShadow = r.receiveShadow = true;
      this.root.add(r);
    }
    // the top of a wooden ladder leaning against the far edge, sinking into the dark
    const wood = new THREE.MeshStandardMaterial({ color: 0x9a6a3c, roughness: 0.85 });
    const ladder = new THREE.Group();
    for (const sx of [-0.38, 0.38]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 3, 0.11), wood);
      rail.position.set(sx, 0, 0);
      ladder.add(rail);
    }
    for (let i = 0; i < 6; i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.07, 0.08), wood);
      rung.position.y = -1.3 + i * 0.5;
      ladder.add(rung);
    }
    ladder.traverse((o) => { o.castShadow = true; });
    ladder.position.set(0, 0.05, -0.75);
    ladder.rotation.x = 0.35; // top leans out towards the camera side
    this.root.add(ladder);

    this.light = new THREE.PointLight(0x66ccff, 12, 8, 1.5);
    this.light.position.y = 1.5;
    this.root.add(this.light);
    this.root.position.set(e.x, 0, e.z);
    this.t = 0;
  }
  apply() {}
  update(dt) {
    this.t += dt;
    this.light.intensity = 12 + Math.sin(this.t * 3) * 5; // a soft pulse so it's easy to spot
  }
  dispose() { this.root.removeFromParent(); }
}

let sparkTex = null;
const fireTex = { tex: null };
function sparkTexture(kind = 'magic') {
  if (kind === 'fire') return fireTexture();
  if (sparkTex) return sparkTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(200,160,255,0.8)');
  grad.addColorStop(1, 'rgba(120,60,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  sparkTex = new THREE.CanvasTexture(c);
  return sparkTex;
}

function fireTexture() {
  if (fireTex.tex) return fireTex.tex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,220,1)');
  grad.addColorStop(0.3, 'rgba(255,170,40,0.9)');
  grad.addColorStop(1, 'rgba(255,60,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  fireTex.tex = new THREE.CanvasTexture(c);
  return fireTex.tex;
}

/** Arrow or magic bolt. The host sends its start + velocity once; we fly it locally until it's gone. */
export class ShotView {
  constructor(e) {
    this.root = new THREE.Group();
    this.v = { x: e.vx, z: e.vz };
    this.t = 0;
    if (e.kind === 'magic' || e.kind === 'fire') {
      const fire = e.kind === 'fire';
      this.core = new THREE.Mesh(new THREE.SphereGeometry(fire ? 0.24 : 0.18, 12, 8), new THREE.MeshBasicMaterial({ color: fire ? 0xffe9a0 : 0xf3e6ff }));
      this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(e.kind), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      this.halo.scale.setScalar(1.3);
      this.root.add(this.core, this.halo);
      // a little trail of sparkles that fade behind the bolt
      this.trail = Array.from({ length: 6 }, () => {
        const sp = new THREE.Sprite(this.halo.material.clone());
        sp.scale.setScalar(0.5);
        sp.visible = false;
        return sp;
      });
      this.trailHost = new THREE.Group();
      for (const sp of this.trail) this.trailHost.add(sp);
      this.trailIdx = 0;
    } else {
      const wood = new THREE.MeshStandardMaterial({ color: 0x9a6a3c });
      const arrow = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 6), wood);
      shaft.rotation.x = Math.PI / 2;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 6), new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.7, roughness: 0.3 }));
      tip.rotation.x = Math.PI / 2;
      tip.position.z = 0.62;
      arrow.add(shaft, tip);
      for (const r of [0, Math.PI / 2]) {
        const fin = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.25), new THREE.MeshStandardMaterial({ color: 0xff6b6b, side: THREE.DoubleSide }));
        fin.position.z = -0.45;
        fin.rotation.set(Math.PI / 2, r, 0);
        arrow.add(fin);
      }
      arrow.rotation.y = Math.atan2(e.vx, e.vz);
      this.root.add(arrow);
    }
    this.root.position.set(e.x, 1.3, e.z);
  }
  apply() {}
  update(dt) {
    this.t += dt;
    this.root.position.x += this.v.x * dt;
    this.root.position.z += this.v.z * dt;
    if (this.halo) {
      this.halo.scale.setScalar(1.1 + Math.sin(this.t * 30) * 0.2);
      if (!this.trailHost.parent && this.root.parent) this.root.parent.add(this.trailHost);
      const sp = this.trail[this.trailIdx++ % this.trail.length];
      sp.visible = true;
      sp.position.copy(this.root.position);
      sp.material.opacity = 1;
      for (const s of this.trail) s.material.opacity = Math.max(0, s.material.opacity - dt * 5);
    }
  }
  dispose() {
    this.root.removeFromParent();
    this.trailHost?.removeFromParent();
  }
}

/** A visiting character (Santa at Christmas): stands, idles, and can be talked to with E. */
export class NpcView {
  constructor(e) {
    this.root = new THREE.Group();
    this.root.position.set(e.x, 0, e.z);
    this.root.rotation.y = e.rot ?? 0;
    this.ch = new CharacterView({ cls: e.cls ?? 'Barbarian', look: e.look, name: e.name, weapon: null });
    this.ch.forceWear = e.wear ?? null;
    this.ch.setLook(e.look);
    this.root.add(this.ch.root);
    this.decor = e.decor === 'christmas' ? makeChristmasCorner() : e.decor === 'easter' ? makeEasterCorner()
      : e.decor === 'solstice' ? makeSolsticeArena(SOLSTICE_ARENA.z - e.z, SOLSTICE_ARENA.r) : null;
    if (this.decor) this.root.add(this.decor);
    this.time = 0;
  }
  apply() {}
  update(dt) {
    this.time += dt;
    this.ch.update(dt);
    this.decor?.userData.update?.(this.time);
  }
  dispose() { this.root.removeFromParent(); }
}

const GREETER_CLASSES = ['Mage', 'Knight', 'Rogue', 'Barbarian', 'Ranger', 'Rogue_Hooded'];
const GREETER_HAIR = ['bun', 'ponytail', 'spiky', 'pigtails', 'suave', 'bald'];
const GREETER_HELLO = ['Happy Halloween!', 'Ooh, what a costume! Here you go!', 'Trick or treat? Treat, of course!', 'Take two, they’re small!'];
const DOOR = { w: 0.9 * 1.9, h: 1.6 * 1.9, thick: 0.1 * 1.9, back: 0.43 }; // the cottage door (town.js makeCottage, scaled 1.9): its face is `back` behind the knocking spot

/**
 * Halloween at a cottage door (holidays.js treat): the door swings open, a neighbour in costume steps out
 * with a bowl of candy, says hello and goes back in, and the door shuts. `boo`: they jump out in a ghost
 * sheet instead. The cottage itself is merged into the town's static mesh, so an open doorway (dark, lit
 * a little from inside) and the swung-open door are drawn over it while it plays. `say(text, voice)` speaks
 * (null when we're too far away to hear); `onGive()` when the candy is handed over.
 */
export class DoorGreeter {
  constructor(door, { boo = false, say = null, onGive = null } = {}) {
    this.root = new THREE.Group();
    this.root.position.set(door.x, 0, door.z - DOOR.back); // the door's face, at its middle
    const house = door.house ?? 0, wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.8 });
    const inside = new THREE.Mesh(new THREE.BoxGeometry(DOOR.w, DOOR.h, 0.02), new THREE.MeshStandardMaterial({ color: 0x1c120a, emissive: 0x3a2210, roughness: 1 }));
    inside.position.set(0, DOOR.h / 2, 0.012);
    this.hinge = new THREE.Group(); // the door hangs on its left edge (the knob is on the right) and swings out
    this.hinge.position.set(-DOOR.w / 2, 0, 0);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(DOOR.w, DOOR.h, DOOR.thick), wood);
    slab.position.set(DOOR.w / 2, DOOR.h / 2, DOOR.thick / 2);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffcf3f, metalness: 0.6 }));
    knob.position.set(DOOR.w - 0.57, 1.62, DOOR.thick + 0.06);
    this.hinge.add(slab, knob);
    this.root.add(inside, this.hinge);
    // the neighbour: the same person (and costume) at this house every Halloween
    const r = (k) => ((Math.imul(house + 1, 2654435761) >>> k) & 0xffff) / 0x10000;
    this.ch = new CharacterView({ cls: GREETER_CLASSES[house % GREETER_CLASSES.length], name: `Neighbour ${house}`, weapon: null,
      look: { hat: 'none', hair: GREETER_HAIR[(house * 7 + 3) % GREETER_HAIR.length], hairColor: Object.keys(HAIR_COLORS)[(house * 5) % Object.keys(HAIR_COLORS).length] } });
    this.ch.label?.removeFromParent(); // (a name only picks their costume: no label over a neighbour)
    this.ch.root.visible = false;
    this.ch.forceWear = 'halloween';
    if (boo) this.ch.costume = 'ghost';
    this.ch.lookKey = null;
    this.ch.setLook(this.ch.look);
    this.ch.hand?.add(candyBowl());
    this.root.add(this.ch.root);
    this.boo = boo;
    this.say = say;
    this.onGive = onGive;
    this.voice = { pitch: 0.75 + r(3) * 0.6, rate: 0.95 + r(9) * 0.15 };
    this.hello = boo ? 'Boo! Ha ha, happy Halloween!' : GREETER_HELLO[house % GREETER_HELLO.length];
    this.t = 0;
  }
  get done() { return this.t > 6.2; }
  update(dt) {
    const t = (this.t += dt), ease = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
    // 0-0.9 the knock and "Trick or treat!" (GameClient), the door opens, they step out, give, step back, it shuts
    const open = (this.boo ? ease((t - 0.8) / 0.25) : ease((t - 1.0) / 0.6)) * (1 - ease((t - 5.4) / 0.6)); // (BOO: flung open)
    this.hinge.rotation.y = -open * 1.75;
    const out = this.boo ? ease((t - 0.9) / 0.25) : ease((t - 1.4) / 0.9);
    const back = ease((t - 4.4) / 0.9);
    const z = -1.5 + 1.95 * out - 1.95 * back; // from inside the house to just out of the doorway, and back in
    const ch = this.ch;
    ch.root.visible = t > 0.9 && back < 0.9; // (gone inside before the door shuts: a ghost's sheet is wide)
    ch.root.position.set(0, this.boo && t < 1.4 ? Math.sin(Math.min(1, (t - 0.9) / 0.5) * Math.PI) * 0.5 : 0, z);
    ch.root.rotation.y = back > 0.05 ? Math.PI : 0;
    const walking = (out > 0.02 && out < 0.98) || (back > 0.02 && back < 0.98);
    if (ch.oneShot == null) ch.setBase(walking ? 'walk' : 'idle');
    if (!this.greeted && t > (this.boo ? 1.3 : 2.4)) {
      this.greeted = true;
      this.say?.(this.hello, this.voice);
      ch.play('cheer'); // holding the bowl out
      this.onGive?.();
    }
    ch.update(dt);
  }
  dispose() { this.root.removeFromParent(); }
}

/** An orange plastic pumpkin bowl heaped with sweets, for the hand slot. */
function candyBowl() {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 0.55; pts.push(new THREE.Vector2(0.05 + Math.sin(a) * 0.26, -Math.cos(a) * 0.2 + 0.2)); }
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.5, side: THREE.DoubleSide }));
  g.add(bowl);
  const colors = [0xff3a6a, 0xffe14a, 0x6ad06a, 0x7a5cff, 0xffffff, 0x8a4a24];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, rr = 0.07 + (i % 3) * 0.06;
    const sweet = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 5), new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.4 }));
    sweet.position.set(Math.cos(a) * rr, 0.17 + (i % 2) * 0.04, Math.sin(a) * rr);
    sweet.scale.set(1, 0.8, 1.4);
    g.add(sweet);
  }
  g.position.set(0, 0.05, 0.12);
  return g;
}

/**
 * The Solstice Arena's warriors: built like the family (the same characters, so the same size and shape,
 * running and swinging the same way) in armour: `cls` the body, `tint` gilds the outfit's own armour,
 * `armor` [colour, tier] the chest plate and pauldrons, `helmet` a hand-made one, `halo` a burning ring.
 */
const WARRIORS = {
  gladiator:     { cls: 'Barbarian', weapon: 'sword', shield: 'woodshield', armor: [0xc88a3a, 1], helmet: 'gladiator', look: { hat: 'none', cape: 'none' } },
  sunarcher:     { cls: 'Ranger', weapon: 'longbow', armor: [0xe8c45a, 1], look: { hat: 'own', cape: 'own', dye: 'sunny' } },
  sunknight:     { cls: 'Knight', weapon: 'royalsword', shield: 'royalshield', armor: [0xf6e2a0, 2], tint: 0xffe8a8, glow: 0x2a1a00, look: { hat: 'own', cape: 'own', dye: 'sunny' } },
  flamegladiator: { cls: 'Barbarian', weapon: 'greataxe', shield: 'spikeshield', armor: [0x4a4a52, 2], tint: 0x8a8a96, glow: 0x3a0e00, helmet: 'flame', look: { hat: 'none', cape: 'none' } },
  sunpaladin:    { cls: 'Knight', weapon: 'royalsword', shield: 'starshield', armor: [0xfff6d8, 3], tint: 0xfff4d8, glow: 0x3a2a00, look: { hat: 'own', cape: 'own', dye: 'sky' } },
  sunking:       { cls: 'Knight', weapon: 'solarblade', armor: [0xffb020, 4], tint: 0xffc850, glow: 0x8a4000, halo: true, crown: true, look: { hat: 'none', cape: 'own', dye: 'ruby' } },
  solarchampion: { cls: 'Knight', weapon: 'greatsword', armor: [0xffc83a, 3], tint: 0xffd870, glow: 0x6a3800, halo: true, look: { hat: 'own', cape: 'own', dye: 'ruby' } },
};
const ARMOUR_PART = /_(Helmet|HelmetVisor|Body|ArmLeft|ArmRight|LegLeft|LegRight)$/;

/** A bronze gladiator's helmet with a red crest front to back (hat frame: head 1 wide, y 0 on top). */
function gladiatorHelmet(metal = 0xc88a3a, crest = 0xc8202a) {
  const g = new THREE.Group(), bronze = new THREE.MeshStandardMaterial({ color: metal, metalness: metal === 0xc88a3a ? 0.7 : 0.3, roughness: metal === 0xc88a3a ? 0.3 : 0.45 }), red = new THREE.MeshStandardMaterial({ color: crest, roughness: 0.8, emissive: crest === 0xc8202a ? 0x000000 : crest, emissiveIntensity: 0.35 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.58, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), bronze);
  dome.position.y = -0.48; // (its top just over the top of the head)
  g.add(dome);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.06), bronze); // the nose guard
  guard.position.set(0, -0.58, 0.56);
  g.add(guard);
  for (let i = 0; i < 9; i++) { // the crest, a fan of red bristles over the top
    const a = -1.0 + i * 0.25, b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.09), red);
    b.position.set(0, -0.48 + Math.cos(a) * 0.64, Math.sin(a) * 0.64);
    b.rotation.x = a;
    g.add(b);
  }
  return g;
}

/** A ring of fire floating behind the Solar Champion's head, turning slowly. */
function sunHalo() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 32), new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xff8a1a, emissiveIntensity: 1.2 }));
  g.add(ring);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, ray = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 6), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xff7a1a, emissiveIntensity: 1 }));
    ray.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0);
    ray.rotation.z = a - Math.PI / 2;
    g.add(ray);
  }
  g.position.set(0, -0.45, -0.6);
  g.userData.update = (t) => { g.rotation.z = t * 0.6; };
  return g;
}

export class WarriorView {
  constructor(e) {
    const W = WARRIORS[e.variant];
    this.root = new THREE.Group();
    this.ch = new CharacterView({ cls: W.cls, look: W.look, name: null, weapon: W.weapon, shield: W.shield ?? null });
    this.ch.noSeasonWear = true; // (no bobble hats in the arena)
    this.ch.setLook(W.look);
    if (W.tint) { // gild the outfit's own armour
      this.ch.model.traverse((o) => {
        if (!o.isMesh || !ARMOUR_PART.test(o.name)) return;
        const list = Array.isArray(o.material), tint = new THREE.Color(W.tint);
        const mats = [o.material].flat().map((m, i) => { // (skin, first in a list, stays skin)
          const c = m.clone();
          if (!list || i > 0) { c.color.multiply(tint).multiplyScalar(1.25); c.metalness = Math.min(c.metalness ?? 0, 0.25); if (W.glow) c.emissive?.setHex(W.glow); }
          return c;
        });
        o.material = list ? mats : mats[0];
      });
    }
    const parts = buildArmor(W.armor[0], W.armor[1]);
    this.ch.attach('front', parts.chest);
    this.ch.attach('shoulderl', parts.left);
    this.ch.attach('shoulderr', parts.right);
    if (W.helmet === 'gladiator') this.ch.attach('hat', gladiatorHelmet());
    if (W.helmet === 'flame') this.ch.attach('hat', gladiatorHelmet(0x9a9aa6, 0xff6a1a)); // iron, a crest of flame
    if (W.crown) this.ch.attach('hat', buildHat('crown'));
    if (W.halo) this.ch.attach('hat', sunHalo());
    this.ch.flashMats = null;
    this.root.add(this.ch.root);
    const s = e.scale ?? 1;
    this.ch.root.scale.setScalar(s);
    this.hpBar = makeHpBar(e.boss ? 3 : 1.2);
    this.hpBar.group.position.y = 2.6 * s + 0.3;
    this.hpBar.group.visible = !!e.boss;
    this.root.add(this.hpBar.group);
    if (e.boss || e.name) {
      const label = makeLabel(e.name ?? '', '#ffd23f');
      label.position.y = this.hpBar.group.position.y + 0.6;
      if (e.name) this.root.add(label);
    }
    this.maxHp = e.maxHp;
    this.flash = 0;
    this.still = 0;
    this.swingCd = Math.random() * 0.6;
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
    const p = this.root.position, k = smooth(dt, 14);
    const moving = Math.hypot(this.target.x - p.x, this.target.z - p.z) > 0.03;
    p.x += (this.target.x - p.x) * k;
    p.z += (this.target.z - p.z) * k;
    this.root.rotation.y = lerpAngle(this.root.rotation.y, this.target.rot, k);
    // run when moving; stopped next to someone, they're fighting: a swing (or a bow shot) now and then
    this.still = moving ? 0 : this.still + dt;
    this.swingCd -= dt;
    if (this.anim === 'leap' && !this.leapt) { this.leapt = true; this.ch.play('attack'); } // a sun knight's pounce
    if (this.anim !== 'leap') this.leapt = false;
    if (!moving && this.still > 0.3 && this.swingCd <= 0) { this.ch.play('attack'); this.swingCd = 1.1 + Math.random() * 0.4; }
    this.ch.setBase(moving || this.anim === 'leap' ? 'run' : 'idle');
    this.ch.update(dt);
    this.flash = Math.max(0, this.flash - dt);
    const glow = this.flash > 0 ? 1 : 0;
    if (glow !== this.glow) { this.glow = glow; for (const m of this.ch.materials()) m.emissive.setScalar(glow); }
  }

  dispose() { this.root.removeFromParent(); }
}

export function makeEntityView(e) {
  switch (e.type) {
    case 'slime': return WARRIORS[e.variant] ? new WarriorView(e) : hasMobBody(e.variant) ? new MobView(e, makeLabel) : new SlimeView(e);
    case 'rock': return new RockView(e);
    case 'drop': return new DropView(e);
    case 'chest': return new ChestView(e);
    case 'barrel': return new BarrelView(e);
    case 'shot': return new ShotView(e);
    case 'pet': return new PetEntityView(e, makeLabel);
    case 'ladder': return new LadderView(e);
    case 'furniture': return new FurnitureView(e, makeLabel);
    case 'dummy': return new DummyView(e);
    case 'npc': return new NpcView(e);
    default: return null;
  }
}
