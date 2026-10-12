// Static props placed by maps or the dungeon generator.
// radius > 0 means it blocks movement. `interact` is handled by a server system (systems/*.js `interactions`).
// `npc` = a character model standing there (`npcLook` dresses them); `stall` = a canopy of that colour
// over a counter; `requiresFlag` = hidden (and unusable) until that world flag is set.

export const PROPS = {
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
  // town: stalls under canopies around the market square, plus things to look at
  fountain:   { build: 'fountain', radius: 1.9 },
  lamp:       { build: 'lamp', radius: 0.3, light: true },
  townsfolk:  { townsfolk: true, radius: 0.7, interact: 'talk', prompt: 'Talk' },
  decorator:  { npc: 'Rogue', npcName: 'Decorator', npcLook: { hat: 'tophat', clothes: 'suit', hair: 'suave', hairColor: 'ginger', face: 'monocle', cape: 'none' },
                radius: 2.3, offsetZ: -0.9, interact: 'decorator', prompt: 'Decorator (furniture, walls & floors)', stall: 0x7a52b8,
                requiresFlag: 'mineCleared' },
  spring:     { build: 'springSign', radius: 0.5, offsetZ: 1.2, interact: 'spring', prompt: 'Healing spring — full heal for 5 gold' },
  forge:      { build: 'forge', npc: 'Barbarian', npcName: 'Blacksmith', radius: 2.0, offsetZ: -0.6, interact: 'forge', prompt: 'Forge (make weapons from blueprints)' },
  mirror:     { build: 'mirror', radius: 0.7, offsetZ: -1.3, interact: 'mirror', prompt: 'Mirror (hair & face)' },
  wardrobe:   { build: 'wardrobe', radius: 1.2, offsetZ: -0.9, interact: 'wardrobe', prompt: 'Wardrobe (change outfit)' },
  petkeeper:  { npc: 'Ranger', npcName: 'Pet Keeper', radius: 2.3, offsetZ: -0.9, interact: 'pets', prompt: 'Pet Keeper (pets & treats)', stall: 0xff9ab8, pets: true },
  shopkeeper: { npc: 'Mage', npcName: 'Shopkeeper', npcLook: { hat: 'none', hair: 'bun', hairColor: 'ginger', clothes: 'sunday', cape: 'none' },
                radius: 2.3, offsetZ: -0.9, interact: 'shop', prompt: 'Shop (gear, armor, food, fashion)', stall: 0x4f8ce0 },
};
