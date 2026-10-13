// The Family Fort, drawn for however many family members there are: a bedroom in each corner
// (two along the top, two along the bottom; more pairs side by side for bigger families), the
// common room across the middle (wardrobe, mirror, family chest, table), and the front door in the
// middle of the bottom wall, down a little passage between the bottom bedrooms.
//
//   ###########
//   #B..#####B.#     Bed slots: 0 top-left, 1 bottom-left, 2 top-right, 3 bottom-right, then
//   #...#####..#     another column for slots 4/5..., so a room keeps its place when someone
//   #...#####..#     new moves in.
//   ##.#######.#
//   #W.......M.#   <- the common room
//   #....p.....#
//   #...........
//   #C.......T.#
//   ##.##.##.###   <- bottom-row doorways
//   #B..#.#B..#
//   #...#.#...#
//   #...#.#...#
//   #####D#####
//
// Nothing solid stands in front of a bedroom doorway (tested). Same map letters as shared/maps.js.
// Rooms are numbered by bed slot.

export const MAX_ROOMS = 10;       // more family members than this share
const ROOM_W = 3;                  // cells across each bedroom
const ROOM_DEPTH = 3;
const COMMON_DEPTH = 4;            // rows of common room
const TOP_DOORS = 1 + ROOM_DEPTH;  // the wall row with the top bedrooms' doorways (4)
export const HALL = { x: 1, z: TOP_DOORS + 1 }; // the common room's top-left cell (5); furniture there is saved relative to it
const BOTTOM_DOORS = HALL.z + COMMON_DEPTH; // the wall row with the bottom bedrooms' doorways (9)
const BOTTOM_ROOMS = BOTTOM_DOORS + 1;      // (10-12)

/** Bedroom columns (a top and a bottom room each) for `n` family members: an even number (so the
 * front passage and door stay in the middle), at least two. */
export const fortColumns = (n) => Math.max(2, 2 * Math.ceil(n / 4));
/** Cells across, outer walls included: the bedroom columns plus the front passage in the middle. */
export const fortWidth = (c) => c * (ROOM_W + 1) + 3;
/** Cells from top to bottom, outer walls included. */
export const fortDepth = () => BOTTOM_ROOMS + ROOM_DEPTH + 1;

/** The fort map (rows + rooms + portals) for `n` family members. */
export function fortMap(n) {
  n = Math.max(1, Math.min(MAX_ROOMS, Math.floor(n) || 1));
  const c = fortColumns(n), W = fortWidth(c), H = fortDepth(c);
  const half = Math.floor(c / 2), passage = 1 + half * (ROOM_W + 1); // the front passage's column
  const colX = (j) => (j < half ? 1 + j * (ROOM_W + 1) : passage + 2 + (j - half) * (ROOM_W + 1));
  const grid = Array.from({ length: H }, () => Array(W).fill('#'));
  const set = (x, z, ch) => { grid[z][x] = ch; };
  const fill = (x0, z0, w, h, ch = '.') => { for (let z = z0; z < z0 + h; z++) for (let x = x0; x < x0 + w; x++) set(x, z, ch); };

  fill(1, HALL.z, W - 2, COMMON_DEPTH);                       // the common room
  fill(passage, BOTTOM_DOORS, 1, H - 1 - BOTTOM_DOORS);       // the passage down to the front door
  const rooms = [];
  for (let slot = 0; slot < c * 2; slot++) {
    const top = slot % 2 === 0, x = colX(Math.floor(slot / 2)), z = top ? 1 : BOTTOM_ROOMS;
    const doorZ = top ? TOP_DOORS : BOTTOM_DOORS, out = top ? 1 : -1; // which way the door opens
    fill(x, z, ROOM_W, ROOM_DEPTH);
    if (slot >= n) { fill(x, doorZ, ROOM_W, 1); continue; } // nobody lives here yet: an open nook
    set(x + 1, doorZ, '.');                                   // a doorway in the middle of the room's wall
    set(x, top ? z : z + ROOM_DEPTH - 1, 'B');                // the bed, in the far corner from the door
    rooms[slot] = { x, z, w: ROOM_W, h: ROOM_DEPTH, door: { x: x + 1, z: doorZ, out } };
  }

  // the common room: a dressing corner (wardrobe, mirror, family chest side by side against the top
  // wall, between the top bedrooms' doorways) and the long feast table across the middle
  const last = BOTTOM_DOORS - 1;
  set(passage - 2, HALL.z, 'W');
  set(passage - 1, HALL.z, 'M');
  set(passage, HALL.z, 'C');
  set(passage, HALL.z + 1, 'L'); // the feast table (it's long: see props.js), between rows 6 and 7
  set(passage + 1, last, 'p');
  set(passage, H - 1, 'D');

  return {
    title: 'Family Fort',
    theme: 'wood',
    rows: grid.map((r) => r.join('')),
    rooms,
    portals: { D: { to: 'town', portal: 'd' } },
  };
}
