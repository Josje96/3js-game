// Guards against the mistakes that break things quietly: data that points at something
// missing, messages without handlers, saves that no longer load. Run: bun test
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ASSET_SOURCES } from '../scripts/asset-map.mjs';
import { CLIENT_MESSAGES, checkClientMessage } from '../src/shared/protocol.js';
import { GameServer, INTERACTIONS } from '../src/server/GameServer.js';
import { migrate, newSave, MIGRATIONS } from '../src/server/saves.js';
import { ITEMS, SHOP_STOCK, FORGE_RECIPES, DROP_TIERS } from '../src/shared/items.js';
import { DUNGEONS, ENEMIES } from '../src/shared/dungeons.js';
import { PROPS } from '../src/shared/props.js';
import { MAPS, LEGEND } from '../src/shared/maps.js';
import { PET_SPECIES } from '../src/shared/pets.js';
import { PROTOCOL_VERSION, SAVE_VERSION, STYLE_SLOTS, CLASSES } from '../src/shared/config.js';

const ROOT = new URL('..', import.meta.url).pathname;

/** Does a model id like "dungeon/wall" exist in the asset packs? */
function modelExists(id) {
  const [folder, name] = id.split('/');
  return ASSET_SOURCES.some(([from, to]) => to === folder && ['.gltf', '.glb'].some((ext) => existsSync(join(ROOT, 'assets', from, name + ext))));
}

// ------------------------------------------------------------------ protocol

test('protocol: every client message has a server handler, and every handler a schema', () => {
  for (const t of Object.keys(CLIENT_MESSAGES)) {
    if (t === 'hello') continue;
    assert.equal(typeof GameServer.prototype[`on_${t}`], 'function', `no on_${t} handler for message '${t}'`);
  }
  for (const name of Object.getOwnPropertyNames(GameServer.prototype)) {
    if (name.startsWith('on_')) assert.ok(CLIENT_MESSAGES[name.slice(3)], `${name} has no schema in shared/protocol.js`);
  }
});

test('protocol: malformed messages are rejected before they reach a handler', () => {
  assert.equal(checkClientMessage({ t: 'buy', item: 'potion' }), null);
  assert.match(checkClientMessage({ t: 'buy' }), /missing/);
  assert.match(checkClientMessage({ t: 'move', epoch: 1, x: NaN, z: 0, rot: 0, anim: 'idle' }), /x should be num/);
  assert.match(checkClientMessage({ t: 'toString' }), /unknown/);
  assert.match(checkClientMessage(null), /not a message/);
  const server = new GameServer({ save: newSave({ name: 't', seed: 1 }), log: () => {} });
  const conn = { send() {}, onMessage(cb) { this.cb = cb; }, onClose() {} };
  server.addConnection(conn);
  conn.cb({ t: 'hello', protocol: PROTOCOL_VERSION, playerId: 'a', name: 'A', cls: 'Knight' });
  const gold = server.save.players.a.gold ?? server.save.gold;
  conn.cb({ t: 'sell', item: 'potion', qty: '9999' }); // wrong type: dropped
  assert.equal(server.save.players.a.gold ?? server.save.gold, gold);
});

// ------------------------------------------------------------------ content

test('content: every model the game loads exists in the asset packs', async () => {
  const { allModelPaths } = await import('../src/client/assets.js');
  const missing = allModelPaths().filter((id) => !id.startsWith('characters/') && !id.startsWith('anims/') && !modelExists(id));
  assert.deepEqual(missing, [], 'models referenced in items/props/assets.js but not on disk');
  for (const c of Object.values(CLASSES)) assert.ok(modelExists(`characters/${c.model}`), c.model);
});

