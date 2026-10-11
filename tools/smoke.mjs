// Headless browser check: opens the game in Chrome, makes a world, visits places, saves
// screenshots and fails if the page logs errors. For people and AI agents alike.
//
//   bun run dev                                   (in another terminal)
//   bun tools/smoke.mjs                           default tour: fort, town, mine floor 1
//   bun tools/smoke.mjs --url http://localhost:5173 --out /tmp/shots --steps my-steps.mjs
//
// A steps file default-exports `async ({ ev, shot, wait, server }) => {...}`:
//   ev(js)      run JS in the page (async allowed), returns the value
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
  '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`,
  `--user-data-dir=${join(OUT, '.chrome-profile')}`, 'about:blank',
], { stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let tabs = null;
for (let i = 0; i < 40 && !tabs; i++) { await wait(250); try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch {} }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let id = 0;
const pending = new Map();
const problems = [];
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result ?? d.error); pending.delete(d.id); return; }
  if (d.method === 'Runtime.exceptionThrown') problems.push(`EXCEPTION ${d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text}`);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') problems.push(`console.error ${d.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 600)}`);
};
await send('Runtime.enable');
await send('Page.enable');

const ev = async (js) => {
  const r = await send('Runtime.evaluate', { expression: `(async () => { ${js} })()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result?.value;
};
const server = (js) => ev(`const s = window.game.server; const me = [...s.players.values()][0]; ${js}`);
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
  writeFileSync(join(OUT, `${name}.jpg`), Buffer.from(r.data, 'base64'));
  console.log(`shot ${join(OUT, `${name}.jpg`)}`);
};

try {
  await send('Page.navigate', { url: `${URL_}${URL_.includes('?') ? '&' : '?'}net=tabs` });
  await wait(3500);
  if (args.title !== undefined) await shot('title');
  await ev(`document.querySelector('#name').value = 'Tester'; document.querySelector('details summary')?.click(); document.querySelector('#new-world').click();`);
  for (let i = 0; i < 60 && !(await ev('return !!window.game?.client?.layout')); i++) await wait(250);
  await wait(1500);
  if (args.steps) {
    const steps = (await import(resolve(args.steps))).default;
    await steps({ ev, server, shot, wait });
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
