import React from 'react';
import { GameBoard } from './components/GameBoard';

function App() {
  return (
    <div className="antialiased text-slate-200 selection:bg-amber-500 selection:text-slate-900">
      <GameBoard />
    </div>
  );
}

export default App;