// The people of Pebble Town. Each `n` on the town map (shared/maps.js) is the next one in this
// list. `cls` = which character model, `look` = how they're dressed (see config.js looks),
// `lines` = what they say when you talk to them (one at random).

export const TOWNSFOLK = [
  { name: 'Mayor Pebblebottom', cls: 'Knight', look: { hat: 'tophat', clothes: 'royal', hair: 'suave', hairColor: 'white', face: 'mustache' },
    lines: ['Welcome to Pebble Town, adventurer!', 'Our castle walls keep the slimes out. Mostly.', 'The Old Mine goes down a hundred floors, they say. Nobody has seen the bottom!'] },
  { name: 'Granny Fern', cls: 'Mage', look: { hat: 'flowers', hair: 'bun', hairColor: 'white', face: 'glasses' },
    lines: ['The healing spring fixes any scrape, dear. The fairies love it too.', 'Be home before dark! Night isn’t safe outside the fort.', 'Have you eaten? Bread and pie from the shop keep your strength up.'] },
  { name: 'Pip', cls: 'Rogue', look: { hat: 'none', hair: 'spiky', hairColor: 'ginger', face: 'freckles' },
    lines: ['Race you to the fountain!', 'I hit the training dummy a hundred times today!', 'My mum says pets get stronger every five levels.'] },
  { name: 'Captain Rowan', cls: 'Knight', look: { hat: 'helmet', cape: 'knight', dye: 'ruby' },
    lines: ['Those gates are chained for a reason. Beat a whole dungeon to break the chains on the next.', 'Practice in the training yard — that slime is harmless.', 'Armor takes the sting out of every hit. The shop sells it.'] },
  { name: 'Willa the Gardener', cls: 'Ranger', look: { hat: 'flowers', hair: 'ponytail', hairColor: 'blonde', cape: 'none' },
    lines: ['I planted the flowers around the spring. Aren’t they lovely?', 'Every twenty levels, the shop gets stronger gear. Keep at it!', 'The fairies only come out for kind adventurers.'] },
  { name: 'Old Tobias', cls: 'Barbarian', look: { hat: 'none', hair: 'bald', face: 'beard', hairColor: 'white' },
    lines: ['When I was young, I mined copper with my bare hands.', 'Sell the stuff you don’t use. Gold doesn’t grow on trees.', 'They say the Shadow King sits on a dark throne, deep in the Keep...'] },
  { name: 'Lulu', cls: 'Rogue_Hooded', look: { hat: 'cat', hair: 'pigtails', hairColor: 'pink', cape: 'none' },
    lines: ['Have you met Maple? She’s the fluffiest!', 'The Pet Keeper sells treats. Press G to feed your pet.', 'Once you beat the King Slime, a fancy Decorator comes to the market!'] },
];
