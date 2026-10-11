// Smooth movement for things other people control (other players, enemies, pets).
//
// Position updates arrive ~20 times a second, but never evenly (Wi-Fi bunches them up, and some
// are lost). Snapping to each one as it arrives looks jittery. Instead we keep a short history
// per thing and draw it DELAY seconds in the past, blending between the two updates either side
// of that moment — so the motion is smooth even when updates are late or missing.

const DELAY = 0.1;       // seconds behind the host we draw things (≈ two updates)
const KEEP = 10;         // updates remembered per thing
const MAX_EXTRAPOLATE = 0.15;

const lerpAngle = (a, b, t) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

export class Interpolator {
  constructor() {
    this.buffers = new Map(); // id -> [{ t, x, z, rot }]
    this.clock = null;        // our estimate of the host's clock
  }

  /** A position update stamped with the host's time arrived. Keeps our clock in step with it. */
  sync(serverTime) {
    if (this.clock == null || Math.abs(serverTime - this.clock) > 0.5) this.clock = serverTime;
    else if (serverTime > this.clock) this.clock += (serverTime - this.clock) * 0.3; // we fell behind: catch up
    else this.clock += (serverTime - this.clock) * 0.02;                             // ahead: ease back
  }

  /** Called every frame. */
  advance(dt) {
    if (this.clock != null) this.clock += dt;
  }

  push(id, t, state) {
    let buf = this.buffers.get(id);
    if (!buf) this.buffers.set(id, (buf = []));
    if (buf.length && t <= buf.at(-1).t) return;
    buf.push({ t, ...state });
    if (buf.length > KEEP) buf.shift();
  }

  forget(id) {
    this.buffers.delete(id);
  }

  /** Where `id` should be drawn now, or null if we know nothing about it. */
  sample(id) {
    const buf = this.buffers.get(id);
    if (!buf?.length || this.clock == null) return null;
    const t = this.clock - DELAY;
    if (t <= buf[0].t) return buf[0];
    for (let i = buf.length - 1; i > 0; i--) {
      const a = buf[i - 1], b = buf[i];
      if (t >= a.t && t <= b.t) {
        const u = (t - a.t) / (b.t - a.t || 1);
        return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, rot: lerpAngle(a.rot, b.rot, u) };
      }
    }
    // newer than anything we have (updates are late): keep going the way it was moving, briefly
    const last = buf.at(-1), prev = buf.at(-2);
    if (!prev) return last;
    const ahead = Math.min(t - last.t, MAX_EXTRAPOLATE), span = last.t - prev.t || 1;
    return { x: last.x + ((last.x - prev.x) / span) * ahead, z: last.z + ((last.z - prev.z) / span) * ahead, rot: last.rot };
  }
}
