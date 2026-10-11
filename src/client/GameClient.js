// One player's view of the game. Renders whatever location the server says
// we're in, moves our own character locally, and sends intents to the host.
import * as THREE from 'three';
import { PLAYER_RADIUS, PLAYER_SPEED, SEND_HZ, INTERACT_RANGE, PROTOCOL_VERSION, ROLL_TIME, ROLL_SPEED, ROLL_COOLDOWN, SPELL_COOLDOWN, SPELL_RADIUS, cleanLook } from '../shared/config.js';
import { buildLayout } from '../shared/locations.js';
import { moveCircle } from '../shared/physics.js';
import { ITEMS, weaponCooldown } from '../shared/items.js';
import { LocationView } from './LocationView.js';
import { CharacterView, Debris, NovaRing, makeEntityView } from './views.js';
import { Input } from './input.js';
import { Hud } from './hud.js';
import { Music, moodFor } from './music.js';

export class GameClient {
  /**
   * @param conn     connection to the GameServer (local or remote)
   * @param profile  { id, name, cls, look }
   * @param opts     { isHost, onQuit, onSave, onExport, onProfile }
   */
  constructor(conn, profile, opts) {
    this.conn = conn;
    this.profile = profile;
    this.opts = opts;
    this.layout = null;
    this.locView = null;
    this.ents = new Map();        // id -> { data, view }
    this.others = new Map();      // playerId -> CharacterView
    this.me = null;               // our CharacterView
    this.pos = { x: 0, z: 0, rot: 0 };
    this.anim = 'idle';
    this.sendTimer = 0;
    this.attackTimer = 0;
    this.rolling = 0;             // seconds left in a dodge roll
    this.rollCooldown = 0;
    this.spellCooldown = 0;       // the area spell: seconds until it's ready again
    this.lastSent = '';
    this.zoom = 1.1;
    this.time = 0;
    this.world = null;
    this.self = null;
    this.effects = [];            // short-lived things like debris

    this.music = new Music();
    this.music.unlock(); // we're usually still inside the Play/Join click
    this.setupRenderer();
    this.input = new Input(this.renderer.domElement);
    this.hud = new Hud(document.getElementById('hud'), { onModalChange: (open) => { this.input.enabled = !open; } });

    conn.onMessage((msg) => this.onMessage(msg));
    conn.onClose(() => this.hud.fatal('Disconnected', opts.isHost ? 'The game stopped.' : 'Lost connection to the host. Ask them to check their tab is still open.'));
    conn.send({ t: 'hello', protocol: PROTOCOL_VERSION, playerId: profile.id, name: profile.name, cls: profile.cls, look: cleanLook(profile.look), isHost: !!opts.isHost });

    this.lastFrame = performance.now();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  setupRenderer() {
    const r = new THREE.WebGLRenderer({ antialias: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.setSize(innerWidth, innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    document.getElementById('game').append(r.domElement);
    this.renderer = r;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 300);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 1);
    this.sun = new THREE.DirectionalLight(0xfff1dd, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.hemi, this.sun, this.sun.target);
    // lantern that follows you in dark places
    this.lantern = new THREE.PointLight(0xffd9a0, 30, 22, 1.4);
    this.scene.add(this.lantern);

    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      r.setSize(innerWidth, innerHeight);
    });
  }

  // ---------------------------------------------------------------- messages

  onMessage(msg) {
    switch (msg.t) {
      case 'welcome': this.you = msg.you; break;
      case 'world':
        this.world = msg;
        this.hud.setWorld(msg);
        this.locView?.setFlags(msg.flags);
        break;
      case 'self':
        if (this.self && msg.hp < this.self.hp) this.me?.play('hurt');
        this.self = msg;
        this.hud.setSelf(msg);
        this.me?.setWeapon(msg.weapon);
        this.me?.setShield(msg.shield);
        break;
      case 'enter': this.enterLocation(msg); break;
      case 'snap': this.applySnapshot(msg); break;
      case 'fx': this.onFx(msg); break;
      case 'toast': this.hud.toast(msg.text, msg.big); break;
      case 'chestState': this.hud.setChest(msg.storage); break;
      case 'chat': this.hud.chat(msg.from, msg.text); break;
      case 'roster': this.hud.setRoster(msg.players); break;
      case 'ui': this.openUi(msg); break;
      case 'kicked': this.hud.fatal('Could not join', msg.reason); break;
    }
  }

