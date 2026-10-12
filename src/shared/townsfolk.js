// The people of Pebble Town. Each `n` on the town map (shared/maps.js) is the next one in this
// list. `cls` = which character model, `look` = how they're dressed (see config.js looks),
// `lines` = what they say when you talk to them (one at random); `heroLines` = what they sometimes
// say instead once the family has beaten the King Slime (the first dungeon's boss: it unlocks the next one).

export const TOWNSFOLK = [
  { name: 'Mayor Pebblebottom', cls: 'Knight', look: { hat: 'tophat', clothes: 'royal', hair: 'suave', hairColor: 'white', face: 'mustache' },
    lines: ['Welcome to Pebble Town, adventurer!', 'Our castle walls keep the slimes out. Mostly.', 'The Old Mine goes down a hundred floors, they say. Nobody has seen the bottom!'],
    heroLines: ['Why, it’s the hero who beat the King Slime! Pebble Town is proud of you.', 'I’m putting up a statue of you. Well... a small one. Of a slime.', 'That was only the first dungeon. The ruins beyond will test you far harder.'] },
  { name: 'Granny Fern', cls: 'Mage', look: { hat: 'flowers', hair: 'bun', hairColor: 'white', face: 'glasses' },
    lines: ['The healing spring fixes any scrape, dear. The fairies love it too.', 'Be home before dark! Night isn’t safe outside the fort.', 'Have you eaten? Bread and pie from the shop keep your strength up.'],
    heroLines: ['Oh my, you beat that big King Slime? Come here and let me pinch your cheeks!', 'Don’t let it go to your head, dear. The next dungeon is meaner than the first.', 'A hero still needs a good night’s sleep. Home before dark!'] },
  { name: 'Pip', cls: 'Rogue', look: { hat: 'none', hair: 'spiky', hairColor: 'ginger', face: 'freckles' },
    lines: ['Race you to the fountain!', 'I hit the training dummy a hundred times today!', 'My mum says pets get stronger every five levels.'],
    heroLines: ['Whoa, you’re the one who beat the King Slime!? Can I have your autograph?', 'When I grow up I’m gonna beat a dungeon too. Just like you!', 'Did the King Slime go SPLAT? Tell me it went splat!'] },
  { name: 'Captain Rowan', cls: 'Knight', look: { hat: 'helmet', cape: 'knight', dye: 'ruby' },
    lines: ['Those gates are chained for a reason. Beat a whole dungeon to break the chains on the next.', 'Practice in the training yard — that slime is harmless.', 'Armor takes the sting out of every hit. The shop sells it.'],
    heroLines: ['You may have beaten the first dungeon, but the next will prove a far harder challenge.', 'Well fought against the King Slime, hero. Now the chains on the next gate are broken.', 'The guards are all talking about you. Don’t get careless out there.'] },
  { name: 'Willa the Gardener', cls: 'Ranger', look: { hat: 'flowers', hair: 'ponytail', hairColor: 'blonde', cape: 'none' },
    lines: ['I planted the flowers around the spring. Aren’t they lovely?', 'Every twenty levels, the shop gets stronger gear. Keep at it!', 'The fairies only come out for kind adventurers.'],
    heroLines: ['The flowers seem brighter since you beat that King Slime. Or maybe that’s just me!', 'The slime-slaying hero! Here, smell this rose. You’ve earned it.', 'Gear from the shop will help in the harder dungeons ahead.'] },
  { name: 'Old Tobias', cls: 'Barbarian', look: { hat: 'none', hair: 'bald', face: 'beard', hairColor: 'white' },
    lines: ['When I was young, I mined copper with my bare hands.', 'Sell the stuff you don’t use. Gold doesn’t grow on trees.', 'They say the Shadow King sits on a dark throne, deep in the Keep...'],
    heroLines: ['Hmph. Beat the King Slime, did you? I did that in my day. Twice.', 'The first dungeon was the easy one, youngster. The deeper dungeons don’t forgive mistakes.', 'Well done, hero. Truly. But the Shadow King won’t be as kind as the King Slime.'] },
  { name: 'Lulu', cls: 'Rogue_Hooded', look: { hat: 'cat', hair: 'pigtails', hairColor: 'pink', cape: 'none' },
    lines: ['Have you met Maple? She’s the fluffiest!', 'The Pet Keeper sells treats. Press G to feed your pet.', 'Once you beat the King Slime, a fancy Decorator comes to the market!'],
    heroLines: ['It’s the hero! It’s the hero! Maple, look, it’s the hero!', 'You beat the King Slime! Have you visited the Decorator yet?', 'Maple wants to be a dungeon hero too. She’s practising on my socks.'] },
];
