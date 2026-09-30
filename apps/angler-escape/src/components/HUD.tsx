import React from 'react';

interface HUDProps {
  score: number;
  highScore: number;
  plantsEaten: number;
  level: number;
  remainingSeconds: number;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  highScore,
  plantsEaten,
  level,
  remainingSeconds,
}) => {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = Math.floor(remainingSeconds % 60);
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isTimeLow = remainingSeconds < 60;

  return (
    <div className="w-full bg-zinc-900 border-2 border-zinc-800 py-1.5 px-3 rounded-t-lg text-zinc-100 font-nes text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 sm:gap-4">
          <div>
            <span className="text-zinc-500 text-[8.5px] block">SCORE</span>
            <span className="text-zinc-100 font-bold text-xs tracking-wider tabular-nums">{score}</span>
          </div>
          <div>
            <span className="text-zinc-500 text-[8.5px] block">TOP RECORD</span>
            <span className="text-emerald-400 font-bold text-xs tracking-wider tabular-nums">{Math.max(score, highScore)}</span>
          </div>
          <div>
            <span className="text-zinc-500 text-[8.5px] block">DEPTH ZONE</span>
            <span className="text-zinc-300 text-xs tracking-wider">ZONE {level}</span>
          </div>
          <div>
            <span className="text-zinc-500 text-[8.5px] block">PLANTS</span>
            <span className="text-zinc-300 text-xs tabular-nums">{plantsEaten}</span>
          </div>
        </div>

        {/* 10-Minute Ephemeral Limit Indicator (No restart) */}
        <div className="bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
          <span className="text-[8px] text-zinc-500 block leading-tight">EPHEMERAL LIMIT</span>
          <span
            className={`text-xs font-bold tabular-nums tracking-widest ${
              isTimeLow ? 'text-rose-400 animate-pulse' : 'text-zinc-200'
            }`}
          >
            {timeFormatted}
          </span>
        </div>
      </div>
    </div>
  );
};
