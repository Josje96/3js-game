// Keyboard + mouse + gamepad. Movement is read every frame; actions are
// "pressed this frame" events you consume().
//
//   Move: WASD / arrows / left stick        Attack: Space / click / (A)    Jump: J
//   Interact: E / (X)    Potion: Q / (Y)    Menu: Esc / (Start)    Chat: Enter    Music: M
//   Roll: Shift / K / (B)    Character sheet: C / I / (Back)    Pets: P    Area spell: R    Feed pet: G
//   At home: B = build mode (place furniture; R rotates, E places, X picks up)
//   Item bar: Tab (or click it) picks things in the bar at the bottom: ←/→ choose, Enter uses, Esc/Tab done

const KEY_ACTIONS = {
  Space: 'attack', KeyJ: 'jump',
  KeyE: 'interact', KeyF: 'interact',
  KeyQ: 'potion', KeyR: 'spell', KeyG: 'feed',
  Escape: 'menu',
  Enter: 'chat',
  KeyM: 'music',
  KeyC: 'sheet', KeyI: 'sheet', KeyP: 'pets', KeyL: 'story', KeyB: 'build', KeyX: 'pickup', F3: 'stats',
  ShiftLeft: 'roll', ShiftRight: 'roll', KeyK: 'roll',
  KeyV: 'fly',
  Tab: 'bar',
};
// while choosing in the item bar the arrows, Enter and Esc work the bar (WASD still walk)
const BAR_KEYS = { ArrowLeft: 'barLeft', ArrowUp: 'barLeft', ArrowRight: 'barRight', ArrowDown: 'barRight', Enter: 'barUse', NumpadEnter: 'barUse', Escape: 'bar', Tab: 'bar' };
const PAD_ACTIONS = { 0: 'attack', 1: 'roll', 2: 'interact', 3: 'potion', 4: 'spell', 5: 'feed', 8: 'sheet', 9: 'menu' };

/** Cheat codes typed as digits anywhere (also in shop windows): 1234 = 1000 gold, 5678 = a free enchant (only in the Enchanter's window). */
const CHEAT_CODES = ['1234', '5678'];

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.padPrev = [];
    this.enabled = true; // false while typing in a dialog
    this.barMode = false; // choosing in the item bar (see BAR_KEYS)
    this.typed = ''; // the last few digits typed (cheat codes: GameClient)
    this.wheel = 0;
    addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      if (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow')) e.preventDefault();
      const digit = /^(Digit|Numpad)([0-9])$/.exec(e.code);
      if (digit && !e.repeat) {
        this.typed = (this.typed + digit[2]).slice(-8);
        const code = CHEAT_CODES.find((c) => this.typed.endsWith(c));
        if (code) { this.pressed.add(`cheat:${code}`); this.typed = ''; }
      }
      if (this.barMode && BAR_KEYS[e.code]) { this.pressed.add(BAR_KEYS[e.code]); return; } // (not walking with the arrows)
      if (!e.repeat && KEY_ACTIONS[e.code]) this.pressed.add(KEY_ACTIONS[e.code]);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) this.pressed.add(this.barMode ? 'bar' : 'attack'); }); // (clicking the world ends choosing in the bar)
    // hold the right mouse button and drag: up or down tilts the camera, left or right turns it round you (GameClient)
    this.tilt = 0;
    this.turn = 0;
    canvas.addEventListener('mousedown', (e) => { if (e.button === 2) this.tilting = true; });
    addEventListener('mouseup', (e) => { if (e.button === 2) this.tilting = false; });
    addEventListener('mousemove', (e) => { if (this.tilting) { this.tilt += e.movementY; this.turn += e.movementX; } });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  }

  /** Movement vector in world space (camera looks north, so up = -z). */
  move() {
    if (!this.enabled) return { x: 0, z: 0 };
    let x = 0, z = 0;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) z -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) z += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    const pad = this.pad();
    if (pad) {
      const [ax, az] = [pad.axes[0] ?? 0, pad.axes[1] ?? 0];
      if (Math.hypot(ax, az) > 0.2) { x += ax; z += az; }
    }
    const len = Math.hypot(x, z);
    return len > 1 ? { x: x / len, z: z / len } : { x, z };
  }

  pad() {
    return navigator.getGamepads?.().find((p) => p && p.connected) ?? null;
  }

  /** Call once per frame before reading actions. */
  poll() {
    const pad = this.pad();
    if (!pad) return;
    pad.buttons.forEach((b, i) => {
      if (b.pressed && !this.padPrev[i] && PAD_ACTIONS[i]) this.pressed.add(PAD_ACTIONS[i]);
      this.padPrev[i] = b.pressed;
    });
  }

  consume(action) {
    const had = this.pressed.has(action);
    this.pressed.delete(action);
    return had && (this.enabled || action.startsWith('cheat:') || action === 'menu' || action === 'sheet' || action === 'pets' || action === 'story' || action === 'stats' || (this.barMode && action.startsWith('bar')));
  }

  /** How far the mouse moved up/down with the right button held, since last asked (pixels). */
  takeTilt() {
    const t = this.tilt;
    this.tilt = 0;
    return t;
  }

  /** How far the mouse moved left/right with the right button held, since last asked (pixels). */
  takeTurn() {
    const t = this.turn;
    this.turn = 0;
    return t;
  }

  takeWheel() {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  clear() {
    this.pressed.clear();
  }
}

function isTyping(e) {
  const t = e.target;
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;
}
