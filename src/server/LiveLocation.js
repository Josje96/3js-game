// A location that currently has players in it. Owns the dynamic entities
// (rocks, slimes, drops, chests, ladders) and runs their simple AI.
// Dungeon floors are thrown away when the last player leaves (like Stardew),
// and regenerate from the seed next time.

import { buildLayout } from '../shared/locations.js';
import { moveCircle, dist2, blocked } from '../shared/physics.js';
import { PLAYER_RADIUS, PICKUP_RANGE } from '../shared/config.js';
import { ENEMIES, makeEnemy } from '../shared/dungeons.js';
import { petDamage } from '../shared/pets.js';
import { XP } from '../shared/progression.js';

const RADIUS = { rock: 1.0, chest: 1.0, barrel: 0.75, slime: 0.7, drop: 0.3, ladder: 1.1, shot: 0.3, pet: 0.35 }; // ladder = trigger radius
export const SOLID_TYPES = new Set(['rock', 'chest', 'barrel', 'furniture', 'dummy']);

const HITTABLE = new Set(['rock', 'slime', 'chest', 'barrel', 'dummy']);
const LOOT_PRIVATE = 30; // seconds a share of a kill's loot stays its owner's alone

export class LiveLocation {
  constructor(server, key, seed, opts = {}) {
    this.server = server;
    this.key = key;
    this.seed = seed;
    this.layout = buildLayout(key, seed, opts);
    this.entities = new Map();
    this.players = new Set();
    this.gone = [];          // ids removed since last snapshot
    this.ladderSpawned = false;
    for (const init of this.layout.initial) this.spawn(structuredClone(init));
    // enemies with a different size than a slime (yetis, golems...)
    for (const e of this.entities.values()) if (e.type === 'slime' && ENEMIES[e.variant]?.r) e.r = ENEMIES[e.variant].r * (e.scale ?? 1);
    this.initialRocks = this.count('rock');
  }

  spawn(ent) {
    ent.id = `e${this.server.nextEntityId++}`;
    ent.rot ??= 0;
    ent.scale ??= 1;
    ent.r ??= (RADIUS[ent.type] ?? 0.5) * (ent.type === 'slime' ? ent.scale : 1);
    ent._dirty = true;
    this.entities.set(ent.id, ent);
    return ent;
  }

  remove(id) {
    if (this.entities.delete(id)) this.gone.push(id);
  }

  count(type) {
    let n = 0;
    for (const e of this.entities.values()) if (e.type === type) n++;
    return n;
  }

  /** Things that block movement: static props + rocks, chests, barrels. */
  solids() {
    const out = [...this.layout.solids];
    for (const e of this.entities.values()) if (SOLID_TYPES.has(e.type) && e.r > 0) out.push({ x: e.x, z: e.z, r: e.r });
    return out;
  }

  livePlayersAll() {
    return [...this.players].map((id) => this.server.players.get(id)).filter(Boolean);
  }

  livePlayers() {
    return this.livePlayersAll().filter((p) => p.hp > 0);
  }

  tick(dt) {
    const players = this.livePlayers();
    const solids = this.solids();
    const slimes = [];
    for (const e of this.entities.values()) {
      if (e.type === 'slime') { this.tickSlime(e, dt, players, solids); slimes.push(e); }
      else if (e.type === 'drop') this.tickDrop(e, dt, players);
      else if (e.type === 'shot') this.tickShot(e, dt);
      else if (e.type === 'pet') this.tickPet(e, dt);
    }
    this.separate(slimes, dt, solids);
  }