  enterLocation(msg) {
    // tear down the old place
    this.locView?.dispose();
    for (const { view } of this.ents.values()) view?.dispose();
    for (const v of this.others.values()) v.dispose();
    this.ents.clear();
    this.others.clear();
    this.hud.closeModal();

    this.epoch = msg.epoch;
    this.layout = buildLayout(msg.key, msg.seed);
    this.locView = new LocationView(this.layout, this.world);
    this.scene.add(this.locView.group);
    for (const e of msg.ents) this.addEnt(e);

    const dark = this.layout.dark;
    const theme = this.locView.theme;
    this.scene.background = new THREE.Color(theme.bg);
    this.scene.fog = dark ? new THREE.Fog(theme.bg, 24, 60) : this.layout.theme === 'outdoor' ? new THREE.Fog(theme.bg, 70, 160) : null;
    this.hemi.intensity = theme.ambient;
    this.sun.intensity = theme.sun;
    this.lantern.visible = dark;
    this.lantern.color.set(theme.lantern ?? 0xffd9a0);

    if (!this.me) this.me = this.makeMe();
    this.scene.add(this.me.root);
    this.pos = { x: msg.x, z: msg.z, rot: Math.PI };
    this.me.root.position.set(msg.x, 0, msg.z);
    this.snapCamera = true;
    this.hud.setLocation(this.layout.title);
    this.music.setMood(moodFor(this.layout));
    for (const p of msg.players) if (p.id !== this.you) this.updateOther(p);
  }

  makeMe() {
    return new CharacterView({ cls: this.profile.cls, look: this.profile.look, name: this.profile.name, weapon: this.self?.weapon, shield: this.self?.shield, isLocal: true });
  }

  /** Wardrobe pick: swap our model right away, tell the host, remember it in the profile. */
  changeOutfit(cls, look) {
    look = cleanLook(look, this.self?.closet);
    if (cls !== this.profile.cls) {
      const old = this.me;
      this.profile.cls = cls;
      this.me = this.makeMe();
      this.me.root.position.copy(old.root.position);
      this.me.root.rotation.y = old.root.rotation.y;
      old.dispose();
      this.scene.add(this.me.root);
    }
    this.profile.look = look;
    this.me.setLook(look);
    this.me.play('cheer');
    this.opts.onProfile?.(this.profile);
    this.conn.send({ t: 'wardrobe', cls, look });
  }

  addEnt(e) {
    const view = makeEntityView(e);
    if (view) this.scene.add(view.root);
    this.ents.set(e.id, { data: e, view });
  }

  applySnapshot(msg) {
    const seen = new Set();
    for (const p of msg.players) {
      if (p.id === this.you) continue;
      seen.add(p.id);
      this.updateOther(p);
    }
    for (const [id, v] of this.others) if (!seen.has(id)) { v.dispose(); this.others.delete(id); }

    for (const e of msg.ents) {
      const known = this.ents.get(e.id);
      if (!known) { if (e.type) this.addEnt(e); continue; }
      Object.assign(known.data, e);
      known.view?.apply(known.data);
    }
    for (const id of msg.gone) {
      this.ents.get(id)?.view?.dispose();
      this.ents.delete(id);
    }
  }

  updateOther(p) {
    let v = this.others.get(p.id);
    if (v && v.cls !== p.cls) { v.dispose(); this.others.delete(p.id); v = null; } // changed outfit
    if (!v) {
      v = new CharacterView({ cls: p.cls, look: p.look, name: p.name, weapon: p.weapon, shield: p.shield });
      v.lastAct = p.act;
      this.scene.add(v.root);
      this.others.set(p.id, v);
    }
    v.setTarget(p);
    v.setWeapon(p.weapon);
    v.setLook(p.look);
    v.setShield(p.shield);
    if (p.act !== v.lastAct) { v.lastAct = p.act; v.play('attack'); }
  }

