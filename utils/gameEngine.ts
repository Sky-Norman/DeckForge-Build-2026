import { GameCard, PlayerState, GameState } from '../types';
import { getCardLogic } from './cardRegistry';

// --- HELPER: State Based Effects (Death Check) ---
const cleanupBoard = (state: GameState): GameState => {
  let newState = { ...state };
  let triggers: { logic: any, source: GameCard, banished: GameCard }[] = [];

  // Check Player Field
  const playerDead = newState.player.field.filter(c => (c.Willpower || 0) > 0 && c.damage >= (c.Willpower || 0));
  if (playerDead.length > 0) {
     newState.player.field = newState.player.field.filter(c => c.damage < (c.Willpower || 0));
     newState.player.discard = [...newState.player.discard, ...playerDead];
     
     // Queue Triggers (e.g., Dr Facilier) - Simplified, checking all field cards for listeners
     newState.player.field.forEach(source => {
        const logic = getCardLogic(source);
        if (logic && logic.onAllyBanished) {
            playerDead.forEach(dead => {
                triggers.push({ logic: logic.onAllyBanished, source, banished: dead });
            });
        }
     });
  }

  // Check Opponent Field
  const opponentDead = newState.opponent.field.filter(c => (c.Willpower || 0) > 0 && c.damage >= (c.Willpower || 0));
  if (opponentDead.length > 0) {
     newState.opponent.field = newState.opponent.field.filter(c => c.damage < (c.Willpower || 0));
     newState.opponent.discard = [...newState.opponent.discard, ...opponentDead];
  }

  // Execute Triggers
  triggers.forEach(t => {
      newState = t.logic(newState, t.source, t.banished.instanceId);
  });

  return newState;
};

// --- CORE MECHANICS ---

/**
 * Swaps the Player and Opponent in the state.
 * Used for AI calculations and "Sandbox Mode" manual opponent control.
 */
export const swapPlayers = (state: GameState): GameState => {
    return {
        ...state,
        player: state.opponent,
        opponent: state.player
    };
};

export const createDeck = (cardPool: any[], size: number = 60): GameCard[] => {
  const deck: GameCard[] = [];
  for (let i = 0; i < size; i++) {
    const randomCard = cardPool[Math.floor(Math.random() * cardPool.length)];
    deck.push({
      ...randomCard,
      instanceId: `card-${i}-${Date.now()}-${Math.random()}`,
      isExerted: false,
      isDried: true,
      isFaceDown: false,
      damage: 0
    });
  }
  return deck;
};

export const shuffleDeck = (deck: GameCard[]): GameCard[] => {
  return [...deck].sort(() => Math.random() - 0.5);
};

export const drawCard = (state: PlayerState, count: number = 1): PlayerState => {
  if (state.deck.length === 0) return state; 

  const newDeck = [...state.deck];
  const drawnCards = newDeck.splice(0, count);
  
  return {
    ...state,
    deck: newDeck,
    hand: [...state.hand, ...drawnCards]
  };
};

export const addToInkwell = (state: PlayerState, cardInstanceId: string): PlayerState => {
  if (state.inkCommitted) return state; // Rule: 1 ink per turn

  const cardIndex = state.hand.findIndex(c => c.instanceId === cardInstanceId);
  if (cardIndex === -1) return state;

  const card = state.hand[cardIndex];
  if (!card.Inkable) return state; 

  const newHand = [...state.hand];
  newHand.splice(cardIndex, 1);

  const inkedCard: GameCard = {
    ...card,
    isFaceDown: true,
    isExerted: false,
    damage: 0
  };

  return {
    ...state,
    hand: newHand,
    inkwell: [...state.inkwell, inkedCard],
    inkCommitted: true
  };
};

// Internal: Pay Ink Cost
const payInk = (player: PlayerState, cost: number): PlayerState | null => {
    const availableInk = player.inkwell.filter(c => !c.isExerted);
    if (availableInk.length < cost) return null; // Cannot afford

    // Exert the ink
    let costPaid = 0;
    const newInkwell = player.inkwell.map(c => {
        if (costPaid < cost && !c.isExerted) {
            costPaid++;
            return { ...c, isExerted: true };
        }
        return c;
    });

    return {
        ...player,
        inkwell: newInkwell
    };
};

