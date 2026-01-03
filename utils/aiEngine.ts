import { GameState } from '../types';
import { cloneGameState } from './gameStateUtils';
import { swapPlayers, questCard, challengeCard, playCard, addToInkwell } from './gameEngine';

interface AIResult {
    newState: GameState;
    log: string;
    score: number;
}

/**
 * generateOpponentMove
 * 
 * Uses a heuristic approach:
 * 1. Deep clones state.
 * 2. Flips perspective so AI is "Player".
 * 3. Evaluates all possible moves (Quest, Challenge, Play).
 * 4. Executes the single best move.
 * 5. Flips perspective back.
 */
export const generateOpponentMove = (currentState: GameState): { newState: GameState, log: string } => {
    let simState = cloneGameState(currentState);
    
    // 1. Perspective Flip: AI becomes 'player' in the engine
    simState = swapPlayers(simState);
    
    const logs: string[] = [];
    const possibleMoves: { type: string, score: number, execute: () => GameState, desc: string }[] = [];

    const aiHand = simState.player.hand;
    const aiField = simState.player.field;
    const aiInk = simState.player.inkwell.filter(i => !i.isExerted).length;
    const enemyField = simState.opponent.field;

    // --- HEURISTIC 1: QUESTING (The Clock) ---
    // High priority. If we can quest safely, do it.
    aiField.forEach(card => {
        if (!card.isExerted && !card.isDried && (card.Lore || 0) > 0) {
            const loreVal = card.Lore || 0;
            // Basic Score: 50 points per Lore
            let score = 50 * loreVal;
            
            // Risk Adjustment: If opponent has high strength ready, lower score slightly
            const threat = enemyField.some(e => !e.isExerted && (e.Strength || 0) >= (card.Willpower || 0));
            if (threat) score -= 20;

            possibleMoves.push({
                type: 'QUEST',
                score: score,
                desc: `Quest with ${card.Name} (Value: ${score})`,
                execute: () => questCard(simState, card.instanceId)
            });
        }
    });

    // --- HEURISTIC 2: CHALLENGING (Board Control) ---
    // If we can banish an enemy favorably.
    aiField.forEach(attacker => {
        if (!attacker.isExerted && !attacker.isDried) {
            enemyField.forEach(defender => {
                if (defender.isExerted) {
                    const dmgToDef = attacker.Strength || 0;
                    const dmgToAtt = defender.Strength || 0;
                    
                    const defDies = (defender.damage + dmgToDef) >= (defender.Willpower || 0);
                    const attDies = (attacker.damage + dmgToAtt) >= (attacker.Willpower || 0);

                    if (defDies) {
                        // Base score for killing: 40 + (Target Lore * 10) + (Target Cost * 5)
                        let score = 40 + ((defender.Lore || 0) * 10) + (defender.Cost * 5);
                        
                        // Penalize if we die
                        if (attDies) score -= (attacker.Cost * 5);

                        possibleMoves.push({
                            type: 'CHALLENGE',
                            score: score,
                            desc: `Challenge ${defender.Name} with ${attacker.Name} (Value: ${score})`,
                            execute: () => challengeCard(simState, attacker.instanceId, defender.instanceId)
                        });
                    }
                }
            });
        }
    });

    // --- HEURISTIC 3: PLAYING CARDS (Development) ---
    aiHand.forEach(card => {
        if (card.Cost <= aiInk) {
            // Score: Cost * 10 (Playing expensive cards is usually good)
            let score = card.Cost * 10;
            
            // Bonus for characters with high stats
            if (card.Type === 'Character') {
                score += (card.Strength || 0) + (card.Willpower || 0) + ((card.Lore || 0) * 5);
            }

            possibleMoves.push({
                type: 'PLAY',
                score: score,
                desc: `Play ${card.Name} (Value: ${score})`,
                execute: () => playCard(simState, card.instanceId)
            });
        } else if (card.Inkable && !simState.player.inkCommitted) {
             // Ink Logic: Lowest cost card in hand that isn't vital?
             // Simple logic: Ink if we have > 1 card and this is low cost
             if (aiHand.length > 1) {
                 const score = 15; // Low priority but necessary
                 possibleMoves.push({
                    type: 'INK',
                    score: score,
                    desc: `Ink ${card.Name} (Value: ${score})`,
                    execute: () => {
                         const updatedPlayer = addToInkwell(simState.player, card.instanceId);
                         return {
                             ...simState,
                             player: updatedPlayer
                         };
                    }
                 });
             }
        }
    });

    // --- DECISION ---
    if (possibleMoves.length > 0) {
        // Sort descending
        possibleMoves.sort((a, b) => b.score - a.score);
        
        const bestMove = possibleMoves[0];
        simState = bestMove.execute();
        logs.push(`[AI] ${bestMove.desc}`);
        logs.push(`[AI] Heuristics: Selected score ${bestMove.score} over ${possibleMoves.length - 1} other options.`);
    } else {
        logs.push("[AI] No valid moves available. Turn passed.");
        // End turn could go here, but usually that's a phase change handled by the board
    }

    // 5. Flip perspective back to normal
    simState = swapPlayers(simState);

    return {
        newState: simState,
        log: logs.join('\n')
    };
};