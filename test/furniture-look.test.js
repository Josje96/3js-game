// Every piece of furniture can be built (a crash here would blank the fort), every use is known,
// and every wallpaper pattern and floor model is one the game knows how to draw.
import { describe, expect, test } from 'bun:test';
import { FURNITURE, USES, WALL_STYLES, FLOOR_STYLES } from '../src/shared/furniture.js';
import { FURNITURE_BUILDERS } from '../src/client/furniture.js';

describe('furniture', () => {
  test('every built piece builds, and animates without crashing', () => {
    for (const [id, def] of Object.entries(FURNITURE)) {
      if (!def.build) continue;
      expect(FURNITURE_BUILDERS[def.build], id).toBeFunction();
      let g;
      try { g = FURNITURE_BUILDERS[def.build](def); } catch (err) { if (/document/.test(err.message)) continue; throw err; } // (a few paint a canvas: browser only)
      expect(g.children.length, id).toBeGreaterThan(0);
      for (const t of [0, 1.3, 7.7]) g.userData.update?.(t, { on: true });
    }
  });
  test('every use is defined', () => {
    for (const [id, def] of Object.entries(FURNITURE)) if (def.use) expect(USES[def.use], `${id} uses ${def.use}`).toBeDefined();
  });
  test('walls and floors', () => {
    const KINDS = ['stripes', 'damask', 'floral', 'polka', 'stars', 'hearts', 'harlequin', 'royal', 'gingham', 'scales'];
    for (const [id, w] of Object.entries(WALL_STYLES)) if (w.pattern) expect(KINDS, id).toContain(w.pattern.kind);
    for (const [id, f] of Object.entries(FLOOR_STYLES)) expect(f.model, id).toMatch(/^dungeon\/floor_(wood|tile)_large/);
    expect(Object.keys(WALL_STYLES).length).toBeGreaterThanOrEqual(39);
    expect(Object.keys(FLOOR_STYLES).length).toBeGreaterThanOrEqual(29);
  });
});
