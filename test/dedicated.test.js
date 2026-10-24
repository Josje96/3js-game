// The dedicated server (dedicated/server.mjs): players join over a WebSocket, the world is saved
// to files (safely, with backups) and comes back after a restart.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../dedicated/server.mjs';
import { FileStorage } from '../dedicated/filestore.mjs';
import { PROTOCOL_VERSION } from '../src/shared/config.js';
import { looksLikeAddress, serverSocketUrl } from '../src/net/transports.js';

/** Open a socket to the server and collect its messages. */
function player(port) {
  const ws = new WebSocket(`ws://localhost:${port}/ws`);
  const got = [];
  ws.onmessage = (e) => got.push(JSON.parse(e.data));
  const opened = new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const waitFor = async (t, ms = 3000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const m = got.find((x) => x.t === t);
      if (m) return m;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error(`no ${t} message`);
  };
  return { ws, got, opened, waitFor, send: (m) => ws.send(JSON.stringify(m)) };
}

test('dedicated server: players join over a WebSocket and the world is saved to disk', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'fdg-worlds-'));
  const quiet = () => {};
  try {
    let server = startServer({ port: 0, dataDir, world: 'Test World', seed: 'abc', staticDir: null, log: quiet });
    const info = await (await fetch(`http://localhost:${server.port}/fdg-server`)).json();
    assert.equal(info.world, 'Test World');
    assert.equal(info.protocol, PROTOCOL_VERSION, 'the title screen can check the versions match');

    const a = player(server.port);
    await a.opened;
    a.send({ t: 'hello', protocol: PROTOCOL_VERSION, playerId: 'p-alice', name: 'Alice', cls: 'Mage' });
    const welcome = await a.waitFor('welcome');
    assert.equal(welcome.you, 'p-alice');
    assert.equal((await (await fetch(`http://localhost:${server.port}/fdg-server`)).json()).online, 1, 'the server counts who is on');

    a.ws.close();
    await new Promise((r) => setTimeout(r, 100));
    server.stop(); // saves
    assert.ok(readdirSync(dataDir).some((f) => f.startsWith('fdg.save.')), 'the world is a file in the worlds folder');

    // restart: the same world (and Alice) come back
    server = startServer({ port: 0, dataDir, world: 'test world', staticDir: null, log: quiet });
    assert.equal(server.game.save.seed, 'abc', 'found by name, not made again');
    assert.equal(server.game.save.players['p-alice']?.name, 'Alice', 'Alice is remembered');
    server.stop();
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test('dedicated server: saves are written whole (temp file + rename) and backed up', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fdg-files-'));
  try {
    const fs = new FileStorage(dir);
    fs.setItem('fdg.save.w1', '{"v":1}');
    fs.setItem('fdg.save.w1', '{"v":2}');
    assert.equal(fs.getItem('fdg.save.w1'), '{"v":2}');
    assert.ok(!existsSync(join(dir, 'fdg.save.w1.json.tmp')), 'no temp file left behind');
    assert.equal(readdirSync(join(dir, 'backups')).length, 1, 'the old version was backed up');
    fs.setItem('fdg.save.w1', '{"v":3}');
    assert.equal(readdirSync(join(dir, 'backups')).length, 1, 'but not again within ten minutes');
    assert.equal(fs.getItem('nothing.here'), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('dedicated server: with no world named, it reopens the one played last (e.g. just imported)', () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'fdg-worlds-'));
  const quiet = () => {};
  try {
    let server = startServer({ port: 0, dataDir, world: 'Imported Smiths', staticDir: null, log: quiet });
    server.stop();
    server = startServer({ port: 0, dataDir, staticDir: null, log: quiet });
    assert.equal(server.game.save.name, 'Imported Smiths', 'not a fresh "Our World"');
    server.stop();
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test('join box: a 5-letter code is a family code, anything else is a server address', () => {
  for (const code of ['ABCDE', 'k3m9x']) assert.equal(looksLikeAddress(code), false, code);
  for (const addr of ['192.168.0.22:8080', 'localhost', 'myserver.net', 'http://x.y']) assert.equal(looksLikeAddress(addr), true, addr);
  assert.equal(serverSocketUrl('192.168.0.22:8080', 'http:'), 'ws://192.168.0.22:8080/ws');
  assert.equal(serverSocketUrl('https://play.example.com', 'http:'), 'wss://play.example.com/ws');
  assert.equal(serverSocketUrl('myserver.net:9000', 'https:'), 'wss://myserver.net:9000/ws');
});
