// Weapon enchanting at the Enchanter (a shady figure in the far corner of Pebble Town).
// Each weapon you own can be enchanted up to ENCHANT_MAX levels; each level adds ENCHANT_BONUS of
// the weapon's own damage and changes how it looks (glow, size, sparkles, flames).
// The costs climb steeply and every level needs Arcane Essence, which only bosses drop for sure:
// enchanting is meant to be a long-term goal. Levels are saved per player: `enchants[weaponId]`.
import { ITEMS } from './items.js';

export const ENCHANT_MAX = 5;
export const ENCHANT_BONUS = 0.15;

/** Cost of each level (index 0 = getting to +1). `ore` = [item id, how many]. */
export const ENCHANT_COSTS = [
  { gold: 400, essence: 2, ore: ['silver', 15] },
  { gold: 1500, essence: 5, ore: ['goldore', 12] },
  { gold: 5000, essence: 9, ore: ['mythril', 10] },
  { gold: 14000, essence: 14, ore: ['obsidian', 10] },
  { gold: 35000, essence: 22, ore: ['starstone', 8] },
];

/**
 * How an enchanted weapon looks (index 0 = +1): `glow` = the colour it shines, `scale` = how much
 * bigger it gets, `sparkles` / `flame` = little floating lights or flickering flames along it.
 */
export const ENCHANT_LOOKS = [
  { name: 'Gleaming', glow: 0x7fd8ff, strength: 0.35, scale: 1.0 },
  { name: 'Empowered', glow: 0x5aa8ff, strength: 0.55, scale: 1.12 },
  { name: 'Arcane', glow: 0xb070ff, strength: 0.7, scale: 1.18, sparkles: 0xd8a8ff },
  { name: 'Blazing', glow: 0xff6a1a, strength: 0.8, scale: 1.24, flame: 0xff7a1a },
  { name: 'Celestial', glow: 0xffe27a, strength: 1.0, scale: 1.32, flame: 0xfff0a0, sparkles: 0xffffff },
];

/** What getting `weaponId` from `level` to `level + 1` costs, or null at the top / for non-weapons. */
export function enchantCost(weaponId, level = 0) {
  if (ITEMS[weaponId]?.kind !== 'weapon' || level >= ENCHANT_MAX) return null;
  return ENCHANT_COSTS[level];
}

/** Extra damage a weapon gets from its enchant level (at least +1 a level, even on a little dagger). */
export function enchantDamage(weaponId, level = 0) {
  const l = Math.max(0, Math.min(ENCHANT_MAX, level | 0));
  return Math.max(l, Math.round((ITEMS[weaponId]?.damage ?? 0) * ENCHANT_BONUS * l));
}

/** "Steel Blade" → "Blazing Steel Blade +4" */
export function enchantedName(weaponId, level = 0) {
  const name = ITEMS[weaponId]?.name ?? weaponId;
  return level > 0 ? `${ENCHANT_LOOKS[level - 1].name} ${name} +${level}` : name;
}
