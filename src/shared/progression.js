// Character levels, XP and skill points. Pure rules, shared by host and clients.
// A class only decides your starting points and starter weapon: anyone can use any
// weapon and put points anywhere.

import { PLAYER_BASE_HP } from './config.js';
import { ITEMS } from './items.js';
import { enchantDamage } from './enchant.js';

export const STATS = {
  str: { name: 'Strength', icon: '💪', about: 'Hit harder with swords, axes and daggers' },
  dex: { name: 'Dexterity', icon: '🏹', about: 'Hit harder with bows and crossbows' },
  int: { name: 'Magic', icon: '✨', about: 'Hit harder with staffs, wands and spellbooks' },
  vit: { name: 'Vitality', icon: '❤', about: '+3 max health per point' },
};

/** Starting points for each class (4 points each). */
export const CLASS_STATS = {
  Knight:       { str: 2, dex: 0, int: 0, vit: 2 },
  Barbarian:    { str: 3, dex: 0, int: 0, vit: 1 },
  Mage:         { str: 0, dex: 0, int: 3, vit: 1 },
  Ranger:       { str: 0, dex: 3, int: 0, vit: 1 },
  Rogue:        { str: 2, dex: 2, int: 0, vit: 0 },
  Rogue_Hooded: { str: 1, dex: 2, int: 1, vit: 0 },
};

export const POINTS_PER_LEVEL = 2;
export const MAX_LEVEL = 99;

/**
 * XP needed to go from `level` to the next one: a curve, so each level takes a bit more work than the last
 * (enemies give more XP the deeper you go, but not as fast as this climbs). Level 10 → 210, 30 → 890, 60 → 2660.
 */
export function xpToNext(level) {
  return Math.round(20 + level * 14 + level * level * 0.5);
}

export function maxHpFor(level, stats) {
  return PLAYER_BASE_HP + (level - 1) * 2 + (stats?.vit ?? 0) * 3;
}

/** Which stat powers a weapon. */
export function weaponStat(weaponId) {
  const r = ITEMS[weaponId]?.ranged;
  return r === 'arrow' ? 'dex' : r === 'magic' ? 'int' : 'str';
}

/** Damage of one hit: the weapon (plus its enchantment, if any) plus half the matching stat. */
export function attackDamage(weaponId, stats, enchant = 0) {
  const base = (ITEMS[weaponId]?.damage ?? 1) + enchantDamage(weaponId, enchant);
  return base + Math.floor((stats?.[weaponStat(weaponId)] ?? 0) / 2);
}

/** XP for things you defeat or break. */
export const XP = {
  rock: 1,
  barrel: 1,
  slime: (maxHp) => Math.max(2, Math.round(maxHp / 2)),
  boss: 150,
};

export function freshStats(cls) {
  return { ...(CLASS_STATS[cls] ?? CLASS_STATS.Knight) };
}
