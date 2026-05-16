import type { Dialogue } from '../../types/dialogue';
import coffeeTier1 from './dialogue-coffee-tier1.json';
import supermarketTier1 from './dialogue-supermarket-tier1.json';
import busTier1 from './dialogue-bus-tier1.json';
import neighborTier1 from './dialogue-neighbor-tier1.json';
import emergencyTier1 from './dialogue-emergency-tier1.json';

export const dialogues: Dialogue[] = [
  coffeeTier1 as unknown as Dialogue,
  supermarketTier1 as unknown as Dialogue,
  busTier1 as unknown as Dialogue,
  neighborTier1 as unknown as Dialogue,
  { ...emergencyTier1, emergencyMode: true } as unknown as Dialogue,
];
