// One player's view of the game. Renders whatever location the server says
// we're in, moves our own character locally, and sends intents to the host.
import * as THREE from 'three';
import { BACKS, FLY_HEIGHT, FLY_SPEED, CELL, PLAYER_RADIUS, PLAYER_SPEED, SEND_HZ, INTERACT_RANGE, PROTOCOL_VERSION, ROLL_TIME, ROLL_SPEED, ROLL_COOLDOWN, JUMP_TIME, SPELL_COOLDOWN, SPELL_RADIUS, cleanLook } from '../shared/config.js';
import { buildLayout, roomIndexAt } from '../shared/locations.js';
import { DUNGEONS } from '../shared/dungeons.js';
import { FURNITURE, DECORATOR_FLAG, useVerb } from '../shared/furniture.js';
import { FurnitureView } from './furniture.js';
import { moveCircle } from '../shared/physics.js';
import { ITEMS, weaponCooldown, bestHeal } from '../shared/items.js';
import { LocationView } from './LocationView.js';
import { CharacterView, Debris, makeEntityView } from './views.js';
import { NovaBlast, SlamWarning } from './effects.js';
import { Interpolator } from './interp.js';
import { Input } from './input.js';
import { Hud } from './hud.js';
import { Music, moodFor } from './music.js';
import { Sfx } from './sfx.js';
import { ENCHANT_LOOKS } from '../shared/enchant.js';
import { useDistance, flyHeightAt } from '../shared/props.js';
import { holidayOf, seasonOf, SOLSTICE_ARENA } from '../shared/seasons.js';
import { SEASON_LOOK } from './seasonfx.js';

/** What the fort looks like, reduced to what a re-render depends on (so a change re-dresses it). */
function houseKey(h) {
  return h ? JSON.stringify([h.wall, h.floor, h.roomStyles ?? {}, (h.rooms ?? []).map((r) => r.owner)]) : '';
}

/**
 * The holiday films (GameClient.checkVisit), one for each season's holiday: each returns its cast,
 * captions and colours, or null while the cast isn't in town yet. Called with `this` = the GameClient.
 */
