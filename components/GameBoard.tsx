import React, { useEffect, useState, useRef } from 'react';
import { GamePhase, GameState, GameCard } from '../types';
import { fetchFullLibrary } from '../services/cardService';
import { addToInkwell, createDeck, drawCard, playCard, questCard, challengeCard, startTurn, shuffleDeck, swapPlayers, hydrateDeckFromManifest } from '../utils/gameEngine';
import { OFFICIAL_STARTER_DECKS, DeckManifest } from '../utils/deckManifests';
import { generateOpponentMove } from '../utils/aiEngine';
import { simulateGames } from '../utils/batchSimulator';
import { Hand } from './Hand';
import { Inkwell } from './Inkwell';
import { Card } from './Card';
import { RefreshCw, Scroll, RotateCcw, RotateCw, Trophy, Skull, Loader2, Bot, LayoutTemplate, Redo2, Eye, EyeOff, Activity, FlaskConical, Swords, Play, Settings2 } from 'lucide-react';

const INITIAL_HAND_SIZE = 7;
const SANDBOX_STARTING_INK_COUNT = 5;
const WINNING_LORE = 20;

export const GameBoard: React.FC = () => {
  // --- APP STATE ---
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [library, setLibrary] = useState<GameCard[]>([]);

  // --- SETUP STATE ---
  const [isSetupMode, setIsSetupMode] = useState(true);
  const [playerDeckKey, setPlayerDeckKey] = useState<string>("AMBER_AMETHYST_C1");
  const [opponentDeckKey, setOpponentDeckKey] = useState<string>("RUBY_SAPPHIRE_C7");
  const [jumpstartEnabled, setJumpstartEnabled] = useState(true);
  
  // HISTORY (Undo/Redo)
  const [history, setHistory] = useState<GameState[]>([]);
  const [future, setFuture] = useState<GameState[]>([]); 

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
    opponent: { deck: [], hand: [], inkwell: [], field: [], discard: [], lore: 0, inkCommitted: false },
    loreVelocity: 0
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

  // --- INITIALIZATION (Load Library Only) ---
  useEffect(() => {
      const loadLibrary = async () => {
          setIsAppLoading(true);
          const lib = await fetchFullLibrary();
          setLibrary(lib as GameCard[]);
          setIsAppLoading(false);
      };
      loadLibrary();
  }, []);

  // --- START GAME (Hydrate Decks) ---
  const startGame = () => {
    if (library.length === 0) return;

    // 1. Hydrate Player Deck
    const pManifest = OFFICIAL_STARTER_DECKS[playerDeckKey];
    let pDeck = hydrateDeckFromManifest(pManifest, library);
    pDeck = shuffleDeck(pDeck);

    // 2. Hydrate Opponent Deck
    const oManifest = OFFICIAL_STARTER_DECKS[opponentDeckKey];
    let oDeck = hydrateDeckFromManifest(oManifest, library);
    oDeck = shuffleDeck(oDeck);

    // 3. Setup Board
    let startingInk: GameCard[] = [];
    let opponentStartingInk: GameCard[] = [];
    
    // Jumpstart Logic
    if (jumpstartEnabled) {
        startingInk = pDeck.splice(0, SANDBOX_STARTING_INK_COUNT).map(c => ({
            ...c, isFaceDown: true, isExerted: false, damage: 0
        }));
        opponentStartingInk = oDeck.splice(0, SANDBOX_STARTING_INK_COUNT).map(c => ({
            ...c, isFaceDown: true, isExerted: false, damage: 0
        }));
    }

    // Initial Draw
    let initialPlayerState = drawCard({
      deck: pDeck, hand: [], inkwell: startingInk, field: [], discard: [], lore: 0, inkCommitted: false
    }, INITIAL_HAND_SIZE);

    let initialOpponentState = drawCard({
      deck: oDeck, hand: [], inkwell: opponentStartingInk, field: [], discard: [], lore: 0, inkCommitted: false
    }, INITIAL_HAND_SIZE);

    setGameState({
        turn: 1,
        phase: GamePhase.READY,
        loading: false,
        selectedCardId: undefined,
        player: initialPlayerState,
        opponent: initialOpponentState,
        loreVelocity: 0
    });
    
    setHistory([]);
    setFuture([]);
    setAiLog([
        "Tactical Oracle Online.", 
        `Matchup: ${pManifest.name} vs ${oManifest.name}`,
        `Library Size: ${library.length}`,
        "Ready."
    ]);
    setActiveSide('PLAYER');
    setIsSetupMode(false);
  };

  // --- BATCH SIMULATION (TACTICAL ORACLE) ---
  const handleRunBatch = async () => {
      if (library.length === 0) {
          setAiLog(prev => [...prev, "Error: Library not loaded."]);
          return;
      }
      
      setAiLog(prev => [...prev, "Initializing Power Level Analysis...", "Simulating 100 Matches..."]);
      
      // Filter library based on active deck selections for the simulation
      const pManifest = OFFICIAL_STARTER_DECKS[playerDeckKey];
      const pTemplate = hydrateDeckFromManifest(pManifest, library);

      // Self-Play Mirror Match for Power Level
      const stats = await simulateGames(pTemplate, pTemplate, 100, (i) => {
          if (i % 25 === 0) setAiLog(prev => [...prev, `Simulating match ${i}...`]);
      });

      setAiLog(prev => [
          ...prev, 
          "--- POWER LEVEL REPORT ($P_L$) ---",
          `Deck: ${pManifest.name}`,
          `Power Score: ${stats.powerLevelScore}`,
          `Win Rate (Mirror): ${stats.winRate}%`,
          `Avg Turns: ${stats.avgTurns}`,
          `Avg Lore Vel: ${stats.avgLoreVelocity}`,
          "----------------------------------"
      ]);
  };

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
      
      setFuture(prev => [gameState, ...prev]); 
      setGameState(previousState);
      setHistory(newHistory);
      setAiLog(prev => [...prev, "Undo performed."]);
  };

  const handleRedo = () => {
      if (future.length === 0) return;
      const nextState = future[0];
      const newFuture = future.slice(1);

      setHistory(prev => [...prev, gameState]); 
      setGameState(nextState);
      setFuture(newFuture);
      setAiLog(prev => [...prev, "Redo performed."]);
  };

  // --- ACTION WRAPPERS (Perspective Aware) ---
  
  const executeAction = (actionFn: (currentState: GameState) => GameState) => {
      if (isGameOver) return;
      
      let workingState = activeSide === 'OPPONENT' ? swapPlayers(gameState) : gameState;
      workingState = actionFn(workingState);
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
    
    if (isFromActivePlayerSide) {
      setGameState(prev => ({
         ...prev,
         selectedCardId: prev.selectedCardId === cardId ? undefined : cardId
      }));
    } else {
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

  // --- VIEW RENDER ---
  
  if (isAppLoading) return <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-amber-500"><Loader2 className="animate-spin" /></div>;

  if (isSetupMode) {
      return (
          <div className="flex flex-col h-screen w-screen bg-slate-950 items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-950/80 to-black pointer-events-none"></div>
              
              <div className="z-10 bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col gap-8">
                  <div className="text-center border-b border-slate-800 pb-6">
                      <h1 className="text-4xl font-cinzel font-bold text-amber-500 tracking-wider mb-2">DeckForge Simulator</h1>
                      <p className="text-slate-500 font-sans text-sm">Select archetypes for simulation</p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-8 items-stretch justify-center">
                      {/* Player Setup */}
                      <div className="flex-1 flex flex-col gap-4">
                          <div className="text-emerald-500 font-cinzel font-bold text-lg flex items-center gap-2">
                              <Eye size={20} /> Player Deck
                          </div>
                          <DeckSelect 
                             value={playerDeckKey} 
                             onChange={setPlayerDeckKey} 
                             manifests={OFFICIAL_STARTER_DECKS} 
                          />
                      </div>

                      {/* VS Divider */}
                      <div className="flex flex-col items-center justify-center text-slate-600">
                          <div className="hidden md:block h-full w-px bg-slate-800"></div>
                          <div className="bg-slate-950 border border-slate-700 p-2 rounded-full my-4">
                              <Swords size={24} className="text-slate-400" />
                          </div>
                          <div className="hidden md:block h-full w-px bg-slate-800"></div>
                      </div>

                      {/* Opponent Setup */}
                      <div className="flex-1 flex flex-col gap-4">
                          <div className="text-red-500 font-cinzel font-bold text-lg flex items-center gap-2">
                              <Bot size={20} /> Opponent Deck
                          </div>
                          <DeckSelect 
                             value={opponentDeckKey} 
                             onChange={setOpponentDeckKey} 
                             manifests={OFFICIAL_STARTER_DECKS} 
                          />
                      </div>
                  </div>
                  
                  {/* Settings Toggle (Jumpstart) */}
                   <div className="flex justify-center py-4">
                      <label className="flex items-center gap-3 cursor-pointer group select-none">
                          <div className={`w-5 h-5 border rounded transition-colors flex items-center justify-center ${jumpstartEnabled ? 'bg-amber-600 border-amber-500' : 'border-slate-600 bg-slate-800'}`}>
                              {jumpstartEnabled && <span className="text-white font-bold text-xs">✓</span>}
                          </div>
                          <input type="checkbox" className="hidden" checked={jumpstartEnabled} onChange={e => setJumpstartEnabled(e.target.checked)} />
                          <div className="text-slate-400 group-hover:text-amber-400 transition-colors text-sm font-sans">
                              Enable "Jumpstart" (Start with 5 Ink & Hand)
                          </div>
                      </label>
                  </div>

                  <button 
                    onClick={startGame}
                    className="bg-amber-700 hover:bg-amber-600 text-amber-50 py-4 rounded-lg font-cinzel font-bold text-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-3 border border-amber-500/50"
                  >
                      <Play size={24} fill="currentColor" /> ENTER FORGE
                  </button>
              </div>
          </div>
      );
  }

  // --- MAIN GAME BOARD RENDER ---
  const visualPlayer = activeSide === 'PLAYER' ? gameState.player : gameState.opponent;
  const visualOpponent = activeSide === 'PLAYER' ? gameState.opponent : gameState.player;
  const selectedCard = visualPlayer.field.find(c => c.instanceId === gameState.selectedCardId);
  const canQuest = selectedCard && !selectedCard.isExerted && !selectedCard.isDried;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden relative font-sans">
      
      {/* --- Top Bar --- */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shadow-md z-50">
        <div className="text-slate-400 font-cinzel text-lg flex items-center gap-2">
            <span className="text-amber-600 font-bold">DeckForge</span>
            <span className="text-xs text-slate-600 border border-slate-700 px-2 py-0.5 rounded ml-2">TACTICAL ORACLE</span>
        </div>
        
        {/* STATS */}
        <div className="flex gap-12">
             <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Enemy Lore</span>
                <span className="text-2xl font-bold text-red-500 font-cinzel">{visualOpponent.lore} / 20</span>
            </div>
            <div className="flex flex-col items-center justify-center">
                 <div className="text-slate-600 font-cinzel text-xs">TURN {gameState.turn}</div>
                 <div className="text-2xl font-bold text-slate-200 font-cinzel leading-none">{gameState.phase}</div>
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
                      <LayoutTemplate size={18} /> Tactical Oracle
                  </h2>
              </div>

              {/* Match Info */}
              <div className="p-4 border-b border-slate-800 space-y-2">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider flex items-center gap-2">
                      <Swords size={12} /> Active Match
                  </div>
                  <div className="text-[10px] bg-slate-950 p-2 rounded border border-slate-800 text-slate-400">
                      <div className="flex justify-between mb-1">
                          <span className="text-emerald-500">Player:</span>
                          <span>{OFFICIAL_STARTER_DECKS[playerDeckKey]?.name || "Custom"}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-red-500">Opponent:</span>
                          <span>{OFFICIAL_STARTER_DECKS[opponentDeckKey]?.name || "Custom"}</span>
                      </div>
                  </div>
                  <button 
                    onClick={() => setIsSetupMode(true)}
                    className="w-full text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 py-2 rounded border border-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                      <Settings2 size={12} /> Reconfigure Match
                  </button>
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
              </div>

              {/* HEURISTICS METRIC */}
              <div className="p-4 border-b border-slate-800">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Lore Velocity</div>
                  <div className="flex items-center justify-between bg-black/40 p-3 rounded border border-slate-700">
                      <div className="flex items-center gap-2 text-sky-400">
                          <Activity size={18} />
                          <span className="font-mono text-xl font-bold">{gameState.loreVelocity}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 text-right">
                          Points / Turn<br/>(Predictive)
                      </div>
                  </div>
              </div>

              {/* AI Controls */}
              <div className="p-4 flex-1 flex flex-col min-h-0">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Automated Logic</div>
                  
                  <button 
                    onClick={handleExecuteAI}
                    disabled={isGameOver}
                    className="w-full bg-slate-800 border border-slate-600 hover:bg-slate-700 text-slate-200 py-3 rounded-md font-cinzel text-sm font-bold flex items-center justify-center gap-2 shadow-lg mb-2 transition-all"
                  >
                      <Bot size={18} className="text-sky-400" />
                      Step AI
                  </button>

                  <button 
                    onClick={handleRunBatch}
                    className="w-full bg-indigo-900/50 border border-indigo-500 hover:bg-indigo-800 text-indigo-100 py-3 rounded-md font-cinzel text-sm font-bold flex items-center justify-center gap-2 shadow-lg mb-4 transition-all"
                  >
                      <FlaskConical size={18} className="text-indigo-300" />
                      Run Power Analysis
                  </button>

                  <div className="flex-1 bg-black/40 rounded border border-slate-800 flex flex-col overflow-hidden">
                      <div className="bg-slate-900 px-3 py-2 text-[10px] font-bold text-slate-500 border-b border-slate-800">SIMULATION LOG</div>
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
                {/* OPPONENT FIELD */}
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

                {/* PLAYER FIELD */}
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
            <button onClick={() => setIsSetupMode(true)} className="mt-8 px-8 py-3 bg-slate-800 border border-slate-600 hover:bg-slate-700 text-white font-cinzel rounded-lg flex items-center gap-2">
                <RotateCw size={20} /> Play Again
            </button>
        </div>
      )}
    </div>
  );
};

// --- HELPER COMPONENT ---
const DeckSelect = ({ value, onChange, manifests }: { value: string, onChange: (v: string) => void, manifests: Record<string, DeckManifest> }) => {
    const selected = manifests[value];
    return (
        <div className="flex flex-col gap-2">
            <select 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 p-3 rounded font-sans text-sm outline-none focus:border-amber-500 transition-colors"
            >
                {Object.entries(manifests).map(([k, m]) => (
                    <option key={k} value={k}>{m.name}</option>
                ))}
            </select>
            <div className="bg-slate-800/50 p-3 rounded border border-slate-800 text-xs text-slate-400 min-h-[60px] leading-relaxed">
                {selected?.description || "No description available."}
            </div>
        </div>
    )
}