// Shared bits for server tests: a world with fake players you can script.
import { GameServer } from '../src/server/GameServer.js';
import { newSave } from '../src/server/saves.js';
import { PROTOCOL_VERSION } from '../src/shared/config.js';

/** A connection that records everything the server sends it. */
export function fakeClient(server, hello) {
  const inbox = [];
  let handler;
  const conn = { send: (m) => inbox.push(m), onMessage: (cb) => { handler = cb; }, onClose: () => {} };
  server.addConnection(conn);
  const c = {
    inbox,
    say: (msg) => handler(msg),
    last: (t) => inbox.filter((m) => m.t === t).at(-1),
    all: (t) => inbox.filter((m) => m.t === t),
    clear: () => { inbox.length = 0; },
  };
  c.say({ t: 'hello', protocol: PROTOCOL_VERSION, ...hello });
  return c;
}

/**
 * A fresh world with players already joined: `world('seed', 'mom', 'kid')`.
 * Returns { server, save, c: { mom: client }, p: { mom: livePlayer } }.
 */
export function world(seed = 'test', ...ids) {
  const save = newSave({ name: 'Test', seed });
  const server = new GameServer({ save, log: () => {} });
  const c = {}, p = {};
  for (const id of ids.length ? ids : ['a']) {
    c[id] = fakeClient(server, { playerId: id, name: id, cls: 'Knight' });
    p[id] = server.players.get(id);
  }
  return { server, save, c, p };
}
