// HTML overlay on top of the 3D canvas.
import { ITEMS, FORGE_RECIPES, SHOP_STOCK, SHOP_SECTIONS, SHOP_TIER_LEVELS, PET_SHOP_STOCK, shopTier, sellValue, isGear } from '../shared/items.js';
import { STATS, attackDamage, weaponStat } from '../shared/progression.js';
import { CLASSES, HATS, CAPES, BACKS, DYES, CLOTHES, HAIRS, HAIR_COLORS, FACES, SKINS, STYLE_SLOTS, ownsStyle } from '../shared/config.js';
import { FURNITURE, WALL_STYLES, FLOOR_STYLES } from '../shared/furniture.js';
import { itemIcon, furnitureIcon, petIcon, iconImg } from './icons.js';
import { wallpaperSwatch } from './wallpaper.js';
import { PET_SPECIES, EVOLVE_AT, TIER_EVERY, TIER_LOOKS, petFormName, petStage, petTier, petDamage, petXpToNext, petMaxHp, reviveCost } from '../shared/pets.js';
import { seasonOf, dayOfSeason, isBossDay, calendar, dateLabel } from '../shared/seasons.js';
import { ENCHANT_LOOKS, enchantCost, enchantedName, enchantDamage } from '../shared/enchant.js';

/** The night screen's season line: which season it is, and whether its boss has come to town. */
function seasonLine(day) {
  const s = seasonOf(day);
  return isBossDay(day)
    ? `${s.icon} ${s.name} begins! ${esc(s.bossName)} is in town — today only.`
    : `${s.icon} ${s.name}, day ${dayOfSeason(day)}`;
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
  hedgehog: '🦔', turtle: '🐢', penguin: '🐧', owl: '🦉', axolotl: '🦎', fox: '🦊', cat: '🐱', panda: '🐼', dragon: '🐲', unicorn: '🦄',
};

export class Hud {
  constructor(root, { onModalChange } = {}) {
    this.root = root;
    this.onModalChange = onModalChange;
    root.innerHTML = '';
    this.status = el('div', 'hud-status panel');
    this.invite = el('div', 'hud-invite panel');
    this.inv = el('div', 'hud-inv panel');
    this.xp = el('div', 'hud-xp');
    this.promptEl = el('div', 'hud-prompt');
    this.spell = el('div', 'hud-spell panel');
    this.toasts = el('div', 'hud-toasts');
    this.chatLog = el('div', 'hud-chat');
    this.chatInput = el('input', 'hud-chat-input');
    this.chatInput.placeholder = 'Say something… (Enter to send, Esc to cancel)';
    this.chatInput.maxLength = 120;
    this.floats = el('div', 'hud-floats');
    this.modal = el('div', 'modal-backdrop hidden');
    this.danger = el('div', 'hud-danger');
    this.help = el('div', 'hud-help', 'WASD move · Space/click attack · Shift roll · E interact · Q potion · G feed pet · R area spell · C character · P pets · Enter chat · M music · Esc menu');
    root.append(this.danger, this.status, this.invite, this.xp, this.inv, this.promptEl, this.spell, this.toasts, this.chatLog, this.chatInput, this.floats, this.modal, this.help);
    this.self = null;
    this.world = null;
    this.locTitle = '';
    this.refreshModal = null;
    this.modal.addEventListener('mousedown', (e) => { if (e.target === this.modal) this.closeModal(); });
  }

  // ---------------------------------------------------------------- status

