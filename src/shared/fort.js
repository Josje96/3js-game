// The Family Fort, drawn for however many family members there are. You come in through the door
// in the south wall into the hall (wardrobe and mirror side by side against its back wall, the
// family chest and a table), and the private rooms are in a row along the top, one doorway each
// into the hall. A small family gets a narrower fort; a big one a wider fort, never a deeper one.
// Same map letters as shared/maps.js. Rooms are numbered by bed slot, left to right, so a room
// keeps its place when someone new moves in.

export const MAX_ROOMS = 10;       // more family members than this share
const ROOM_DEPTH = 3;
const HALL_DEPTH = 4;
const ROOM_WALL = 1 + ROOM_DEPTH;  // the wall row between the rooms and the hall (4)
export const FORT_DEPTH = ROOM_WALL + HALL_DEPTH + 2; // rows, outer walls included (10)
export const HALL = { x: 1, z: ROOM_WALL + 1 }; // the hall's top-left cell (furniture there is saved relative to it)

/** Column spans for `k` rooms side by side across `inner` cells, 1-cell walls between. */
function spans(k, inner) {
  const free = inner - (k - 1), base = Math.floor(free / k), extra = free - base * k;
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
  // cells between the outer walls, east to west: room for the hall's furniture, rooms 2+ cells wide
  const inner = Math.max(7, Math.min(5 * n - 1, 11), 3 * n - 1);
  const W = inner + 2;
  const grid = Array.from({ length: FORT_DEPTH }, () => Array(W).fill('#'));
  const set = (x, z, ch) => { grid[z][x] = ch; };
  const fill = (x0, z0, w, h, ch = '.') => { for (let z = z0; z < z0 + h; z++) for (let x = x0; x < x0 + w; x++) set(x, z, ch); };

  fill(HALL.x, HALL.z, inner, HALL_DEPTH);

  const rooms = spans(n, inner).map(({ x, w }) => {
    fill(x, 1, w, ROOM_DEPTH);
    // a doorway into the hall, in the middle of the room's wall; the bed against the back wall
    const dw = w >= 4 ? 2 : 1, dx = x + Math.floor((w - dw) / 2);
    for (let i = 0; i < dw; i++) set(dx + i, ROOM_WALL, '.');
    set(x, 1, 'B');
    return { x, z: 1, w, h: ROOM_DEPTH };
  });

  // wardrobe and mirror side by side against the hall's back wall (they face south, towards
  // whoever walks in): the first two cells from the left with solid wall above both
  const top = HALL.z, wallAbove = (x) => grid[ROOM_WALL][x] === '#';
  let wx = 1;
  while (wx < inner && !(wallAbove(wx) && wallAbove(wx + 1))) wx++;
  set(wx, top, 'W');
  set(wx + 1, top, 'M');
  // the family chest in the hall's top-right corner, a table in the middle, the door south
  set(inner, top, 'C');
  const door = Math.floor(W / 2);
  set(door - 3, top + 2, 'T');
  set(door, FORT_DEPTH - 2, 'p');
  set(door, FORT_DEPTH - 1, 'D');

  return {
    title: 'Family Fort',
    theme: 'wood',
    rows: grid.map((r) => r.join('')),
    rooms,
    portals: { D: { to: 'town', portal: 'd' } },
  };
}
