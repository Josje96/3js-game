// trophies — beat a dungeon (its floor-100 boss) and a golden trophy stand appears beside its gate in town.
// Everyone in the family takes their own trophy from it (E, once each): a decoration for their room at home
// (shared/furniture.js `trophy`), to show off on its own or by the trophy cabinet.
import { DUNGEONS } from '../../shared/dungeons.js';
import { FURNITURE } from '../../shared/furniture.js';
import { CELL } from '../../shared/config.js';
import { blocked } from '../../shared/physics.js';

const TROPHIES = Object.fromEntries(Object.entries(FURNITURE).filter(([, d]) => d.trophy).map(([id, d]) => [d.trophy, id])); // dungeon id -> furniture id
const claimFlag = (dungeon, p) => `trophy_${dungeon}_${p.id}`; // save.flags: this player took this trophy

/** The town was loaded: put up the stands for the dungeons already beaten. */
export function onLocation(loc) {
  if (loc.key === 'town') this.syncTrophies(loc);
}

export const interactions = {
  /** Take your trophy: it goes home with you (B to place it in your room). */
  trophy(p, stand) {
    const item = TROPHIES[stand.dungeon];
    if (!item) return;
    if (this.save.flags[claimFlag(stand.dungeon, p)]) return this.toast(p, `🏆 You already took your ${FURNITURE[item].name} — it’s waiting at home (press B there to put it in your room).`);
    this.save.flags[claimFlag(stand.dungeon, p)] = true;
    const owned = this.save.house.owned;
    owned[item] = (owned[item] ?? 0) + 1;
    this.toast(p, `🏆 You took the ${FURNITURE[item].name}! It’s waiting at home: press B there to show it off in your room.`);
    this.sendToLocation(p.loc, { t: 'fx', kind: 'chest', x: stand.x, z: stand.z });
    this.sendHouse();
    this.persist();
  },
};

export const methods = {
  /** A stand by the gate of every completed dungeon (once each). */
  syncTrophies(loc) {
    for (const [dungeon, item] of Object.entries(TROPHIES)) {
      if (!this.save.dungeons[dungeon]?.completed || [...loc.entities.values()].some((e) => e.trophyStand && e.dungeon === dungeon)) continue;
      const at = this.trophySpot(loc, dungeon);
      if (!at) continue;
      loc.spawn({
        type: 'furniture', item, trophyStand: true, dungeon, x: at.x, z: at.z, rot: at.rot, r: FURNITURE[item].radius,
        interact: 'trophy', prompt: `Take your ${DUNGEONS[dungeon].name} trophy 🏆`,
      });
    }
  },

  /** Beside the dungeon's gate (or the mine's entrance), on open ground, facing the way in. */
  trophySpot(loc, dungeon) {
    const portal = Object.values(loc.layout.portals).find((q) => q.dungeon === dungeon);
    if (!portal) return null;
    const [dx, dz] = portal.dir;
    const gx = portal.cx * CELL + CELL / 2 + dx * CELL * 1.2, gz = portal.cz * CELL + CELL / 2 + dz * CELL * 1.2;
    for (const side of [1, -1, 2, -2]) {
      const x = gx - dz * side * 2.6, z = gz + dx * side * 2.6;
      if (!blocked(loc.layout, x, z, 0.8)) return { x, z, rot: Math.atan2(dx, dz) };
    }
    return null;
  },
};
