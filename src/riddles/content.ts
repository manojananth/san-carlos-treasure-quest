import type { ChoiceDef, CipherDef, MapDef, RiddleDef, RiddleStopId, ScrambleDef, Tier } from './types';

/**
 * Riddle pools: at least 3 per stop per tier. Mix per tier: easy = choice + scramble, medium adds cipher,
 * hard adds map, expert = all four with harder wording and multi-step clues.
 * Rules: kid-friendly, fair, only safe facts (1888 sandstone depot, incorporated 1925, "City of Good Living",
 * Caltrain, hills west / Bay east, library beside City Hall, Hiller = flight). Places are described by character.
 * Map riddles point from a stop the player has already seen (distances and compass directions come from the map).
 */
type W3 = [string, string, string];
const choice = (text: string, answer: string, wrong: W3, hint: string): ChoiceDef => ({ kind: 'choice', text, answer, wrong, hint });
const scramble = (text: string, word: string, hint: string): ScrambleDef => ({ kind: 'scramble', text, word, hint });
const cipher = (msg: string, answer: string, wrong: W3, hint: string): CipherDef => ({ kind: 'cipher', msg, answer, wrong, hint });
const map = (text: string, hint: string): MapDef => ({ kind: 'map', text, hint });

/** Generic, real-sounding San Carlos-style places that are NOT quest stops. */
export const ELSEWHERE = ['the Creek Trail', "the Farmers' Market", 'the old Water Tower', 'the Community Pool', 'the Bay Trail', 'the Dog Park'] as const;