test('content: shops, drops, recipes, biomes and maps only point at things that exist', () => {
  for (const id of SHOP_STOCK) assert.ok(ITEMS[id]?.price > 0, `shop sells '${id}' without a price`);
  for (const [id, r] of Object.entries(FORGE_RECIPES)) {
    assert.ok(ITEMS[id]?.forged, `recipe '${id}' must be an item with forged: true`);
    for (const need of Object.keys(r.needs)) assert.ok(ITEMS[need], `recipe '${id}' needs unknown '${need}'`);
  }
  for (const tier of DROP_TIERS) for (const id of tier.items) assert.ok(ITEMS[id], `drop tier has unknown '${id}'`);
  for (const [id, d] of Object.entries(DUNGEONS)) {
    for (let floor = 1; floor <= d.floors; floor++) {
      const biome = d.biomes[Math.floor((floor - 1) / 10)];
      for (const e of biome.enemies(floor)) assert.ok(ENEMIES[e], `${id} floor ${floor}: unknown enemy '${e}'`);
      for (const ore of Object.keys(biome.ores(floor))) assert.ok(ITEMS[ore], `${id} floor ${floor}: unknown ore '${ore}'`);
      assert.ok(ENEMIES[biome.boss.variant], `${id}: unknown boss '${biome.boss.variant}'`);
    }
  }
  for (const [ch, leg] of Object.entries(LEGEND)) if (leg.prop) assert.ok(PROPS[leg.prop], `map letter '${ch}' uses unknown prop '${leg.prop}'`);
  for (const map of Object.values(MAPS)) for (const row of map.rows) for (const ch of row) assert.ok(LEGEND[ch], `map uses unknown letter '${ch}'`);
  for (const [id, prop] of Object.entries(PROPS)) {
    if (prop.interact) assert.ok(INTERACTIONS[prop.interact], `prop '${id}' has interact '${prop.interact}' but no system handles it`);
  }
  for (const [slot, table] of Object.entries(STYLE_SLOTS)) {
    for (const [id, def] of Object.entries(table)) assert.ok(def.name, `${slot}:${id} needs a name`);
  }
  for (const [id, s] of Object.entries(PET_SPECIES)) assert.equal(s.forms.length, 3, `pet '${id}' needs 3 forms`);
});

// ------------------------------------------------------------------ saves

const FIXTURES = join(ROOT, 'test', 'fixtures');

test('saves: every old save in test/fixtures loads, upgrades and plays', () => {
  assert.equal(MIGRATIONS.at(-1).version, SAVE_VERSION);
  const files = readdirSync(FIXTURES).filter((f) => f.startsWith('save-'));
  assert.ok(files.length > 0);
  for (const f of files) {
    const save = migrate(JSON.parse(readFileSync(join(FIXTURES, f), 'utf8')));
    assert.equal(save.version, SAVE_VERSION, f);
    // a fresh save has every field the game expects; an upgraded one must too
    const fresh = newSave({ name: 'x', seed: 1 });
    for (const key of Object.keys(fresh)) assert.ok(key in save, `${f}: missing '${key}' after upgrade`);
    // ...and it must actually run: everyone joins, walks around, sleeps
    const server = new GameServer({ save, log: (...a) => { throw new Error(`${f}: ${a.join(' ')}`); } });
    for (const id of Object.keys(save.players)) {
      const conn = { send() {}, onMessage(cb) { this.cb = cb; }, onClose() {} };
      server.addConnection(conn);
      conn.cb({ t: 'hello', protocol: PROTOCOL_VERSION, playerId: id, name: save.players[id].name, cls: save.players[id].cls });
    }
    for (let i = 0; i < 40; i++) server.step(0.05);
    server.persist();
    assert.doesNotThrow(() => migrate(JSON.parse(JSON.stringify(save))), `${f}: upgrading twice must be harmless`);
  }
});

test('saves: a save from a newer game, or something that is not a save, is refused', () => {
  assert.throws(() => migrate({ ...newSave({ name: 'x', seed: 1 }), version: SAVE_VERSION + 1 }), /newer/);
  assert.throws(() => migrate({ hello: 1 }), /Not a save/);
});