  /** The night screen: a moonlit card with the new day's number, shown for a few seconds. */
  nightScreen({ day, reason, fainted = [] }) {
    this.nightEl?.remove();
    const lines = reason === 'sleep'
      ? ['Everyone snuggled into bed…']
      : ['Night fell!', ...fainted.map((f) => `${f.name} was out after dark and fainted${f.lost ? ` (dropped ${f.lost} gold)` : ''}.`)];
    const n = el('div', 'night-screen', `
      <div class="night-sky"></div>
      <div class="night-card">
        <div class="moon">🌙</div>
        <div class="night-year">Year ${calendar(day).year}</div>
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

  setSelf(self) { this.self = self; this.renderStatus(); this.renderInv(); this.refreshModal?.(); }
  setWorld(world) { this.world = world; this.renderStatus(); this.refreshModal?.(); }
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
        <span>${PET_ICONS[pet.species] ?? '🐾'} ${esc(pet.name)} · Lv ${pet.level} · ${pet.fainted ? 'fainted' : `${pet.hp}/${max}`}</span></div>`;
    }
    this.status.innerHTML = `
      <div class="loc">${esc(this.locTitle)}</div>
      <div class="hpbar"><div style="width:${frac}%"></div><span>❤ ${hp}</span></div>${petRow}
      <div class="row"><span class="gold">🪙 ${s?.gold ?? 0}</span><span>${dateLabel(w?.day ?? 1)}</span></div>
      <div class="row day-clock${(w?.dayLeft ?? 999) <= 60 ? ' soon' : ''}"><span>${(w?.dayLeft ?? 999) <= 60 ? '🌙 Get home! Night in' : '🌅 Night in'} ${clock(w?.dayLeft ?? 0)}</span><span title="Day ${dayOfSeason(w?.day ?? 1)} of ${seasonOf(w?.day ?? 1).name}">${seasonOf(w?.day ?? 1).icon} ${seasonOf(w?.day ?? 1).name}</span></div>`;
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
    const weapon = ITEMS[s.weapon], shield = ITEMS[s.shield], armor = ITEMS[s.armor];
    const inv = Object.entries(s.inventory ?? {}).filter(([id, n]) => n > 0 && ITEMS[id]);
    const slot = (cls, text, title = '') => `<span class="slot ${cls}" title="${esc(title)}">${text}</span>`;
    const group = (key, label, ids) => (ids.length
      ? `<span class="slot-group" title="${esc(`${key}: ${label}`)}"><kbd>${key}</kbd>${ids.map(([id, n]) => slot('use', `${iconImg(itemIcon(id))}×${n}`, `${ITEMS[id].name}: ${itemStat(ITEMS[id])}`)).join('')}</span>` : '');
    const heals = inv.filter(([id]) => ITEMS[id].heal), treats = inv.filter(([id]) => ITEMS[id].petHeal);
    const loot = inv.filter(([id]) => !ITEMS[id].heal && !ITEMS[id].petHeal);
    this.inv.innerHTML = [
      slot('weapon', `${iconImg(itemIcon(s.weapon))}${esc(weapon?.name ?? s.weapon)}${s.enchants?.[s.weapon] ? ` <b class="ench">+${s.enchants[s.weapon]}</b>` : ''} <b>${(weapon?.damage ?? 1) + enchantDamage(s.weapon, s.enchants?.[s.weapon])}</b>`, 'Your weapon (C to change)'),
      shield ? slot('weapon', iconImg(itemIcon(s.shield)) || '🛡', `${shield.name}: ${itemStat(shield)}`) : '',
      armor ? slot('weapon', iconImg(itemIcon(s.armor)) || '🥋', `${armor.name}: ${itemStat(armor)}`) : '',
      group('Q', 'eat / drink', heals),
      group('G', 'feed pet', treats),
      loot.length ? slot('bag', `🎒 ${loot.reduce((a, [, n]) => a + n, 0)}`, loot.map(([id, n]) => `${ITEMS[id].name} ×${n}`).join('\n')) : '',
    ].join('');
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
  askToBuy(label, price, run) {
    this.pendingBuy = { label, price, run };
    this.refreshModal?.();
  }

  askToSell(label, price, run) {
    this.pendingBuy = { label, price, run, sell: true };
    this.refreshModal?.();
  }

  confirmBar() {
    const q = this.pendingBuy;
    if (!q) return null;
    const verb = q.sell ? 'Sell' : q.label.startsWith('forge ') ? 'Pay to' : 'Buy';
    const bar = el('div', 'confirm-bar', `<span>${verb} <b>${esc(q.label)}</b> for <span class="gold">🪙 ${q.price}</span>?</span>`);
    const yes = el('button', 'primary', q.sell ? 'Sell it' : 'Buy it!');
    const no = el('button', '', 'Cancel');
    yes.disabled = !q.sell && (this.self?.gold ?? 0) < q.price;
    yes.addEventListener('click', () => { this.pendingBuy = null; q.run(); this.refreshModal?.(); });
    no.addEventListener('click', () => { this.pendingBuy = null; this.refreshModal?.(); });
    bar.append(yes, no);
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
    this.modal.classList.add('hidden');
    this.modal.innerHTML = '';
    this.onCloseModal?.();
    this.onCloseModal = null;
    this.refreshModal = null;
    this.onModalChange?.(false);
  }

  /** The town shop: a tab per section, Fashion, and Sell. Better gear unlocks every 20 levels. */
  openShop({ onBuy, onSell, onBuyStyle }) {
    this.shopTab ??= 'weapons';
    this.openModal((box) => {
      const gold = this.self?.gold ?? 0, level = this.self?.level ?? 1, tier = shopTier(level);
      box.append(el('h2', null, `Pebble Town Shop <span class="gold">🪙 ${gold}</span>`));
      const tabs = el('div', 'tabs');
      for (const [id, label] of [...SHOP_SECTIONS.map((sec) => [sec.id, `${sec.icon} ${sec.name}`]), ['fashion', '👑 Fashion'], ['sell', '💰 Sell']]) {
        const t = el('button', this.shopTab === id ? 'selected' : '', label);
        t.addEventListener('click', () => { this.shopTab = id; this.refreshModal?.(); });
        tabs.append(t);
      }
      box.append(tabs);
      const body = el('div', 'shop-body');
      body.dataset.scroll = `shop-${this.shopTab}`;
      if (this.shopTab === 'fashion') body.append(this.fashionShop(gold, onBuyStyle));
      else if (this.shopTab === 'sell') body.append(this.sellList(onSell));
      else {
        const sec = SHOP_SECTIONS.find((x) => x.id === this.shopTab);
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
          const row = el('button', `shop-row${locked ? ' locked' : ''}`, `<span>${iconImg(itemIcon(id))}${esc(it.name)} <small>${itemStat(it)}</small></span><span class="gold">${owned ? '✓' : locked ? '🔒' : it.price}</span>`);
          row.disabled = locked || owned || gold < it.price;
          row.addEventListener('click', () => this.askToBuy(it.name, it.price, () => onBuy(id)));
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
    const spare = (s.gear ?? []).filter((id) => id !== s.weapon && id !== s.shield && id !== s.armor);
    if (!loot.length && !spare.length) wrap.append(el('p', 'muted', 'Nothing to sell. Go mining!'));
    if (loot.length) {
      wrap.append(el('h3', null, 'Loot'));
      for (const [id, n] of loot) {
        const it = ITEMS[id];
        const row = el('button', 'shop-row', `<span>${iconImg(itemIcon(id))}${esc(it.name)} ×${n}</span><span class="gold">${it.sell} each · ${it.sell * n}</span>`);
        row.addEventListener('click', () => onSell(id, n));
        wrap.append(row);
      }
      if (loot.length > 1) {
        const all = el('button', 'primary', `Sell all loot (${loot.reduce((a, [id, n]) => a + ITEMS[id].sell * n, 0)} gold)`);
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
        if (!def.price) continue;
        const owned = ownsStyle(this.self?.closet, slot, id);
        const swatch = def.color != null ? `<i class="swatch" style="background:#${def.color.toString(16).padStart(6, '0')}"></i>` : '';
        const b = el('button', 'shop-row', `<span>${swatch}${esc(def.name)}</span><span class="gold">${owned ? '✓' : def.price}</span>`);
        b.disabled = owned || gold < def.price;
        b.addEventListener('click', () => this.askToBuy(def.name, def.price, () => onBuyStyle(slot, id)));
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
      row('Hair colour', opts(HAIR_COLORS), 'hairColor', true);
      row('Face', opts(FACES, 'Nothing'), 'face');
      row('Skin', opts(SKINS, 'Natural'), 'skin', true);
      box.append(el('p', 'muted', 'Tip: a new hairstyle replaces your outfit’s own hair. Hats sit on top, so pick "None" for your hat in the wardrobe to show it off.'));
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
      const styles = (slot, table) => Object.entries(table).map(([k, v]) => {
        const locked = !ownsStyle(closet, slot, k);
        return [k, locked ? `🔒 ${v.name} · ${v.price}g` : v.name, locked];
      });
      row('Outfit', Object.keys(CLASSES).map((c) => [c, c.replace('_', ' ')]), (v) => v === cur.cls, (v) => { cur.cls = v; });
      row('Fancy clothes', [['none', 'Outfit’s own'], ...styles('clothes', CLOTHES)], (v) => v === (cur.look.clothes ?? 'none'), (v) => { cur.look.clothes = v; });
      row('Hat', [['own', 'Outfit’s own'], ['none', 'None'], ...styles('hat', HATS)], (v) => v === cur.look.hat, (v) => { cur.look.hat = v; });
      row('Cape', [['own', 'Outfit’s own'], ['none', 'None'], ...styles('cape', CAPES)], (v) => v === cur.look.cape, (v) => { cur.look.cape = v; });
      row('Cape colour', [['none', 'Natural'], ...styles('dye', DYES)], (v) => v === cur.look.dye, (v) => { cur.look.dye = v; });
      row('On your back', [['none', 'Nothing'], ...styles('back', BACKS)], (v) => v === cur.look.back, (v) => { cur.look.back = v; });
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
      const order = { weapon: 0, shield: 1, armor: 2 };
      const gear = [...(s.gear ?? [])].sort((a, b) => order[ITEMS[a].kind] - order[ITEMS[b].kind] || (ITEMS[a].damage ?? 0) - (ITEMS[b].damage ?? 0));
      for (const id of gear) {
        const it = ITEMS[id];
        const on = id === s.weapon || id === s.shield || id === s.armor;
        const stat = it.kind === 'weapon'
          ? `⚔ ${attackDamage(id, s.stats, s.enchants?.[id])} <small>${STATS[weaponStat(id)].icon}${it.ranged ? ' ranged' : ''}</small>`
          : itemStat(it);
        const b = el('button', `shop-row${on ? ' selected' : ''}`, `<span>${iconImg(itemIcon(id))}${esc(enchantedName(id, s.enchants?.[id]))}</span><span>${stat}</span>`);
        const removable = it.kind === 'shield' || it.kind === 'armor';
        b.addEventListener('click', () => (on && removable ? onEquip(null, it.kind) : onEquip(id)));
        b.title = on ? (removable ? 'Click to take it off' : 'Equipped') : 'Click to equip';
        bag.append(b);
      }
      box.append(bag, closeButton(this));
    });
  }

  /** The Enchanter: spend gold, ore and Arcane Essence to make one of your weapons stronger (and shinier). */
  openEnchanter({ onEnchant }) {
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
    });
  }

  openForge({ onForge }) {
    this.openModal((box) => {
      const s = this.self, gold = this.self?.gold ?? 0;
      box.append(el('h2', null, `The Forge <span class="gold">🪙 ${gold}</span>`),
        el('p', 'muted', 'Find blueprints in dungeon chests and from bosses, then bring ore here.'));
      const list = el('div', 'forge-list');
      for (const [id, r] of Object.entries(FORGE_RECIPES)) {
        const it = ITEMS[id];
        const known = s?.blueprints?.includes(id);
        if (!known) {
          list.append(el('div', 'forge-row unknown', `<b>??? blueprint</b><span class="muted">found from floor ${r.depth} down</span>`));
          continue;
        }
        const have = (item) => s.inventory?.[item] ?? 0;
        const needs = Object.entries(r.needs).map(([item, n]) =>
          `<span class="${have(item) >= n ? 'ok' : 'short'}">${esc(ITEMS[item].name)} ${have(item)}/${n}</span>`).join(' · ');
        const stat = it.kind === 'weapon' ? `⚔ ${it.damage}${it.ranged ? ' ranged' : ''}` : `🛡 ${Math.round(it.block * 100)}%`;
        const row = el('div', 'forge-row', `<b>${iconImg(itemIcon(id))}${esc(it.name)} <small class="muted">${stat}</small></b><span class="needs">${needs} · <span class="gold">🪙 ${r.gold}</span></span>`);
        const owned = s.gear?.includes(id);
        const ready = !owned && gold >= r.gold && Object.entries(r.needs).every(([item, n]) => have(item) >= n);
        const b = el('button', ready ? 'primary' : '', owned ? 'Made ✓' : 'Forge');
        b.disabled = !ready;
        b.addEventListener('click', () => this.askToBuy(`forge ${it.name}`, r.gold, () => onForge(id)));
        row.append(b);
        list.append(row);
      }
      box.append(list, closeButton(this));
    });
  }

  /** Your pets (level, evolution, pick who follows you, rename) and, at the Pet Keeper, adopting. */
  openPets({ shop, onBuy, onBuyItem, onPick, onRename, onRevive }) {
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
          const b = el('button', 'shop-row', `<span>${esc(it.name)} <small>${itemStat(it)}${have ? ` · you have ${have}` : ''}</small></span><span class="gold">${it.price}</span>`);
          b.disabled = gold < it.price;
          b.addEventListener('click', () => this.askToBuy(it.name, it.price, () => onBuyItem(id)));
          treats.append(b);
        }
        box.append(treats);
        box.append(el('h3', null, 'Adopt a friend'));
        const grid = el('div', 'pet-grid');
        for (const [species, def] of Object.entries(PET_SPECIES)) {
          const owned = mine.some((x) => x.species === species);
          const card = el('div', `pet-card${owned ? ' owned' : ''}`, `<div class="pet-icon">${iconImg(petIcon(species), 'icon big') || ICONS[species] || '🐾'}</div><b>${esc(def.fixedName ?? def.name)}</b><small class="muted">${esc(def.fixedName ? 'Apricot Maltipoo' : `→ ${def.forms[2]}`)}</small>`);
          const b = el('button', owned ? '' : 'primary', owned ? 'Yours ♥' : def.price ? `Adopt · ${def.price}g` : 'Adopt · free!');
          b.disabled = owned || gold < def.price;
          b.addEventListener('click', () => (def.price ? this.askToBuy(def.fixedName ?? `a ${def.name.toLowerCase()}`, def.price, () => onBuy(species)) : onBuy(species)));
          card.append(b);
          grid.append(card);
        }
        box.append(grid);
      }
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

  /** The Decorator's stall: furniture for the fort (shared by the family), wall colours and floors.
   * Walls/floors dress one room: your own, or the common room. */
  openDecorator({ house, onBuy, onStyle, onRoomStyle }) {
    this.decoTab ??= 'furniture';
    this.decoScope ??= 'room'; // 'room' = your own room, 'fort' = the common room
    this.openModal((box) => {
      const gold = this.self?.gold ?? 0, h = house() ?? {};
      const myRoom = (h.rooms ?? []).find((r) => r.owner === this.you);
      box.append(el('h2', null, `The Decorator <span class="gold">🪙 ${gold}</span>`),
        el('p', 'muted', myRoom
          ? `Everything is for the whole family. At home, press B to place furniture — ${myRoom.ownerName}'s room is the one with their bed. Walls and floors only change the room you pick.`
          : 'Everything here is for the whole family’s fort. At home, press B to place furniture. Walls and floors change the common room.'));
      const tabs = el('div', 'tabs');
      for (const [id, label] of [['furniture', '🛋 Furniture'], ['luxury', '✨ Luxury'], ['wall', '🎨 Walls'], ['floor', '🪵 Floors']]) {
        const t = el('button', this.decoTab === id ? 'selected' : '', label);
        t.addEventListener('click', () => { this.decoTab = id; this.refreshModal?.(); });
        tabs.append(t);
      }
      box.append(tabs);
      const furnitureTab = this.decoTab === 'furniture' || this.decoTab === 'luxury';
      if (!furnitureTab && myRoom) {
        const scope = el('div', 'tabs');
        for (const [id, label] of [['room', `🚪 ${myRoom.ownerName}'s room`], ['fort', '🛋 Common room']]) {
          const t = el('button', this.decoScope === id ? 'selected' : '', label);
          t.addEventListener('click', () => { this.decoScope = id; this.refreshModal?.(); });
          scope.append(t);
        }
        box.append(scope);
      }
      const body = el('div', 'shop-body');
      body.dataset.scroll = `deco-${this.decoTab}`;
      if (furnitureTab) {
        for (const [id, def] of Object.entries(FURNITURE)) {
          if (def.notForSale || !!def.luxury !== (this.decoTab === 'luxury')) continue;
          const have = h.owned?.[id] ?? 0;
          const row = el('button', 'shop-row', `<span>${iconImg(furnitureIcon(id))}${esc(def.name)}${have ? ` <small>${have} waiting at home</small>` : ''}</span><span class="gold">${def.price}</span>`);
          row.disabled = gold < def.price;
          row.addEventListener('click', () => this.askToBuy(def.name, def.price, () => onBuy(id)));
          body.append(row);
        }
      } else {
        const table = this.decoTab === 'wall' ? WALL_STYLES : FLOOR_STYLES;
        const mine = this.decoScope === 'room' && myRoom
          ? (h.roomStyles?.[myRoom.slot] ?? {})[this.decoTab] ?? (this.decoTab === 'wall' ? 'stone' : 'oak')
          : null;
        for (const [id, def] of Object.entries(table)) {
          const owned = !def.price || (h.styles ?? []).includes(`${this.decoTab}:${id}`);
          const on = mine ? mine === id : h[this.decoTab] === id;
          const sw = def.pattern ? `<i class="swatch" style="background:url(${wallpaperSwatch(def.pattern)}) center/200%"></i>`
            : def.tint != null ? `<i class="swatch" style="background:#${def.tint.toString(16).padStart(6, '0')}"></i>` : '';
          const row = el('button', `shop-row${on ? ' selected' : ''}`, `<span>${sw}${esc(def.name)}</span><span class="gold">${on ? 'in use' : owned ? 'use' : def.price}</span>`);
          row.disabled = on || (!owned && gold < def.price);
          const pick = this.decoScope === 'room' && myRoom ? onRoomStyle : onStyle;
          row.addEventListener('click', () => (owned ? pick(this.decoTab, id) : this.askToBuy(def.name, def.price, () => pick(this.decoTab, id))));
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

  renderBuild(client) {
    if (!this.buildEl || !client.building) return;
    const owned = Object.entries(client.house?.owned ?? {}).filter(([, n]) => n > 0);
    this.buildEl.innerHTML = '<h3>🔨 Decorate the fort</h3>';
    if (!owned.length) this.buildEl.append(el('p', 'muted', 'No furniture waiting. Buy some from the Decorator in town!'));
    for (const [id, n] of owned) {
      const b = el('button', client.building.item === id ? 'selected' : '', `${iconImg(furnitureIcon(id))}${esc(FURNITURE[id]?.name ?? id)} ×${n}`);
      b.addEventListener('click', () => { client.building.item = id; this.renderBuild(client); });
      this.buildEl.append(b);
    }
    this.buildEl.append(el('p', 'muted small-note', 'E place · R turn · X pick up · B done'));
  }

  closeBuild() {
    this.buildEl?.remove();
    this.buildEl = null;
  }

  /** The family chest: move things between your bag and the shared chest. */
  openChest({ storage, onStash }) {
    this.chestStorage = storage;
    this.openModal((box) => {
      box.append(el('h2', null, 'Family chest'), el('p', 'muted', 'Everyone in the family shares this. Move things across with 1 or All.'));
      const cols = el('div', 'shop-cols');
      cols.append(this.stashCol('Your bag', this.self?.inventory ?? {}, 'in', onStash), this.stashCol('In the chest', this.chestStorage ?? {}, 'out', onStash));
      box.append(cols, closeButton(this));
    });
  }

  setChest(storage) {
    this.chestStorage = storage;
    this.refreshModal?.();
  }

  stashCol(title, items, dir, onStash) {
    const col = el('div', 'shop-col', `<h3>${title}</h3>`);
    const rows = Object.entries(items).filter(([id, n]) => n > 0 && ITEMS[id] && ITEMS[id].kind !== 'currency');
    if (!rows.length) col.append(el('p', 'muted', dir === 'in' ? 'Nothing in your bag.' : 'The chest is empty.'));
    for (const [id, n] of rows) {
      const row = el('div', 'stash-row');
      row.append(el('span', null, `${iconImg(itemIcon(id))}${esc(ITEMS[id].name)} ×${n}`));
      const one = el('button', '', '1');
      one.addEventListener('click', () => onStash(id, 1, dir));
      const all = el('button', 'primary', 'All');
      all.addEventListener('click', () => onStash(id, n, dir));
      row.append(one, all);
      col.append(row);
    }
    return col;
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

  openMenu({ isHost, music, graphics, stats, onSave, onExport, onQuit }) {
    this.openModal((box) => {
      box.append(el('h2', null, 'Paused'), el('p', 'muted', isHost
        ? 'You are the host. Keep this tab open — the world lives here! It autosaves every 30s and when you sleep.'
        : 'The host saves the world. Your progress is kept on their computer.'));
      const actions = el('div', 'menu-actions');
      const add = (label, fn, cls = '') => { const b = el('button', cls, label); b.addEventListener('click', fn); actions.append(b); };
      add('Resume', () => this.closeModal(), 'primary');
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
