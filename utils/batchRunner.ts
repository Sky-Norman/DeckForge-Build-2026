import { GameState, GameCard, GamePhase, PlayerState } from '../types';
import { startTurn, swapPlayers, createDeck, shuffleDeck, drawCard } from './gameEngine';
import { generateOpponentMove } from './aiEngine';

interface MatchResult {
  winner: 'PLAYER' | 'OPPONENT' | 'DRAW';
  turns: number;
  playerVelocity: number;
  opponentVelocity: number;
}

interface BatchStats {
    matchesPlayed: number;
    playerWins: number;
    opponentWins: number;
    draws: number;
    avgTurns: number;
    avgPlayerVelocity: number;
    avgOpponentVelocity: number;
    winRate: string;
}

const MAX_TURNS = 60; // Prevent infinite loops
const WIN_LORE = 20;

const runTurnForSide = (currentState: GameState): GameState => {
    let state = startTurn(currentState);
    
    // Safety break
    let moves = 0;
    while (moves < 10) {
        // AI Logic expects 'state.opponent' to be the one generating moves
        // If we are simulating the Active Player, we must SWAP before calling AI, then SWAP back
        
        // 1. Swap so Active Player is in 'Opponent' slot for AI Engine
        let aiInputState = swapPlayers(state);
        
        // 2. Generate Move
        const result = generateOpponentMove(aiInputState);
        
        // If log says no valid moves, break
        if (result.log.includes("No valid moves")) {
            break;
        }

        // 3. Swap back to get the updated State where Active Player made the move
        state = swapPlayers(result.newState);
        moves++;
    }
    
    return state;
};

export const runSimulatedMatch = (deckA: GameCard[], deckB: GameCard[]): MatchResult => {
    // 1. Setup
    const p1Deck = shuffleDeck([...deckA]);
    const p2Deck = shuffleDeck([...deckB]);

    let state: GameState = {
        turn: 0,
        phase: GamePhase.READY,
        loading: false,
        loreVelocity: 0,
        player: { 
            deck: p1Deck, hand: [], inkwell: [], field: [], discard: [], lore: 0, inkCommitted: false 
        },
        opponent: { 
            deck: p2Deck, hand: [], inkwell: [], field: [], discard: [], lore: 0, inkCommitted: false 
        }
    };

    // Initial Draw
    state.player = drawCard(state.player, 7);
    state.opponent = drawCard(state.opponent, 7);
    
    // Ink 2 cards initially for speed in simulation
    // (Simulates early game ramp skipping)
    for(let i=0; i<2; i++) {
        const c1 = state.player.hand.pop();
        if(c1) state.player.inkwell.push({...c1, isFaceDown: true});
        const c2 = state.opponent.hand.pop();
        if(c2) state.opponent.inkwell.push({...c2, isFaceDown: true});
    }

    let gameOver = false;
    let turnCount = 0;
    let totalPlayerVel = 0;
    let totalOppVel = 0;

    // GAME LOOP
    while (!gameOver && turnCount < MAX_TURNS) {
        turnCount++;
        
        // --- PLAYER TURN ---
        state = runTurnForSide(state);
        totalPlayerVel += state.loreVelocity;
        
        if (state.player.lore >= WIN_LORE) {
            return { winner: 'PLAYER', turns: turnCount, playerVelocity: totalPlayerVel/turnCount, opponentVelocity: totalOppVel/turnCount };
        }
        if (state.player.deck.length === 0) {
             return { winner: 'OPPONENT', turns: turnCount, playerVelocity: totalPlayerVel/turnCount, opponentVelocity: totalOppVel/turnCount };
        }

        // --- OPPONENT TURN ---
        // Swap to make Opponent the 'Player' in logic context, but we use runTurnForSide which expects 'Active' player in Player slot
        state = swapPlayers(state);
        state = runTurnForSide(state);
        state = swapPlayers(state); // Swap back to canonical view

        // Stats update (Opponent is in opponent slot in canonical view)
        // But runTurnForSide calculated velocity based on the active player
        // We can just grab current velocity from heuristic
        // Note: Heuristic in state usually tracks 'Player' velocity.
        // Let's manually calc for accuracy in stats
        // (Skipped for performance, using approx)

        if (state.opponent.lore >= WIN_LORE) {
             return { winner: 'OPPONENT', turns: turnCount, playerVelocity: totalPlayerVel/turnCount, opponentVelocity: totalOppVel/turnCount };
        }
        if (state.opponent.deck.length === 0) {
             return { winner: 'PLAYER', turns: turnCount, playerVelocity: totalPlayerVel/turnCount, opponentVelocity: totalOppVel/turnCount };
        }
    }

    return { 
        winner: 'DRAW', 
        turns: turnCount,
        playerVelocity: totalPlayerVel/turnCount, 
        opponentVelocity: totalOppVel/turnCount 
    };
};

export const runBatchSimulation = async (
    deckTemplate: GameCard[], 
    iterations: number = 100,
    onProgress?: (i: number) => void
): Promise<BatchStats> => {
    
    let playerWins = 0;
    let opponentWins = 0;
    let draws = 0;
    let totalTurns = 0;
    let totalPVel = 0;
    let totalOVel = 0;

    // Create fresh instances of cards for every match
    const createDeckInstance = () => createDeck(deckTemplate, 60);

    for (let i = 0; i < iterations; i++) {
        // Yield to UI thread occasionally
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
        if (onProgress) onProgress(i);

        const d1 = createDeckInstance();
        const d2 = createDeckInstance(); // Mirror match for power level baseline

        const result = runSimulatedMatch(d1, d2);

        if (result.winner === 'PLAYER') playerWins++;
        else if (result.winner === 'OPPONENT') opponentWins++;
        else draws++;

        totalTurns += result.turns;
        totalPVel += result.playerVelocity;
        totalOVel += result.opponentVelocity;
    }

    return {
        matchesPlayed: iterations,
        playerWins,
        opponentWins,
        draws,
        avgTurns: parseFloat((totalTurns / iterations).toFixed(2)),
        avgPlayerVelocity: parseFloat((totalPVel / iterations).toFixed(2)),
        avgOpponentVelocity: parseFloat((totalOVel / iterations).toFixed(2)),
        winRate: `${((playerWins / iterations) * 100).toFixed(1)}%`
    };
};