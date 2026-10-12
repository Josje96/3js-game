// The Family Fort, drawn for however many family members there are: always a square, a common
// hall across the middle (wardrobe, mirror, family chest, table), and one private room each,
// along the top and bottom walls. Fewer rooms = wider rooms; space nobody lives in is part of the hall.
// Same map letters as shared/maps.js. Rooms are numbered by bed slot: even slots along the top,
// odd ones along the bottom, left to right, so a room keeps its side when someone new moves in.

export const FORT_SIZE = 17;       // cells along each side, outer walls included
export const MAX_ROOMS = 10;       // five a side; more family members than this share
const INNER = FORT_SIZE - 2;       // 15 cells between the outer walls
const ROOM_DEPTH = 4;
const TOP_WALL = 1 + ROOM_DEPTH;   // the wall row between the top rooms and the hall (5)
const BOTTOM_WALL = FORT_SIZE - 2 - ROOM_DEPTH; // ...and between the hall and the bottom rooms (11)
export const HALL = { x: 1, z: TOP_WALL + 1 }; // the hall's top-left cell (furniture there is saved relative to it)

/** Column spans for `k` rooms side by side between the outer walls, 1-cell walls between. */
function spans(k) {
  if (!k) return [];
  const free = INNER - (k - 1), base = Math.floor(free / k), extra = free - base * k;
  const out = [];
  let x = 1;
  for (let i = 0; i < k; i++) {
    const w = base + (i >= k - extra ? 1 : 0); // the leftovers go to the rooms on the right
    out.push({ x, w });
    x += w + 1;
  }
  return out;
}

/** The fort map (rows + rooms + portals) for `n` family members. */
export function fortMap(n) {
  n = Math.max(1, Math.min(MAX_ROOMS, Math.floor(n) || 1));
  const top = Math.ceil(n / 2), bottom = Math.floor(n / 2);
  const grid = Array.from({ length: FORT_SIZE }, () => Array(FORT_SIZE).fill('#'));
  const set = (x, z, ch) => { grid[z][x] = ch; };
  const fill = (x0, z0, w, h, ch = '.') => { for (let z = z0; z < z0 + h; z++) for (let x = x0; x < x0 + w; x++) set(x, z, ch); };

  // the hall: everything between the room rows (down to the outer wall if nobody lives at the bottom)
  const hallBottom = bottom ? BOTTOM_WALL - 1 : FORT_SIZE - 2;
  fill(1, TOP_WALL + 1, INNER, hallBottom - TOP_WALL);

  const rooms = [];
  // at least two spaces a row, so one person doesn't get a room the width of the fort:
  // a space nobody lives in yet is left open, part of the common area
  const addRow = (count, side) => spans(Math.max(2, count)).forEach(({ x, w }, j) => {
    const z = side === 'top' ? 1 : BOTTOM_WALL + 1;
    fill(x, z, w, ROOM_DEPTH);
    if (j >= count) { fill(x, side === 'top' ? TOP_WALL : BOTTOM_WALL, w, 1); return; }
    // a doorway into the hall, in the middle of the room's wall
    const dw = w >= 4 ? 2 : 1, dx = x + Math.floor((w - dw) / 2);
    for (let i = 0; i < dw; i++) set(dx + i, side === 'top' ? TOP_WALL : BOTTOM_WALL, '.');
    // the bed: against the back wall for top rooms; beside the doorway for bottom ones
    if (side === 'top') set(x, 1, 'B');
    else set(dx > x ? x : x + w - 1, BOTTOM_WALL + 1, 'B');
    rooms[side === 'top' ? j * 2 : j * 2 + 1] = { x, z, w, h: ROOM_DEPTH };
  });
  addRow(top, 'top');
  if (bottom) addRow(bottom, 'bottom');

  // the common area: dressing corner on the left, chest and table on the right, door on the east wall
  const mid = TOP_WALL + 3; // the hall's middle row (8)
  set(3, mid - 1, 'W');
  set(5, mid - 1, 'M');
  set(8, mid, 'p');
  set(11, mid - 1, 'T');
  set(13, mid + 1, 'C');
  set(FORT_SIZE - 1, mid, 'D');

  return {
    title: 'Family Fort',
    theme: 'wood',
    rows: grid.map((r) => r.join('')),
    rooms,
    portals: { D: { to: 'town', portal: 'd' } },
  };
}
