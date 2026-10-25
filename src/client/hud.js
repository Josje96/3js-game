// HTML overlay on top of the 3D canvas.
import { ITEMS, FORGE_RECIPES, SHOP_STOCK, SHOP_SECTIONS, SHOP_TIER_LEVELS, PET_SHOP_STOCK, shopTier, sellValue, isGear, PERKS, SMELT, SMELT_ORE } from '../shared/items.js';
import { STATS, attackDamage, weaponStat } from '../shared/progression.js';
import { CLASSES, HATS, CAPES, BACKS, DYES, CLOTHES, HAIRS, HAIR_COLORS, FACES, SKINS, STYLE_SLOTS, ownsStyle, BANK_OPEN_FEE, TIE_COLORS, BROWS, BANGS, BEARDS } from '../shared/config.js';
import { FURNITURE, WALL_STYLES, FLOOR_STYLES } from '../shared/furniture.js';
import { itemIcon, furnitureIcon, petIcon, iconImg } from './icons.js';
import { wallpaperSwatch } from './wallpaper.js';
import { PET_SPECIES, EVOLVE_AT, TIER_EVERY, TIER_LOOKS, petFormName, petStage, petTier, petDamage, petXpToNext, petMaxHp, reviveCost, TRAIN_TO, TRAIN_COST } from '../shared/pets.js';
import { seasonOf, holidayOf, dayOfSeason, daysToNextSeason, SEASONS, isBossDay, calendar, dateLabel, CALENDAR_NAME, salePrice, isSaleDay, seasonBossFor } from '../shared/seasons.js';
import { ENCHANT_LOOKS, enchantCost, enchantedName, enchantDamage } from '../shared/enchant.js';
import { seasonalPrice } from '../shared/seasonal.js';

/** The night screen's season line: which season it is, and whether its boss has come to town. */
function seasonLine(day) {
  const s = seasonOf(day);
  const newYear = calendar(day).day === 1 && day > 1 ? `🎉 Happy new year! ` : '';
  return isBossDay(day)
    ? `${newYear}${s.icon} ${s.name} begins! ${esc(seasonBossFor(day).name)} is in town — today only.`
    : `${s.icon} ${s.name}, day ${dayOfSeason(day)}`;
}

/** "12 days until Summer" (small print under the calendar) */
function nextSeasonLine(day) {
  const h = holidayOf(day);
  if (h) return { easter: '🐣 Happy Easter!', solstice: '☀️ Midsummer: the Solstice Arena!', halloween: '🎃 Happy Halloween!', christmas: '🎄 Merry Christmas!' }[h];
  const n = daysToNextSeason(day);
  const next = SEASONS[(SEASONS.indexOf(seasonOf(day)) + 1) % SEASONS.length];
  return n === 1 ? `${next.icon} ${next.name} starts tomorrow!` : `${n} days until ${next.name}`;
}

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const PET_ICONS = {
  maple: '🐶', mouse: '🐭', hamster: '🐹', snail: '🐌', chick: '🐤', frog: '🐸', bunny: '🐰', duck: '🦆', piglet: '🐷', bee: '🐝',
  hedgehog: '🦔', turtle: '🐢', penguin: '🐧', owl: '🦉', axolotl: '🦎', fox: '🦊', cat: '🐱', panda: '🐼', dragon: '🐲', unicorn: '🦄', snake: '🐍', fairy: '🧚', giraffe: '🦒',
};

export class Hud {
  constructor(root, { onModalChange } = {}) {
    this.root = root;
    this.onModalChange = onModalChange;
    root.innerHTML = '';
    this.status = el('div', 'hud-status panel');
    this.invite = el('div', 'hud-invite panel');
    this.inv = el('div', 'hud-inv panel');
    this.barHint = el('div', 'hud-bar-hint panel'); // choosing in the bar: what's picked, and the keys
    this.xp = el('div', 'hud-xp');
    this.promptEl = el('div', 'hud-prompt');
    this.cinemaEl = el('div', 'hud-cinema'); // a film playing: black bars top and bottom, a caption (cinema)
    this.cinemaEl.innerHTML = '<div class="bar top"></div><div class="bar bottom"><span></span><small>Esc to skip</small></div>';
    this.seasonSleepEl = el('button', 'hud-season-sleep primary'); // by your own bed: sleep through to the next season
    this.seasonSleepEl.addEventListener('click', () => this.onSeasonSleep?.());
    this.spell = el('div', 'hud-spell panel');
    this.toasts = el('div', 'hud-toasts');
    this.chatLog = el('div', 'hud-chat');
    this.chatInput = el('input', 'hud-chat-input');
    this.chatInput.placeholder = 'Say something… (Enter to send, Esc to cancel)';
    this.chatInput.maxLength = 120;
    this.floats = el('div', 'hud-floats');
    this.modal = el('div', 'modal-backdrop hidden');
    this.danger = el('div', 'hud-danger');
    this.help = el('div', 'hud-help', 'WASD move · Space/click attack · Shift roll · J jump · V fly (jetpack) · E interact · Q potion · G feed pet · R area spell · Tab item bar · C character · P pets · Enter chat · M music · Esc menu');
    root.append(this.cinemaEl, this.danger, this.status, this.invite, this.xp, this.inv, this.barHint, this.promptEl, this.seasonSleepEl, this.spell, this.toasts, this.chatLog, this.chatInput, this.floats, this.modal, this.help);
    this.self = null;
    this.world = null;
    this.locTitle = '';
    this.refreshModal = null;
    this.modal.addEventListener('mousedown', (e) => { if (e.target === this.modal) this.closeModal(); });
  }

  // ---------------------------------------------------------------- status

