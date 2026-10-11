// The authoritative game, running inside the HOST's browser tab.
// Every player (including the host's own) talks to it through a connection
// object { send(msg), onMessage(cb), onClose(cb) } — see net/transports.js.
//
// Trust model (it's a family game): clients own their own movement; the host
// owns everything else (enemies, loot, gold, hp, progression, saves).

import { TICK_HZ, INTERACT_RANGE, ELEVATOR_STEP, DAY_SECONDS, AUTOSAVE_SECONDS, PROTOCOL_VERSION, CLASSES, cleanLook } from '../shared/config.js';
import { parseKey } from '../shared/dungeons.js';
import { xpToNext, maxHpFor } from '../shared/progression.js';
import { hashSeed } from '../shared/rng.js';
import { dist2 } from '../shared/physics.js';
import { LiveLocation } from './LiveLocation.js';
import { newPlayerRecord } from './saves.js';
import { installSystems } from './systems/index.js';
import { checkClientMessage } from '../shared/protocol.js';

const PORTAL_GRACE = 1.0; // seconds after arriving somewhere before exits work

export class GameServer {
  /**
   * @param {object} opts
   * @param {object} opts.save   world save (see saves.js)
   * @param {object} [opts.store] SaveStore used for autosaves (omit in tests)
   */
  constructor({ save, store = null, log = console.log }) {
    this.save = save;
    this.store = store;
    this.log = log;
    this.conns = new Map();       // connId -> { conn, playerId }
    this.players = new Map();     // playerId -> live player
    this.locations = new Map();   // key -> LiveLocation
    this.nextEntityId = 1;
    this.nextConnId = 1;
    this.time = 0;
    this.dayClock = 0;            // seconds into today; night falls at DAY_SECONDS
    this.night = false;
    this.nightHomeAt = null;      // dayClock value when whoever is underground gets sent home
    this.worldTimer = 0;
    this.saveTimer = AUTOSAVE_SECONDS;
    this.interval = null;
  }

  // ------------------------------------------------------------------ lifecycle

