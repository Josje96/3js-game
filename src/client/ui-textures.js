// Stone and wood textures for the menus and HUD, painted on canvas so they match the
// dungeon and town look without shipping extra image files. Same every time (seeded).

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stone() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d'), r = rng(7);
  g.fillStyle = '#2c2630';
  g.fillRect(0, 0, 256, 256);
  // staggered blocks, each a little different in tone
  for (let row = 0; row < 4; row++) {
    const y = row * 64, offset = row % 2 ? 40 : 0;
    for (let x = -offset; x < 256; x += 80) {
      const tone = 46 + Math.floor(r() * 22);
      g.fillStyle = `rgb(${tone + 6}, ${tone + 2}, ${tone + 14})`;
      g.fillRect(x + 3, y + 3, 74, 58);
      for (let i = 0; i < 40; i++) { // speckles
        g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
        g.fillRect(x + 3 + r() * 74, y + 3 + r() * 58, 2, 2);
      }
    }
  }
  return c;
}

function wood() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d'), r = rng(19);
  // vertical planks
  for (let x = 0; x < 256; x += 64) {
    const base = 96 + Math.floor(r() * 26);
    g.fillStyle = `rgb(${base + 30}, ${base + 4}, ${base - 30})`;
    g.fillRect(x, 0, 64, 256);
    for (let i = 0; i < 9; i++) { // grain
      g.strokeStyle = `rgba(60, 30, 10, ${0.12 + r() * 0.12})`;
      g.lineWidth = 1 + r();
      const gx = x + 6 + r() * 52;
      g.beginPath();
      g.moveTo(gx, 0);
      g.bezierCurveTo(gx + 5, 80, gx - 5, 170, gx + 2, 256);
      g.stroke();
    }
    g.fillStyle = 'rgba(30, 14, 4, 0.55)'; // seam between planks
    g.fillRect(x, 0, 2, 256);
  }
  return c;
}

/** Puts the stone and wood textures into CSS variables (--stone, --wood). */
export function applyUiTextures() {
  const root = document.documentElement.style;
  root.setProperty('--stone', `url(${stone().toDataURL()})`);
  root.setProperty('--wood', `url(${wood().toDataURL()})`);
}
