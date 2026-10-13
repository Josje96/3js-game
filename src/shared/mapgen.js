// Seeded dungeon floor generator. Same (dungeonId, floor, seed) => same floor
// on every machine, so clients rebuild the level locally and only moving
// things travel over the network.

import { CELL } from './config.js';
import { DUNGEONS, ROCK_HP, BARREL_STYLES, biomeFor, isBossFloor, makeEnemy, depthOf, oresFor } from './dungeons.js';
import { PROPS } from './props.js';
import { makeRng } from './rng.js';

/** Flavour props per biome theme (see client/themes.js THEMES): keys without an entry get none. */
const THEME_PROPS = {
  dungeon: ['rails', 'minecart', 'support', 'stalagmite'],
  frost: ['stalagmite', 'crystalcluster'],
  grotto: ['stalagmite', 'rails'],
  lava: ['stalagmite', 'crystalcluster'],
  crystal: ['crystalcluster', 'stalagmite'],
  bone: ['bonepile', 'stalagmite'],
  nest: ['bonepile', 'support'],
  gold: ['minecart', 'crate', 'rails'],
  shadow: ['bonepile', 'stalagmite'],
  magma: ['stalagmite', 'crystalcluster', 'rails'],
  ruins: ['crate', 'bonepile', 'signpost'],
  coral: ['bonepile', 'stalagmite'],
  library: ['crate', 'support'],
  kelp: ['crate', 'bonepile'],
  pearl: ['crystalcluster', 'bonepile'],
  abyss: ['bonepile', 'crystalcluster'],
  keep: ['crate', 'signpost', 'support'],
  throne: ['bonepile', 'crystalcluster', 'signpost'],
};

