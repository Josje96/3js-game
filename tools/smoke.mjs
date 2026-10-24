// Headless browser check: opens the game in Chrome, makes a world, visits places, saves
// screenshots and fails if the page logs errors. For people and AI agents alike.
//
//   bun run dev                                   (in another terminal)
//   bun tools/smoke.mjs                           default tour: fort, town, mine floor 1
//   bun tools/smoke.mjs --url http://localhost:5173 --out /tmp/shots --steps my-steps.mjs
//   bun tools/smoke.mjs --guest peer      a second tab joins over real WebRTC (PeerJS, needs internet)
//   bun tools/smoke.mjs --guest tabs      ...or over BroadcastChannel (no network)
//   bun tools/smoke.mjs --url http://localhost:8080 --dedicated [--guest x]   play on a dedicated server (bun run server);
//                                         `server(js)` is not available then (the world runs in another process)
//
// A steps file default-exports `async ({ ev, shot, wait, server, guest }) => {...}`:
//   ev(js)      run JS in the page (async allowed), returns the value
//   guest       with --guest: { ev(js), shot(name) } for the second player's tab
//   server(js)  run JS with `s` = the host's GameServer and `me` = your player
//   shot(name)  save <out>/<name>.jpg          wait(ms)  sleep
// window.game.client / window.game.server are the client and the host's server.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
const URL_ = args.url ?? 'http://localhost:5173';
const OUT = resolve(args.out ?? '/tmp/fdg-shots');
const PORT = 9300 + Math.floor(Math.random() * 500);
const W = Number(args.width ?? 1280), H = Number(args.height ?? 800);
mkdirSync(OUT, { recursive: true });

const chromeBin = ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'].find(existsSync);
const chrome = spawn(chromeBin, [
  '--headless=new', '--no-sandbox', `--remote-debugging-port=${PORT}`, '--use-gl=angle', '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`,
  `--user-data-dir=${join(OUT, '.chrome-profile')}`, 'about:blank',
], { stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const problems = [];
/** A connection to one browser tab: send DevTools commands, collect its errors. */
async function openTab(wsUrl, label) {
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result ?? d.error); pending.delete(d.id); return; }
    if (d.method === 'Runtime.exceptionThrown') problems.push(`${label} EXCEPTION ${d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text}`);
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') problems.push(`${label} console.error ${d.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 600)}`);
  };
  await send('Runtime.enable');
  await send('Page.enable');
  const ev = async (js) => {
    const r = await send('Runtime.evaluate', { expression: `(async () => { ${js} })()`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result?.value;
  };
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
    writeFileSync(join(OUT, `${name}.jpg`), Buffer.from(r.data, 'base64'));
    console.log(`shot ${join(OUT, `${name}.jpg`)}`);
  };
  return { send, ev, shot };
}

let tabs = null;
for (let i = 0; i < 40 && !tabs; i++) { await wait(250); try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch {} }
const host = await openTab(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl, 'host');
const { send, ev, shot } = host;
const server = (js) => ev(`const s = window.game.server; const me = [...s.players.values()][0]; ${js}`);

try {
  const dedicated = args.dedicated !== undefined; // --dedicated: the URL is a dedicated server (bun run server): join its world
  const netParam = args.guest === 'peer' || dedicated ? '' : 'net=tabs';
  await send('Page.navigate', { url: `${URL_}${URL_.includes('?') ? '&' : '?'}${netParam}` });
  await wait(3500);
  if (args.title !== undefined) await shot('title');
  if (dedicated) {
    for (let i = 0; i < 40 && !(await ev(`return !document.querySelector('#server-play').classList.contains('hidden')`)); i++) await wait(250);
    await ev(`document.querySelector('#name').value = 'Tester'; document.querySelector('#server-join').click();`);
  } else await ev(`document.querySelector('#name').value = 'Tester'; document.querySelector('details summary')?.click(); document.querySelector('#new-world').click();`);
  for (let i = 0; i < 60 && !(await ev('return !!window.game?.client?.layout')); i++) await wait(250);
  await wait(1500);
  let guest = null;
  if (args.guest) {
    // a second player: a new tab that joins with the host's invite code
    let code = dedicated ? 'the server' : null;
    for (let i = 0; i < 80 && !code; i++) { code = await ev('return document.querySelector(".hud-invite .code")?.textContent ?? null'); if (!code) await wait(250); }
    if (!code) throw new Error('the host never got an invite code');
    const join = `${URL_}${URL_.includes('?') ? '&' : '?'}${netParam ? `${netParam}&` : ''}profile=2${dedicated ? '' : `&join=${code}`}`;
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    guest = await openTab(list.find((t) => t.id === targetId).webSocketDebuggerUrl, 'guest');
    await guest.send('Page.navigate', { url: join });
    await wait(3500);
    await guest.ev(`document.querySelector('#name').value = 'Guest'; document.querySelector(${dedicated ? "'#server-join'" : "'#join'"}).click();`);
    for (let i = 0; i < 80 && !(await guest.ev('return !!window.game?.client?.layout')); i++) await wait(250);
    await wait(1500);
    console.log(`guest joined ${code} over ${args.guest}`);
  }
  if (args.steps) {
    const steps = (await import(resolve(args.steps))).default;
    await steps({ ev, server, shot, wait, guest });
  } else {
    await shot('fort');
    await server(`s.travel(me, 'town');`); await wait(2500); await shot('town');
    await server(`s.travel(me, 'mine/1', 'U');`); await wait(2500); await shot('mine-1');
  }
} catch (err) {
  problems.push(`STEP FAILED ${err.message}`);
}
chrome.kill();
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('no errors');
process.exit(0);
