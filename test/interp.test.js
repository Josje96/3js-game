// Remote movement smoothing (client/interp.js), checked against a simulated bad Wi-Fi link.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Interpolator } from '../src/client/interp.js';

/** Something walks at a steady 5 units/s. The host sends its position 20×/s; the network delays
 *  each update by 0–80 ms and loses 10% of them. We draw at 60 fps and measure how steady the
 *  drawn speed is (0 = perfectly steady). */
function simulate(drawAt) {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const arrivals = [];
  for (let t = 0; t < 10; t += 0.05) {
    if (rand() < 0.1) continue;
    arrivals.push({ at: t + rand() * 0.08, t, x: t * 5 });
  }
  arrivals.sort((a, b) => a.at - b.at);
  const speeds = [];
  let prev = null, next = 0;
  for (let now = 0.5; now < 9.5; now += 1 / 60) {
    while (next < arrivals.length && arrivals[next].at <= now) drawAt.receive(arrivals[next++]);
    const x = drawAt.draw(1 / 60);
    if (prev != null) speeds.push((x - prev) * 60);
    prev = x;
  }
  const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  return { mean, wobble: Math.sqrt(speeds.reduce((a, b) => a + (b - mean) ** 2, 0) / speeds.length) / mean };
}

test('interp: remote movement stays smooth when updates are late, bunched up or lost', () => {
  // the old way: jump to the newest update as soon as it arrives
  let latest = 0;
  const naive = simulate({ receive: (u) => { latest = Math.max(latest, u.x); }, draw: () => latest });
  // the new way
  const interp = new Interpolator();
  const smooth = simulate({
    receive: (u) => { interp.sync(u.t); interp.push('a', u.t, { x: u.x, z: 0, rot: 0 }); },
    draw: (dt) => { interp.advance(dt); return interp.sample('a')?.x ?? 0; },
  });
  if (process.env.SHOW) console.log('wobble: smoothed', smooth.wobble.toFixed(3), 'snapping', naive.wobble.toFixed(3));
  assert.ok(Math.abs(smooth.mean - 5) < 0.2, `moves at the right speed (${smooth.mean.toFixed(2)})`);
  assert.ok(smooth.wobble < 0.25, `steady motion (wobble ${smooth.wobble.toFixed(2)})`);
  assert.ok(naive.wobble > smooth.wobble * 4, `much steadier than snapping (${naive.wobble.toFixed(2)} vs ${smooth.wobble.toFixed(2)})`);
});

test('interp: angles turn the short way round', () => {
  const i = new Interpolator();
  i.sync(1); i.push('a', 0.9, { x: 0, z: 0, rot: 3.0 }); i.push('a', 1.0, { x: 0, z: 0, rot: -3.0 });
  i.advance(0.05);
  const r = i.sample('a').rot;
  assert.ok(Math.abs(r) > 3.0, `goes through π, not through 0 (${r.toFixed(2)})`);
});