  onFx(msg) {
    const view = msg.id && (this.ents.get(msg.id)?.view ?? this.others.get(msg.id));
    switch (msg.kind) {
      case 'dmg': view?.hit?.(); this.floatAt(msg, `-${msg.amount}`, '#fff27a'); break;
      case 'hit': view?.hit?.(); break;
      case 'hurt':
        if (msg.id === this.you) this.floatAt(this.pos, `-${msg.amount}`, '#ff5a5a');
        else { view?.play?.('hurt'); this.floatAt(msg, `-${msg.amount}`, '#ff5a5a'); }
        break;
      case 'heal': this.floatAt(msg, `+${msg.amount}`, '#7dff8a'); break;
      case 'forge':
        this.floatAt(msg, 'Clang! ⚒', '#ffb070');
        this.addEffect(new Debris(msg.x, msg.z, [0xff8a30, 0xffd23f, 0xfff27a], 14));
        break;
      case 'faint':
        this.floatAt(msg, '💤 Fainted!', '#c9c9ff');
        this.addEffect(new Debris(msg.x, msg.z, [0xffffff, 0xc9c9ff], 10));
        break;
      case 'petlevel': this.floatAt(msg, `Pet level ${msg.level}!`, '#c9f7ff'); break;
      case 'evolve':
        this.floatAt(msg, '✨ EVOLVED! ✨', '#ffd23f');
        this.addEffect(new Debris(msg.x, msg.z, [0xffd23f, 0xff9ad5, 0x7fd4ff, 0xffffff], 24));
        break;
      case 'levelup':
        this.floatAt(msg, `LEVEL ${msg.level}!`, '#ffd23f');
        (msg.id === this.you ? this.me : view)?.play?.('cheer');
        this.addEffect(new Debris(msg.x, msg.z, [0xffd23f, 0xfff27a, 0xffffff], 18));
        break;
      case 'dodge': if (msg.id === this.you) this.floatAt(this.pos, 'Dodged!', '#c9f7ff'); break;
      case 'block': this.floatAt(msg.id === this.you ? this.pos : msg, 'Blocked!', '#9fd8ff'); break;
      case 'pickup': this.floatAt(this.pos, `+${msg.qty} ${msg.item === 'gold' ? 'gold' : ITEMS[msg.item]?.name ?? msg.item}`, msg.item === 'gold' ? '#ffd23f' : '#bfe7ff'); break;
      case 'chest': this.floatAt(msg, 'Treasure!', '#ffd23f'); break;
      case 'smash': this.addEffect(new Debris(msg.x, msg.z, [0x9a6a3c, 0x7a5030, 0xb58250, 0x5a5a5a])); break;
      case 'nova': this.addEffect(new NovaRing(msg.x, msg.z, SPELL_RADIUS)); break;
      case 'break': this.addEffect(new Debris(msg.x, msg.z, [0x8d8d8d, 0x6e6e6e, 0xa8a29a], 10)); break;
    }
  }

  addEffect(fx) {
    this.scene.add(fx.root);
    this.effects.push(fx);
  }

  floatAt(p, text, color) {
    const v = new THREE.Vector3(p.x, 2.6, p.z).project(this.camera);
    const x = (v.x * 0.5 + 0.5) * innerWidth + (Math.random() - 0.5) * 30;
    const y = (-v.y * 0.5 + 0.5) * innerHeight;
    this.hud.float(text, x, y, color);
  }

  openUi(msg) {
    if (msg.kind === 'shop') {
      this.hud.openShop({
        stock: msg.stock,
        onBuy: (item) => this.conn.send({ t: 'buy', item }),
        onSell: (item, qty) => this.conn.send({ t: 'sell', item, qty }),
        onBuyStyle: (slot, id) => this.conn.send({ t: 'buyStyle', slot, id }),
      });
    } else if (msg.kind === 'forge') {
      this.hud.openForge({ onForge: (recipe) => this.conn.send({ t: 'forge', recipe }) });
    } else if (msg.kind === 'pets') {
      this.openPets(true);
    } else if (msg.kind === 'mirror') {
      this.pos.rot = 0;
      this.closeUp = 'face';
      this.hud.openMirror({
        look: cleanLook(this.profile.look, this.self?.closet),
        onChange: (look) => this.changeOutfit(this.profile.cls, look),
        onClose: () => { this.closeUp = false; },
      });
    } else if (msg.kind === 'wardrobe') {
      this.pos.rot = 0; // turn to face the camera
      this.closeUp = true;
      this.hud.openWardrobe({
        cls: this.profile.cls,
        look: cleanLook(this.profile.look, this.self?.closet),
        onChange: (cls, look) => this.changeOutfit(cls, look),
        onClose: () => { this.closeUp = false; },
      });
    } else if (msg.kind === 'chest') {
      this.hud.openChest({ storage: msg.storage, onStash: (item, qty, dir) => this.conn.send({ t: 'stash', item, qty, dir }) });
    } else if (msg.kind === 'elevator') {
      this.hud.openElevator({ name: msg.name, floors: msg.floors, onPick: (floor) => this.conn.send({ t: 'elevator', dungeon: msg.dungeon, floor }) });
    }
  }

