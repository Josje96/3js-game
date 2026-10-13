// 3D views for things that move or change: characters, slimes, rocks, drops...
import * as THREE from 'three';
import { CLASSES, HATS, CAPES, BACKS, DYES, HAIR_COLORS, SKINS, CLOTHES, TIE_COLORS } from '../shared/config.js';
import { ITEMS, SWING_COOLDOWN } from '../shared/items.js';
import { ROLL_TIME } from '../shared/config.js';
import { cloneCharacter, cloneModel, characterClips, characterScene } from './assets.js';
import { browsOf, browlessHead, buildCostumeHat, COSTUMES, HALLOWEEN_COSTUMES, buildWinterWear, buildHat, buildBack, buildHair, buildFace, buildScalp, buildClothes, buildArmor, hairlessHead, scalpOf, skinSplit, sweptCape, buildBrows } from './cosmetics.js';
import { PetEntityView } from './pets.js';
import { MobView, hasMobBody } from './enemies.js';
import { ENEMIES } from '../shared/dungeons.js';
import { FurnitureView } from './furniture.js';
import { dropTinyShadows } from './merge.js';
import { enchantWeapon } from './enchant.js';
import { glowTexture } from './effects.js';
import { makeChristmasCorner, makeEasterCorner } from './town.js';

// sitting on a chair: how far the body drops and leans back, and how the legs and arms bend (radians)
const SIT_DROP = 0.12, SIT_BACK = -0.1, SIT_HIP = -1.5, SIT_KNEE = 1.5, SIT_ARM = 0.5;
// lying in bed: the body (feet first) sits this far towards the foot of the bed so the head lands on the pillow
const SLEEP_FORWARD = 0.5;
const SKIRT_GAP = 0.15, SKIRT_MAX_FLARE = 1.7; // skirts: room left round a leg (in body widths), and how far they may flare

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
const COATS = [0xb8333a, 0x2f4f8a, 0x2f7a4a, 0x7a3f8a, 0xc9862e, 0x3f8a8a];

