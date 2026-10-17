// Pets: little friends that follow you, fight with you, level up and evolve.
// Shared rules (host + clients). The client builds their looks in client/pets.js.

import { xpToNext } from './progression.js';
import { DUNGEONS } from './dungeons.js';
import { SEASON_BOSSES } from './seasons.js';

/** Levels at which a pet evolves into its next form. */
export const EVOLVE_AT = [10, 20];
/** Every this many levels a pet gets a new look (see TIER_LOOKS). Evolutions fall on these too. */
export const TIER_EVERY = 5;
export const TIER_LOOKS = [
  null,                    // levels 1-4
  'a red scarf',           // 5
  'evolves!',              // 10
  'orbiting sparkles',     // 15
  'evolves, with a crown!',// 20
  'a glowing ring',        // 25
  'a golden scarf and a crown gem', // 30
  'a halo',                // 35
  'a rainbow ring',        // 40
  'a soft glow',           // 45
  'a golden shimmer',      // 50
  'a second ring of stars',// 55
  'floating gems',         // 60
  'fairy wings',           // 65
  'a jewelled crown',      // 70
  'a sparkle trail',       // 75
  'a diamond collar',      // 80
  'an aurora ring',        // 85
  'starlight wings',       // 90
  'a little moon of its own', // 95
  'a legendary rainbow aura!', // 100
];
export const PET_MAX_LEVEL = 100;
/** The Pet Keeper trains a young pet straight up to this level, for a price (only below it). */
export const TRAIN_TO = 10, TRAIN_COST = 10000;

/**
 * Every species. `atk` = how hard it hits at level 1, `forms` = its name at each stage.
 * Maple is the family's Maltipoo: free, and always called Maple.
 */
export const PET_SPECIES = {
  maple:    { name: 'Maltipoo',  price: 0,   atk: 2, forms: ['Maple', 'Brave Maple', 'Mighty Maple'], fixedName: 'Maple' },
  mouse:    { name: 'Mouse',     price: 144,  atk: 1, forms: ['Mouse', 'Squeakster', 'Mouse King'] },
  hamster:  { name: 'Hamster',   price: 120,  atk: 1, forms: ['Hamster', 'Hamster Hero', 'Hamster Lord'] },
  snail:    { name: 'Snail',     price: 72,  atk: 1, forms: ['Snail', 'Speedy Snail', 'Turbo Snail'] },
  chick:    { name: 'Chick',     price: 96,  atk: 1, forms: ['Chick', 'Hen', 'Phoenix'] },
  frog:     { name: 'Frog',      price: 192,  atk: 2, forms: ['Frog', 'Bullfrog', 'Frog Prince'] },
  bunny:    { name: 'Bunny',     price: 168,  atk: 2, forms: ['Bunny', 'Jackrabbit', 'Moon Rabbit'] },
  duck:     { name: 'Duckling',  price: 144,  atk: 2, forms: ['Duckling', 'Duck', 'Swan Knight'] },
  piglet:   { name: 'Piglet',    price: 144,  atk: 2, forms: ['Piglet', 'Pig', 'Boar Chief'] },
  bee:      { name: 'Bee',       price: 168,  atk: 2, forms: ['Bee', 'Bumblebee', 'Queen Bee'] },
  hedgehog: { name: 'Hedgehog',  price: 216, atk: 2, forms: ['Hoglet', 'Hedgehog', 'Spike Lord'] },
  turtle:   { name: 'Turtle',    price: 288, atk: 2, forms: ['Turtle', 'Shellguard', 'Elder Tortoise'] },
  penguin:  { name: 'Penguin',   price: 240, atk: 2, forms: ['Penguin Chick', 'Penguin', 'Emperor Penguin'] },
  owl:      { name: 'Owl',       price: 288, atk: 3, forms: ['Owlet', 'Owl', 'Wise Owl'] },
  axolotl:  { name: 'Axolotl',   price: 312, atk: 3, forms: ['Axolotl', 'Axo Diver', 'Axolotl Sage'] },
  fox:      { name: 'Fox',       price: 336, atk: 3, forms: ['Fox Kit', 'Fox', 'Nine-Tail Fox'] },
  cat:      { name: 'Cat',       price: 360, atk: 3, forms: ['Kitten', 'Cat', 'Royal Cat'] },
  panda:    { name: 'Panda',     price: 384, atk: 3, forms: ['Panda Cub', 'Panda', 'Master Panda'] },
  dragon:   { name: 'Dragon',    price: 720, atk: 4, forms: ['Baby Dragon', 'Dragon', 'Elder Dragon'] },
  unicorn:  { name: 'Unicorn',   price: 720, atk: 4, forms: ['Pony', 'Unicorn', 'Alicorn'] },
  snake:    { name: 'Snake',     price: 264, atk: 3, forms: ['Snakelet', 'Python', 'Royal Cobra'] },
  giraffe:  { name: 'Giraffe',   price: 400, atk: 3, forms: ['Giraffe Calf', 'Giraffe', 'Sky Giraffe'] },
  fairy:    { name: 'Fairy',     price: 480, atk: 3, forms: ['Pixie', 'Fairy', 'Fairy Queen'] },
};

