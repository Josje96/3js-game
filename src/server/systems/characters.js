// characters — "Load character": play as a character already in this world who isn't online.
// A player is known by the random id their browser keeps, so a new device, a private window or a
// changed address (the host's IP) used to mean a brand-new character. Now someone the world doesn't
// know is asked "Is one of these you?" when they join, and anyone can switch from the Esc menu.

export const methods = {
  /** The characters nobody is playing right now (not `p`'s own), best first. */
  characterList(p) {
    return Object.entries(this.save.players)
      .filter(([id]) => id !== p.id && !this.players.has(id))
      .map(([id, r]) => ({ id, name: r.name, cls: r.cls, level: r.level ?? 1 }))
      .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  },

  /** Offer the list (`fresh`: they just turned up as someone new). */
  offerCharacters(p, fresh = false) {
    this.send(p, { t: 'ui', kind: 'characters', list: this.characterList(p), fresh });
  },

  on_characters(p) { this.offerCharacters(p); },

  /** Become character `id`: this connection leaves as `p` and joins again as them. */
  on_switchCharacter(p, { id }) {
    const rec = this.save.players[id];
    if (!rec || id === p.id) return;
    if (this.players.has(id)) return this.toast(p, `${rec.name} is already playing.`);
    const entry = [...this.conns].find(([, c]) => c.playerId === p.id);
    if (!entry) return;
    const [connId, c] = entry;
    // a character made just now and never played is a mistake, not a family member: don't keep it
    const blank = p.fresh && p.level === 1 && !p.xp;
    this.writeRecord(p);
    this.leaveLocation(p);
    this.players.delete(p.id);
    this.runHooks('onLeave', p);
    c.playerId = null;
    if (blank) {
      delete this.save.players[p.id];
      delete this.save.house.beds?.[p.id];
    }
    this.onHello(connId, c, { playerId: id, name: rec.name, cls: rec.cls, look: rec.look, isHost: c.isHost });
    if (!blank) this.broadcast({ t: 'toast', text: `${p.name} is now playing as ${rec.name}.` });
    this.persist();
  },
};