  /** Arrows and magic bolts fly straight until they hit something, a wall, or run out of range. */
  tickShot(e, dt) {
    e._life -= dt;
    const steps = 3;
    for (let i = 0; i < steps; i++) {
      e.x += (e.vx * dt) / steps;
      e.z += (e.vz * dt) / steps;
      if (e.hostile) { // enemy fireballs hit players, not things
        for (const p of this.livePlayers()) {
          if (dist2(e, p) > (e.r + PLAYER_RADIUS) ** 2) continue;
          this.remove(e.id);
          this.server.damagePlayer(p, e._dmg, e);
          return;
        }
        for (const pet of this.entities.values()) {
          if (pet.type !== 'pet' || dist2(e, pet) > (e.r + pet.r) ** 2) continue;
          this.remove(e.id);
          this.server.damagePet(pet, e._dmg);
          return;
        }
        if (blocked(this.layout, e.x, e.z, 0.1)) { this.remove(e.id); return; }
        continue;
      }
      for (const t of this.entities.values()) {
        if (!HITTABLE.has(t.type) || dist2(e, t) > (t.r + e.r) ** 2) continue;
        this.remove(e.id);
        const owner = this.server.players.get(e._owner);
        if (owner && owner.loc === this.key) this.server.hitEntity(owner, this, t, e._dmg, { x: e.x - e.vx, z: e.z - e.vz });
        return;
      }
      if (blocked(this.layout, e.x, e.z, 0.1)) { this.remove(e.id); return; }
    }
    if (e._life <= 0) this.remove(e.id);
  }

  /** Keep slimes from piling into one blob. */
  separate(slimes, dt, solids) {
    for (let i = 0; i < slimes.length; i++) {
      for (let j = i + 1; j < slimes.length; j++) {
        const a = slimes[i], b = slimes[j];
        const dx = b.x - a.x, dz = b.z - a.z;
        const min = a.r + b.r;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.01;
        const push = Math.min((min - d) * 0.5, 4 * dt);
        const nx = d2 ? dx / d : Math.random() - 0.5, nz = d2 ? dz / d : Math.random() - 0.5;
        // the boss doesn't get shoved around by its minions
        const wa = a.boss ? 0 : b.boss ? 2 : 1, wb = b.boss ? 0 : a.boss ? 2 : 1;
        Object.assign(a, moveCircle(this.layout, a.x, a.z, -nx * push * wa, -nz * push * wa, a.r, solids));
        Object.assign(b, moveCircle(this.layout, b.x, b.z, nx * push * wb, nz * push * wb, b.r, solids));
      }
    }
  }