  /** The night screen: a moonlit card with the new day's number, shown for a few seconds. */
  nightScreen({ day, reason, fainted = [], days = 1 }) {
    this.nightEl?.remove();
    const lines = reason === 'sleep'
      ? [days > 1 ? `Everyone snuggled into bed… and slept right through until ${seasonOf(day).icon} ${seasonOf(day).name}! (${days} days)` : 'Everyone snuggled into bed…']
      : ['Night fell!', ...fainted.map((f) => `${f.name} was out after dark and fainted${f.lost ? ` (dropped ${f.lost} gold)` : ''}.`)];
    const n = el('div', 'night-screen', `
      <div class="night-sky"></div>
      <div class="night-card">
        <div class="moon">🌙</div>
        <div class="night-year">Year ${calendar(day).year} of ${CALENDAR_NAME}</div>
        <div class="night-day">Day ${calendar(day).day}</div>
        <p class="night-season">${seasonLine(day)}</p>
        ${lines.map((t) => `<p>${esc(t)}</p>`).join('')}
        <p class="muted">Game saved. The dungeons have shifted overnight.</p>
      </div>`);
    const sky = n.querySelector('.night-sky');
    for (let i = 0; i < 60; i++) { // twinkling stars
      const s = el('i');
      s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 70}%;animation-delay:${Math.random() * 2}s;transform:scale(${0.5 + Math.random()})`;
      sky.append(s);
    }
    this.root.append(n);
    this.nightEl = n;
    setTimeout(() => n.classList.add('fade'), 3200);
    setTimeout(() => n.remove(), 4000);
  }

  /** A minute / 30 seconds before nightfall: the clock flashes. */
  nightWarning() {
    this.status.classList.remove('warn');
    void this.status.offsetWidth; // restart the animation
    this.status.classList.add('warn');
  }

  /** A red pulse around the screen edges when you're nearly out of health. */
  setDanger(frac) {
    this.danger.classList.toggle('on', frac > 0 && frac <= 0.3);
  }

  setSelf(self) { this.self = self; this.luckEnd = self.luck ? performance.now() / 1000 + self.luck : 0; this.renderStatus(); this.renderInv(); this.refreshModal?.(); }
  setWorld(world) { this.world = world; this.renderStatus(); this.refreshModal?.(); }
  /** The first day of a season is half price in every shop (shared/seasons.js salePrice). */
  onSale() { return isSaleDay(this.world?.day ?? 0); }
  sale(price) { return salePrice(price, this.world?.day ?? 0); }
  priceTag(price) { return this.onSale() ? `<s class="was">${price}</s> ${this.sale(price)}` : `${price}`; }
  setLocation(title) { this.locTitle = title; this.renderStatus(); }

  renderStatus() {
    const s = this.self, w = this.world;
    const hp = s ? `${s.hp}/${s.maxHp}` : '';
    const frac = s ? (s.hp / s.maxHp) * 100 : 100;
    this.renderXp();
    // your pet's health, right under yours
    const pet = s?.pets?.find((x) => x.id === s?.pet);
    let petRow = '';
    if (pet) {
      const max = petMaxHp(pet.species, pet.level), pf = pet.fainted ? 0 : (pet.hp / max) * 100;
      petRow = `<div class="pethp${pet.fainted ? ' fainted' : ''}"><div style="width:${pf}%"></div>
        <span>${PET_ICONS[pet.species] ?? (PET_SPECIES[pet.species]?.mini ? '👑' : '🐾')} ${esc(pet.name)} · Lv ${pet.level} · ${pet.fainted ? 'fainted' : `${pet.hp}/${max}`}</span></div>`;
    }
    this.status.innerHTML = `
      <div class="loc">${esc(this.locTitle)}</div>
      <div class="hpbar"><div style="width:${frac}%"></div><span>❤ ${hp}</span></div>${petRow}
      <div class="row"><span class="gold">🪙 ${s?.gold ?? 0}${s?.bank != null ? ` <small class="bank" title="In the bank (safe)">🏦 ${s.bank}</small>` : ''}</span><span title="Counted by ${CALENDAR_NAME}: 120 days a year, 30 a season">${dateLabel(w?.day ?? 1)}</span></div>
      <div class="row day-clock${(w?.dayLeft ?? 999) <= 60 ? ' soon' : ''}"><span>${(w?.dayLeft ?? 999) <= 60 ? '🌙 Get home! Night in' : '🌅 Night in'} ${clock(w?.dayLeft ?? 0)}</span><span title="Day ${dayOfSeason(w?.day ?? 1)} of ${seasonOf(w?.day ?? 1).name}">${seasonOf(w?.day ?? 1).icon} ${seasonOf(w?.day ?? 1).name}</span></div>
      <div class="row next-season"><small>${nextSeasonLine(w?.day ?? 1)}</small></div>${this.luckLeft() > 0 ? `<div class="row luck"><span title="From the healing spring: more gold, lucky hits, better drops">🍀 Lucky ${clock(this.luckLeft())}</span></div>` : ''}`;
  }

  /** Seconds of the healing spring's luck left. */
  luckLeft() {
    return Math.max(0, Math.ceil((this.luckEnd ?? 0) - performance.now() / 1000));
  }

  /** The level-up bar: a wide XP bar above the item bar with your level in the middle. */
  renderXp() {
    const s = this.self;
    if (!s) return;
    const frac = Math.min(100, (s.xp / s.xpNext) * 100);
    const points = s.points ? `<span class="points">+${s.points} skill point${s.points > 1 ? 's' : ''} · press C</span>` : '';
    this.xp.innerHTML = `
      <div class="xp-track"><div class="xp-fill" style="width:${frac}%"></div>
        <span class="xp-level">Level ${s.level}</span><span class="xp-num">${s.xp} / ${s.xpNext} XP</span></div>${points}`;
  }

  renderInv() {
    const s = this.self;
    if (!s) return;
    // what you're holding, then what the keys use (with the key on it), then the rest of your bag
    const weapon = ITEMS[s.weapon], shield = ITEMS[s.shield], armor = ITEMS[s.armor], helmet = ITEMS[s.helmet];
    const inv = Object.entries(s.inventory ?? {}).filter(([id, n]) => n > 0 && ITEMS[id]);
    const slot = (cls, text, title = '') => `<span class="slot ${cls}" title="${esc(title)}">${text}</span>`;
    const heals = inv.filter(([id]) => ITEMS[id].heal), treats = inv.filter(([id]) => ITEMS[id].petHeal);
    const gifts = inv.filter(([id]) => ITEMS[id].kind === 'gift');
    const loot = inv.filter(([id]) => !ITEMS[id].heal && !ITEMS[id].petHeal && ITEMS[id].kind !== 'gift');
    // everything you can pick in the bar (Tab / click, then ←/→ and Enter), in the order it's drawn
    const picks = this.barPicks = [];
    const pick = (kind, id, html) => { picks.push({ kind, id }); return html.replace('<span class="slot', `<span data-pick="${picks.length - 1}" class="slot`).replace('<button class="slot', `<button data-pick="${picks.length - 1}" class="slot`); };
    const groupPicks = (key, label, ids, kind) => (ids.length
      ? `<span class="slot-group" title="${esc(`${key}: ${label}`)}"><kbd>${key}</kbd>${ids.map(([id, n]) => pick(kind, id, slot('use', `${iconImg(itemIcon(id))}×${n}`, `${ITEMS[id].name}: ${itemStat(ITEMS[id])}`))).join('')}</span>` : '');
    this.inv.innerHTML = [
      pick('weapon', s.weapon, slot('weapon', `${iconImg(itemIcon(s.weapon))}${esc(weapon?.name ?? s.weapon)}${s.enchants?.[s.weapon] ? ` <b class="ench">+${s.enchants[s.weapon]}</b>` : ''} <b>${(weapon?.damage ?? 1) + enchantDamage(s.weapon, s.enchants?.[s.weapon])}</b>`, 'Your weapon (C to change)')),
      shield ? pick('gear', s.shield, slot('weapon', iconImg(itemIcon(s.shield)) || '🛡', `${shield.name}: ${itemStat(shield)}`)) : '',
      armor ? pick('gear', s.armor, slot('weapon', iconImg(itemIcon(s.armor)) || '🥋', `${armor.name}: ${itemStat(armor)}`)) : '',
      helmet ? pick('gear', s.helmet, slot('weapon', iconImg(itemIcon(s.helmet)) || '⛑', `${helmet.name}: ${itemStat(helmet)}`)) : '',
      groupPicks('Q', 'eat / drink', heals, 'heal'),
      groupPicks('G', 'feed pet', treats, 'treat'),
      // choosing: the bag opens out into its things; otherwise it's one 🎒 slot
      this.barMode
        ? loot.map(([id, n]) => pick('loot', id, slot('bag', `${iconImg(itemIcon(id))}×${n}`, ITEMS[id].name))).join('')
        : loot.length ? pick('bag', null, slot('bag', `🎒 ${loot.reduce((a, [, n]) => a + n, 0)}`, loot.map(([id, n]) => `${ITEMS[id].name} ×${n}`).join('\n'))) : '',
      gifts.length ? pick('gift', gifts[0][0], `<button class="slot gift" title="Presents: open or give">🎁 ×${gifts.reduce((a, [, n]) => a + n, 0)}</button>`) : '',
    ].join('');
    if (this.barMode) {
      this.barSel = Math.max(0, Math.min(this.barSel ?? 0, picks.length - 1));
      const sel = picks[this.barSel];
      this.inv.querySelector(`[data-pick="${this.barSel}"]`)?.classList.add('picked');
      const name = sel?.kind === 'bag' ? 'Your bag' : ITEMS[sel?.id]?.name ?? '';
      const what = { weapon: 'Enter: change weapon', gear: 'Enter: change gear', heal: 'Enter: eat / drink', treat: 'Enter: feed your pet', gift: 'Enter: open or give', loot: 'sell it at the shop', bag: '' }[sel?.kind] ?? '';
      this.barHint.innerHTML = `<b>${esc(name)}</b> ${esc(what)} <span class="muted">· ←/→ choose · Esc done</span>`;
    }
    this.barHint.style.display = this.barMode ? 'block' : 'none';
    this.inv.classList.toggle('choosing', !!this.barMode);
    // the mouse: click a slot to pick it, click it again to use it
    for (const e of this.inv.querySelectorAll('[data-pick]')) {
      e.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const i = Number(e.dataset.pick);
        if (picks[i]?.kind === 'gift') return this.onPresents?.(); // (presents always open on a click)
        if (this.barMode && this.barSel === i) return this.useBar();
        this.setBarMode(true);
        this.barSel = i;
        this.renderInv();
      });
    }
  }

  /** Choosing in the item bar (Tab / clicking it): ←/→ move, Enter uses (see GameClient onBarUse). */
  setBarMode(on) {
    if (!!this.barMode === on) return;
    this.barMode = on;
    this.onBarMode?.(on);
    if (on && this.barSel == null) this.barSel = Math.max(0, (this.barPicks ?? []).findIndex((x) => x.kind === 'heal'));
    this.renderInv();
  }

  moveBar(d) {
    const n = this.barPicks?.length ?? 0;
    if (!n) return;
    this.barSel = ((this.barSel ?? 0) + d + n) % n;
    this.renderInv();
  }

  useBar() {
    const sel = this.barPicks?.[this.barSel ?? 0];
    if (!sel) return;
    if (sel.kind === 'loot') return this.toast(`${ITEMS[sel.id].name}: sell it at the shop (or the Blacksmith uses ore for forging).`);
    if (sel.kind === 'bag') return this.setBarMode(true);
    this.onBarUse?.(sel);
  }

  setInvite({ code, status, isHost }) {
    this.inviteState = { code, status, isHost };
    this.renderInvite();
  }

  setRoster(players) {
    this.roster = players;
    this.renderInvite();
  }

  renderInvite() {
    const st = this.inviteState ?? {};
    const people = (this.roster ?? []).map((p) => `<li>${esc(p.name)} <small>${esc(prettyLoc(p.loc))}</small></li>`).join('');
    let head = '';
    if (st.isHost && st.code) {
      head = `<div>Invite code: <b class="code">${esc(st.code)}</b> <button class="small" data-copy>Copy link</button></div>`;
    } else if (st.status) {
      head = `<div class="muted">${esc(st.status)}</div>`;
    }
    this.invite.innerHTML = `${head}<ul>${people}</ul>`;
    this.invite.querySelector('[data-copy]')?.addEventListener('click', () => {
      const link = `${location.origin}${location.pathname}?join=${st.code}`;
      // navigator.clipboard is missing on plain http LAN addresses — show the link instead
      if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => this.toast('Invite link copied!'), () => this.toast(link));
      else this.toast(link);
    });
  }

  /** The area spell's status: counts down, then says it's ready. */
  setSpell(left, total = 60) {
    const ready = left <= 0;
    const text = ready ? '✨<br>R' : `${Math.ceil(left)}s`;
    if (this.spellText !== text) { this.spellText = text; this.spell.innerHTML = `<span>${text}</span>`; this.spell.title = 'Area spell (R): hits every enemy around you'; }
    this.spell.style.setProperty('--ready', ready ? 1 : Math.max(0, 1 - left / total).toFixed(3));
    this.spell.classList.toggle('ready', ready);
  }

  /** A calendar by a bed: the date, and asking everyone to sleep until the next season. */
  openCalendar({ day, season, days, onAsk }) {
    this.openModal((box) => {
      const now = seasonOf(day);
      box.append(el('h2', null, `📅 ${esc(dateLabel(day))}`), el('p', 'muted', `It’s ${now.icon} ${now.name}. ${esc(season)} starts in ${days} day${days === 1 ? '' : 's'}.`));
      const ask = el('button', 'primary', `💤 Sleep until ${esc(season)}`);
      ask.addEventListener('click', () => { onAsk(); this.closeModal(); });
      const no = el('button', '', 'Not now');
      no.addEventListener('click', () => this.closeModal());
      box.append(el('p', null, 'Everyone playing has to say yes. Then the whole family sleeps right through to the first morning of the new season.'), ask, no);
    });
  }

  /** Someone asked to sleep until the next season: yes or no (one no is enough to stop it). */
  openSeasonVote({ by, season, days, onAnswer }) {
    this.openModal((box) => {
      box.append(el('h2', null, `💤 Sleep until ${esc(season)}?`), el('p', null, `${esc(by)} wants everyone to sleep for ${days} day${days === 1 ? '' : 's'}, until the first morning of ${esc(season)}.`));
      for (const [yes, label] of [[true, 'Yes, sleep!'], [false, 'No thanks']]) {
        const b = el('button', yes ? 'primary' : '', label);
        b.addEventListener('click', () => { onAnswer(yes); this.seasonVoteOpen = false; this.closeModal(); });
        box.append(b);
      }
    }, { onClose: () => { this.seasonVoteOpen = false; } });
    this.seasonVoteOpen = true;
  }

  /** Cinema bars for a little film, with a caption (null: the film is over). */
  cinema(text) {
    this.cinemaEl.classList.toggle('on', text != null);
    if (text != null) this.cinemaEl.querySelector('span').textContent = text;
  }

  /** The "sleep until next season" button (null hides it). */
  seasonSleep(day, onClick) {
    this.onSeasonSleep = onClick;
    const show = day != null;
    if (show) {
      const next = SEASONS[(SEASONS.indexOf(seasonOf(day)) + 1) % SEASONS.length], n = daysToNextSeason(day);
      const text = `💤 Sleep until ${next.icon} ${next.name} (${n} day${n === 1 ? '' : 's'})`;
      if (this.seasonSleepEl.textContent !== text) this.seasonSleepEl.textContent = text;
    }
    this.seasonSleepEl.style.display = show ? 'block' : 'none';
  }

  prompt(text) {
    this.promptEl.textContent = text ? `[E] ${text}` : '';
    this.promptEl.style.display = text ? 'block' : 'none';
  }

  toast(text, big = false) {
    const t = el('div', `toast${big ? ' big' : ''}`, esc(text));
    this.toasts.append(t);
    setTimeout(() => t.classList.add('fade'), big ? 5000 : 3000);
    setTimeout(() => t.remove(), big ? 5600 : 3600);
  }

  chat(from, text) {
    const line = el('div', 'line', `<b>${esc(from)}:</b> ${esc(text)}`);
    this.chatLog.append(line);
    while (this.chatLog.children.length > 8) this.chatLog.firstChild.remove();
    setTimeout(() => line.classList.add('fade'), 12000);
  }

  /** Opens the chat box; resolves with the text (or null). */
  openChat() {
    return new Promise((resolve) => {
      const input = this.chatInput;
      input.style.display = 'block';
      input.value = '';
      input.focus();
      const done = (val) => {
        input.removeEventListener('keydown', onKey);
        input.style.display = 'none';
        input.blur();
        resolve(val);
      };
      const onKey = (e) => {
        if (e.key === 'Enter') done(input.value.trim() || null);
        if (e.key === 'Escape') done(null);
        e.stopPropagation();
      };
      input.addEventListener('keydown', onKey);
    });
  }

  /** Damage numbers etc., positioned in screen pixels. */
  float(text, x, y, color = '#fff') {
    const f = el('div', 'float', esc(text));
    f.style.left = `${x}px`;
    f.style.top = `${y}px`;
    f.style.color = color;
    this.floats.append(f);
    setTimeout(() => f.remove(), 900);
  }

  // ---------------------------------------------------------------- modals

  get modalOpen() { return !this.modal.classList.contains('hidden'); }

  /**
   * Ask before spending gold: shows "Buy X for N gold?" at the bottom of the open window.
   * The window re-renders often (gold changes...), so the question lives on the Hud.
   */
  /**
   * Ask before buying. `preview` = a sneak peek: { img } (a picture, shown big next to the
   * question) and/or { tryOn: { slot, id } } (clothes, or slot 'gear': a weapon, shield, armor or helmet,
   * put on your character to see).
   */
  askToBuy(label, price, run, preview = null) {
    this.endTryOn();
    this.pendingBuy = { label, price, run, preview };
    if (preview?.tryOn) {
      this.tryOn?.(preview.tryOn.slot, preview.tryOn.id); // GameClient dresses you up and zooms in
      this.modal.classList.add('side');                    // ...and the shop steps aside so you can see
    }
    this.refreshModal?.();
  }

  /** Take off whatever we were trying on in a shop. */
  endTryOn() {
    if (!this.pendingBuy?.preview?.tryOn) return;
    this.untryOn?.();
    this.modal.classList.remove('side');
  }

  /** The feast table: buy food? */
  openFeast({ price, heal, onYes }) {
    this.openModal((box) => {
      box.append(el('h2', null, '🍗 The Feast Table'), el('p', null, `Would you like to buy food for <span class="gold">🪙 ${price}</span>? It heals half your health (+${heal}).`));
      const row = el('div', 'sleep-days');
      const yes = el('button', 'primary', 'Yes please!');
      yes.disabled = (this.self?.gold ?? 0) < price;
      yes.addEventListener('click', () => { this.closeModal(); onYes(); });
      const no = el('button', '', 'No thanks');
      no.addEventListener('click', () => this.closeModal());
      row.append(yes, no);
      box.append(row);
      setTimeout(() => yes.focus(), 0);
    });
  }

  /** Turn buttons: spin your character round to see the back while dressing or trying things on (GameClient onSpin). */
  spinButtons() {
    const row = el('div', 'spin-row');
    for (const [dir, label] of [[-1, '⟲ Turn'], [1, 'Turn ⟳']]) {
      const b = el('button', '', label);
      b.addEventListener('click', () => this.onSpin?.(dir));
      row.append(b);
    }
    return row;
  }

  askToSell(label, price, run) {
    this.pendingBuy = { label, price, run, sell: true };
    this.refreshModal?.();
  }

  confirmBar() {
    const q = this.pendingBuy;
    if (!q) return null;
    const verb = q.sell ? 'Sell' : q.label.startsWith('forge ') ? 'Pay to' : 'Buy';
    const peek = q.preview?.img ? `<span class="peek">${q.preview.img}</span>` : q.preview?.tryOn ? '<span class="peek-note">👀 Trying it on!</span>' : '';
    const bar = el('div', 'confirm-bar', `${peek}<span>${verb} <b>${esc(q.label)}</b> for <span class="gold">🪙 ${q.price}</span>?</span>`);
    const yes = el('button', 'primary', q.sell ? 'Sell it' : 'Buy it!');
    const no = el('button', '', 'Cancel');
    yes.disabled = !q.sell && (this.self?.gold ?? 0) < q.price;
    yes.addEventListener('click', () => { this.endTryOn(); this.pendingBuy = null; q.run(); this.refreshModal?.(); });
    no.addEventListener('click', () => { this.endTryOn(); this.pendingBuy = null; this.refreshModal?.(); });
    bar.append(yes, no);
    if (q.preview?.tryOn) bar.append(this.spinButtons());
    setTimeout(() => yes.focus(), 0);
    return bar;
  }

  openModal(render, { side = false, onClose = null } = {}) {
    this.pendingBuy = null;
    this.modal.classList.remove('hidden');
    this.modal.classList.toggle('side', side);
    this.onCloseModal = onClose;
    this.refreshModal = () => {
      // someone is typing in a box here (renaming a pet...): re-rendering would throw their typing
      // away (the world updates every second), so wait until they leave the box
      const typing = document.activeElement;
      if (typing && this.modal.contains(typing) && (typing.tagName === 'INPUT' || typing.tagName === 'TEXTAREA')) {
        this.modalStale = true;
        return;
      }
      this.modalStale = false;
      // re-rendering replaces every element, so remember how far each scrolling part was scrolled
      const old = this.modal.firstChild;
      const scrolls = old ? [old, ...old.querySelectorAll('[data-scroll]')].map((e) => [e.dataset.scroll ?? 'box', e.scrollTop]) : [];
      this.modal.innerHTML = '';
      const box = el('div', 'modal panel');
      render(box);
      const confirm = this.confirmBar();
      if (confirm) box.append(confirm);
      this.modal.append(box);
      for (const [key, top] of scrolls) {
        const e = key === 'box' ? box : box.querySelector(`[data-scroll="${key}"]`);
        if (e) e.scrollTop = top;
      }
    };
    this.refreshModal();
    this.modal.onfocusout = () => setTimeout(() => { if (this.modalStale) this.refreshModal?.(); }, 0);
    this.onModalChange?.(true);
  }

  closeModal() {
    if (!this.modalOpen || this.isFatal) return;
    this.endTryOn();
    this.pendingBuy = null;
    this.modal.classList.add('hidden');
    this.modal.innerHTML = '';
    this.onCloseModal?.();
    this.onCloseModal = null;
    this.refreshModal = null;
    this.onModalChange?.(false);
  }

  /** The town shop: a tab per section, Fashion, and Sell. Better gear unlocks every 20 levels. */
  /**
   * A shop counter. `vendor` 'shop' = the Shopkeeper (food & potions, fashion, selling); 'smith' =
   * the Blacksmith (weapons, shields, armor, and forging from blueprints).
   */
  openShop({ vendor = 'shop', onBuy, onSell, onBuyStyle, onForge, onSmelt }) {
    const smith = vendor === 'smith';
    this.shopTabs ??= { shop: 'food', smith: 'weapons' };
    this.openModal((box) => {
      const gold = this.self?.gold ?? 0, level = this.self?.level ?? 1, tier = shopTier(level);
      const tab = this.shopTabs[vendor];
      box.append(el('h2', null, `${smith ? '⚒ The Blacksmith' : 'Pebble Town Shop'} <span class="gold">🪙 ${gold}</span>`));
      if (smith) box.append(el('p', 'muted', '“Buy what’s on the rack, or bring me a blueprint and ore — forged steel is tougher, and each piece has a trick of its own.”'));
      const tabs = el('div', 'tabs');
      const list = smith
        ? [...SHOP_SECTIONS.filter((sec) => sec.id !== 'food').map((sec) => [sec.id, `${sec.icon} ${sec.name}`]), ['forge', '⚒ Forge'], ['smelt', '🔥 Smelt']]
        : [['food', '🍎 Food & potions'], ['fashion', '👑 Fashion'], ['sell', '💰 Sell']];
      for (const [id, label] of list) {
        const t = el('button', tab === id ? 'selected' : '', label);
        t.addEventListener('click', () => { this.shopTabs[vendor] = id; this.refreshModal?.(); });
        tabs.append(t);
      }
      box.append(tabs);
      const body = el('div', 'shop-body');
      body.dataset.scroll = `shop-${tab}`;
      if (tab === 'fashion') body.append(this.fashionShop(gold, onBuyStyle));
      else if (tab === 'sell') body.append(this.sellList(onSell));
      else if (tab === 'forge') body.append(this.forgeList(onForge));
      else if (tab === 'smelt') body.append(this.smeltList(onSmelt));
      else {
        const sec = SHOP_SECTIONS.find((x) => x.id === tab);
        const items = SHOP_STOCK.filter((id) => sec.kinds.includes(ITEMS[id].kind)).sort((x, y) => ITEMS[x].tier - ITEMS[y].tier || ITEMS[x].price - ITEMS[y].price);
        let shownTier = -1;
        for (const id of items) {
          const it = ITEMS[id];
          if (it.tier > tier + 1) continue; // only tease the next tier
          if (it.tier !== shownTier) {
            shownTier = it.tier;
            body.append(el('h3', 'tier-head', it.tier > tier ? `🔒 Unlocks at level ${it.tier * SHOP_TIER_LEVELS}` : it.tier ? `Level ${it.tier * SHOP_TIER_LEVELS}+` : 'For everyone'));
          }
          const owned = isGear(id) && (this.self?.gear ?? []).includes(id);
          const locked = it.tier > tier;
          const row = el('button', `shop-row${locked ? ' locked' : ''}`, `<span>${iconImg(itemIcon(id))}${esc(it.name)} <small>${itemStat(it)}</small></span><span class="gold">${owned ? '✓' : locked ? '🔒' : this.priceTag(it.price)}</span>`);
          // gear can be tried on, like clothes (even before you can afford it: the Buy button waits for the gold)
          const wearable = isGear(id);
          row.disabled = locked || owned || (!wearable && gold < this.sale(it.price));
          row.addEventListener('click', () => this.askToBuy(it.name, this.sale(it.price), () => onBuy(id), wearable ? { tryOn: { slot: 'gear', id } } : { img: iconImg(itemIcon(id)) }));
          body.append(row);
        }
      }
      box.append(body, closeButton(this));
    });
  }

  /** The Sell tab: loot from your bag, and gear you aren't wearing. */
  sellList(onSell) {
    const wrap = el('div', 'sell-list');
    const s = this.self ?? {};
    const loot = Object.entries(s.inventory ?? {}).filter(([id, n]) => ITEMS[id]?.sell && n > 0);
    const spare = (s.gear ?? []).filter((id) => id !== s.weapon && id !== s.shield && id !== s.armor && id !== s.helmet);
    if (!loot.length && !spare.length) wrap.append(el('p', 'muted', 'Nothing to sell. Go mining!'));
    if (loot.length) {
      wrap.append(el('h3', null, 'Loot'));
      for (const [id, n] of loot) {
        const it = ITEMS[id];
        const row = el('button', 'shop-row', `<span>${iconImg(itemIcon(id))}${esc(it.name)} ×${n}</span><span class="gold">${sellValue(id)} each · ${sellValue(id) * n}</span>`);
        row.addEventListener('click', () => onSell(id, n));
        wrap.append(row);
      }
      if (loot.length > 1) {
        const all = el('button', 'primary', `Sell all loot (${loot.reduce((a, [id, n]) => a + sellValue(id) * n, 0)} gold)`);
        all.addEventListener('click', () => loot.forEach(([id, n]) => onSell(id, n)));
        wrap.append(all);
      }
    }
    if (spare.length) {
      wrap.append(el('h3', null, 'Spare gear'), el('p', 'muted', 'Things you have but aren’t using. (Take something off with C to sell it.)'));
      for (const id of spare) {
        const it = ITEMS[id];
        const row = el('button', 'shop-row', `<span>${iconImg(itemIcon(id))}${esc(it.name)} <small>${itemStat(it)}</small></span><span class="gold">${sellValue(id)}</span>`);
        row.addEventListener('click', () => this.askToSell(it.name, sellValue(id), () => onSell(id, 1)));
        wrap.append(row);
      }
    }
    return wrap;
  }

  /** The shop's fashion tab: everything with a price, grouped by slot. */
  fashionShop(gold, onBuyStyle) {
    const wrap = el('div', 'fashion');
    const titles = { clothes: 'Fancy clothes', hat: 'Hats', back: 'On your back', dye: 'Cape dyes' };
    for (const [slot, title] of Object.entries(titles)) {
      wrap.append(el('h3', null, title));
      const grid = el('div', 'fashion-grid');
      for (const [id, def] of Object.entries(STYLE_SLOTS[slot])) {
        if (!def.price || def.seasonal) continue; // seasonal outfits: the Seasonal Trader
        const owned = ownsStyle(this.self?.closet, slot, id);
        const swatch = def.color != null ? `<i class="swatch" style="background:#${def.color.toString(16).padStart(6, '0')}"></i>` : '';
        const b = el('button', 'shop-row', `<span>${swatch}${esc(def.name)}</span><span class="gold">${owned ? '✓' : this.priceTag(def.price)}</span>`);
        b.disabled = owned || gold < this.sale(def.price);
        b.addEventListener('click', () => this.askToBuy(def.name, this.sale(def.price), () => onBuyStyle(slot, id), { tryOn: { slot, id } }));
        grid.append(b);
      }
      wrap.append(grid);
    }
    wrap.append(el('p', 'muted', 'Bought things wait for you in the wardrobe at home.'));
    return wrap;
  }

  /** The mirror: hair, hair colour, face extras, skin. Free, change as often as you like. */
  openMirror({ look, onChange, onClose }) {
    const cur = { ...look };
    this.openModal((box) => {
      box.append(el('h2', null, 'Mirror, mirror'), el('p', 'muted', 'New hair? Funny glasses? Everyone sees it.'));
      const row = (title, options, slot, swatches = false) => {
        box.append(el('h3', null, title));
        const wrap = el('div', 'wardrobe-row');
        for (const [value, label, color] of options) {
          const sw = color != null ? `<i class="swatch" style="background:#${color.toString(16).padStart(6, '0')}"></i>` : '';
          const b = el('button', cur[slot] === value ? 'selected' : '', `${sw}${esc(label)}`);
          b.addEventListener('click', () => { cur[slot] = value; onChange({ ...cur }); this.refreshModal?.(); });
          wrap.append(b);
        }
        box.append(wrap);
      };
      const opts = (table, none) => [...(none ? [['none', none]] : []), ...Object.entries(table).map(([k, v]) => [k, v.name, v.color])];
      row('Hair', opts(HAIRS, 'Outfit’s own'), 'hair');
      row('Bangs', opts(BANGS, 'None'), 'bangs');
      row('Hair colour', opts(HAIR_COLORS), 'hairColor', true);
      row('Eyebrows', opts(BROWS), 'brows');
      // (an old look keeps its beard in the face slot: it shows as the facial hair, and picking one there clears it)
      cur.beard ??= 'own';
      if (BEARDS[cur.face]) { cur.beard = cur.beard && cur.beard !== 'own' ? cur.beard : cur.face; cur.face = 'none'; }
      row('Face', opts(Object.fromEntries(Object.entries(FACES).filter(([k]) => !BEARDS[k])), 'Nothing'), 'face');
      row('Facial hair', [['own', 'Outfit’s own'], ['none', 'Clean-shaven'], ...opts(BEARDS)], 'beard');
      row('Skin', opts(SKINS, 'Pale'), 'skin', true);
      box.append(el('p', 'muted', 'Tip: a new hairstyle replaces your outfit’s own hair. Hats sit on top, so pick "None" for your hat in the wardrobe to show it off.'));
      box.append(this.spinButtons());
      const done = el('button', 'primary close', 'Done (Esc)');
      done.addEventListener('click', () => this.closeModal());
      box.append(done);
    }, { side: true, onClose });
  }

  openWardrobe({ cls, look, onChange, onClose }) {
    let cur = { cls, look: { ...look } };
    this.openModal((box) => {
      box.append(el('h2', null, 'Wardrobe'), el('p', 'muted', 'Mix and match! Everyone sees your new look.'));
      const row = (title, options, isOn, set) => {
        box.append(el('h3', null, title));
        const wrap = el('div', 'wardrobe-row');
        for (const [value, label, locked] of options) {
          const b = el('button', isOn(value) ? 'selected' : locked ? 'locked' : '', esc(label));
          b.disabled = !!locked;
          if (locked) b.title = 'Buy this in the Pebble Town shop';
          b.addEventListener('click', () => { set(value); onChange(cur.cls, cur.look); this.refreshModal?.(); });
          wrap.append(b);
        }
        box.append(wrap);
      };
      const closet = this.self?.closet;
      const styles = (slot, table) => Object.entries(table).filter(([k, v]) => !v.seasonal || ownsStyle(closet, slot, k)).map(([k, v]) => {
        const locked = !ownsStyle(closet, slot, k);
        return [k, locked ? `🔒 ${v.name} · ${v.price}g` : v.name, locked];
      });
      row('Outfit', Object.keys(CLASSES).map((c) => [c, c.replace('_', ' ')]), (v) => v === cur.cls, (v) => { cur.cls = v; });
      row('Fancy clothes', [['none', 'Outfit’s own'], ...styles('clothes', CLOTHES)], (v) => v === (cur.look.clothes ?? 'none'), (v) => { cur.look.clothes = v; });
      if (['tie', 'bowtie'].includes(CLOTHES[cur.look.clothes]?.extra)) {
        row(CLOTHES[cur.look.clothes].extra === 'tie' ? 'Tie colour' : 'Bow tie colour', Object.entries(TIE_COLORS).map(([k, v]) => [k, v.name]), (v) => v === (cur.look.tie ?? 'red'), (v) => { cur.look.tie = v; });
      }
      row('Hat', [['own', 'Outfit’s own'], ['none', 'None'], ...styles('hat', HATS)], (v) => v === cur.look.hat, (v) => { cur.look.hat = v; });
      row('Cape', [['own', 'Outfit’s own'], ['none', 'None'], ...styles('cape', CAPES)], (v) => v === cur.look.cape, (v) => { cur.look.cape = v; });
      row('Cape colour', [['none', 'Natural'], ...styles('dye', DYES)], (v) => v === cur.look.dye, (v) => { cur.look.dye = v; });
      row('On your back', [['none', 'Nothing'], ...styles('back', BACKS)], (v) => v === cur.look.back, (v) => { cur.look.back = v; });
      box.append(this.spinButtons());
      const done = el('button', 'primary close', 'Done (Esc)');
      done.addEventListener('click', () => this.closeModal());
      box.append(done);
    }, { side: true, onClose });
  }

  /** C: level, skill points and the gear bag. */
  openSheet({ onSpend, onEquip }) {
    this.openModal((box) => {
      const s = this.self;
      if (!s) return;
      box.append(el('h2', null, `Level ${s.level} <small class="muted">${s.xp} / ${s.xpNext} XP</small>`));
      const xp = el('div', 'xpbar big', `<div style="width:${(s.xp / s.xpNext) * 100}%"></div>`);
      box.append(xp);
      box.append(el('h3', null, s.points ? `Skill points to spend: <span class="gold">${s.points}</span>` : 'Skills'));
      const stats = el('div', 'stat-list');
      for (const [id, def] of Object.entries(STATS)) {
        const row = el('div', 'stat-row', `<span class="stat-icon">${def.icon}</span><span><b>${def.name}</b> <span class="muted">${esc(def.about)}</span></span><span class="stat-val">${s.stats[id]}</span>`);
        const plus = el('button', 'small primary', '+');
        plus.disabled = !s.points;
        plus.addEventListener('click', () => onSpend(id));
        row.append(plus);
        stats.append(row);
      }
      box.append(stats);
      box.append(el('h3', null, 'Gear bag'), el('p', 'muted', 'Anyone can use anything! Damage = weapon + half the matching skill.'));
      const bag = el('div', 'fashion-grid');
      const order = { weapon: 0, shield: 1, armor: 2, helmet: 3 };
      const gear = [...(s.gear ?? [])].sort((a, b) => order[ITEMS[a].kind] - order[ITEMS[b].kind] || (ITEMS[a].damage ?? 0) - (ITEMS[b].damage ?? 0));
      for (const id of gear) {
        const it = ITEMS[id];
        const on = id === s.weapon || id === s.shield || id === s.armor || id === s.helmet;
        const stat = it.kind === 'weapon'
          ? `⚔ ${attackDamage(id, s.stats, s.enchants?.[id])} <small>${STATS[weaponStat(id)].icon}${it.ranged ? ' ranged' : ''}</small>`
          : itemStat(it);
        const b = el('button', `shop-row${on ? ' selected' : ''}`, `<span>${iconImg(itemIcon(id))}${esc(enchantedName(id, s.enchants?.[id]))}</span><span>${stat}</span>`);
        const removable = it.kind === 'shield' || it.kind === 'armor' || it.kind === 'helmet';
        b.addEventListener('click', () => (on && removable ? onEquip(null, it.kind) : onEquip(id)));
        b.title = on ? (removable ? 'Click to take it off' : 'Equipped') : 'Click to equip';
        bag.append(b);
      }
      box.append(bag, closeButton(this));
    });
  }

  /** The bank: open an account (once), put gold in or take it out, send gold to family. */
  openBank({ family, onAction }) {
    this.bankSend ??= { to: null, amount: '' };
    // (a remembered pick from an earlier visit only counts if they're still on the list)
    if (!family.some((f) => f.id === this.bankSend.to)) this.bankSend.to = family.length === 1 ? family[0].id : null;
    this.openModal((box) => {
      const s = this.self ?? {}, gold = s.gold ?? 0;
      box.append(el('h2', null, `The Bank <span class="gold">🪙 ${gold}</span>`));
      if (s.bank == null) {
        box.append(el('p', 'muted', `“Gold in your pocket can be dropped when you faint. Gold in my vault is <b>never</b> lost — and you can send it to your family.” Opening an account costs <b>${BANK_OPEN_FEE}</b> gold.`));
        const open = el('button', 'primary', `Open an account (${BANK_OPEN_FEE} gold)`);
        open.disabled = gold < BANK_OPEN_FEE;
        open.addEventListener('click', () => this.askToBuy('open a bank account', BANK_OPEN_FEE, () => onAction('open')));
        box.append(open, closeButton(this));
        return;
      }
      box.append(el('p', null, `In the vault: <b class="gold">🏦 ${s.bank}</b> — safe even if you faint.`));
      const amountRow = (label, max, action) => {
        const row = el('div', 'bank-row', `<b>${label}</b>`);
        for (const n of [100, 1000]) {
          const b = el('button', 'small', `${n}`);
          b.disabled = max < n;
          b.addEventListener('click', () => onAction(action, n));
          row.append(b);
        }
        const all = el('button', 'small primary', `All (${max})`);
        all.disabled = max <= 0;
        all.addEventListener('click', () => onAction(action, max));
        row.append(all);
        return row;
      };
      box.append(amountRow('Put in', gold, 'deposit'), amountRow('Take out', s.bank, 'withdraw'));
      if (!family.length) {
        box.append(el('p', 'muted small-note', 'You can send gold to family once they open a bank account too.'));
      } else {
        // who to send to: a button per person (a drop-down closed itself whenever the window refreshed)
        const people = el('div', 'bank-row bank-people', '<b>Send to</b>');
        const twins = (f) => family.filter((x) => x.name === f.name).length > 1; // two with one name: show levels
        for (const f of family) {
          const b = el('button', `small${f.id === this.bankSend.to ? ' selected' : ''}`, `${esc(f.name)}${twins(f) ? ` <span class="muted">Lv ${f.level}</span>` : ''}`);
          b.addEventListener('click', () => { this.bankSend.to = f.id; this.refreshModal?.(); });
          people.append(b);
        }
        box.append(people);
        const send = el('div', 'bank-row', '<b>Amount</b>');
        const amount = el('input', 'bank-amount');
        amount.type = 'number';
        amount.min = '1';
        amount.placeholder = 'gold';
        amount.value = this.bankSend.amount ?? '';
        amount.addEventListener('input', () => { this.bankSend.amount = amount.value; });
        amount.addEventListener('keydown', (e) => e.stopPropagation());
        const go = el('button', 'small primary', 'Send 💌');
        go.addEventListener('mousedown', (e) => e.preventDefault()); // keep the amount box focused until we've read it
        go.addEventListener('click', () => {
          const n = Math.floor(Number(amount.value));
          if (!this.bankSend.to) return this.toast('Who should we send it to? Pick a name.');
          if (!(n > 0)) return this.toast('How much gold should we send?');
          if (n > s.bank) return this.toast(`You only have ${s.bank} gold in the bank.`);
          onAction('send', n, this.bankSend.to);
          this.bankSend.amount = '';
          amount.blur();
        });
        const to = family.find((f) => f.id === this.bankSend.to);
        go.textContent = to ? `Send to ${to.name} 💌` : 'Send 💌';
        send.append(amount, go);
        box.append(send, el('p', 'muted small-note', 'Sending comes out of your bank and goes into theirs. Only family with a bank account are listed.'));
      }
      box.append(closeButton(this));
    });
  }

  /** The Seasonal Trader: this season's treats and decorations, a new set every few days. */
  openSeasonal({ season, set, items, daysLeft, onBuy }) {
    const names = { spring: '🌸 Spring', summer: '☀️ Summer', autumn: '🍂 Autumn', winter: '❄️ Winter' };
    this.openModal((box) => {
      const gold = this.self?.gold ?? 0;
      box.append(el('h2', null, `Seasonal Trader <span class="gold">🪙 ${gold}</span>`),
        el('p', 'muted', `${names[season]} specials — only while the season lasts! Stall ${set + 1} of 5: new things in <b>${daysLeft} day${daysLeft === 1 ? '' : 's'}</b>. Decorations go home to the fort (press B there).`));
      const body = el('div', 'shop-body');
      for (const { id, kind } of items) {
        const def = kind === 'item' ? ITEMS[id] : kind === 'clothes' ? CLOTHES[id] : FURNITURE[id];
        const price = this.sale(seasonalPrice(def)), full = seasonalPrice(def), owned = kind === 'clothes' && (this.self?.closet ?? []).includes(`clothes:${id}`);
        const icon = kind === 'item' ? iconImg(itemIcon(id)) : kind === 'furniture' ? iconImg(furnitureIcon(id)) : '👗 ';
        const sub = kind === 'item' ? `❤ +${def.heal}` : kind === 'clothes' ? 'fancy outfit · try it on!' : 'for the fort';
        const row = el('button', 'shop-row', `<span>${icon}${esc(def.name)} <small>${sub}</small></span><span class="gold">${owned ? '✓' : this.priceTag(full)}</span>`);
        row.disabled = owned || gold < price;
        row.addEventListener('click', () => this.askToBuy(def.name, price, () => onBuy(id), kind === 'clothes' ? { tryOn: { slot: 'clothes', id } } : { img: icon }));
        body.append(row);
      }
      box.append(body, closeButton(this));
    });
  }

  /** The Enchanter: spend gold, ore and Arcane Essence to make one of your weapons stronger (and shinier). */
  openEnchanter({ onEnchant, onClose = null }) {
    this.openModal((box) => {
      const s = this.self, gold = s?.gold ?? 0, have = (item) => s?.inventory?.[item] ?? 0;
      box.append(el('h2', null, `The Enchanter <span class="gold">🪙 ${gold}</span>`),
        el('p', 'muted', `“Psst. Bring me <b>Arcane Essence</b> — the big beasts carry it, bosses mostly — and some ore, and I’ll make that weapon sing.” You have <b>${have('essence')}</b> essence.`));
      const list = el('div', 'forge-list');
      const weapons = (s?.gear ?? []).filter((id) => ITEMS[id]?.kind === 'weapon');
      for (const id of weapons) {
        const level = s.enchants?.[id] ?? 0, cost = enchantCost(id, level);
        const now = attackDamage(id, s.stats, level);
        if (!cost) {
          list.append(el('div', 'forge-row', `<b>${iconImg(itemIcon(id))}${esc(enchantedName(id, level))} <small class="muted">⚔ ${now}</small></b><span class="needs ok">Fully enchanted ✨</span>`));
          continue;
        }
        const [ore, oreN] = cost.ore;
        const needs = [['essence', cost.essence], [ore, oreN]].map(([item, n]) =>
          `<span class="${have(item) >= n ? 'ok' : 'short'}">${esc(ITEMS[item].name)} ${have(item)}/${n}</span>`).join(' · ');
        const next = attackDamage(id, s.stats, level + 1);
        const row = el('div', 'forge-row', `<b>${iconImg(itemIcon(id))}${esc(enchantedName(id, level))} <small class="muted">⚔ ${now} → ${next} · ${ENCHANT_LOOKS[level].name.toLowerCase()}</small></b><span class="needs">${needs} · <span class="gold">🪙 ${cost.gold}</span></span>`);
        const ready = gold >= cost.gold && have('essence') >= cost.essence && have(ore) >= oreN;
        const b = el('button', ready ? 'primary' : '', `Enchant to +${level + 1}`);
        b.disabled = !ready;
        b.addEventListener('click', () => this.askToBuy(`enchant your ${ITEMS[id].name} to +${level + 1}`, cost.gold, () => onEnchant(id)));
        row.append(b);
        list.append(row);
      }
      if (!weapons.length) list.append(el('p', 'muted', 'You don’t have any weapons to enchant.'));
      box.append(list, closeButton(this));
    }, { onClose });
  }

  /** The Blacksmith's smelting tab: SMELT_ORE ore make a bar, worth more than the ore. */
  smeltList(onSmelt) {
    const inv = this.self?.inventory ?? {};
    const list = el('div', 'forge-list');
    list.append(el('p', 'muted', `Melt down ${SMELT_ORE} ore into a bar: a bar sells for more than the ore did.`));
    for (const [ore, bar] of Object.entries(SMELT)) {
      const have = inv[ore] ?? 0, bars = Math.floor(have / SMELT_ORE);
      const row = el('div', 'forge-row', `<b>${iconImg(itemIcon(bar))}${esc(ITEMS[bar].name)} <small class="muted">sells for <span class="gold">🪙 ${sellValue(bar)}</span> (${SMELT_ORE} ore: ${sellValue(ore) * SMELT_ORE})</small></b><span class="needs"><span class="${bars ? 'ok' : 'short'}">${esc(ITEMS[ore].name)} ${have}/${SMELT_ORE}</span></span>`);
      const one = el('button', bars ? 'primary' : '', 'Smelt 1');
      one.disabled = !bars;
      one.addEventListener('click', () => onSmelt(ore, false));
      row.append(one);
      if (bars > 1) {
        const all = el('button', '', `Smelt all (${bars})`);
        all.addEventListener('click', () => onSmelt(ore, true));
        row.append(all);
      }
      list.append(row);
    }
    return list;
  }

  /** The Blacksmith's forge tab: blueprint gear you can make from ore (forged weapons have a perk). */
  forgeList(onForge) {
    const s = this.self ?? {}, gold = s.gold ?? 0;
    const list = el('div', 'forge-list');
    list.append(el('p', 'muted', 'Find blueprints in dungeon chests and from bosses, then bring ore here.'));
    for (const [id, r] of Object.entries(FORGE_RECIPES)) {
      const it = ITEMS[id];
      const known = s.blueprints?.includes(id);
      if (!known) {
        list.append(el('div', 'forge-row unknown', `<b>??? blueprint</b><span class="muted">found from floor ${r.depth} down</span>`));
        continue;
      }
      const have = (item) => s.inventory?.[item] ?? 0;
      const needs = Object.entries(r.needs).map(([item, n]) =>
        `<span class="${have(item) >= n ? 'ok' : 'short'}">${esc(ITEMS[item].name)} ${have(item)}/${n}</span>`).join(' · ');
      const perk = PERKS[it.perk];
      const stat = it.kind === 'weapon' ? `⚔ ${it.damage}${it.ranged ? ' ranged' : ''}${perk ? ` · ${perk.icon} ${perk.name}: ${perk.text}` : ''}` : `🛡 ${Math.round(it.block * 100)}%`;
      const row = el('div', 'forge-row', `<b>${iconImg(itemIcon(id))}${esc(it.name)} <small class="muted">${stat}</small></b><span class="needs">${needs} · <span class="gold">🪙 ${this.priceTag(r.gold)}</span></span>`);
      const owned = s.gear?.includes(id);
      const ready = !owned && gold >= this.sale(r.gold) && Object.entries(r.needs).every(([item, n]) => have(item) >= n);
      const b = el('button', ready ? 'primary' : '', owned ? 'Made ✓' : 'Forge');
      b.disabled = !ready;
      b.addEventListener('click', () => this.askToBuy(`forge ${it.name}`, this.sale(r.gold), () => onForge(id), { img: iconImg(itemIcon(id)) }));
      row.append(b);
      list.append(row);
    }
    return list;
  }

  /** Your pets (level, evolution, pick who follows you, rename) and, at the Pet Keeper, adopting. */
  openPets({ shop, onBuy, onBuyItem, onPick, onRename, onRevive, onTrain }) {
    const ICONS = PET_ICONS;
    this.openModal((box) => {
      const gold = this.self?.gold ?? 0, mine = this.self?.pets ?? [], current = this.self?.pet ?? null;
      box.append(el('h2', null, `${shop ? 'Pet Keeper' : 'My pets'} <span class="gold">🪙 ${gold}</span>`));
      if (mine.length) {
        box.append(el('p', 'muted', `Pets fight beside you and get a new look every ${TIER_EVERY} levels (they evolve at ${EVOLVE_AT[0]} and ${EVOLVE_AT[1]}). If a pet faints, the Pet Keeper can revive it.`));
        const list = el('div', 'pet-list');
        for (const pet of mine) {
          const stage = petStage(pet.level), max = petMaxHp(pet.species, pet.level);
          const nextTier = (petTier(pet.level) + 1) * TIER_EVERY, nextLook = TIER_LOOKS[petTier(pet.level) + 1];
          const row = el('div', `pet-row${pet.id === current ? ' selected' : ''}${pet.fainted ? ' fainted' : ''}`, `
            <div class="pet-icon">${iconImg(petIcon(pet.species, pet.level), 'icon big') || ICONS[pet.species] || '🐾'}${'⭐'.repeat(stage)}</div>
            <div class="pet-info"><b>${esc(pet.name)}</b> <span class="muted">${esc(petFormName(pet.species, pet.level))} · Lv ${pet.level} · ⚔ ${petDamage(pet.species, pet.level)}</span>
              <div class="pethp mini"><div style="width:${pet.fainted ? 0 : (pet.hp / max) * 100}%"></div><span>${pet.fainted ? '💤 fainted' : `❤ ${pet.hp}/${max}`}</span></div>
              <div class="xpbar"><div style="width:${(pet.xp / petXpToNext(pet.level)) * 100}%"></div></div>
              <small class="muted">${nextLook ? `Level ${nextTier}: ${esc(nextLook)}` : 'Every look unlocked!'}</small></div>`);
          const actions = el('div', 'pet-actions');
          if (pet.fainted) {
            const cost = reviveCost(pet.level);
            if (shop) {
              const rv = el('button', 'primary', `Revive · ${cost}g`);
              rv.disabled = gold < cost;
              rv.addEventListener('click', () => this.askToBuy(`a revive for ${pet.name}`, cost, () => onRevive(pet.id)));
              actions.append(rv);
            } else actions.append(el('small', 'muted', `Revive at the Pet Keeper (${cost}g)`));
          } else {
            const walk = el('button', pet.id === current ? '' : 'primary', pet.id === current ? 'Following ♥' : 'Walk with me');
            walk.disabled = pet.id === current;
            walk.addEventListener('click', () => onPick(pet.id));
            actions.append(walk);
          }
          if (shop && pet.level < TRAIN_TO) { // the Pet Keeper trains young pets
            const train = el('button', '', `Train to Lv ${TRAIN_TO} · ${TRAIN_COST.toLocaleString()}g`);
            train.disabled = gold < TRAIN_COST;
            train.addEventListener('click', () => this.askToBuy(`training ${pet.name} to level ${TRAIN_TO}`, TRAIN_COST, () => onTrain(pet.id)));
            actions.append(train);
          }
          if (!PET_SPECIES[pet.species].fixedName) {
            const rename = el('button', 'small', 'Rename');
            rename.addEventListener('click', () => {
              const input = el('input', 'pet-name');
              input.maxLength = 16;
              input.value = pet.name;
              const ok = el('button', 'small primary', 'Save');
              const done = () => { onRename(pet.id, input.value); input.blur(); };
              ok.addEventListener('mousedown', (e) => e.preventDefault()); // keep the typing box focused until Save
              ok.addEventListener('click', done);
              input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') done(); });
              actions.replaceChildren(input, ok);
              input.focus();
              input.select();
            });
            actions.append(rename);
          }
          row.append(actions);
          list.append(row);
        }
        box.append(list);
        if (current) {
          const home = el('button', 'small', 'Let my pet nap at home');
          home.addEventListener('click', () => onPick(null));
          box.append(home);
        }
      } else if (!shop) {
        box.append(el('p', 'muted', 'No pets yet! Visit the Pet Keeper in town. Maple the Maltipoo is free!'));
      }
      if (shop) {
        box.append(el('h3', null, 'Treats (press G to feed your pet)'));
        const treats = el('div', 'fashion-grid');
        for (const id of PET_SHOP_STOCK) {
          const it = ITEMS[id], have = this.self?.inventory?.[id] ?? 0;
          const b = el('button', 'shop-row', `<span>${esc(it.name)} <small>${itemStat(it)}${have ? ` · you have ${have}` : ''}</small></span><span class="gold">${this.priceTag(it.price)}</span>`);
          b.disabled = gold < this.sale(it.price);
          b.addEventListener('click', () => this.askToBuy(it.name, this.sale(it.price), () => onBuyItem(id), { img: iconImg(itemIcon(id)) }));
          treats.append(b);
        }
        box.append(treats);
        box.append(el('h3', null, 'Adopt a friend'));
        const grid = el('div', 'pet-grid');
        const flags = this.world?.flags ?? {};
        const locked = Object.values(PET_SPECIES).filter((d) => d.unlock && !flags[d.unlock]);
        for (const [species, def] of Object.entries(PET_SPECIES)) {
          if (def.unlock && !flags[def.unlock]) continue; // a mini boss you haven't earned yet (listed below)
          const owned = mine.some((x) => x.species === species);
          const card = el('div', `pet-card${owned ? ' owned' : ''}`, `<div class="pet-icon">${iconImg(petIcon(species), 'icon big') || ICONS[species] || '🐾'}</div><b>${esc(def.fixedName ?? def.name)}</b><small class="muted">${esc(def.fixedName ? 'Apricot Maltipoo' : `→ ${def.forms[2]}`)}</small>`);
          const b = el('button', owned ? '' : 'primary', owned ? 'Yours ♥' : def.price ? `Adopt · ${this.sale(def.price)}g${this.onSale() ? ' (half price!)' : ''}` : 'Adopt · free!');
          b.disabled = owned || gold < this.sale(def.price);
          b.addEventListener('click', () => (def.price ? this.askToBuy(def.fixedName ?? `a ${def.name.toLowerCase()}`, this.sale(def.price), () => onBuy(species)) : onBuy(species)));
          card.append(b);
          grid.append(card);
        }
        box.append(grid);
        if (locked.length) { // still to earn: beat the boss and its mini joins the stall
          box.append(el('h3', null, `👑 Mini bosses <small class="muted">beat a boss and a little one joins the stall</small>`));
          const more = el('div', 'pet-grid');
          for (const def of locked.slice(0, 8)) more.append(el('div', 'pet-card locked', `<div class="pet-icon">🔒</div><b>${esc(def.name)}</b><small class="muted">Beat ${esc(def.unlockBy)}</small>`));
          if (locked.length > 8) more.append(el('div', 'pet-card locked', `<div class="pet-icon">👑</div><b>+${locked.length - 8} more</b><small class="muted">every boss has one</small>`));
          box.append(more);
        }
      }
      box.append(closeButton(this));
    });
  }

  /** Your presents: open one, or send it to someone in the family who's playing. */
  openPresents({ onOpen, onSend }) {
    this.openModal((box) => {
      const inv = Object.entries(this.self?.inventory ?? {}).filter(([id, n]) => n > 0 && ITEMS[id]?.kind === 'gift');
      box.append(el('h2', null, '🎁 Presents'));
      if (!inv.length) box.append(el('p', 'muted', 'No presents. The Shopkeeper sells them — buy one to give to someone!'));
      const others = (this.roster ?? []).filter((p) => p.id !== this.you);
      for (const [id, n] of inv) {
        const row = el('div', 'present-row', `<b>${esc(ITEMS[id].name)}</b> ×${n}`);
        const open = el('button', 'primary', 'Open it!');
        open.addEventListener('click', () => onOpen(id));
        row.append(open);
        for (const p of others) {
          const send = el('button', '', `Give to ${esc(p.name)}`);
          send.addEventListener('click', () => onSend(id, p.id));
          row.append(send);
        }
        box.append(row);
      }
      if (inv.length && !others.length) box.append(el('p', 'muted', 'When someone else in the family is playing you can give them one.'));
      box.append(closeButton(this));
    });
  }

  /** A townsperson says something: a speech box at the bottom that fades after a few seconds. */
  speech(name, text) {
    this.speechEl?.remove();
    const s = el('div', 'speech panel', `<b>${esc(name)}</b><p>${esc(text)}</p>`);
    this.root.append(s);
    this.speechEl = s;
    clearTimeout(this.speechTimer);
    this.speechTimer = setTimeout(() => { s.classList.add('fade'); setTimeout(() => s.remove(), 500); }, 5000);
  }

  /** The Decorator's stall: furniture, wall colours/wallpapers and floors, all for the family.
   * Nothing is put up here: at home, press B to place furniture and to dress your own room. */
  openDecorator({ house, onBuy, onBuyStyle }) {
    this.decoTab ??= 'furniture';
    this.openModal((box) => {
      const gold = this.self?.gold ?? 0, h = house() ?? {};
      box.append(el('h2', null, `The Decorator <span class="gold">🪙 ${gold}</span>`),
        el('p', 'muted', 'Everything here is for the whole family. Take it home and press <b>B</b> to decorate: furniture anywhere in your own room or the common room, and walls and floors in the room you’re standing in.'));
      const tabs = el('div', 'tabs');
      for (const [id, label] of [['furniture', '🛋 Furniture'], ['luxury', '✨ Luxury'], ['wall', '🎨 Walls'], ['floor', '🪵 Floors']]) {
        const t = el('button', this.decoTab === id ? 'selected' : '', label);
        t.addEventListener('click', () => { this.decoTab = id; this.refreshModal?.(); });
        tabs.append(t);
      }
      box.append(tabs);
      const body = el('div', 'shop-body');
      body.dataset.scroll = `deco-${this.decoTab}`;
      if (this.decoTab === 'furniture' || this.decoTab === 'luxury') {
        for (const [id, def] of Object.entries(FURNITURE)) {
          if (def.notForSale || def.seasonal || !!def.luxury !== (this.decoTab === 'luxury')) continue;
          const have = h.owned?.[id] ?? 0;
          const row = el('button', 'shop-row', `<span>${iconImg(furnitureIcon(id))}${esc(def.name)}${have ? ` <small>${have} waiting at home</small>` : ''}</span><span class="gold">${this.priceTag(def.price)}</span>`);
          row.disabled = gold < this.sale(def.price);
          row.addEventListener('click', () => this.askToBuy(def.name, this.sale(def.price), () => onBuy(id), { img: iconImg(furnitureIcon(id)) }));
          body.append(row);
        }
      } else {
        const kind = this.decoTab, table = kind === 'wall' ? WALL_STYLES : FLOOR_STYLES;
        for (const [id, def] of Object.entries(table)) {
          const owned = !def.price || (h.styles ?? []).includes(`${kind}:${id}`);
          const row = el('button', 'shop-row', `<span>${styleSwatch(def)}${esc(def.name)}</span><span class="gold">${owned ? 'owned ✓' : this.priceTag(def.price)}</span>`);
          row.disabled = owned || gold < this.sale(def.price);
          row.addEventListener('click', () => this.askToBuy(def.name, this.sale(def.price), () => onBuyStyle(kind, id), { img: styleSwatch(def).replace('class="swatch"', 'class="swatch big"') }));
          body.append(row);
        }
      }
      box.append(body, closeButton(this));
    });
  }

  /** Build mode's panel (not a modal: you keep walking around while you choose). */
  openBuild(client) {
    this.buildEl?.remove();
    this.buildEl = el('div', 'build-panel panel');
    this.root.append(this.buildEl);
    this.renderBuild(client);
  }

  /** Build mode: place furniture, or put up walls and floors in the room you're standing in. */
  renderBuild(client) {
    const b = client.building;
    if (!this.buildEl || !b) return;
    b.tab ??= 'furniture';
    this.buildEl.innerHTML = '<h3>🔨 Decorate the fort</h3>';
    const tabs = el('div', 'tabs');
    for (const [id, label] of [['furniture', '🛋'], ['wall', '🎨 Walls'], ['floor', '🪵 Floors']]) {
      const t = el('button', b.tab === id ? 'selected' : '', label);
      t.addEventListener('click', () => { b.tab = id; if (id !== 'furniture') client.dropBuildItem(); this.renderBuild(client); });
      tabs.append(t);
    }
    this.buildEl.append(tabs);
    if (b.tab === 'furniture') {
      const owned = Object.entries(client.house?.owned ?? {}).filter(([, n]) => n > 0);
      if (!owned.length) this.buildEl.append(el('p', 'muted', 'No furniture waiting. Buy some from the Decorator in town!'));
      for (const [id, n] of owned) {
        const btn = el('button', b.item === id ? 'selected' : '', `${iconImg(furnitureIcon(id))}${esc(FURNITURE[id]?.name ?? id)} ×${n}`);
        btn.addEventListener('click', () => { b.item = id; this.renderBuild(client); });
        this.buildEl.append(btn);
      }
      this.buildEl.append(el('p', 'muted small-note', 'E place · R turn · X pick up · B done'));
      return;
    }
    // walls / floors: only for the room you're standing in, if it's yours or the common room
    const kind = b.tab, h = client.house ?? {}, room = client.currentRoom();
    const info = room >= 0 ? (h.rooms ?? []).find((r) => r.slot === room) : null;
    const mine = room < 0 || info?.owner === this.you;
    this.buildEl.append(el('p', 'muted', room >= 0 ? `In <b>${esc(info?.ownerName ?? 'an empty')}’s room</b>` : 'In the <b>common room</b>'));
    if (!mine) {
      this.buildEl.append(el('p', 'muted', `Only ${esc(info?.ownerName ?? 'its owner')} can decorate this room. Walk into your own room (or the common room).`));
      return;
    }
    const table = kind === 'wall' ? WALL_STYLES : FLOOR_STYLES;
    const current = room >= 0 ? h.roomStyles?.[room]?.[kind] ?? (kind === 'wall' ? 'stone' : 'oak') : h[kind] ?? (kind === 'wall' ? 'stone' : 'oak');
    const owned = Object.entries(table).filter(([id, def]) => !def.price || (h.styles ?? []).includes(`${kind}:${id}`));
    for (const [id, def] of owned) {
      const btn = el('button', current === id ? 'selected' : '', `${styleSwatch(def)}${esc(def.name)}`);
      btn.disabled = current === id;
      btn.addEventListener('click', () => client.putUpStyle(kind, id, room));
      this.buildEl.append(btn);
    }
    this.buildEl.append(el('p', 'muted small-note', owned.length > 1 ? 'Click one to put it up in this room · B done' : `Buy ${kind === 'wall' ? 'wallpapers' : 'floors'} from the Decorator in town · B done`));
  }

  closeBuild() {
    this.buildEl?.remove();
    this.buildEl = null;
  }

  /** The family chest: move things (and gear: weapons, shields, armor) between you and the shared chest. */
  openChest({ storage, ench, onStash }) {
    this.chestStorage = storage;
    this.chestEnch = ench ?? {};
    this.openModal((box) => {
      box.append(el('h2', null, 'Family chest'), el('p', 'muted', 'Everyone in the family shares this. Move things across with 1 or All. Gear you’re wearing stays on you.'));
      const s = this.self ?? {}, worn = [s.weapon, s.shield, s.armor, s.helmet];
      // your spare gear: everything you own but aren't wearing (enchant shown, it goes in with it)
      const spare = Object.fromEntries((s.gear ?? []).filter((g) => !worn.includes(g)).map((g) => [g, 1]));
      const cols = el('div', 'shop-cols');
      cols.append(
        this.stashCol('Your bag', { ...(s.inventory ?? {}), ...spare }, 'in', onStash, (id) => s.enchants?.[id] ? [s.enchants[id]] : []),
        this.stashCol('In the chest', this.chestStorage ?? {}, 'out', onStash, (id) => this.chestEnch?.[id] ?? [], s.gear ?? []),
      );
      box.append(cols, closeButton(this));
    });
  }

  setChest(storage, ench) {
    this.chestStorage = storage;
    this.chestEnch = ench ?? {};
    this.refreshModal?.();
  }

  /** One side of the chest window. `enchOf(id)` = enchant levels of that gear; `owned` = gear you already have (can't take another). */
  stashCol(title, items, dir, onStash, enchOf = () => [], owned = []) {
    const col = el('div', 'shop-col', `<h3>${title}</h3>`);
    const rows = Object.entries(items).filter(([id, n]) => n > 0 && ITEMS[id] && ITEMS[id].kind !== 'currency');
    if (!rows.length) col.append(el('p', 'muted', dir === 'in' ? 'Nothing in your bag.' : 'The chest is empty.'));
    for (const [id, n] of rows) {
      const row = el('div', 'stash-row');
      const gear = isGear(id), plus = enchOf(id).filter((l) => l > 0);
      const tag = gear ? ` <span class="muted">${ITEMS[id].kind}</span>` : '';
      row.append(el('span', null, `${iconImg(itemIcon(id))}${esc(ITEMS[id].name)}${plus.length ? ` <b class="gold">+${plus.join(', +')}</b>` : ''}${n > 1 || !gear ? ` ×${n}` : ''}${tag}`));
      if (gear) { // one at a time (you can only own one of each)
        const move = el('button', 'primary', dir === 'in' ? 'Put in' : 'Take');
        if (dir === 'out' && owned.includes(id)) { move.disabled = true; move.title = 'You already have one'; }
        move.addEventListener('click', () => onStash(id, 1, dir));
        row.append(move);
      } else {
        const one = el('button', '', '1');
        one.addEventListener('click', () => onStash(id, 1, dir));
        const all = el('button', 'primary', 'All');
        all.addEventListener('click', () => onStash(id, n, dir));
        row.append(one, all);
      }
      col.append(row);
    }
    return col;
  }

  /**
   * Load character: the characters in this world nobody is playing. `fresh`: we just joined as
   * someone the world didn't know — most likely a family member on a new device.
   */
  openCharacters({ list, fresh, onPick }) {
    this.openModal((box) => {
      box.append(el('h2', null, fresh ? 'Welcome! Is one of these you?' : 'Load character'),
        el('p', 'muted', fresh
          ? 'This world doesn’t know this device yet. If you’ve played here before, pick your character to carry on where you left off.'
          : 'Play as another character from this world (only ones nobody is playing right now).'));
      if (!list.length) box.append(el('p', 'muted', 'Everyone else is playing right now.'));
      const grid = el('div', 'char-list');
      for (const ch of list) {
        const b = el('button', 'char-pick', `<b>${esc(ch.name)}</b><span class="muted">Level ${ch.level} ${esc(String(ch.cls).replace('_', ' '))}</span>`);
        b.addEventListener('click', () => { this.closeModal(); onPick(ch.id); });
        grid.append(b);
      }
      box.append(grid);
      const close = el('button', fresh ? 'primary' : '', fresh ? 'I’m new here — start a new character' : 'Close');
      close.addEventListener('click', () => this.closeModal());
      box.append(close);
    });
  }

  openElevator({ name, floors, onPick }) {
    this.openModal((box) => {
      box.append(el('h2', null, esc(name)), el('p', 'muted', 'Where to?'));
      const grid = el('div', 'elevator');
      for (const f of floors) {
        const b = el('button', 'primary', `Floor ${f}`);
        b.addEventListener('click', () => { this.closeModal(); onPick(f); });
        grid.append(b);
      }
      box.append(grid, closeButton(this));
    });
  }

  /** The stats overlay (F3): frame rate, ping, updates per second. null hides it. */
  setStats(text) {
    if (!this.statsEl) { this.statsEl = el('div', 'hud-stats'); this.root.append(this.statsEl); }
    this.statsEl.textContent = text ?? '';
    this.statsEl.style.display = text ? 'block' : 'none';
  }

  openMenu({ isHost, music, graphics, stats, onSave, onExport, onQuit, onCharacters }) {
    this.openModal((box) => {
      box.append(el('h2', null, 'Paused'), el('p', 'muted', isHost
        ? 'You are the host. Keep this tab open — the world lives here! It autosaves every 30s and when you sleep.'
        : 'The host saves the world. Your progress is kept on their computer.'));
      const actions = el('div', 'menu-actions');
      const add = (label, fn, cls = '') => { const b = el('button', cls, label); b.addEventListener('click', fn); actions.append(b); };
      add('Resume', () => this.closeModal(), 'primary');
      if (onCharacters) add('👤 Load character', onCharacters);
      if (isHost) { add('Save now', onSave); add('Download save file', onExport); }
      add(isHost ? 'Save & quit to title' : 'Leave game', onQuit);
      box.append(actions);
      if (graphics) {
        const row = el('div', 'gfx-row', '<span>🖥 Graphics</span>');
        for (const [level, label] of [['high', 'High'], ['medium', 'Medium'], ['low', 'Fast']]) {
          const b = el('button', `small${graphics.level === level ? ' selected' : ''}`, label);
          b.addEventListener('click', () => { graphics.set(level); graphics.level = level; this.refreshModal?.(); });
          row.append(b);
        }
        box.append(row);
      }
      if (stats) {
        const row = el('label', 'gfx-row', `<input type="checkbox" ${stats.on ? 'checked' : ''}> Show speed &amp; connection (F3)`);
        row.querySelector('input').addEventListener('change', () => { stats.toggle(); stats.on = !stats.on; });
        box.append(row);
      }
      if (music) {
        const row = el('label', 'music-row', `🎵 Music <input type="range" min="0" max="1" step="0.05" value="${music.muted ? 0 : music.volume}">`);
        row.querySelector('input').addEventListener('input', (e) => {
          const v = Number(e.target.value);
          if ((v === 0) !== music.muted) music.toggleMute();
          if (v > 0) music.setVolume(v);
        });
        box.append(row);
      }
    });
  }

  fatal(title, text) {
    if (this.isFatal) return; // keep the first reason (e.g. "kicked" before the close)
    this.closeModal();
    this.isFatal = true;
    this.openModal((box) => {
      box.append(el('h2', null, esc(title)), el('p', null, esc(text)));
      const b = el('button', 'primary', 'Back to title');
      b.addEventListener('click', () => location.assign(location.pathname));
      box.append(b);
    });
    this.refreshModal = null;
  }
}

