import React from 'react';
import { GameCard } from '../types';
import { Card } from './Card';

interface HandProps {
  cards: GameCard[];
  onPlayCard: (id: string) => void;
  onInkCard: (id: string) => void;
  // Drag Support
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragEnd?: () => void;
}

export const Hand: React.FC<HandProps> = ({ cards, onPlayCard, onInkCard, onDragStart, onDragEnd }) => {
  return (
    <div className="relative flex items-end justify-center h-full w-full px-4 perspective-1000">
      <div className="flex -space-x-12 hover:-space-x-4 transition-all duration-300 pb-4">
        {cards.map((card, index) => (
          <div 
            key={card.instanceId} 
            // Use !z-50 to override the inline style index on hover
            className="group relative transition-all duration-300 hover:-translate-y-8 hover:!z-50"
            style={{ zIndex: index }}
          >
            <Card 
                card={card} 
                isDraggable={true} // Enable dragging for all cards in hand
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
            />
            
            {/* Action Buttons on Hover */}
            <div className="absolute -top-12 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                <button 
                    onClick={() => onPlayCard(card.instanceId)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-3 py-1.5 rounded shadow-lg font-bold border border-emerald-400/50 hover:scale-110 transition-transform uppercase tracking-wider"
                >
                    Play
                </button>
                {card.Inkable && (
                    <button 
                        onClick={() => onInkCard(card.instanceId)}
                        className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] px-3 py-1.5 rounded shadow-lg font-bold border border-amber-400/50 hover:scale-110 transition-transform uppercase tracking-wider"
                    >
                        Ink
                    </button>
                )}
            </div>
          </div>
        ))}
      </div>
       {cards.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full w-full text-slate-600">
                <span className="text-sm font-cinzel">No Cards in Hand</span>
            </div>
        )}
    </div>
  );
};