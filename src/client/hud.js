// HTML overlay on top of the 3D canvas.
import { ITEMS, FORGE_RECIPES } from '../shared/items.js';
import { STATS, attackDamage, weaponStat } from '../shared/progression.js';
import { CLASSES, HATS, CAPES, BACKS, DYES, HAIRS, HAIR_COLORS, FACES, SKINS, STYLE_SLOTS, ownsStyle } from '../shared/config.js';
import { PET_SPECIES, EVOLVE_AT, TIER_EVERY, TIER_LOOKS, petFormName, petStage, petTier, petDamage, petXpToNext, petMaxHp, reviveCost } from '../shared/pets.js';

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
    this.toasts = el('div', 'hud-toasts');
    this.chatLog = el('div', 'hud-chat');
    this.chatInput = el('input', 'hud-chat-input');
    this.chatInput.placeholder = 'Say something… (Enter to send, Esc to cancel)';
    this.chatInput.maxLength = 120;
    this.floats = el('div', 'hud-floats');
    this.modal = el('div', 'modal-backdrop hidden');
    this.help = el('div', 'hud-help', 'WASD move · Space/click attack · Shift roll · E interact · Q potion · C character · P pets · Enter chat · M music · Esc menu');
    root.append(this.status, this.invite, this.xp, this.inv, this.promptEl, this.toasts, this.chatLog, this.chatInput, this.floats, this.modal, this.help);
    this.self = null;
    this.world = null;
    this.locTitle = '';
    this.refreshModal = null;
    this.modal.addEventListener('mousedown', (e) => { if (e.target === this.modal) this.closeModal(); });
  }

  // ---------------------------------------------------------------- status

  setSelf(self) { this.self = self; this.renderStatus(); this.renderInv(); this.refreshModal?.(); }
  setWorld(world) { this.world = world; this.renderStatus(); this.refreshModal?.(); }
  setLocation(title) { this.locTitle = title; this.renderStatus(); }

  renderStatus() {
    const s = this.self, w = this.world;
    const hp = s ? `${s.hp}/${s.maxHp}` : '';
    const frac = s ? (s.hp / s.maxHp) * 100 : 100;
    this.renderXp();
    // your pet's health, right under yours
    const pet = s?.pets?.find((x) => x.id === s.pet);
    let petRow = '';
    if (pet) {
      const max = petMaxHp(pet.species, pet.level), pf = pet.fainted ? 0 : (pet.hp / max) * 100;
      petRow = `<div class="pethp${pet.fainted ? ' fainted' : ''}"><div style="width:${pf}%"></div>
        <span>${PET_ICONS[pet.species] ?? '🐾'} ${esc(pet.name)} · Lv ${pet.level} · ${pet.fainted ? 'fainted' : `${pet.hp}/${max}`}</span></div>`;
    }
    this.status.innerHTML = `
      <div class="loc">${esc(this.locTitle)}</div>
      <div class="hpbar"><div style="width:${frac}%"></div><span>❤ ${hp}</span></div>${petRow}
      <div class="row"><span class="gold">🪙 ${w?.gold ?? 0}</span><span>Day ${w?.day ?? 1}</span></div>`;
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
    const weapon = ITEMS[s.weapon];
    const items = Object.entries(s.inventory)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => `<span class="slot" title="${esc(ITEMS[id]?.name ?? id)}">${esc(ITEMS[id]?.name ?? id)} ×${n}</span>`)
      .join('');
    const shield = ITEMS[s.shield];
    const shieldSlot = shield ? `<span class="slot weapon">🛡 ${esc(shield.name)}</span>` : '';
    this.inv.innerHTML = `<span class="slot weapon">⚔ ${esc(weapon?.name ?? s.weapon)} (${weapon?.damage ?? 1})</span>${shieldSlot}${items}`;
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

  confirmBar() {
    const q = this.pendingBuy;
    if (!q) return null;
    const bar = el('div', 'confirm-bar', `<span>${q.label.startsWith('forge ') ? 'Pay to' : 'Buy'} <b>${esc(q.label)}</b> for <span class="gold">🪙 ${q.price}</span>?</span>`);
    const yes = el('button', 'primary', 'Buy it!');
    const no = el('button', '', 'Cancel');
    yes.disabled = (this.world?.gold ?? 0) < q.price;
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
      this.modal.innerHTML = '';
      const box = el('div', 'modal panel');
      render(box);
      const confirm = this.confirmBar();
      if (confirm) box.append(confirm);
      this.modal.append(box);
    };
    this.refreshModal();
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

  openShop({ stock, onBuy, onSell, onBuyStyle }) {
    this.shopTab ??= 'gear';
    this.openModal((box) => {
      const gold = this.world?.gold ?? 0;
      box.append(el('h2', null, `Pebble Town Shop <span class="gold">🪙 ${gold}</span>`));
      const tabs = el('div', 'tabs');
      for (const [id, label] of [['gear', '⚔ Gear'], ['fashion', '👑 Fashion']]) {
        const t = el('button', this.shopTab === id ? 'selected' : '', label);
        t.addEventListener('click', () => { this.shopTab = id; this.refreshModal?.(); });
        tabs.append(t);
      }
      box.append(tabs);
      if (this.shopTab === 'fashion') {
        box.append(this.fashionShop(gold, onBuyStyle), closeButton(this));
        return;
      }
      const cols = el('div', 'shop-cols');
      const buy = el('div', 'shop-col', '<h3>Buy</h3>');
      for (const id of stock) {
        const it = ITEMS[id];
        const stat = it.kind === 'weapon' ? `⚔ ${it.damage}` : it.kind === 'shield' ? `🛡 blocks ${Math.round(it.block * 100)}%` : it.heal ? `❤ +${it.heal}` : '';
        const owned = (it.kind === 'weapon' || it.kind === 'shield') && (this.self?.gear ?? []).includes(id);
        const row = el('button', 'shop-row', `<span>${esc(it.name)} <small>${stat}</small></span><span class="gold">${owned ? '✓' : it.price}</span>`);
        row.disabled = gold < it.price || owned;
        row.addEventListener('click', () => this.askToBuy(it.name, it.price, () => onBuy(id)));
        buy.append(row);
      }
      const sell = el('div', 'shop-col', '<h3>Sell</h3>');
      const loot = Object.entries(this.self?.inventory ?? {}).filter(([id, n]) => ITEMS[id]?.sell && n > 0);
      if (!loot.length) sell.append(el('p', 'muted', 'Nothing to sell. Go mining!'));
      for (const [id, n] of loot) {
        const it = ITEMS[id];
        const row = el('button', 'shop-row', `<span>${esc(it.name)} ×${n}</span><span class="gold">${it.sell} ea</span>`);
        row.addEventListener('click', () => onSell(id, n));
        sell.append(row);
      }
      if (loot.length > 1) {
        const all = el('button', 'primary', `Sell everything (${loot.reduce((a, [id, n]) => a + ITEMS[id].sell * n, 0)} gold)`);
        all.addEventListener('click', () => loot.forEach(([id, n]) => onSell(id, n)));
        sell.append(all);
      }
      cols.append(buy, sell);
      box.append(cols, closeButton(this));
    });
  }

  /** The shop's fashion tab: everything with a price, grouped by slot. */
  fashionShop(gold, onBuyStyle) {
    const wrap = el('div', 'fashion');
    const titles = { hat: 'Hats', back: 'On your back', dye: 'Cape dyes' };
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
      box.append(el('p', 'muted', 'Tip: hats sit on top of hair. Pick "None" for your hat in the wardrobe to show off a hairdo.'));
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
      const gear = [...(s.gear ?? [])].sort((a, b) => (ITEMS[a].kind > ITEMS[b].kind ? -1 : 1));
      for (const id of gear) {
        const it = ITEMS[id];
        const on = id === s.weapon || id === s.shield;
        const stat = it.kind === 'weapon'
          ? `⚔ ${attackDamage(id, s.stats)} <small>${STATS[weaponStat(id)].icon}${it.ranged ? ' ranged' : ''}</small>`
          : `🛡 ${Math.round(it.block * 100)}%`;
        const b = el('button', `shop-row${on ? ' selected' : ''}`, `<span>${esc(it.name)}</span><span>${stat}</span>`);
        b.addEventListener('click', () => (on && it.kind === 'shield' ? onEquip(null, 'shield') : onEquip(id)));
        b.title = on ? (it.kind === 'shield' ? 'Click to put it away' : 'Equipped') : 'Click to equip';
        bag.append(b);
      }
      box.append(bag, closeButton(this));
    });
  }

  openForge({ onForge }) {
    this.openModal((box) => {
      const s = this.self, gold = this.world?.gold ?? 0;
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
        const row = el('div', 'forge-row', `<b>${esc(it.name)} <small class="muted">${stat}</small></b><span class="needs">${needs} · <span class="gold">🪙 ${r.gold}</span></span>`);
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
  openPets({ shop, onBuy, onPick, onRename, onRevive }) {
    const ICONS = PET_ICONS;
    this.openModal((box) => {
      const gold = this.world?.gold ?? 0, mine = this.self?.pets ?? [], current = this.self?.pet ?? null;
      box.append(el('h2', null, `${shop ? 'Pet Keeper' : 'My pets'} <span class="gold">🪙 ${gold}</span>`));
      if (mine.length) {
        box.append(el('p', 'muted', `Pets fight beside you and get a new look every ${TIER_EVERY} levels (they evolve at ${EVOLVE_AT[0]} and ${EVOLVE_AT[1]}). If a pet faints, the Pet Keeper can revive it.`));
        const list = el('div', 'pet-list');
        for (const pet of mine) {
          const stage = petStage(pet.level), max = petMaxHp(pet.species, pet.level);
          const nextTier = (petTier(pet.level) + 1) * TIER_EVERY, nextLook = TIER_LOOKS[petTier(pet.level) + 1];
          const row = el('div', `pet-row${pet.id === current ? ' selected' : ''}${pet.fainted ? ' fainted' : ''}`, `
            <div class="pet-icon">${ICONS[pet.species] ?? '🐾'}${'⭐'.repeat(stage)}</div>
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
              const done = () => { onRename(pet.id, input.value); };
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
        box.append(el('h3', null, 'Adopt a friend'));
        const grid = el('div', 'pet-grid');
        for (const [species, def] of Object.entries(PET_SPECIES)) {
          const owned = mine.some((x) => x.species === species);
          const card = el('div', `pet-card${owned ? ' owned' : ''}`, `<div class="pet-icon">${ICONS[species] ?? '🐾'}</div><b>${esc(def.fixedName ?? def.name)}</b><small class="muted">${esc(def.fixedName ? 'Apricot Maltipoo' : `→ ${def.forms[2]}`)}</small>`);
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

  openMenu({ isHost, music, onSave, onExport, onQuit }) {
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
