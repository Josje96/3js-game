// Title screen + boot. Hosting = run a GameServer in this tab and connect to it
// locally, then open it to guests. Joining = connect to someone else's server.
import '@fontsource/medievalsharp';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './style.css';
import { CLASSES, PROTOCOL_VERSION } from './shared/config.js';
import { randomSeedString } from './shared/rng.js';
import { GameServer } from './server/GameServer.js';
import { SaveStore, newSave } from './server/saves.js';
import { createLocalPair, hostPeer, joinPeer, hostTabs, joinTabs, joinServer, looksLikeAddress } from './net/transports.js';
import { GameClient } from './client/GameClient.js';
import { preloadAll } from './client/assets.js';
import { applyUiTextures } from './client/ui-textures.js';
import { dateLabel } from './shared/seasons.js';

applyUiTextures();

const params = new URLSearchParams(location.search);
// ?net=tabs uses BroadcastChannel instead of WebRTC (test two tabs offline)
const NET = params.get('net') === 'tabs' ? { host: hostTabs, join: joinTabs } : { host: hostPeer, join: joinPeer };
// ?profile=2 lets you keep a second character in the same browser for testing
const PROFILE_KEY = `fdg.profile${params.get('profile') ? `.${params.get('profile')}` : ''}`;

const store = new SaveStore();
const $ = (sel) => document.querySelector(sel);

function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (p?.id) return p;
  } catch { /* fall through */ }
  // crypto.randomUUID only exists on https/localhost, and family devices open http://<lan-ip>:5173
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('');
  return { id: `p${rand}`, name: '', cls: 'Knight' };
}

function saveProfile(p) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

// ------------------------------------------------------------------ title screen

const profile = loadProfile();
const assetsReady = preloadAll((f) => { $('#loading').textContent = f < 1 ? `Loading models… ${Math.round(f * 100)}%` : ''; });
let hero = null; // the 3D preview of your character on the title screen
assetsReady.then(async () => {
  const { HeroStage } = await import('./client/title.js');
  hero = new HeroStage($('#hero-stage'), profile);
  showHero();
}).catch((err) => console.warn('no hero preview', err));
function showHero() {
  hero?.show(profile.cls, profile.look);
  $('#hero-name').textContent = $('#name').value.trim() || profile.cls.replace('_', ' ');
}
$('#name').addEventListener('input', showHero);

function renderClasses() {
  const classes = $('#classes');
  classes.innerHTML = '';
  for (const cls of Object.keys(CLASSES)) {
    const b = document.createElement('button');
    b.textContent = cls.replace('_', ' ');
    b.className = cls === profile.cls ? 'selected' : '';
    b.onclick = () => { profile.cls = cls; renderClasses(); showHero(); };
    classes.append(b);
  }
}

function renderTitle() {
  renderClasses();

  const list = $('#saves');
  list.innerHTML = '';
  const saves = store.list();
  if (!saves.length) list.innerHTML = '<p class="muted">No worlds yet — make one!</p>';
  for (const s of saves) {
    const row = document.createElement('div');
    row.className = 'save-row';
    row.innerHTML = `<div><b></b><br><small class="muted"></small></div>`;
    row.querySelector('b').textContent = s.name;
    row.querySelector('small').textContent = `${dateLabel(s.day)} · ${s.players.join(', ') || 'nobody yet'}`;
    const play = button('Play', 'primary', () => start(() => store.load(s.id)));
    const exp = button('⬇', 'small', () => exportSave(store.load(s.id)));
    exp.title = 'Download save file';
    const del = button('✕', 'small', () => { if (confirm(`Delete "${s.name}" forever?`)) { store.remove(s.id); renderTitle(); } });
    del.title = 'Delete';
    row.append(play, exp, del);
    list.append(row);
  }
}

function button(text, cls, fn) {
  const b = document.createElement('button');
  b.textContent = text;
  b.className = cls;
  b.onclick = fn;
  return b;
}

function readProfile() {
  const name = $('#name').value.trim();
  if (!name) { $('#name').focus(); $('#title-error').textContent = 'Type your name first!'; return false; }
  profile.name = name.slice(0, 20);
  saveProfile(profile);
  return true;
}

