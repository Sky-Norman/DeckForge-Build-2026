import { GameState, GameCard, GamePhase } from '../types';
import { startTurn, swapPlayers, createDeck, shuffleDeck, drawCard } from './gameEngine';
import { generateOpponentMove } from './aiEngine';

interface PowerLevelReport {
  matchesPlayed: number;
  winRate: number; // 0-100
  avgLoreVelocity: number;
  powerLevelScore: number; // (WinRate * 100) + (AvgVel * 10)
  avgTurns: number;
}

const MAX_TURNS = 60; 
const WIN_LORE = 20;

const runTurnForSide = (currentState: GameState): GameState => {
    let state = startTurn(currentState);
    
    // Safety break for AI Loop
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

const runSingleMatch = (deckA: GameCard[], deckB: GameCard[]): { winner: 'A' | 'B' | 'DRAW', p1Velocity: number, turns: number } => {
    const p1Deck = shuffleDeck([...deckA]);
    const p2Deck = shuffleDeck([...deckB]);

    let state: GameState = {
        turn: 0,
        phase: GamePhase.READY,
        loading: false,
        loreVelocity: 0,
        player: { deck: p1Deck, hand: [], inkwell: [], field: [], discard: [], lore: 0, inkCommitted: false },
        opponent: { deck: p2Deck, hand: [], inkwell: [], field: [], discard: [], lore: 0, inkCommitted: false }
    };

    // Initial Draw (7)
    state.player = drawCard(state.player, 7);
    state.opponent = drawCard(state.opponent, 7);
    
    // Fast Ink Setup (2 each)
    for(let i=0; i<2; i++) {
        const c1 = state.player.hand.pop();
        if(c1) state.player.inkwell.push({...c1, isFaceDown: true, modifiers: c1.modifiers});
        const c2 = state.opponent.hand.pop();
        if(c2) state.opponent.inkwell.push({...c2, isFaceDown: true, modifiers: c2.modifiers});
    }

    let gameOver = false;
    let turnCount = 0;
    let totalP1Vel = 0;

    while (!gameOver && turnCount < MAX_TURNS) {
        turnCount++;
        
        // --- PLAYER (A) TURN ---
        state = runTurnForSide(state);
        totalP1Vel += state.loreVelocity;
        
        if (state.player.lore >= WIN_LORE) return { winner: 'A', p1Velocity: totalP1Vel/turnCount, turns: turnCount };
        if (state.player.deck.length === 0) return { winner: 'B', p1Velocity: totalP1Vel/turnCount, turns: turnCount };

        // --- OPPONENT (B) TURN ---
        state = swapPlayers(state);
        state = runTurnForSide(state);
        state = swapPlayers(state); 

        if (state.opponent.lore >= WIN_LORE) return { winner: 'B', p1Velocity: totalP1Vel/turnCount, turns: turnCount };
        if (state.opponent.deck.length === 0) return { winner: 'A', p1Velocity: totalP1Vel/turnCount, turns: turnCount };
    }

    return { winner: 'DRAW', p1Velocity: totalP1Vel/turnCount, turns: turnCount };
};

export const simulateGames = async (
    deckTemplateA: GameCard[], 
    deckTemplateB: GameCard[],
    count: number = 100,
    onProgress?: (i: number) => void
): Promise<PowerLevelReport> => {
    
    let playerWins = 0;
    let totalVel = 0;
    let totalTurns = 0;

    const createDeckInstance = (template: GameCard[]) => createDeck(template, 60);

    for (let i = 0; i < count; i++) {
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 0)); // Yield
        if (onProgress) onProgress(i);

        const d1 = createDeckInstance(deckTemplateA);
        const d2 = createDeckInstance(deckTemplateB);

        const result = runSingleMatch(d1, d2);

        if (result.winner === 'A') playerWins++;
        totalVel += result.p1Velocity;
        totalTurns += result.turns;
    }

    const winRate = (playerWins / count) * 100;
    const avgVel = parseFloat((totalVel / count).toFixed(2));
    
    // Formula: PL = (Win% * 100) + (AvgVel * 10)
    // E.g., 50% WR + 2.0 Vel = 5000 + 20 = 5020. 
    // Wait, typical PL might be simpler. Let's do (WinRate) + (AvgVel * 10).
    // 50 + 20 = 70. 
    const powerLevel = parseFloat((winRate + (avgVel * 10)).toFixed(1));

    return {
        matchesPlayed: count,
        winRate: parseFloat(winRate.toFixed(1)),
        avgLoreVelocity: avgVel,
        powerLevelScore: powerLevel,
        avgTurns: parseFloat((totalTurns / count).toFixed(1))
    };
};