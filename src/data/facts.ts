/**
 * Kid-friendly facts and quiz items. Milestone 3 mini-games will draw on these.
 * Only well-known, safe facts: if unsure, it does not belong here.
 */
export interface Fact {
  id: string;
  text: string;
  /** `decoy` is an optional wrong 4th choice (used by Treasure Hunter's four-choice scrolls) */
  quiz?: { q: string; choices: [string, string, string]; answer: 0 | 1 | 2; decoy?: string };
}

export const FACTS: Fact[] = [
  {
    id: 'depot-1888',
    text: 'The San Carlos depot was built in 1888 from sandstone by the Southern Pacific railroad.',
    quiz: { q: 'What kind of stone was used for the 1888 San Carlos depot?', choices: ['Sandstone', 'Marble', 'Brick only'], answer: 0, decoy: 'Granite' },
  },
  {
    id: 'depot-builder',
    text: 'The railroad that built the San Carlos depot was the Southern Pacific.',
    quiz: { q: 'Which railroad built the depot?', choices: ['Pony Express', 'Southern Pacific', 'Union Pacific'], answer: 1, decoy: 'Central Pacific' },
  },
  {
    id: 'incorporated',
    text: 'San Carlos became an official city (it incorporated) in 1925.',
    quiz: { q: 'In what year did San Carlos incorporate?', choices: ['1888', '1925', '2001'], answer: 1, decoy: '1850' },
  },
  {
    id: 'nickname',
    text: 'San Carlos is nicknamed the "City of Good Living".',
    quiz: { q: 'What is the nickname of San Carlos?', choices: ['City of Good Living', 'City of Lost Ships', 'City of Trees'], answer: 0, decoy: 'City of Bridges' },
  },
  {
    id: 'caltrain',
    text: 'Caltrain trains run between San Francisco and San Jose, and they stop in San Carlos.',
    quiz: { q: 'Caltrain runs between San Francisco and which other city?', choices: ['Sacramento', 'San Jose', 'Los Angeles'], answer: 1, decoy: 'Oakland' },
  },
  {
    id: 'hills-west',
    text: 'The hills of San Carlos rise to the west of downtown.',
    quiz: { q: 'In which direction are the hills from downtown San Carlos?', choices: ['West', 'East', 'North'], answer: 0, decoy: 'South' },
  },
  {
    id: 'bay-east',
    text: 'San Francisco Bay lies to the east of San Carlos.',
    quiz: { q: 'Which way would you look from the hills to see the Bay?', choices: ['West', 'East', 'South'], answer: 1, decoy: 'North' },
  },
  {
    id: 'hiller-flight',
    text: 'The Hiller Aviation Museum is all about flight, with helicopters and airplanes to explore.',
    quiz: { q: 'What is the Hiller Aviation Museum about?', choices: ['Cooking', 'Flight', 'Deep-sea diving'], answer: 1, decoy: 'Railroads' },
  },
  {
    id: 'hiller-pioneer',
    text: 'Stanley Hiller was a helicopter pioneer.',
    quiz: { q: 'Stanley Hiller was a pioneer of which flying machine?', choices: ['Helicopters', 'Submarines', 'Hot-air balloons only'], answer: 0, decoy: 'Steam trains' },
  },
  {
    id: 'rotor',
    text: 'The spinning blades on top of a helicopter are called rotors.',
    quiz: { q: 'What are a helicopter\'s spinning blades called?', choices: ['Rotors', 'Rudders', 'Wheels'], answer: 0, decoy: 'Sails' },
  },
  {
    id: 'creek',
    text: 'A creek is a small stream of flowing water.',
    quiz: { q: 'What is a creek?', choices: ['A small stream', 'A kind of hill', 'A train track'], answer: 0, decoy: 'A kind of tree' },
  },
  {
    id: 'summit',
    text: 'The summit is the very top of a hill or mountain.',
    quiz: { q: 'What is the summit of a hill?', choices: ['The bottom', 'The very top', 'The shadow'], answer: 1, decoy: 'The middle' },
  },
  {
    id: 'compass',
    text: 'A compass rose on a map shows the four directions: north, east, south and west.',
    quiz: { q: 'Which is NOT one of the four main directions?', choices: ['North', 'Northeast', 'South'], answer: 1, decoy: 'East' },
  },
  {
    id: 'library-card',
    text: 'A library card lets you borrow books.',
  },
];
