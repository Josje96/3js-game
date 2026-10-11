// Where each model folder comes from. Model ids in the game look like "dungeon/wall":
// the folder ("dungeon") maps to a source directory below, and the file is wall.gltf or wall.glb.
// Used by sync-assets.mjs (copies them into public/models) and by the content tests.
export const ASSET_SOURCES = [
  ['KayKit_Dungeon_Pack_1.1_FREE/Assets/gltf', 'dungeon'],
  ['KayKit_BlockBits_1.0_FREE/Assets/gltf', 'blocks'],
  ['KayKit_Adventurers_2.0_FREE/Assets/gltf', 'items'],
  ['KayKit_Adventurers_2.0_FREE/Characters/gltf', 'characters'],
  ['KayKit_Adventurers_2.0_FREE/Animations/gltf/Rig_Medium', 'anims'],
  ['generated', 'anims'],        // our own animation clips (bun run make-anims)
];
