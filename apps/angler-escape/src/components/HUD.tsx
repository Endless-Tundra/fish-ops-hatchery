import React from 'react';
import { Volume2, VolumeX, Pause, Play, Trophy, Server, RotateCcw } from 'lucide-react';

interface HUDProps {
  score: number;
  highScore: number;
  plantsEaten: number;
  level: number;
  remainingSeconds: number;
  isPaused: boolean;
  isMuted: boolean;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onOpenLeaderboard: () => void;
  onOpenContainers: () => void;
  onRestartSession: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  highScore,
  plantsEaten,
  level,
  remainingSeconds,
  isPaused,
  isMuted,
  onTogglePause,
  onToggleMute,
  onOpenLeaderboard,
  onOpenContainers,
  onRestartSession,
}) => {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = Math.floor(remainingSeconds % 60);
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isTimeLow = remainingSeconds < 60;

  return (
    <div className="w-full max-w-[800px] mx-auto bg-slate-900 border-2 border-slate-700 p-3 rounded-t-lg text-slate-100 flex flex-col gap-2 font-nes text-xs">
      {/* Top Stat Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-400 text-[10px] block">SCORE</span>
            <span className="text-amber-400 font-bold text-sm tracking-wider tabular-nums">{score}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">TOP RECORD</span>
            <span className="text-emerald-400 font-bold text-sm tracking-wider tabular-nums">{Math.max(score, highScore)}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">DEPTH ZONE</span>
            <span className="text-cyan-400 text-sm tracking-wider">ZONE {level}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">PLANTS EATEN</span>
            <span className="text-teal-300 text-sm tabular-nums">{plantsEaten}</span>
          </div>
        </div>

        {/* 10-Minute Ephemeral Limit Indicator */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
          <div>
            <span className="text-[9px] text-slate-400 block">EPHEMERAL LIMIT</span>
            <span
              className={`text-sm font-bold tabular-nums tracking-widest ${
                isTimeLow ? 'text-red-500 animate-pulse' : 'text-amber-300'
              }`}
            >
              {timeFormatted}
            </span>
          </div>
          <button
            onClick={onRestartSession}
            title="Reset 10-Minute Session"
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Control Buttons Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePause}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-600 transition-colors text-[10px]"
          >
            {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
            <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
          </button>

          <button
            onClick={onToggleMute}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] transition-colors ${
              isMuted
                ? 'bg-red-950/60 border-red-800 text-red-300'
                : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3 text-cyan-400" />}
            <span>{isMuted ? 'MUTED' : 'AUDIO'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenLeaderboard}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/80 rounded transition-colors text-[10px]"
          >
            <Trophy className="w-3 h-3" />
            <span>SCORES</span>
          </button>

          <button
            onClick={onOpenContainers}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/80 rounded transition-colors text-[10px]"
          >
            <Server className="w-3 h-3" />
            <span>3 CONTAINERS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