/** One line about what an item does: damage, block, armor, healing. */
function itemStat(it) {
  if (it.kind === 'weapon') return `⚔ ${it.damage}${it.ranged ? ' ranged' : ''}`;
  if (it.kind === 'shield') return `🛡 blocks ${Math.round(it.block * 100)}%`;
  if (it.kind === 'armor') return `🥋 −${Math.round(it.armor * 100)}% damage`;
  if (it.kind === 'helmet') return `⛑ −${Math.round(it.armor * 100)}% damage`;
  if (it.heal) return it.heal >= 9999 ? '❤ full heal' : `❤ +${it.heal}`;
  if (it.petHeal) return `🐾 +${it.petHeal}`;
  return '';
}

/** 125 seconds → "2:05". */
function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function closeButton(hud) {
  const b = el('button', 'close', 'Close (Esc)');
  b.addEventListener('click', () => hud.closeModal());
  return b;
}

export function prettyLoc(key) {
  if (!key) return '';
  if (key === 'house') return 'at the fort';
  if (key === 'town') return 'in town';
  const [d, f] = key.split('/');
  return `${d} floor ${f}`;
}

/** A little square of a wall style or floor: its wallpaper pattern or its colour. */
function styleSwatch(def) {
  return def.pattern ? `<i class="swatch" style="background:url(${wallpaperSwatch(def.pattern)}) center/200%"></i>`
    : def.tint != null ? `<i class="swatch" style="background:#${def.tint.toString(16).padStart(6, '0')}"></i>` : '';
}
