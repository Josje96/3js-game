// Generative background music with WebAudio — nothing is a recording, so it never loops.
// Each 8-bar section picks a fresh chord progression and a new melodic motif, which is
// then repeated, varied and answered (like a little folk tune). Every few sections the
// lead instrument, register or key changes. Moods per location set scale, tempo and band.

const MOODS = {
  home:  { scale: 'lydian',  root: 65, bpm: 76,  lead: ['musicbox', 'harp'],  arp: 'harp',  bass: true,  pad: true, drums: false, density: 0.55, sparkle: 0.25 },
  town:  { scale: 'major',   root: 67, bpm: 104, lead: ['flute', 'marimba'], arp: 'pluck', bass: true,  pad: true, drums: true,  density: 0.7,  sparkle: 0.12 },
  // underground it's dark: `dread` = a low drone, a slow heartbeat, sparse lead, now and then an eerie sting
  mine:  { scale: 'phrygian', root: 50, bpm: 58, lead: ['bell', 'musicbox'], arp: 'harp',  bass: true,  pad: true, drums: false, density: 0.22, sparkle: 0.06, dread: true },
  ruins: { scale: 'aeolian', root: 52, bpm: 62,  lead: ['flute', 'bell'],    arp: 'harp',  bass: true,  pad: true, drums: false, density: 0.3,  sparkle: 0.08, dread: true },
  frost: { scale: 'aeolian', root: 57, bpm: 64,  lead: ['bell', 'musicbox'], arp: 'harp',  bass: true,  pad: true, drums: false, density: 0.3,  sparkle: 0.15, dread: true },
  grotto:{ scale: 'phrygian', root: 52, bpm: 70, lead: ['marimba', 'bell'],  arp: 'pluck', bass: true,  pad: true, drums: false, density: 0.3,  sparkle: 0.08, dread: true },
  lava:  { scale: 'harmonic', root: 50, bpm: 76, lead: ['flute', 'marimba'], arp: 'pluck', bass: true,  pad: true, drums: true,  density: 0.4,  sparkle: 0.03, dread: true },
  crystal:{ scale: 'harmonic', root: 57, bpm: 64, lead: ['bell', 'harp'],    arp: 'harp',  bass: true,  pad: true, drums: false, density: 0.3,  sparkle: 0.2,  dread: true },
  spooky:{ scale: 'phrygian', root: 50, bpm: 56, lead: ['musicbox', 'bell'], arp: 'harp',  bass: true,  pad: true, drums: false, density: 0.2,  sparkle: 0.06, dread: true },
  sea:   { scale: 'aeolian', root: 52, bpm: 62,  lead: ['flute', 'harp'],    arp: 'harp',  bass: true,  pad: true, drums: false, density: 0.3,  sparkle: 0.1,  dread: true },
  keep:  { scale: 'harmonic', root: 52, bpm: 72, lead: ['flute', 'marimba'], arp: 'pluck', bass: true,  pad: true, drums: true,  density: 0.4,  sparkle: 0.04, dread: true },
  // the intro's legend: slow and grand, a low harmonic-minor drone under a horn-like flute
  legend:{ scale: 'harmonic', root: 50, bpm: 58, lead: ['flute', 'bell'],   arp: 'harp',  bass: true,  pad: true, drums: false, density: 0.32, sparkle: 0.1 },
  boss:  { scale: 'aeolian', root: 62, bpm: 128, lead: ['marimba', 'flute'], arp: 'pluck', bass: true,  pad: false, drums: true, density: 0.8,  sparkle: 0.05 },
};

const SCALES = {
  major:   [0, 2, 4, 5, 7, 9, 11],
  lydian:  [0, 2, 4, 6, 7, 9, 11],
  dorian:  [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10], // the dark one: that flat second
  harmonic: [0, 2, 3, 5, 7, 8, 11], // harmonic minor: spooky-castle
};

