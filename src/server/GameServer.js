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
import { newPlayerRecord, PLAYER_FIELDS } from './saves.js';
import { installSystems } from './systems/index.js';
import { checkClientMessage } from '../shared/protocol.js';
import { useDistance } from '../shared/props.js';

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
    this.warned = new Set();      // which night warnings (seconds before nightfall) went out today
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
      this.runHooks('onLeave', p);
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
    for (const f of PLAYER_FIELDS) rec[f] = p[f];
  }

  // ------------------------------------------------------------------ main loop

  step(dt) {
    this.time += dt;
    this.runHooks('tick', dt);
    for (const p of this.players.values()) {
      if (p.pendingHit && this.time >= p.pendingHit.at) { const hit = p.pendingHit; p.pendingHit = null; this.resolveAttack(p, hit); }
    }
    for (const loc of this.locations.values()) loc.tick(dt);
    // Every tick, per location, to everyone standing in it:
    //  - 'pos' (fast lane, may be dropped): where every moving thing is right now
    //  - 'snap' (reliable, only when something changed): new / changed / removed things, and
    //    players whose looks changed. Losing a 'pos' is harmless: the next one replaces it.
    const t = Math.round(this.time * 1000) / 1000;
    for (const loc of this.locations.values()) {
      const { ents, gone, moving } = loc.takeDelta();
      const all = loc.livePlayersAll();
      const players = all.filter((p) => loc.lookChanged(p, appearanceKey(p))).map(publicPlayer);
      if (ents.length || gone.length || players.length) this.sendToLocation(loc.key, { t: 'snap', players, ents, gone });
      this.sendToLocation(loc.key, { t: 'pos', time: t, players: all.map(playerPos), ents: moving }, true);
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

  /** `fast` = may be dropped or arrive out of order (positions); goes over the unreliable lane if there is one. */
  sendToLocation(key, msg, fast = false) {
    for (const c of this.conns.values()) {
      const p = c.playerId && this.players.get(c.playerId);
      if (p && p.loc === key) (fast && c.conn.sendFast ? c.conn.sendFast(msg) : c.conn.send(msg));
    }
  }

  sendSelf(p) {
    this.send(p, {
      t: 'self', hp: p.hp, maxHp: p.maxHp, level: p.level, xp: p.xp, xpNext: xpToNext(p.level), points: p.points, stats: p.stats, gold: p.gold,
      weapon: p.weapon, shield: p.shield, armor: p.armor, gear: p.gear, blueprints: p.blueprints, closet: p.closet, pets: p.pets, pet: p.pet, inventory: p.inventory, enchants: p.enchants ?? {}, bank: p.bank ?? null,
    });
  }

  broadcastWorld() {
    const s = this.save;
    const dayLeft = Math.max(0, Math.ceil(DAY_SECONDS - this.dayClock));
    this.broadcast({
      t: 'world', name: s.name, seed: s.seed, day: s.day, flags: s.flags, dungeons: s.dungeons, dayLeft,
      house: { wall: s.house.wall, floor: s.house.floor, roomStyles: s.house.roomStyles ?? {}, rooms: this.roomsView() },
    });
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
    // the saved fields (a copy: the record is only updated by writeRecord), plus things that only live while playing
    const p = {
      id, ...structuredClone(Object.fromEntries(PLAYER_FIELDS.map((f) => [f, rec[f]]))),
      x: 0, z: 0, rot: 0, anim: 'idle', act: 0,
      loc: null, epoch: 0, lastAttack: -1, triggers: new Set(),
    };
    p.maxHp = maxHpFor(p.level, p.stats);
    p.hp = Math.max(1, Math.min(p.hp, p.maxHp));
    c.playerId = id;
    this.players.set(id, p);
    c.conn.send({ t: 'welcome', you: id, isHost: !!msg.isHost });
    this.broadcastWorld();
    this.sendSelf(p);
    this.runHooks('onJoin', p);
    this.travel(p, 'house', null, this.bedSpot?.(p)); // everyone wakes up at home
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
      // the fort is drawn for however many family members have a room
      const opts = info.kind === 'house' ? { rooms: this.fortRooms() } : {};
      loc = new LiveLocation(this, key, seed, opts);
      this.locations.set(key, loc);
      this.runHooks('onLocation', loc);
    }
    return loc;
  }

  leaveLocation(p) {
    const loc = p.loc && this.locations.get(p.loc);
    if (!loc) return;
    if (p.petEnt) { loc.remove(p.petEnt); p.petEnt = null; }
    loc.players.delete(p.id);
    loc.looks?.delete(p.id); // so their look is sent again if they come back
    if (loc.players.size === 0 && loc.layout.kind === 'dungeon') this.locations.delete(loc.key);
    p.loc = null;
  }

  /** Move a player to a location, arriving at a portal, a given spot `at` { x, z }, or the default spawn. */
  travel(p, key, portalId = null, at = null) {
    this.leaveLocation(p);
    const loc = this.getLocation(key);
    const arrive = (portalId && loc.layout.portals[portalId]?.arrive) || at || loc.layout.spawn;
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
      t: 'enter', key, seed: loc.seed, opts: loc.layout.opts, epoch: p.epoch, x: p.x, z: p.z,
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

  on_move(p, { x, z, rot, anim, epoch, seq }) {
    if (epoch !== p.epoch || !Number.isFinite(x) || !Number.isFinite(z)) return;
    // moves come over the fast lane and can arrive out of order: ignore older ones
    if (seq != null) { if (seq <= (p.moveSeq ?? -1) && seq > (p.moveSeq ?? 0) - 1e6) return; p.moveSeq = seq; }
    p.x = x; p.z = z;
    p.rot = Number(rot) || 0;
    p.anim = String(anim || 'idle').slice(0, 16);
    if (p.sleeping && p.anim !== 'sleep') this.wakeUp(p); // got out of bed
    if (p.hp > 0) this.checkTriggers(p);
  }

  // ------------------------------------------------------------------ levels

  // ------------------------------------------------------------------ pets

  /** E next to a prop: each `interact` kind is handled by a system (see systems/*.js `interactions`). */
  on_interact(p, { id }) {
    const loc = this.locations.get(p.loc);
    // a static prop from the map, or an entity that can be used (beds, furniture...)
    const target = loc?.layout.props.find((q) => q.id === id) ?? loc?.entities.get(id);
    if (!target?.interact || useDistance(target, p) > INTERACT_RANGE) return;
    if (target.requiresFlag && !this.save.flags[target.requiresFlag]) return; // not in town yet
    const handler = INTERACTIONS[target.interact];
    if (handler) handler.call(this, p, target, loc);
    else this.log(`[server] nothing handles interact '${target.interact}'`);
  }

  on_ping(p, { id }) {
    this.send(p, { t: 'pong', id });
  }

  on_chat(p, { text }) {
    const clean = String(text || '').slice(0, 120).trim();
    if (clean) this.broadcast({ t: 'chat', from: p.name, text: clean });
  }
}

const { interactions: INTERACTIONS, hooks: HOOKS } = installSystems(GameServer);
GameServer.prototype.runHooks = function (name, ...args) {
  for (const fn of HOOKS[name]) fn.call(this, ...args);
};
export { INTERACTIONS };

/** Everything about how a player looks; when it changes, everyone nearby gets the full details again. */
function appearanceKey(p) {
  return `${p.name}|${p.cls}|${JSON.stringify(p.look)}|${p.weapon}|${p.enchants?.[p.weapon] ?? 0}|${p.shield}|${p.armor}|${p.maxHp}`;
}

/** A player in a 'pos' message: [id, x, z, rot, anim, act, hp]. */
function playerPos(p) {
  return [p.id, Math.round(p.x * 100) / 100, Math.round(p.z * 100) / 100, Math.round(p.rot * 100) / 100, p.anim, p.act, p.hp];
}

function publicPlayer(p) {
  return {
    id: p.id, name: p.name, cls: p.cls, look: p.look, weapon: p.weapon, ench: p.enchants?.[p.weapon] ?? 0, shield: p.shield, armor: p.armor,
    x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100,
    rot: Math.round(p.rot * 100) / 100, anim: p.anim, act: p.act, hp: p.hp, maxHp: p.maxHp,
  };
}

export { publicPlayer };
