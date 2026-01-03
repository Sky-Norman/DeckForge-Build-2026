import React, { useState } from 'react';
import { GameCard } from '../types';
import { Sparkles, Ban, Sword, Shield, Scroll } from 'lucide-react';

interface CardProps {
  card: GameCard;
  onClick?: () => void;
  className?: string;
  inInkwell?: boolean;
  isSelected?: boolean;
  isEnemy?: boolean;
  isTargetable?: boolean;
  
  // Drag & Drop Props
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, id: string) => void;
  onDragEnter?: (id: string) => void;
  onDragEnd?: () => void;
  
  // Combat Visuals
  isChallenging?: boolean;    // Is this card currently being dragged to attack?
  isUnderAttack?: boolean;    // Is this card currently being hovered by an attacker?
}

export const Card: React.FC<CardProps> = ({ 
  card, 
  onClick, 
  className = '', 
  inInkwell = false, 
  isSelected = false, 
  isEnemy = false,
  isTargetable = false,
  
  isDraggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnter,
  onDragEnd,
  
  isChallenging = false,
  isUnderAttack = false
}) => {
  const [imageError, setImageError] = useState(false);
  const isExerted = card.isExerted;

  // --- Handlers ---
  const handleDragStart = (e: React.DragEvent) => {
      if (!isDraggable || !onDragStart) {
          e.preventDefault();
          return;
      }
      // Create a "ghost" image or just let default behavior happen
      onDragStart(e, card.instanceId);
  };

  const handleDragEnter = (e: React.DragEvent) => {
      if (onDragEnter) {
          e.preventDefault();
          onDragEnter(card.instanceId);
      }
  };

  const handleDrop = (e: React.DragEvent) => {
      if (onDrop) {
          e.preventDefault();
          onDrop(e, card.instanceId);
      }
  };

  // --- Dynamic Styles ---
  // Base classes
  let borderClass = isSelected ? 'ring-4 ring-amber-400 scale-105 z-20 shadow-[0_0_30px_rgba(251,191,36,0.6)]' : 'border border-slate-800';
  let animationClass = '';
  let shadowClass = 'shadow-xl';

  // Combat Override Styles
  if (isChallenging) {
      borderClass = 'ring-4 ring-red-500 scale-110 z-30';
      shadowClass = 'shadow-[0_0_40px_rgba(239,68,68,0.8)]';
      animationClass = 'animate-pulse';
  } else if (isUnderAttack) {
      borderClass = 'ring-4 ring-orange-500 scale-105 z-20';
      shadowClass = 'shadow-[0_0_40px_rgba(249,115,22,0.9)]';
      animationClass = 'animate-pulse';
  } else if (isTargetable) {
      borderClass = 'ring-4 ring-red-500/50 scale-105 z-20 cursor-crosshair';
  }

  // --- Render: Inkwell / Face Down ---
  if (card.isFaceDown || inInkwell) {
    return (
      <div 
        onClick={onClick}
        className={`relative group w-24 h-36 rounded-lg border-2 border-slate-700 bg-slate-800 cursor-pointer shadow-lg transition-all duration-300 ${isExerted ? 'rotate-90' : ''} ${className}`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-24 rounded border border-slate-600 bg-slate-900 opacity-50 flex items-center justify-center flex-col gap-1">
                <Sparkles size={16} className="text-amber-600/50" />
                <span className="text-slate-500 font-cinzel text-[10px] tracking-widest">INK</span>
            </div>
        </div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-30"></div>
        {/* Hover Info for Ink */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-slate-700 z-50">
            {card.Name}
        </div>
      </div>
    );
  }

  // --- Render: Card Front ---
  return (
    <div 
      onClick={onClick}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragEnd={onDragEnd}
      className={`
        relative w-40 h-56 rounded-xl cursor-pointer transition-all duration-200 transform 
        ${isExerted ? 'rotate-6 translate-y-2 grayscale-[0.2]' : 'hover:-translate-y-4 hover:shadow-[0_0_20px_rgba(251,191,36,0.3)]'}
        ${borderClass}
        ${shadowClass}
        ${animationClass}
        ${isEnemy && !isExerted && !isTargetable && !isUnderAttack ? 'opacity-90' : ''}
        overflow-hidden select-none bg-slate-900 
        ${className}
      `}
    >
        {/* Summoning Sickness Indicator */}
        {card.isDried && !isExerted && !inInkwell && !isEnemy && (
            <div className="absolute top-2 right-2 z-30 bg-black/50 rounded-full p-1 animate-pulse" title="Drying (Cannot Act)">
                <Ban size={16} className="text-slate-400" />
            </div>
        )}

        {/* Damage Counters */}
        {card.damage > 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center pointer-events-none">
                <div className="bg-red-600/90 text-white font-bold font-cinzel text-xl w-10 h-10 rounded-full border-2 border-red-400 flex items-center justify-center shadow-lg animate-bounce">
                    -{card.damage}
                </div>
            </div>
        )}

        {/* --- 1. Image Layer --- */}
        {!imageError && (
            <img 
                src={card.Image} 
                alt={card.Name}
                className="absolute inset-0 w-full h-full object-cover z-0"
                onError={() => setImageError(true)}
                loading="lazy"
            />
        )}

        {/* --- 2. CSS Fallback Layer (High Fidelity) --- */}
        {imageError && (
            <div className={`absolute inset-0 flex flex-col z-10 p-2 ${card.Inkable ? 'bg-slate-800' : 'bg-slate-900'}`}>
                
                {/* Header: Cost & Name */}
                <div className="flex justify-between items-start mb-1">
                    <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-amber-500 flex items-center justify-center text-amber-400 font-bold font-cinzel text-lg shadow-lg z-20 relative">
                            {card.Cost}
                        </div>
                        {card.Inkable && (
                            <div className="absolute -inset-1 rounded-full border border-amber-500/50 animate-pulse"></div>
                        )}
                    </div>
                    <div className="flex-1 ml-2 mt-1 overflow-hidden">
                        <div className="text-[10px] leading-tight font-bold text-slate-900 bg-white/90 px-2 py-1 rounded-r-lg border-l-4 border-slate-800 shadow-sm font-cinzel truncate">
                            {card.Name}
                        </div>
                    </div>
                </div>

                {/* Art Placeholder */}
                <div className="flex-1 bg-slate-800/80 rounded border border-slate-600/50 m-1 flex items-center justify-center overflow-hidden relative group">
                     <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                     <span className="text-slate-500 text-xs font-cinzel text-center px-2 opacity-50">
                        {card.Type}<br/>
                        <span className="text-[9px] italic">{card.Class}</span>
                     </span>
                </div>

                {/* Stats Row (Strength / Willpower / Lore) */}
                <div className="flex justify-between items-center px-1 mb-1">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-700 border border-slate-500 text-white font-bold text-xs shadow-md" title="Strength">
                        <Sword size={10} className="mr-0.5" /> {card.Strength}
                    </div>
                     <div className="flex items-center justify-center w-6 h-8 bg-slate-900 border border-emerald-500/50 rounded text-emerald-400 font-bold text-xs shadow-md" title="Lore">
                         <div className="flex flex-col items-center">
                            <Scroll size={8} />
                            {card.Lore}
                         </div>
                    </div>
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-700 border border-slate-500 text-white font-bold text-xs shadow-md" title="Willpower">
                        <Shield size={10} className="mr-0.5" /> {card.Willpower}
                    </div>
                </div>

                {/* Body Text Area */}
                <div className="bg-slate-100/95 rounded p-2 min-h-[50px] flex flex-col justify-center border-2 border-slate-300 relative shadow-inner">
                    {card.Abilities && card.Abilities.length > 0 ? (
                        <div className="text-[8px] text-slate-900 font-serif leading-tight">
                            {card.Abilities.map((ability, i) => (
                                <p key={i} className="mb-1 last:mb-0">{ability}</p>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[8px] text-slate-500 italic text-center">{card.Flavor_Text}</p>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};
