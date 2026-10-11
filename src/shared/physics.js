// Circle-vs-grid and circle-vs-circle collision, with wall sliding.

import { CELL, WALL_PAD } from './config.js';

/** Is a circle at (x, z) overlapping a solid cell or a solid circle? */
export function blocked(layout, x, z, r, solids = []) {
  const minCx = Math.floor((x - r - WALL_PAD) / CELL), maxCx = Math.floor((x + r + WALL_PAD) / CELL);
  const minCz = Math.floor((z - r - WALL_PAD) / CELL), maxCz = Math.floor((z + r + WALL_PAD) / CELL);
  for (let cz = minCz; cz <= maxCz; cz++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      if (!layout.isSolidCell(cx, cz)) continue;
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
