/** Explorer gear catalog (M5). Art comes in phase 2; ids are stable save keys. */
export type GearSlot = 'hat' | 'pack' | 'pet';

export interface GearItem {
  id: string;
  name: string;
  slot: GearSlot;
  /** price in coins (40-250) */
  price: number;
}

export const GEAR_SLOTS: GearSlot[] = ['hat', 'pack', 'pet'];
export const SLOT_LABEL: Record<GearSlot, string> = { hat: 'Hats', pack: 'Backpacks', pet: 'Trail pets' };

export const GEAR: GearItem[] = [
  { id: 'hat-conductor', name: 'Conductor Cap', slot: 'hat', price: 40 },
  { id: 'hat-propeller', name: 'Propeller Beanie', slot: 'hat', price: 80 },
  { id: 'hat-tricorn', name: 'Pirate Tricorn', slot: 'hat', price: 120 },
  { id: 'hat-cowboy', name: 'Cowboy Hat', slot: 'hat', price: 160 },
  { id: 'hat-crown', name: 'Golden Crown', slot: 'hat', price: 250 },
  { id: 'pack-satchel', name: 'Canvas Satchel', slot: 'pack', price: 50 },
  { id: 'pack-rucksack', name: 'Explorer Rucksack', slot: 'pack', price: 90 },
  { id: 'pack-bedroll', name: 'Bedroll Pack', slot: 'pack', price: 140 },
  { id: 'pack-rocket', name: 'Rocket Pack', slot: 'pack', price: 220 },
  { id: 'pet-pup', name: 'Trail Pup', slot: 'pet', price: 60 },
  { id: 'pet-parrot', name: 'Parrot', slot: 'pet', price: 100 },
  { id: 'pet-raccoon', name: 'Raccoon', slot: 'pet', price: 150 },
  { id: 'pet-goat', name: 'Baby Goat', slot: 'pet', price: 200 },
];

export const gearItem = (id: string): GearItem | undefined => GEAR.find((g) => g.id === id);
export const isGearId = (v: unknown): v is string => typeof v === 'string' && GEAR.some((g) => g.id === v);
export const gearBySlot = (slot: GearSlot): GearItem[] => GEAR.filter((g) => g.slot === slot);
