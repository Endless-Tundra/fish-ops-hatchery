import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { Direction } from '../types';

interface OnScreenControlsProps {
  onDirection: (dir: Direction) => void;
}

export const OnScreenControls: React.FC<OnScreenControlsProps> = ({ onDirection }) => {
  return (
    <div className="w-full max-w-[620px] mx-auto mt-1 flex items-center justify-between px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-b-lg">
      <div className="text-[9px] text-zinc-500 font-nes hidden sm:block">
        KEYS: <span className="text-zinc-200">WASD</span> / <span className="text-zinc-200">ARROWS</span>
      </div>

      {/* Retro D-Pad (Compact) */}
      <div className="relative w-24 h-24 mx-auto sm:mx-0">
        {/* Up */}
        <button
          onClick={() => onDirection('UP')}
          className="absolute top-0 left-8 w-8 h-8 bg-zinc-800 hover:bg-zinc-750 active:bg-zinc-700 border border-zinc-700 active:border-zinc-500 rounded flex items-center justify-center text-zinc-300 active:text-white shadow"
          aria-label="Move Up"
        >
          <ArrowUp className="w-4 h-4" />
        </button>

        {/* Left */}
        <button
          onClick={() => onDirection('LEFT')}
          className="absolute top-8 left-0 w-8 h-8 bg-zinc-800 hover:bg-zinc-750 active:bg-zinc-700 border border-zinc-700 active:border-zinc-500 rounded flex items-center justify-center text-zinc-300 active:text-white shadow"
          aria-label="Move Left"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Center D-Pad Hub */}
        <div className="absolute top-8 left-8 w-8 h-8 bg-zinc-900 border border-zinc-800 flex items-center justify-center pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-zinc-700" />
        </div>

        {/* Right */}
        <button
          onClick={() => onDirection('RIGHT')}
          className="absolute top-8 right-0 w-8 h-8 bg-zinc-800 hover:bg-zinc-750 active:bg-zinc-700 border border-zinc-700 active:border-zinc-500 rounded flex items-center justify-center text-zinc-300 active:text-white shadow"
          aria-label="Move Right"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Down */}
        <button
          onClick={() => onDirection('DOWN')}
          className="absolute bottom-0 left-8 w-8 h-8 bg-zinc-800 hover:bg-zinc-750 active:bg-zinc-700 border border-zinc-700 active:border-zinc-500 rounded flex items-center justify-center text-zinc-300 active:text-white shadow"
          aria-label="Move Down"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      </div>

      <div className="text-[9px] text-zinc-500 font-nes text-right hidden sm:block">
        BUBBLE SCENT <span className="text-zinc-300">TRACKED</span>
      </div>
    </div>
  );
};
