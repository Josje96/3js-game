// The Family Fort, drawn for however many family members there are. The bedrooms fill the top half
// in two rows: the top row opens onto a hallway that runs down the right-hand side into the common
// room; the second row opens straight into the common room (wardrobe, mirror, family chest, table).
// The front door is in the middle of the bottom wall, and the fort stays about square.
// Nothing solid stands in front of a bedroom doorway (tested).
//
//   #############      Bed slots alternate rows: slot 0 top-left, 1 under it, 2 top, 3 under it...
//   #B...#B...###      so a room keeps its place when someone new moves in (the fort just grows a
//   #....#....###      column to the right).
//   #....#....###
//   ##..###..##.#  <- top-row doorways, onto the hallway
//   #...........#  <- hallway
//   ###########.#
//   #B...#B...#.#
//   #....#....#.#
//   #....#....#.#
//   ##..###..##.#  <- second-row doorways, into the common room
//   #W..M....p..#
//   #........TC.#
//   ######D######
//
// Same map letters as shared/maps.js. Rooms are numbered by bed slot.

export const MAX_ROOMS = 10;       // more family members than this share
const ROOM_W = 4;                  // cells across each room
const ROOM_DEPTH = 3;
const ROW_A = 1;                   // the top row of bedrooms (rows 1-3), doorways in row 4
const HALLWAY = ROW_A + ROOM_DEPTH + 1; // the hallway in front of them (row 5)
const ROW_B = HALLWAY + 2;         // the second row (rows 7-9), behind a wall, doorways in row 10
export const HALL = { x: 1, z: ROW_B + ROOM_DEPTH + 1 }; // the common room's top-left cell (11); furniture there is saved relative to it

/** Room columns for `n` family members: two rooms each, at least two (so it's never a corridor). */
const columns = (n) => Math.max(2, Math.ceil(n / 2));
/** Cells across the fort, outer walls included: the room columns plus the hallway down the side. */
export const fortWidth = (c) => c * (ROOM_W + 1) + 3;
/** Common-room rows: at least two, more as the fort gets wider so it stays square. */
const hallDepth = (c) => Math.max(2, fortWidth(c) - HALL.z - 1);
/** Cells from top to bottom, outer walls included. */
export const fortDepth = (c) => HALL.z + hallDepth(c) + 1;
export const fortColumns = columns;

/** The fort map (rows + rooms + portals) for `n` family members. */
export function fortMap(n) {
  n = Math.max(1, Math.min(MAX_ROOMS, Math.floor(n) || 1));
  const c = columns(n), W = fortWidth(c), H = fortDepth(c);
  const side = W - 2; // the hallway's column down the right-hand side
  const grid = Array.from({ length: H }, () => Array(W).fill('#'));
  const set = (x, z, ch) => { grid[z][x] = ch; };
  const fill = (x0, z0, w, h, ch = '.') => { for (let z = z0; z < z0 + h; z++) for (let x = x0; x < x0 + w; x++) set(x, z, ch); };

  fill(1, HALLWAY, W - 2, 1);                 // the hallway...
  fill(side, HALLWAY, 1, HALL.z - HALLWAY);   // ...down the side...
  fill(1, HALL.z, W - 2, hallDepth(c));       // ...into the common room

  const rooms = [];
  for (let slot = 0; slot < c * 2; slot++) {
    const top = slot % 2 === 0, x = 1 + Math.floor(slot / 2) * (ROOM_W + 1), z = top ? ROW_A : ROW_B;
    const doorRow = z + ROOM_DEPTH; // both rows' doorways are on their south side
    fill(x, z, ROOM_W, ROOM_DEPTH);
    if (slot >= n) { fill(x, doorRow, ROOM_W, 1); continue; } // nobody lives here yet: an open nook
    fill(x + 1, doorRow, 2, 1);                // a two-cell doorway in the middle
    set(x, z, 'B');                            // the bed, in the back corner
    rooms[slot] = { x, z, w: ROOM_W, h: ROOM_DEPTH };
  }

  // the common room. Second-row doorways are columns x+1, x+2 of each room: the wardrobe, mirror,
  // table and chest stand only in the columns between them, never in front of a door, and leave
  // the hallway's mouth (the side column) clear
  const mid = Math.floor(W / 2), last = HALL.z + hallDepth(c) - 1;
  set(1, HALL.z, 'W');
  set(4, HALL.z, 'M');
  set(mid, HALL.z, 'p');
  set(side - 2, last, 'T');
  set(side - 1, last, 'C');
  set(mid, H - 1, 'D');

  return {
    title: 'Family Fort',
    theme: 'wood',
    rows: grid.map((r) => r.join('')),
    rooms,
    portals: { D: { to: 'town', portal: 'd' } },
  };
}
