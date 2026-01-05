import { GameCard, PlayerState, GameState, GamePhase, CardData } from '../types';
import { getCardLogic } from './cardRegistry';
import { DeckManifest } from './deckManifests';

// --- HELPER: State Based Effects (Death Check) ---
const cleanupBoard = (state: GameState): GameState => {
  let newState = { ...state };
  let triggers: { logic: any, source: GameCard, banished: GameCard }[] = [];

  // Check Player Field
  const playerDead = newState.player.field.filter(c => (c.Willpower || 0) > 0 && c.damage >= (c.Willpower || 0));
  if (playerDead.length > 0) {
     newState.player.field = newState.player.field.filter(c => c.damage < (c.Willpower || 0));
     newState.player.discard = [...newState.player.discard, ...playerDead];
     
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

  return updateLoreVelocity(newState);
};

// --- PREDICTIVE WINNING ALGORITHM ---
export const calculateVelocity = (player: PlayerState, turn: number): number => {
    if (turn === 0) return 0;
    
    // 1. Current Banked Lore
    let potential = player.lore;

    // 2. Board Potential (Quest Power + Location Passive)
    const onBoardPotential = player.field.reduce((acc, card) => {
        // Character Questing
        // Check Modifiers: Cannot Quest?
        if (card.modifiers.cantQuest) return acc;
        
        if (card.Type === "Character" && !card.isDried && !card.isExerted) {
            return acc + (card.Lore || 0);
        }
        // Location Passive
        if (card.Type === "Location") {
            return acc + (card.Lore || 0);
        }
        return acc;
    }, 0);

    return parseFloat(((potential + onBoardPotential) / turn).toFixed(2));
};

const updateLoreVelocity = (state: GameState): GameState => {
    return {
        ...state,
        loreVelocity: calculateVelocity(state.player, state.turn)
    };
};

// --- CORE MECHANICS ---

export const swapPlayers = (state: GameState): GameState => {
    return {
        ...state,
        player: state.opponent,
        opponent: state.player
    };
};

export const hydrateDeckFromManifest = (manifest: DeckManifest, library: CardData[]): GameCard[] => {
  const deck: GameCard[] = [];
  
  for (const [key, quantity] of Object.entries(manifest.cards)) {
    const [setStr, cardNumStr] = key.split('-');
    const setNum = parseInt(setStr);
    const cardNum = parseInt(cardNumStr);
    
    const cardTemplate = library.find(c => c.Set_Num === setNum && c.Card_Num === cardNum);
    
    if (cardTemplate) {
      for (let i = 0; i < quantity; i++) {
        deck.push({
          ...cardTemplate,
          instanceId: `deck-${manifest.chapter}-${setNum}-${cardNum}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          isExerted: false,
          isDried: true,
          isFaceDown: false,
          damage: 0,
          modifiers: {
              cantQuest: false,
              cantChallenge: false,
              frozen: false,
              evasiveGranted: false,
              resistGranted: 0,
              strengthBonus: 0
          }
        });
      }
    } else {
        // Silently skip missing cards to allow partial hydration from truncated libraries
    }
  }
  
  return deck;
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
      damage: 0,
      modifiers: {
          cantQuest: false,
          cantChallenge: false,
          frozen: false,
          evasiveGranted: false,
          resistGranted: 0,
          strengthBonus: 0
      }
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
  if (state.inkCommitted) return state; 

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
    isDried: true, 
    isExerted: false,
    damage: 0,
    modifiers: { ...card.modifiers } // Clone modifiers
  };

  const isPermanent = card.Type === "Character" || card.Type === "Item" || card.Type === "Location";
  
  let newState: GameState = {
    ...gameState,
    player: {
        ...playerAfterPayment,
        hand: newHand,
        field: isPermanent ? [...playerAfterPayment.field, playedCard] : playerAfterPayment.field,
        discard: !isPermanent ? [...playerAfterPayment.discard, playedCard] : playerAfterPayment.discard
    }
  };

  const logic = getCardLogic(card);
  if (logic && logic.onPlay) {
    newState = logic.onPlay(newState, playedCard, targetId);
  }

  return cleanupBoard(newState);
};

// --- LOCATION MECHANICS ---

export const moveCharacterToLocation = (state: GameState, characterId: string, locationId: string): GameState => {
    const character = state.player.field.find(c => c.instanceId === characterId);
    const location = state.player.field.find(c => c.instanceId === locationId);

    if (!character || !location) return state;
    if (character.Type !== "Character" || location.Type !== "Location") return state;
    if (character.isDried) return state; // Characters cannot move if drying (usually)
    if (character.currentLocationId === locationId) return state;

    // Check Cost
    const moveCost = location.MoveCost || 0;
    const playerAfterPayment = payInk(state.player, moveCost);
    
    if (!playerAfterPayment) {
        console.warn("Not enough ink to move to location");
        return state;
    }

    // Update Character
    const newField = playerAfterPayment.field.map(c => 
        c.instanceId === characterId ? { ...c, currentLocationId: locationId } : c
    );

    const newState = {
        ...state,
        player: {
            ...playerAfterPayment,
            field: newField
        }
    };

    return updateLoreVelocity(newState);
};

export const questCard = (gameState: GameState, cardInstanceId: string): GameState => {
    const card = gameState.player.field.find(c => c.instanceId === cardInstanceId);
    
    if (!card) return gameState;
    if (card.modifiers.cantQuest) return gameState;
    if (card.isExerted) return gameState;
    if (card.isDried) return gameState;

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

    const logic = getCardLogic(card);
    if (logic && logic.onQuest) {
        newState = logic.onQuest(newState, card);
    }

    return updateLoreVelocity(newState);
};

// --- COMBAT ENGINE (Challenge) ---

export const resolveChallenge = (gameState: GameState, attackerId: string, defenderId: string): GameState => {
    const attacker = gameState.player.field.find(c => c.instanceId === attackerId);
    const defender = gameState.opponent.field.find(c => c.instanceId === defenderId);

    if (!attacker || !defender) return gameState;
    if (attacker.modifiers.cantChallenge) return gameState;
    if (attacker.isExerted || attacker.isDried) return gameState;
    if (!defender.isExerted) return gameState; 

    // --- KEYWORD CHECK: EVASIVE ---
    const defenderHasEvasive = defender.Evasive || defender.modifiers.evasiveGranted;
    const attackerHasEvasive = attacker.Evasive || attacker.modifiers.evasiveGranted;

    if (defenderHasEvasive && !attackerHasEvasive) {
        console.warn("Cannot challenge Evasive character without Evasive.");
        return gameState;
    }

    // Exert Attacker
    const newPlayerField = gameState.player.field.map(c => 
        c.instanceId === attackerId ? { ...c, isExerted: true } : c
    );

    // --- DAMAGE CALCULATION (RESIST & BONUS) ---
    const attackerStrength = (attacker.Strength || 0) + attacker.modifiers.strengthBonus;
    const defenderStrength = (defender.Strength || 0) + defender.modifiers.strengthBonus;

    const defenderResist = (defender.Resist || 0) + defender.modifiers.resistGranted;
    const attackerResist = (attacker.Resist || 0) + attacker.modifiers.resistGranted;

    // Resist reduces damage, but not below 0
    const damageToDefender = Math.max(0, attackerStrength - defenderResist);
    const damageToAttacker = Math.max(0, defenderStrength - attackerResist);

    const finalPlayerField = newPlayerField.map(c => 
        c.instanceId === attackerId ? { ...c, damage: c.damage + damageToAttacker } : c
    );

    const finalOpponentField = gameState.opponent.field.map(c => 
        c.instanceId === defenderId ? { ...c, damage: c.damage + damageToDefender } : c
    );

    let newState = {
        ...gameState,
        player: { ...gameState.player, field: finalPlayerField },
        opponent: { ...gameState.opponent, field: finalOpponentField },
        selectedCardId: undefined
    };

    return cleanupBoard(newState);
};

// Reuse this wrapper to maintain API compatibility with old calls
export const challengeCard = resolveChallenge; 

// --- PHASES ---

export const readyPhase = (state: PlayerState): PlayerState => {
  return {
    ...state,
    inkCommitted: false,
    field: state.field.map(c => {
        // MODIFIER ENGINE: Frozen Check
        if (c.modifiers.frozen) {
            // Card stays exerted, consume frozen state
            return {
                ...c,
                isDried: false,
                modifiers: { ...c.modifiers, frozen: false }
            };
        }
        return { 
            ...c, 
            isExerted: false, 
            isDried: false,
            // Reset temporary bonuses
            modifiers: { ...c.modifiers, strengthBonus: 0, evasiveGranted: false, resistGranted: 0 }
        };
    }),
    inkwell: state.inkwell.map(c => ({ ...c, isExerted: false }))
  };
};

const setPhase = (state: GameState): GameState => {
    let newState = { ...state, phase: GamePhase.SET };
    
    // 1. Locations Gain Lore (Passive)
    const locations = newState.player.field.filter(c => c.Type === "Location");
    if (locations.length > 0) {
        const loreGain = locations.reduce((acc, loc) => acc + (loc.Lore || 0), 0);
        newState.player.lore += loreGain;
    }

    return newState;
};

export const startTurn = (gameState: GameState): GameState => {
    // 1. READY
    let newState = {
        ...gameState,
        phase: GamePhase.READY,
        turn: gameState.turn + 1,
        player: readyPhase(gameState.player)
    };

    // 2. SET
    newState = setPhase(newState);

    // 3. DRAW
    newState = {
        ...newState,
        phase: GamePhase.DRAW,
        player: drawCard(newState.player, 1)
    };

    // 4. MAIN
    newState.phase = GamePhase.MAIN;

    return updateLoreVelocity(newState);
};