  tickSlime(e, dt, players, solids) {
    e._atkCd = Math.max(0, (e._atkCd ?? 0) - dt);
    e._stun = Math.max(0, (e._stun ?? 0) - dt);
    const def = ENEMIES[e.variant] ?? {};
    const aggro = e.boss ? 40 : 18;
    let target = null, best = aggro * aggro;
    for (const p of players) {
      if (e._home && dist2(p, e._home) > (e._home.r + 2) ** 2) continue; // leashed: only plays with people in its yard
      const d = dist2(e, p);
      if (d < best) { best = d; target = p; }
    }
    // pets fighting nearby are fair game too
    for (const pet of this.entities.values()) {
      if (pet.type !== 'pet' || def.harmless) continue;
      const d = dist2(e, pet);
      if (d < best && d < 6 * 6) { best = d; target = pet; }
    }

    let vx = 0, vz = 0;
    if (e._stun <= 0) {
      if (target) {
        const d = Math.sqrt(best) || 1;
        const ux = (target.x - e.x) / d, uz = (target.z - e.z) / d;
        e._t = (e._t ?? Math.random() * 10) + dt;
        switch (def.ai) {
          case 'flutter': { // zig-zag in, like a bat
            const wob = Math.sin(e._t * 7) * 0.9;
            vx = (ux - uz * wob) * e.speed;
            vz = (uz + ux * wob) * e.speed;
            break;
          }
          case 'pounce': { // creep, crouch, then lunge
            e._pounce = (e._pounce ?? 2) - dt;
            if (e._pounce > 0.75 || d > 7) { vx = ux * e.speed * 0.6; vz = uz * e.speed * 0.6; }
            else if (e._pounce > 0.35) { e.anim = 'crouch'; } // wind up (standing still)
            else { e.anim = 'leap'; vx = (e._lx ??= ux) * e.speed * 4; vz = (e._lz ??= uz) * e.speed * 4; }
            if (e._pounce <= 0) { e._pounce = 1.6 + Math.random(); e._lx = e._lz = undefined; e.anim = undefined; }
            break;
          }
          case 'shooter': { // keep a nice distance and throw fire
            const want = e.boss ? 7 : 6;
            const sgn = d > want + 1.5 ? 1 : d < want - 1.5 ? -1 : 0;
            vx = (ux * sgn - uz * 0.4) * e.speed;
            vz = (uz * sgn + ux * 0.4) * e.speed;
            e._shoot = (e._shoot ?? 1.5) - dt;
            if (e._shoot <= 0 && d < 14) {
              e._shoot = e.boss ? 1.1 : 2.2;
              this.fireball(e, Math.atan2(ux, uz));
              if (e.boss) { this.fireball(e, Math.atan2(ux, uz) + 0.3); this.fireball(e, Math.atan2(ux, uz) - 0.3); }
            }
            break;
          }
          default:
            vx = ux * e.speed;
            vz = uz * e.speed;
        }
        if (def.summon) { // bosses that call for help
          e._summon = (e._summon ?? 5) - dt;
          if (e._summon <= 0 && this.count('slime') < 10) {
            e._summon = 7;
            const a = Math.random() * Math.PI * 2;
            // helpers share the boss's strength, and its yard if it has one (the seasonal boss in town)
            const helper = makeEnemy(def.summon, e._depth ?? this.layout.depth ?? 1, e.x + Math.cos(a) * 2.5, e.z + Math.sin(a) * 2.5);
            this.spawn(e._home ? { ...helper, _home: e._home } : helper);
          }
        }
      } else if (e._home && dist2(e, e._home) > e._home.r ** 2) {
        // wandered out of its yard: hop back home
        const d = Math.sqrt(dist2(e, e._home)) || 1;
        vx = ((e._home.x - e.x) / d) * e.speed;
        vz = ((e._home.z - e.z) / d) * e.speed;
      } else {
        // lazy wander
        e._wanderT = (e._wanderT ?? 0) - dt;
        if (e._wanderT <= 0) {
          e._wanderT = 1 + Math.random() * 2;
          const a = Math.random() * Math.PI * 2;
          e._wx = Math.random() < 0.4 ? 0 : Math.cos(a);
          e._wz = Math.random() < 0.4 ? 0 : Math.sin(a);
        }
        vx = e._wx * e.speed * 0.4;
        vz = e._wz * e.speed * 0.4;
      }
    }
    // knockback impulse
    vx += e._kx ?? 0; vz += e._kz ?? 0;
    e._kx = (e._kx ?? 0) * Math.pow(0.002, dt);
    e._kz = (e._kz ?? 0) * Math.pow(0.002, dt);

    if (vx || vz) {
      const pos = moveCircle(this.layout, e.x, e.z, vx * dt, vz * dt, e.r, solids);
      e.x = pos.x; e.z = pos.z;
      if (Math.abs(vx) + Math.abs(vz) > 0.1) e.rot = Math.atan2(vx, vz);
    }

    if (target && e._atkCd <= 0 && e._stun <= 0 && !def.harmless) {
      const reach = e.r + (target.type === 'pet' ? target.r : PLAYER_RADIUS) + 0.25;
      if (dist2(e, target) < reach * reach) {
        e._atkCd = 1.0;
        if (target.type === 'pet') this.server.damagePet(target, e.damage);
        else this.server.damagePlayer(target, e.damage, e);
      }
    }
  }