  /** The pet screen: adopting only at the Pet Keeper (`shop`), managing your pets anywhere (P). */
  openPets(shop = false) {
    this.hud.openPets({
      shop,
      onBuy: (species) => this.conn.send({ t: 'buyPet', species }),
      onPick: (id) => this.conn.send({ t: 'pickPet', id }),
      onRename: (id, name) => this.conn.send({ t: 'renamePet', id, name }),
      onRevive: (id) => this.conn.send({ t: 'revivePet', id }),
    });
  }

  // ---------------------------------------------------------------- per frame

  frame() {
    const now = performance.now();
    const dt = Math.min((now - this.lastFrame) / 1000, 0.1);
    this.lastFrame = now;
    this.time += dt;
    this.input.poll();
    if (this.layout && this.me) this.updateLocal(dt);
    for (const { view } of this.ents.values()) view?.update(dt);
    for (const v of this.others.values()) v.update(dt);
    this.me?.update(dt);
    for (const fx of this.effects) fx.update(dt);
    this.effects = this.effects.filter((fx) => !fx.done || (fx.dispose(), false));
    this.locView?.update(dt, this.time);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  solids() {
    const out = [...this.layout.solids];
    for (const { data } of this.ents.values()) {
      if (data.type === 'rock' || data.type === 'chest' || data.type === 'barrel') out.push({ x: data.x, z: data.z, r: data.r });
    }
    return out;
  }

  updateLocal(dt) {
    const input = this.input;
    if (input.consume('menu')) {
      if (this.hud.modalOpen) this.hud.closeModal();
      else this.hud.openMenu({ isHost: this.opts.isHost, music: this.music, onSave: () => { this.opts.onSave?.(); this.hud.toast('Saved!'); }, onExport: this.opts.onExport, onQuit: this.opts.onQuit });
    }
    if (input.consume('sheet')) {
      if (this.hud.modalOpen) this.hud.closeModal();
      else this.hud.openSheet({
        onSpend: (stat) => this.conn.send({ t: 'spend', stat }),
        onEquip: (item, slot) => this.conn.send({ t: 'equip', item, slot }),
      });
    }
    if (input.consume('pets')) {
      if (this.hud.modalOpen) this.hud.closeModal();
      else this.openPets(false);
    }
    if (input.consume('music')) this.hud.toast(this.music.toggleMute() ? 'Music off (M)' : 'Music on (M)');
    if (input.consume('chat')) {
      input.enabled = false;
      this.hud.openChat().then((text) => {
        input.enabled = !this.hud.modalOpen;
        input.clear();
        if (text) this.conn.send({ t: 'chat', text });
      });
    }

    // movement (client-side, so it feels instant)
    const m = input.move();
    let moving = m.x !== 0 || m.z !== 0;
    this.rollCooldown -= dt;
    if (input.consume('roll') && this.rolling <= 0 && this.rollCooldown <= 0 && this.self?.hp > 0) {
      // roll the way you're pushing, or straight ahead if standing still
      if (moving) this.pos.rot = Math.atan2(m.x, m.z);
      this.rolling = ROLL_TIME;
      this.rollCooldown = ROLL_COOLDOWN;
      this.me.roll(ROLL_TIME);
      this.conn.send({ t: 'roll' });
    }
    if (this.rolling > 0) {
      this.rolling -= dt;
      const sx = Math.sin(this.pos.rot) * ROLL_SPEED * dt, sz = Math.cos(this.pos.rot) * ROLL_SPEED * dt;
      const next = moveCircle(this.layout, this.pos.x, this.pos.z, sx, sz, PLAYER_RADIUS, this.solids());
      this.pos.x = next.x; this.pos.z = next.z;
      moving = false;
    } else if (moving) {
      const next = moveCircle(this.layout, this.pos.x, this.pos.z, m.x * PLAYER_SPEED * dt, m.z * PLAYER_SPEED * dt, PLAYER_RADIUS, this.solids());
      this.pos.x = next.x; this.pos.z = next.z;
      this.pos.rot = Math.atan2(m.x, m.z);
    }
    this.anim = this.rolling > 0 ? 'roll' : moving ? 'run' : 'idle';
    if (this.rolling <= 0) this.me.setBase(this.anim);
    this.me.root.position.set(this.pos.x, 0, this.pos.z);
    const r = this.me.root.rotation;
    r.y += (((this.pos.rot - r.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 18);

    // actions
    this.attackTimer -= dt;
    if (input.consume('attack') && this.attackTimer <= 0 && this.rolling <= 0) {
      this.attackTimer = weaponCooldown(this.self?.weapon);
      this.me.play('attack');
      this.conn.send({ t: 'attack', rot: this.pos.rot });
    }
    if (input.consume('feed')) this.conn.send({ t: 'feedPet' });
    this.spellCooldown -= dt;
    if (input.consume('spell') && this.rolling <= 0 && this.self?.hp > 0) {
      if (this.spellCooldown > 0) this.hud.toast(`Area spell ready in ${Math.ceil(this.spellCooldown)}s`);
      else {
        this.spellCooldown = SPELL_COOLDOWN;
        this.conn.send({ t: 'spell' });
      }
    }
    this.hud.setSpell(this.spellCooldown);
    if (input.consume('potion')) {
      const inv = this.self?.inventory ?? {};
      const item = ['potion', 'bigpotion', 'cocoa'].find((id) => inv[id]) ?? null;
      if (item) this.conn.send({ t: 'use', item });
      else this.hud.toast('No potions! Buy some in town.');
    }
    const near = this.nearestInteractable();
    this.hud.prompt(near && !this.hud.modalOpen ? near.prompt : null);
    if (input.consume('interact') && near) this.conn.send({ t: 'interact', id: near.id });

    // tell the host where we are
    this.sendTimer -= dt;
    if (this.sendTimer <= 0) {
      this.sendTimer = 1 / SEND_HZ;
      const msg = { t: 'move', epoch: this.epoch, x: round(this.pos.x), z: round(this.pos.z), rot: round(this.pos.rot), anim: this.anim };
      const key = `${msg.epoch},${msg.x},${msg.z},${msg.rot},${msg.anim}`;
      if (key !== this.lastSent) { this.conn.send(msg); this.lastSent = key; }
    }

    this.lantern.position.set(this.pos.x, 4, this.pos.z + 1);
  }

  nearestInteractable() {
    let best = null, bestD = Infinity;
    for (const p of this.layout.props) {
      if (!p.interact) continue;
      const d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z) - p.radius;
      if (d < INTERACT_RANGE && d < bestD) { best = p; bestD = d; }
    }
    return best;
  }

  updateCamera(dt) {
    this.zoom = Math.max(0.55, Math.min(1.8, this.zoom + this.input.takeWheel() * 0.1));
    const target = new THREE.Vector3(this.pos.x, 1, this.pos.z);
    if (this.closeUp && !this.hud.modalOpen) this.closeUp = false;
    // wardrobe: swing in close, and shift the view so we stand left of the panel
    const offset = this.closeUp === 'face' ? new THREE.Vector3(0, 2.2, 5.2)
      : this.closeUp ? new THREE.Vector3(0, 5.5, 9) : new THREE.Vector3(0, 17, 15).multiplyScalar(this.zoom);
    if (this.closeUp === 'face') { target.x += 0.9; target.y = 1.9; }
    else if (this.closeUp) target.x += 1.6;
    const want = target.clone().add(offset);
    if (this.snapCamera) { this.camera.position.copy(want); this.snapCamera = false; }
    else this.camera.position.lerp(want, 1 - Math.exp(-dt * 6));
    // look along a fixed direction so the view never wobbles while it catches up
    this.camera.lookAt(this.camera.position.clone().sub(offset));
    // the sun's shadow box follows the player
    this.sun.position.set(this.pos.x - 15, 35, this.pos.z + 10);
    this.sun.target.position.set(this.pos.x, 0, this.pos.z);
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.renderer.domElement.remove();
    this.conn.close();
  }
}

function round(v) {
  return Math.round(v * 100) / 100;
}
