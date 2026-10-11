// Keyboard + mouse + gamepad. Movement is read every frame; actions are
// "pressed this frame" events you consume().
//
//   Move: WASD / arrows / left stick        Attack: Space / J / click / (A)
//   Interact: E / (X)    Potion: Q / (Y)    Menu: Esc / (Start)    Chat: Enter    Music: M
//   Roll: Shift / K / (B)    Character sheet: C / I / (Back)    Pets: P

const KEY_ACTIONS = {
  Space: 'attack', KeyJ: 'attack',
  KeyE: 'interact', KeyF: 'interact',
  KeyQ: 'potion', KeyR: 'spell', KeyG: 'feed',
  Escape: 'menu',
  Enter: 'chat',
  KeyM: 'music',
  KeyC: 'sheet', KeyI: 'sheet', KeyP: 'pets',
  ShiftLeft: 'roll', ShiftRight: 'roll', KeyK: 'roll',
};
const PAD_ACTIONS = { 0: 'attack', 1: 'roll', 2: 'interact', 3: 'potion', 4: 'spell', 5: 'feed', 8: 'sheet', 9: 'menu' };

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.padPrev = [];
    this.enabled = true; // false while typing in a dialog
    this.wheel = 0;
    addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!e.repeat && KEY_ACTIONS[e.code]) this.pressed.add(KEY_ACTIONS[e.code]);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) this.pressed.add('attack'); });
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
    return had && (this.enabled || action === 'menu' || action === 'sheet' || action === 'pets');
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
