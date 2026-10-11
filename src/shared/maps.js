// Hand-made locations as ASCII art. Each character is one 4x4 cell.
// Edit these freely; `npm test` checks they're well-formed.
//
// Terrain:  #  wall (indoors) / tree (outdoors)     .  floor / grass
//           =  path                                 ~  water
//           t  tree (outdoors, same as #)
//           H  fort building   S  shop building   R  rock mound   G  ancient gate stonework
// Portals:  (solid cells you walk into; each must touch exactly one walkable cell)
//           D  house door (inside)   d  house door (outside)
//           m  mine entrance         g  ancient gate
// Props:    B  bed   C  chest   T  table   b  barrel   W  wardrobe   M  mirror   k  shopkeeper   p  spawn point
//           h  healing spring sign (put it on the edge of a pond)   K  pet keeper + stall   F  forge + blacksmith

export const MAPS = {
  house: {
    title: 'Family Fort',
    theme: 'wood',
    rows: [
      '#########',
      '#B.b.WMC#',
      '#.......#',
      '#...T...#',
      '#.......#',
      '#...p...#',
      '####D####',
    ],
    portals: {
      D: { to: 'town', portal: 'd' },
    },
  },

  town: {
    title: 'Pebble Town',
    theme: 'outdoor',
    rows: [
      '########################',
      '#..t.........t......t..#',
      '#..HHHH..........SSSS..#',
      '#..HHHH....t.....SSSS..#',
      '#..HHdH..h.......SSSS..#',
      '#....=..~~~~......k=...#',
      '#....=..~~~~.......=...#',
      '#....===============...#',
      '#.........=...F....=...#',
      '#.RRR..K..=........=GGG#',
      '#.RmR.....=........=GgG#',
      '#..=......=........==..#',
      '#..========.p..........#',
      '#t.......b.......t.....#',
      '########################',
    ],
    portals: {
      d: { to: 'house', portal: 'D' },
      m: { dungeon: 'mine' },
      g: { dungeon: 'ruins' },
    },
  },
};

/** How each map character behaves. `base` is what ends up in the collision grid. */
export const LEGEND = {
  '#': { base: '#' }, 't': { base: '#' },
  '.': { base: '.' }, '=': { base: '=' }, '~': { base: '~' },
  'H': { base: 'H' }, 'S': { base: 'S' }, 'R': { base: 'R' }, 'G': { base: 'G' },
  'D': { base: 'D', portal: true }, 'd': { base: 'd', portal: true },
  'm': { base: 'm', portal: true }, 'g': { base: 'g', portal: true },
  'B': { base: '.', prop: 'bed' },
  'C': { base: '.', prop: 'chest' },
  'T': { base: '.', prop: 'table' },
  'b': { base: '.', prop: 'barrel' },
  'W': { base: '.', prop: 'wardrobe' },
  'M': { base: '.', prop: 'mirror' },
  'h': { base: '.', prop: 'spring' },
  'K': { base: '.', prop: 'petkeeper' },
  'F': { base: '.', prop: 'forge' },
  'k': { base: '.', prop: 'shopkeeper' },
  'p': { base: '.', spawn: true },
};
