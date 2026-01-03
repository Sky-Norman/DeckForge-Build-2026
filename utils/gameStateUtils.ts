import { GameState, PlayerState, GameCard } from '../types';

/**
 * Creates a deep copy of a single GameCard.
 * Ensures the Abilities array is a new reference to prevent mutation leaks.
 */
export const cloneCard = (card: GameCard): GameCard => {
  return {
    ...card,
    // Deep copy arrays if they exist
    Abilities: card.Abilities ? [...card.Abilities] : undefined,
  };
};

/**
 * Creates a deep copy of a PlayerState.
 * Iterates through all card zones (deck, hand, inkwell, field, discard)
 * and creates new instances of every card.
 */
export const clonePlayerState = (player: PlayerState): PlayerState => {
  return {
    ...player,
    deck: player.deck.map(cloneCard),
    hand: player.hand.map(cloneCard),
    inkwell: player.inkwell.map(cloneCard),
    field: player.field.map(cloneCard),
    discard: player.discard.map(cloneCard),
  };
};

/**
 * Creates a deep copy of the entire GameState.
 * 
 * USAGE:
 * Use this before passing state to the AI logic. 
 * The AI can freely modify the cloned state to test scenarios (questing, challenging)
 * without triggering React re-renders or affecting the actual game board.
 */
export const cloneGameState = (state: GameState): GameState => {
  return {
    ...state,
    player: clonePlayerState(state.player),
    opponent: clonePlayerState(state.opponent),
    // Primitives (turn, phase, loading, etc.) are copied via spread
    // Note: selectedCardId is copied, but usually should be reset in a simulation context
  };
};