  /** Pets trot after their owner and pounce on enemies near them. */
  tickPet(e, dt) {
    const owner = this.server.players.get(e.owner);
    if (!owner || owner.loc !== this.key) { this.remove(e.id); return; }
    e._atkCd = Math.max(0, (e._atkCd ?? 0) - dt);
    // safe at home or in town: slowly get better
    if (this.layout.kind !== 'dungeon' && e.hp < e.maxHp) {
      e._regen = (e._regen ?? 0) + dt;
      if (e._regen >= 1) {
        e._regen = 0;
        e._pet.hp = e.hp = Math.min(e.maxHp, e.hp + Math.max(1, Math.round(e.maxHp * 0.05)));
        e._dirty = true;
      }
    }
    // the closest enemy that's near both the pet and its owner
    let target = null, best = 7 * 7;
    if (owner.hp > 0) {
      for (const s of this.entities.values()) {
        if (s.type !== 'slime' || dist2(owner, s) > 12 * 12) continue;
        const d = dist2(e, s);
        if (d < best) { best = d; target = s; }
      }
    }
    let tx, tz, speed = 7.5;
    if (target) {
      const reach = target.r + e.r + 0.5;
      if (best <= reach * reach) {
        tx = e.x; tz = e.z;
        e.rot = Math.atan2(target.x - e.x, target.z - e.z);
        if (e._atkCd <= 0) {
          e._atkCd = 1.1;
          e.act++;
          e._dirty = true;
          const killed = target.hp <= petDamage(e.species, e.level);
          this.server.hitSlime(owner, this, target, petDamage(e.species, e.level), e);
          this.server.petXp(owner, e, killed ? XP.slime(target.maxHp) : 1);
        }
      } else { tx = target.x; tz = target.z; speed = 9; }
    } else {
      // a spot just behind the owner
      tx = owner.x - Math.sin(owner.rot) * 1.6 + Math.cos(owner.rot) * 0.8;
      tz = owner.z - Math.cos(owner.rot) * 1.6 - Math.sin(owner.rot) * 0.8;
    }
    const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
    if (d > 18) { e.x = owner.x; e.z = owner.z; return; } // lost: hop back to the owner
    if (d > 0.4) {
      const step = Math.min(d, speed * (d > 5 ? 1.6 : 1) * dt);
      Object.assign(e, moveCircle(this.layout, e.x, e.z, (dx / d) * step, (dz / d) * step, e.r, this.solids())); // round stalls, benches, chests
      if (!target) e.rot = Math.atan2(dx, dz);
    }
  }

  fireball(from, rot) {
    const speed = 9;
    this.spawn({
      type: 'shot', kind: 'fire', hostile: true, rot,
      x: from.x + Math.sin(rot) * (from.r + 0.4), z: from.z + Math.cos(rot) * (from.r + 0.4),
      vx: Math.sin(rot) * speed, vz: Math.cos(rot) * speed,
      _dmg: Math.max(1, Math.round(from.damage * 0.8)), _life: 2.2,
    });
  }

  tickDrop(e, dt, players) {
    // drops drift towards nearby players, then get picked up
    const mine = e.owner && this.server.time - (e._born ?? 0) < LOOT_PRIVATE; // someone's own share of a kill
    for (const p of players) {
      if (mine && p.id !== e.owner) continue;
      const d2 = dist2(e, p);
      if (d2 < PICKUP_RANGE * PICKUP_RANGE) {
        this.server.pickup(p, e);
        this.remove(e.id);
        return;
      }
      if (d2 < 4 * 4) {
        const d = Math.sqrt(d2);
        Object.assign(e, moveCircle(this.layout, e.x, e.z, ((p.x - e.x) / d) * 9 * dt, ((p.z - e.z) / d) * 9 * dt, e.r));
        e._dirty = true;
        return;
      }
    }
  }

  /** Full public state for the `enter` message. */
  allPublic() {
    return [...this.entities.values()].map(publicEnt);
  }

  /** Changes since last snapshot. Slimes always move, so always send them. */
  /**
   * What changed since the last tick: `ents` = new or changed things in full (reliable), `gone` =
   * removed ids, `moving` = compact positions of enemies and pets, [id, x, z, rot, hp, anim].
   */
  takeDelta() {
    const ents = [], moving = [];
    for (const e of this.entities.values()) {
      if (e._dirty) { ents.push(publicEnt(e)); e._dirty = false; }
      if (e.type === 'slime' || e.type === 'pet') moving.push([e.id, round(e.x), round(e.z), round(e.rot), e.hp, e.anim ?? null]);
    }
    const gone = this.gone;
    this.gone = [];
    return { ents, gone, moving };
  }

  /** Has this player's look changed since we last told everyone here? (New arrivals count as changed.) */
  lookChanged(p, key) {
    this.looks ??= new Map();
    if (this.looks.get(p.id) === key) return false;
    this.looks.set(p.id, key);
    return true;
  }
}

function round(v) {
  return Math.round(v * 100) / 100;
}

/** Strip server-only fields (anything starting with "_"). */
export function publicEnt(e) {
  const out = {};
  for (const k in e) if (k[0] !== '_') out[k] = typeof e[k] === 'number' ? round(e[k]) : e[k];
  return out;
}
