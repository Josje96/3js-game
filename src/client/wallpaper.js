// Patterned wallpaper for the fort (the fancy WALL_STYLES with a `pattern`): painted once onto a
// seamless canvas, then used as a texture on panels in front of the walls and as the shop swatch.
import * as THREE from 'three';

const S = 256; // texture size; one tile covers half a wall panel
const cache = new Map();

const css = (c) => `#${c.toString(16).padStart(6, '0')}`;

/** Draw `fn(x, y)` at each spot plus its wrapped copies, so motifs crossing an edge tile seamlessly. */
function tiled(spots, fn) {
  for (const [x, y] of spots) for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(x + ox, y + oy);
}

function heart(g, x, y, r) {
  g.beginPath();
  g.moveTo(x, y + r * 0.9);
  g.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.1, x, y - r * 0.35);
  g.bezierCurveTo(x + r * 0.7, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
  g.fill();
}

function star(g, x, y, r, points = 5) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2, d = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  g.closePath();
  g.fill();
}

/** A damask medallion: a tall leaf-shaped body, curls either side, a little crown on top. */
function medallion(g, x, y, s) {
  g.beginPath();
  g.ellipse(x, y, s * 0.32, s * 0.6, 0, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.ellipse(x, y, s * 0.16, s * 0.38, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.beginPath();
  g.ellipse(x, y, s * 0.08, s * 0.2, 0, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = s * 0.07;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.arc(x + side * s * 0.55, y + s * 0.15, s * 0.22, side > 0 ? Math.PI * 0.6 : -Math.PI * 0.6 + Math.PI, side > 0 ? Math.PI * 2.1 : -Math.PI * 0.1 + Math.PI, side < 0);
    g.stroke();
  }
  star(g, x, y - s * 0.75, s * 0.18, 3);
}

/** Paint a pattern ({ kind, bg, fg, accent }) onto a 2D context of size S. */
function paint(g, { kind, bg, fg, accent = fg }) {
  g.fillStyle = css(bg);
  g.fillRect(0, 0, S, S);
  g.fillStyle = css(fg);
  g.strokeStyle = css(fg);
  if (kind === 'stripes') { // regency stripes: broad bands with thin accent pinstripes
    for (let x = 0; x < S; x += 64) g.fillRect(x, 0, 28, S);
    g.fillStyle = css(accent);
    for (let x = 0; x < S; x += 64) { g.fillRect(x + 38, 0, 4, S); g.fillRect(x + 50, 0, 4, S); }
  } else if (kind === 'damask') {
    tiled([[64, 64], [192, 192]], (x, y) => medallion(g, x, y, 70));
    g.fillStyle = css(accent);
    tiled([[192, 64], [64, 192]], (x, y) => star(g, x, y, 9, 4));
  } else if (kind === 'floral') {
    const spots = [[40, 40], [168, 72], [104, 150], [232, 200], [24, 220]];
    g.fillStyle = css(0x5c9a52);
    tiled(spots, (x, y) => { g.beginPath(); g.ellipse(x + 14, y + 12, 9, 4, 0.6, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = css(fg);
    tiled(spots, (x, y) => { for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 7, 0, Math.PI * 2); g.fill(); } });
    g.fillStyle = css(accent);
    tiled(spots, (x, y) => { g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); });
  } else if (kind === 'polka') {
    tiled([[32, 32], [160, 32], [96, 96], [224, 96], [32, 160], [160, 160], [96, 224], [224, 224]], (x, y) => { g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.fill(); });
  } else if (kind === 'stars') { // a night sky: little stars everywhere, a big one now and then
    const rnd = mulberry(7);
    for (let i = 0; i < 40; i++) { g.globalAlpha = 0.5 + rnd() * 0.5; star(g, rnd() * S, rnd() * S, 2 + rnd() * 3); }
    g.globalAlpha = 1;
    g.fillStyle = css(accent);
    tiled([[64, 80], [196, 190]], (x, y) => star(g, x, y, 16));
    tiled([[200, 52]], (x, y) => { g.beginPath(); g.arc(x, y, 18, 0, Math.PI * 2); g.fill(); g.fillStyle = css(bg); g.beginPath(); g.arc(x + 8, y - 5, 16, 0, Math.PI * 2); g.fill(); g.fillStyle = css(accent); });
  } else if (kind === 'hearts') {
    tiled([[64, 64], [192, 192]], (x, y) => heart(g, x, y, 22));
    g.fillStyle = css(accent);
    tiled([[192, 64], [64, 192]], (x, y) => heart(g, x, y, 12));
  } else if (kind === 'harlequin') { // diamonds in two colours, crossed by fine gold lines
    const spots = [];
    for (let x = 0; x < S; x += 64) for (let y = 0; y < S; y += 128) spots.push([x, y]);
    tiled(spots, (x, y) => { g.beginPath(); g.moveTo(x, y - 64); g.lineTo(x + 32, y); g.lineTo(x, y + 64); g.lineTo(x - 32, y); g.closePath(); g.fill(); });
    g.strokeStyle = css(accent);
    g.lineWidth = 2;
    for (let k = -4; k <= 8; k++) {
      g.beginPath(); g.moveTo(k * 64 + 32, 0); g.lineTo(k * 64 + 160, S); g.stroke();
      g.beginPath(); g.moveTo(k * 64 + 32, 0); g.lineTo(k * 64 - 96, S); g.stroke();
    }
  } else if (kind === 'royal') { // deep colour, gold crowns in a half-drop
    g.fillStyle = css(fg);
    tiled([[64, 64], [192, 192]], (x, y) => {
      g.fillRect(x - 20, y, 40, 10);
      for (const dx of [-16, 0, 16]) star(g, x + dx, y - 6, dx ? 10 : 14, 3);
    });
    g.fillStyle = css(accent);
    tiled([[192, 64], [64, 192]], (x, y) => { g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); });
  }
}

/** A small seeded random, so every page draws the same sky. */
function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasFor(pattern) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  paint(c.getContext('2d'), pattern);
  return c;
}

/** The repeating texture for a wallpaper pattern (shared by every panel using it). */
export function wallpaperTexture(pattern) {
  const key = JSON.stringify(pattern);
  if (!cache.has(key)) {
    const t = new THREE.CanvasTexture(canvasFor(pattern));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    cache.set(key, t);
  }
  return cache.get(key);
}

const swatches = new Map();
/** A data: URL of the pattern, for the Decorator's list. */
export function wallpaperSwatch(pattern) {
  const key = JSON.stringify(pattern);
  if (!swatches.has(key)) swatches.set(key, canvasFor(pattern).toDataURL('image/png'));
  return swatches.get(key);
}
