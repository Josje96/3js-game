// Static props placed by maps or the dungeon generator.
// radius > 0 means it blocks movement. `interact` is handled by the server.

export const PROPS = {
  bed:        { model: 'dungeon/bed_decorated', radius: 1.4, interact: 'sleep', prompt: 'Sleep (heal & save)' },
  chest:      { model: 'dungeon/chest', radius: 1.0, interact: 'storage', prompt: 'Family chest' },
  table:      { model: 'dungeon/table_medium_decorated_A', radius: 1.1 },
  barrel:     { model: 'dungeon/barrel_large', radius: 0.95 },
  keg:        { model: 'dungeon/keg_decorated', radius: 0.95 },
  crates:     { model: 'dungeon/crates_stacked', radius: 1.1 },
  box:        { model: 'dungeon/box_large', radius: 0.8 },
  boxsmall:   { model: 'dungeon/box_small_decorated', radius: 0.6 },
  pillar:     { model: 'dungeon/pillar', radius: 0.8 },
  rubble:     { model: 'dungeon/rubble_half', radius: 0 },
  torch:      { model: 'dungeon/torch_mounted', radius: 0, light: true },
  banner:     { model: 'dungeon/banner_patternA_red', radius: 0 },
  spring:     { build: 'springSign', radius: 0.5, offsetZ: 1.2, interact: 'spring', prompt: 'Healing spring — full heal for 5 gold' },
  forge:      { build: 'forge', npc: 'Barbarian', npcName: 'Blacksmith', radius: 2.0, offsetZ: -0.6, interact: 'forge', prompt: 'Forge (make weapons from blueprints)' },
  mirror:     { build: 'mirror', radius: 0.7, offsetZ: -1.3, interact: 'mirror', prompt: 'Mirror (hair & face)' },
  wardrobe:   { build: 'wardrobe', radius: 1.2, offsetZ: -0.9, interact: 'wardrobe', prompt: 'Wardrobe (change outfit)' },
  petkeeper:  { npc: 'Ranger', npcName: 'Pet Keeper', radius: 2.3, offsetZ: -0.9, interact: 'pets', prompt: 'Pet shop', stall: true },
  shopkeeper: { npc: 'Mage', radius: 2.3, offsetZ: -0.9, interact: 'shop', prompt: 'Shop' },
};
