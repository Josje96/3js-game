// The effects are pure WebAudio one-shots; make sure they never explode where there's no audio
// (headless browsers, before the first click) — the smoke tool fails a run on any console error.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Sfx } from '../src/client/sfx.js';

test('sfx: every sound is a safe no-op without an audio context', () => {
  const s = new Sfx({ ctx: null, master: null });
  for (const name of ['whoosh', 'thud', 'clang', 'chain', 'rock', 'smash', 'coin', 'pop', 'hurt', 'faint',
    'heal', 'potion', 'block', 'dodge', 'nova', 'chest', 'levelup', 'evolve', 'petlevel', 'chime', 'night']) {
    s.play(name); // must not throw
  }
});

test('sfx: with a fake running context the builders run and stay quiet enough', () => {
  let peak = 0;
  const gain = { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: (v) => { peak = Math.max(peak, v); } }, connect() { return gain; } };
  const node = { ...gain, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, type: '', Q: { value: 1 }, detune: { value: 0 }, start: () => {}, stop: () => {} };
  const s = new Sfx({
    ctx: {
      state: 'running', currentTime: 0, destination: {},
      sampleRate: 8000,
      createGain: () => ({ ...node }),
      createOscillator: () => ({ ...node }),
      createBiquadFilter: () => ({ ...node }),
      createBufferSource: () => ({ ...node, buffer: null, loop: false }),
      createBuffer: () => ({ getChannelData: () => new Float32Array(8) }),
    },
    master: gain,
  });
  for (const name of ['whoosh', 'coin', 'nova', 'chain', 'potion']) s.play(name);
  assert.ok(peak <= 0.35, `a sound peaked at ${peak} — too loud for little ears`);
});
