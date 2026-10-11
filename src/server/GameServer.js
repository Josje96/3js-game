// The authoritative game, running inside the HOST's browser tab.
// Every player (including the host's own) talks to it through a connection
// object { send(msg), onMessage(cb), onClose(cb) } — see net/transports.js.
//
// Trust model (it's a family game): clients own their own movement; the host
// owns everything else (enemies, loot, gold, hp, progression, saves).

import {
  TICK_HZ, ATTACK_RANGE, INTERACT_RANGE, ELEVATOR_STEP, SHOT_SPEED, SHOT_RANGE, ROLL_IFRAMES, ROLL_COOLDOWN,
  DEATH_GOLD_PENALTY, SPRING_COST, AUTOSAVE_SECONDS, PROTOCOL_VERSION, CLASSES, cleanLook, STYLE_SLOTS, ownsStyle,
} from '../shared/config.js';
import { DUNGEONS, ENEMIES, dungeonKey, parseKey, biomeFor, makeEnemy } from '../shared/dungeons.js';
import { ITEMS, SHOP_STOCK, FORGE_RECIPES, weaponCooldown, weaponImpact, rollGearDrop, rollBlueprint, duplicateValue } from '../shared/items.js';
import { STATS, XP, POINTS_PER_LEVEL, MAX_LEVEL, xpToNext, maxHpFor, attackDamage } from '../shared/progression.js';
import { PET_SPECIES, PET_MAX_LEVEL, TIER_LOOKS, petStage, petTier, petFormName, petXpToNext, petMaxHp, reviveCost, newPet, cleanPetName } from '../shared/pets.js';
import { hashSeed } from '../shared/rng.js';
import { dist2 } from '../shared/physics.js';
import { LiveLocation, publicEnt } from './LiveLocation.js';
import { newPlayerRecord } from './saves.js';

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
    this.broadcast({ t: 'world', name: s.name, seed: s.seed, day: s.day, gold: s.gold, flags: s.flags, dungeons: s.dungeons });
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
    if (msg.t === 'hello') return this.onHello(connId, c, msg);
    const p = c.playerId && this.players.get(c.playerId);
    if (!p) return;
    const fn = this[`on_${msg.t}`];
    if (fn) fn.call(this, p, msg);
  }

  onHello(connId, c, msg) {
    if (msg.protocol !== PROTOCOL_VERSION) {
      c.conn.send({ t: 'kicked', reason: 'Game versions differ — refresh both browsers.' });
      return;
    }
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

  elevatorStops(dungeonId) {
    const deepest = this.save.dungeons[dungeonId].deepest;
    const stops = [1];
    for (let f = ELEVATOR_STEP; f <= deepest; f += ELEVATOR_STEP) stops.push(f);
    return stops;
  }

  enterDungeon(p, dungeonId) {
    const def = DUNGEONS[dungeonId];
    if (def.unlockFlag && !this.save.flags[def.unlockFlag]) {
      return this.toast(p, `The ${def.name} gate is sealed. Defeat the boss of the Old Mine to open it!`);
    }
    const stops = this.elevatorStops(dungeonId);
    if (stops.length === 1) return this.travel(p, dungeonKey(dungeonId, 1), 'U');
    this.send(p, { t: 'ui', kind: 'elevator', dungeon: dungeonId, name: def.name, floors: stops });
  }

  on_elevator(p, { dungeon, floor }) {
    if (!DUNGEONS[dungeon] || !this.elevatorStops(dungeon).includes(floor)) return;
    const here = this.locations.get(p.loc);
    // must be standing at the entrance (in town)
    if (here?.key !== 'town') return;
    this.travel(p, dungeonKey(dungeon, floor), 'U');
  }

  useLadder(p, loc) {
    const { dungeonId, floor } = loc.layout;
    if (floor >= DUNGEONS[dungeonId].floors) return;
    this.travel(p, dungeonKey(dungeonId, floor + 1), 'U');
  }

  // ------------------------------------------------------------------ player messages

  on_move(p, { x, z, rot, anim, epoch }) {
    if (epoch !== p.epoch || !Number.isFinite(x) || !Number.isFinite(z)) return;
    p.x = x; p.z = z;
    p.rot = Number(rot) || 0;
    p.anim = String(anim || 'idle').slice(0, 16);
    if (p.hp > 0) this.checkTriggers(p);
  }

  /** Dodge roll: a moment of invulnerability. (Movement itself is the client's.) */
  on_roll(p) {
    if (this.time - (p.lastRoll ?? -9) < ROLL_COOLDOWN * 0.85 || p.hp <= 0) return;
    p.lastRoll = this.time;
    p.rollUntil = this.time + ROLL_IFRAMES;
    p.dodgeShown = false;
  }

  on_attack(p, { rot }) {
    // a little slack so network jitter doesn't eat swings the client already showed
    if (this.time - p.lastAttack < weaponCooldown(p.weapon) * 0.85 || p.hp <= 0) return;
    p.lastAttack = this.time;
    p.act++;
    // damage lands on the animation's impact frame, not on the button press
    p.pendingHit = { at: this.time + weaponImpact(p.weapon), rot: Number(rot) || p.rot, loc: p.loc };
  }

  resolveAttack(p, { rot: r, loc: key }) {
    const loc = this.locations.get(p.loc);
    if (!loc || p.loc !== key || p.hp <= 0) return;
    const dmg = attackDamage(p.weapon, p.stats);
    const ranged = ITEMS[p.weapon]?.ranged;
    if (ranged) {
      loc.spawn({
        type: 'shot', kind: ranged, rot: r,
        x: p.x + Math.sin(r) * 0.9, z: p.z + Math.cos(r) * 0.9,
        vx: Math.sin(r) * SHOT_SPEED, vz: Math.cos(r) * SHOT_SPEED,
        _dmg: dmg, _owner: p.id, _life: SHOT_RANGE / SHOT_SPEED,
      });
      return;
    }
    const hx = p.x + Math.sin(r) * 1.2, hz = p.z + Math.cos(r) * 1.2;
    for (const e of [...loc.entities.values()]) {
      const reach = ATTACK_RANGE * 0.6 + e.r;
      if ((e.x - hx) ** 2 + (e.z - hz) ** 2 > reach * reach) continue;
      this.hitEntity(p, loc, e, dmg);
    }
  }

  /** Something got hit by `p` (up close, or by their arrow/bolt coming from `from`). */
  hitEntity(p, loc, e, dmg, from = p) {
    if (e.type === 'rock') this.hitRock(p, loc, e, dmg);
    else if (e.type === 'slime') this.hitSlime(p, loc, e, dmg, from);
    else if (e.type === 'barrel') this.hitBarrel(loc, e, dmg);
    else if (e.type === 'chest') this.openChest(p, loc, e);
  }

  hitRock(p, loc, e, dmg) {
    e.hp -= dmg;
    e._dirty = true;
    this.sendToLocation(loc.key, { t: 'fx', kind: 'hit', id: e.id, x: e.x, z: e.z });
    if (e.hp > 0) return;
    loc.remove(e.id);
    this.dropItem(loc, e, e.ore, 1);
    this.sendToLocation(loc.key, { t: 'fx', kind: 'break', x: e.x, z: e.z, ore: e.ore });
    this.shareXp(loc, XP.rock);
    this.maybeSpawnLadder(loc, e);
  }

  hitSlime(p, loc, e, dmg, from = p) {
    e.hp -= dmg;
    e._stun = 0.25;
    const d = Math.sqrt(dist2(e, from)) || 1;
    const push = e.boss ? 4 : 14;
    e._kx = ((e.x - from.x) / d) * push;
    e._kz = ((e.z - from.z) / d) * push;
    this.sendToLocation(loc.key, { t: 'fx', kind: 'dmg', id: e.id, x: e.x, z: e.z, amount: dmg });
    if (e.hp > 0) return;
    loc.remove(e.id);
    const [lo, hi] = ENEMIES[e.variant].gold;
    this.dropItem(loc, e, 'gold', lo + Math.floor(Math.random() * (hi - lo + 1)));
    if (Math.random() < 0.3) this.dropItem(loc, e, 'slimegoo', 1);
    if (e.boss || Math.random() < 0.035) this.dropGear(loc, e, e.boss ? 4 : 0);
    if (e.boss) this.dropBlueprint(loc, e, 4);
    this.sendToLocation(loc.key, { t: 'fx', kind: 'pop', x: e.x, z: e.z, variant: e.variant });
    this.shareXp(loc, e.boss ? XP.boss : XP.slime(e.maxHp));
    if (e.boss) this.bossDefeated(loc, e);
    else this.maybeSpawnLadder(loc, e, loc.count('slime') === 0);
  }

  hitBarrel(loc, e, dmg) {
    e.hp -= dmg;
    e._dirty = true;
    this.sendToLocation(loc.key, { t: 'fx', kind: 'hit', id: e.id, x: e.x, z: e.z });
    if (e.hp > 0) return;
    loc.remove(e.id);
    this.sendToLocation(loc.key, { t: 'fx', kind: 'smash', x: e.x, z: e.z });
    this.shareXp(loc, XP.barrel);
    // what's inside? deeper floors hide better things
    const floor = loc.layout.floor ?? 1;
    const roll = Math.random();
    if (roll < 0.04) this.dropGear(loc, e);
    else if (roll < 0.45) this.dropItem(loc, e, 'gold', 2 + Math.floor(Math.random() * (4 + floor * 2)));
    else if (roll < 0.62) this.dropItem(loc, e, floor >= 6 ? 'silver' : floor >= 3 ? 'copper' : 'stone', 1 + Math.floor(Math.random() * 2));
    else if (roll < 0.74) this.dropItem(loc, e, 'slimegoo', 1);
    else if (roll < 0.84) this.dropItem(loc, e, 'potion', 1);
    else if (roll < 0.91) { // surprise!
      const kinds = biomeFor(loc.layout.dungeonId, floor).enemies(floor);
      loc.spawn(makeEnemy(kinds[Math.floor(Math.random() * kinds.length)], floor, e.x, e.z));
      this.sendToLocation(loc.key, { t: 'toast', text: 'Something was hiding in the barrel!' });
    } // else: empty, just splinters
  }

  openChest(p, loc, e) {
    loc.remove(e.id);
    for (let i = 0; i < 3; i++) this.dropItem(loc, e, 'gold', Math.ceil(e.gold / 3));
    if (Math.random() < 0.5) this.dropItem(loc, e, 'potion', 1);
    if (Math.random() < 0.35) this.dropGear(loc, e);
    if (Math.random() < 0.3) this.dropBlueprint(loc, e);
    this.sendToLocation(loc.key, { t: 'fx', kind: 'chest', x: e.x, z: e.z });
  }

  /** A blueprint scroll; which recipe is decided when someone picks it up (so it's new to them). */
  dropBlueprint(loc, at, bonusDepth = 0) {
    const a = Math.random() * Math.PI * 2;
    loc.spawn({ type: 'drop', item: 'blueprint', qty: 1, depth: (loc.layout.floor ?? 1) + bonusDepth, x: at.x + Math.cos(a) * 0.6, z: at.z + Math.sin(a) * 0.6 });
  }

  /** A weapon or shield on the floor; how good depends on how deep we are. */
  dropGear(loc, at, bonusDepth = 0) {
    this.dropItem(loc, at, rollGearDrop((loc.layout.floor ?? 1) + bonusDepth), 1);
  }

  // ------------------------------------------------------------------ levels

  /** Co-op: everyone standing in the location shares the XP. */
  shareXp(loc, amount) {
    for (const p of loc.livePlayers()) this.addXp(p, amount);
  }

  addXp(p, amount) {
    if (p.level >= MAX_LEVEL) return;
    p.xp += amount;
    let gained = 0;
    while (p.level < MAX_LEVEL && p.xp >= xpToNext(p.level)) {
      p.xp -= xpToNext(p.level);
      p.level++;
      p.points += POINTS_PER_LEVEL;
      gained++;
    }
    if (gained) {
      p.maxHp = maxHpFor(p.level, p.stats);
      p.hp = p.maxHp; // levelling up heals you
      this.sendToLocation(p.loc, { t: 'fx', kind: 'levelup', id: p.id, x: p.x, z: p.z, level: p.level });
      this.toast(p, `Level up! You are level ${p.level}. Press C to spend your skill points.`);
      this.broadcastRoster();
    }
    this.sendSelf(p);
  }

  on_spend(p, { stat }) {
    if (!STATS[stat] || p.points <= 0) return;
    p.points--;
    p.stats[stat]++;
    const before = p.maxHp;
    p.maxHp = maxHpFor(p.level, p.stats);
    p.hp += p.maxHp - before;
    this.writeRecord(p);
    this.sendSelf(p);
  }

  /** Equip something from your gear bag (or take your shield off with item: null, slot: 'shield'). */
  on_equip(p, { item, slot }) {
    if (item === null && slot === 'shield') p.shield = null;
    else {
      const def = ITEMS[item];
      if (!def || !p.gear.includes(item)) return;
      if (def.kind === 'weapon') p.weapon = item;
      else if (def.kind === 'shield') p.shield = item;
      else return;
    }
    this.writeRecord(p);
    this.sendSelf(p);
  }

  /** Found or bought a weapon/shield: into the bag, and on if it's better than what you hold. */
  gainGear(p, item) {
    const def = ITEMS[item];
    if (p.gear.includes(item)) {
      const gold = duplicateValue(item);
      this.save.gold += gold;
      this.broadcastWorld();
      this.toast(p, `Another ${def.name}! You already have one, so it's worth ${gold} gold.`);
      return;
    }
    p.gear.push(item);
    const better = def.kind === 'weapon'
      ? attackDamage(item, p.stats) > attackDamage(p.weapon, p.stats)
      : (def.block ?? 0) > (ITEMS[p.shield]?.block ?? 0);
    if (better) {
      if (def.kind === 'weapon') p.weapon = item; else p.shield = item;
    }
    this.toast(p, `New ${def.kind}: ${def.name}!${better ? ' Equipped.' : ' Press C to equip it.'}`);
    this.writeRecord(p);
    this.sendSelf(p);
  }

  maybeSpawnLadder(loc, at, force = false) {
    if (loc.ladderSpawned || loc.layout.kind !== 'dungeon' || loc.layout.isBoss) return;
    // Stardew-style: the fewer rocks left, the likelier the ladder.
    const left = loc.count('rock');
    const cleared = loc.initialRocks ? 1 - left / loc.initialRocks : 1;
    const p = 0.04 + 0.4 * cleared * cleared;
    if (!force && left > 0 && Math.random() > p) return;
    loc.ladderSpawned = true;
    loc.spawn({ type: 'ladder', x: at.x, z: at.z });
    this.sendToLocation(loc.key, { t: 'toast', text: 'A way down appeared!' });
  }

  bossDefeated(loc, boss) {
    const { dungeonId, floor } = loc.layout;
    const def = DUNGEONS[dungeonId], biome = biomeFor(dungeonId, floor);
    const opensGate = biome.boss.flag === 'mineCleared' && !this.save.flags.mineCleared;
    this.save.flags[biome.boss.flag] = true;
    if (biome.boss.flag === def.clearFlag) this.save.flags[def.clearFlag] = true;
    for (let i = 0; i < 5; i++) this.dropItem(loc, boss, 'gold', Math.ceil(ENEMIES[boss.variant].gold[0] / 5));
    let news = `${boss.name} was defeated!`;
    if (opensGate) news += ' Something rumbles in town... a sealed gate has opened!';
    if (floor < def.floors) {
      // the way on to the next biome
      loc.ladderSpawned = true;
      loc.spawn({ type: 'ladder', x: boss.x, z: boss.z });
      news += ` A way down to ${biomeFor(dungeonId, floor + 1).name} opened!`;
    } else news += ' You reached the very bottom!';
    this.broadcast({ t: 'toast', text: news, big: true });
    this.broadcastWorld();
    this.persist();
  }

  dropItem(loc, at, item, qty) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 0.8;
    loc.spawn({ type: 'drop', item, qty, x: at.x + Math.cos(a) * r, z: at.z + Math.sin(a) * r });
  }

  pickup(p, drop) {
    const kind = ITEMS[drop.item]?.kind;
    if (drop.item === 'gold') {
      this.save.gold += drop.qty;
      this.broadcastWorld();
    } else if (kind === 'weapon' || kind === 'shield') {
      this.gainGear(p, drop.item);
    } else if (kind === 'blueprint') {
      const recipe = rollBlueprint(drop.depth ?? 1, p.blueprints);
      if (recipe) {
        p.blueprints.push(recipe);
        this.toast(p, `Blueprint: ${ITEMS[recipe].name}! Take it to the forge in town.`);
        this.writeRecord(p);
        this.sendSelf(p);
      } else {
        this.save.gold += 25;
        this.broadcastWorld();
        this.toast(p, 'An old blueprint you already know. Sold it for 25 gold.');
      }
    } else {
      p.inventory[drop.item] = (p.inventory[drop.item] ?? 0) + drop.qty;
      this.sendSelf(p);
    }
    this.send(p, { t: 'fx', kind: 'pickup', item: drop.item, qty: drop.qty, x: drop.x, z: drop.z });
  }

  damagePlayer(p, amount) {
    if (p.hp <= 0) return;
    if (this.time < (p.rollUntil ?? 0)) {
      if (!p.dodgeShown) { p.dodgeShown = true; this.send(p, { t: 'fx', kind: 'dodge', id: p.id }); }
      return;
    }
    if (p.shield && Math.random() < ITEMS[p.shield].block) {
      this.sendToLocation(p.loc, { t: 'fx', kind: 'block', id: p.id, x: p.x, z: p.z });
      return;
    }
    p.hp = Math.max(0, p.hp - amount);
    this.sendSelf(p);
    this.sendToLocation(p.loc, { t: 'fx', kind: 'hurt', id: p.id, x: p.x, z: p.z, amount });
    if (p.hp > 0) return;
    const lost = Math.floor(this.save.gold * DEATH_GOLD_PENALTY);
    this.save.gold -= lost;
    this.toast(p, `You fainted! Someone carried you home.${lost ? ` (dropped ${lost} gold)` : ''}`);
    p.hp = p.maxHp;
    this.sendSelf(p);
    this.broadcastWorld();
    this.travel(p, 'house');
  }

  on_interact(p, { id }) {
    const loc = this.locations.get(p.loc);
    if (!loc) return;
    const prop = loc.layout.props.find((q) => q.id === id);
    if (!prop || !prop.interact) return;
    if (dist2(p, prop) > (INTERACT_RANGE + prop.radius) ** 2) return;
    if (prop.interact === 'sleep') {
      p.hp = p.maxHp;
      for (const pet of p.pets) if (!pet.fainted) pet.hp = petMaxHp(pet.species, pet.level); // fainted ones need the Pet Keeper
      this.syncPetEnt(p);
      this.save.day++;
      this.sendSelf(p);
      this.persist();
      this.broadcastWorld();
      this.broadcast({ t: 'toast', text: `${p.name} slept. Day ${this.save.day} — game saved!` });
    } else if (prop.interact === 'shop') {
      this.send(p, { t: 'ui', kind: 'shop', stock: SHOP_STOCK });
    } else if (prop.interact === 'spring') {
      if (p.hp >= p.maxHp) return this.toast(p, 'You splash about. You already feel great!');
      if (this.save.gold < SPRING_COST) return this.toast(p, `The spring asks for ${SPRING_COST} gold...`);
      this.save.gold -= SPRING_COST;
      const healed = p.maxHp - p.hp;
      p.hp = p.maxHp;
      const pet = p.pets.find((x) => x.id === p.pet && !x.fainted);
      if (pet) { pet.hp = petMaxHp(pet.species, pet.level); this.syncPetEnt(p); } // a splash for the pet too
      this.sendSelf(p);
      this.broadcastWorld();
      this.sendToLocation(p.loc, { t: 'fx', kind: 'heal', id: p.id, x: p.x, z: p.z, amount: healed });
      this.toast(p, `The spring sparkles... fully healed! (-${SPRING_COST} gold)`);
    } else if (prop.interact === 'forge') {
      this.send(p, { t: 'ui', kind: 'forge' });
    } else if (prop.interact === 'pets') {
      this.send(p, { t: 'ui', kind: 'pets' });
    } else if (prop.interact === 'wardrobe') {
      this.send(p, { t: 'ui', kind: 'wardrobe' });
    } else if (prop.interact === 'mirror') {
      this.send(p, { t: 'ui', kind: 'mirror' });
    } else if (prop.interact === 'storage') {
      this.toast(p, 'The family chest is empty... (storage coming soon!)');
    }
  }

  on_buy(p, { item }) {
    const def = ITEMS[item];
    if (!def || !SHOP_STOCK.includes(item)) return;
    if (this.save.gold < def.price) return this.toast(p, 'Not enough gold!');
    const gear = def.kind === 'weapon' || def.kind === 'shield';
    if (gear && p.gear.includes(item)) return this.toast(p, 'You already have that one. Press C to equip it.');
    this.save.gold -= def.price;
    if (gear) {
      p.gear.push(item);
      if (def.kind === 'weapon') p.weapon = item; else p.shield = item; // just bought it: put it on
      this.writeRecord(p);
    } else p.inventory[item] = (p.inventory[item] ?? 0) + 1;
    this.toast(p, `Bought ${def.name}!`);
    this.sendSelf(p);
    this.broadcastWorld();
  }

  /** Buy a hat / back item / dye for this player's closet (paid from the family purse). */
  on_buyStyle(p, { slot, id }) {
    const def = STYLE_SLOTS[slot]?.[id];
    if (!def?.price || ownsStyle(p.closet, slot, id)) return;
    if (this.save.gold < def.price) return this.toast(p, 'Not enough gold!');
    this.save.gold -= def.price;
    p.closet.push(`${slot}:${id}`);
    this.toast(p, `Bought ${def.name}! Try it on at the wardrobe at home.`);
    this.writeRecord(p);
    this.sendSelf(p);
    this.broadcastWorld();
  }

  /** Make a forged weapon: needs its blueprint, the materials and gold. Only at the forge. */
  on_forge(p, { recipe }) {
    const r = FORGE_RECIPES[recipe];
    if (!r || !p.blueprints.includes(recipe) || p.loc !== 'town') return;
    if (p.gear.includes(recipe)) return this.toast(p, 'You already have one of those!');
    for (const [item, n] of Object.entries(r.needs)) {
      if ((p.inventory[item] ?? 0) < n) return this.toast(p, `You need ${n} ${ITEMS[item].name}.`);
    }
    if (this.save.gold < r.gold) return this.toast(p, 'Not enough gold!');
    for (const [item, n] of Object.entries(r.needs)) {
      p.inventory[item] -= n;
      if (!p.inventory[item]) delete p.inventory[item];
    }
    this.save.gold -= r.gold;
    this.sendToLocation(p.loc, { t: 'fx', kind: 'forge', id: p.id, x: p.x, z: p.z });
    this.gainGear(p, recipe);
    this.broadcastWorld();
  }

  // ------------------------------------------------------------------ pets

  /** Put the player's active pet into their location (as an entity that follows and fights). */
  spawnPet(p, loc) {
    if (p.petEnt) { this.locations.get(p.loc)?.remove(p.petEnt); p.petEnt = null; }
    const pet = p.pets.find((x) => x.id === p.pet);
    if (!pet || pet.fainted || !loc) return;
    const a = Math.random() * Math.PI * 2;
    const ent = loc.spawn({
      type: 'pet', species: pet.species, name: pet.name, level: pet.level, owner: p.id, act: 0,
      hp: pet.hp, maxHp: petMaxHp(pet.species, pet.level),
      x: p.x + Math.cos(a) * 1.2, z: p.z + Math.sin(a) * 1.2, rot: p.rot, _pet: pet,
    });
    p.petEnt = ent.id;
  }

  petsChanged(p) {
    this.spawnPet(p, this.locations.get(p.loc));
    this.writeRecord(p);
    this.sendSelf(p);
  }

  on_buyPet(p, { species, name }) {
    const def = PET_SPECIES[species];
    if (!def) return;
    if (p.pets.some((x) => x.species === species)) return this.toast(p, `You already have a ${def.name.toLowerCase()}!`);
    if (this.save.gold < def.price) return this.toast(p, 'Not enough gold!');
    this.save.gold -= def.price;
    const pet = newPet(species, name);
    p.pets.push(pet);
    p.pet = pet.id;
    this.toast(p, `${pet.name} joined you! Pets fight with you, level up and evolve.`);
    this.petsChanged(p);
    this.broadcastWorld();
  }

  /** Copy the active pet's record (hp...) onto its entity, e.g. after healing. */
  syncPetEnt(p) {
    const ent = p.petEnt && this.locations.get(p.loc)?.entities.get(p.petEnt);
    if (!ent) return;
    ent.hp = ent._pet.hp;
    ent.maxHp = petMaxHp(ent._pet.species, ent._pet.level);
    ent._dirty = true;
  }

  /** Something hit a pet. At 0 health it faints and goes home until revived at the Pet Keeper. */
  damagePet(ent, amount) {
    const pet = ent._pet, owner = this.players.get(ent.owner);
    if (!pet || pet.fainted) return;
    pet.hp = Math.max(0, pet.hp - amount);
    ent.hp = pet.hp;
    ent._dirty = true;
    this.sendToLocation(owner?.loc, { t: 'fx', kind: 'hurt', id: ent.id, x: ent.x, z: ent.z, amount });
    if (pet.hp > 0) { if (owner) this.sendSelf(owner); return; }
    pet.fainted = true;
    const loc = owner && this.locations.get(owner.loc);
    loc?.remove(ent.id);
    if (owner) {
      owner.petEnt = null;
      this.sendToLocation(owner.loc, { t: 'fx', kind: 'faint', x: ent.x, z: ent.z });
      this.toast(owner, `${pet.name} fainted and went home! Revive them at the Pet Keeper in town (${reviveCost(pet.level)} gold).`);
      this.writeRecord(owner);
      this.sendSelf(owner);
    }
  }

  /** Pay the Pet Keeper to wake a fainted pet up (full health). */
  on_revivePet(p, { id }) {
    const pet = p.pets.find((x) => x.id === id);
    if (!pet?.fainted || p.loc !== 'town') return;
    const cost = reviveCost(pet.level);
    if (this.save.gold < cost) return this.toast(p, 'Not enough gold!');
    this.save.gold -= cost;
    pet.fainted = false;
    pet.hp = petMaxHp(pet.species, pet.level);
    this.toast(p, `${pet.name} is wide awake and ready for adventure!`);
    if (p.pet === pet.id) this.spawnPet(p, this.locations.get(p.loc));
    this.writeRecord(p);
    this.sendSelf(p);
    this.broadcastWorld();
  }

  /** Choose which pet follows you (null = everyone naps at home). */
  on_pickPet(p, { id }) {
    if (id !== null && !p.pets.some((x) => x.id === id)) return;
    if (id !== null && p.pets.find((x) => x.id === id).fainted) return this.toast(p, 'That pet fainted. Revive them at the Pet Keeper first!');
    p.pet = id;
    this.petsChanged(p);
  }

  on_renamePet(p, { id, name }) {
    const pet = p.pets.find((x) => x.id === id);
    const clean = cleanPetName(name);
    if (!pet || !clean || PET_SPECIES[pet.species].fixedName) return;
    pet.name = clean;
    this.petsChanged(p);
  }

  /** A pet's own XP: it levels up, and evolves at EVOLVE_AT. */
  petXp(owner, ent, amount) {
    const pet = ent._pet;
    if (!pet || pet.level >= PET_MAX_LEVEL) return;
    pet.xp += amount;
    const stageBefore = petStage(pet.level), tierBefore = petTier(pet.level), hpBefore = petMaxHp(pet.species, pet.level);
    let up = false;
    while (pet.level < PET_MAX_LEVEL && pet.xp >= petXpToNext(pet.level)) {
      pet.xp -= petXpToNext(pet.level);
      pet.level++;
      up = true;
    }
    if (!up) return;
    pet.hp += petMaxHp(pet.species, pet.level) - hpBefore; // growing up adds health
    ent.level = pet.level;
    ent.hp = pet.hp;
    ent.maxHp = petMaxHp(pet.species, pet.level);
    ent._dirty = true;
    if (petStage(pet.level) > stageBefore) {
      this.sendToLocation(owner.loc, { t: 'fx', kind: 'evolve', id: ent.id, x: ent.x, z: ent.z });
      this.broadcast({ t: 'toast', text: `What? ${pet.name} is evolving... into ${petFormName(pet.species, pet.level)}!`, big: true });
    } else if (petTier(pet.level) > tierBefore) {
      this.sendToLocation(owner.loc, { t: 'fx', kind: 'evolve', id: ent.id, x: ent.x, z: ent.z });
      this.toast(owner, `${pet.name} reached level ${pet.level} and got ${TIER_LOOKS[petTier(pet.level)]}!`);
    } else {
      this.sendToLocation(owner.loc, { t: 'fx', kind: 'petlevel', id: ent.id, x: ent.x, z: ent.z, level: pet.level });
    }
    this.sendSelf(owner);
  }

  on_sell(p, { item, qty }) {
    const def = ITEMS[item];
    const have = p.inventory[item] ?? 0;
    const n = Math.min(have, Math.max(1, Math.floor(qty) || 1));
    if (!def?.sell || n <= 0) return;
    p.inventory[item] = have - n;
    if (!p.inventory[item]) delete p.inventory[item];
    this.save.gold += def.sell * n;
    this.toast(p, `Sold ${n} ${def.name} for ${def.sell * n} gold`);
    this.sendSelf(p);
    this.broadcastWorld();
  }

  on_use(p, { item }) {
    const def = ITEMS[item];
    if (def?.kind !== 'consumable' || !p.inventory[item]) return;
    if (p.hp >= p.maxHp) return this.toast(p, 'Already at full health!');
    p.inventory[item]--;
    if (!p.inventory[item]) delete p.inventory[item];
    p.hp = Math.min(p.maxHp, p.hp + def.heal);
    this.sendSelf(p);
    this.sendToLocation(p.loc, { t: 'fx', kind: 'heal', id: p.id, x: p.x, z: p.z, amount: def.heal });
  }

  /** Change outfit / hat / cape. Only at home, where the wardrobe is. */
  on_wardrobe(p, { cls, look }) {
    if (p.loc !== 'house' || !CLASSES[cls]) return;
    p.cls = cls;
    p.look = cleanLook(look, p.closet);
    this.writeRecord(p);
    this.broadcastRoster();
  }

  on_chat(p, { text }) {
    const clean = String(text || '').slice(0, 120).trim();
    if (clean) this.broadcast({ t: 'chat', from: p.name, text: clean });
  }
}

function publicPlayer(p) {
  return {
    id: p.id, name: p.name, cls: p.cls, look: p.look, weapon: p.weapon, shield: p.shield,
    x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100,
    rot: Math.round(p.rot * 100) / 100, anim: p.anim, act: p.act, hp: p.hp, maxHp: p.maxHp,
  };
}

export { publicPlayer };
