// Deterministic randomness. Everything that must look the same on every
// machine (dungeon layouts, rock placement) is derived from a seed via these.

/** 32-bit string/number hash (FNV-1a over the joined parts). */
export function hashSeed(...parts) {
  const s = parts.join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: tiny, fast, good enough for games. */
export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** float in [min, max) */
    range: (min, max) => min + next() * (max - min),
    /** int in [min, max] inclusive */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
}

/** Human-friendly random seed like "mossy-otter-4821". */
export function randomSeedString() {
  const a = ['mossy', 'sunny', 'brave', 'sleepy', 'golden', 'wobbly', 'crystal', 'cozy', 'misty', 'jolly'];
  const b = ['otter', 'badger', 'dragon', 'turnip', 'lantern', 'goblin', 'pebble', 'muffin', 'falcon', 'beetle'];
  const r = makeRng((Math.random() * 2 ** 32) >>> 0);
  return `${r.pick(a)}-${r.pick(b)}-${r.int(1000, 9999)}`;
}
