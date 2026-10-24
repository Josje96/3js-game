// A dedicated server, the Minecraft way: one always-on world on this computer that everyone
// connects to by address, whether or not anyone is playing. It runs the same GameServer a host's
// browser tab does, saves to files (worlds/), and serves the game itself, so family members just
// open http://<this computer>:8080 and press Play.
//
//   bun run server                                   build the game, then serve "Our World" on :8080
//   bun dedicated/server.mjs --world "The Smiths"    a world by name (made if it doesn't exist yet);
//                                                    no --world: the world played most recently
//     --port 8080       --data ./worlds    --seed abc (new worlds only)
//     --import save.json   bring in a world downloaded from the game (Esc menu > Download save file)
//
// Stop it with Ctrl+C: it saves first. It also autosaves every AUTOSAVE_SECONDS, and keeps
// rolling backups in worlds/backups.
import { existsSync, readFileSync } from 'node:fs';
import { join, normalize, resolve } from 'node:path';
import { GameServer } from '../src/server/GameServer.js';
import { SaveStore, newSave } from '../src/server/saves.js';
import { makeConnection } from '../src/net/transports.js';
import { PROTOCOL_VERSION } from '../src/shared/config.js';
import { FileStorage } from './filestore.mjs';

const ROOT = resolve(import.meta.dir, '..');

/**
 * Which world to run: one imported now, the one called `world`, or (no name given) the one played
 * most recently; otherwise a new one.
 */
function openWorld(store, { world, seed, importFile, log }) {
  if (importFile) {
    const save = store.import(readFileSync(importFile, 'utf8'));
    log(`Imported "${save.name}" from ${importFile}`);
    return save;
  }
  const saves = store.list(); // (newest first)
  const found = world ? saves.find((s) => s.name.toLowerCase() === world.toLowerCase()) : saves[0];
  if (found) return store.load(found.id);
  const save = newSave({ name: world || 'Our World', seed: seed || Math.random().toString(36).slice(2, 10) });
  store.write(save);
  log(`Made a new world "${save.name}" (seed ${save.seed})`);
  return save;
}

/**
 * Start a server. Returns { port, game, stop() }.
 * `staticDir` = the built game to serve (dist/); null serves only the game connection.
 */
export function startServer({ port = 8080, dataDir = join(ROOT, 'worlds'), world, seed, importFile, staticDir = join(ROOT, 'dist'), log = console.log } = {}) {
  const store = new SaveStore(new FileStorage(dataDir));
  const save = openWorld(store, { world, seed, importFile, log });
  const game = new GameServer({ save, store, worker: false, log });
  game.start();
  const hasClient = staticDir && existsSync(join(staticDir, 'index.html'));

  const http = Bun.serve({
    port,
    fetch(req, server) {
      const url = new URL(req.url);
      if (url.pathname === '/ws') {
        return server.upgrade(req, { data: {} }) ? undefined : new Response('Expected a WebSocket', { status: 400 });
      }
      if (url.pathname === '/fdg-server') { // the title screen asks: is this page from a dedicated server?
        return Response.json({ world: game.save.name, day: game.save.day, online: game.players.size, protocol: PROTOCOL_VERSION });
      }
      if (!hasClient) return new Response('This server has no game files to hand out: run `bun run build` first.', { status: 404 });
      const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\]|\.\.)+/, '');
      const file = Bun.file(join(staticDir, rel || 'index.html'));
      return file.exists().then((ok) => (ok ? new Response(file) : new Response(Bun.file(join(staticDir, 'index.html')))));
    },
    websocket: {
      perMessageDeflate: true, // positions and world updates are JSON: they shrink a lot
      open(ws) {
        const conn = makeConnection((m) => ws.send(JSON.stringify(m)), () => ws.close());
        ws.data.conn = conn;
        game.addConnection(conn);
      },
      message(ws, text) {
        let msg;
        try { msg = JSON.parse(text); } catch { return; }
        ws.data.conn._deliver(msg);
      },
      close(ws) { ws.data.conn?._closed(); },
    },
  });

  log(`"${save.name}" is open on port ${http.port}${hasClient ? `: open http://<this computer's address>:${http.port} to play` : ' (no game files: run `bun run build` to serve the game too)'}`);
  return {
    port: http.port,
    game,
    stop() {
      game.stop(); // (saves)
      http.stop(true);
    },
  };
}

// run from the command line
if (import.meta.main) {
  const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
  const server = startServer({
    port: Number(args.port ?? process.env.PORT ?? 8080),
    dataDir: args.data ? resolve(args.data) : undefined,
    world: args.world,
    seed: args.seed,
    importFile: args.import,
  });
  const shutdown = () => {
    console.log('Saving and stopping…');
    server.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