  start() {
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      this.step(Math.min((now - last) / 1000, 0.25));
      last = now;
    };
    // Browsers throttle timers in background tabs to ~1/s, which would freeze
    // the world for guests whenever the host switches tabs. Worker timers
    // aren't throttled, so tick from a tiny worker when we can.
    if (typeof Worker !== 'undefined') {
      const src = `setInterval(() => postMessage(0), ${1000 / TICK_HZ});`;
      this.worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      this.worker.onmessage = tick;
    } else {
      this.interval = setInterval(tick, 1000 / TICK_HZ);
    }
  }

  stop() {
    this.worker?.terminate();
    clearInterval(this.interval);
    this.persist();
  }

  addConnection(conn) {
    const connId = this.nextConnId++;
    this.conns.set(connId, { conn, playerId: null });
    conn.onMessage((msg) => {
      try { this.handle(connId, msg); } catch (err) { this.log('[server] bad message', msg, err); }
    });
    conn.onClose(() => this.dropConnection(connId));
    return connId;
  }

  dropConnection(connId) {
    const c = this.conns.get(connId);
    if (!c) return;
    this.conns.delete(connId);
    const p = c.playerId && this.players.get(c.playerId);
    if (p) {
      this.writeRecord(p);
      this.leaveLocation(p);
      this.players.delete(p.id);
      this.broadcast({ t: 'toast', text: `${p.name} went home.` });
      this.broadcastRoster();
      this.persist();
    }
  }

  /** Copy live player state into the save and write it to storage. */
  persist() {
    for (const p of this.players.values()) this.writeRecord(p);
    this.store?.write(this.save);
  }

  writeRecord(p) {
    const rec = this.save.players[p.id];
    Object.assign(rec, {
      name: p.name, cls: p.cls, look: p.look, level: p.level, xp: p.xp, points: p.points, stats: p.stats,
      hp: p.hp, maxHp: p.maxHp, weapon: p.weapon, shield: p.shield, gear: p.gear, blueprints: p.blueprints,
      closet: p.closet, pets: p.pets, pet: p.pet, inventory: p.inventory,
    });
  }

  // ------------------------------------------------------------------ main loop

  step(dt) {
    this.time += dt;
    for (const tick of SYSTEM_TICKS) tick.call(this, dt);
    for (const p of this.players.values()) {
      if (p.pendingHit && this.time >= p.pendingHit.at) { const hit = p.pendingHit; p.pendingHit = null; this.resolveAttack(p, hit); }
    }
    for (const loc of this.locations.values()) loc.tick(dt);
    // one snapshot per location per tick, sent to everyone standing in it
    for (const loc of this.locations.values()) {
      const { ents, gone } = loc.takeDelta();
      const players = loc.livePlayersAll().map(publicPlayer);
      this.sendToLocation(loc.key, { t: 'snap', players, ents, gone });
    }
    this.saveTimer -= dt;
    if (this.saveTimer <= 0) { this.saveTimer = AUTOSAVE_SECONDS; this.persist(); }
  }

  // ------------------------------------------------------------------ messaging

  send(p, msg) {
    for (const c of this.conns.values()) if (c.playerId === p.id) c.conn.send(msg);
  }

  broadcast(msg) {
    for (const c of this.conns.values()) if (c.playerId) c.conn.send(msg);
  }

  sendToLocation(key, msg) {
    for (const c of this.conns.values()) {
      const p = c.playerId && this.players.get(c.playerId);
      if (p && p.loc === key) c.conn.send(msg);
    }
  }

  sendSelf(p) {
    this.send(p, {
      t: 'self', hp: p.hp, maxHp: p.maxHp, level: p.level, xp: p.xp, xpNext: xpToNext(p.level), points: p.points, stats: p.stats,
      weapon: p.weapon, shield: p.shield, gear: p.gear, blueprints: p.blueprints, closet: p.closet, pets: p.pets, pet: p.pet, inventory: p.inventory,
    });
  }

  broadcastWorld() {
    const s = this.save;
    const dayLeft = this.night ? 0 : Math.max(0, Math.ceil(DAY_SECONDS - this.dayClock));
    this.broadcast({ t: 'world', name: s.name, seed: s.seed, day: s.day, gold: s.gold, flags: s.flags, dungeons: s.dungeons, night: this.night, dayLeft });
  }

  broadcastRoster() {
    const players = [...this.players.values()].map((p) => ({ id: p.id, name: p.name, cls: p.cls, level: p.level, loc: p.loc }));
    this.broadcast({ t: 'roster', players });
  }

  toast(p, text) {
    this.send(p, { t: 'toast', text });
  }

  handle(connId, msg) {
    const c = this.conns.get(connId);
    if (!c) return;
    if (msg?.t === 'hello' && msg.protocol !== PROTOCOL_VERSION) {
      c.conn.send({ t: 'kicked', reason: 'Game versions differ — refresh both browsers.' });
      return;
    }
    const bad = checkClientMessage(msg);
    if (bad) { this.log(`[server] dropped message: ${bad}`); return; }
    if (msg.t === 'hello') return this.onHello(connId, c, msg);
    const p = c.playerId && this.players.get(c.playerId);
    if (p) this[`on_${msg.t}`](p, msg);
  }

  onHello(connId, c, msg) {
    let id = String(msg.playerId || `anon${connId}`);
    if (this.players.has(id)) {
      // Usually a refresh: WebRTC can take a while to notice the old tab closed.
      // The newest connection wins; the old one is told why it was dropped.
      const old = [...this.conns].find(([, oc]) => oc.playerId === id);
      if (old) {
        old[1].conn.send({ t: 'kicked', reason: 'You joined again from another tab or window.' });
        this.dropConnection(old[0]);
        old[1].conn.close?.();
      }
    }
    const name = String(msg.name || 'Adventurer').slice(0, 20);
    const cls = CLASSES[msg.cls] ? msg.cls : 'Knight';
    this.save.players[id] ??= newPlayerRecord({ name, cls });
    const rec = this.save.players[id];
    rec.closet ??= [];
    const look = cleanLook(msg.look ?? rec.look, rec.closet);
    // the profile can change between sessions (new name / class / outfit)
    rec.name = name; rec.cls = cls; rec.look = look;
    const p = {
      id, name, cls, look,
      level: rec.level, xp: rec.xp, points: rec.points, stats: { ...rec.stats },
      hp: Math.max(1, rec.hp), maxHp: maxHpFor(rec.level, rec.stats),
      weapon: rec.weapon, shield: rec.shield ?? null, gear: [...rec.gear], blueprints: [...(rec.blueprints ?? [])], closet: [...rec.closet], pets: (rec.pets ?? []).map((x) => ({ ...x })), pet: rec.pet ?? null, inventory: { ...rec.inventory },
      x: 0, z: 0, rot: 0, anim: 'idle', act: 0,
      loc: null, epoch: 0, lastAttack: -1, triggers: new Set(),
    };
    c.playerId = id;
    this.players.set(id, p);
    c.conn.send({ t: 'welcome', you: id, isHost: !!msg.isHost });
    this.broadcastWorld();
    this.sendSelf(p);
    this.travel(p, 'house'); // everyone wakes up at home
    this.broadcast({ t: 'toast', text: `${name} joined the adventure!` });
    this.broadcastRoster();
  }

  // ------------------------------------------------------------------ locations

  getLocation(key) {
    let loc = this.locations.get(key);
    if (!loc) {
      const info = parseKey(key);
      // dungeons reshuffle each day; town/house are fixed
      const seed = info.kind === 'dungeon' ? hashSeed(this.save.seed, key, this.save.day) : hashSeed(this.save.seed, key);
      loc = new LiveLocation(this, key, seed);
      this.locations.set(key, loc);
    }
    return loc;
  }

  leaveLocation(p) {
    const loc = p.loc && this.locations.get(p.loc);
    if (!loc) return;
    if (p.petEnt) { loc.remove(p.petEnt); p.petEnt = null; }
    loc.players.delete(p.id);
    if (loc.players.size === 0 && loc.layout.kind === 'dungeon') this.locations.delete(loc.key);
    p.loc = null;
  }

  /** Move a player to a location, arriving at a portal (or the default spawn). */
  travel(p, key, portalId = null) {
    if (this.night && parseKey(key).kind === 'dungeon') {
      this.toast(p, 'The mine is closed for the night. Sleep in your bed to see the morning!');
      key = 'house';
      portalId = null;
    }
    this.leaveLocation(p);
    const loc = this.getLocation(key);
    const arrive = (portalId && loc.layout.portals[portalId]?.arrive) || loc.layout.spawn;
    p.loc = key;
    p.epoch++; // moves sent before the client knew about this trip are now ignored
    p.x = arrive.x; p.z = arrive.z;
    p.triggers = new Set();
    // Arrivals are right next to the way back (e.g. the up-stairs). Without a grace period,
    // still holding the direction you were walking takes you straight back out again.
    p.portalGraceUntil = this.time + PORTAL_GRACE;
    loc.players.add(p.id);
    this.spawnPet(p, loc);

    const info = parseKey(key);
    if (info.kind === 'dungeon') {
      const d = this.save.dungeons[info.dungeonId];
      if (info.floor > d.deepest) {
        d.deepest = info.floor;
        if (info.floor > 1 && info.floor % ELEVATOR_STEP === 0) this.toast(p, `Elevator now stops at floor ${info.floor}!`);
        this.broadcastWorld();
      }
    }

    this.send(p, {
      t: 'enter', key, seed: loc.seed, epoch: p.epoch, x: p.x, z: p.z,
      ents: loc.allPublic(),
      players: loc.livePlayersAll().map(publicPlayer),
    });
    this.broadcastRoster();
    this.persist();
  }

  /** Called whenever a player's position changes: walking into portals/ladders. */
  checkTriggers(p) {
    const loc = this.locations.get(p.loc);
    if (!loc) return;
    const inside = new Set();
    for (const portal of Object.values(loc.layout.portals)) {
      if (dist2(p, portal) < 1.9 * 1.9) inside.add(`portal:${portal.id}`);
    }
    for (const e of loc.entities.values()) {
      if (e.type === 'ladder' && dist2(p, e) < e.r * e.r) inside.add(`ent:${e.id}`);
    }
    if (this.time < (p.portalGraceUntil ?? 0)) {
      // just arrived: remember what we're standing in, so it only fires after stepping off and back on
      p.triggers = new Set([...p.triggers, ...inside]);
      return;
    }
    const entered = [...inside].filter((id) => !p.triggers.has(id));
    p.triggers = inside;
    for (const t of entered) {
      const [kind, id] = t.split(':');
      if (kind === 'portal') this.usePortal(p, loc.layout.portals[id]);
      else this.useLadder(p, loc);
      return; // a trigger may have moved us; stop here
    }
  }

  usePortal(p, portal) {
    if (portal.to) return this.travel(p, portal.to, portal.portal);
    if (portal.dungeon) return this.enterDungeon(p, portal.dungeon);
  }

  // ------------------------------------------------------------------ player messages

  on_move(p, { x, z, rot, anim, epoch }) {
    if (epoch !== p.epoch || !Number.isFinite(x) || !Number.isFinite(z)) return;
    p.x = x; p.z = z;
    p.rot = Number(rot) || 0;
    p.anim = String(anim || 'idle').slice(0, 16);
    if (p.hp > 0) this.checkTriggers(p);
  }

  // ------------------------------------------------------------------ levels

  // ------------------------------------------------------------------ pets

  /** E next to a prop: each `interact` kind is handled by a system (see systems/*.js `interactions`). */
  on_interact(p, { id }) {
    const loc = this.locations.get(p.loc);
    const prop = loc?.layout.props.find((q) => q.id === id);
    if (!prop?.interact || dist2(p, prop) > (INTERACT_RANGE + prop.radius) ** 2) return;
    const handler = INTERACTIONS[prop.interact];
    if (handler) handler.call(this, p, prop, loc);
    else this.log(`[server] nothing handles interact '${prop.interact}'`);
  }

  on_chat(p, { text }) {
    const clean = String(text || '').slice(0, 120).trim();
    if (clean) this.broadcast({ t: 'chat', from: p.name, text: clean });
  }
}

const { interactions: INTERACTIONS, ticks: SYSTEM_TICKS } = installSystems(GameServer);
export { INTERACTIONS };

function publicPlayer(p) {
  return {
    id: p.id, name: p.name, cls: p.cls, look: p.look, weapon: p.weapon, shield: p.shield,
    x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100,
    rot: Math.round(p.rot * 100) / 100, anim: p.anim, act: p.act, hp: p.hp, maxHp: p.maxHp,
  };
}

export { publicPlayer };