export const POOLS: Record<RiddleStopId, Record<Tier, RiddleDef[]>> = {
  laurel: {
    easy: [
      choice('I am a street full of shops, cafés and bakeries. Walk a few steps from the old stone train depot and you will find me. Where am I?', 'Merchant Road', ['Canyon of Echoes', 'Sky Hangar', 'Fort Burton'], 'Think about where you would go to buy a snack or a gift.'),
      choice('Which real street, a short stroll from the depot, is lined with shops, cafés and little stores?', 'Laurel Street', ['the Creek Trail', 'the old Water Tower', 'the Community Pool'], 'You would walk here with a wallet, not a hiking stick.'),
      scramble('The tiles spell the name of the shopping street you are looking for. Which street?', 'LAUREL', 'A laurel is a leafy tree. The street shares its name.'),
    ],
    medium: [
      choice('Shoppers stroll along my sidewalks with bags in their hands. Window displays, café tables and little stores line both sides, close to where the trains stop. Where am I?', 'Merchant Road', ['Hall of Scrolls', 'Summit Outpost', 'Sky Hangar'], 'A merchant is someone who sells things. Which place is about selling?'),
      cipher('SHOPS AND CAFES LINE THIS STREET RIGHT NEXT TO THE STONE DEPOT', 'Merchant Road', ['Hall of Scrolls', 'Canyon of Echoes', 'Fort Burton'], 'The telegram talks about selling and buying.'),
      scramble('A person who sells things in a shop is called a ... ? Unscramble the tiles. (It is also the first word of the stop.)', 'MERCHANT', 'The stop is Merchant Road.'),
    ],
    hard: [
      choice('No dragons here, no secret doors, only awnings, shop signs and the smell of fresh coffee. Travelers who step off the train near the 1888 stone depot wander my sidewalks first. Where am I?', 'Merchant Road', ['Fort Burton', 'the Creek Trail', 'Canyon of Echoes'], 'It is a busy downtown street, not a park and not a trail.'),
      cipher('TRAVELERS WHO STEP OFF THE TRAIN WALK DOWN THIS BUSY STREET OF SHOPS FIRST', 'Merchant Road', ['Sky Hangar', 'Summit Outpost', 'the Community Pool'], 'Which stop is a street, not a park?'),
      map('From the 1888 sandstone depot, the busy downtown street of shops and cafés is only a short walk (about 170 m) to the south-west. Tap Laurel Street on the map.', 'Look for the first stop after Base Camp: the closest one of all.'),
      scramble('The heart of San Carlos, where the stone depot, the shops and the cafés cluster. Unscramble it.', 'DOWNTOWN', 'It is the opposite of uptown, and it has the word TOWN inside.'),
    ],
    expert: [
      choice('I am the first stop after Base Camp, so close that a few steps from the depot is all it takes. I sell nothing myself, yet merchants fill my sidewalks with awnings, café tables and window displays. Name my theme.', 'Merchant Road', ['Hall of Scrolls', 'Summit Outpost', 'Sky Hangar'], 'Number 2 on the quest map. Whoever sells things lives here.'),
      cipher('FROM BASE CAMP WALK A FEW STEPS TO THE STREET OF SHOPS AND CAFES AND BAKERIES', 'Merchant Road', ['Fort Burton', 'Canyon of Echoes', 'the Bay Trail'], 'Which stop is the very closest to Base Camp?'),
      map('Two clues. One: this stop is closer to the depot than any other stop on your quest. Two: it is a street of shops and cafés, a little south-west of the stone depot. Tap its middle.', 'Look just beside the depot, on the street side, not in the hills.'),
      scramble('Say the real name of the shopping street near the depot. Careful: one tile is a trick!', 'LAUREL STREET', 'Two words: the first is the name of a leafy tree.'),
    ],
  },
  cityhall: {
    easy: [
      choice('I am full of books, quiet corners and stories waiting to be read. Bring a library card and you can borrow some. Where am I?', 'Hall of Scrolls', ['Summit Outpost', 'Merchant Road', 'Fort Burton'], 'Scrolls were the books of long ago.'),
      choice('Where do you go to borrow books with a library card? Pick the real building that stands beside City Hall.', 'the San Carlos Library', ['the Community Pool', 'the old Water Tower', "the Farmers' Market"], 'Shhh! It is a quiet place.'),
      scramble('Books, story time and quiet reading corners: what is this building? Unscramble it.', 'LIBRARY', 'You need a library card to borrow here.'),
    ],
    medium: [
      choice('Shhh! Use your inside voice. Shelves of books stretch from floor to ceiling, and the people who help run the city work in the building next to me. Where am I?', 'Hall of Scrolls', ['Canyon of Echoes', 'Sky Hangar', 'Fort Burton'], 'You could read a story here, and you would be asked to be quiet.'),
      cipher('BOOKS FILL THE SHELVES NEXT TO THE BUILDING WHERE THE CITY LEADERS MEET', 'Hall of Scrolls', ['Merchant Road', 'Summit Outpost', 'the Creek Trail'], 'Think about where stories are kept.'),
      scramble('The building where the people who run the city work. Two words! Unscramble them.', 'CITY HALL', 'It sits right next to the library.'),
    ],
    hard: [
      choice('Stories, maps and facts rest on my shelves, and a library card is the only key you need. People call San Carlos the "City of Good Living", and the town hall and I share the same part of town. Where am I?', 'Hall of Scrolls', ['Merchant Road', 'Fort Burton', 'Sky Hangar'], 'Which stop sounds like a place that keeps lots of written pages?'),
      cipher('LIBRARY AND CITY HALL STAND SIDE BY SIDE ON ELM STREET', 'Hall of Scrolls', ['Merchant Road', 'Canyon of Echoes', 'the Farmers\' Market'], 'One of these buildings is full of books.'),
      map('San Carlos calls itself the "City of Good Living". Its City Hall and library stand side by side on Elm Street, a short walk (about 330 m) south of Laurel Street. Tap them.', 'It is the second stop after Base Camp, a little south of Laurel Street.'),
      scramble('The helper who finds you the right book. Unscramble the job title.', 'LIBRARIAN', 'Ask this person where the dinosaur books are.'),
    ],
    expert: [
      choice('San Carlos was incorporated in 1925 and calls itself the City of Good Living. I am the stop next door to where its leaders meet: I keep stories instead of meeting notes, and I am numbered 3 on your quest. Name my theme.', 'Hall of Scrolls', ['Fort Burton', 'Merchant Road', 'Summit Outpost'], 'Scrolls are old-fashioned books.'),
      cipher('THE CITY OF GOOD LIVING KEEPS A HOUSE OF BOOKS NEXT TO CITY HALL ON ELM STREET', 'Hall of Scrolls', ['Canyon of Echoes', 'Sky Hangar', 'the old Water Tower'], 'Where do books live?'),
      map('Three steps. One: start at the depot. Two: pass the street of shops (Laurel Street). Three: a little farther south (about 330 m) is the building where the City of Good Living holds its meetings, with a library beside it. Tap that spot.', 'It is the stop between the shopping street and the big park to the south.'),
      scramble('The words San Carlos uses for itself. Careful: one tile is a trick!', 'GOOD LIVING', 'The full name is the City of ... ?'),
    ],
  },
  burton: {
    easy: [
      choice('Run, kick, throw and cheer! I have wide green fields, a playground and plenty of room for a picnic. Where am I?', 'Fort Burton', ['Hall of Scrolls', 'Merchant Road', 'Canyon of Echoes'], 'It is a park where people play sports.'),
      choice('Which real park, south of City Hall, has wide green fields and a playground?', 'Burton Park', ['the old Water Tower', 'the Community Pool', 'the Creek Trail'], 'A park for games, not a building.'),
      scramble('A meal on a blanket in the grass. Unscramble it.', 'PICNIC', 'You eat it outside on a blanket.'),
    ],
    medium: [
      choice('On a sunny weekend my grass is full of players, families and picnic blankets. Wide open fields, swings and slides are what I am known for. Where am I?', 'Fort Burton', ['Sky Hangar', 'Hall of Scrolls', 'Merchant Road'], 'A fort is a sturdy place. This one is in a sports park.'),
      cipher('WIDE GREEN FIELDS AND A PLAYGROUND WAIT FOR PLAYERS AND PICNICS', 'Fort Burton', ['Hall of Scrolls', 'Summit Outpost', 'the Farmers\' Market'], 'Which stop is a park for games?'),
      scramble('Swings, slides and climbing frames live here. Unscramble the place.', 'PLAYGROUND', 'It is where kids play at the park.'),
    ],
    hard: [
      choice('Stripes mark my grass and cheers fill the air. Bases and goals wait on my fields, and the downtown shops are behind you now. Where am I?', 'Fort Burton', ['Sky Hangar', 'Hall of Scrolls', 'the Creek Trail'], 'You left the downtown shops behind and headed for a big green park.'),
      cipher('A BIG PARK OF PLAYING FIELDS WAITS A SHORT WALK SOUTH OF CITY HALL', 'Fort Burton', ['Merchant Road', 'Canyon of Echoes', 'the Community Pool'], 'The stop after the library is a park for sports.'),
      map('From City Hall, go about 750 m south-south-east (down and slightly right on the map) to the big park with open fields, a playground and picnic spots. Tap the park.', 'Look south of Elm Street, not too far from the library.'),
      scramble('The name of this quest stop, a sturdy place in a sports park. Unscramble it.', 'FORT BURTON', 'It begins with a word for a strong castle.'),
    ],
    expert: [
      choice('I am the fourth stop. Stripes and cheers are my signs, and I lie south of the place where the City of Good Living keeps its books. No shops, no hills, no hangars: only fields. Name my theme.', 'Fort Burton', ['Merchant Road', 'Canyon of Echoes', 'Sky Hangar'], 'Think of a park for games and picnics.'),
      cipher('AFTER THE LIBRARY WALK SOUTH TO WIDE FIELDS WHERE FAMILIES PLAY AND PICNIC', 'Fort Burton', ['Hall of Scrolls', 'Summit Outpost', 'the Bay Trail'], 'Families play ball games here.'),
      map('Two clues. One: it lies south-south-east of City Hall, a bit under a kilometre away. Two: green fields for sports, a playground and picnic spots. Tap its middle.', 'Look for a big green patch below the library.'),
      scramble('The real name of the sports park. Careful: one tile is a trick!', 'BURTON PARK', 'It is the same name as the fort, but ends in PARK.'),
    ],
  },
  bigcanyon: {
    easy: [
      choice('Tall trees shade my trail, a little creek bubbles beside it, and if you shout, your voice comes back to you! Where am I?', 'Canyon of Echoes', ['Merchant Road', 'Sky Hangar', 'Hall of Scrolls'], 'An echo is a sound that bounces back.'),
      choice('Which real park, in the hills west of town, is a wooded canyon with trails to hike?', 'Big Canyon Park', ["the Farmers' Market", 'the Community Pool', 'the old Water Tower'], 'Pack hiking shoes and a water bottle.'),
      scramble('A deep valley with steep sides. Unscramble it.', 'CANYON', 'It is the Big one in the stop name.'),
    ],
    medium: [
      choice('Put on your hiking shoes! I am a wooded trail that winds along a creek between steep hillsides, and every sound bounces off my walls. Where am I?', 'Canyon of Echoes', ['Hall of Scrolls', 'Fort Burton', 'Merchant Road'], 'You will need hiking shoes and a sense of adventure.'),
      cipher('A WOODED TRAIL WINDS BETWEEN STEEP HILLSIDES WHERE ECHOES BOUNCE', 'Canyon of Echoes', ['Summit Outpost', 'Merchant Road', 'the Dog Park'], 'An echo is a sound that comes back.'),
      scramble('Trees, bushes and shade: the trail runs through this kind of land. Unscramble it.', 'WOODLAND', 'It is land full of woods.'),
    ],
    hard: [
      choice('Leaves rustle, water trickles over stones, and the city noise fades away. The ground slopes up on both sides of my path, and my hills lie to the west of downtown. Where am I?', 'Canyon of Echoes', ['Merchant Road', 'Fort Burton', 'the Community Pool'], 'A canyon is a deep valley with steep sides.'),
      cipher('TREES SHADE THE TRAIL AND THE CITY NOISE FADES AWAY IN THE WESTERN HILLS', 'Canyon of Echoes', ['Fort Burton', 'Hall of Scrolls', 'the Farmers\' Market'], 'Which stop is far from the shops?'),
      map('Leave the flat streets behind. From Burton Park the wooded canyon is far to the west-south-west (about 2.2 km), up in the hills. Tap the canyon park.', 'It is the stop furthest to the west on the whole map.'),
      scramble('What you do on foot along a woodland path. Two words! Unscramble them.', 'CANYON TRAIL', 'The path is in the canyon.'),
    ],
    expert: [
      choice('Turn your back on the Bay and climb. West of everything flat, where the hills begin, a shaded trail runs through a canyon, and a shout there comes back to you. Name my theme.', 'Canyon of Echoes', ['Summit Outpost', 'Fort Burton', 'Merchant Road'], 'It is the fifth stop. Echoes!'),
      cipher('TURN YOUR BACK ON THE BAY AND HEAD WEST INTO THE HILLS WHERE A SHADY CANYON TRAIL WAITS', 'Canyon of Echoes', ['Sky Hangar', 'Hall of Scrolls', 'the old Water Tower'], 'Away from the Bay means towards the hills.'),
      map('Two clues. One: this stop is more than two kilometres west-south-west of Burton Park, the farthest west of all your stops. Two: a shady wooded canyon with trails. Tap the canyon park.', 'Go far west, up into the hills.'),
      scramble('The name of the park with the canyon. Careful: one tile is a trick!', 'BIG CANYON', 'Two words. One means huge, one means a deep valley.'),
    ],
  },
  highlands: {
    easy: [
      choice('I sit on top of a hill! From my park you can look out over the town on a clear day. Where am I?', 'Summit Outpost', ['Merchant Road', 'Hall of Scrolls', 'Canyon of Echoes'], 'A summit is the very top of a hill.'),
      choice('Which real park sits high on the hills with views over the town?', 'Highlands Park', ['the Community Pool', 'the old Water Tower', "the Farmers' Market"], 'You have to climb up to reach it.'),
      scramble('The very top of a hill. Unscramble it.', 'SUMMIT', 'A mountain climber wants to reach it.'),
    ],
    medium: [
      choice('Climb up, up, up! My park is high on the hills, with wide views over rooftops and across the Bay. Where am I?', 'Summit Outpost', ['Fort Burton', 'Merchant Road', 'Sky Hangar'], 'After the wooded canyon, the trail keeps climbing.'),
      cipher('THIS PARK SITS HIGH ON A HILL WITH WIDE VIEWS TO THE BAY', 'Summit Outpost', ['Merchant Road', 'Hall of Scrolls', 'the Creek Trail'], 'A lookout place on a hill.'),
      scramble('A high place where you stand and watch far away. Unscramble it.', 'LOOKOUT', 'You look out from here.'),
    ],
    hard: [
      choice('The wind is fresh up here, and the town spreads out like a map below me. Look east and the Bay shimmers in the distance. I am the last hilltop stop on the treasure trail. Where am I?', 'Summit Outpost', ['Canyon of Echoes', 'Merchant Road', 'the Bay Trail'], 'An outpost is a lookout. Which stop sounds like the top of a hill?'),
      cipher('FROM THE TOP OF THE HILL THE TOWN SPREADS OUT AND THE BAY SHIMMERS TO THE EAST', 'Summit Outpost', ['Fort Burton', 'Hall of Scrolls', 'the Community Pool'], 'You are high above the Bay.'),
      map('From Big Canyon Park, climb about 1.1 km north-north-east to the hilltop park where you can see the whole town and the Bay. Tap the park.', 'It is the other hills stop, north of the canyon.'),
      scramble('A park on a hill, with a view. Two words! Unscramble them.', 'HILLTOP PARK', 'The park sits on the top of a hill.'),
    ],
    expert: [
      choice('I am the sixth sign, the last stop of the main trail. I lie to the north of the canyon, and from me you can look east toward the Bay while the town stretches below. Name my theme.', 'Summit Outpost', ['Canyon of Echoes', 'Fort Burton', 'Hall of Scrolls'], 'An outpost on a summit.'),
      cipher('LOOK EAST FROM THIS HILLTOP PARK AND YOU CAN SEE THE BAY AND THE WHOLE TOWN', 'Summit Outpost', ['Merchant Road', 'Sky Hangar', 'the Dog Park'], 'It is high, with a long view.'),
      map('Two clues. One: it lies north-north-east of Big Canyon Park, only about a kilometre away. Two: a hilltop park with a view east over the town to the Bay. Tap it.', 'Go up the hill from the canyon.'),
      scramble('The real name of the hilltop park. Careful: one tile is a trick!', 'HIGHLANDS PARK', 'Hills plus lands. It ends in PARK.'),
    ],
  },
  hiller: {
    easy: [
      choice('Helicopters and airplanes rest inside my big hangar. You can learn all about flying here! Where am I?', 'Sky Hangar', ['Merchant Road', 'Fort Burton', 'Hall of Scrolls'], 'A hangar is a building where aircraft are kept.'),
      choice('Which real museum is all about flight, with helicopters and airplanes?', 'Hiller Aviation Museum', ['the Community Pool', 'the old Water Tower', "the Farmers' Market"], 'Something that flies is on display.'),
      scramble('A big building for parking airplanes. Unscramble it.', 'HANGAR', 'The Sky one is your stop.'),
    ],
    medium: [
      choice('Look up! I am a museum all about flight, with helicopters, airplanes and exhibits about how things fly. Where am I?', 'Sky Hangar', ['Hall of Scrolls', 'Canyon of Echoes', 'Merchant Road'], 'Which place sounds like it belongs to the sky?'),
      cipher('HELICOPTERS AND AIRPLANES REST INSIDE A MUSEUM ALL ABOUT FLIGHT', 'Sky Hangar', ['Summit Outpost', 'Fort Burton', 'the Creek Trail'], 'Which place is full of aircraft?'),
      scramble('A flying machine with spinning blades on top. Unscramble it.', 'HELICOPTER', 'Whirr, whirr, whirr!'),
    ],
    hard: [
      choice('I carry the name of Stanley Hiller, a helicopter pioneer. Spinning rotors and wings of every shape wait inside, and I am all about flight. Where am I?', 'Sky Hangar', ['Summit Outpost', 'Hall of Scrolls', 'the Bay Trail'], 'It is the only stop with aircraft inside.'),
      cipher('SPINNING ROTORS AND WINGS FILL THE MUSEUM BESIDE THE AIRPORT', 'Sky Hangar', ['Canyon of Echoes', 'Merchant Road', 'the Dog Park'], 'It is a museum, and it is not about books.'),
      map('The aviation museum is about 800 m north-east of the old depot, near the Bay side of town, beside the San Carlos Airport on Skyway Road. Tap it.', 'It is the stop furthest to the north-east.'),
      scramble('The science of flying machines. Unscramble the word.', 'AVIATION', 'It starts with AVI, like a bird.'),
    ],
    expert: [
      choice('I am the bonus star, not a numbered stop. No road crosses the sky, yet I teach all about it: rotors, wings and the people who made machines fly. Name my theme.', 'Sky Hangar', ['Summit Outpost', 'Fort Burton', 'Canyon of Echoes'], 'Aircraft! Look up!'),
      cipher('THE BONUS STOP IS A MUSEUM OF FLIGHT WITH HELICOPTERS AND AIRPLANES BESIDE THE AIRPORT', 'Sky Hangar', ['Hall of Scrolls', 'Merchant Road', 'the Community Pool'], 'The bonus star stop is about flying.'),
      map('Two clues. One: this stop is north-east of the depot, nearer to the Bay than any other. Two: it is a museum of airplanes and helicopters on Skyway Road. Tap it.', 'Look east of the depot.'),
      scramble('The kind of museum where helicopters live. Two words! Careful: one tile is a trick!', 'AVIATION MUSEUM', 'The museum is about aviation.'),
    ],
  },
};

export const POOL_STOPS = Object.keys(POOLS) as RiddleStopId[];
