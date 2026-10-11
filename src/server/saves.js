// World saves live in the HOST's browser (localStorage). Export/import moves
// a world between computers. Only the host needs a save; guests just bring
// their profile (name + class) and the host remembers their progress.

import { SAVE_VERSION, CLASSES } from '../shared/config.js';
import { freshStats, maxHpFor } from '../shared/progression.js';
import { PET_SPECIES, newPet, petMaxHp } from '../shared/pets.js';
import { DUNGEONS } from '../shared/dungeons.js';

const INDEX_KEY = 'fdg.saves';
const SLOT_KEY = (id) => `fdg.save.${id}`;

export function newSave({ name, seed }) {
  return {
    version: SAVE_VERSION,
    id: `w${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    name: name || 'Our World',
    seed: String(seed),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    day: 1,
    flags: {},                     // e.g. { mineCleared: true }
    // per dungeon: deepest floor reached (elevator stops), unlocked (chains broken), completed (floor-100 boss)
    dungeons: Object.fromEntries(Object.entries(DUNGEONS).map(([id, d]) => [id, { deepest: 0, unlocked: !d.unlockedBy, completed: false }])),
    players: {},                   // playerId -> player record (see newPlayerRecord)
    house: {
      level: 1,
      storage: {},                 // the family chest: { item: count }
      beds: {},                    // playerId -> bed slot in the fort
      furniture: [],               // placed furniture: [{ id, item, x, z, rot }]
      owned: {},                   // furniture bought but not placed yet: { item: count }
      wall: 'stone',
      floor: 'oak',
    },
  };
}

export function newPlayerRecord({ name, cls }) {
  const c = CLASSES[cls] ?? CLASSES.Knight;
  const stats = freshStats(cls);
  return {
    name,
    cls: CLASSES[cls] ? cls : 'Knight',
    level: 1,
    xp: 0,
    points: 0,                     // unspent skill points
    stats,                         // { str, dex, int, vit } — the class only picks the starting ones
    hp: maxHpFor(1, stats),
    maxHp: maxHpFor(1, stats),
    gold: 50,                      // everyone has their own purse
    weapon: c.weapon,
    gear: [c.weapon],              // every weapon/shield you own; `weapon`/`shield` are the equipped ones
    blueprints: [],                // forge recipes you've found
    inventory: { potion: 2 },
    shield: null,
    armor: null,
    closet: [],                    // bought styles, e.g. ['hat:crown', 'dye:sky']
    pets: [],                      // owned pets: [{ id, species, name, level, xp }]
    pet: null,                     // id of the one following you around
    look: { hat: 'own', cape: 'own', back: 'none', dye: 'none' },
  };
}

/**
 * Player fields that live in the save: copied into the live player when they join and back
 * (GameServer.writeRecord) when the world saves. A new saved field goes here, in newPlayerRecord,
 * and in a migration that fills it in for old saves.
 */
export const PLAYER_FIELDS = ['name', 'cls', 'look', 'level', 'xp', 'points', 'stats', 'hp', 'maxHp', 'gold',
  'weapon', 'shield', 'armor', 'gear', 'blueprints', 'inventory', 'closet', 'pets', 'pet'];

/**
 * Save upgrades, oldest first. Each step brings a save up to `version`.
 * NEVER edit a step that has shipped: add a new one at the end and bump SAVE_VERSION to match.
 * A step runs once, on saves older than its version (unless it says `always: true`).
 * test/saves.test.js loads every file in test/fixtures/ through these, so add a fixture of the
 * current format before changing it (see docs/SAVES.md).
 */
export const MIGRATIONS = [
  {
    version: 5, // everything up to the first release: shields, closet, pets with levels + health, skills, gear bag
    always: true, // these were added without version bumps, so tidy every save with them (safe: only fills gaps)
    up(save) {
      for (const id of Object.keys(DUNGEONS)) save.dungeons[id] ??= { deepest: 0 };
      save.house ??= { level: 1, storage: {} };
      save.house.storage ??= {};
      for (const rec of Object.values(save.players ?? {})) {
        rec.shield ??= null;
        rec.closet ??= [];
        rec.pets ??= [];
        rec.pet ??= null;
        // pets were just species names; now each one levels up on its own
        if (rec.pets.some((x) => typeof x === 'string')) {
          const active = rec.pet;
          rec.pets = rec.pets.filter((x) => typeof x !== 'string' || PET_SPECIES[x]).map((x) => (typeof x === 'string' ? newPet(x) : x));
          rec.pet = rec.pets.find((x) => x.species === active)?.id ?? null;
        }
        for (const pet of rec.pets) { // pets have health (and can faint)
          pet.hp ??= petMaxHp(pet.species, pet.level);
          pet.fainted ??= false;
        }
        if (rec.cls === 'Ranger' && rec.weapon === 'dagger') rec.weapon = 'bow'; // Rangers shoot now
        rec.level ??= 1;
        rec.xp ??= 0;
        rec.points ??= 0;
        rec.stats ??= freshStats(rec.cls);
        rec.gear ??= [rec.weapon, rec.shield].filter(Boolean);
        rec.blueprints ??= [];
        rec.maxHp = maxHpFor(rec.level, rec.stats);
        rec.hp = Math.min(rec.hp ?? rec.maxHp, rec.maxHp);
      }
    },
  },
  {
    version: 6, // gold is per player now: the old family purse is split evenly; armor slot
    up(save) {
      const players = Object.values(save.players ?? {});
      const share = players.length ? Math.floor((save.gold ?? 0) / players.length) : 0;
      for (const rec of players) {
        rec.gold ??= share;
        rec.armor ??= null;
        delete rec.location; // never used
      }
      delete save.gold;
    },
  },
  {
    version: 7, // a bed per family member; decorating the fort (furniture, wall and floor styles)
    up(save) {
      const h = save.house;
      h.beds ??= {};
      Object.keys(save.players).forEach((id, i) => { h.beds[id] ??= i; });
      h.furniture ??= [];
      h.owned ??= {};
      h.wall ??= 'stone';
      h.floor ??= 'oak';
    },
  },
  {
    version: 8, // dungeons are 100 floors; each one's chains break when the one before is completed
    up(save) {
      for (const [id, d] of Object.entries(DUNGEONS)) {
        const s = (save.dungeons[id] ??= { deepest: 0 });
        s.completed ??= false;
        // the Ruins used to open after the King Slime: anyone who had them open keeps them open
        s.unlocked ??= !d.unlockedBy || (id === 'ruins' && !!save.flags?.mineCleared);
      }
    },
  },
];

if (MIGRATIONS.at(-1).version !== SAVE_VERSION) throw new Error('SAVE_VERSION must equal the last migration\'s version');

/** Bring any older save up to date. Throws on things that aren't saves, or saves from a newer game. */
export function migrate(save) {
  if (!save || typeof save !== 'object' || !save.players || !save.seed) throw new Error('Not a save file');
  if (save.version > SAVE_VERSION) throw new Error('This save is from a newer version of the game — update the game first');
  for (const step of MIGRATIONS) {
    if ((save.version ?? 0) < step.version || step.always) step.up(save);
    save.version = Math.max(save.version ?? 0, step.version);
  }
  return save;
}

export class SaveStore {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
  }

  list() {
    const ids = JSON.parse(this.storage.getItem(INDEX_KEY) || '[]');
    return ids
      .map((id) => {
        try {
          const s = JSON.parse(this.storage.getItem(SLOT_KEY(id)));
          return { id, name: s.name, day: s.day, updatedAt: s.updatedAt, players: Object.values(s.players).map((p) => p.name) };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  load(id) {
    const raw = this.storage.getItem(SLOT_KEY(id));
    if (!raw) throw new Error('Save not found');
    return migrate(JSON.parse(raw));
  }

  write(save) {
    save.updatedAt = Date.now();
    this.storage.setItem(SLOT_KEY(save.id), JSON.stringify(save));
    const ids = JSON.parse(this.storage.getItem(INDEX_KEY) || '[]');
    if (!ids.includes(save.id)) this.storage.setItem(INDEX_KEY, JSON.stringify([...ids, save.id]));
  }

  remove(id) {
    this.storage.removeItem(SLOT_KEY(id));
    const ids = JSON.parse(this.storage.getItem(INDEX_KEY) || '[]').filter((x) => x !== id);
    this.storage.setItem(INDEX_KEY, JSON.stringify(ids));
  }

  /** Import a save from exported JSON text. Gets a fresh slot if the id already exists. */
  import(text) {
    const save = migrate(JSON.parse(text));
    if (this.storage.getItem(SLOT_KEY(save.id))) save.id += '-imported';
    this.write(save);
    return save;
  }
}