export const playCard = (gameState: GameState, cardInstanceId: string, targetId?: string): GameState => {
  const player = gameState.player;
  const cardIndex = player.hand.findIndex(c => c.instanceId === cardInstanceId);
  if (cardIndex === -1) return gameState;

  const card = player.hand[cardIndex];
  
  // 1. Check & Pay Cost
  const playerAfterPayment = payInk(player, card.Cost);
  if (!playerAfterPayment) {
      console.warn("Not enough ink to play", card.Name);
      return gameState;
  }

  // 2. Move Card
  const newHand = [...playerAfterPayment.hand];
  newHand.splice(cardIndex, 1);

  const playedCard: GameCard = {
    ...card,
    isDried: true, // Summoning sickness
    isExerted: false,
    damage: 0
  };

  // 3. Determine Zone (Character/Item -> Field, Action -> Discard)
  const isPermanent = card.Type === "Character" || card.Type === "Item";
  
  let newState: GameState = {
    ...gameState,
    player: {
        ...playerAfterPayment,
        hand: newHand,
        field: isPermanent ? [...playerAfterPayment.field, playedCard] : playerAfterPayment.field,
        discard: !isPermanent ? [...playerAfterPayment.discard, playedCard] : playerAfterPayment.discard
    }
  };

  // 4. Trigger OnPlay (NOW WITH TARGET ID)
  const logic = getCardLogic(card);
  if (logic && logic.onPlay) {
    newState = logic.onPlay(newState, playedCard, targetId);
  }

  // 5. Cleanup (If actions killed things)
  return cleanupBoard(newState);
};

export const questCard = (gameState: GameState, cardInstanceId: string): GameState => {
    const card = gameState.player.field.find(c => c.instanceId === cardInstanceId);
    
    // Validation
    if (!card) return gameState;
    if (card.isExerted) return gameState;
    if (card.isDried) return gameState;

    // Exert
    const newField = gameState.player.field.map(c => 
        c.instanceId === cardInstanceId ? { ...c, isExerted: true } : c
    );

    let newState = {
        ...gameState,
        player: {
            ...gameState.player,
            field: newField,
            lore: gameState.player.lore + (card.Lore || 0)
        }
    };

    // Trigger OnQuest
    const logic = getCardLogic(card);
    if (logic && logic.onQuest) {
        newState = logic.onQuest(newState, card);
    }

    return newState;
};

export const challengeCard = (gameState: GameState, attackerId: string, defenderId: string): GameState => {
    const attacker = gameState.player.field.find(c => c.instanceId === attackerId);
    const defender = gameState.opponent.field.find(c => c.instanceId === defenderId);

    // Validation
    if (!attacker || !defender) return gameState;
    if (attacker.isExerted || attacker.isDried) return gameState;
    if (!defender.isExerted) {
        console.warn("Cannot challenge unexerted character (unless Evasive - not impl)");
        return gameState;
    }

    // Exert Attacker
    const newPlayerField = gameState.player.field.map(c => 
        c.instanceId === attackerId ? { ...c, isExerted: true } : c
    );

    // Calculate Damage
    // Apply Attacker Strength to Defender
    // Apply Defender Strength to Attacker
    const damageToDefender = attacker.Strength || 0;
    const damageToAttacker = defender.Strength || 0;

    const finalPlayerField = newPlayerField.map(c => 
        c.instanceId === attackerId ? { ...c, damage: c.damage + damageToAttacker } : c
    );

    const finalOpponentField = gameState.opponent.field.map(c => 
        c.instanceId === defenderId ? { ...c, damage: c.damage + damageToDefender } : c
    );

    let newState = {
        ...gameState,
        player: {
            ...gameState.player,
            field: finalPlayerField
        },
        opponent: {
            ...gameState.opponent,
            field: finalOpponentField
        },
        selectedCardId: undefined // Deselect after combat
    };

    // Check Deaths
    return cleanupBoard(newState);
};

export const readyPhase = (state: PlayerState): PlayerState => {
  return {
    ...state,
    inkCommitted: false,
    field: state.field.map(c => ({ ...c, isExerted: false, isDried: false })),
    inkwell: state.inkwell.map(c => ({ ...c, isExerted: false }))
  };
};

export const startTurn = (gameState: GameState): GameState => {
    const readyPlayer = readyPhase(gameState.player);
    const drawnPlayer = drawCard(readyPlayer, 1);
    
    return {
        ...gameState,
        turn: gameState.turn + 1,
        player: drawnPlayer
    };
};