function exportSave(save) {
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${save.name.replace(/[^\w-]+/g, '_')}-day${save.day}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

$('#new-world').onclick = () => {
  const name = $('#world-name').value.trim() || 'Our World';
  const seed = $('#world-seed').value.trim() || randomSeedString();
  start(() => { const s = newSave({ name, seed }); store.write(s); return s; });
};

$('#import').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    store.import(await file.text());
    renderTitle();
  } catch (err) {
    $('#title-error').textContent = `Couldn't import: ${err.message}`;
  }
};

/**
 * Join someone else's game: a family code (WebRTC), or a dedicated server's address (WebSocket),
 * given as `server` so the HUD can show it to pass on.
 */
async function join(what, connect, server = null) {
  if (!readProfile()) return;
  setBusy(`Joining ${what}…`);
  try {
    const [conn] = await Promise.all([connect(), assetsReady]);
    showGame();
    const client = new GameClient(conn, profile, { isHost: false, server: !!server, onQuit: () => location.assign(location.pathname), onProfile: saveProfile });
    if (server) client.hud.setInvite({ status: `🏰 Server: ${server}` });
    window.game = { client };
  } catch (err) {
    setBusy(null);
    $('#title-error').textContent = err.message || String(err);
  }
}

$('#join').onclick = () => {
  const typed = $('#code').value.trim();
  if (!typed) { $('#code').focus(); return; }
  if (looksLikeAddress(typed)) join(typed, () => joinServer(typed), typed);
  else join(typed.toUpperCase(), () => NET.join(typed.toUpperCase()));
};
$('#code').addEventListener('input', () => $('#code').classList.toggle('address', looksLikeAddress($('#code').value)));

// Opened from a dedicated server (dedicated/server.mjs)? Then its world is one click away.
fetch('fdg-server').then((r) => (r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : null)).then((info) => {
  if (!info) return;
  $('#server-play').classList.remove('hidden');
  $('#server-world').textContent = info.world;
  $('#server-info').textContent = info.protocol !== PROTOCOL_VERSION
    ? 'The server was updated: refresh this page (Ctrl+F5) to get the new version.'
    : `${dateLabel(info.day)} · ${info.online ? `${info.online} playing now` : 'nobody on yet'} · this world is always on`;
  $('#server-join').onclick = () => join(info.world, () => joinServer(location.host), location.host);
}).catch(() => {});

function setBusy(text) {
  $('#title-error').textContent = '';
  $('#busy').textContent = text ?? '';
  for (const b of document.querySelectorAll('#title button')) b.disabled = !!text;
}

function showGame() {
  hero?.dispose();
  hero = null;
  $('#title').classList.add('hidden');
  $('#game').classList.remove('hidden');
  $('#hud').classList.remove('hidden');
}

// ------------------------------------------------------------------ hosting

async function start(getSave) {
  if (!readProfile()) return;
  setBusy('Starting world…');
  let save;
  try {
    save = getSave();
    await assetsReady;
  } catch (err) {
    setBusy(null);
    $('#title-error').textContent = err.message;
    return;
  }
  const server = new GameServer({ save, store });
  server.start();
  const [mine, theirs] = createLocalPair();
  server.addConnection(theirs);
  showGame();

  let online = null;
  const quit = () => { online?.stop(); server.stop(); location.assign(location.pathname); };
  const client = new GameClient(mine, profile, {
    isHost: true,
    onSave: () => server.persist(),
    onExport: () => { server.persist(); exportSave(save); },
    onQuit: quit,
    onProfile: saveProfile,
  });
  addEventListener('beforeunload', () => server.persist());
  window.game = { client, server }; // handy in the devtools console

  // open the world to the family
  client.hud.setInvite({ isHost: true, status: 'Opening to family…' });
  try {
    online = await NET.host((conn) => server.addConnection(conn));
    client.hud.setInvite({ isHost: true, code: online.code });
    history.replaceState(null, '', location.pathname + location.search);
  } catch (err) {
    console.warn('hosting failed', err);
    client.hud.setInvite({ isHost: true, status: 'Playing solo (couldn’t open online invites)' });
  }
}

$('#name').value = profile.name;
if (params.get('join')) $('#code').value = params.get('join');
renderTitle();