// which scale degree (0-based) tends to follow which — a tiny Markov chain of cute progressions
const NEXT_CHORD = {
  0: [3, 4, 5, 1, 3, 4],
  1: [4, 4, 6, 3],
  2: [5, 3, 1],
  3: [4, 0, 1, 4, 6],
  4: [0, 0, 5, 3, 2],
  5: [3, 1, 4, 3],
  6: [0, 4, 2],
};

// one-bar rhythms in eighth notes: 1 = note, 0 = rest, 2 = hold
const RHYTHMS = [
  [1, 0, 1, 0, 1, 0, 1, 2],
  [1, 2, 1, 1, 1, 2, 1, 0],
  [1, 1, 1, 2, 1, 2, 2, 0],
  [1, 2, 2, 1, 1, 2, 1, 1],
  [1, 0, 1, 1, 1, 2, 2, 2],
  [1, 2, 1, 2, 1, 1, 1, 2],
  [1, 1, 1, 1, 1, 2, 2, 0],
];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
const STORE_KEY = 'fdg.music';
const MASTER_LEVEL = 0.8;  // everything (music and sound effects) at the volume slider
const MUSIC_MIX = 0.55;    // the music alone sits this far under the sound effects

export class Music {
  constructor() {
    this.ctx = null;
    this.mood = null;
    this.moodName = null;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY)) ?? {}; } catch { /* private mode etc. */ }
    this.volume = saved.volume ?? 0.6;
    this.muted = saved.muted ?? false;
    // browsers only allow audio after a click/key, so start on the first one
    const unlock = () => { this.unlock(); removeEventListener('pointerdown', unlock); removeEventListener('keydown', unlock); };
    addEventListener('pointerdown', unlock);
    addEventListener('keydown', unlock);
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume * MASTER_LEVEL;
      // a little room: convolution reverb from decaying noise + a soft echo
      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = this.impulse(2.6);
      this.wet = this.ctx.createGain();
      this.wet.gain.value = 0.35;
      this.echo = this.ctx.createDelay(1);
      this.echoFb = this.ctx.createGain();
      this.echoFb.gain.value = 0.28;
      this.echo.connect(this.echoFb).connect(this.echo);
      this.echo.connect(this.wet);
      this.bus = this.ctx.createGain(); // per-mood fade in/out
      // the music goes through its own quieter mix before the master; sound effects go straight
      // to the master (client/sfx.js), so they stand out over the music
      this.musicMix = this.ctx.createGain();
      this.musicMix.gain.value = MUSIC_MIX;
      this.musicMix.connect(this.master);
      this.bus.connect(this.musicMix);
      this.bus.connect(this.reverb).connect(this.wet).connect(this.musicMix);
      this.master.connect(this.ctx.destination);
      this.timer = setInterval(() => this.schedule(), 100);
      document.addEventListener('visibilitychange', () => {
        // background tabs throttle timers; pause instead of stuttering
        if (document.hidden) this.ctx.suspend(); else this.ctx.resume();
      });
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.moodName && !this.mood) this.setMood(this.moodName);
  }

  impulse(seconds) {
    const rate = this.ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    return buf;
  }

  setVolume(v) { this.volume = v; this.applyGain(); this.store(); }
  toggleMute() { this.muted = !this.muted; this.applyGain(); this.store(); return this.muted; }
  applyGain() { this.master?.gain.setTargetAtTime(this.muted ? 0 : this.volume * MASTER_LEVEL, this.ctx.currentTime, 0.1); }
  store() { try { localStorage.setItem(STORE_KEY, JSON.stringify({ volume: this.volume, muted: this.muted })); } catch { /* ignore */ } }

  /** Switch to a mood ('home', 'town', 'mine', 'ruins', 'boss'): fade out, start a new piece. */
  setMood(name) {
    if (!MOODS[name]) return;
    if (this.mood && this.moodName === name) return;
    this.moodName = name;
    if (!this.ctx) return; // starts when unlocked
    const now = this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(now);
    this.bus.gain.setTargetAtTime(0, now, 0.25);
    const startAt = now + (this.mood ? 1.1 : 0.05);
    this.mood = { ...MOODS[name] };
    this.bus.gain.setTargetAtTime(1, startAt, 0.6);
    this.beat = 60 / this.mood.bpm;
    this.echo.delayTime.value = this.beat * 0.75;
    this.key = this.mood.root;
    this.chord = 0;
    this.section = 0;
    this.lead = pick(this.mood.lead);
    this.nextBar = startAt + 0.05;
    this.bar = 0;
    this.plan = null;
  }

  // ------------------------------------------------------------------ composing

  scaleNote(degree, octave = 0) {
    const s = SCALES[this.mood.scale];
    const o = Math.floor(degree / 7);
    return this.key + s[((degree % 7) + 7) % 7] + 12 * (o + octave);
  }

  /** Plan the next 8 bars: progression + a motif and its variations. */
  newSection() {
    const m = this.mood;
    this.section++;
    // every few sections: new lead, maybe a key change up a 4th/5th (folded back into range)
    if (this.section % 3 === 0) this.lead = pick(m.lead);
    if (this.section % 4 === 0 && Math.random() < 0.6) {
      this.key += pick([5, 7, -5, 2, -2]);
      if (this.key > m.root + 6) this.key -= 12;
      if (this.key < m.root - 6) this.key += 12;
    }
    const chords = [];
    let c = this.section === 1 ? 0 : pick(NEXT_CHORD[this.chord]);
    for (let i = 0; i < 4; i++) {
      chords.push(c, c);
      c = pick(NEXT_CHORD[c]);
    }
    chords[7] = Math.random() < 0.6 ? 4 : chords[6]; // lean towards a cadence...
    this.chord = 0;                                    // ...that resolves home next section
    // motif: 2 bars of rhythm + contour (steps)
    const rhythm = [pick(RHYTHMS), pick(RHYTHMS)];
    const contour = Array.from({ length: 16 }, () => pick([-2, -1, -1, 0, 1, 1, 2, 3, -3]));
    const variation = pick(['repeat', 'up', 'invert', 'rhythm']);
    const resting = Math.random() > m.density + 0.25; // sometimes the lead sits out a section
    this.plan = { chords, rhythm, contour, variation, resting, arpStyle: pick(['up', 'updown', 'broken', 'off']), octave: pick([0, 0, 1]) };
    this.melodyDeg = 7 + pick([0, 2, 4]);
  }

  schedule() {
    if (!this.mood || !this.ctx || this.ctx.state !== 'running') return;
    // keep ~half a second of music queued
    while (this.nextBar < this.ctx.currentTime + 0.5) {
      if (!this.plan || this.bar === 8) { this.newSection(); this.bar = 0; }
      // tempo breathes a little so sections don't feel machine-identical
      this.playBar(this.nextBar, this.bar);
      this.nextBar += this.beat * 4 * (1 + (Math.random() - 0.5) * 0.02);
      this.bar++;
    }
  }

  playBar(t0, bar) {
    const m = this.mood, P = this.plan, beat = this.beat, e8 = beat / 2;
    const deg = P.chords[bar];
    const triad = [deg, deg + 2, deg + 4];
    if (bar === 7) this.chord = deg;

    if (m.pad) for (const d of triad) this.pad(this.scaleNote(d, -1), t0, beat * 4);
    if (m.bass) {
      this.bass(this.scaleNote(deg, -2), t0, beat * 1.6);
      this.bass(this.scaleNote(deg + (Math.random() < 0.5 ? 4 : 0), -2), t0 + beat * 2, beat * 1.4);
    }

    if (m.dread) { // a low hum under everything, a slow heartbeat, and sometimes something unsettling
      this.pad(this.key - 12, t0, beat * 4.2);
      if (bar % 2 === 0) { this.thump(t0, 0.22); this.thump(t0 + beat * 0.45, 0.14); }
      if (Math.random() < 0.14) { // two bells a semitone apart, high and quiet
        const at = t0 + (2 + Math.floor(Math.random() * 4)) * e8, n = this.scaleNote(deg + 14, 0);
        this.voice('bell', n, at, beat * 2, 0.045, true);
        this.voice('bell', n + 1, at + e8 * 0.5, beat * 2, 0.035, true);
      }
    }

    if (P.arpStyle !== 'off' && !(m.dread && bar % 2 === 1)) { // underground the arpeggio only stirs every other bar
      const order = { up: [0, 1, 2, 1, 0, 1, 2, 1], updown: [0, 1, 2, 3, 2, 1, 0, 1], broken: [0, 2, 1, 2, 0, 2, 1, 3] }[P.arpStyle];
      for (let i = 0; i < 8; i++) {
        if (Math.random() < 0.12) continue; // little gaps keep it airy
        const k = order[i];
        this.voice(m.arp, this.scaleNote(deg + (k === 3 ? 7 : k * 2), 0), t0 + i * e8, e8 * 1.5, 0.11);
      }
    }

    if (!P.resting) {
      // bars 0-1 motif, 2-3 variation, 4-5 motif again, 6-7 answer that lands on a chord tone
      const half = bar % 2;
      let rhythm = P.rhythm[half];
      if ((bar === 2 || bar === 3) && P.variation === 'rhythm') rhythm = P.rhythm[1 - half];
      if (bar === 6 || bar === 7) rhythm = bar === 7 ? [1, 2, 1, 2, 1, 2, 2, 2] : pick(RHYTHMS);
      if (bar % 4 === 0) this.melodyDeg = 7 + triad[0] % 7 + pick([0, 2]);
      for (let i = 0; i < 8; i++) {
        if (rhythm[i] !== 1) continue;
        let len = 1;
        while (i + len < 8 && rhythm[i + len] === 2) len++;
        let step = P.contour[half * 8 + i];
        if ((bar === 2 || bar === 3) && P.variation === 'invert') step = -step;
        this.melodyDeg += step;
        // strong beats snap to the nearest chord tone so it always sounds sweet
        if (i % 4 === 0) {
          const tones = [-7, 0, 7, 14].flatMap((o) => triad.map((d) => d + o));
          this.melodyDeg = tones.reduce((a, b) => (Math.abs(b - this.melodyDeg) < Math.abs(a - this.melodyDeg) ? b : a));
        }
        this.melodyDeg = Math.max(4, Math.min(16, this.melodyDeg));
        const up = (bar === 2 || bar === 3) && P.variation === 'up' ? 1 : 0;
        const note = this.scaleNote(this.melodyDeg + up * 2, P.octave - 1);
        this.voice(this.lead, note, t0 + i * e8, e8 * len, 0.2);
      }
    }

    if (Math.random() < m.sparkle) { // twinkles high up
      const d = pick(triad) + 14;
      this.voice('bell', this.scaleNote(d, 0), t0 + Math.floor(Math.random() * 8) * e8, beat, 0.06, true);
    }
    if (m.drums) {
      for (let i = 0; i < 8; i++) {
        if (i % 2 === 1 || Math.random() < 0.3) this.shaker(t0 + i * e8, i % 2 ? 0.05 : 0.025);
      }
      this.thump(t0, 0.35);
      if (Math.random() < 0.6) this.thump(t0 + beat * 2, 0.25);
    }
  }

  // ------------------------------------------------------------------ instruments

  env(gain, t, a, peak, d, sustain = 0.0001) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + a);
    gain.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
  }

  osc(type, hz, t, stop, dest, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = hz;
    o.detune.value = detune;
    o.connect(dest);
    o.start(t);
    o.stop(stop);
    return o;
  }

  voice(kind, midi, t, len, vol, echo = false) {
    const ctx = this.ctx, hz = midiHz(midi);
    const g = ctx.createGain();
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 0.6;
    g.connect(pan).connect(this.bus);
    if (echo || kind === 'musicbox' || kind === 'bell') g.connect(this.echo);
    switch (kind) {
      case 'musicbox': { // bright, pingy, long tail
        this.env(g, t, 0.005, vol, 1.6);
        this.osc('sine', hz, t, t + 1.8, g);
        const h = ctx.createGain(); h.connect(g); this.env(h, t, 0.003, 0.35, 0.25);
        this.osc('sine', hz * 4, t, t + 0.4, h);
        break;
      }
      case 'bell': { // inharmonic partial = bell-ish
        this.env(g, t, 0.004, vol, 2.2);
        this.osc('sine', hz, t, t + 2.4, g);
        const h = ctx.createGain(); h.connect(g); this.env(h, t, 0.003, 0.4, 0.8);
        this.osc('sine', hz * 2.76, t, t + 1, h);
        break;
      }
      case 'flute': { // soft attack, vibrato, sustains for the note length
        const end = t + Math.max(len, 0.15);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol * 0.8, t + 0.06);
        g.gain.setValueAtTime(vol * 0.7, end - 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, end + 0.18);
        const o = this.osc('triangle', hz, t, end + 0.2, g);
        const lfo = ctx.createOscillator(), depth = ctx.createGain();
        lfo.frequency.value = 5.2; depth.gain.value = hz * 0.006;
        lfo.connect(depth).connect(o.frequency);
        lfo.start(t + 0.12); lfo.stop(end + 0.2);
        this.osc('sine', hz * 2, t, end + 0.2, g).detune.value = 3;
        break;
      }
      case 'marimba': {
        this.env(g, t, 0.004, vol, 0.5);
        this.osc('sine', hz, t, t + 0.6, g);
        const h = ctx.createGain(); h.connect(g); this.env(h, t, 0.002, 0.3, 0.06);
        this.osc('sine', hz * 4, t, t + 0.1, h);
        break;
      }
      case 'harp':
      case 'pluck': { // filtered triangle, filter closes as it decays
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(kind === 'harp' ? 3200 : 2200, t);
        f.frequency.exponentialRampToValueAtTime(500, t + 0.6);
        f.connect(g);
        this.env(g, t, 0.004, vol, kind === 'harp' ? 1.1 : 0.4);
        this.osc('triangle', hz, t, t + 1.2, f);
        break;
      }
    }
  }

  pad(midi, t, len) {
    const g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900;
    f.connect(g).connect(this.bus);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.025, t + len * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.6);
    for (const d of [-7, 7]) this.osc('sawtooth', midiHz(midi), t, t + len + 0.7, f, d);
  }

  bass(midi, t, len) {
    const g = this.ctx.createGain();
    g.connect(this.bus);
    this.env(g, t, 0.01, 0.16, len);
    this.osc('triangle', midiHz(midi), t, t + len + 0.05, g);
  }

  shaker(t, vol) {
    const ctx = this.ctx;
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noise;
    f.type = 'highpass'; f.frequency.value = 6000;
    src.connect(f).connect(g).connect(this.bus);
    this.env(g, t, 0.003, vol, 0.06);
    src.start(t); src.stop(t + 0.1);
  }

  thump(t, vol) { // soft kick
    const g = this.ctx.createGain();
    g.connect(this.bus);
    this.env(g, t, 0.003, vol, 0.25);
    const o = this.osc('sine', 120, t, t + 0.3, g);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.2);
  }
}

/** Which mood fits a layout. */
export function moodFor(layout) {
  if (layout.isBoss) return 'boss';
  if (layout.kind === 'dungeon') {
    return {
      ruins: 'ruins', frost: 'frost', grotto: 'grotto', nest: 'grotto', kelp: 'grotto', lava: 'lava', magma: 'lava',
      crystal: 'crystal', pearl: 'crystal', gold: 'crystal', bone: 'spooky', shadow: 'spooky', library: 'spooky',
      coral: 'sea', abyss: 'sea', keep: 'keep', throne: 'keep',
    }[layout.theme] ?? 'mine';
  }
  return layout.theme === 'wood' ? 'home' : 'town';
}
