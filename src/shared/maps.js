// Hand-made locations as ASCII art. Each character is one 4x4 cell.
// Edit these freely; `npm test` checks they're well-formed.
//
// Terrain:  #  wall (indoors) / tree (outdoors)     .  floor / grass
//           =  path / cobblestones                  ~  water
//           t  tree (outdoors, same as #)
//           H  fort building   R  rock mound   G  ancient (ruins) gate stonework   Q  shadow keep gate stonework
//           X  castle wall     Y  castle tower   +  fence   E  cottage
// Portals:  (solid cells you walk into; each must touch exactly one walkable cell)
//           D  house door (inside)   d  house door (outside)
//           m  mine entrance         g  ruins gate        q  shadow keep gate
// Props:    C  chest   T  table   b  barrel   W  wardrobe   M  mirror   k  shopkeeper   p  spawn point
//           B  a bed slot in the fort (each family member gets one; see server/systems/home.js)
//           h  healing spring sign (put it on the edge of a pond)   K  pet keeper + stall   F  forge + blacksmith
//           v  the Decorator's stall (appears once the King Slime is beaten)   w  fountain   l  lamp post
//           n  a townsperson you can talk to (each n gets the next one in shared/townsfolk.js)
//           f  flower bed   u  training dummy   s  practice slime (both live in the training yard)

export const MAPS = {
  house: {
    title: 'Family Fort',
    theme: 'wood',
    rows: [
      '#################',
      '#B..B..B..B.W.MC#',
      '#...............#',
      '#...............#',
      '#B..B..B..B.....#',
      '#...............#',
      '#.......T.......#',
      '#...............#',
      '#.......p.....b.#',
      '########D########',
    ],
    portals: {
      D: { to: 'town', portal: 'd' },
    },
  },

  town: {
    title: 'Pebble Town',
    theme: 'outdoor',
    rows: [
      'YXXXXXXXXXXXXXXXXYXXXXXXXXXXXXXXXXXY',
      'X.............HHHHHHHH.............X',
      'X..f..f.......HHHHHHHH......RRRRR..X',
      'X.f~~~~.....t.HHHHHHHH..t...RRRRR..X',
      'X..~~~~h......HHHdHHHH......RRmRR..X',
      'X..~~~~..........=............=....X',
      'X.f~~~~.f..t.....=........t...=....X',
      'X...f............p............=....X',
      'X......==....l...=....l....====.GGGX',
      'X....n..========================gGGX',
      'X.t......==k===F====K===v==n....GGGX',
      'X........==================........X',
      'Y........==================.l......Y',
      'X...t...t=n================b...t...X',
      'X........========w=====n===........X',
      'X........==================.....QQQX',
      'X.....==========================qQQX',
      'X.....=..l........=.......l.....QQQX',
      'X.++++.++++.......=..n.............X',
      'X.+.......+.....n.=..........n.....X',
      'X.+.......+..t....=.......b........X',
      'X.+.u...s.+...E...=.E...E...E..t...X',
      'X.+.......+.......=................X',
      'X.+++++++++........t...............X',
      'X..................................X',
      'YXXXXXXXXXXYXXXXXXXXXXXXYXXXXXXXXXXY',
    ],
    portals: {
      d: { to: 'house', portal: 'D' },
      m: { dungeon: 'mine' },
      g: { dungeon: 'ruins' },
      q: { dungeon: 'keep' },
    },
  },
};

/** How each map character behaves. `base` is what ends up in the collision grid. */
export const LEGEND = {
  '#': { base: '#' }, 't': { base: '#' },
  '.': { base: '.' }, '=': { base: '=' }, '~': { base: '~' },
  'H': { base: 'H' }, 'R': { base: 'R' }, 'G': { base: 'G' }, 'Q': { base: 'Q' },
  'X': { base: 'X' }, 'Y': { base: 'Y' }, '+': { base: '+' }, 'E': { base: 'E' },
  'D': { base: 'D', portal: true }, 'd': { base: 'd', portal: true },
  'm': { base: 'm', portal: true }, 'g': { base: 'g', portal: true }, 'q': { base: 'q', portal: true },
  'B': { base: '.', bedSlot: true },
  'C': { base: '.', prop: 'chest' },
  'T': { base: '.', prop: 'table' },
  'b': { base: '.', prop: 'barrel' },
  'W': { base: '.', prop: 'wardrobe' },
  'M': { base: '.', prop: 'mirror' },
  'h': { base: '.', prop: 'spring' },
  'K': { base: '=', prop: 'petkeeper' },
  'F': { base: '=', prop: 'forge' },
  'k': { base: '=', prop: 'shopkeeper' },
  'v': { base: '=', prop: 'decorator' },
  'w': { base: '=', prop: 'fountain' },
  'l': { base: '.', prop: 'lamp' },
  'n': { base: '.', prop: 'townsfolk' },
  'f': { base: '.', decor: 'flowers' },
  'u': { base: '.', spot: 'dummy' },
  's': { base: '.', spot: 'trainingSlime' },
  'p': { base: '.', spawn: true },
};
