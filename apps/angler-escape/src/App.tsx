import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine, GameEngineState } from './game/engine';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { LeaderboardModal } from './components/LeaderboardModal';
import { ContainersModal } from './components/ContainersModal';
import { HighScore, Direction, GameState } from './types';
import { GAME_TIME_LIMIT_SECONDS, formatTimeLimitLabel } from '../config';
import { Play, RotateCcw, Trophy, Layers, Compass, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

export default function App() {
  const [engineState, setEngineState] = useState<GameEngineState | null>(null);
  const [highScore, setHighScore] = useState<number>(0);
  const [pendingScore, setPendingScore] = useState<HighScore | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isContainersOpen, setIsContainersOpen] = useState(false);

  const engineRef = useRef<GameEngine | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch High Scores on load
  const loadHighScores = useCallback(async () => {
    try {
      const res = await fetch('/api/scores');
      const data = await res.json();
      if (data.scores && data.scores.length > 0) {
        setHighScore(data.scores[0].score);
      }
    } catch {
      // Backend fallback
    }
  }, []);

  // Fetch Session from Backend
  const syncSession = useCallback(async () => {
    try {
      const res = await fetch('/api/session');
      const data = await res.json();
      if (data && typeof data.remainingSeconds === 'number') {
        if (engineRef.current) {
          engineRef.current.updateSessionTime(data.remainingSeconds, data.limitSeconds);
        }
      }
    } catch {
      // Session fallback
    }
  }, []);

  // Reset Attract Mode Idle Timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // Only start idle attract demo if on GAME_OVER screen
    const currentStatus = engineRef.current?.state.gameState;
    if (currentStatus === 'GAME_OVER') {
      idleTimerRef.current = setTimeout(() => {
        if (engineRef.current && engineRef.current.state.gameState === 'GAME_OVER') {
          engineRef.current.startDemoMode();
        }
      }, 8000); // 8 seconds of idle enters demo mode
    }
  }, []);

  // Initialize Game Engine
  useEffect(() => {
    loadHighScores();
    syncSession();

    const engine = new GameEngine(
      (nextState) => {
        setEngineState(nextState);
      },
      (finalScore) => {
        // When fish dies in the demo, just loop the demo - don't bring up the hall of fame
        if (engineRef.current?.state.demoMode) return;
        setPendingScore(finalScore);
        setIsLeaderboardOpen(true);
      }
    );

    engineRef.current = engine;
    setEngineState(engine.state);
    engine.start();

    // Start in demo attract mode
    engine.startDemoMode();

    // Session poll every 5 seconds
    const sessionInterval = setInterval(syncSession, 5000);

    return () => {
      engine.stop();
      clearInterval(sessionInterval);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [loadHighScores, syncSession]);

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      resetIdleTimer();

      if (!engineRef.current) return;
      const state = engineRef.current.state;

      // In DEMO mode or TITLE screen, any movement key starts the game!
      if (state.gameState === 'DEMO' || state.gameState === 'TITLE') {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 's', 'S', 'a', 'A', 'd', 'D', ' '].includes(e.key)) {
          e.preventDefault();
          engineRef.current.startNewGame();
          return;
        }
      }

      let dir: Direction = 'NONE';
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dir = 'UP';
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dir = 'DOWN';
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dir = 'LEFT';
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dir = 'RIGHT';

      if (dir !== 'NONE') {
        e.preventDefault();
        engineRef.current.setInputDirection(dir);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetIdleTimer]);

  // Handlers for UI buttons
  const handleStartGame = () => {
    if (engineRef.current) {
      engineRef.current.startNewGame();
      resetIdleTimer();
    }
  };

  const handleDirection = (dir: Direction) => {
    resetIdleTimer();
    if (engineRef.current) {
      engineRef.current.setInputDirection(dir);
    }
  };

  const handleCanvasClick = () => {
    resetIdleTimer();
    if (engineRef.current) {
      const gs = engineRef.current.state.gameState;
      if (gs === 'TITLE' || gs === 'DEMO') {
        engineRef.current.startNewGame();
      }
    }
  };

  if (!engineState) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-nes text-zinc-400 text-xs animate-pulse">
        INITIALIZING ANGLER ENGINE...
      </div>
    );
  }

  const isDemoOrTitle = engineState.gameState === 'DEMO' || engineState.gameState === 'TITLE';
  const isGameOver = engineState.gameState === 'GAME_OVER';
  const isSessionExpired = engineState.gameState === 'SESSION_EXPIRED';
  const isPlaying = engineState.gameState === 'PLAYING';

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-start p-2 sm:p-3 pb-8 sm:pb-12 select-none">
      {/* Top Header */}
      <header className="w-full max-w-5xl flex items-center justify-between py-1 border-b border-zinc-800 mb-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <h1 className="text-xs sm:text-sm font-nes text-zinc-100 font-bold tracking-wider">
            ANGLER ESCAPE
          </h1>
          <span className="text-[9px] text-zinc-500 font-nes hidden md:inline">
            · MEGABUG INSPIRED
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsContainersOpen(true)}
            className="flex items-center gap-1.5 text-[8.5px] font-nes px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white rounded transition-colors"
          >
            <Layers className="w-3 h-3 text-zinc-400" />
            <span>CONTAINERS</span>
          </button>
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="flex items-center gap-1.5 text-[8.5px] font-nes px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white rounded transition-colors"
          >
            <Trophy className="w-3 h-3 text-emerald-400" />
            <span>SCORES</span>
          </button>
        </div>
      </header>

      {/* Main Combined Stage: Game on Left/Center + Instructions on Side */}
      <div className="w-full max-w-5xl flex flex-col sm:flex-row items-center sm:items-stretch justify-center gap-3 sm:gap-4 my-1">
        {/* Left Column: Game HUD, Canvas, and Controls */}
        <div className="w-full flex-1 min-w-[280px] max-w-[650px] flex flex-col items-center">
          {/* HUD Display (Clean single-row stat bar) */}
          <HUD
            score={engineState.score}
            highScore={highScore}
            plantsEaten={engineState.plantsEaten}
            level={engineState.level}
            remainingSeconds={engineState.sessionRemainingSeconds}
          />

          {/* Canvas Area with Overlays */}
          <div className="relative w-full">
            <GameCanvas
              gameState={engineState}
              onCanvasClick={handleCanvasClick}
              onDirection={handleDirection}
            />

            {/* Game Over Screen Overlay */}
            {isGameOver && (
              <div className="absolute inset-0 bg-black/92 flex flex-col items-center justify-center p-5 text-center font-nes z-30">
                <h2 className="text-lg sm:text-xl text-rose-400 font-bold tracking-widest mb-1.5 drop-shadow-md">
                  CAUGHT BY THE SHARK!
                </h2>
                <p className="text-[9px] text-zinc-400 mb-4">
                  THE PREDATOR SNIFFED OUT YOUR BUBBLE TRAIL
                </p>

                <div className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded p-3 text-[9px] text-zinc-300 space-y-1.5 mb-4">
                  <div className="flex justify-between border-b border-zinc-800 pb-1">
                    <span className="text-zinc-500">FINAL SCORE</span>
                    <span className="text-emerald-400 font-bold tabular-nums">{engineState.score}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 pb-1">
                    <span className="text-zinc-500">PLANTS DEVOURED</span>
                    <span className="text-zinc-200 tabular-nums">{engineState.plantsEaten}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 pb-1">
                    <span className="text-zinc-500">MAX DEPTH</span>
                    <span className="text-zinc-200">ZONE {engineState.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">TIME SURVIVED</span>
                    <span className="text-zinc-200 tabular-nums">{Math.floor(engineState.survivalSeconds)} SECONDS</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    onClick={handleStartGame}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-[10px] rounded border border-emerald-400/40 shadow-lg shadow-emerald-950/40 transition-all transform hover:scale-105 active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>PLAY AGAIN</span>
                  </button>

                  <button
                    onClick={() => setIsLeaderboardOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[9px] rounded border border-zinc-700 transition-colors"
                  >
                    <Trophy className="w-3 h-3 text-emerald-400" />
                    <span>VIEW HIGH SCORES</span>
                  </button>
                </div>
              </div>
            )}

            {/* Session Expired Overlay */}
            {isSessionExpired && (
              <div className="absolute inset-0 bg-black/92 flex flex-col items-center justify-center p-5 text-center font-nes z-30">
                <h2 className="text-base sm:text-lg text-zinc-100 font-bold tracking-widest mb-1.5 drop-shadow-md">
                  {formatTimeLimitLabel(engineState.timeLimitSeconds || GAME_TIME_LIMIT_SECONDS)} LIMIT REACHED
                </h2>
                <p className="text-[9px] text-zinc-400 mb-4">
                  YOUR EPHEMERAL ABYSSAL EXPEDITION HAS CONCLUDED
                </p>

                <div className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded p-3 text-[9px] text-zinc-300 space-y-1.5 mb-4">
                  <div className="flex justify-between border-b border-zinc-800 pb-1">
                    <span className="text-zinc-500">SESSION SCORE</span>
                    <span className="text-emerald-400 font-bold tabular-nums">{engineState.score}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 pb-1">
                    <span className="text-zinc-500">PLANTS EATEN</span>
                    <span className="text-zinc-200 tabular-nums">{engineState.plantsEaten}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">ZONE REACHED</span>
                    <span className="text-zinc-200">ZONE {engineState.level}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsLeaderboardOpen(true)}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[10px] rounded border border-zinc-700 transition-colors"
                  >
                    <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                    <span>VIEW HIGH SCORES</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right / Side Column: Instructions & Manual */}
        <aside
          aria-label="Game Instructions and Controls"
          className="w-full sm:w-[260px] md:w-[280px] shrink-0 flex flex-col font-nes"
        >
          {/* Instructions Box */}
          <div className="bg-zinc-900/95 border-2 border-zinc-800 rounded-lg p-3 sm:p-3.5 text-left shadow-xl h-full flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2.5">
              <div className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <h2 className="text-[11px] text-zinc-100 font-bold tracking-wider">
                  INSTRUCTIONS
                </h2>
              </div>
              <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                MANUAL
              </span>
            </div>

            {/* Quick Action Button */}
            <button
              onClick={handleStartGame}
              className={`w-full mb-2.5 flex items-center justify-center gap-1.5 px-3 py-2 font-bold text-[9px] rounded border transition-all transform active:scale-95 ${
                isDemoOrTitle
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 border-emerald-400 shadow-md shadow-emerald-950/40 animate-pulse'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isPlaying ? 'RESTART EXPEDITION' : 'DIVE INTO ABYSS (START)'}</span>
            </button>

            {/* Rules List */}
            <div className="text-[8.5px] text-zinc-300 space-y-1.5 leading-relaxed">
              <div className="flex items-start gap-1.5 bg-zinc-950/60 p-1.5 rounded border border-zinc-800/80">
                <span className="text-emerald-400 font-bold shrink-0">1.</span>
                <span>Lantern illuminates circle around you in pitch darkness.</span>
              </div>
              <div className="flex items-start gap-1.5 bg-zinc-950/60 p-1.5 rounded border border-zinc-800/80">
                <span className="text-emerald-400 font-bold shrink-0">2.</span>
                <span>Eat glowing plants for points. Leaves a permanent bubble trail!</span>
              </div>
              <div className="flex items-start gap-1.5 bg-zinc-950/60 p-1.5 rounded border border-zinc-800/80">
                <span className="text-rose-400 font-bold shrink-0">3.</span>
                <span>The shark relentlessly tracks your bubble trail to catch you!</span>
              </div>
              <div className="flex items-start gap-1.5 bg-zinc-950/60 p-1.5 rounded border border-zinc-800/80">
                <span className="text-amber-400 font-bold shrink-0">4.</span>
                <span>Collect lanterns in maze to expand illumination radius.</span>
              </div>
              <div className="flex items-start gap-1.5 bg-zinc-950/60 p-1.5 rounded border border-zinc-800/80">
                <span className="text-cyan-400 font-bold shrink-0">5.</span>
                <span>{formatTimeLimitLabel(engineState.timeLimitSeconds || GAME_TIME_LIMIT_SECONDS)} Ephemeral Limit: Score high before session ends.</span>
              </div>
            </div>

            {/* Controls Guide */}
            <div className="mt-3 pt-2.5 border-t border-zinc-800">
              <div className="text-[8px] text-zinc-400 font-bold mb-1.5 uppercase tracking-wider">
                CONTROLS GUIDE
              </div>
              <div className="grid grid-cols-2 gap-1 text-[7.5px] text-zinc-300">
                <div className="bg-zinc-950 p-1 rounded border border-zinc-800 flex items-center gap-1">
                  <ArrowUp className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                  <span>W / ↑ UP</span>
                </div>
                <div className="bg-zinc-950 p-1 rounded border border-zinc-800 flex items-center gap-1">
                  <ArrowDown className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                  <span>S / ↓ DOWN</span>
                </div>
                <div className="bg-zinc-950 p-1 rounded border border-zinc-800 flex items-center gap-1">
                  <ArrowLeft className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                  <span>A / ← LEFT</span>
                </div>
                <div className="bg-zinc-950 p-1 rounded border border-zinc-800 flex items-center gap-1">
                  <ArrowRight className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                  <span>D / → RIGHT</span>
                </div>
              </div>
            </div>

            {/* Current Mode Badge */}
            <div className="mt-2.5 p-1.5 bg-zinc-950/90 rounded border border-zinc-800 text-[7.5px] text-center">
              {isDemoOrTitle ? (
                <div className="text-orange-400 flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
                  <span>DEMO PLAYING · TAP SCREEN TO DIVE</span>
                </div>
              ) : isPlaying ? (
                <div className="text-cyan-400">
                  <span>EXPEDITION ACTIVE · SURVIVE!</span>
                </div>
              ) : (
                <div className="text-zinc-400">
                  <span>READY TO DIVE</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Footer Info */}
      <footer className="w-full max-w-5xl flex flex-wrap items-center justify-between py-1.5 text-[8px] text-zinc-600 font-nes border-t border-zinc-800 mt-3">
        <span>EPHEMERAL ARCHITECTURE · 3 CONTAINERS</span>
        <span>MEGABUG (1982) TRIBUTE</span>
      </footer>

      {/* Buffer space from bottom of browser window */}
      <div className="w-full h-4 sm:h-6" aria-hidden="true" />

      {/* High Scores Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        pendingScore={pendingScore}
        onScoreSubmitted={() => {
          loadHighScores();
        }}
      />

      {/* 3 Containers Architecture & GitHub Workflow Modal */}
      <ContainersModal
        isOpen={isContainersOpen}
        onClose={() => setIsContainersOpen(false)}
        sessionRemainingSeconds={engineState.sessionRemainingSeconds}
        timeLimitSeconds={engineState.timeLimitSeconds || GAME_TIME_LIMIT_SECONDS}
      />
    </main>
  );
}
