// Turns a location key ("house", "town", "mine/4") + seed into a layout:
// collision grid, portals, static props and (for dungeons) initial entities.
// Runs identically on the host and every client.

import { CELL } from './config.js';
import { MAPS, LEGEND } from './maps.js';
import { biomeFor, parseKey, depthOf } from './dungeons.js';
import { generateFloor } from './mapgen.js';
import { PROPS } from './props.js';

const WALKABLE = new Set(['.', '=', '~']); // '~': you can wade into the pond
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export function isWalkableChar(ch) {
  return WALKABLE.has(ch);
}

export function buildLayout(key, seed) {
  const info = parseKey(key);
  let base;
  if (info.kind === 'dungeon') {
    const biome = biomeFor(info.dungeonId, info.floor);
    const gen = generateFloor(info.dungeonId, info.floor, seed);
    base = {
      ...gen,
      title: `${biome.name} — Floor ${info.floor}`,
      theme: biome.theme,
      biome: biome.name,
      dark: true,
      dungeonId: info.dungeonId,
      floor: info.floor,
      depth: depthOf(info.dungeonId, info.floor),
    };
  } else {
    base = parseAsciiMap(MAPS[info.kind]);
  }

  const layout = { key, seed, ...info, ...base };
  layout.cell = (cx, cz) => (cz < 0 || cz >= layout.h || cx < 0 || cx >= layout.w ? '#' : layout.rows[cz][cx]);
  layout.isSolidCell = (cx, cz) => !WALKABLE.has(layout.cell(cx, cz));

  // portal trigger + arrival points
  for (const [id, portal] of Object.entries(layout.portals)) {
    const cellPos = findChar(layout, id);
    if (!cellPos) throw new Error(`portal ${id} missing from ${key}`);
    const [cx, cz] = cellPos;
    const dir = DIRS.find(([dx, dz]) => !layout.isSolidCell(cx + dx, cz + dz));
    if (!dir) throw new Error(`portal ${id} in ${key} has no walkable neighbour`);
    Object.assign(portal, {
      id, cx, cz, dir,
      // trigger sits on the shared edge; arrival is one cell out into the room
      x: cx * CELL + CELL / 2 + dir[0] * CELL / 2,
      z: cz * CELL + CELL / 2 + dir[1] * CELL / 2,
      arrive: { x: (cx + dir[0]) * CELL + CELL / 2, z: (cz + dir[1]) * CELL + CELL / 2 },
    });
  }

  layout.props = layout.props.map((p, i) => {
    const def = PROPS[p.type];
    return { id: `prop${i}`, ...def, ...p, z: p.z + (def.offsetZ ?? 0) };
  });
  layout.solids = layout.props.filter((p) => p.radius > 0).map((p) => ({ x: p.x, z: p.z, r: p.radius }));
  return layout;
}

function parseAsciiMap(map) {
  const h = map.rows.length, w = map.rows[0].length;
  const props = [];
  const bedSlots = [];
  const decor = [];          // flower beds etc: looks only
  const spots = {};          // named points (training dummy, practice slime...)
  let spawn = null, folk = 0;
  const rooms = map.rooms ?? []; // the fort's private rooms: [{ x, z, w, h }] in cell coords
  const roomAt = (cx, cz) => rooms.findIndex((r) => cx >= r.x && cx < r.x + r.w && cz >= r.z && cz < r.z + r.h);
  const rows = map.rows.map((row, cz) =>
    [...row].map((ch, cx) => {
      const leg = LEGEND[ch];
      if (!leg) throw new Error(`unknown map char '${ch}'`);
      const pos = { x: cx * CELL + CELL / 2, z: cz * CELL + CELL / 2 };
      if (leg.prop) props.push({ type: leg.prop, ...pos, rot: 0, ...(leg.prop === 'townsfolk' ? { folk: folk++ } : {}) });
      if (leg.decor) decor.push({ kind: leg.decor, ...pos });
      if (leg.spot) spots[leg.spot] = pos;
      if (leg.spawn) spawn = pos;
      if (leg.bedSlot) {
        const room = roomAt(cx, cz);
        if (room < 0 && rooms.length) throw new Error(`a bed slot at ${cx},${cz} is outside every room`);
        bedSlots.push({ x: pos.x, z: pos.z - 0.6, room });
      }
      return leg.portal ? ch : leg.base;
    }).join(''));
  return {
    title: map.title,
    theme: map.theme,
    dark: false,
    w, h, rows,
    portals: structuredClone(map.portals),
    props,
    bedSlots,
    decor,
    spots,
    rooms,
    initial: [],
    spawn: spawn ?? { x: w * CELL / 2, z: h * CELL / 2 },
  };
}

/** Which of a layout's rooms (if any) contains this cell? -1 for none (the hall, outside...). */
export function roomIndexAt(layout, cx, cz) {
  return (layout.rooms ?? []).findIndex((r) => cx >= r.x && cx < r.x + r.w && cz >= r.z && cz < r.z + r.h);
}

function findChar(layout, ch) {
  for (let z = 0; z < layout.h; z++) {
    const x = layout.rows[z].indexOf(ch);
    if (x >= 0) return [x, z];
  }
  return null;
}
