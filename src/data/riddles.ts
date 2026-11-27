import type { StopId } from './stops';

export type Tier = 'easy' | 'medium' | 'hard';

export interface Riddle {
  text: string;
  /** Exactly 3 choices (theme names; one may be a made-up decoy place). */
  choices: [string, string, string];
  /** index into `choices` of the right answer */
  answer: 0 | 1 | 2;
  hint: string;
}

/** Riddles for every stop after the depot: you solve the riddle to learn where the next stop is. */
export type RiddleStopId = Exclude<StopId, 'depot'>;
export const RIDDLES: Record<RiddleStopId, Record<Tier, Riddle>> = {
  laurel: {
    easy: {
      text: 'I am a street full of shops, cafés and bakeries. Walk a few steps from the old stone train depot and you will find me. Where am I?',
      choices: ['Merchant Road', 'Canyon of Echoes', 'Sky Hangar'],
      answer: 0,
      hint: 'Think about where you would go to buy a snack or a gift.',
    },
    medium: {
      text: 'Shoppers stroll along my sidewalks with bags in their hands. Window displays, café tables and little stores line both sides, close to where the trains stop. Where am I?',
      choices: ['Hall of Scrolls', 'Merchant Road', 'Whispering Pier'],
      answer: 1,
      hint: 'A merchant is someone who sells things. Which place is about selling?',
    },
    hard: {
      text: 'No dragons here, no secret doors, only awnings, shop signs and the smell of fresh coffee. Travelers who step off the train near the 1888 stone depot wander my sidewalks first. Where am I?',
      choices: ['Fort Burton', 'Whispering Pier', 'Merchant Road'],
      answer: 2,
      hint: 'It is a busy downtown street, not a park and not a harbor.',
    },
  },
  cityhall: {
    easy: {
      text: 'I am full of books, quiet corners and stories waiting to be read. Bring a library card and you can borrow some. Where am I?',
      choices: ['Summit Outpost', 'Merchant Road', 'Hall of Scrolls'],
      answer: 2,
      hint: 'Scrolls were the books of long ago.',
    },
    medium: {
      text: 'Shhh! Use your inside voice. Shelves of books stretch from floor to ceiling, and the people who help run the city work in the building next to me. Where am I?',
      choices: ['Canyon of Echoes', 'Sky Hangar', 'Hall of Scrolls'],
      answer: 2,
      hint: 'You could read a story here, and you would be asked to be quiet.',
    },
    hard: {
      text: 'Stories, maps and facts rest on my shelves, and a library card is the only key you need. People call San Carlos the "City of Good Living", and the town hall and I share the same part of town. Where am I?',
      choices: ['Hall of Scrolls', 'Lava Lighthouse', 'Fort Burton'],
      answer: 0,
      hint: 'Which stop sounds like a place that keeps lots of written pages?',
    },
  },
  burton: {
    easy: {
      text: 'Run, kick, throw and cheer! I have wide green fields, a playground and plenty of room for a picnic. Where am I?',
      choices: ['Hall of Scrolls', 'Fort Burton', 'Whispering Pier'],
      answer: 1,
      hint: 'It is a park where people play sports.',
    },
    medium: {
      text: 'On a sunny weekend my grass is full of players, families and picnic blankets. Wide open fields, swings and slides are what I am known for. Where am I?',
      choices: ['Fort Burton', 'Merchant Road', 'Canyon of Echoes'],
      answer: 0,
      hint: 'A fort is a sturdy place. This one is in a sports park.',
    },
    hard: {
      text: 'Stripes mark my grass and cheers fill the air. Bases and goals wait on my fields, and the downtown shops are behind you now. Where am I?',
      choices: ['Sky Hangar', 'Fort Burton', 'Moonlit Meadow'],
      answer: 1,
      hint: 'You left the downtown shops behind and headed for a big green park.',
    },
  },
  bigcanyon: {
    easy: {
      text: 'Tall trees shade my trail, a little creek bubbles beside it, and if you shout, your voice comes back to you! Where am I?',
      choices: ['Canyon of Echoes', 'Merchant Road', 'Sky Hangar'],
      answer: 0,
      hint: 'An echo is a sound that bounces back.',
    },
    medium: {
      text: 'Put on your hiking shoes! I am a wooded trail that winds along a creek between steep hillsides, and every sound bounces off my walls. Where am I?',
      choices: ['Hall of Scrolls', 'Canyon of Echoes', 'Fort Burton'],
      answer: 1,
      hint: 'You will need hiking shoes and a sense of adventure.',
    },
    hard: {
      text: 'Leaves rustle, water trickles over stones, and the city noise fades away. The ground slopes up on both sides of my path, and my hills lie to the west of downtown. Where am I?',
      choices: ['Whispering Pier', 'Canyon of Echoes', 'Merchant Road'],
      answer: 1,
      hint: 'A canyon is a deep valley with steep sides.',
    },
  },
  highlands: {
    easy: {
      text: 'I sit on top of a hill! From my park you can look out over the town on a clear day. Where am I?',
      choices: ['Merchant Road', 'Hall of Scrolls', 'Summit Outpost'],
      answer: 2,
      hint: 'A summit is the very top of a hill.',
    },
    medium: {
      text: 'Climb up, up, up! My park is high on the hills, with wide views over rooftops and across the Bay. Where am I?',
      choices: ['Fort Burton', 'Whispering Pier', 'Summit Outpost'],
      answer: 2,
      hint: 'After the wooded canyon, the trail keeps climbing.',
    },
    hard: {
      text: 'The wind is fresh up here, and the town spreads out like a map below me. Look east and the Bay shimmers in the distance. I am the last hilltop stop on the treasure trail. Where am I?',
      choices: ['Summit Outpost', 'Canyon of Echoes', 'Lava Lighthouse'],
      answer: 0,
      hint: 'An outpost is a lookout. Which stop sounds like the top of a hill?',
    },
  },
  hiller: {
    easy: {
      text: 'Helicopters and airplanes rest inside my big hangar. You can learn all about flying here! Where am I?',
      choices: ['Merchant Road', 'Sky Hangar', 'Fort Burton'],
      answer: 1,
      hint: 'A hangar is a building where aircraft are kept.',
    },
    medium: {
      text: 'Look up! I am a museum all about flight, with helicopters, airplanes and exhibits about how things fly. Where am I?',
      choices: ['Sky Hangar', 'Hall of Scrolls', 'Canyon of Echoes'],
      answer: 0,
      hint: 'Which place sounds like it belongs to the sky?',
    },
    hard: {
      text: 'I carry the name of Stanley Hiller, a helicopter pioneer. Spinning rotors and wings of every shape wait inside, and I am all about flight. Where am I?',
      choices: ['Whispering Pier', 'Summit Outpost', 'Sky Hangar'],
      answer: 2,
      hint: 'It is the only stop with aircraft inside.',
    },
  },
};

export const getRiddle = (stop: StopId, tier: Tier): Riddle | null =>
  stop === 'depot' ? null : RIDDLES[stop][tier];
