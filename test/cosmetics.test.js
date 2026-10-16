// The skin swatch test: hairlessHead and skinSplit tell skin from hair/clothes by the colour of
// the texture swatch under each triangle. These are the swatches measured on the KayKit atlases —
// if this ever breaks, faces get carved away (the scalp ball covers the eyes) or outfits' own
// hair stays behind as shards over the face.
import { describe, expect, test } from 'bun:test';
import { SKIN } from '../src/client/cosmetics.js';

describe('character skin swatches', () => {
  test('light and shadowed skin both count as skin', () => {
    for (const s of [
      [240, 176, 128], // light skin (most outfits)
      [240, 176, 144], // light skin, warm
      [208, 160, 112], // shadowed skin (Knight cheek, Rogue face)
      [208, 176, 112], // shadowed skin, warm
    ]) expect(SKIN(s), `skin ${s}`).toBe(true);
  });

  test('hair, beards, cloth and armor never count as skin', () => {
    for (const s of [
      [160, 144, 144], // Barbarian beard grey
      [144, 80, 64],   // Ranger/Rogue brown hair, leather straps
      [16, 16, 16],    // Mage black hair and eyes
      [32, 32, 32],    // brows and hair
      [160, 96, 64],   // darker leather
      [240, 240, 240], // light grey armor
      [208, 208, 208], // mid grey
      [245, 245, 245], // white cloth
      [100, 180, 120], // green (Rogue_Hooded collar)
    ]) expect(SKIN(s), `non-skin ${s}`).toBe(false);
  });
});

describe('the mirror', () => {
  test('bangs are kept, and unknown ones fall back to none', async () => {
    const { cleanLook, BANGS } = await import('../src/shared/config.js');
    for (const b of Object.keys(BANGS)) expect(cleanLook({ hair: 'bob', bangs: b }).bangs).toBe(b);
    expect(cleanLook({ hair: 'bob', bangs: 'mullet' }).bangs).toBe('none');
    expect(cleanLook({ hair: 'bob' }).bangs).toBe('none'); // older looks have no bangs
  });
});
