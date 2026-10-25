// Villagers strolling along Pebble Town's paths. Purely for looks and only on this screen (they
// aren't sent over the network), so each family member may see them in slightly different
// places. You bump into them (GameClient.solids) and they stop to let you by; nobody can talk to
// them: the townsfolk (shared/townsfolk.js) do the talking.
// They only use path cells clear of anything solid (stalls, the fountain, benches, townsfolk),
// so they never walk through them; and they keep out of holiday visitors' corners (Santa's tree,
// where his sleigh comes in to land...): `keepOut` re-plans their routes round those.
import { CELL } from '../shared/config.js';
import { CharacterView } from './views.js';

const PEOPLE = [
  { cls: 'Rogue', look: { hat: 'party', hair: 'bob', hairColor: 'brown', clothes: 'sunday' } },
  { cls: 'Mage', look: { hat: 'none', hair: 'long', hairColor: 'black', clothes: 'gown' } },
  { cls: 'Barbarian', look: { hat: 'none', hair: 'mohawk', hairColor: 'ginger', cape: 'none' } },
  { cls: 'Knight', look: { hat: 'none', hair: 'curly', hairColor: 'blonde', clothes: 'suit' } },
  { cls: 'Ranger', look: { hat: 'bunny', hair: 'ponytail', hairColor: 'pink' } },
  { cls: 'Rogue_Hooded', look: { hat: 'none', hair: 'bun', hairColor: 'white', face: 'glasses', clothes: 'sunday' } },
];
const SPEED = 2.2;

/** Walks a few villagers back and forth along random routes over the path cells. */
export class Villagers {
  constructor(layout, rand, count = 6) {
    this.layout = layout;
    this.rand = rand;
    this.walkers = [];
    this.avoidKey = '';
    for (let i = 0; i < count; i++) {
      const person = PEOPLE[i % PEOPLE.length];
      const view = new CharacterView({ cls: person.cls, look: { hat: 'own', cape: 'own', ...person.look }, name: null, weapon: null });
      view.setBase('walk');
      this.walkers.push({ view, i });
    }
    this.plan([]);
    this.walkers = this.walkers.filter((w) => w.pts || (w.view.dispose(), false)); // (no paths at all: nobody)
  }

  /** Routes over the path cells, keeping `away` from these circles { x, z, r } (and anything solid). */
  plan(away) {
    const layout = this.layout, rand = this.rand;
    // a cell is walkable if no solid circle reaches into it (with room for a villager)
    const clearOf = (list, pad) => (cx, cz) => list.every((s) => {
      const nx = Math.max(cx * CELL, Math.min(s.x, (cx + 1) * CELL)), nz = Math.max(cz * CELL, Math.min(s.z, (cz + 1) * CELL));
      return (s.x - nx) ** 2 + (s.z - nz) ** 2 > (s.r + pad) ** 2;
    });
    const clear = clearOf(layout.solids, 0.5), free = clearOf(away, 0.9);
    const isPath = (cx, cz) => layout.cell(cx, cz) === '=' && clear(cx, cz) && free(cx, cz);
    const cells = [];
    for (let cz = 0; cz < layout.h; cz++) for (let cx = 0; cx < layout.w; cx++) if (isPath(cx, cz)) cells.push([cx, cz]);
    for (const w of this.walkers) {
      if (!cells.length) { w.len = 0; w.view.root.visible = false; continue; }
      // a route: a seeded random walk over neighbouring path cells
      let [cx, cz] = cells[Math.floor(rand(w.i, 0, 'vstart') * cells.length)];
      const route = [[cx, cz]];
      let last = null;
      for (let step = 0; step < 40; step++) {
        const options = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => isPath(cx + dx, cz + dz) && !(last && dx === -last[0] && dz === -last[1]));
        if (!options.length) break;
        const d = options[Math.floor(rand(w.i, step, 'vstep') * options.length)];
        cx += d[0]; cz += d[1];
        last = d;
        route.push([cx, cz]);
      }
      const i = w.i;
      w.pts = route.map(([x, z]) => ({ x: x * CELL + CELL / 2 + (rand(i, x * 31 + z, 'vjx') - 0.5) * 1.6, z: z * CELL + CELL / 2 + (rand(i, x * 17 + z, 'vjz') - 0.5) * 1.6 }));
      w.offset = rand(i, 9, 'voff') * w.pts.length * CELL;
      w.len = (w.pts.length - 1) * CELL;
      w.walked = null;
      w.started = false;
      w.view.root.visible = true;
      w.view.root.position.set(w.pts[0].x, 0, w.pts[0].z); // (a one-cell route: they just stand there)
    }
  }

  /** Keep out of these areas from now on (holiday visitors' corners); re-plans the routes when they change. */
  keepOut(away) {
    const key = away.map((a) => `${a.x.toFixed(1)},${a.z.toFixed(1)},${a.r.toFixed(1)}`).join(';');
    if (key === this.avoidKey) return;
    this.avoidKey = key;
    this.plan(away);
  }

  addTo(group) {
    for (const w of this.walkers) group.add(w.view.root);
  }

  update(dt) {
    if (this.paused) { for (const w of this.walkers) w.view.update(dt); return; } // (a film has them: GameClient raidFilm)
    const you = this.player; // (set by the game: villagers wait while you're in their way)
    for (const w of this.walkers) {
      if (w.len <= 0) continue;
      // there and back again along the route; standing still while you're just ahead of them
      const p = w.view.root.position, ahead = w.view.root.rotation.y;
      const blocked = you && w.started && (you.x - (p.x + Math.sin(ahead) * 0.7)) ** 2 + (you.z - (p.z + Math.cos(ahead) * 0.7)) ** 2 < 0.9 ** 2;
      w.walked = (w.walked ?? w.offset) + (blocked ? 0 : dt * SPEED);
      w.view.setBase(blocked ? 'idle' : 'walk'); // (waiting for you)
      w.started = true;
      let s = w.walked % (w.len * 2);
      const back = s > w.len;
      if (back) s = w.len * 2 - s;
      const i = Math.min(w.pts.length - 2, Math.floor(s / CELL)), u = (s - i * CELL) / CELL;
      const a = w.pts[i], b = w.pts[i + 1];
      const x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u;
      const dx = (b.x - a.x) * (back ? -1 : 1), dz = (b.z - a.z) * (back ? -1 : 1);
      w.view.root.position.set(x, 0, z);
      if (dx || dz) w.view.root.rotation.y = Math.atan2(dx, dz);
      w.view.update(dt);
    }
  }

  dispose() {
    for (const w of this.walkers) w.view.dispose();
  }
}
