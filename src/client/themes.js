// How each kind of place looks: floor and wall models (KayKit ids), a colour `tint` multiplied
// over them, background/fog colour, light levels, the lantern colour, and `deco` — the
// decorations along the walls (see decorations.js). A biome picks its theme in shared/dungeons.js.
// Every model listed here is preloaded (client/assets.js) and checked by the content test.

export const THEMES = {
  dungeon: { floors: ['dungeon/floor_tile_large', 'dungeon/floor_tile_large', 'dungeon/floor_tile_large', 'dungeon/floor_tile_large', 'dungeon/floor_tile_large', 'dungeon/floor_tile_large_rocks'], walls: ['dungeon/wall', 'dungeon/wall', 'dungeon/wall', 'dungeon/wall_cracked'], bg: 0x120e18, ambient: 0.35, sun: 0.25 },
  ruins:   { floors: ['dungeon/floor_dirt_large', 'dungeon/floor_dirt_large_rocky'], walls: ['dungeon/wall_cracked', 'dungeon/wall_broken', 'dungeon/wall'], bg: 0x0d1a16, ambient: 0.35, sun: 0.25 },
  // deeper biomes: the mine's tiles, recoloured, plus their own decorations along the walls
  frost:   { floors: ['dungeon/floor_tile_large', 'dungeon/floor_tile_large_rocks'], walls: ['dungeon/wall', 'dungeon/wall_cracked'], tint: 0xb8dcff, bg: 0x0c1824, ambient: 0.5, sun: 0.3, lantern: 0xcfe8ff, deco: 'ice' },
  grotto:  { floors: ['dungeon/floor_dirt_large', 'dungeon/floor_dirt_large_rocky'], walls: ['dungeon/wall', 'dungeon/wall_broken'], tint: 0xc9a8e8, bg: 0x140c1e, ambient: 0.4, sun: 0.2, lantern: 0xe4c8ff, deco: 'mushroom' },
  lava:    { floors: ['dungeon/floor_tile_large_rocks', 'dungeon/floor_dirt_large_rocky'], walls: ['dungeon/wall_cracked', 'dungeon/wall'], tint: 0xc07060, bg: 0x1e0a06, ambient: 0.45, sun: 0.25, lantern: 0xffb070, deco: 'ember' },
  crystal: { floors: ['dungeon/floor_tile_large', 'dungeon/floor_tile_large_rocks'], walls: ['dungeon/wall', 'dungeon/wall_cracked'], tint: 0xc8b8ff, bg: 0x120c24, ambient: 0.5, sun: 0.3, lantern: 0xe0d0ff, deco: 'crystal' },
  bone:    { floors: ['dungeon/floor_dirt_large', 'dungeon/floor_tile_large_rocks'], walls: ['dungeon/wall_cracked', 'dungeon/wall_broken'], tint: 0xe8dcc0, bg: 0x141210, ambient: 0.35, sun: 0.2, lantern: 0xfff0c8, deco: 'bones' },
  nest:    { floors: ['dungeon/floor_dirt_large_rocky', 'dungeon/floor_dirt_large'], walls: ['dungeon/wall_broken', 'dungeon/wall'], tint: 0xa898b0, bg: 0x0e0a12, ambient: 0.3, sun: 0.2, lantern: 0xd8c8ff, deco: 'webs' },
  gold:    { floors: ['dungeon/floor_tile_large', 'dungeon/floor_tile_big_grate'], walls: ['dungeon/wall', 'dungeon/wall_shelves'], tint: 0xffe2a0, bg: 0x1a1208, ambient: 0.55, sun: 0.35, lantern: 0xffe0a0, deco: 'coins' },
  shadow:  { floors: ['dungeon/floor_tile_large_rocks', 'dungeon/floor_dirt_large'], walls: ['dungeon/wall_cracked', 'dungeon/wall'], tint: 0x9080b8, bg: 0x08060f, ambient: 0.28, sun: 0.15, lantern: 0xc8a8ff, deco: 'wisps' },
  magma:   { floors: ['dungeon/floor_tile_large_rocks', 'dungeon/floor_dirt_large_rocky'], walls: ['dungeon/wall_broken', 'dungeon/wall_cracked'], tint: 0xb05040, bg: 0x200604, ambient: 0.45, sun: 0.25, lantern: 0xff9a50, deco: 'ember' },
  coral:   { floors: ['dungeon/floor_dirt_large', 'dungeon/floor_dirt_large_rocky'], walls: ['dungeon/wall', 'dungeon/wall_cracked'], tint: 0x90d8d0, bg: 0x061a1e, ambient: 0.5, sun: 0.3, lantern: 0xbff0ff, deco: 'coral' },
  library: { floors: ['dungeon/floor_wood_large_dark', 'dungeon/floor_tile_large'], walls: ['dungeon/wall_shelves', 'dungeon/wall'], tint: 0xa8c0e0, bg: 0x0a1018, ambient: 0.4, sun: 0.25, lantern: 0xd0e8ff, deco: 'books' },
  kelp:    { floors: ['dungeon/floor_dirt_large', 'dungeon/floor_dirt_large_rocky'], walls: ['dungeon/wall_broken', 'dungeon/wall'], tint: 0x90c890, bg: 0x061810, ambient: 0.45, sun: 0.3, lantern: 0xc8ffd8, deco: 'kelp' },
  pearl:   { floors: ['dungeon/floor_tile_large', 'dungeon/floor_tile_large_rocks'], walls: ['dungeon/wall', 'dungeon/wall_arched'], tint: 0xffe0ee, bg: 0x1a1018, ambient: 0.6, sun: 0.35, lantern: 0xfff0f8, deco: 'pearls' },
  abyss:   { floors: ['dungeon/floor_dirt_large_rocky', 'dungeon/floor_tile_large_rocks'], walls: ['dungeon/wall_cracked', 'dungeon/wall_broken'], tint: 0x6080b8, bg: 0x02060f, ambient: 0.25, sun: 0.15, lantern: 0x8ac8ff, deco: 'wisps' },
  keep:    { floors: ['dungeon/floor_tile_large', 'dungeon/floor_tile_big_grate'], walls: ['dungeon/wall', 'dungeon/wall_window_closed', 'dungeon/wall'], tint: 0xb8b8c8, bg: 0x0c0c14, ambient: 0.4, sun: 0.25, lantern: 0xffd9a0, deco: 'banners' },
  throne:  { floors: ['dungeon/floor_tile_large', 'dungeon/floor_tile_big_grate'], walls: ['dungeon/wall_arched', 'dungeon/wall'], tint: 0x9070b0, bg: 0x08040f, ambient: 0.35, sun: 0.2, lantern: 0xd8a8ff, deco: 'banners' },
  wood:    { floors: ['dungeon/floor_wood_large'], walls: ['dungeon/wall', 'dungeon/wall_shelves', 'dungeon/wall'], bg: 0x1b1410, ambient: 1.0, sun: 0.9 },
  outdoor: { bg: 0x8fd3ff, ambient: 1.3, sun: 2.2 },
};
