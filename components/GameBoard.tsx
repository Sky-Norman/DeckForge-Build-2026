import React, { useEffect, useState, useRef } from 'react';
import { CardData, GamePhase, PlayerState, GameState, GameCard } from '../types';
import { getStarterDeck, fetchFullLibrary } from '../services/cardService';
import { addToInkwell, createDeck, drawCard, playCard, questCard, challengeCard, startTurn, shuffleDeck, swapPlayers } from '../utils/gameEngine';
import { generateOpponentMove } from '../utils/aiEngine';
import { Hand } from './Hand';
import { Inkwell } from './Inkwell';
import { Card } from './Card';
import { Sword, RefreshCw, Sparkles, Scroll, RotateCcw, RotateCw, Trophy, Skull, Loader2, Bot, LayoutTemplate, Redo2, Eye, EyeOff } from 'lucide-react';

const INITIAL_HAND_SIZE = 7;
const SANDBOX_STARTING_INK_COUNT = 5;
const WINNING_LORE = 20;

export const GameBoard: React.FC = () => {
  // --- APP STATE ---
  const [isAppLoading, setIsAppLoading] = useState(false);

  // --- SETTINGS STATE ---
  const [jumpstartEnabled, setJumpstartEnabled] = useState(true);
  
  // HISTORY (Undo/Redo)
  const [history, setHistory] = useState<GameState[]>([]);
  const [future, setFuture] = useState<GameState[]>([]); // For Redo

  // SANDBOX CONTROLLER STATE
  const [activeSide, setActiveSide] = useState<'PLAYER' | 'OPPONENT'>('PLAYER');
  const [aiLog, setAiLog] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<GameState>({
    turn: 1,
    phase: GamePhase.READY,
    loading: false,
    selectedCardId: undefined,
    player: { deck: [], hand: [], inkwell: [], field: [], discard: [], lore: 0, inkCommitted: false },
    opponent: { deck: [], hand: [], inkwell: [], field: [], discard: [], lore: 0, inkCommitted: false }
  });

  // --- DRAG STATE ---
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  const [dragSourceType, setDragSourceType] = useState<'FIELD' | 'HAND' | null>(null);

  // --- WIN STATE CALCULATION ---
  const playerWon = gameState.player.lore >= WINNING_LORE;
  const opponentWon = gameState.opponent.lore >= WINNING_LORE;
  const isGameOver = playerWon || opponentWon;

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [aiLog]);

  // --- INITIALIZATION ---
  const initializeGame = () => {
    const starterCards = getStarterDeck();
    const deck = shuffleDeck(createDeck(starterCards));
    const opponentDeck = shuffleDeck(createDeck(starterCards));
    
    // Sandbox Setup: Opponent gets characters on field
    const validCharacters = opponentDeck.filter(c => c.Type === "Character");
    const opponentField = validCharacters.splice(0, 3).map(c => ({...c, isExerted: true})); 

    let startingInk: GameCard[] = [];
    let opponentStartingInk: GameCard[] = [];

    if (jumpstartEnabled) {
        startingInk = deck.splice(0, SANDBOX_STARTING_INK_COUNT).map(c => ({
            ...c, isFaceDown: true, isExerted: false, damage: 0
        }));
        opponentStartingInk = opponentDeck.splice(0, SANDBOX_STARTING_INK_COUNT).map(c => ({
            ...c, isFaceDown: true, isExerted: false, damage: 0
        }));
    }

    let initialPlayerState = drawCard({
      deck, hand: [], inkwell: startingInk, field: [], discard: [], lore: 0, inkCommitted: false
    }, INITIAL_HAND_SIZE);

    let initialOpponentState = drawCard({
      deck: opponentDeck, hand: [], inkwell: opponentStartingInk, field: opponentField, discard: [], lore: 0, inkCommitted: false
    }, INITIAL_HAND_SIZE);

    setGameState({
        turn: 1,
        phase: GamePhase.READY,
        loading: false,
        selectedCardId: undefined,
        player: initialPlayerState,
        opponent: initialOpponentState
    });
    
    setHistory([]);
    setFuture([]);
    setAiLog(["Game Initialized."]);
    setActiveSide('PLAYER');
  };

  useEffect(() => {
    fetchFullLibrary().catch(err => console.error("Library fetch failed", err));
    initializeGame();
  }, []); 

  // --- HISTORY MANAGEMENT ---
  const pushStateToHistory = (newState: GameState) => {
      setHistory(prev => [...prev, gameState]);
      setFuture([]); // Clear future on new action
      setGameState(newState);
  };

  const handleUndo = () => {
      if (history.length === 0) return;
      const previousState = history[history.length - 1];
      const newHistory = history.slice(0, history.length - 1);
      
      setFuture(prev => [gameState, ...prev]); // Push current to future
      setGameState(previousState);
      setHistory(newHistory);
      setAiLog(prev => [...prev, "Undo performed."]);
  };

  const handleRedo = () => {
      if (future.length === 0) return;
      const nextState = future[0];
      const newFuture = future.slice(1);

      setHistory(prev => [...prev, gameState]); // Push current to history
      setGameState(nextState);
      setFuture(newFuture);
      setAiLog(prev => [...prev, "Redo performed."]);
  };

  // --- ACTION WRAPPERS (Perspective Aware) ---
  
  // Helper to execute logic with perspective awareness
  const executeAction = (actionFn: (currentState: GameState) => GameState) => {
      if (isGameOver) return;
      
      // 1. Prepare State (Flip if playing as Opponent)
      let workingState = activeSide === 'OPPONENT' ? swapPlayers(gameState) : gameState;
      
      // 2. Execute Action
      workingState = actionFn(workingState);

      // 3. Restore State (Flip back)
      const finalState = activeSide === 'OPPONENT' ? swapPlayers(workingState) : workingState;
      
      pushStateToHistory(finalState);
  };

  const handlePlayCard = (id: string, targetId?: string) => {
    executeAction(state => playCard(state, id, targetId));
  };

  const handleInkCard = (id: string) => {
    executeAction(state => ({ ...state, player: addToInkwell(state.player, id) }));
  };

  const handleQuest = () => {
      if (gameState.selectedCardId) {
          executeAction(state => {
              const newState = questCard(state, state.selectedCardId!);
              return { ...newState, selectedCardId: undefined };
          });
      }
  };

  const handleEndTurn = () => {
      executeAction(state => startTurn(state));
  };

  // --- AI HANDLER ---
  const handleExecuteAI = () => {
      if (isGameOver) return;
      
      const { newState, log } = generateOpponentMove(gameState);
      
      setAiLog(prev => [...prev, log]);
      pushStateToHistory(newState);
  };

  // --- INTERACTION LOGIC (Click/Drag) ---

  const handleFieldCardClick = (cardId: string, isFromActivePlayerSide: boolean) => {
    if (isGameOver) return;
    
    // In PLAYER mode: isFromActivePlayerSide = true means clicked PLAYER card.
    // In OPPONENT mode: isFromActivePlayerSide = true means clicked OPPONENT card (visualized as friendly).
    
    if (isFromActivePlayerSide) {
      setGameState(prev => ({
         ...prev,
         selectedCardId: prev.selectedCardId === cardId ? undefined : cardId
      }));
    } else {
      // Clicked an enemy (while having something selected?)
      if (gameState.selectedCardId) {
          executeAction(state => {
              const newState = challengeCard(state, state.selectedCardId!, cardId);
              return { ...newState, selectedCardId: undefined };
          });
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
      if (isGameOver) { e.preventDefault(); return; }
      
      // Need to find card in the ACTIVE side's field/hand
      const activeState = activeSide === 'PLAYER' ? gameState.player : gameState.opponent;

      const fieldCard = activeState.field.find(c => c.instanceId === id);
      if (fieldCard) {
          if (!fieldCard.isExerted && !fieldCard.isDried) {
            setDragSourceId(id);
            setDragSourceType('FIELD');
            setGameState(prev => ({ ...prev, selectedCardId: undefined }));
          } else { e.preventDefault(); }
          return;
      }

      const handCard = activeState.hand.find(c => c.instanceId === id);
      if (handCard) {
          setDragSourceId(id);
          setDragSourceType('HAND');
      }
  };

  const handleDragEnterEnemy = (id: string) => {
      if (!dragSourceId) return;
      // Enemy depends on view
      const enemyState = activeSide === 'PLAYER' ? gameState.opponent : gameState.player;
      const enemy = enemyState.field.find(c => c.instanceId === id);
      
      if (!enemy) return;

      let isValidTarget = false;
      if (dragSourceType === 'FIELD') isValidTarget = enemy.isExerted;
      else if (dragSourceType === 'HAND') isValidTarget = true; 

      if (isValidTarget) setDragTargetId(id);
  };

  const handleDropOnEnemy = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (dragSourceId && targetId) {
          if (dragSourceType === 'FIELD') {
              executeAction(state => challengeCard(state, dragSourceId!, targetId));
          } else if (dragSourceType === 'HAND') {
              executeAction(state => playCard(state, dragSourceId!, targetId));
          }
      }
      resetDrag();
  };

  const handleDropOnFieldArea = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragSourceType === 'HAND' && dragSourceId) {
        executeAction(state => playCard(state, dragSourceId!));
    }
    resetDrag();
  };

  const handleDropOnInkwell = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragSourceType === 'HAND' && dragSourceId) {
        executeAction(state => ({ ...state, player: addToInkwell(state.player, dragSourceId!) }));
    }
    resetDrag();
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const resetDrag = () => {
      setDragSourceId(null);
      setDragTargetId(null);
      setDragSourceType(null);
  };

  // --- VIEW DATA PREPARATION ---
  // If activeSide is OPPONENT, we visually swap the data passed to components
  // The 'gameState' remains authoritative, but we feed the UI what it needs to see.
  const visualPlayer = activeSide === 'PLAYER' ? gameState.player : gameState.opponent;
  const visualOpponent = activeSide === 'PLAYER' ? gameState.opponent : gameState.player;
  const selectedCard = visualPlayer.field.find(c => c.instanceId === gameState.selectedCardId);
  const canQuest = selectedCard && !selectedCard.isExerted && !selectedCard.isDried;

  if (isAppLoading) return <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-amber-500"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden relative font-sans">
      
      {/* --- Top Bar --- */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shadow-md z-50">
        <div className="text-slate-400 font-cinzel text-lg flex items-center gap-2">
            <span className="text-amber-600 font-bold">DeckForge</span>
        </div>
        
        {/* STATS */}
        <div className="flex gap-12">
             <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Enemy Lore</span>
                <span className="text-2xl font-bold text-red-500 font-cinzel">{visualOpponent.lore} / 20</span>
            </div>
            <div className="flex flex-col items-center justify-center">
                 <div className="text-slate-600 font-cinzel text-xs">TURN</div>
                 <div className="text-2xl font-bold text-slate-200 font-cinzel leading-none">{gameState.turn}</div>
            </div>
            <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Active Lore</span>
                <span className="text-2xl font-bold text-emerald-500 font-cinzel">{visualPlayer.lore} / 20</span>
            </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-2">
            <button onClick={handleUndo} disabled={history.length === 0} title="Undo"
                className={`p-2 rounded border transition-all ${history.length > 0 ? 'bg-slate-800 border-slate-600 text-slate-300' : 'bg-slate-900 border-slate-800 text-slate-700 cursor-not-allowed'}`}>
                <RotateCcw size={18} />
            </button>
            <button onClick={handleRedo} disabled={future.length === 0} title="Redo"
                className={`p-2 rounded border transition-all ${future.length > 0 ? 'bg-slate-800 border-slate-600 text-slate-300' : 'bg-slate-900 border-slate-800 text-slate-700 cursor-not-allowed'}`}>
                <Redo2 size={18} />
            </button>
            <div className="h-6 w-px bg-slate-800 mx-2"></div>
            <button onClick={handleEndTurn} disabled={isGameOver}
                className="bg-amber-800 hover:bg-amber-700 text-amber-100 px-4 py-2 rounded font-cinzel font-bold flex items-center gap-2 text-sm border border-amber-600/50 shadow-lg">
                End Turn <RefreshCw size={14} />
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
          
          {/* --- SANDBOX CONTROLLER SIDEBAR --- */}
          <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shadow-xl z-20">
              <div className="p-4 border-b border-slate-800">
                  <h2 className="text-amber-500 font-cinzel font-bold flex items-center gap-2">
                      <LayoutTemplate size={18} /> Sandbox Controller
                  </h2>
              </div>
              
              {/* Perspective Switch */}
              <div className="p-4 border-b border-slate-800 space-y-3">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Active Perspective</div>
                  <div className="flex gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
                      <button 
                        onClick={() => setActiveSide('PLAYER')}
                        className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${activeSide === 'PLAYER' ? 'bg-emerald-900/50 text-emerald-400 shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                         <Eye size={14} /> Player
                      </button>
                      <button 
                        onClick={() => setActiveSide('OPPONENT')}
                        className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${activeSide === 'OPPONENT' ? 'bg-red-900/50 text-red-400 shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                         <EyeOff size={14} /> Opponent
                      </button>
                  </div>
                  <p className="text-[10px] text-slate-600 italic leading-tight">
                      Switching perspective allows you to play cards and control the board as the Opponent manually.
                  </p>
              </div>

              {/* AI Controls */}
              <div className="p-4 flex-1 flex flex-col min-h-0">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Automated Logic</div>
                  
                  <button 
                    onClick={handleExecuteAI}
                    disabled={isGameOver}
                    className="w-full bg-slate-800 border border-slate-600 hover:bg-slate-700 text-slate-200 py-3 rounded-md font-cinzel text-sm font-bold flex items-center justify-center gap-2 shadow-lg mb-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                      <Bot size={18} className="text-sky-400" />
                      Execute AI Move
                  </button>

                  <div className="flex-1 bg-black/40 rounded border border-slate-800 flex flex-col overflow-hidden">
                      <div className="bg-slate-900 px-3 py-2 text-[10px] font-bold text-slate-500 border-b border-slate-800">HEURISTIC LOG</div>
                      <div ref={logContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-[10px] text-slate-400">
                          {aiLog.length === 0 && <span className="text-slate-700 italic">No logs yet...</span>}
                          {aiLog.map((log, i) => (
                              <div key={i} className="border-b border-slate-800/50 pb-1 mb-1 last:border-0">{log}</div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>

          {/* --- MAIN GAME BOARD AREA --- */}
          <div className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
                {/* OPPONENT FIELD (Visual Opponent) */}
                <div className="flex-1 border-b border-slate-800/30 p-4 flex flex-wrap content-end justify-center gap-4 relative">
                    {activeSide === 'OPPONENT' && <div className="absolute top-2 left-2 text-xs text-red-500/50 font-bold uppercase tracking-widest pointer-events-none">Controlled by User</div>}
                    
                    {visualOpponent.field.map(card => (
                        <Card 
                            key={card.instanceId} 
                            card={card} 
                            isEnemy={true}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnterEnemy}
                            onDrop={handleDropOnEnemy}
                            isTargetable={!!gameState.selectedCardId}
                            isUnderAttack={dragTargetId === card.instanceId}
                            onClick={() => handleFieldCardClick(card.instanceId, false)}
                            className="scale-90 origin-bottom"
                        />
                    ))}
                </div>

                {/* PLAYER FIELD (Visual Player) */}
                <div 
                    className="flex-1 p-4 flex flex-wrap content-start justify-center gap-4 overflow-y-auto relative z-10"
                    onDragOver={handleDragOver}
                    onDrop={handleDropOnFieldArea}
                >
                    {visualPlayer.field.map(card => {
                        const canAct = !card.isExerted && !card.isDried;
                        return (
                            <Card 
                                key={card.instanceId} 
                                card={card} 
                                isSelected={gameState.selectedCardId === card.instanceId}
                                isDraggable={canAct && !isGameOver}
                                onDragStart={handleDragStart}
                                onDragEnd={resetDrag}
                                isChallenging={dragSourceId === card.instanceId}
                                onClick={() => handleFieldCardClick(card.instanceId, true)}
                            />
                        );
                    })}

                    {/* ACTION MENU */}
                    {gameState.selectedCardId && !isGameOver && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-amber-500/50 rounded-full px-6 py-2 flex items-center gap-4 shadow-2xl z-50">
                            <span className="text-slate-400 text-xs font-cinzel uppercase mr-2 border-r border-slate-700 pr-4">{selectedCard?.Name}</span>
                            <button onClick={handleQuest} disabled={!canQuest}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold font-cinzel text-sm ${canQuest ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-500'}`}>
                                <Scroll size={16} /> QUEST
                            </button>
                        </div>
                    )}
                </div>

                {/* BOTTOM HAND ZONE */}
                <div className="h-[35vh] bg-slate-900 border-t-4 border-slate-800 flex relative z-20 shadow-2xl">
                    {/* Inkwell */}
                    <div className="w-1/6 min-w-[140px] p-4 border-r border-slate-800 bg-slate-900/50">
                        <Inkwell cards={visualPlayer.inkwell} onDragOver={handleDragOver} onDrop={handleDropOnInkwell} />
                    </div>

                    {/* Hand */}
                    <div className={`flex-1 p-2 pb-0 flex items-end justify-center ${activeSide === 'OPPONENT' ? 'bg-red-950/20' : ''}`}>
                        <Hand 
                            cards={visualPlayer.hand} 
                            onPlayCard={handlePlayCard}
                            onInkCard={handleInkCard}
                            onDragStart={handleDragStart}
                            onDragEnd={resetDrag}
                        />
                    </div>

                    {/* Deck/Discard */}
                    <div className="w-1/6 min-w-[140px] p-4 border-l border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center gap-4">
                        <div className="text-center">
                            <div className="text-xl font-bold text-slate-400 font-cinzel">{visualPlayer.deck.length}</div>
                            <div className="text-[10px] text-slate-600 tracking-widest">DECK</div>
                        </div>
                        <div className="text-center">
                             <div className="text-xl font-bold text-slate-400 font-cinzel">{visualPlayer.discard.length}</div>
                             <div className="text-[10px] text-slate-600 tracking-widest">DISCARD</div>
                        </div>
                    </div>
                </div>

                {/* Perspective Indicator Overlay */}
                {activeSide === 'OPPONENT' && (
                    <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-1 rounded shadow-lg font-bold text-xs pointer-events-none z-40 animate-pulse border border-red-400">
                        CONTROLLING OPPONENT
                    </div>
                )}
          </div>
      </div>

      {/* --- GAME OVER --- */}
      {isGameOver && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md">
            {playerWon ? <Trophy size={80} className="text-amber-400 mb-4" /> : <Skull size={80} className="text-red-500 mb-4" />}
            <h1 className="text-6xl font-cinzel font-bold text-slate-200 mb-2">{playerWon ? 'VICTORY' : 'DEFEAT'}</h1>
            <button onClick={initializeGame} className="mt-8 px-8 py-3 bg-slate-800 border border-slate-600 hover:bg-slate-700 text-white font-cinzel rounded-lg flex items-center gap-2">
                <RotateCw size={20} /> Play Again
            </button>
        </div>
      )}
    </div>
  );
};