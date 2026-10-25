// Short sound effects with WebAudio — nothing is a recording. Like the generative music this
// sits next to, every sound is built from oscillator/noise voices with quick envelopes, so
// there are no files to load and nothing to sync. All of it routes through the music's master
// gain, so the volume slider and M (mute) cover effects too. Where there is no audio context
// yet (before the first click) or in headless browsers, every call is a safe no-op.
export class Sfx {
  constructor(music) {
    this.music = music;
    this.last = {}; // name -> when it last played, so bursts of events don't stack into mush
  }

  get ctx() { return this.music?.ctx ?? null; }

  /** Play a named sound ('coin', 'thud', ...) — at most once per ~60 ms so piles of events stay clean. */
  play(name) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const now = performance.now() / 1000;
    if (this.last[name] && now - this.last[name] < 0.06) return;
    this.last[name] = now;
    try { this[name]?.(); } catch (err) { console.warn('sfx failed', name, err); }
  }

  // ------------------------------------------------------------------ little building blocks

  /** A quick envelope + oscillator voice with an optional pitch slide. */
  tone({ type = 'sine', from, to, at = 0, dur = 0.2, vol = 0.15, dest = null }) {
    const ctx = this.ctx, t = ctx.currentTime + at;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(dest ?? this.music.master);
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, to ?? from), t + dur * 0.9);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** A shaped burst of noise through moving filters (whooshes, crumbles, splashes). */
  noise({ at = 0, dur = 0.2, vol = 0.2, type = 'lowpass', from = 1000, to, q = 0.8, dest = null }) {
    const ctx = this.ctx, t = ctx.currentTime + at;
    if (!this.music.sfxNoise) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.music.sfxNoise = buf;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.music.sfxNoise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, to ?? from), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest ?? this.music.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  /** A bell-like ping: a sine plus a quieter inharmonic partial above it. */
  ping(hz, { at = 0, dur = 0.4, vol = 0.12, partial = 2.76 } = {}) {
    this.tone({ type: 'sine', from: hz, at, dur, vol });
    this.tone({ type: 'sine', from: hz * partial, at, dur: dur * 0.5, vol: vol * 0.4 });
  }

  /** A little rising arpeggio of pings — good news sounds. */
  arpeggio(notes, { at = 0, step = 0.07, dur = 0.45, vol = 0.1 } = {}) {
    notes.forEach((hz, i) => this.ping(hz, { at: at + i * step, dur, vol }));
  }

  // ------------------------------------------------------------------ the sounds

  /** Decorations played with E (shared/furniture.js USES). */
  decor(use, on) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const n = (m) => 440 * 2 ** ((m - 69) / 12);
    const tune = (notes, { step = 0.22, dur = 0.5, vol = 0.12, type = 'triangle', oct = 0 } = {}) => notes.forEach((m, i) => {
      if (m != null) this.tone({ type, from: n(m + oct), at: i * step, dur, vol });
    });
    switch (use) {
      case 'gramophone': tune([62, 66, 69, 74, 73, 71, 69, 66, 67, 69], { step: 0.26, dur: 0.5, vol: 0.08, type: 'square' }); break;
      case 'teddy': this.heal(); break;
      case 'cake': this.coin(); break;
      case 'cauldron': for (let i = 0; i < 5; i++) this.tone({ type: 'sine', from: 200 + i * 40, to: 500, at: i * 0.13, dur: 0.1, vol: 0.06 }); break;
      case 'piano': tune([67, 72, 76, 79, 76, 72, 74, 77, 81, 79], { step: 0.2, dur: 0.6 }); break;
      case 'organ': [[48, 55, 60, 64], [53, 57, 60, 65], [55, 59, 62, 67], [48, 55, 60, 64]].forEach((ch, i) => ch.forEach((m) => this.tone({ type: 'sawtooth', from: n(m), at: i * 0.6, dur: 0.75, vol: 0.035 }))); break;
      case 'harp': this.arpeggio([60, 64, 67, 72, 76, 79, 84].map(n), { step: 0.09, dur: 1.0, vol: 0.09 }); break;
      case 'musicbox': [84, 88, 91, 88, 86, 84, 83, 86, 84].forEach((m, i) => this.ping(n(m), { at: i * 0.28, dur: 0.6, vol: 0.06 })); break;
      case 'birdcage': for (let i = 0; i < 4; i++) this.tone({ type: 'sine', from: 2400 + i * 200, to: 3600, at: i * 0.14, dur: 0.09, vol: 0.06 }); break;
      case 'globe': this.noise({ dur: 0.9, vol: 0.06, type: 'bandpass', from: 700, to: 300 }); break;
      case 'rockinghorse': for (let i = 0; i < 4; i++) this.tone({ type: 'triangle', from: 160, to: 120, at: i * 0.5, dur: 0.15, vol: 0.08 }); break;
      case 'aquarium': for (let i = 0; i < 6; i++) this.tone({ type: 'sine', from: 500 + i * 90, to: 900 + i * 90, at: i * 0.12, dur: 0.07, vol: 0.05 }); break;
      case 'hoard': this.coin(); this.chest(); break;
      case 'armor': this.clang(); break;
      case 'toybox': case 'treasure': this.chest(); break;
      case 'crystalball': this.arpeggio([n(76), n(80), n(83), n(88)], { step: 0.15, dur: 0.9, vol: 0.06 }); break;
      case 'telescope': this.ping(n(96), { dur: 0.8, vol: 0.06 }); break;
      case 'clock': for (let i = 0; i < 4; i++) this.tone({ type: 'square', from: i % 2 ? 1400 : 1100, at: i * 0.3, dur: 0.04, vol: 0.04 }); break;
      case 'bathtub': this.noise({ dur: on ? 1.4 : 0.9, vol: 0.12, type: 'lowpass', from: on ? 1800 : 900, to: on ? 900 : 300 }); break;
      case 'fountain': this.noise({ dur: 0.8, vol: 0.08, type: 'highpass', from: 2000 }); break;
      case 'fire': case 'light': on ? this.tone({ type: 'sine', from: 300, to: 900, dur: 0.15, vol: 0.06 }) : this.noise({ dur: 0.3, vol: 0.06, type: 'highpass', from: 1500 }); break;
      default: this.pop();
    }
  }

  whoosh() { // a swing through the air
    this.noise({ dur: 0.16, vol: 0.14, type: 'bandpass', from: 500, to: 1400, q: 1.2 });
  }

  thud() { // a blow lands on something soft
    this.tone({ from: 95, to: 45, dur: 0.14, vol: 0.3 });
    this.noise({ dur: 0.06, vol: 0.16, from: 700, to: 250 });
  }

  clang() { // metal on the anvil: two inharmonic partials + a bright attack
    this.tone({ type: 'sine', from: 1080, dur: 0.35, vol: 0.13 });
    this.tone({ type: 'sine', from: 1730, dur: 0.28, vol: 0.08 });
    this.noise({ dur: 0.05, vol: 0.16, type: 'highpass', from: 3000 });
  }

  chain() { // links snapping one by one, then the last clunk
    for (let i = 0; i < 5; i++) {
      const hz = 700 + Math.random() * 600;
      this.ping(hz, { at: i * 0.09, dur: 0.16, vol: 0.1, partial: 2.4 });
      this.noise({ at: i * 0.09, dur: 0.04, vol: 0.08, type: 'highpass', from: 2500 });
    }
    this.tone({ from: 240, to: 90, at: 0.5, dur: 0.3, vol: 0.22 });
    this.noise({ at: 0.5, dur: 0.2, vol: 0.18, from: 500, to: 150 });
  }

  rock() { // a rock bursts: rumble plus stones pattering down
    this.noise({ dur: 0.3, vol: 0.3, from: 800, to: 120 });
    for (let i = 0; i < 4; i++) this.ping(300 + Math.random() * 500, { at: 0.08 + i * 0.05, dur: 0.08, vol: 0.05 });
  }

  smash() { // a barrel falls apart: woodier than rock()
    this.noise({ dur: 0.22, vol: 0.26, from: 1400, to: 200, q: 0.5 });
    for (let i = 0; i < 3; i++) this.tone({ type: 'triangle', from: 220 + Math.random() * 200, at: i * 0.05, dur: 0.1, vol: 0.09 });
  }

  knock() { // knuckles on a wooden door: three dull raps
    for (const at of [0, 0.2, 0.4]) {
      this.tone({ type: 'triangle', from: 190, to: 120, at, dur: 0.09, vol: 0.28 });
      this.noise({ at, dur: 0.05, vol: 0.2, type: 'bandpass', from: 900, to: 500, q: 1.5 });
    }
  }

  /**
   * Say something out loud with the browser's own voice (the one recording-free way to get words),
   * at the volume slider and quiet when muted. `pitch`/`rate` make each speaker sound different; `at` waits
   * that many seconds first. A no-op without speech (some browsers) or before the first click.
   */
  say(text, { pitch = 1, rate = 1, at = 0, vol = 1 } = {}) {
    const music = this.music, speech = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
    if (!speech || typeof SpeechSynthesisUtterance === 'undefined' || !music || music.muted || this.ctx?.state !== 'running') return;
    const speak = () => {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.pitch = pitch; u.rate = rate; u.volume = Math.min(1, music.volume * vol);
        const english = speech.getVoices().find((v) => /^en/i.test(v.lang));
        if (english) u.voice = english;
        speech.speak(u);
      } catch (err) { console.warn('speech failed', err); }
    };
    if (at > 0) setTimeout(speak, at * 1000);
    else speak();
  }

  caw() { // a crow: two harsh, falling calls
    for (const at of [0, 0.32]) {
      this.tone({ type: 'sawtooth', from: 760, to: 520, at, dur: 0.18, vol: 0.05 });
      this.noise({ at, dur: 0.16, vol: 0.05, type: 'bandpass', from: 1400, to: 900, q: 2 });
    }
  }
  tweet() { // a little songbird: quick rising chirps
    for (let i = 0; i < 3; i++) this.tone({ type: 'sine', from: 2600 + i * 200, to: 3600 + i * 250, at: i * 0.11, dur: 0.07, vol: 0.035 });
  }
  coin() { // the classic two-note coin
    this.ping(988, { at: 0, dur: 0.09, vol: 0.1 });
    this.ping(1319, { at: 0.07, dur: 0.4, vol: 0.11 });
  }

  pop() { // picking up something that isn't money
    this.tone({ type: 'triangle', from: 420, to: 640, dur: 0.1, vol: 0.11 });
  }

  hurt() { // a short dismayed blip
    this.tone({ type: 'square', from: 310, to: 180, dur: 0.18, vol: 0.07 });
  }

  faint() { // everything slides away downwards
    this.tone({ type: 'sine', from: 420, to: 110, dur: 0.55, vol: 0.14 });
    this.tone({ type: 'triangle', from: 210, to: 70, dur: 0.6, vol: 0.08 });
  }

  heal() { // gentle upward pair
    this.arpeggio([660, 880], { step: 0.09, vol: 0.07 });
  }

  potion() { // two glugs
    for (const at of [0, 0.11]) {
      this.tone({ type: 'sine', from: 260, to: 380, at, dur: 0.09, vol: 0.12 });
      this.noise({ at, dur: 0.08, vol: 0.05, from: 500, to: 900 });
    }
  }

  block() { // a shield stops the blow
    this.tone({ type: 'square', from: 240, dur: 0.07, vol: 0.09 });
    this.ping(760, { at: 0.01, dur: 0.15, vol: 0.08 });
  }

  dodge() { // a quick swish
    this.noise({ dur: 0.12, vol: 0.12, type: 'bandpass', from: 900, to: 2200, q: 1.5 });
  }

  nova() { // the area spell: a boom and a wash
    this.tone({ from: 160, to: 38, dur: 0.5, vol: 0.3 });
    this.noise({ dur: 0.6, vol: 0.22, from: 1600, to: 90 });
    this.ping(52, { at: 0.02, dur: 0.7, vol: 0.1, partial: 1.5 });
  }

  chest() { // a lid creaks up, coins ring out
    this.tone({ type: 'triangle', from: 180, to: 260, dur: 0.22, vol: 0.1 });
    this.arpeggio([988, 1319, 1760], { at: 0.16, step: 0.06, vol: 0.08 });
  }

  levelup() { // good-news fanfare
    this.arpeggio([523, 659, 784, 1047], { step: 0.08, vol: 0.11, dur: 0.6 });
  }

  evolve() { // the same fanfare, prouder and longer
    this.arpeggio([523, 659, 784, 1047, 1319], { step: 0.09, vol: 0.12, dur: 0.8 });
  }

  petlevel() { // a tiny chirp for the pet
    this.arpeggio([784, 1047], { step: 0.07, vol: 0.08, dur: 0.3 });
  }

  chime() { // night is coming: soft warning bells
    this.arpeggio([784, 988, 1175], { step: 0.16, vol: 0.09, dur: 1.0 });
  }

  night() { // night has fallen: lower, sleepier bells
    this.arpeggio([523, 659, 784], { step: 0.22, vol: 0.1, dur: 1.4 });
  }
}
