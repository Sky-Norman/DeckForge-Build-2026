import React from 'react';
import { GameCard } from '../types';
import { Card } from './Card';
import { Droplet } from 'lucide-react';

interface InkwellProps {
  cards: GameCard[];
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export const Inkwell: React.FC<InkwellProps> = ({ cards, onDragOver, onDrop }) => {
  return (
    <div 
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="flex flex-col items-center justify-center h-full w-full bg-slate-900/50 rounded-xl border border-slate-700/50 p-2 relative transition-colors hover:border-amber-500/30"
    >
      <div className="absolute -top-3 left-4 bg-slate-800 px-2 py-0.5 rounded border border-slate-600 flex items-center gap-2 text-xs text-amber-400 font-cinzel shadow-lg z-10">
        <Droplet size={14} className="fill-amber-400" />
        <span>INKWELL ({cards.length})</span>
      </div>
      
      <div className="flex flex-wrap content-start justify-center gap-1 overflow-y-auto w-full h-full pt-4">
        {cards.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50">
                <Droplet size={32} />
                <span className="text-xs mt-1">Empty</span>
            </div>
        )}
        {cards.map((card, index) => (
          <div key={card.instanceId} className="-mb-20 last:mb-0 transition-all hover:mb-0 z-0 hover:z-10">
            <Card card={card} inInkwell />
          </div>
        ))}
      </div>
    </div>
  );
};