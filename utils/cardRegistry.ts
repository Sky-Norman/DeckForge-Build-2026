import { CardLogic, GameState, GameCard, CardRegistry } from '../types';

// Helper to generate a lookup key from set and card number
export const getCardId = (setNum: number, cardNum: number) => `${setNum}-${cardNum}`;

// --- MECHANIC IMPLEMENTATIONS ---

const mechanic_BanishAllCharacters: CardLogic = {
  onPlay: (state: GameState, sourceCard: GameCard) => {
    // 1. Move all Player characters to Discard
    const playerDiscards = [...state.player.discard, ...state.player.field];
    
    // 2. Move all Opponent characters to Discard
    const opponentDiscards = [...state.opponent.discard, ...state.opponent.field];

    return {
      ...state,
      player: {
        ...state.player,
        field: [], // Wiped
        discard: playerDiscards
      },
      opponent: {
        ...state.opponent,
        field: [], // Wiped
        discard: opponentDiscards
      }
    };
  }
};

const mechanic_DrFacilierAgentProvocateur: CardLogic = {
  // Ability: "Into the Shadows"
  // This logic is called by the Engine whenever ANY ally is banished
  onAllyBanished: (state: GameState, sourceCard: GameCard, targetId?: string) => {
    // Logic: If targetId (the banished card) is in the discard pile, move it back to hand.
    // This is complex because the card is already in the discard when this triggers.
    
    const banishedCardIndex = state.player.discard.findIndex(c => c.instanceId === targetId);
    if (banishedCardIndex === -1) return state;

    const banishedCard = state.player.discard[banishedCardIndex];
    
    // Logic check: Is it "another" character? (Not Facilier himself)
    if (banishedCard.instanceId === sourceCard.instanceId) return state;

    // Return card to hand
    const newDiscard = [...state.player.discard];
    newDiscard.splice(banishedCardIndex, 1);

    return {
      ...state,
      player: {
        ...state.player,
        discard: newDiscard,
        hand: [...state.player.hand, banishedCard]
      }
    };
  }
};

const mechanic_Smash: CardLogic = {
    onPlay: (state: GameState, sourceCard: GameCard, targetId?: string) => {
        if (!targetId) return state;

        // Find target in Opponent Field
        const opponentTargetIndex = state.opponent.field.findIndex(c => c.instanceId === targetId);
        if (opponentTargetIndex !== -1) {
            const newField = [...state.opponent.field];
            newField[opponentTargetIndex] = {
                ...newField[opponentTargetIndex],
                damage: newField[opponentTargetIndex].damage + 3
            };
            return {
                ...state,
                opponent: {
                    ...state.opponent,
                    field: newField
                }
            };
        }

        // Find target in Player Field (Friendly Fire?)
        const playerTargetIndex = state.player.field.findIndex(c => c.instanceId === targetId);
        if (playerTargetIndex !== -1) {
            const newField = [...state.player.field];
            newField[playerTargetIndex] = {
                ...newField[playerTargetIndex],
                damage: newField[playerTargetIndex].damage + 3
            };
            return {
                ...state,
                player: {
                    ...state.player,
                    field: newField
                }
            };
        }

        return state;
    }
};

// --- THE REGISTRY ---

export const CARD_REGISTRY: CardRegistry = {
  // Be Prepared (Set 1, Card 128)
  [getCardId(1, 128)]: mechanic_BanishAllCharacters,

  // Dr. Facilier - Agent Provocateur (Set 1, Card 66)
  [getCardId(1, 66)]: mechanic_DrFacilierAgentProvocateur,
  
  // Smash (Set 1, Card 196)
  [getCardId(1, 196)]: mechanic_Smash,
};

// Helper to look up logic
export const getCardLogic = (card: GameCard): CardLogic | undefined => {
  const id = getCardId(card.Set_Num, card.Card_Num);
  return CARD_REGISTRY[id];
};