export class CharacterView {
  constructor({ cls, look, name, weapon, ench = 0, shield = null, armor = null, isLocal = false }) {
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
    this.costume = HALLOWEEN_COSTUMES[(Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 16) % HALLOWEEN_COSTUMES.length]; // the same costume every Halloween
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
    const model = ITEMS[id]?.model;
    if (model && this.hand) {
      this.weaponObj = tintModel(cloneModel(model), ITEMS[id].tint);
      if (ench > 0) this.weaponFx = enchantWeapon(this.weaponObj, ench);
      this.hand.add(this.weaponObj);
      this.flashMats = null; // new materials: collect them again for the low-health flash
    }
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
    const anchor = (boneName, pos, size) => {
      const bone = this.model.getObjectByName(boneName);
      if (!bone) return null;
      const scale = size.isVector3 ? size : new THREE.Vector3(size, size, size);
      const local = bone.matrixWorld.clone().invert()
        .multiply(new THREE.Matrix4().compose(pos, new THREE.Quaternion(), scale));
      return { bone, local };
    };
    const out = {};
    if (head) {
      const b = new THREE.Box3().setFromObject(head);
      out.hat = anchor('head', new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y - 0.05, (b.min.z + b.max.z) / 2), b.max.x - b.min.x);
      // the face: front of the head, a bit below the middle (where the eyes are on these chibi heads)
      out.face = anchor('head', new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y + (b.max.y - b.min.y) * FACE_EYE_HEIGHT, b.max.z - 0.02), b.max.x - b.min.x);
      // the eyebrows: exactly where the outfit's own were (cosmetics.js browsOf)
      const ownBrows = head.material.map?.image ? browsOf(head.geometry, head.material.map.image) : null;
      if (ownBrows) out.brows = anchor('head', ownBrows.centre.clone().applyMatrix4(head.matrixWorld), b.max.x - b.min.x);
      // the skull under a new hairstyle (the head mesh is hollow where its own hair was)
      const size = b.getSize(new THREE.Vector3());
      const centre = b.getCenter(new THREE.Vector3()).add(new THREE.Vector3(0, size.y * 0.06, -size.z * 0.02));
      out.scalp = anchor('head', centre, new THREE.Vector3(size.x * 0.93, size.y * 0.86, size.z * 0.9));
      // under a new hairstyle: the skull ball and the hair both sit on the skin left after carving the
      // old hair away (cosmetics.js). Measured here, in the rest pose — measuring later, mid-animation,
      // put them wherever the head happened to be bobbing (floating hair, a scalp poking through)
      const img = head.material.map?.image, s = img ? scalpOf(head.geometry, img, head.name.replace(/_Head$/, '')) : null;
      if (s) {
        out.scalp = anchor('head', new THREE.Vector3(s.cx, s.cy, s.cz), new THREE.Vector3(s.sx, s.sy, s.sz));
        out.hair = anchor('head', new THREE.Vector3(s.hair.x, s.hair.y, s.hair.z), s.hair.size);
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

  attach(slot, obj) {
    const a = this.anchors[slot];
    if (!a || !obj) return;
    const holder = new THREE.Group();
    a.local.decompose(holder.position, holder.quaternion, holder.scale);
    holder.add(obj);
    a.bone.add(holder);
    this.borrowed.push(holder);
  }

  /** Show/hide the outfit's own hat & cape, borrow other characters' pieces, add accessories, clothes and dye. */
  setLook(look) {
    this.look = look;
    const wear = this.wear = this.seasonWear();
    const fancy = look?.clothes && look.clothes !== 'none';
    const costume = wear === 'halloween' ? this.costume : wear === 'santa' || wear === 'grandma' ? wear : null;
    if (wear === 'winter' || costume) look = { ...look, hat: 'none' }; // the bobble hat (or costume) goes on instead
    const { hat = 'own', cape = 'own', back = 'none', dye = 'none', clothes = 'none', hair = 'none', hairColor = 'brown', face = 'none', skin = 'none', tie = 'red', brows = 'soft' } = look ?? {};
    const key = `${hat}/${cape}/${back}/${dye}/${clothes}/${hair}/${hairColor}/${face}/${skin}/${tie}/${brows}/${wear}`;
    if (key === this.lookKey) return;
    this.lookKey = key;
    for (const m of this.borrowed) m.removeFromParent();
    this.borrowed = [];
    this.skirt = null;
    this.model.traverse((o) => {
      if (!o.isMesh) return;
      if (HAT_PART.test(o.name)) o.visible = hat === 'own';
      else if (CAPE_PART.test(o.name)) {
        o.visible = cape === 'own';
        o.userData.unsweptGeo ??= o.geometry;
        o.geometry = sweptCape(o.userData.unsweptGeo);
      }
    });
    const h = HATS[hat], c = CAPES[cape], bk = BACKS[back];
    if (h?.from) for (const part of h.parts) this.borrow(h.from, part);
    if (h?.build) this.attach('hat', buildHat(h.build));
    if (c) this.borrow(c.from, 'Cape');
    if (bk?.from) for (const part of bk.parts) this.borrow(bk.from, part);
    if (bk?.build) this.attach('back', buildBack(bk.build));
    // mirror: hair, face and skin
    const hc = HAIR_COLORS[hairColor]?.color ?? HAIR_COLORS.brown.color;
    const tone = SKINS[skin]?.color;
    if (this.headMesh) {
      const hm = this.headMesh;
      hm.userData.baseGeo ??= hm.geometry;
      const image = (hm.userData.baseMat ?? hm.material).map?.image, outfit = hm.name.replace(/_Head$/, '');
      // a new hairstyle carves the outfit's hair away; either way its own brows go (yours are drawn instead)
      hm.geometry = !image ? hm.userData.baseGeo : hair !== 'none' ? hairlessHead(hm.userData.baseGeo, image, outfit) : browlessHead(hm.userData.baseGeo, image);
      hm.userData.baseMat ??= hm.material;
      if (hm.material !== hm.userData.baseMat) hm.material.dispose();
      hm.material = tone ? hm.userData.baseMat.clone() : hm.userData.baseMat;
      if (tone) hm.material.color.multiply(new THREE.Color(tone));
      // (the scalp and hair anchors are measured once, in the rest pose: computeAnchors)
    }
    if (hair !== 'none') {
      this.attach(this.anchors.hair ? 'hair' : 'hat', buildHair(hair, hc));
      this.attach('scalp', buildScalp(tone));
    }
    this.attach(this.anchors.brows ? 'brows' : 'face', buildBrows(hc, brows)); // your eyebrows, in your hair colour, where the outfit's own were (they're cut out)
    if (face !== 'none') this.attach('face', buildFace(face, hc));
    // winter: a warm coat (unless you're in fancy clothes, which stay on), a bobble hat and a scarf
    this.setClothes(COSTUMES[costume]?.clothes ?? CLOTHES[clothes] ?? (wear === 'winter' && !fancy ? { jacket: this.coatColor, extra: 'coat' } : undefined), TIE_COLORS[tie]?.color);
    if (costume) this.attach('hat', buildCostumeHat(costume));
    else if (wear === 'winter') {
      const ww = buildWinterWear(this.coatColor === COATS[1] ? COATS[0] : COATS[(COATS.indexOf(this.coatColor) + 1) % COATS.length]);
      this.attach('hat', ww.hat);
      this.attach('front', ww.scarf);
    }
    // dye: give cape meshes their own copy of the (shared) material, painted a flat colour
    // (multiplying over a red cape's texture would just give muddy red)
    const tint = DYES[dye]?.color;
    const capes = [];
    this.model.traverse((o) => { if (o.isMesh && CAPE_PART.test(o.name) && o.visible) capes.push(o); });
    for (const m of capes) {
      m.userData.baseMat ??= m.material;
      if (m.material !== m.userData.baseMat) m.material.dispose();
      m.material = tint ? m.userData.baseMat.clone() : m.userData.baseMat;
      if (tint) { m.material.map = null; m.material.color.set(tint); }
    }
    this.flashMats = null; // materials changed: collect them again for the low-health flash
    dropTinyShadows(this.root);
  }

  /** What the season (or a holiday) has this character wearing right now: see SEASON_WEAR. */
  seasonWear() {
    return this.forceWear ?? (this.noSeasonWear ? null : SEASON_WEAR.value);
  }

  /** Fancy clothes: body and sleeves become a flat cloth colour (hands stay skin), legs too, plus extras. */
  setClothes(def, tieColor) {
    this.clothed = !!def;
    this.showArmor();
    this.model.traverse((o) => {
      if (!o.isMesh || !/_(Body|ArmLeft|ArmRight|LegLeft|LegRight)$/.test(o.name)) return;
      o.userData.baseGeo ??= o.geometry;
      o.userData.baseMat ??= o.material;
      if (Array.isArray(o.material)) o.material[1].dispose();
      const image = o.userData.baseMat.map?.image;
      const color = /_Leg/.test(o.name) ? def?.legs : def?.jacket;
      if (!def || color == null || !image) { o.geometry = o.userData.baseGeo; o.material = o.userData.baseMat; return; }
      const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
      o.geometry = skinSplit(o.userData.baseGeo, image);
      o.material = [o.userData.baseMat, cloth];
    });
    if (!def) return;
    const extra = buildClothes(def.extra, def.jacket, tieColor);
    if (extra.front) this.attach('front', extra.front);
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

  borrow(model, part) {
    const src = characterScene(model).getObjectByName(`${model.replace('_', '')}_${part}`);
    if (!src?.isSkinnedMesh) return;
    // same rig everywhere: rebuild the skeleton from our own bones (matched by name)
    const bones = src.skeleton.bones.map((b) => this.model.getObjectByName(b.name));
    if (bones.some((b) => !b)) return;
    const mesh = src.clone();
    mesh.material = src.material.clone();
    if (part === 'Cape') mesh.geometry = sweptCape(src.geometry);
    mesh.bind(new THREE.Skeleton(bones, src.skeleton.boneInverses), src.bindMatrix);
    mesh.visible = true;
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
    this.model.rotation.x = asleep ? -Math.PI / 2 : 0;
    this.model.position.set(0, asleep ? 1.05 : name === 'sit' ? SIT_DROP : 0, asleep ? SLEEP_FORWARD : name === 'sit' ? SIT_BACK : 0);
    if (this.label) this.label.visible = !asleep;
    if (!this.oneShot) this.fadeTo(asleep ? 'idle' : name);
  }

  /** Dodge roll: a tucked forward somersault (the rig has no roll clip). */
  roll(duration) {
    this.rollT = 0;
    this.rollDur = duration;
    this.oneShot = null;
    this.fadeTo('tuck', 0.05);
  }

  play(name) {
    if (name === 'attack') name = ITEMS[this.weaponId]?.swing ?? 'slash';
    if (!this.actions[name]) return;
    this.oneShot = this.actions[name];
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
    for (const b of this.borrowed) b.children[0]?.userData.update?.(this.time); // flapping wings
    this.weaponFx?.update(this.time);
    if (this.target) {
      const k = smooth(dt);
      this.root.position.x += (this.target.x - this.root.position.x) * k;
      this.root.position.z += (this.target.z - this.root.position.z) * k;
      this.root.rotation.y = lerpAngle(this.root.rotation.y, this.target.rot, k);
      // one somersault per roll, even if the 'roll' state lingers a little over the network
      if (this.target.anim !== 'roll') this.rollSeen = false;
      else if (!this.rollSeen) { this.rollSeen = true; this.roll(ROLL_TIME); }
      this.setBase(['run', 'sleep', 'sit'].includes(this.target.anim) ? this.target.anim : 'idle');
    }
    if (this.rollT != null) {
      this.rollT += dt;
      const u = Math.min(1, this.rollT / this.rollDur);
      this.model.rotation.x = u * Math.PI * 2;
      // spin around the middle of the body, not the feet
      this.model.position.y = Math.sin(u * Math.PI) * 0.9;
      this.model.position.z = -Math.sin(u * Math.PI * 2) * 0.35;
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
    if (this.base === 'sit' && this.rollT == null) this.sitPose();
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

  dispose() {
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
    this.decor = e.decor === 'christmas' ? makeChristmasCorner() : e.decor === 'easter' ? makeEasterCorner() : null;
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

export function makeEntityView(e) {
  switch (e.type) {
    case 'slime': return hasMobBody(e.variant) ? new MobView(e, makeLabel) : new SlimeView(e);
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
