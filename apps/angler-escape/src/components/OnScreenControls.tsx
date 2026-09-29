import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { Direction } from '../types';

interface OnScreenControlsProps {
  onDirection: (dir: Direction) => void;
}

export const OnScreenControls: React.FC<OnScreenControlsProps> = ({ onDirection }) => {
  return (
    <div className="w-full max-w-[800px] mx-auto mt-2 flex items-center justify-between px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-b-lg">
      <div className="text-[10px] text-slate-400 font-nes hidden sm:block">
        KEYS: <span className="text-cyan-400">WASD</span> / <span className="text-cyan-400">ARROWS</span>
      </div>

      {/* Retro D-Pad */}
      <div className="relative w-36 h-36 mx-auto sm:mx-0">
        {/* Up */}
        <button
          onClick={() => onDirection('UP')}
          className="absolute top-0 left-12 w-12 h-12 bg-slate-800 active:bg-cyan-600 border border-slate-700 active:border-cyan-400 rounded flex items-center justify-center text-slate-300 active:text-white shadow"
          aria-label="Move Up"
        >
          <ArrowUp className="w-6 h-6" />
        </button>

        {/* Left */}
        <button
          onClick={() => onDirection('LEFT')}
          className="absolute top-12 left-0 w-12 h-12 bg-slate-800 active:bg-cyan-600 border border-slate-700 active:border-cyan-400 rounded flex items-center justify-center text-slate-300 active:text-white shadow"
          aria-label="Move Left"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        {/* Center D-Pad Hub */}
        <div className="absolute top-12 left-12 w-12 h-12 bg-slate-900 border border-slate-850 flex items-center justify-center pointer-events-none">
          <div className="w-3 h-3 rounded-full bg-slate-700" />
        </div>

        {/* Right */}
        <button
          onClick={() => onDirection('RIGHT')}
          className="absolute top-12 right-0 w-12 h-12 bg-slate-800 active:bg-cyan-600 border border-slate-700 active:border-cyan-400 rounded flex items-center justify-center text-slate-300 active:text-white shadow"
          aria-label="Move Right"
        >
          <ArrowRight className="w-6 h-6" />
        </button>

        {/* Down */}
        <button
          onClick={() => onDirection('DOWN')}
          className="absolute bottom-0 left-12 w-12 h-12 bg-slate-800 active:bg-cyan-600 border border-slate-700 active:border-cyan-400 rounded flex items-center justify-center text-slate-300 active:text-white shadow"
          aria-label="Move Down"
        >
          <ArrowDown className="w-6 h-6" />
        </button>
      </div>

      <div className="text-[10px] text-slate-400 font-nes text-right hidden sm:block">
        FOLLOWS <span className="text-cyan-300">BUBBLE TRAIL</span>
      </div>
    </div>
  );
};
