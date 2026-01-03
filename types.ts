export interface CardData {
  Set_Num: number;
  Card_Num: number;
  Name: string;
  Cost: number;
  Inkable: boolean;
  Type: string;
  Class?: string; // e.g. Storyborn, Dreamborn
  Strength?: number;
  Willpower?: number;
  Lore?: number;
  Rarity: string;
  Image: string;
  Abilities?: string[];
  Flavor_Text?: string;
}

export interface GameCard extends CardData {
  instanceId: string; // Unique ID for this specific card instance in the game
  isExerted: boolean;
  isDried: boolean; // Summoning sickness
  isFaceDown: boolean; // For Inkwell
  damage: number; // Current damage on the card
}

export enum Zone {
  DECK = 'DECK',
  HAND = 'HAND',
  INKWELL = 'INKWELL',
  FIELD = 'FIELD',
  DISCARD = 'DISCARD'
}

export enum GamePhase {
  READY = 'READY', // Ready, Set
  DRAW = 'DRAW',   // Draw
  MAIN = 'MAIN',   // Main Phase
  END = 'END'      // End of Turn
}

export interface PlayerState {
  deck: GameCard[];
  hand: GameCard[];
  inkwell: GameCard[];
  field: GameCard[];
  discard: GameCard[];
  lore: number;
  inkCommitted: boolean; // Has player inked this turn?
}

export interface GameState {
  turn: number;
  phase: GamePhase;
  player: PlayerState;
  opponent: PlayerState; // Simplified for now
  loading: boolean;
  selectedCardId?: string; // ID of the card currently selected by the player
}

// --- LOGIC ENGINE TYPES ---

export type EffectFunction = (state: GameState, sourceCard: GameCard, targetId?: string) => GameState;

export interface CardLogic {
  // Triggered when the card is played from hand
  onPlay?: EffectFunction;
  
  // Triggered when this card quests
  onQuest?: EffectFunction;
  
  // Triggered when this card challenges (before damage)
  onChallenge?: EffectFunction;

  // Triggered when another ally is banished (For Dr. Facilier)
  onAllyBanished?: EffectFunction;
  
  // Triggered when the turn begins
  onTurnStart?: EffectFunction;
}

// The Registry maps a generic Card ID (Set_Num + Card_Num) to Logic
export type CardRegistry = Record<string, CardLogic>;
