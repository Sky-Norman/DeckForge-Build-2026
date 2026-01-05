export interface CardData {
  Set_Num: number;
  Card_Num: number;
  Name: string;
  Cost: number;
  Inkable: boolean;
  Type: string; // Character, Item, Action, Song, Location
  Class?: string;
  Strength?: number;
  Willpower?: number;
  Lore?: number;
  Rarity: string;
  Image: string;
  Abilities?: string[];
  Flavor_Text?: string;
  
  // Logic Fields
  MoveCost?: number; // For Locations
  Resist?: number;   // Keyword: Resist +X
  Evasive?: boolean; // Keyword: Evasive
}

export interface CardModifiers {
  cantQuest: boolean;
  cantChallenge: boolean;
  frozen: boolean; // If true, does not ready during Ready Phase
  evasiveGranted: boolean; // Temporary Evasive
  resistGranted: number; // Temporary Resist bonus
  strengthBonus: number; // Temporary Strength bonus
}

export interface GameCard extends CardData {
  instanceId: string;
  isExerted: boolean;
  isDried: boolean;
  isFaceDown: boolean;
  damage: number;
  
  // Modifier Engine
  modifiers: CardModifiers;
  
  // Location Mechanics
  currentLocationId?: string; // If character is at a location
}

export enum Zone {
  DECK = 'DECK',
  HAND = 'HAND',
  INKWELL = 'INKWELL',
  FIELD = 'FIELD',
  DISCARD = 'DISCARD'
}

export enum GamePhase {
  READY = 'READY',
  SET = 'SET',    // "Set" Phase: Locations trigger, Start of turn effects
  DRAW = 'DRAW',
  MAIN = 'MAIN',
  END = 'END'
}

export interface PlayerState {
  deck: GameCard[];
  hand: GameCard[];
  inkwell: GameCard[];
  field: GameCard[];
  discard: GameCard[];
  lore: number;
  inkCommitted: boolean;
}

export interface GameState {
  turn: number;
  phase: GamePhase;
  player: PlayerState;
  opponent: PlayerState;
  loading: boolean;
  selectedCardId?: string;
  
  // Heuristics
  loreVelocity: number; // (Current Lore + Board Potential) / Turns
}

// --- LOGIC ENGINE TYPES ---

export type EffectFunction = (state: GameState, sourceCard: GameCard, targetId?: string) => GameState;

export interface CardLogic {
  onPlay?: EffectFunction;
  onQuest?: EffectFunction;
  onChallenge?: EffectFunction;
  onAllyBanished?: EffectFunction;
  onTurnStart?: EffectFunction;
}

export type CardRegistry = Record<string, CardLogic>;