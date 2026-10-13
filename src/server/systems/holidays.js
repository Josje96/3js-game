// holidays — two special days a year (shared/seasons.js holidayOf): Halloween halfway through
// autumn (everyone in costume, pumpkins all over town, and you can trick-or-treat at every cottage
// door, once per house) and Christmas halfway through winter (Santa visits the town square with a
// present for everyone; lights on every tree). Costumes, pumpkins and lights are client looks
// (LocationView / views.js); this file puts the doors and Santa in town and hands out the goodies.
import { CELL } from '../../shared/config.js';
import { holidayOf, SANTA_SPOT } from '../../shared/seasons.js';
import { ITEMS } from '../../shared/items.js';

const GIFTS = 'santaGifts';   // save.flags: { day, ids: [players who opened theirs] } (one present each per Christmas)
const TREATS = ['candycorn', 'candycorn', 'toffeeapple', 'pumpkinpie', 'cider'];
const PRESENTS = ['feast', 'megapotion', 'elixir', 'gingerbread', 'candycane'];

/** The town was loaded: put today's holiday things in it. */
export function onLocation(loc) {
  if (loc.key === 'town') this.syncHoliday(loc);
}

/** A new day: holiday things come and go (and everyone hears about it). */
export function tick() {
  if (this._holidayDay === this.save.day) return;
  const fresh = this._holidayDay != null;
  this._holidayDay = this.save.day;
  this.treated = new Set(); // who knocked where, today
  const town = this.locations.get('town');
  if (town) this.syncHoliday(town);
  if (fresh && holidayOf(this.save.day)) this.broadcast({ t: 'toast', big: true, text: HELLO[holidayOf(this.save.day)] });
}

export function onJoin(p) {
  const h = holidayOf(this.save.day);
  if (h) this.toast(p, HELLO[h]);
}

const HELLO = {
  halloween: '🎃 Happy Halloween! Everyone’s in costume — knock on the cottage doors in town to trick-or-treat!',
  christmas: '🎄 Merry Christmas! Santa is in the town square with a present for everyone (today only)!',
};

export const interactions = {
  /** Knock on a cottage door on Halloween: a treat (once per house each), or now and then a harmless trick and a treat. */
  treat(p, door) {
    if (holidayOf(this.save.day) !== 'halloween') return;
    const key = `${p.id}:${door.house}`;
    if (this.treated?.has(key)) return this.toast(p, 'You already knocked here! Try another house. 🏠');
    (this.treated ??= new Set()).add(key);
    const item = TREATS[Math.floor(Math.random() * TREATS.length)];
    p.inventory[item] = (p.inventory[item] ?? 0) + 1;
    const gold = 5 + Math.floor(Math.random() * 21);
    this.earn(p, gold);
    if (Math.random() < 0.25) {
      this.sendToLocation(p.loc, { t: 'fx', kind: 'boo', x: door.x, z: door.z });
      this.toast(p, `👻 BOO! A trick! ...just kidding — here’s ${ITEMS[item].name} and ${gold} gold.`);
    } else {
      this.sendToLocation(p.loc, { t: 'fx', kind: 'treat', x: door.x, z: door.z });
      this.toast(p, `🍬 Trick or treat! You got ${ITEMS[item].name} and ${gold} gold.`);
    }
    this.sendSelf(p);
  },

  /** Santa: one present each per Christmas — gold plus something special. */
  santa(p, santa) {
    if (holidayOf(this.save.day) !== 'christmas') return;
    const log = this.save.flags[GIFTS]?.day === this.save.day ? this.save.flags[GIFTS] : (this.save.flags[GIFTS] = { day: this.save.day, ids: [] });
    if (log.ids.includes(p.id)) return this.toast(p, '🎅 Ho ho ho! You’ve had your present — Merry Christmas!');
    log.ids.push(p.id);
    const item = PRESENTS[Math.floor(Math.random() * PRESENTS.length)];
    const gold = 150 + (p.level ?? 1) * 10;
    p.inventory[item] = (p.inventory[item] ?? 0) + 1;
    this.earn(p, gold);
    this.sendToLocation(p.loc, { t: 'fx', kind: 'present', x: santa.x, z: santa.z });
    this.toast(p, `🎁 Santa gives you a present: ${ITEMS[item].name} and ${gold} gold! Ho ho ho!`);
    this.sendSelf(p);
    this.persist();
  },
};

export const methods = {
  /** Make the town match the day: cottage doors to knock on at Halloween, Santa at Christmas. */
  syncHoliday(loc) {
    const h = holidayOf(this.save.day);
    for (const e of [...loc.entities.values()]) if (e.holiday && e.holiday !== h) loc.remove(e.id);
    if (h && [...loc.entities.values()].some((e) => e.holiday === h)) return; // already set up
    if (h === 'halloween') {
      const L = loc.layout;
      let house = 0;
      for (let cz = 0; cz < L.h; cz++) for (let cx = 0; cx < L.w; cx++) {
        if (L.cell(cx, cz) !== 'E' || L.cell(cx - 1, cz) === 'E' || L.cell(cx, cz - 1) === 'E') continue;
        if (L.isSolidCell(cx, cz + 2)) continue; // nowhere to stand on the doorstep
        // the cottage (client/town.js) fills this 2x2 block; its door is left of centre on the front
        loc.spawn({ type: 'door', holiday: h, house: house++, x: (cx + 1) * CELL - 1.14, z: (cz + 1) * CELL + 3.6, r: 1.0, interact: 'treat', prompt: 'Trick or treat! 🎃' });
      }
    } else if (h === 'christmas') {
      loc.spawn({
        type: 'npc', holiday: h, name: 'Santa', cls: 'Barbarian', wear: 'santa', decor: 'christmas',
        look: { hat: 'none', cape: 'none', face: 'beard', hairColor: 'white' },
        x: SANTA_SPOT.x, z: SANTA_SPOT.z, rot: 0, r: 0.8, interact: 'santa', prompt: 'Talk to Santa 🎅',
      });
    }
  },
};
