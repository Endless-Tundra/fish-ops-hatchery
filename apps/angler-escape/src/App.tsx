import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine, GameEngineState } from './game/engine';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { OnScreenControls } from './components/OnScreenControls';
import { LeaderboardModal } from './components/LeaderboardModal';
import { ContainersModal } from './components/ContainersModal';
import { soundEngine } from './audio';
import { HighScore, Direction } from './types';
import { Play, RotateCcw, Trophy, Layers, Sparkles } from 'lucide-react';

export default function App() {
  const [engineState, setEngineState] = useState<GameEngineState | null>(null);
  const [highScore, setHighScore] = useState<number>(0);
  const [pendingScore, setPendingScore] = useState<HighScore | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isContainersOpen, setIsContainersOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEngine.isMuted);

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
          engineRef.current.updateSessionTime(data.remainingSeconds);
        }
      }
    } catch {
      // Session fallback
    }
  }, []);

  // Reset Session
  const handleResetSession = async () => {
    try {
      await fetch('/api/session/reset', { method: 'POST' });
      if (engineRef.current) {
        engineRef.current.updateSessionTime(600);
        engineRef.current.startNewGame();
      }
    } catch {
      if (engineRef.current) {
        engineRef.current.updateSessionTime(600);
        engineRef.current.startNewGame();
      }
    }
  };

  // Reset Attract Mode Idle Timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // Only start idle attract demo if on TITLE or GAME_OVER screen
    const currentStatus = engineRef.current?.state.gameState;
    if (currentStatus === 'TITLE' || currentStatus === 'GAME_OVER') {
      idleTimerRef.current = setTimeout(() => {
        if (engineRef.current && (engineRef.current.state.gameState === 'TITLE' || engineRef.current.state.gameState === 'GAME_OVER')) {
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
        setPendingScore(finalScore);
        setIsLeaderboardOpen(true);
      }
    );

    engineRef.current = engine;
    setEngineState(engine.state);
    engine.start();

    // Start idle attract timer
    resetIdleTimer();

    // Session poll every 5 seconds
    const sessionInterval = setInterval(syncSession, 5000);

    return () => {
      engine.stop();
      clearInterval(sessionInterval);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [loadHighScores, syncSession, resetIdleTimer]);

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      resetIdleTimer();

      if (!engineRef.current) return;
      const state = engineRef.current.state;

      // In DEMO mode or TITLE screen, any key starts the game!
      if (state.gameState === 'DEMO' || state.gameState === 'TITLE') {
        engineRef.current.startNewGame();
        return;
      }

      if (e.key === 'p' || e.key === 'P') {
        engineRef.current.togglePause();
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        const muted = soundEngine.toggleMute();
        setIsMuted(muted);
        return;
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

  const handleTogglePause = () => {
    if (engineRef.current) {
      engineRef.current.togglePause();
    }
  };

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-nes text-cyan-400 text-xs animate-pulse">
        INITIALIZING ANGLER ENGINE...
      </div>
    );
  }

  const isTitle = engineState.gameState === 'TITLE';
  const isGameOver = engineState.gameState === 'GAME_OVER';
  const isSessionExpired = engineState.gameState === 'SESSION_EXPIRED';
  const isPaused = engineState.gameState === 'PAUSED';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-2 sm:p-4 select-none">
      {/* Top Header */}
      <header className="w-full max-w-[800px] flex items-center justify-between py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#00d2d3]" />
          <h1 className="text-xs sm:text-sm font-nes text-cyan-300 tracking-wider">
            FISH BUG
          </h1>
          <span className="text-[9px] text-slate-500 font-nes hidden md:inline">
            · MEGABUG INSPIRED
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsContainersOpen(true)}
            className="flex items-center gap-1.5 text-[9px] font-nes px-2.5 py-1 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/70 text-indigo-300 rounded transition-colors"
          >
            <Layers className="w-3 h-3 text-indigo-400" />
            <span>3 CONTAINERS</span>
          </button>
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="flex items-center gap-1.5 text-[9px] font-nes px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900 border border-amber-700/70 text-amber-300 rounded transition-colors"
          >
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>HIGH SCORES</span>
          </button>
        </div>
      </header>

      {/* Main Game Stage */}
      <div className="w-full max-w-[800px] flex flex-col items-center my-auto">
        {/* HUD Display */}
        <HUD
          score={engineState.score}
          highScore={highScore}
          plantsEaten={engineState.plantsEaten}
          level={engineState.level}
          remainingSeconds={engineState.sessionRemainingSeconds}
          isPaused={isPaused}
          isMuted={isMuted}
          onTogglePause={handleTogglePause}
          onToggleMute={handleToggleMute}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          onOpenContainers={() => setIsContainersOpen(true)}
          onRestartSession={handleResetSession}
        />

        {/* Canvas Area with Overlays */}
        <div className="relative w-full">
          <GameCanvas gameState={engineState} onCanvasClick={handleCanvasClick} />

          {/* Title Screen Overlay */}
          {isTitle && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center font-nes z-30">
              <div className="mb-2 flex items-center justify-center gap-2">
                <span className="text-amber-400 text-lg">✦</span>
                <h2 className="text-xl sm:text-2xl text-cyan-300 font-bold tracking-widest drop-shadow-[0_0_12px_#00d2d3]">
                  FISH BUG
                </h2>
                <span className="text-amber-400 text-lg">✦</span>
              </div>
              <p className="text-[10px] text-amber-300 tracking-wider mb-6">
                ANGLERFISH MAZE ESCAPE · MEGABUG HOMAGE
              </p>

              {/* Instructions Box */}
              <div className="max-w-md bg-slate-900/90 border-2 border-cyan-800 rounded p-4 text-left text-[9px] text-slate-300 space-y-2 mb-6 shadow-xl">
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400">1.</span>
                  <span>Your lantern illuminates a circle around you in the dark abyss.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-teal-400">2.</span>
                  <span>Eat glowing plants to gain points. Eating a plant leaves a bubble trail!</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400">3.</span>
                  <span>The bubble trail does not disappear. The shark relentlessly tracks your bubbles to find you!</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-yellow-400">4.</span>
                  <span>Collect lanterns in the maze to increase the size of your light radius!</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400">5.</span>
                  <span>10-Minute Ephemeral Limit: Score as high as you can before session expires.</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleStartGame}
                  className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded shadow-[0_0_15px_#00d2d3] transition-all transform hover:scale-105 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>DIVE INTO ABYSS (START)</span>
                </button>

                <button
                  onClick={() => engineRef.current?.startDemoMode()}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded border border-slate-700 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>WATCH DEMO</span>
                </button>
              </div>

              <div className="mt-6 text-[8px] text-slate-500 animate-pulse">
                IDLE FOR 8 SECONDS WILL LAUNCH ATTRACT DEMO MODE
              </div>
            </div>
          )}

          {/* Game Over Screen Overlay */}
          {isGameOver && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center font-nes z-30">
              <h2 className="text-xl sm:text-2xl text-red-500 font-bold tracking-widest mb-2 drop-shadow-[0_0_12px_#ff4757]">
                CAUGHT BY THE SHARK!
              </h2>
              <p className="text-[10px] text-slate-400 mb-6">
                THE PREDATOR SNIFFED OUT YOUR BUBBLE TRAIL
              </p>

              <div className="w-full max-w-sm bg-slate-900 border-2 border-red-900/80 rounded p-4 text-[10px] text-slate-300 space-y-2 mb-6">
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">FINAL SCORE</span>
                  <span className="text-amber-400 font-bold tabular-nums">{engineState.score}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">PLANTS DEVOURED</span>
                  <span className="text-teal-300 tabular-nums">{engineState.plantsEaten}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">MAX DEPTH</span>
                  <span className="text-cyan-400">ZONE {engineState.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">TIME SURVIVED</span>
                  <span className="text-slate-200 tabular-nums">{Math.floor(engineState.survivalSeconds)} SECONDS</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleStartGame}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded shadow-[0_0_15px_#ff4757] transition-all transform hover:scale-105 active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>PLAY AGAIN</span>
                </button>

                <button
                  onClick={() => setIsLeaderboardOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] rounded border border-slate-700 transition-colors"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>VIEW HIGH SCORES</span>
                </button>
              </div>
            </div>
          )}

          {/* Session Expired Overlay (10-minute limit) */}
          {isSessionExpired && (
            <div className="absolute inset-0 bg-black/92 flex flex-col items-center justify-center p-6 text-center font-nes z-30">
              <h2 className="text-lg sm:text-xl text-amber-400 font-bold tracking-widest mb-2 drop-shadow-[0_0_10px_#feca57]">
                10-MINUTE EPHEMERAL LIMIT REACHED
              </h2>
              <p className="text-[10px] text-slate-400 mb-6">
                YOUR EPHEMERAL ABYSSAL EXPEDITION HAS CONCLUDED
              </p>

              <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-600/80 rounded p-4 text-[10px] text-slate-300 space-y-2 mb-6">
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">SESSION SCORE</span>
                  <span className="text-amber-400 font-bold tabular-nums">{engineState.score}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">PLANTS EATEN</span>
                  <span className="text-teal-300 tabular-nums">{engineState.plantsEaten}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ZONE REACHED</span>
                  <span className="text-cyan-400">ZONE {engineState.level}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleResetSession}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded shadow-[0_0_15px_#feca57] transition-all transform hover:scale-105 active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>NEW 10-MIN SESSION</span>
                </button>
              </div>
            </div>
          )}

          {/* Paused Overlay */}
          {isPaused && (
            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-4 font-nes z-30">
              <h2 className="text-xl text-amber-300 font-bold tracking-widest mb-3 animate-pulse">
                PAUSED
              </h2>
              <p className="text-[10px] text-slate-400 mb-4">
                PRESS P OR TAP RESUME TO CONTINUE
              </p>
              <button
                onClick={handleTogglePause}
                className="px-5 py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded shadow"
              >
                RESUME EXPEDITION
              </button>
            </div>
          )}
        </div>

        {/* On Screen Touch / Mobile D-Pad Controls */}
        <OnScreenControls onDirection={handleDirection} />
      </div>

      {/* Footer Info */}
      <footer className="w-full max-w-[800px] flex flex-wrap items-center justify-between py-2 text-[9px] text-slate-500 font-nes border-t border-slate-800 mt-2">
        <span>EPHEMERAL ARCHITECTURE · 3 CONTAINERS</span>
        <span>MEGABUG (1982) TRIBUTE</span>
      </footer>

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
      />
    </main>
  );
}