/**
 * Mini bosses: beat a boss and a little one of it joins the Pet Keeper's stall (for the whole family).
 * `mini_<boss variant>`; `unlock` = the world flag that boss sets (seasonal bosses: `beat_<variant>`).
 * Drawn with the boss's own model, pet-sized (client/pets.js).
 */
export const MINI_PREFIX = 'mini_';
const bossList = [
  ...Object.values(DUNGEONS).flatMap((d, di) => d.biomes.map((b, i) => ({ variant: b.boss.variant, name: b.boss.name, flag: b.boss.flag, price: 800 + di * 800 + i * 120 }))),
  ...Object.values(SEASON_BOSSES).flat().map((b) => ({ variant: b.variant, name: b.name, flag: `beat_${b.variant}`, price: 5000 })),
];
for (const b of bossList) {
  const name = b.name.replace(/^The /, '');
  PET_SPECIES[MINI_PREFIX + b.variant] = {
    name: `Mini ${name}`, price: b.price, atk: 4, mini: b.variant, unlock: b.flag, unlockBy: b.name,
    forms: [`Mini ${name}`, `Little ${name}`, `Young ${name}`],
  };
}
export const isMiniPet = (species) => species?.startsWith(MINI_PREFIX);

export function petStage(level) {
  return level >= EVOLVE_AT[1] ? 2 : level >= EVOLVE_AT[0] ? 1 : 0;
}

export function petFormName(species, level) {
  return PET_SPECIES[species]?.forms[petStage(level)] ?? species;
}

/** How hard a pet hits. Evolving gives a big boost. */
export function petDamage(species, level) {
  const s = PET_SPECIES[species];
  return Math.round(((s?.atk ?? 1) + level * 0.7) * [1, 1.25, 1.6][petStage(level)]);
}

export const petXpToNext = (level) => xpToNext(level) - 5;

/** 0 at levels 1-4, 1 at 5-9, 2 at 10-14 ... 20 at 100. */
export function petTier(level) {
  return Math.min(TIER_LOOKS.length - 1, Math.floor(level / TIER_EVERY));
}

/** Health: grows with level, and a lot when evolving. */
export function petMaxHp(species, level) {
  const tough = { turtle: 1.4, panda: 1.25, hedgehog: 1.2, snail: 1.3, mouse: 0.8, bee: 0.8 }[species] ?? 1;
  return Math.round((14 + level * 4) * [1, 1.3, 1.7][petStage(level)] * tough);
}

/** Gold to revive a fainted pet at the Pet Keeper. */
export function reviveCost(level) {
  return 18 + level * 6;
}

export function newPet(species, name) {
  const s = PET_SPECIES[species];
  return {
    id: `pet${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    species,
    name: s.fixedName ?? cleanPetName(name) ?? s.name,
    level: 1,
    xp: 0,
    hp: petMaxHp(species, 1),
    fainted: false,
  };
}

export function cleanPetName(name) {
  const n = String(name ?? '').replace(/[^\p{L}\p{N} '-]/gu, '').trim().slice(0, 16);
  return n || null;
}
