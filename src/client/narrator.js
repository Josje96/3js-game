// The storyteller: a deep, calm fantasy voice reading the films' captions (the intro, the story pages).
// The browser's own speech voices (no recordings to load): the smooth neural ones first (Edge's
// "Online (Natural)" voices, Chrome's Google UK male, macOS's Daniel/Arthur), a man's voice, only a little
// lower and slower than normal: pitched right down, every voice turns robotic. Follows the volume slider
// and M (mute). Where there's no speech at all (headless browsers) every call is a safe no-op, and the
// films just run on their own clock.

// best first (names differ per system: Edge, Chrome, macOS, Windows, Linux)
const PREFERRED = [
  /Microsoft (Ryan|Thomas|Guy|Christopher|Andrew|Brian|Davis|Eric|Roger|Steffan|Liam|William).*Natural/i, // the neural ones: very smooth
  /Natural.*\b(Male|Man)\b/i,
  /Google UK English Male/i,
  /\b(Arthur|Daniel|Oliver|Rishi|Aaron|Evan|Nathan|Tom)\b/i, // macOS / iOS
  /Microsoft (George|Ryan|David|Mark|James)/i,
  /\bmale\b/i,
];

export class Narrator {
  constructor(music) {
    this.music = music;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis ?? null : null;
    this.voice = null;
    this.synth?.addEventListener?.('voiceschanged', () => { this.voice = null; }); // (Chrome loads its list late)
  }

  pickVoice() {
    if (this.voice || !this.synth) return this.voice;
    const all = this.synth.getVoices().filter((v) => /^en/i.test(v.lang));
    for (const re of PREFERRED) {
      const v = all.find((x) => re.test(x.name) && !/female/i.test(x.name));
      if (v) return (this.voice = v);
    }
    return (this.voice = all[0] ?? null);
  }

  /** Read a caption out (emoji and asides in brackets left out), after whatever is being read now. */
  say(text) {
    if (!this.synth || typeof SpeechSynthesisUtterance === 'undefined' || this.music?.muted) return;
    const words = text.replace(/\(.*?\)/g, '').replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/…/g, '... ').trim();
    if (!words) return;
    const u = new SpeechSynthesisUtterance(words);
    const voice = this.pickVoice();
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    u.pitch = 0.8; // a little deeper (any lower and it sounds like a robot)
    u.rate = 0.88; // unhurried, like reading from an old book
    u.volume = Math.min(1, (this.music?.volume ?? 0.6) * 1.4);
    try { this.synth.speak(u); } catch { /* no speech here */ }
  }

  /** Still reading? (a film waits for the line to finish before the next caption) */
  speaking() { return !!this.synth && (this.synth.speaking || this.synth.pending); }

  stop() { try { this.synth?.cancel(); } catch { /* ignore */ } }
}
