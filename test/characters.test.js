// Load character: someone the world doesn't know (new device, private window, a changed address)
// can pick up their old character instead of starting again; anyone can switch from the menu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, fakeClient } from './helpers.js';

test('characters: a stranger joining is offered the characters nobody is playing', () => {
  const { server, save, c, p } = world('chars', 'mom', 'eli');
  p.eli.level = 12;
  c.eli.say({ t: 'switchCharacter', id: 'mom' }); // mom is playing: can't take her
  assert.equal(server.players.get('mom') != null && server.players.get('eli') != null, true);
  // Eli leaves, then comes back from a new device (a new id)
  server.dropConnection([...server.conns].find(([, x]) => x.playerId === 'eli')[0]);
  const eli2 = fakeClient(server, { playerId: 'newid', name: 'Eli', cls: 'Ranger' });
  const offer = eli2.last('ui');
  assert.equal(offer.kind, 'characters');
  assert.equal(offer.fresh, true);
  assert.deepEqual(offer.list.map((x) => [x.id, x.level]), [['eli', 12]], 'mom is online: only Eli is free');
  eli2.say({ t: 'switchCharacter', id: 'eli' });
  assert.equal(eli2.last('welcome').you, 'eli');
  assert.equal(eli2.last('welcome').profile.name, 'eli');
  assert.equal(server.players.get('eli').level, 12, 'his old character, level and all');
  assert.equal(server.players.has('newid'), false);
  assert.equal(save.players.newid, undefined, 'the never-played new character is not kept');
  assert.equal(eli2.last('self').level, 12);
});

test('characters: switching from the menu keeps a played character, and a known player is not asked', () => {
  const { server, save, c, p } = world('chars2', 'mom', 'kid');
  server.dropConnection([...server.conns].find(([, x]) => x.playerId === 'kid')[0]);
  const again = fakeClient(server, { playerId: 'mom2', name: 'x', cls: 'Knight' });
  assert.equal(again.last('ui')?.kind, 'characters');
  const known = fakeClient(server, { playerId: 'kid', name: 'kid', cls: 'Knight' });
  assert.equal(known.all('ui').some((m) => m.kind === 'characters'), false, 'the world knows the kid');
  // mom levels up, then asks for the list and becomes someone else: she is kept
  p.mom.level = 3; p.mom.xp = 10;
  c.mom.say({ t: 'characters' });
  assert.deepEqual(c.mom.last('ui').list.map((x) => x.id), [], 'everyone else is playing');
  server.dropConnection([...server.conns].find(([, x]) => x.playerId === 'mom2')[0]);
  c.mom.say({ t: 'characters' });
  assert.deepEqual(c.mom.last('ui').list.map((x) => x.id), ['mom2']);
  c.mom.say({ t: 'switchCharacter', id: 'mom2' });
  assert.equal(c.mom.last('welcome').you, 'mom2');
  assert.equal(save.players.mom.level, 3, 'mom is still in the save');
});
