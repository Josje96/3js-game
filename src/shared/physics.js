// Circle-vs-grid and circle-vs-circle collision, with wall sliding.

import { CELL, WALL_PAD } from './config.js';

/** Is a circle at (x, z) overlapping a solid cell or a solid circle? */
export function blocked(layout, x, z, r, solids = []) {
  const minCx = Math.floor((x - r - WALL_PAD) / CELL), maxCx = Math.floor((x + r + WALL_PAD) / CELL);
  const minCz = Math.floor((z - r - WALL_PAD) / CELL), maxCz = Math.floor((z + r + WALL_PAD) / CELL);
  for (let cz = minCz; cz <= maxCz; cz++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      if (!layout.isSolidCell(cx, cz)) continue;
      if (layout.cell(cx, cz) === '+') { // a fence: only its post and rails block, not the whole cell
        if (hitsFence(layout, cx, cz, x, z, r)) return true;
        continue;
      }
      if (layout.thinWalls && layout.cell(cx, cz) === '#') { // a thin wall down the middle of the cell (the fort)
        if (hitsThinWall(layout, cx, cz, x, z, r)) return true;
        continue;
      }
      // solid cell rectangle grown by the wall thickness
      const x0 = cx * CELL - WALL_PAD, x1 = (cx + 1) * CELL + WALL_PAD;
      const z0 = cz * CELL - WALL_PAD, z1 = (cz + 1) * CELL + WALL_PAD;
      const nx = Math.max(x0, Math.min(x, x1)), nz = Math.max(z0, Math.min(z, z1));
      if ((nx - x) ** 2 + (nz - z) ** 2 < r * r) return true;
    }
  }
  for (const s of solids) {
    if ((s.x - x) ** 2 + (s.z - z) ** 2 < (s.r + r) ** 2) return true;
  }
  return false;
}

/**
 * A fence cell (client/town.js makeFence): a post in the middle and rails out to each neighbouring
 * fence cell. A gap in a fence is as wide as it looks, from post to post.
 */
const FENCE_HALF = 0.2;
function hitsFence(layout, cx, cz, x, z, r) {
  const mx = cx * CELL + CELL / 2, mz = cz * CELL + CELL / 2;
  const boxes = [[mx - FENCE_HALF, mx + FENCE_HALF, mz - FENCE_HALF, mz + FENCE_HALF]]; // the post
  if (layout.cell(cx + 1, cz) === '+') boxes.push([mx, mx + CELL / 2, mz - FENCE_HALF, mz + FENCE_HALF]);
  if (layout.cell(cx - 1, cz) === '+') boxes.push([mx - CELL / 2, mx, mz - FENCE_HALF, mz + FENCE_HALF]);
  if (layout.cell(cx, cz + 1) === '+') boxes.push([mx - FENCE_HALF, mx + FENCE_HALF, mz, mz + CELL / 2]);
  if (layout.cell(cx, cz - 1) === '+') boxes.push([mx - FENCE_HALF, mx + FENCE_HALF, mz - CELL / 2, mz]);
  return boxes.some(([x0, x1, z0, z1]) => {
    const nx = Math.max(x0, Math.min(x, x1)), nz = Math.max(z0, Math.min(z, z1));
    return (nx - x) ** 2 + (nz - z) ** 2 < r * r;
  });
}

/**
 * A thin wall (layouts with `thinWalls`: the fort): a pillar in the middle of the wall cell and the
 * wall out to each neighbouring solid cell, WALL_PAD either side of the middle line. The rest of the
 * cell is floor you can walk on, right up to the wall (client/LocationView.js buildThinWalls).
 */
function hitsThinWall(layout, cx, cz, x, z, r) {
  const mx = cx * CELL + CELL / 2, mz = cz * CELL + CELL / 2, t = WALL_PAD;
  const inside = (ax, az) => ax >= 0 && az >= 0 && ax < layout.w && az < layout.h;
  const wall = (ax, az) => inside(ax, az) && layout.isSolidCell(ax, az);
  const boxes = [[mx - t, mx + t, mz - t, mz + t]];
  if (wall(cx + 1, cz)) boxes.push([mx, (cx + 1) * CELL, mz - t, mz + t]);
  if (wall(cx - 1, cz)) boxes.push([cx * CELL, mx, mz - t, mz + t]);
  if (wall(cx, cz + 1)) boxes.push([mx - t, mx + t, mz, (cz + 1) * CELL]);
  if (wall(cx, cz - 1)) boxes.push([mx - t, mx + t, cz * CELL, mz]);
  return boxes.some(([x0, x1, z0, z1]) => {
    const nx = Math.max(x0, Math.min(x, x1)), nz = Math.max(z0, Math.min(z, z1));
    return (nx - x) ** 2 + (nz - z) ** 2 < r * r;
  });
}

/** Move by (dx, dz), sliding along walls. Returns the new position. */
export function moveCircle(layout, x, z, dx, dz, r, solids = []) {
  // ignore anything we're already overlapping, so you can always walk out of it
  solids = solids.filter((s) => (s.x - x) ** 2 + (s.z - z) ** 2 >= (s.r + r) ** 2);
  // sub-step so fast movers can't tunnel through thin things
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (r * 0.8)));
  const sx = dx / steps, sz = dz / steps;
  for (let i = 0; i < steps; i++) {
    if (!blocked(layout, x + sx, z, r, solids)) x += sx;
    if (!blocked(layout, x, z + sz, r, solids)) z += sz;
  }
  return { x, z };
}

export function dist2(a, b) {
  return (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
}
