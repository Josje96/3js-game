// The people of Pebble Town. Each `n` on the town map (shared/maps.js) is the next one in this
// list. `cls` = which character model, `look` = how they're dressed (see config.js looks),
// `lines` = what they say when you talk to them (one at random); `heroLines` = what they sometimes
// say instead once the family has beaten the Goblin King (the first dungeon's boss: it unlocks the next one);
// `seasonLines` = what they often say in each season, `holidayLines` = what they mostly say on a holiday
// (shared/seasons.js holidayOf). townsfolkLine() below picks one.
import { seasonOf, holidayOf } from './seasons.js';

export const TOWNSFOLK = [
  { name: 'Mayor Pebblebottom', cls: 'Knight', look: { hat: 'tophat', clothes: 'royal', hair: 'suave', hairColor: 'white', face: 'mustache' },
    lines: ['Welcome to Pebble Town, adventurer!', 'Our castle walls keep the goblins out. Mostly.', 'The Old Mine goes down a hundred floors, they say. Nobody has seen the bottom!'],
    heroLines: ['Why, it’s the hero who beat the Goblin King! Pebble Town is proud of you.', 'I’m putting up a statue of you. Well... a small one. Of a slime.', 'That was only the first dungeon. The ruins beyond will test you far harder.'],
    seasonLines: {
      spring: ['Spring in Pebble Town! I had the bunting put up in every colour of the rainbow.', 'Mind the rain, adventurer. I’d lend you my top hat, but it’s far too splendid.'],
      summer: ['A fine summer! Even the fountain looks pleased with itself.', 'I declare this the hottest day of the year. I declare that every day in summer.'],
      autumn: ['Autumn already! The town looks quite distinguished in orange, don’t you think?', 'Mind the leaves on the cobbles. I slipped on one in front of the whole market.'],
      winter: ['Red and green bunting for winter: my own idea, you know.', 'Snow on the rooftops! Pebble Town has never looked so dignified.'],
    },
    holidayLines: {
      easter: ['Happy Easter! Grandma has brought baskets for everyone. Even me, I hope.'],
      solstice: ['The Summer Solstice! The Arena is open. I shall cheer for you from a safe distance.'],
      halloween: ['Happy Halloween! A mayor can’t be seen in a costume, of course. This moustache is entirely real.'],
      christmas: ['Merry Christmas, adventurer! Santa himself is in our town square. What an honour!'],
    } },
  { name: 'Granny Fern', cls: 'Mage', look: { hat: 'flowers', hair: 'bun', hairColor: 'white', face: 'glasses' },
    lines: ['The healing spring fixes any scrape, dear. The fairies love it too.', 'Be home before dark! Night isn’t safe outside the fort.', 'Have you eaten? Bread and pie from the shop keep your strength up.'],
    heroLines: ['Oh my, you beat that big Goblin King? Come here and let me pinch your cheeks!', 'Don’t let it go to your head, dear. The next dungeon is meaner than the first.', 'A hero still needs a good night’s sleep. Home before dark!'],
    seasonLines: {
      spring: ['Spring showers, dear! Wipe your boots before you go home.', 'Smell those blossoms. Spring always makes me feel young again.'],
      summer: ['It’s ever so hot, dear. Have a drink of water and stay in the shade.', 'Summer evenings are lovely and long. Still be home before dark, mind.'],
      autumn: ['Autumn’s here. Time for warm soup and woolly socks, dear.', 'The leaves are turning. Wrap up, it gets chilly in the evenings.'],
      winter: ['Brr! Put a scarf on, dear, you’ll catch your death out here.', 'A cup of cocoa by the fire, that’s what winter is for.'],
    },
    holidayLines: {
      easter: ['Happy Easter, dear! Have you found your basket yet? Don’t eat all the chocolate at once.'],
      solstice: ['The longest day of the year, dear! Don’t you go fighting in that Arena without a good breakfast.'],
      halloween: ['Oh! You gave me a fright in that costume, dear. The cottages have toffee apples for brave little monsters.', 'Happy Halloween! Knock on the cottage doors, they’ve got treats for you.'],
      christmas: ['Merry Christmas, dear! Has Santa given you your present yet? He’s by the fountain.'],
    } },
  { name: 'Pip', cls: 'Rogue', look: { hat: 'none', hair: 'spiky', hairColor: 'ginger', face: 'freckles' },
    lines: ['Race you to the fountain!', 'I hit the training dummy a hundred times today!', 'My mum says pets get stronger every five levels.'],
    heroLines: ['Whoa, you’re the one who beat the Goblin King!? Can I have your autograph?', 'When I grow up I’m gonna beat a dungeon too. Just like you!', 'Did the Goblin King go SPLAT? Tell me it went splat!'],
    seasonLines: {
      spring: ['I jumped in every puddle in town! Don’t tell my mum.', 'I saw a baby bird! It went cheep! Cheep!'],
      summer: ['No more school! It’s summer! Race you to the fountain!', 'I wanna splash in the fountain but the Mayor says it’s “not for splashing”.'],
      autumn: ['I made the biggest leaf pile EVER and then I jumped in it!', 'Halloween is coming! I’m gonna get SO much candy.'],
      winter: ['Snowball fight! You’re it!', 'I made a snowman. He’s got a carrot nose and he’s called Gerald.'],
    },
    holidayLines: {
      easter: ['I found SIX chocolate eggs! Well, I ate four of them. But I found six!'],
      solstice: ['The Arena is open! I’m gonna watch you fight ALL the warriors!'],
      halloween: ['Trick or treat! Ha, got you! Your costume’s cool, but mine’s scarier.', 'Did you knock on all the cottages yet? They give you candy!'],
      christmas: ['SANTA IS HERE! He’s in the square! Go go go!', 'Merry Christmas! I’m gonna be good all year. Starting tomorrow.'],
    } },
  { name: 'Captain Rowan', cls: 'Knight', look: { hat: 'helmet', cape: 'knight', dye: 'ruby' },
    lines: ['Those gates are chained for a reason. Beat a whole dungeon to break the chains on the next.', 'Practice in the training yard — that slime is harmless.', 'Armor takes the sting out of every hit. The shop sells it.'],
    heroLines: ['You may have beaten the first dungeon, but the next will prove a far harder challenge.', 'Well fought against the Goblin King, hero. Now the chains on the next gate are broken.', 'The guards are all talking about you. Don’t get careless out there.'],
    seasonLines: {
      spring: ['On the first day of every season a big boss comes to town. Be ready for it.', 'Rain makes the cobbles slippery. Watch your footing in a fight.'],
      summer: ['Summer heat is hard on a knight in armour. Keep your water flask full.', 'The Solstice Arena opens halfway through summer. Train now, win then.'],
      autumn: ['The nights draw in quickly in autumn. Don’t get caught out after dark.', 'Shorter days, longer shadows. Keep your sword sharp, soldier.'],
      winter: ['Cold steel, colder fingers. Wear your gloves out there.', 'Snow hides the tracks of monsters. Stay alert.'],
    },
    holidayLines: {
      easter: ['Easter or not, I’m on duty. But... I’ll take one chocolate egg.'],
      solstice: ['The Solstice Arena! Three rounds of warriors. Win them all and the Solar Blade is yours.'],
      halloween: ['Halloween. Half the town is dressed as monsters. It makes my job very confusing.'],
      christmas: ['Merry Christmas, soldier. The guards get a day off. Well, half a day.'],
    } },
  { name: 'Willa the Gardener', cls: 'Ranger', look: { hat: 'flowers', hair: 'ponytail', hairColor: 'blonde', cape: 'none' },
    lines: ['I planted the flowers around the spring. Aren’t they lovely?', 'Every twenty levels, the shop gets stronger gear. Keep at it!', 'The fairies only come out for kind adventurers.'],
    heroLines: ['The flowers seem brighter since you beat that Goblin King. Or maybe that’s just me!', 'The goblin-slaying hero! Here, smell this rose. You’ve earned it.', 'Gear from the shop will help in the harder dungeons ahead.'],
    seasonLines: {
      spring: ['Everything is blooming! Spring is my favourite time of year.', 'The rain is good for the flowers. A little wet hair never hurt anybody!'],
      summer: ['The sunflowers are taller than me this summer!', 'I water the flower beds twice a day in summer. They get so thirsty.'],
      autumn: ['Pumpkin season! I grew a pumpkin as big as a cart this year.', 'All the leaves are falling. I’ve swept the square three times today.'],
      winter: ['The garden is asleep under the snow. It’ll wake up again in spring.', 'I’m planning next spring’s flower beds. Tulips everywhere, I think!'],
    },
    holidayLines: {
      easter: ['Happy Easter! I hid a few eggs in the flower beds. Don’t trample the tulips looking for them!'],
      solstice: ['The longest day of the year! More sunshine for the sunflowers.'],
      halloween: ['Do you like my pumpkins? I carved every one of them myself!'],
      christmas: ['Merry Christmas! I put the lights on the trees. Aren’t they pretty at night?'],
    } },
  { name: 'Old Tobias', cls: 'Barbarian', look: { hat: 'none', hair: 'bald', face: 'beard', hairColor: 'white' },
    lines: ['When I was young, I mined copper with my bare hands.', 'Sell the stuff you don’t use. Gold doesn’t grow on trees.', 'They say the Shadow King sits on a dark throne, deep in the Keep...'],
    heroLines: ['Hmph. Beat the Goblin King, did you? I did that in my day. Twice.', 'The first dungeon was the easy one, youngster. The deeper dungeons don’t forgive mistakes.', 'Well done, hero. Truly. But the Shadow King won’t be as kind as the Goblin King.'],
    seasonLines: {
      spring: ['Rain, rain, rain. In my day it only rained on Tuesdays.', 'Spring? Hmph. My knees can tell you when it’s going to rain.'],
      summer: ['Too hot. In my day summer was a sensible temperature.', 'Kids running about everywhere in summer. Mind my toes!'],
      autumn: ['Autumn. Best season. Nobody bothers you and the soup is good.', 'Chilly mornings. My beard keeps my chin warm, at least.'],
      winter: ['Call this cold? I once walked to the mine through snow up to my beard.', 'Winter. Stay by the fire, youngster. That’s what I do.'],
    },
    holidayLines: {
      easter: ['Easter eggs? In my day we got a boiled potato and we were grateful.'],
      solstice: ['Arena fights on the Solstice. I won it three years running, back in my day. Probably.'],
      halloween: ['What are you supposed to be? Hmph. Fine, it’s a good costume. Don’t tell anyone I said so.'],
      christmas: ['Merry Christmas, youngster. Don’t tell the children, but Santa owes me five gold.'],
    } },
  { name: 'Lulu', cls: 'Rogue_Hooded', look: { hat: 'cat', hair: 'pigtails', hairColor: 'pink', cape: 'none' },
    lines: ['Have you met Maple? She’s the fluffiest!', 'The Pet Keeper sells treats. Press G to feed your pet.', 'Once you beat the Goblin King, a fancy Decorator comes to the market!'],
    heroLines: ['It’s the hero! It’s the hero! Maple, look, it’s the hero!', 'You beat the Goblin King! Have you visited the Decorator yet?', 'Maple wants to be a dungeon hero too. She’s practising on my socks.'],
    seasonLines: {
      spring: ['Maple doesn’t like the rain. She hides under my bed until it stops.', 'Maple chased a butterfly all the way round the fountain!'],
      summer: ['Maple loves lying in the sun. She’s so warm and fluffy!', 'It’s summer! Maple and I are having a picnic. You can come!'],
      autumn: ['Maple jumps in the leaf piles! Crunch crunch crunch!', 'I’m dressing Maple up for Halloween. She’s going to be a tiny pumpkin!'],
      winter: ['Maple’s paws got cold in the snow, so I knitted her little socks.', 'Maple and I made a snow cat! It looks just like her!'],
    },
    holidayLines: {
      easter: ['Happy Easter! Maple found an egg and now she won’t give it back.'],
      solstice: ['Are you fighting in the Arena? Maple and I will cheer really loud!'],
      halloween: ['Happy Halloween! I’m a cat, and so is Maple. We match!', 'Trick or treat! Did you knock on the cottage doors yet?'],
      christmas: ['Merry Christmas! Santa gave Maple a bell for her collar! Jingle jingle!'],
    } },
];

const HOLIDAY_CHANCE = 0.7; // on a holiday, how often they talk about it
const SEASON_CHANCE = 0.5;  // on any other day, how often they talk about the season
const HERO_CHANCE = 0.35;   // once the Goblin King is beaten, how often the rest is about that

/** What `who` says today: a holiday line, a season line, a hero line or one of their usual ones. `random` is Math.random or a test's. */
export function townsfolkLine(who, { day, hero = false, random = Math.random }) {
  const pick = (lines) => lines[Math.floor(random() * lines.length)];
  const holiday = holidayOf(day), season = seasonOf(day).id;
  if (holiday && who.holidayLines?.[holiday] && random() < HOLIDAY_CHANCE) return pick(who.holidayLines[holiday]);
  if (who.seasonLines?.[season] && random() < SEASON_CHANCE) return pick(who.seasonLines[season]);
  if (hero && who.heroLines && random() < HERO_CHANCE) return pick(who.heroLines);
  return pick(who.lines);
}
