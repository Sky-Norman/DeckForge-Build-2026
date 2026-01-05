import { GameState } from '../types';
import { cloneGameState } from './gameStateUtils';
import { swapPlayers, questCard, challengeCard, playCard, addToInkwell, calculateVelocity } from './gameEngine';

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
    
    // --- LORE VELOCITY HEURISTIC ---
    // Compare velocities to determine strategy BEFORE perspective flip.
    const humanVelocity = calculateVelocity(currentState.player, currentState.turn);
    const aiVelocity = calculateVelocity(currentState.opponent, currentState.turn);
    
    // Rule: IF (Opponent [Human] Velocity > Player [AI] Velocity) -> Prioritize Challenging/Control.
    const isAiLosingRace = humanVelocity > aiVelocity;
    
    const STRATEGY = isAiLosingRace ? "CONTROL" : "RUSH";
    
    // Weights based on Strategy
    const W_QUEST = isAiLosingRace ? 0.6 : 1.5; 
    const W_CHALLENGE = isAiLosingRace ? 1.5 : 0.8; 
    const W_CONTROL_PLAY = isAiLosingRace ? 2.0 : 1.0;

    // 1. Perspective Flip: AI becomes 'player' in the engine
    simState = swapPlayers(simState);
    
    const logs: string[] = [`[AI] Velocity Check - Human: ${humanVelocity}, AI: ${aiVelocity}. Strategy: ${STRATEGY}`];
    const possibleMoves: { type: string, score: number, execute: () => GameState, desc: string }[] = [];

    const aiHand = simState.player.hand;
    const aiField = simState.player.field;
    const aiInk = simState.player.inkwell.filter(i => !i.isExerted).length;
    const enemyField = simState.opponent.field;

    // --- HEURISTIC 1: QUESTING ---
    aiField.forEach(card => {
        if (!card.isExerted && !card.isDried && !card.modifiers.cantQuest && (card.Lore || 0) > 0) {
            const loreVal = card.Lore || 0;
            let baseScore = 50 * loreVal;
            
            // Risk Adjustment
            const threat = enemyField.some(e => !e.isExerted && (e.Strength || 0) >= (card.Willpower || 0));
            if (threat) baseScore -= 20;

            let finalScore = baseScore * W_QUEST;

            possibleMoves.push({
                type: 'QUEST',
                score: finalScore,
                desc: `Quest with ${card.Name} (V:${finalScore.toFixed(0)})`,
                execute: () => questCard(simState, card.instanceId)
            });
        }
    });

    // --- HEURISTIC 2: CHALLENGING ---
    aiField.forEach(attacker => {
        if (!attacker.isExerted && !attacker.isDried && !attacker.modifiers.cantChallenge) {
            enemyField.forEach(defender => {
                if (defender.isExerted) {
                    // Check Evasive
                    const defenderEvasive = defender.Evasive || defender.modifiers.evasiveGranted;
                    const attackerEvasive = attacker.Evasive || attacker.modifiers.evasiveGranted;
                    if (defenderEvasive && !attackerEvasive) return;

                    const dmgToDef = Math.max(0, ((attacker.Strength || 0) + attacker.modifiers.strengthBonus) - ((defender.Resist || 0) + defender.modifiers.resistGranted));
                    const dmgToAtt = Math.max(0, ((defender.Strength || 0) + defender.modifiers.strengthBonus) - ((attacker.Resist || 0) + attacker.modifiers.resistGranted));
                    
                    const defDies = (defender.damage + dmgToDef) >= (defender.Willpower || 0);
                    const attDies = (attacker.damage + dmgToAtt) >= (attacker.Willpower || 0);

                    if (defDies) {
                        let baseScore = 40 + ((defender.Lore || 0) * 10) + (defender.Cost * 5);
                        if (attDies) baseScore -= (attacker.Cost * 5);
                        let finalScore = baseScore * W_CHALLENGE;

                        possibleMoves.push({
                            type: 'CHALLENGE',
                            score: finalScore,
                            desc: `Challenge ${defender.Name} with ${attacker.Name} (V:${finalScore.toFixed(0)})`,
                            execute: () => challengeCard(simState, attacker.instanceId, defender.instanceId)
                        });
                    }
                }
            });
        }
    });

    // --- HEURISTIC 3: PLAYING CARDS (Branched Targeting) ---
    aiHand.forEach(card => {
        if (card.Cost <= aiInk) {
            
            // Branch 1: Simple Play (No Target)
            const basePlayScore = (card.Cost * 10) + ((card.Strength || 0) + (card.Willpower || 0));
            possibleMoves.push({
                type: 'PLAY',
                score: basePlayScore,
                desc: `Play ${card.Name} (V:${basePlayScore.toFixed(0)})`,
                execute: () => playCard(simState, card.instanceId)
            });

            // Branch 2: Targeted Play (If Applicable)
            // If the card is an Action or Character with abilities, try playing it against EVERY enemy
            if (enemyField.length > 0 && (card.Type === 'Action' || (card.Abilities && card.Abilities.length > 0))) {
                enemyField.forEach(target => {
                     // Evaluate the impact
                     // 1. Clone
                     let branchState = cloneGameState(simState);
                     // 2. Play
                     branchState = playCard(branchState, card.instanceId, target.instanceId);
                     
                     // 3. Measure Delta in Opponent Velocity
                     const preVel = calculateVelocity(simState.opponent, simState.turn);
                     const postVel = calculateVelocity(branchState.opponent, branchState.turn);
                     const velocityDelta = preVel - postVel;

                     if (velocityDelta > 0) {
                         const targetScore = basePlayScore + (velocityDelta * 100 * W_CONTROL_PLAY);
                         possibleMoves.push({
                            type: 'PLAY_TARGETED',
                            score: targetScore,
                            desc: `Play ${card.Name} targeting ${target.Name} (V:${targetScore.toFixed(0)}, -Vel: ${velocityDelta.toFixed(2)})`,
                            execute: () => playCard(simState, card.instanceId, target.instanceId)
                         });
                     }
                });
            }
        } else if (card.Inkable && !simState.player.inkCommitted) {
             if (aiHand.length > 1) {
                 const score = 15; 
                 possibleMoves.push({
                    type: 'INK',
                    score: score,
                    desc: `Ink ${card.Name} (V:${score.toFixed(0)})`,
                    execute: () => {
                         const updatedPlayer = addToInkwell(simState.player, card.instanceId);
                         return { ...simState, player: updatedPlayer };
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
    } else {
        logs.push("[AI] No valid moves available.");
    }

    // 5. Flip perspective back to normal
    simState = swapPlayers(simState);

    return {
        newState: simState,
        log: logs.join('\n')
    };
};