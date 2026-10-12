// Connections all look the same to the game:
//   { send(msg), onMessage(cb), onClose(cb), close(), sendFast?(msg) }
// `send` is reliable and in order. `sendFast` (WebRTC only) is a second lane that never re-sends a
// lost packet and doesn't wait for earlier ones: perfect for positions, which are out of date by
// the time a re-send would arrive. Without it, one lost packet on Wi-Fi stalls everything behind it.
//
// - LocalPair:        the host's own player <-> the GameServer in the same tab
// - PeerJS (WebRTC):  family members joining over the internet with a room code
// - BroadcastChannel: two tabs in the same browser, no network (dev/testing: ?net=tabs)

import { PEER_PREFIX } from '../shared/config.js';

/** Wrap something with a raw send + event hooks into a buffered Connection. */
function makeConnection(rawSend, rawClose) {
  let onMsg = null, onClose = null, closed = false;
  const queue = [];
  return {
    send: (msg) => { if (!closed) rawSend(msg); },
    onMessage(cb) { onMsg = cb; while (queue.length) cb(queue.shift()); },
    onClose(cb) { onClose = cb; if (closed) cb(); },
    close() { if (!closed) { closed = true; rawClose?.(); onClose?.(); } },
    // used by the transport implementations:
    _deliver(msg) { if (closed) return; if (onMsg) onMsg(msg); else queue.push(msg); },
    _closed() { if (!closed) { closed = true; onClose?.(); } },
  };
}

// ---------------------------------------------------------------- local

export function createLocalPair() {
  // JSON round-trip so single-player behaves exactly like the network.
  const a = makeConnection((m) => { const s = JSON.stringify(m); queueMicrotask(() => b._deliver(JSON.parse(s))); }, () => b._closed());
  const b = makeConnection((m) => { const s = JSON.stringify(m); queueMicrotask(() => a._deliver(JSON.parse(s))); }, () => a._closed());
  return [a, b];
}

// ---------------------------------------------------------------- room codes

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export function makeRoomCode() {
  let s = '';
  for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

// ---------------------------------------------------------------- PeerJS

/** Both ends open the same pre-agreed channel, so no extra handshake is needed. */
const FAST_LANE = { negotiated: true, id: 42, ordered: false, maxRetransmits: 0 };

function wrapDataConnection(dc) {
  const conn = makeConnection((m) => dc.send(m), () => dc.close());
  dc.on('data', (m) => conn._deliver(m));
  dc.on('close', () => conn._closed());
  dc.on('error', () => conn._closed());
  try {
    const fast = dc.peerConnection?.createDataChannel('fast', FAST_LANE);
    if (fast) {
      fast.onmessage = (e) => { try { conn._deliver(JSON.parse(e.data)); } catch {} };
      conn.sendFast = (m) => {
        if (fast.readyState === 'open' && fast.bufferedAmount < 64 * 1024) fast.send(JSON.stringify(m));
        else if (fast.readyState !== 'open') conn.send(m); // not open yet: use the reliable lane
        // (a full buffer means the link is struggling: dropping a position update is the right call)
      };
      conn.stats = () => dc.peerConnection.getStats();
    }
  } catch (err) {
    console.warn('no fast lane, positions use the reliable channel', err);
  }
  return conn;
}

/**
 * Start listening for guests. Resolves with { code, stop() }.
 * Uses the free public PeerJS broker only to introduce browsers; game data
 * then flows directly between them over WebRTC.
 */
export async function hostPeer(onConnection, code = makeRoomCode()) {
  const { Peer } = await import('peerjs');
  for (let attempt = 0; attempt < 3; attempt++) {
    const peer = new Peer(PEER_PREFIX + code);
    try {
      await new Promise((resolve, reject) => {
        peer.on('open', resolve);
        peer.on('error', reject);
      });
    } catch (err) {
      peer.destroy();
      if (err.type === 'unavailable-id') { code = makeRoomCode(); continue; }
      throw err;
    }
    peer.on('connection', (dc) => dc.on('open', () => onConnection(wrapDataConnection(dc))));
    peer.on('disconnected', () => peer.reconnect()); // lost the broker; existing games keep working
    return { code, stop: () => peer.destroy() };
  }
  throw new Error('Could not get a room code');
}

export async function joinPeer(code) {
  const { Peer } = await import('peerjs');
  const peer = new Peer();
  await new Promise((resolve, reject) => {
    peer.on('open', resolve);
    peer.on('error', reject);
  });
  const dc = peer.connect(PEER_PREFIX + code.trim().toUpperCase(), { reliable: true, serialization: 'json' });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Could not reach the host. Check the code?')), 15000);
    dc.on('open', () => { clearTimeout(timer); resolve(); });
    peer.on('error', (err) => {
      clearTimeout(timer);
      reject(err.type === 'peer-unavailable' ? new Error(`No game found with code ${code}`) : err);
    });
  });
  const conn = wrapDataConnection(dc);
  conn.onClose(() => peer.destroy());
  return conn;
}

// ---------------------------------------------------------------- BroadcastChannel (same browser, dev)

export function hostTabs(onConnection, code = makeRoomCode()) {
  const bc = new BroadcastChannel(`fdg-${code}`);
  const conns = new Map();
  bc.onmessage = ({ data }) => {
    if (data.to !== 'host') return;
    if (data.kind === 'open' && !conns.has(data.from)) {
      const conn = makeConnection((m) => bc.postMessage({ from: 'host', to: data.from, kind: 'msg', data: m }));
      conns.set(data.from, conn);
      onConnection(conn);
      bc.postMessage({ from: 'host', to: data.from, kind: 'ack' });
    } else if (data.kind === 'msg') conns.get(data.from)?._deliver(data.data);
    else if (data.kind === 'close') { conns.get(data.from)?._closed(); conns.delete(data.from); }
  };
  addEventListener('beforeunload', () => { for (const id of conns.keys()) bc.postMessage({ from: 'host', to: id, kind: 'close' }); });
  return Promise.resolve({ code, stop: () => bc.close() });
}

export function joinTabs(code) {
  const bc = new BroadcastChannel(`fdg-${code.trim().toUpperCase()}`);
  const id = `tab${Math.random().toString(36).slice(2)}`;
  const conn = makeConnection(
    (m) => bc.postMessage({ from: id, to: 'host', kind: 'msg', data: m }),
    () => bc.postMessage({ from: id, to: 'host', kind: 'close' }),
  );
  addEventListener('beforeunload', () => conn.close());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No tab is hosting ${code}`)), 3000);
    bc.onmessage = ({ data }) => {
      if (data.to !== id) return;
      if (data.kind === 'ack') { clearTimeout(timer); resolve(conn); }
      else if (data.kind === 'msg') conn._deliver(data.data);
      else if (data.kind === 'close') conn._closed();
    };
    bc.postMessage({ from: id, to: 'host', kind: 'open' });
  });
}
