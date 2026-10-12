// The Family Fort, drawn for however many family members there are: a row of small private rooms
// along the top (one each), one common room below them (wardrobe, mirror, family chest, table),
// and the front door in the middle of the bottom wall. The fort only grows sideways, one room at a
// time, so it stays snug. Same map letters as shared/maps.js. Rooms are numbered by bed slot,
// left to right, so a room keeps its place when someone new moves in.

export const MAX_ROOMS = 10;       // more family members than this share
const ROOM_W = 3;                  // cells across each room
const ROOM_DEPTH = 3;
const HALL_DEPTH = 4;
const TOP_WALL = 1 + ROOM_DEPTH;   // the wall row between the rooms and the common room (4)
export const FORT_DEPTH = TOP_WALL + HALL_DEPTH + 2; // rows, outer walls included (10)
export const HALL = { x: 1, z: TOP_WALL + 1 }; // the common room's top-left cell (furniture there is saved relative to it)

/** Cells across the fort (outer walls included) for `k` room spaces side by side. */
export const fortWidth = (k) => k * (ROOM_W + 1) + 1;

/** The fort map (rows + rooms + portals) for `n` family members. */
export function fortMap(n) {
  n = Math.max(1, Math.min(MAX_ROOMS, Math.floor(n) || 1));
  // at least two spaces, so one person's fort isn't a corridor: a space nobody lives in yet
  // is left open, part of the common room
  const k = Math.max(2, n), W = fortWidth(k);
  const grid = Array.from({ length: FORT_DEPTH }, () => Array(W).fill('#'));
  const set = (x, z, ch) => { grid[z][x] = ch; };
  const fill = (x0, z0, w, h, ch = '.') => { for (let z = z0; z < z0 + h; z++) for (let x = x0; x < x0 + w; x++) set(x, z, ch); };

  fill(1, HALL.z, W - 2, HALL_DEPTH);
  const rooms = [];
  for (let j = 0; j < k; j++) {
    const x = 1 + j * (ROOM_W + 1);
    fill(x, 1, ROOM_W, ROOM_DEPTH);
    if (j >= n) { fill(x, TOP_WALL, ROOM_W, 1); continue; }
    set(x + 1, TOP_WALL, '.'); // a doorway into the common room
    set(x, 1, 'B');            // the bed, against the back wall
    rooms[j] = { x, z: 1, w: ROOM_W, h: ROOM_DEPTH };
  }

  // the common room: dressing corner on the left, chest and table on the right, door bottom middle
  const mid = Math.floor(W / 2);
  set(1, HALL.z, 'W');
  set(3, HALL.z, 'M');
  set(mid, HALL.z + 1, 'p');
  set(W - 3, HALL.z + 2, 'T');
  set(W - 2, HALL.z, 'C');
  set(mid, FORT_DEPTH - 1, 'D');

  return {
    title: 'Family Fort',
    theme: 'wood',
    rows: grid.map((r) => r.join('')),
    rooms,
    portals: { D: { to: 'town', portal: 'd' } },
  };
}
