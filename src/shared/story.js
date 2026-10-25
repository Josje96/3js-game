// The story of Pebble Town: the Heartstone. Long ago a glowing stone in the town fountain kept Pebble Town
// warm and safe (the seasons, the holidays, the fairies). The Shadow King stole it and broke it into three
// shards, hidden at the bottom of the three dungeons; the family brings them home, one dungeon at a time.
// Nothing new is saved for it: the pages and shards follow the bosses already beaten (save.flags) and the
// dungeons already done (save.dungeons[id].completed). Read in the Story book (L), told by the townsfolk
// (townsfolk.js storyLines), shown on the fountain (client LocationView) and in a film for each shard.

/** The three shards: one at the bottom of each dungeon. */
export const SHARD_DUNGEONS = ['mine', 'ruins', 'keep'];

/**
 * The Story book's pages, in order. A page is found once its boss is beaten (`flag`) or its dungeon is
 * done (`done`); the first one is there from the start.
 */
export const STORY_PAGES = [
  { id: 'legend', title: 'The Heartstone',
    text: 'Long ago, a glowing stone sat in the Pebble Town fountain: the Heartstone. It kept the town warm and safe, brought the seasons round, and the fairies loved it. Then one night the Shadow King stole it, and broke it into three shards. He hid one at the bottom of each dungeon, and the monsters have crept up out of the ground ever since. The Mayor gave the empty old fort to a brave new family… that’s you!' },
  { id: 'goblin', flag: 'mineCleared', title: 'The Goblin King’s secret',
    text: 'The Goblin King wasn’t guarding his gold after all. “The tall shadow man told us to keep everyone out of the deep mine,” he grumbled, rubbing his crown. “He said there’s something down there that must never go back up.” The chains on the Old Mine’s deep gates are broken. Down and down you go.' },
  { id: 'tobias', flag: 'lavaCleared', title: 'Old Tobias’s lamp',
    text: 'In the Lava Depths you found a miner’s lamp with “T.” scratched on it. Old Tobias went very quiet when he saw it. “I was the last one down there, forty years ago,” he said. “I saw the shard glowing in the Heart of the Mountain, and something huge curled round it… I ran. I never told anyone.” He gave the lamp back to you. “You finish what I couldn’t.”' },
  { id: 'shard1', done: 'mine', title: 'The first shard',
    text: 'The Ancient Dragon slept curled round the first shard, deep in the Heart of the Mountain. When it fell, the shard rose up all by itself, warm as a cup of cocoa, and floated home with you. Now it glows over the town fountain, and Granny Fern says the fairies are back. But something feels wrong: the chains on the Sunken Ruins have broken too.' },
  { id: 'ruins', flag: 'ruinsCleared', title: 'Footprints in the sand',
    text: 'Down in the Sunken Ruins the Goblin Warlord’s soldiers were all facing the same way: towards the deep water, as if they were waiting for someone. In the wet sand: footprints, long and pointy, that just stop… as if whoever made them turned into a shadow and slid away.' },
  { id: 'scholar', flag: 'ruinsBoss3', title: 'The Scholar’s diary',
    text: 'The Haunted Scholar dropped a soggy diary. “Day 300. The royal wizard Corvin came to the library again, reading about the Heartstone. He says the town loves the stone more than it loves him. He’s jealous of a rock! His little brother, the new Mayor, hasn’t noticed how sad he is…” Corvin? The MAYOR’s brother?' },
  { id: 'captain', flag: 'ruinsBoss6', title: 'The Ghost Captain’s orders',
    text: '“Sail where the wizard tells you, and ask no questions,” say the Ghost Captain’s orders, signed with a big black C. When you showed the Mayor, his moustache drooped. “Corvin… my big brother. He disappeared the same night the Heartstone did. I always hoped he was just lost.”' },
  { id: 'shard2', done: 'ruins', title: 'The second shard (achoo!)',
    text: 'The Leviathan had SWALLOWED the second shard. When you beat it, it gave a gigantic sneeze… ACHOO! …and out the shard shot, right into your hands. Two shards glow over the fountain now, and the snow in winter sparkles again. Far away, the chains on the Shadow Keep crack.' },
  { id: 'gate', flag: 'keepBoss1', title: 'The Shadow Keep',
    text: 'The Gatekeeper wouldn’t fight at first. “He’s not as scary as he looks, the master,” it whispered. “He just never learned how to have friends.” Inside, every room is full of portraits of the same thin man, all on his own: Corvin, the Shadow King.' },
  { id: 'alchemist', flag: 'keepBoss5', title: 'The Mad Alchemist',
    text: 'The Mad Alchemist was trying to brew a potion that makes everyone love you. “The master wanted to bottle it,” it cackled, “so he’d never have to share the town’s love with a STONE again!” You can’t bottle love, of course. Even Pip knows that.' },
  { id: 'lich', flag: 'keepBoss7', title: 'The Burning Library',
    text: 'In the Burning Library the Fire Lich was burning every book about the old Pebble Town: the feasts, the holidays, the family suppers. One book didn’t burn. On its first page: two little boys, holding hands at the fountain. “Corvin & me,” it says, in the Mayor’s handwriting.' },
  { id: 'shard3', done: 'keep', title: 'Home again',
    text: 'The Shadow King fell to his knees on his Dark Throne, and the last shard tumbled out of his crown. When the three shards came together over the fountain, the Heartstone showed everyone what it remembered: Easter baskets, Santa’s sleigh, Halloween candy, two brothers laughing. The shadows melted off him, and there was just Corvin, crying. The Mayor hugged his brother for a very long time. Corvin lives in Pebble Town now. He says sorry to everyone, every day. The end… for now.' },
];

/** How far the family has got: the pages found, the shards brought home (0-3), and the chapter (= shards). */
export function storyProgress(world) {
  const flags = world?.flags ?? {}, dungeons = world?.dungeons ?? {};
  const done = (id) => !!dungeons[id]?.completed;
  const pages = STORY_PAGES.filter((p) => (p.flag ? !!flags[p.flag] : p.done ? done(p.done) : true));
  const shards = SHARD_DUNGEONS.filter(done).length;
  return { pages, shards, chapter: shards, ending: shards === SHARD_DUNGEONS.length };
}