export function generateFloor(dungeonId, floor, seed) {
  const biome = biomeFor(dungeonId, floor);
  const depth = depthOf(dungeonId, floor); // how tough things are (later dungeons start deeper)
  const rng = makeRng(seed);
  const isBoss = isBossFloor(floor);
  const size = Math.min(14 + floor, 26);
  const w = size, h = size;
  const grid = Array.from({ length: h }, () => Array(w).fill('#'));

  const carve = (x, z) => { if (x > 0 && z > 0 && x < w - 1 && z < h - 1) grid[z][x] = '.'; };
  const carveRoom = (r) => { for (let z = r.z; z < r.z + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) carve(x, z); };
  const centre = (r) => [r.x + Math.floor(r.w / 2), r.z + Math.floor(r.h / 2)];
  const carveCorridor = (a, b) => {
    let [x, z] = centre(a);
    const [tx, tz] = centre(b);
    const wide = rng.chance(0.3);            // some corridors are halls: two cells wide
    const horizFirst = rng.chance(0.5);
    const stepX = () => { while (x !== tx) { carve(x, z); if (wide) carve(x, z + 1); x += Math.sign(tx - x); } };
    const stepZ = () => { while (z !== tz) { carve(x, z); if (wide) carve(x + 1, z); z += Math.sign(tz - z); } };
    if (horizFirst) { stepX(); stepZ(); } else { stepZ(); stepX(); }
    carve(x, z);
  };
  /** Is every walkable cell of the grid reachable from the start room? (Cheap: the grids are small.) */
  const gridConnected = () => {
    let total = 0;
    for (const row of grid) for (const c of row) if (c !== '#') total++;
    const seen = new Set();
    const stack = [[start.x + (start.w >> 1), start.z + (start.h >> 1)]];
    while (stack.length) {
      const [x, z] = stack.pop();
      if (x < 0 || z < 0 || x >= w || z >= h || grid[z][x] === '#' || seen.has(`${x},${z}`)) continue;
      seen.add(`${x},${z}`);
      stack.push([x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]);
    }
    return seen.size === total;
  };

  // --- rooms ---
  const rooms = [];
  if (isBoss) {
    const start = { x: Math.floor(w / 2) - 2, z: h - 5, w: 4, h: 3 };
    const arena = { x: 3, z: 2, w: w - 6, h: h - 10 };
    rooms.push(start, arena);
  } else {
    // start room near the bottom so the camera (looking north) sees the level ahead
    const sw = rng.int(3, 4), sh = 3;
    rooms.push({ x: rng.int(2, w - sw - 2), z: h - sh - 2, w: sw, h: sh });
    const maxRooms = Math.min(4 + Math.floor(floor / 2), 9);
    for (let tries = 0; tries < 200 && rooms.length < maxRooms; tries++) {
      const r = { w: rng.int(3, 6), h: rng.int(3, 5) };
      r.x = rng.int(1, w - r.w - 1);
      r.z = rng.int(2, h - r.h - 2);
      const overlaps = rooms.some((o) =>
        r.x - 1 < o.x + o.w && r.x + r.w + 1 > o.x && r.z - 1 < o.z + o.h && r.z + r.h + 1 > o.z);
      if (!overlaps) rooms.push(r);
    }
  }
  rooms.forEach(carveRoom);
  // chain rooms in order of distance from the start so the level flows outward
  const [start, ...rest] = rooms;
  const [sx, sz] = centre(start);
  rest.sort((a, b) => {
    const [ax, az] = centre(a), [bx, bz] = centre(b);
    return (ax - sx) ** 2 + (az - sz) ** 2 - ((bx - sx) ** 2 + (bz - sz) ** 2);
  });
  const ordered = [start, ...rest];
  for (let i = 1; i < ordered.length; i++) {
    // connect to the nearest already-connected room
    let best = ordered[0], bestD = Infinity;
    const [cx, cz] = centre(ordered[i]);
    for (let j = 0; j < i; j++) {
      const [ox, oz] = centre(ordered[j]);
      const d = (ox - cx) ** 2 + (oz - cz) ** 2;
      if (d < bestD) { bestD = d; best = ordered[j]; }
    }
    carveCorridor(best, ordered[i]);
  }
  if (ordered.length > 3 && rng.chance(0.6)) carveCorridor(rng.pick(rest), rng.pick(rest)); // a loop

  // --- room personalities: all-box rooms look samey, so some rooms get pillars, rock
  // outcrops (caves), alcoves, or grow a great hall. Rooms stay rectangles for placement;
  // cells turned back into rock are kept out of spawning. The start room is left alone:
  // its walls must stay intact for the stairs. Each outcrop that would cut a path off is
  // undone, so every personality change keeps the floor fully connected.
  const outcrops = []; // cells re-rocked: [x, z]
  const reRock = (x, z) => {
    if (x <= 0 || z <= 0 || x >= w - 1 || z >= h - 1 || grid[z][x] !== '.') return;
    grid[z][x] = '#';
    if (!gridConnected()) { grid[z][x] = '.'; return; } // would seal a passage: put it back
    outcrops.push([x, z]);
  };
  for (const room of isBoss ? [] : rest) { // boss arenas keep their own clean shape + cover pillars
    const kind = rng.pick(['plain', 'plain', 'pillars', 'cave', 'alcoves', room.w >= 4 ? 'hall' : 'cave']);
    if (kind === 'pillars') {
      for (let n = rng.int(1, 3); n > 0; n--) reRock(room.x + rng.int(1, room.w - 2), room.z + rng.int(1, room.h - 2));
    } else if (kind === 'cave') {
      let x = room.x + rng.int(1, room.w - 2), z = room.z + rng.int(1, room.h - 2);
      for (let n = rng.int(2, 5); n > 0; n--) {
        reRock(x, z);
        x += rng.pick([1, -1, 0, 0]);
        z += rng.pick([0, 0, 1, -1]);
      }
    } else if (kind === 'alcoves') {
      const side = rng.int(0, 3);
      for (let n = rng.int(1, 2); n > 0; n--) {
        if (side === 0) carve(room.x + rng.int(0, room.w - 1), room.z - 1);
        else if (side === 1) carve(room.x + room.w, room.z + rng.int(0, room.h - 1));
        else if (side === 2) carve(room.x - 1, room.z + rng.int(0, room.h - 1));
        else carve(room.x + rng.int(0, room.w - 1), room.z + room.h);
      }
    } else if (kind === 'hall') { // grow north, where the camera looks
      room.z -= 1; room.h += 1;
      for (let x = room.x; x < room.x + room.w; x++) carve(x, room.z);
    }
  }

  // --- up-stairs portal in a wall of the start room (top wall preferred) ---
  // It must touch exactly one walkable cell, or the arrival point is ambiguous.
  const portals = {};
  const solidAt = (x, z) => x < 0 || z < 0 || x >= w || z >= h || grid[z][x] === '#';
  const walkableNeighbours = (x, z) => [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(([dx, dz]) => !solidAt(x + dx, z + dz)).length;
  const sides = [
    rng.shuffle([...Array(start.w).keys()].map((i) => [start.x + i, start.z - 1, start.x + i, start.z])),       // top
    rng.shuffle([...Array(start.h).keys()].map((i) => [start.x - 1, start.z + i, start.x, start.z + i])),       // left
    rng.shuffle([...Array(start.h).keys()].map((i) => [start.x + start.w, start.z + i, start.x + start.w - 1, start.z + i])), // right
    rng.shuffle([...Array(start.w).keys()].map((i) => [start.x + i, start.z + start.h, start.x + i, start.z + start.h - 1])), // bottom
  ].flat();
  const up = sides.find(([x, z]) => x > 0 && z > 0 && x < w - 1 && z < h - 1 && grid[z][x] === '#' && walkableNeighbours(x, z) === 1);
  if (!up) throw new Error(`no room for stairs on ${dungeonId}/${floor} (seed ${seed})`);
  grid[up[1]][up[0]] = 'U';
  const spawn = cellCentre(up[2], up[3]);

  // --- dynamic things the server will spawn ---
  const initial = [];
  const props = [];
  const taken = [{ x: spawn.x, z: spawn.z, r: 3.5 }];
  for (const [x, z] of outcrops) taken.push({ x: x * CELL + CELL / 2, z: z * CELL + CELL / 2, r: 1.3 }); // keep things off the outcrops
  const free = (x, z, r) => taken.every((t) => (t.x - x) ** 2 + (t.z - z) ** 2 > (t.r + r) ** 2);
  const randomPointIn = (room, margin = 1.2) => ({
    x: room.x * CELL + margin + rng.next() * (room.w * CELL - margin * 2),
    z: room.z * CELL + margin + rng.next() * (room.h * CELL - margin * 2),
  });
  const place = (room, r, tries = 20) => {
    for (let i = 0; i < tries; i++) {
      const p = randomPointIn(room);
      if (free(p.x, p.z, r)) { taken.push({ ...p, r }); return p; }
    }
    return null;
  };

  const oreWeights = biome.ores?.(floor) ?? oresFor(depth);
  const rollOre = () => {
    const total = Object.values(oreWeights).reduce((a, b) => a + b, 0);
    let roll = rng.next() * total;
    for (const [ore, wgt] of Object.entries(oreWeights)) { if ((roll -= wgt) < 0) return ore; }
    return 'stone';
  };

  const kinds = biome.enemies(floor);
  const slime = (p) => makeEnemy(rng.pick(kinds), depth, p.x, p.z);

  if (isBoss) {
    const arena = rooms[1];
    const b = biome.boss;
    const [ax, az] = centre(arena);
    const p = cellCentre(ax, az);
    taken.push({ ...p, r: 3 });
    initial.push({ ...makeEnemy(b.variant, depth, p.x, p.z, true), boss: true, name: b.name });
    for (let i = 0; i < 4; i++) {
      const q = place(arena, 0.8);
      if (q) initial.push(slime(q));
    }
    // pillars for cover
    for (let i = 0; i < 4; i++) {
      const q = place(arena, 1.5);
      if (q) props.push({ type: 'pillar', x: q.x, z: q.z, rot: 0 });
    }
  } else {
    let enemies = Math.min(2 + floor, 12) + (DUNGEONS[dungeonId].depth ? 2 : 0);
    for (const room of rest) {
      const area = room.w * room.h;
      const rocks = Math.floor(area * rng.range(0.5, 1.1));
      for (let i = 0; i < rocks; i++) {
        const p = place(room, 1.0);
        if (!p) continue;
        const ore = rollOre();
        initial.push({ type: 'rock', ore, x: p.x, z: p.z, hp: ROCK_HP[ore] });
      }
    }
    while (enemies-- > 0 && rest.length) {
      const p = place(rng.pick(rest), 0.8);
      if (p) initial.push(slime(p));
    }
    if (rest.length && rng.chance(0.4)) {
      const p = place(rng.pick(rest), 1.0);
      if (p) initial.push({ type: 'chest', gold: 9 * depth + rng.int(0, 12), x: p.x, z: p.z });
    }
    // clutter in room corners: crates are scenery, barrels can be smashed for loot
    for (const room of rest) {
      if (!rng.chance(0.85)) continue;
      const corners = [[room.x, room.z], [room.x + room.w - 1, room.z], [room.x, room.z + room.h - 1], [room.x + room.w - 1, room.z + room.h - 1]];
      const [cx, cz] = rng.pick(corners);
      if (grid[cz]?.[cx] !== '.') continue; // an outcrop took this corner: no clutter inside rock
      const c = cellCentre(cx, cz);
      const p = { x: c.x + (cx === room.x ? -1 : 1), z: c.z + (cz === room.z ? -1 : 1) };
      if (!free(p.x, p.z, 1.1)) continue;
      taken.push({ ...p, r: 1.1 });
      if (rng.chance(0.35)) {
        props.push({ type: rng.pick(['crates', 'box']), x: p.x, z: p.z, rot: rng.int(0, 3) * Math.PI / 2 });
        continue;
      }
      // a little cluster of barrels huddled in the corner
      const n = rng.int(1, 3);
      for (let i = 0; i < n; i++) {
        const q = i === 0 ? p : { x: p.x + (cx === room.x ? 1 : -1) * rng.range(1.1, 1.8) * (i === 1 ? 1 : 0), z: p.z + (cz === room.z ? 1 : -1) * rng.range(1.1, 1.8) * (i === 2 ? 1 : 0) };
        if (i > 0 && !free(q.x, q.z, 0.7)) continue;
        if (i > 0) taken.push({ ...q, r: 0.7 });
        const style = i === 0 ? rng.pick(['barrel', 'keg']) : 'small';
        initial.push({ type: 'barrel', style, x: q.x, z: q.z, hp: BARREL_STYLES[style], rot: rng.range(0, Math.PI * 2) });
      }
    }

    // flavour props from the generated set (tools/blender/make_props.py): a mine cart on its
    // rails, broken supports, stalagmites, crystals, bones — whatever this biome's walls suggest
    const flavour = THEME_PROPS[biome.theme] ?? [];
    for (const room of rest) {
      let n = rng.int(0, 2) + (rng.chance(0.3) ? 1 : 0);
      while (n-- > 0 && flavour.length) {
        const type = rng.pick(flavour);
        const r = PROPS[type].radius;
        const p = place(room, Math.max(r, 0.4));
        if (!p) continue;
        props.push({ type, x: p.x, z: p.z, rot: rng.int(0, 3) * Math.PI / 2 });
      }
    }
  }

  // torches on north-facing walls (the ones the camera can see)
  for (let z = 1; z < h - 1; z++) {
    for (let x = 1; x < w - 1; x++) {
      if (grid[z][x] === '.' && grid[z - 1][x] === '#' && rng.chance(0.18)) {
        props.push({ type: 'torch', x: x * CELL + CELL / 2, z: z * CELL + 0.5, rot: 0, y: 2.2 });
      }
    }
  }

  portals.U = { to: 'town', portal: DUNGEONS[dungeonId].entrance };

  return {
    w, h,
    rows: grid.map((r) => r.join('')),
    portals,
    // only things you can walk over (rails, torches...): solid scenery (crates, carts, stalagmites,
    // pillars...) just got people stuck. Smashable barrels and ore rocks are entities, not props.
    props: props.filter((p) => !(PROPS[p.type]?.radius > 0)),
    initial,
    spawn,
    isBoss,
    rooms,
  };
}

function cellCentre(cx, cz) {
  return { x: cx * CELL + CELL / 2, z: cz * CELL + CELL / 2 };
}
