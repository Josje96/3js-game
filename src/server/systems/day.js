// day — part of the GameServer (see systems/index.js). Methods run with `this` = the GameServer.
import { DAY_SECONDS, NIGHT_WARNING } from '../../shared/config.js';
import { parseKey } from '../../shared/dungeons.js';

/** Runs every server step. */
export function tick(dt) {
  this.tickDay(dt);
}

export const methods = {
  /** The day clock: night falls every DAY_SECONDS; then the mine shuts and everyone underground goes home. */
  tickDay(dt) {
    this.dayClock += dt;
    this.worldTimer -= dt;
    if (this.worldTimer <= 0) { this.worldTimer = 1; this.broadcastWorld(); }
    if (!this.night && this.dayClock >= DAY_SECONDS) {
      this.night = true;
      this.nightHomeAt = this.dayClock + NIGHT_WARNING;
      this.broadcast({ t: 'toast', text: `Night is falling! Get back to the fort within ${NIGHT_WARNING} seconds.`, big: true });
      this.broadcastWorld();
    }
    if (this.nightHomeAt !== null && this.dayClock >= this.nightHomeAt) {
      this.nightHomeAt = null;
      for (const p of [...this.players.values()]) {
        if (parseKey(p.loc ?? '').kind !== 'dungeon') continue;
        this.toast(p, 'Night has fallen. Someone carried you home.');
        this.travel(p, 'house');
      }
    }
  },
};