const HOLIDAY_FILMS = {
  easter() { // Grandma and Grandpa come in from the north end of the square
    const npcs = this.filmCast((d) => d.name === 'Grandma' || d.name === 'Grandpa', (d) => ({ x: d.x - 2 + (d.name === 'Grandma' ? 2 : 0), z: d.z - 22 }));
    if (npcs.length < 2) return null;
    return { npcs, intro: '🐣 Look who’s coming to Pebble Town…', outro: '🐣 Grandma and Grandpa came for Easter! Go and say hello!', colors: [0xffb3d9, 0xfff2a8, 0xb3e6ff, 0xc8f7c5, 0xe2c8ff] };
  },
  solstice() { // the Sun Herald marches up from the market to the arena gate, and golden sparks fly
    const npcs = this.filmCast((d) => d.arenaHerald, (d) => ({ x: d.x - 6, z: d.z - 16 }));
    if (!npcs.length) return null;
    return {
      npcs, arrive: 6, end: 12, sound: 'levelup', burstAt: { x: SOLSTICE_ARENA.x, z: SOLSTICE_ARENA.z }, front: [6, 3, 1.5], // side on, the arena behind him
      intro: '☀️ The longest day of the year dawns over Pebble Town…',
      outro: '⚔️ The Solstice Arena is open! Win three rounds to earn the Solar Blade!',
      colors: [0xffd23f, 0xffb02a, 0xfff6b0, 0xff7a1a],
    };
  },
  halloween() { // nobody visits: a swoop round the jack-o'-lanterns at the fountain, then up to a cottage door
    const fountain = this.layout.props.find((p) => p.build === 'fountain');
    const doors = [...this.ents.values()].map((e) => e.data).filter((d) => d.type === 'door');
    if (!fountain || !doors.length) return null;
    const f = new THREE.Vector3(fountain.x, 0, fountain.z);
    const door = doors.sort((a, b) => Math.hypot(a.x - f.x, a.z - f.z) - Math.hypot(b.x - f.x, b.z - f.z))[0];
    const d = new THREE.Vector3(door.x, 0, door.z);
    return {
      arrive: 7.5, end: 11.5, sound: 'caw', focus: d, burstAt: d,
      intro: '🎃 The sky has gone dark over Pebble Town…',
      outro: '👻 Everyone’s in costume! Knock on the cottage doors to trick-or-treat!',
      colors: [0xff8a1a, 0x8a3ad8, 0x2a2a2a, 0x7aff5a],
      shot: (t) => {
        if (t < 5) { // round the ring of jack-o'-lanterns
          const a = -0.6 + (t / 5) * Math.PI * 1.4;
          return { pos: new THREE.Vector3(f.x + Math.sin(a) * 8, 3.2, f.z + Math.cos(a) * 8), look: new THREE.Vector3(f.x, 0.6, f.z) };
        }
        const k = Math.min(1, (t - 5) / 2.5), e = k * k * (3 - 2 * k);
        const a = -0.6 + Math.PI * 1.4, from = new THREE.Vector3(f.x + Math.sin(a) * 8, 3.2, f.z + Math.cos(a) * 8);
        return { pos: from.lerp(new THREE.Vector3(d.x + 1.5, 3.4, d.z + 6.5), e), look: f.clone().setY(0.6).lerp(d.clone().setY(1.2), e) };
      },
    };
  },
  christmas() { // Santa floats down out of the sky onto his spot in the square
    const npcs = this.filmCast((d) => d.name === 'Santa', (d) => ({ x: d.x + 3, y: 16, z: d.z - 6 }));
    if (!npcs.length) return null;
    return {
      npcs, fly: true, arrive: 7, end: 12.5, sound: 'evolve',
      intro: '🎄 Snow has fallen on Pebble Town… what’s that up in the sky?',
      outro: '🎅 Ho ho ho! Santa’s here with a present for everyone!',
      colors: [0xd8302a, 0x2a9a4a, 0xffffff, 0xffd23f],
    };
  },
};

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

    this.interp = new Interpolator();
    this.net = { ping: null, pings: new Map(), posCount: 0, posRate: 0 };
    this.music = new Music();
    this.music.unlock(); // we're usually still inside the Play/Join click
    this.sfx = new Sfx(this.music);
    this.setupRenderer();
    this.input = new Input(this.renderer.domElement);
    this.hud = new Hud(document.getElementById('hud'), { onModalChange: (open) => { this.input.enabled = !open; } });
    this.hud.onSpin = (dir) => { this.pos.rot += dir * Math.PI / 4; }; // dressing up: turn round to see the back

    conn.onMessage((msg) => this.onMessage(msg));
    conn.onClose(() => this.hud.fatal('Disconnected', opts.isHost ? 'The game stopped.' : 'Lost connection to the host. Ask them to check their tab is still open.'));
    conn.send({ t: 'hello', protocol: PROTOCOL_VERSION, playerId: profile.id, name: profile.name, cls: profile.cls, look: cleanLook(profile.look), isHost: !!opts.isHost });

    this.lastFrame = performance.now();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  setupRenderer() {
    this.gfx = loadGraphics();
    const r = new THREE.WebGLRenderer({ antialias: this.gfx !== 'low', powerPreference: 'high-performance' });
    r.setPixelRatio(pixelRatioFor(this.gfx));
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
    this.sun.shadow.mapSize.setScalar(this.gfx === 'medium' ? 1024 : 2048);
    this.sun.castShadow = this.gfx !== 'low';
    Object.assign(this.sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.hemi, this.sun, this.sun.target);
    // lantern that follows you in dark places
    this.lantern = new THREE.PointLight(0xffd9a0, 0, 22, 1.4);
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
      case 'welcome': {
        const switched = this.you != null && this.you !== msg.you; // Load character: we're someone else now
        this.you = msg.you; this.hud.you = msg.you;
        if (msg.profile) { // remember who we are, so this device comes back as them next time
          Object.assign(this.profile, { id: msg.you, name: msg.profile.name, cls: msg.profile.cls, look: msg.profile.look });
          this.opts.onProfile?.(this.profile);
        }
        if (switched && this.me) {
          const old = this.me;
          this.me = this.makeMe();
          this.me.root.position.copy(old.root.position);
          old.dispose();
          this.scene.add(this.me.root);
          this.hud.closeModal();
        }
        this.hud.onPresents = () => this.hud.openPresents({ onOpen: (item) => this.conn.send({ t: 'openPresent', item }), onSend: (item, to) => this.conn.send({ t: 'sendPresent', item, to }) });
        // the item bar (Tab / click): the arrows pick instead of walking, Enter uses the picked thing
        this.hud.onBarMode = (on) => { this.input.barMode = on; };
        this.hud.onBarUse = (sel) => {
          if (sel.kind === 'heal') this.conn.send({ t: 'use', item: sel.id });
          else if (sel.kind === 'treat') this.conn.send({ t: 'feedPet' });
          else if (sel.kind === 'gift') this.hud.onPresents();
          else if (sel.kind === 'weapon' || sel.kind === 'gear') { this.hud.setBarMode(false); this.input.pressed.add('sheet'); }
        };
        break;
      }
      case 'world': {
        const restyle = this.layout?.key === 'house' && houseKey(msg.house) !== houseKey(this.world?.house);
        this.world = msg;
        this.dayLeft = msg.dayLeft;
        if (restyle) this.rebuildScenery();
        this.hud.setWorld(msg);
        this.locView?.setWorld(msg);
        this.checkUnlocks();
        break;
      }
      case 'house': {
        const restyle = this.layout?.key === 'house' && houseKey(msg) !== houseKey(this.world?.house);
        this.house = msg;
        if (this.world) this.world.house = { wall: msg.wall, floor: msg.floor, roomStyles: msg.roomStyles, rooms: msg.rooms }; // keep world in step
        if (restyle) this.rebuildScenery();
        this.hud.refreshModal?.();
        this.hud.renderBuild?.(this);
        break;
      }
      case 'self':
        if (this.self && msg.hp < this.self.hp) this.me?.play('hurt');
        this.self = msg;
        this.hud.setSelf(msg);
        this.me?.setWeapon(msg.weapon, msg.enchants?.[msg.weapon]);
        this.me?.setShield(msg.shield);
        this.me?.setArmor(msg.armor);
        this.me?.setHelmet(msg.helmet);
        this.me?.setHealth(msg.hp / msg.maxHp);
        this.hud.setDanger(msg.hp / msg.maxHp);
        break;
      case 'enter': this.enterLocation(msg); break;
      case 'snap': this.applySnapshot(msg); break;
      case 'pos': this.onPos(msg); break;
      case 'pong': this.net.ping = performance.now() - (this.net.pings.get(msg.id) ?? performance.now()); this.net.pings.delete(msg.id); break;
      case 'fx': this.onFx(msg); break;
      case 'toast': this.hud.toast(msg.text, msg.big); break;
      case 'night': this.sleeping = false; this.sfx.play('night'); this.hud.nightScreen(msg); break;
      case 'chestState': this.hud.setChest(msg.storage, msg.ench); break;
      case 'chat': this.hud.chat(msg.from, msg.text); break;
      case 'roster': this.hud.setRoster(msg.players); break;
      case 'ui': this.openUi(msg); break;
      case 'kicked': this.hud.fatal('Could not join', msg.reason); break;
    }
  }

  /** Off the chair: step out in front of it (it's solid, so you'd be stuck inside otherwise). */
  standUp() {
    const s = this.sitting, d = s.r + PLAYER_RADIUS + 0.15;
    this.sitting = null;
    if (s.up) { this.pos.x = s.up.x; this.pos.z = s.up.z; return; } // a bench: step back off it, away from the table
    this.pos.x = s.x + Math.sin(s.rot) * d;
    this.pos.z = s.z + Math.cos(s.rot) * d;
  }

  enterLocation(msg) {
    this.sitting = null;
    if (this.building) this.stopBuilding();
    // tear down the old place
    this.locView?.dispose();
    for (const { view } of this.ents.values()) view?.dispose();
    for (const v of this.others.values()) v.dispose();
    this.ents.clear();
    this.others.clear();
    this.hud.closeModal();

    this.epoch = msg.epoch;
    this.layout = buildLayout(msg.key, msg.seed, msg.opts);
    CharacterView.flyHeight = (x, z) => flyHeightAt(this.layout.props, x, z, FLY_HEIGHT); // others fly over stalls too
    this.locView = new LocationView(this.layout, this.world);
    this.unlockShown = new Set();
    this.scene.add(this.locView.group);
    for (const e of msg.ents) this.addEnt(e);

    const dark = this.layout.dark;
    const theme = this.locView.theme;
    this.scene.background = new THREE.Color(theme.bg);
    // fog and the lantern exist everywhere (just out of sight / switched off): adding or removing
    // them makes three.js rebuild every shader, which stutters the first seconds in a new place
    this.scene.fog = new THREE.Fog(theme.bg, dark ? 24 : this.layout.theme === 'outdoor' ? 70 : 1000, dark ? 60 : this.layout.theme === 'outdoor' ? 160 : 2000);
    this.hemi.intensity = theme.ambient;
    this.sun.intensity = theme.sun;
    this.lantern.intensity = dark ? 30 : 0;
    this.lantern.color.set(theme.lantern ?? 0xffd9a0);

    if (!this.me) this.me = this.makeMe();
    this.scene.add(this.me.root);
    this.pos = { x: msg.x, z: msg.z, rot: Math.PI };
    this.me.root.position.set(msg.x, 0, msg.z);
    this.snapCamera = true;
    this.hud.setLocation(this.layout.title);
    this.checkUnlocks();
    this.music.setMood(moodFor(this.layout));
    this.interp = new Interpolator(); // a new place: forget the old history
    this.lastPosTime = -1;
    for (const p of msg.players) if (p.id !== this.you) this.updateOther(p);
    this.warmUp();
  }

  /**
   * Compile the new place's shaders before drawing it: the old picture stays up a moment instead
   * of the first seconds stuttering as each new material is met. Never waits more than 1.5 s.
   */
  warmUp() {
    const token = (this.warming = {});
    const done = () => { if (this.warming === token) this.warming = null; };
    this.renderer.compileAsync(this.scene, this.camera).then(done, done);
    setTimeout(done, 1500);
  }

  /** Rebuild the walls and floors of where we are (e.g. the fort got new wallpaper). Entities stay. */
  rebuildScenery() {
    this.locView?.dispose();
    this.locView = new LocationView(this.layout, this.world);
    this.scene.add(this.locView.group);
    this.warmUp();
  }

  makeMe() {
    const me = new CharacterView({ cls: this.profile.cls, look: this.profile.look, name: this.profile.name, weapon: this.self?.weapon, ench: this.self?.enchants?.[this.self?.weapon], shield: this.self?.shield, armor: this.self?.armor, helmet: this.self?.helmet, isLocal: true });
    if (this.self) me.setHealth(this.self.hp / this.self.maxHp);
    return me;
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
    const view = e.type === 'drop' && e.owner && e.owner !== this.you ? null : makeEntityView(e); // someone else's share of the loot
    if (view) this.scene.add(view.root);
    this.ents.set(e.id, { data: e, view });
  }

  /** Reliable changes: new / changed / removed entities, and players whose looks changed. */
  applySnapshot(msg) {
    for (const p of msg.players) if (p.id !== this.you) this.updateOther(p);

    for (const e of msg.ents) {
      const known = this.ents.get(e.id);
      if (!known) { if (e.type) this.addEnt(e); continue; }
      Object.assign(known.data, e);
      known.view?.apply(known.data);
    }
    for (const id of msg.gone) {
      this.ents.get(id)?.view?.dispose();
      this.ents.delete(id);
      this.interp.forget(id);
    }
  }

  /** The fast lane: where everything that moves is right now. Old or out-of-order updates are dropped. */
  onPos(msg) {
    if (msg.time <= (this.lastPosTime ?? -1)) return;
    this.lastPosTime = msg.time;
    this.interp.sync(msg.time);
    this.net.posCount++;
    const here = new Set();
    for (const [id, x, z, rot, anim, act, hp] of msg.players) {
      if (id === this.you) continue;
      here.add(id);
      const v = this.others.get(id);
      if (!v) continue; // its looks arrive in a reliable snap first
      this.interp.push(id, msg.time, { x, z, rot });
      v.netAnim = anim;
      v.setHealth(hp / (v.maxHp || hp || 1));
      if (act !== v.lastAct) { v.lastAct = act; v.play('attack'); }
    }
    for (const [id, v] of this.others) if (!here.has(id)) { v.dispose(); this.others.delete(id); this.interp.forget(id); }
    for (const [id, x, z, rot, hp, anim] of msg.ents) {
      const known = this.ents.get(id);
      if (!known) continue;
      this.interp.push(id, msg.time, { x, z, rot });
      known.data.hp = hp;
      known.data.anim = anim;
      known.view?.apply({ hp, anim });
    }
  }

  /** Every frame: put other players, enemies and pets where the interpolator says they are. */
  interpolate(dt) {
    this.interp.advance(dt);
    for (const [id, v] of this.others) {
      const s = this.interp.sample(id);
      if (s) v.setTarget({ x: s.x, z: s.z, rot: s.rot, anim: v.netAnim });
    }
    for (const [id, { data, view }] of this.ents) {
      if (data.type !== 'slime' && data.type !== 'pet') continue;
      const s = this.interp.sample(id);
      if (!s) continue;
      data.x = s.x; data.z = s.z; data.rot = s.rot;
      view?.apply({ x: s.x, z: s.z, rot: s.rot });
    }
  }

  updateOther(p) {
    let v = this.others.get(p.id);
    if (v && v.cls !== p.cls) { v.dispose(); this.others.delete(p.id); v = null; } // changed outfit
    if (!v) {
      v = new CharacterView({ cls: p.cls, look: p.look, name: p.name, weapon: p.weapon, ench: p.ench, shield: p.shield });
      v.lastAct = p.act;
      this.scene.add(v.root);
      this.others.set(p.id, v);
    }
    if (!this.interp.buffers.has(p.id)) { v.setTarget(p); this.interp.push(p.id, this.lastPosTime ?? 0, { x: p.x, z: p.z, rot: p.rot }); }
    v.maxHp = p.maxHp;
    v.netAnim = p.anim;
    v.setHealth(p.hp / p.maxHp);
    v.setWeapon(p.weapon, p.ench);
    v.setLook(p.look);
    v.setShield(p.shield);
    v.setArmor(p.armor);
    v.setHelmet(p.helmet);
    if (p.act !== v.lastAct) { v.lastAct = p.act; v.play('attack'); }
  }

  onFx(msg) {
    const view = msg.id && (this.ents.get(msg.id)?.view ?? this.others.get(msg.id));
    switch (msg.kind) {
      case 'dmg': view?.hit?.(); this.sfx.play('thud'); this.floatAt(msg, `-${msg.amount}`, '#fff27a'); break;
      case 'hit': view?.hit?.(); this.sfx.play('thud'); break;
      case 'hurt':
        this.sfx.play('hurt');
        if (msg.id === this.you) this.floatAt(this.pos, `-${msg.amount}`, '#ff5a5a');
        else { view?.play?.('hurt'); this.floatAt(msg, `-${msg.amount}`, '#ff5a5a'); }
        break;
      case 'heal': this.sfx.play('heal'); this.floatAt(msg, `+${msg.amount}`, '#7dff8a'); break;
      case 'forge':
        this.sfx.play('clang');
        this.floatAt(msg, 'Clang! ⚒', '#ffb070');
        this.addEffect(new Debris(msg.x, msg.z, [0xff8a30, 0xffd23f, 0xfff27a], 14));
        break;
      case 'faint':
        this.sfx.play('faint');
        this.floatAt(msg, '💤 Fainted!', '#c9c9ff');
        this.addEffect(new Debris(msg.x, msg.z, [0xffffff, 0xc9c9ff], 10));
        break;
      case 'petlevel': this.sfx.play('petlevel'); this.floatAt(msg, `Pet level ${msg.level}!`, '#c9f7ff'); break;
      case 'evolve':
        this.sfx.play('evolve');
        this.floatAt(msg, '✨ EVOLVED! ✨', '#ffd23f');
        this.addEffect(new Debris(msg.x, msg.z, [0xffd23f, 0xff9ad5, 0x7fd4ff, 0xffffff], 24));
        break;
      case 'levelup':
        this.sfx.play('levelup');
        this.floatAt(msg, `LEVEL ${msg.level}!`, '#ffd23f');
        (msg.id === this.you ? this.me : view)?.play?.('cheer');
        this.addEffect(new Debris(msg.x, msg.z, [0xffd23f, 0xfff27a, 0xffffff], 18));
        break;
      case 'sleep': // into bed: lie down on it
        if (msg.id === this.you) { this.sleeping = true; this.pos.x = msg.x; this.pos.z = msg.z; this.pos.rot = msg.rot ?? 0; } // head towards the headboard (the bed's -z)
        break;
      case 'wake':
        if (msg.id === this.you && this.sleeping) { // out of bed, onto the floor at its foot
          this.sleeping = false;
          if (msg.up) { this.pos.x = msg.up.x; this.pos.z = msg.up.z; } else this.pos.z += 2.6;
        }
        break;
      case 'sit': // onto a chair: sit facing out of it; walking gets you up in front of it
        if (msg.id === this.you) { this.sitting = { x: msg.x, z: msg.z, rot: msg.rot, r: msg.r, up: msg.up }; this.pos.x = msg.x; this.pos.z = msg.z; this.pos.rot = msg.rot; }
        break;
      case 'nightWarning': this.sfx.play('chime'); this.hud.nightWarning(msg.seconds); break;
      case 'dodge': if (msg.id === this.you) { this.sfx.play('dodge'); this.floatAt(this.pos, 'Dodged!', '#c9f7ff'); } break;
      case 'block': this.sfx.play('block'); this.floatAt(msg.id === this.you ? this.pos : msg, 'Blocked!', '#9fd8ff'); break;
      case 'pickup':
        this.sfx.play(msg.item === 'gold' ? 'coin' : 'pop');
        this.floatAt(this.pos, `+${msg.qty} ${msg.item === 'gold' ? 'gold' : ITEMS[msg.item]?.name ?? msg.item}`, msg.item === 'gold' ? '#ffd23f' : '#bfe7ff');
        break;
      case 'chest': this.sfx.play('chest'); this.floatAt(msg, 'Treasure!', '#ffd23f'); break;
      case 'smash': this.sfx.play('smash'); this.addEffect(new Debris(msg.x, msg.z, [0x9a6a3c, 0x7a5030, 0xb58250, 0x5a5a5a])); break;
      case 'enchant': { // a weapon just got stronger: a burst of its new colour
        const glow = ENCHANT_LOOKS[msg.level - 1]?.glow ?? 0xb070ff;
        this.sfx.play('nova');
        this.addEffect(new Debris(msg.x, msg.z, [glow, 0xffffff, glow], 30));
        this.floatAt(msg.id === this.you ? this.pos : msg, `+${msg.level}!`, '#e0b0ff');
        break;
      }
      case 'crit': this.floatAt(msg, msg.lucky ? '🍀 Lucky!' : 'Critical!', msg.lucky ? '#9aff9a' : '#ffd23f'); break; // a Keen forged weapon, or luck
      case 'feast': this.sfx.play('coin'); this.floatAt(msg, '🍗 Yum!', '#ffe9b0'); break;
      case 'treat': this.sfx.play('coin'); this.floatAt(msg, '🍬 Treat!', '#ffb347'); break; // Halloween
      case 'boo': this.sfx.play('coin'); this.floatAt(msg, '👻 BOO!', '#e8e8ff'); break;
      case 'present': this.sfx.play('coin'); this.floatAt(msg, '🎁 Ho ho ho!', '#ff7a7a'); break; // Santa
      case 'basket': this.sfx.play('coin'); this.floatAt(msg, '🧺 Happy Easter!', '#ffb3d1'); break; // Grandma
      case 'decor': { // someone used a decoration: its show, and its sound
        this.ents.get(msg.id)?.view?.play?.(msg.use);
        this.sfx.decor(msg.use, msg.on);
        if (msg.use === 'hoard') this.addEffect(new Debris(msg.x, msg.z, [0xffd23f, 0xfff27a, 0xd9a93a], 16));
        break;
      }
      case 'warn': this.addEffect(new SlamWarning(msg.x, msg.z, msg.r, msg.time)); break; // a boss is about to slam: get out of the circle!
      case 'slam':
        this.sfx.play('smash');
        this.addEffect(new NovaBlast(msg.x, msg.z, msg.r, 0xff8a3a));
        this.addEffect(new Debris(msg.x, msg.z, [0x8a6a4a, 0x6a5038, 0xb08a60], 18));
        this.shake(Math.max(0, 0.9 - Math.hypot(msg.x - this.pos.x, msg.z - this.pos.z) / 25));
        break;
      case 'nova':
        this.sfx.play('nova');
        this.addEffect(new NovaBlast(msg.x, msg.z, SPELL_RADIUS));
        this.shake(Math.max(0, 0.5 - Math.hypot(msg.x - this.pos.x, msg.z - this.pos.z) / 40));
        break;
      case 'break': { // gems burst in their own colours
        const gem = ITEMS[msg.ore]?.gem ? ITEMS[msg.ore] : null;
        this.sfx.play(gem ? 'coin' : 'rock');
        this.addEffect(new Debris(msg.x, msg.z, gem ? [gem.tint, gem.glow, 0xffffff] : [0x8d8d8d, 0x6e6e6e, 0xa8a29a], gem ? 18 : 10));
        if (gem) this.floatAt(msg, `${gem.name}!`, '#ffffff');
        break;
      }
    }
  }

  addEffect(fx) {
    this.scene.add(fx.root);
    this.effects.push(fx);
  }

  /**
   * Once a second: frames per second, position updates per second and (every 2 s) a ping to the host,
   * for the stats overlay (F3). On 'auto' graphics, a slow device steps down a quality level.
   */
  measure(frameMs) {
    const n = this.net;
    n.frames = (n.frames ?? 0) + 1;
    n.worst = Math.max(n.worst ?? 0, frameMs);
    n.acc = (n.acc ?? 0) + frameMs;
    if (n.acc < 1000) return;
    n.fps = Math.round((n.frames * 1000) / n.acc);
    n.posRate = n.posCount;
    n.frames = 0; n.acc = 0; n.posCount = 0;
    const worst = n.worst; n.worst = 0;
    n.seconds = (n.seconds ?? 0) + 1;
    if (n.seconds % 2 === 0) { const id = n.seconds; n.pings.set(id, performance.now()); this.conn.send({ t: 'ping', id }); }
    if (this.showStats) {
      this.hud.setStats(`${n.fps} fps (slowest frame ${Math.round(worst)} ms) · ${n.ping == null ? '…' : `${Math.round(n.ping)} ms`} ping · ${n.posRate} updates/s · ${this.conn.sendFast ? 'fast lane' : this.opts.isHost ? 'host' : 'reliable only'} · ${this.gfx} graphics`);
    }
    // auto quality: after the first few seconds, if this device is struggling, go one step lower
    if (localStorage.getItem(GFX_KEY) == null && n.seconds > 6 && n.fps < 40 && this.gfx !== 'low' && !this.gfxStepped) {
      this.gfxStepped = true;
      this.setGraphics(this.gfx === 'high' ? 'medium' : 'low', false);
      this.hud.toast(`Graphics set to ${this.gfx} to keep things smooth (Esc menu to change).`);
    }
  }

  /** high: sharp + soft shadows; medium: less sharp, cheaper shadows; low: no shadows, no smoothing. */
  setGraphics(level, remember = true) {
    this.gfx = level;
    if (remember) try { localStorage.setItem(GFX_KEY, level); } catch {}
    this.renderer.setPixelRatio(pixelRatioFor(level));
    this.sun.castShadow = level !== 'low';
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.sun.shadow.mapSize.setScalar(level === 'medium' ? 1024 : 2048);
  }

  /** Camera shake (0..1), fading out over about half a second. */
  shake(amount) {
    this.shakeAmt = Math.max(this.shakeAmt ?? 0, amount);
  }

  floatAt(p, text, color) {
    const v = new THREE.Vector3(p.x, 2.6, p.z).project(this.camera);
    const x = (v.x * 0.5 + 0.5) * innerWidth + (Math.random() - 0.5) * 30;
    const y = (-v.y * 0.5 + 0.5) * innerHeight;
    this.hud.float(text, x, y, color);
  }

  openUi(msg) {
    if (msg.kind === 'shop' || msg.kind === 'smith') {
      this.hud.tryOn = (slot, id) => { // a sneak peek in the shop: wear it for a moment, close up
        if (this.me) this.me.noSeasonWear = true; // see the real thing, not a winter coat over it
        this.me?.setLook({ ...cleanLook(this.profile.look), [slot]: id });
        this.closeUp = true;
        this.pos.rot = 0; // turn round to face the camera
      };
      this.hud.untryOn = () => { if (this.me) this.me.noSeasonWear = false; this.me?.setLook(cleanLook(this.profile.look, this.self?.closet)); this.closeUp = false; };
      this.hud.openShop({
        vendor: msg.kind,
        onForge: (recipe) => this.conn.send({ t: 'forge', recipe }),
        onSmelt: (ore, all) => this.conn.send({ t: 'smelt', ore, all }),
        onBuy: (item) => this.conn.send({ t: 'buy', item }),
        onSell: (item, qty) => this.conn.send({ t: 'sell', item, qty }),
        onBuyStyle: (slot, id) => this.conn.send({ t: 'buyStyle', slot, id }),
      });
    } else if (msg.kind === 'feast') {
      this.hud.openFeast({ ...msg, onYes: () => this.conn.send({ t: 'eatFeast', table: msg.table }) });
    } else if (msg.kind === 'seasonal') {
      this.hud.tryOn = (slot, id) => { if (this.me) this.me.noSeasonWear = true; this.me?.setLook({ ...cleanLook(this.profile.look), [slot]: id }); this.closeUp = true; this.pos.rot = 0; }; // face the camera
      this.hud.untryOn = () => { if (this.me) this.me.noSeasonWear = false; this.me?.setLook(cleanLook(this.profile.look, this.self?.closet)); this.closeUp = false; };
      this.hud.openSeasonal({ ...msg, onBuy: (item) => this.conn.send({ t: 'buySeasonal', item }) });
    } else if (msg.kind === 'bank') {
      this.hud.openBank({ family: msg.family, onAction: (action, amount, to) => this.conn.send({ t: 'bank', action, amount, to }) });
    } else if (msg.kind === 'enchanter') {
      this.enchanterOpen = true;
      this.hud.openEnchanter({ onEnchant: (item) => this.conn.send({ t: 'enchant', item }), onClose: () => { this.enchanterOpen = false; } });
    } else if (msg.kind === 'calendar') {
      this.hud.openCalendar({ day: this.world?.day ?? 1, season: msg.season, days: msg.days, onAsk: () => this.conn.send({ t: 'seasonSkip', yes: true }) });
    } else if (msg.kind === 'seasonVote') { // someone at a calendar wants to sleep until the next season
      this.hud.openSeasonVote({ ...msg, onAnswer: (yes) => this.conn.send({ t: 'seasonSkip', yes }) });
    } else if (msg.kind === 'seasonVoteOver') {
      if (this.hud.seasonVoteOpen) this.hud.closeModal();
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
      this.hud.openChest({ storage: msg.storage, ench: msg.ench, onStash: (item, qty, dir) => this.conn.send({ t: 'stash', item, qty, dir }) });
    } else if (msg.kind === 'characters') {
      this.hud.openCharacters({ list: msg.list, fresh: msg.fresh, onPick: (id) => this.conn.send({ t: 'switchCharacter', id }) });
    } else if (msg.kind === 'talk') {
      this.hud.speech(msg.name, msg.text);
    } else if (msg.kind === 'decorator') {
      this.hud.openDecorator({
        house: () => this.house,
        onBuy: (item) => this.conn.send({ t: 'buyFurniture', item }),
        onBuyStyle: (kind, id) => this.conn.send({ t: 'buyHouseStyle', kind, id }),
      });
    } else if (msg.kind === 'elevator') {
      this.hud.openElevator({ name: msg.name, floors: msg.floors, onPick: (floor) => this.conn.send({ t: 'elevator', dungeon: msg.dungeon, floor }) });
    }
  }

  /** The pet screen: adopting only at the Pet Keeper (`shop`), managing your pets anywhere (P). */
  openPets(shop = false) {
    this.hud.openPets({
      shop,
      onBuy: (species) => this.conn.send({ t: 'buyPet', species }),
      onBuyItem: (item) => this.conn.send({ t: 'buy', item }),
      onPick: (id) => this.conn.send({ t: 'pickPet', id }),
      onRename: (id, name) => this.conn.send({ t: 'renamePet', id, name }),
      onRevive: (id) => this.conn.send({ t: 'revivePet', id }),
      onTrain: (id) => this.conn.send({ t: 'trainPet', id }),
    });
  }

  // ---------------------------------------------------------------- per frame

  frame() {
    const now = performance.now();
    const dt = Math.min((now - this.lastFrame) / 1000, 0.1);
    this.lastFrame = now;
    this.time += dt;
    this.measure(now - (this.prevFrameAt ?? now));
    this.prevFrameAt = now;
    this.input.poll();
    if (this.layout && this.me) this.updateLocal(dt);
    this.interpolate(dt);
    for (const { view } of this.ents.values()) view?.update(dt);
    for (const v of this.others.values()) v.update(dt);
    this.me?.update(dt);
    for (const fx of this.effects) fx.update(dt);
    this.effects = this.effects.filter((fx) => !fx.done || (fx.dispose(), false));
    this.locView?.update(dt, this.time, this.pos);
    this.updateSky(dt);
    this.ambientSounds(dt);
    this.updateCamera(dt);
    if (!this.warming) this.renderer.render(this.scene, this.camera);
  }

  /**
   * The first time you're in town after a dungeon is completed, the camera swings over to the
   * next dungeon's gate and you watch its chains break. Remembered per world in this browser.
   */
  checkUnlocks() {
    if (this.layout?.key !== 'town' || !this.world || this.cinematic) return;
    const key = `fdg.unlocksSeen.${this.world.seed}.${this.world.name}`;
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
    for (const [id, d] of Object.entries(this.world.dungeons ?? {})) {
      if (!d.unlocked || seen.includes(id) || this.unlockShown.has(id) || !DUNGEONS[id]?.unlockedBy) continue;
      // a world that already had this gate open before chains existed: nothing to show
      if (d.unlockedOnDay == null) { seen.push(id); continue; }
      const at = this.locView.holdChains(id);
      if (!at) continue;
      this.unlockShown.add(id);
      this.cinematic = { t: 0, at, id, broke: false, done: () => { seen.push(id); try { localStorage.setItem(key, JSON.stringify(seen)); } catch {} } };
      this.hud.toast(`The chains on the ${DUNGEONS[id].name} are breaking!`, true);
      break;
    }
    try { localStorage.setItem(key, JSON.stringify(seen)); } catch {}
  }

  /**
   * Every season's holiday has a little film the first time you're in town that day (cinema bars,
   * the camera moving, a caption): Easter, Grandma and Grandpa walk into the square and wave;
   * Midsummer, the Sun Herald marches up to the Solstice Arena; Halloween, a dusky swoop round the
   * jack-o'-lanterns to a cottage door; Christmas, Santa floats down out of the sky. Once per
   * holiday per world in this browser; Esc skips it.
   */
  checkVisit() {
    const h = this.world && holidayOf(this.world.day);
    if (this.cinematic || this.layout?.key !== 'town' || !h || !HOLIDAY_FILMS[h]) return;
    const key = h === 'easter' ? `fdg.visitSeen.${this.world.seed}.${this.world.name}` : `fdg.filmSeen.${h}.${this.world.seed}.${this.world.name}`;
    let seen = null;
    try { seen = localStorage.getItem(key); } catch {}
    if (seen === String(this.world.day) || this.visitShown === `${h}${this.world.day}`) return;
    const film = HOLIDAY_FILMS[h].call(this);
    if (!film) return; // (the cast isn't here yet)
    this.visitShown = `${h}${this.world.day}`;
    this.cinematic = { kind: 'visit', t: 0, waved: false, npcs: [], ...film, done: () => { try { localStorage.setItem(key, String(this.world.day)); } catch {} } };
    this.hud.cinema(film.intro);
  }

  /** Holiday visitors (town npcs) matching `test`, set up to walk or fly in from `from(npc)`. */
  filmCast(test, from) {
    return [...this.ents.values()].filter((e) => e.data.type === 'npc' && test(e.data) && e.view?.ch)
      .map((e) => ({ view: e.view, at: { x: e.data.x, z: e.data.z }, rot: e.data.rot ?? 0, from: from(e.data) }));
  }

  /** A holiday film, frame by frame (from updateCamera). */
  playVisit(c, dt) {
    if (this.layout?.key !== 'town') return this.endVisit(c); // you left town mid-film
    c.t += dt;
    const WALK_T = c.arrive ?? 6.5, END = c.end ?? 12.5;
    const u = Math.min(1, c.t / WALK_T), ease = u * u * (3 - 2 * u);
    const mid = new THREE.Vector3();
    for (const n of c.npcs) {
      const ch = n.view.ch, fy = n.from.y ?? 0;
      const x = n.from.x + (n.at.x - n.from.x) * ease, z = n.from.z + (n.at.z - n.from.z) * ease, y = fy * (1 - ease);
      // move them along (their own spot is the view's root; any stall or corner stays put)
      const local = new THREE.Vector3(x - n.at.x, 0, z - n.at.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -n.rot);
      ch.root.position.set(local.x, y + (c.fly && u < 1 ? Math.sin(c.t * 3) * 0.15 : 0), local.z);
      const walking = u < 1 && !c.fly;
      ch.root.rotation.y = walking ? Math.atan2(n.at.x - n.from.x, n.at.z - n.from.z) - n.rot : ch.root.rotation.y * (1 - Math.min(1, dt * 4)); // then turn to face the town
      ch.setBase(walking ? 'run' : 'idle');
      mid.add(new THREE.Vector3(x, y, z));
    }
    if (c.npcs.length) mid.multiplyScalar(1 / c.npcs.length);
    else mid.copy(c.focus);
    if (u >= 1 && !c.waved) {
      c.waved = true;
      for (const n of c.npcs) n.view.ch.play('cheer');
      this.sfx.play(c.sound ?? 'chime');
      const at = c.burstAt ?? mid;
      this.addEffect(new Debris(at.x, at.z, c.colors, 40));
      this.hud.cinema(c.outro);
    }
    if (c.shot) { // a camera move of its own
      const { pos, look } = c.shot(c.t);
      if (c.t < dt * 1.5) this.camera.position.copy(pos);
      this.camera.position.lerp(pos, 1 - Math.exp(-dt * 3));
      this.camera.lookAt(look);
    } else { // tracking alongside as they come in, then swinging round in front for the hello
      const track = new THREE.Vector3(mid.x + 8.5, 5.2 + mid.y * 0.5, mid.z + 7);
      const [fx, fy, fz] = c.front ?? [1.2, 2.6, 6.5];
      const front = new THREE.Vector3(mid.x + fx, fy, mid.z + fz);
      const k = Math.min(1, Math.max(0, (c.t - WALK_T + 0.8) / 2.2));
      const want = track.lerp(front, k * k * (3 - 2 * k));
      if (c.t < dt * 1.5) this.camera.position.copy(want);
      this.camera.position.lerp(want, 1 - Math.exp(-dt * 2.5));
      this.camera.lookAt(mid.x, mid.y + 1.5, mid.z);
    }
    if (c.t > END || c.skip) this.endVisit(c);
  }

  endVisit(c) {
    for (const n of c.npcs) { n.view.ch.root.position.set(0, 0, 0); n.view.ch.root.rotation.y = 0; n.view.ch.setBase('idle'); }
    c.done();
    this.cinematic = null;
    this.snapCamera = true;
    this.hud.cinema(null);
  }

  /** Outdoors, the last two minutes before night turn the sky orange, then purple. */
  updateSky(dt) {
    if (!this.layout || this.layout.theme !== 'outdoor' || !this.locView) return;
    this.dayLeft = Math.max(0, (this.dayLeft ?? 600) - dt);
    // Halloween in town: a spooky dusk all day long (the lamps lit, the jack-o'-lanterns glowing)
    const spooky = this.layout.key === 'town' && holidayOf(this.world?.day ?? 1) === 'halloween';
    const dusk = Math.max(spooky ? 0.82 : 0, Math.min(1, Math.max(0, 1 - this.dayLeft / 120)));
    const theme = this.locView.theme;
    const sky = new THREE.Color(theme.bg);
    if (dusk > 0) sky.lerp(new THREE.Color(0xff9a6a), Math.min(1, dusk * 2)).lerp(new THREE.Color(0x2a2352), Math.max(0, dusk * 2 - 1));
    this.scene.background.copy(sky);
    this.scene.fog?.color.copy(sky);
    const town = this.layout.key === 'town', summer = town ? SEASON_LOOK.value.y : 0, rain = town && this.locView.raining;
    if (rain) sky.lerp(new THREE.Color(0x8a96a4), 0.7); // a grey, rainy spring day
    this.scene.background.copy(sky);
    this.scene.fog?.color.copy(sky);
    // summer: a brighter sun and darker shadows (less fill light); rain: dimmer all round
    this.sun.intensity = theme.sun * (1 - dusk * 0.85) * (1 + summer * 0.35) * (rain ? 0.5 : 1);
    this.sun.color.setRGB(1, 0.95 - dusk * 0.4, 0.87 - dusk * 0.55);
    this.hemi.intensity = theme.ambient * (1 - dusk * 0.5) * (1 - summer * 0.22) * (rain ? 0.8 : 1);
    for (const l of this.locView.lampLights) l.intensity = 14 * Math.min(1, dusk * 1.5); // lamps come on at dusk
    this.hemi.color.setRGB(1, 1, 1).lerp(new THREE.Color(0xffa070), Math.min(1, dusk * 2)).lerp(new THREE.Color(0x7a6ad0), Math.max(0, dusk * 2 - 1));
  }

  /** Now and then outdoors: a crow cawing in autumn, birdsong in spring (not in the rain). */
  ambientSounds(dt) {
    if (this.layout?.key !== 'town' || !this.locView) return;
    this.ambientT = (this.ambientT ?? 8) - dt;
    if (this.ambientT > 0) return;
    const season = seasonOf(this.world?.day ?? 1).id;
    if (season === 'autumn') { this.sfx.play('caw'); this.ambientT = 18 + Math.random() * 25; } else if (season === 'spring' && !this.locView.raining) { this.sfx.play('tweet'); this.ambientT = 6 + Math.random() * 10; } else this.ambientT = 10;
  }

  solids() {
    const out = [...this.layout.solids];
    for (const { data, view } of this.ents.values()) {
      if ((data.type === 'rock' || data.type === 'chest' || data.type === 'barrel' || data.type === 'furniture') && data.r > 0) out.push({ x: data.x, z: data.z, r: data.r });
      // monsters (alive) and visitors like Santa: you bump into them, where they are on screen right now
      else if ((data.type === 'slime' && data.hp > 0) || data.type === 'npc') {
        const at = view?.root?.position ?? data;
        out.push({ x: at.x, z: at.z, r: (data.r ?? 0.5) * 0.85 });
      }
    }
    for (const w of this.locView?.villagers?.walkers ?? []) out.push({ x: w.view.root.position.x, z: w.view.root.position.z, r: 0.4 });
    // the rest of the family: you bump into each other too (not someone asleep in bed)
    for (const v of this.others.values()) if (v.base !== 'sleep' && !v.flying) out.push({ x: v.root.position.x, z: v.root.position.z, r: PLAYER_RADIUS * 0.9 });
    return out;
  }

  updateLocal(dt) {
    const input = this.input;
    if (this.locView?.villagers) this.locView.villagers.player = this.pos; // they wait for you to pass
    this.checkVisit();
    if (input.consume('menu')) {
      if (this.cinematic) this.cinematic.skip = true; // Esc skips a film
      else if (this.hud.modalOpen) this.hud.closeModal();
      else this.hud.openMenu({ isHost: this.opts.isHost, music: this.music, graphics: { level: this.gfx, set: (l) => this.setGraphics(l) },
        stats: { on: !!this.showStats, toggle: () => { this.showStats = !this.showStats; this.hud.setStats(this.showStats ? 'measuring…' : null); } }, onSave: () => { this.opts.onSave?.(); this.hud.toast('Saved!'); }, onExport: this.opts.onExport, onQuit: this.opts.onQuit, onCharacters: () => this.conn.send({ t: 'characters' }) });
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
    if (input.consume('music')) this.hud.toast(this.music.toggleMute() ? 'Sound off (M)' : 'Sound on (M)');
    if (input.consume('stats')) { this.showStats = !this.showStats; this.hud.setStats(this.showStats ? 'measuring…' : null); }
    if (input.consume('chat')) {
      input.enabled = false;
      this.hud.openChat().then((text) => {
        input.enabled = !this.hud.modalOpen;
        input.clear();
        if (text) this.conn.send({ t: 'chat', text });
      });
    }

    // a jetpack: V takes off and lands (only while wearing one)
    const canFly = !!BACKS[this.profile.look?.back]?.flies;
    if (input.consume('fly')) {
      const blocked = this.flying && this.solids().some((o) => Math.hypot(o.x - this.pos.x, o.z - this.pos.z) < o.r + PLAYER_RADIUS);
      if (blocked) this.hud.toast('Can’t land on that! Fly over open ground first.');
      else if (canFly) { this.flying = !this.flying; if (this.flying) { this.sitting && this.standUp(); this.sleeping = false; } this.sfx.play('whoosh'); }
      else this.hud.toast('You need a jetpack on your back to fly (the shop’s Fashion tab).');
    }
    if (!canFly) this.flying = false;

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
    // J: jump (up and down again; the view does the hop)
    if (input.consume('jump') && !this.me.jumping && !this.flying && this.rolling <= 0 && this.self?.hp > 0) {
      if (this.sitting) this.standUp();
      this.sleeping = false;
      this.me.jump();
      this.jumpUntil = performance.now() + JUMP_TIME * 1000;
    }
    if (this.rolling > 0) {
      this.rolling -= dt;
      const sx = Math.sin(this.pos.rot) * ROLL_SPEED * dt, sz = Math.cos(this.pos.rot) * ROLL_SPEED * dt;
      const next = moveCircle(this.layout, this.pos.x, this.pos.z, sx, sz, PLAYER_RADIUS, this.solids());
      this.pos.x = next.x; this.pos.z = next.z;
      moving = false;
    } else if (moving) {
      const speed = PLAYER_SPEED * (this.flying ? FLY_SPEED : 1);
      const next = moveCircle(this.layout, this.pos.x, this.pos.z, m.x * speed * dt, m.z * speed * dt, PLAYER_RADIUS, this.flying ? [] : this.solids()); // (flying: over monsters, people and things; only walls stop you)
      this.pos.x = next.x; this.pos.z = next.z;
      this.pos.rot = Math.atan2(m.x, m.z);
    }
    if (moving || this.rolling > 0) this.sleeping = false; // getting out of bed
    if ((moving || this.rolling > 0) && this.sitting) this.standUp();
    this.anim = this.rolling > 0 ? 'roll' : this.flying ? 'fly' : performance.now() < (this.jumpUntil ?? 0) ? 'jump' : moving ? 'run' : this.sleeping ? 'sleep' : this.sitting ? 'sit' : 'idle';
    if (this.rolling <= 0) this.me.setBase(this.anim === 'fly' ? 'idle' : this.anim === 'jump' ? (moving ? 'run' : 'idle') : this.anim); // (hovering; a jump is the view's hop)
    const flyTo = this.flying ? flyHeightAt(this.layout.props, this.pos.x, this.pos.z, FLY_HEIGHT) : 0; // up over market stalls
    this.flyY = (this.flyY ?? 0) + (flyTo - (this.flyY ?? 0)) * Math.min(1, dt * (flyTo > (this.flyY ?? 0) ? 7 : 3));
    this.me.flying = this.flying;
    this.me.root.position.set(this.pos.x, this.flyY + (this.flying ? Math.sin(performance.now() / 400) * 0.08 : 0) + (this.me.jumpY ?? 0), this.pos.z);
    const r = this.me.root.rotation;
    r.y += (((this.pos.rot - r.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 18);

    this.updateBuild(dt);

    // actions
    this.attackTimer -= dt;
    if (input.consume('attack') && this.attackTimer <= 0 && this.rolling <= 0) {
      this.attackTimer = weaponCooldown(this.self?.weapon);
      this.me.play('attack');
      this.sfx.play('whoosh');
      this.conn.send({ t: 'attack', rot: this.pos.rot });
    }
    if (input.consume('feed')) this.conn.send({ t: 'feedPet' });
    if (input.consume('cheat:1234')) this.conn.send({ t: 'cheat', code: '1234' });
    if (input.consume('cheat:5678') && this.enchanterOpen) this.conn.send({ t: 'cheat', code: '5678' }); // only in the Enchanter's window
    if (input.consume('bar')) this.hud.setBarMode(!this.hud.barMode);
    if (input.consume('barLeft')) this.hud.moveBar(-1);
    if (input.consume('barRight')) this.hud.moveBar(1);
    if (input.consume('barUse')) this.hud.useBar();
    this.spellCooldown -= dt;
    if (!this.building && input.consume('spell') && this.rolling <= 0 && this.self?.hp > 0) {
      if (this.spellCooldown > 0) this.hud.toast(`Area spell ready in ${Math.ceil(this.spellCooldown)}s`);
      else {
        this.spellCooldown = SPELL_COOLDOWN;
        this.conn.send({ t: 'spell' });
      }
    }
    this.hud.setSpell(this.spellCooldown);
    if (input.consume('potion')) {
      const item = bestHeal(this.self?.inventory, (this.self?.maxHp ?? 0) - (this.self?.hp ?? 0));
      if (item) this.conn.send({ t: 'use', item });
      else this.hud.toast('Nothing to eat or drink! The shop has food and potions.');
    }
    const near = this.building ? null : this.nearestInteractable();
    if (!this.building) this.hud.prompt(near && !this.hud.modalOpen ? near.prompt : null);
    if (input.consume('interact') && near) this.conn.send({ t: 'interact', id: near.id });

    // tell the host where we are
    this.sendTimer -= dt;
    if (this.sendTimer <= 0) {
      this.sendTimer = 1 / SEND_HZ;
      const msg = { t: 'move', epoch: this.epoch, x: round(this.pos.x), z: round(this.pos.z), rot: round(this.pos.rot), anim: this.anim };
      const key = `${msg.epoch},${msg.x},${msg.z},${msg.rot},${msg.anim}`;
      this.sinceMove = (this.sinceMove ?? 0) + 1 / SEND_HZ;
      // moves go over the fast lane; standing still we still repeat ourselves now and then, in case one was lost
      if (key !== this.lastSent || this.sinceMove > 0.5) {
        msg.seq = this.moveSeq = (this.moveSeq ?? 0) + 1;
        (this.conn.sendFast ?? this.conn.send)(msg);
        this.lastSent = key;
        this.sinceMove = 0;
      }
    }

    this.lantern.position.set(this.pos.x, 4, this.pos.z + 1);
  }

  /**
   * Build mode (B, at home): pick a piece of the family's furniture, see a see-through copy in front
   * of you, R turns it, E puts it down. X picks up the furniture you're standing next to.
   */
  updateBuild() {
    const input = this.input;
    const home = this.layout.key === 'house';
    if (input.consume('build')) {
      if (this.building) this.stopBuilding();
      else if (!home) this.hud.toast('Build mode is for decorating the fort — press B at home.');
      else if (!this.world?.flags?.[DECORATOR_FLAG]) this.hud.toast('The Decorator comes to town once the Goblin King is beaten. Then you can buy furniture!');
      else { this.building = { item: null, rot: 0 }; this.hud.openBuild(this); }
    }
    if (!this.building) return;
    if (!home) return this.stopBuilding();
    const b = this.building;
    const room = this.currentRoom();
    if (room !== b.room) { b.room = room; if (b.tab && b.tab !== 'furniture') this.hud.renderBuild(this); }
    if (b.tab && b.tab !== 'furniture') return this.hud.prompt('Pick a wall or floor for this room · [B] Done');
    if (input.consume('spell')) b.rot = (b.rot + Math.PI / 2) % (Math.PI * 2);
    // where it would go: a step in front of you, on a half-unit grid
    const fx = Math.round((this.pos.x + Math.sin(this.pos.rot) * 2.6) * 2) / 2, fz = Math.round((this.pos.z + Math.cos(this.pos.rot) * 2.6) * 2) / 2;
    if (b.item && (!b.ghost || b.ghostItem !== b.item)) {
      b.ghost?.dispose();
      b.ghost = new FurnitureView({ item: b.item, x: fx, z: fz, rot: b.rot }, () => new THREE.Group());
      b.ghost.root.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; o.material.emissive?.setHex(0x2a6a2a); } });
      b.ghostItem = b.item;
      this.scene.add(b.ghost.root);
    }
    if (b.ghost) { b.ghost.root.position.set(fx, 0.02, fz); b.ghost.root.rotation.y = b.rot; }
    // the closest placed piece you could pick up
    let pick = null, best = 3;
    for (const { data } of this.ents.values()) {
      if (data.type !== 'furniture' || data.item === 'bed') continue;
      const d = Math.hypot(data.x - this.pos.x, data.z - this.pos.z) - (data.r ?? 0);
      if (d < best) { best = d; pick = data; }
    }
    this.hud.prompt(b.item ? `[E] Place ${FURNITURE[b.item].name} · [R] Turn · [B] Done` : pick ? `[X] Pick up ${FURNITURE[pick.item].name} · [B] Done` : 'Pick something to place · [B] Done');
    if (b.item && input.consume('interact')) {
      this.conn.send({ t: 'placeFurniture', item: b.item, x: fx, z: fz, rot: b.rot });
      if (!((this.house?.owned?.[b.item] ?? 0) > 1)) { b.item = null; b.ghost?.dispose(); b.ghost = null; }
    }
    if (pick && input.consume('pickup')) this.conn.send({ t: 'pickUpFurniture', id: pick.id });
  }

  /** Which of the fort's rooms you're standing in (-1 = the common room). */
  currentRoom() {
    return roomIndexAt(this.layout, Math.floor(this.pos.x / CELL), Math.floor(this.pos.z / CELL));
  }

  /** Build mode: wallpaper / a floor for the room you're standing in. */
  putUpStyle(kind, id, room) {
    this.conn.send({ t: 'roomStyle', kind, id, slot: room });
  }

  /** Stop holding a piece of furniture (switching to walls/floors). */
  dropBuildItem() {
    const b = this.building;
    if (!b) return;
    b.item = null;
    b.ghost?.dispose();
    b.ghost = null;
  }

  stopBuilding() {
    this.building?.ghost?.dispose();
    this.building = null;
    this.hud.closeBuild();
  }

  /** The closest thing you can use with E: a map prop, or an entity like a bed. Has a `prompt`. */
  nearestInteractable() {
    let best = null, bestD = Infinity;
    const consider = (t, prompt) => {
      const d = useDistance(t, this.pos);
      if (d < INTERACT_RANGE && d < bestD) { best = { id: t.id, prompt }; bestD = d; }
    };
    for (const p of this.layout.props) if (p.interact && !p.hidden) consider(p, p.requiresFlag && !this.world?.flags?.[p.requiresFlag] ? 'Closed — the Decorator opens once the Goblin King (bottom of the Old Mine) is beaten' : p.prompt);
    for (const { data } of this.ents.values()) if (data.interact) consider(data, this.promptFor(data));
    return best;
  }

  promptFor(e) {
    if (e.item === 'bed') {
      if (e.owner !== this.you) return `${e.ownerName}’s bed`;
      return this.sleeping ? 'Get up' : 'Sleep (the day ends when everyone is in bed)';
    }
    if (e.interact === 'use') return useVerb(e.item, e.on) ?? 'Use';
    return e.prompt ?? 'Use';
  }

  updateCamera(dt) {
    if (this.cinematic?.kind === 'visit') return this.playVisit(this.cinematic, dt);
    if (this.cinematic) {
      // the chains film: black bars and captions; the camera sweeps slowly round in front of the gate, the
      // padlock shakes and bursts, the chains fall, the gate opens and glows; Esc skips
      const c = this.cinematic, name = DUNGEONS[c.id]?.name ?? 'dungeon';
      c.t += dt;
      this.hud.cinema(c.t < 1.6 ? `⛓️ For so long, the ${name} has been chained shut…` : c.t < 4.2 ? '💥 But now the chains are breaking!' : `⚔️ The ${name} is open! Who’s brave enough to go in?`);
      const sweep = -0.5 + Math.min(1, c.t / 8) * 1.0, dist = 10 - Math.min(1, c.t / 3) * 2.5; // round from one side, and closer
      const fx = c.at.dx * Math.cos(sweep) - c.at.dz * Math.sin(sweep), fz = c.at.dz * Math.cos(sweep) + c.at.dx * Math.sin(sweep);
      const want = new THREE.Vector3(c.at.x + fx * dist, 6.5 - Math.min(1, c.t / 3) * 2, c.at.z + fz * dist + 1);
      this.camera.position.lerp(want, 1 - Math.exp(-dt * 3));
      this.camera.lookAt(c.at.x, 2, c.at.z);
      if ((c.t > 1.8 || c.skip) && !c.broke) { c.broke = true; this.locView.playUnlock(c.id); this.sfx.play('chain'); }
      if (c.t > 2.9 && c.t - dt <= 2.9) { this.shake(0.7); this.addEffect(new Debris(c.at.x, c.at.z, [0xffd23f, 0x9aa3ad, 0xffffff], 26)); this.sfx.play('nova'); }
      if (c.t > 4.3 && c.t - dt <= 4.3) this.addEffect(new NovaBlast(c.at.x, c.at.z, 3, 0xffd23f)); // the gate lights up
      if (c.t > 8 || c.skip) { c.done(); this.cinematic = null; this.snapCamera = true; this.hud.cinema(null); }
      return;
    }
    // debug/screenshot hook: window.game.client.camOverride = { pos: [x, y, z], look: [x, y, z] }
    if (this.camOverride) {
      this.camera.position.set(...this.camOverride.pos);
      this.camera.lookAt(...this.camOverride.look);
      return;
    }
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
    if (this.shakeAmt > 0.001) {
      this.shakeAmt *= Math.exp(-dt * 7);
      this.camera.position.x += (Math.random() - 0.5) * this.shakeAmt;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeAmt;
    }
    // the sun's shadow box follows the player
    this.sun.position.set(this.pos.x - 15, 35, this.pos.z + 10);
    this.sun.target.position.set(this.pos.x, 0, this.pos.z);
    this.fitShadow();
  }

  /**
   * Shrink the sun's shadow box to the ground the camera can see. Shadows are drawn for every
   * caster inside the box, and a fixed square round the player covered lots of town behind the
   * camera: most of the town's draw calls. Anything whose shadow falls on visible ground stands
   * between that ground and the sun, so it is still inside the fitted box.
   */
  fitShadow() {
    const cam = this.camera, eye = cam.position, sh = this.sun.shadow.camera;
    // the light's own axes (as three.js builds them for a camera looking from the sun at its target)
    const z = _v1.subVectors(this.sun.position, this.sun.target.position).normalize();
    const x = _v2.crossVectors(_up, z).normalize(), y = _v3.crossVectors(z, x);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [nx, ny] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const d = _v4.set(nx, ny, 0.5).unproject(cam).sub(eye);
      const t = d.y < -1e-3 ? Math.min(-eye.y / d.y, 200) : 200; // where that screen corner meets the ground
      const p = _v5.copy(eye).addScaledVector(d, t).sub(this.sun.target.position);
      const px = p.dot(x), py = p.dot(y);
      minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
    const m = 3; // a little spare round the edges
    Object.assign(sh, { left: minX - m, right: maxX + m, bottom: minY - m, top: maxY + m });
    sh.updateProjectionMatrix();
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.renderer.domElement.remove();
    this.conn.close();
  }
}

const _up = new THREE.Vector3(0, 1, 0), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3(), _v5 = new THREE.Vector3();

function round(v) {
  return Math.round(v * 100) / 100;
}

const GFX_KEY = 'fdg.graphics';
/** The graphics level this device uses: the one picked in the menu, else a guess (phones/tablets start lower). */
function loadGraphics() {
  try { const v = localStorage.getItem(GFX_KEY); if (['high', 'medium', 'low'].includes(v)) return v; } catch {}
  const small = Math.min(screen.width, screen.height) < 820 || navigator.maxTouchPoints > 1;
  return small ? 'medium' : 'high';
}
function pixelRatioFor(level) {
  return Math.min(devicePixelRatio, level === 'high' ? 2 : level === 'medium' ? 1.25 : 1);
}
