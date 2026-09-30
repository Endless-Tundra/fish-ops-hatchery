import React from 'react';
import { X, Server, Layers, GitBranch, Clock, CheckCircle2 } from 'lucide-react';
import { formatTimeLimitLabel, GAME_TIME_LIMIT_SECONDS } from '../../config';

interface ContainersModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionRemainingSeconds: number;
  timeLimitSeconds?: number;
}

export const ContainersModal: React.FC<ContainersModalProps> = ({
  isOpen,
  onClose,
  sessionRemainingSeconds,
  timeLimitSeconds = GAME_TIME_LIMIT_SECONDS,
}) => {
  if (!isOpen) return null;

  const mins = Math.floor(sessionRemainingSeconds / 60);
  const secs = Math.floor(sessionRemainingSeconds % 60);
  const limitLabel = formatTimeLimitLabel(timeLimitSeconds);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 font-nes">
      <div className="relative w-full max-w-2xl bg-zinc-900 border-2 border-zinc-700 rounded-lg p-5 text-zinc-100 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 border-b border-zinc-800 pb-3">
          <Layers className="w-5 h-5 text-zinc-300" />
          <div>
            <h2 className="text-sm text-zinc-100 font-bold tracking-wider">
              3-CONTAINER ARCHITECTURE
            </h2>
            <p className="text-[9px] text-zinc-400 font-sans mt-0.5">
              Lightweight ephemeral microservices architecture built via GitHub Actions
            </p>
          </div>
        </div>

        {/* 3 Containers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {/* Container 1: Frontend */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-200 font-bold">1. FRONTEND</span>
              <span className="flex items-center gap-1 text-[8px] text-emerald-400">
                <CheckCircle2 className="w-2.5 h-2.5" /> ACTIVE
              </span>
            </div>
            <div className="text-[8px] text-zinc-500 font-mono mb-2">Dockerfile.frontend</div>
            <p className="text-[9px] text-zinc-400 font-sans leading-relaxed">
              Lightweight Nginx + React 19 SPA rendering the pixel-art canvas.
            </p>
            <div className="mt-2 pt-2 border-t border-zinc-900 text-[8px] text-zinc-500">
              PORT: 80 / 3000
            </div>
          </div>

          {/* Container 2: Backend */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-200 font-bold">2. BACKEND</span>
              <span className="flex items-center gap-1 text-[8px] text-emerald-400">
                <CheckCircle2 className="w-2.5 h-2.5" /> ACTIVE
              </span>
            </div>
            <div className="text-[8px] text-zinc-500 font-mono mb-2">Dockerfile.backend</div>
            <p className="text-[9px] text-zinc-400 font-sans leading-relaxed">
              Node Express API controlling ephemeral high scores, session expiration authority, and health endpoints.
            </p>
            <div className="mt-2 pt-2 border-t border-zinc-900 text-[8px] text-zinc-500">
              ROUTES: /api/scores, /api/session
            </div>
          </div>

          {/* Container 3: Database */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-200 font-bold">3. DATABASE</span>
              <span className="flex items-center gap-1 text-[8px] text-emerald-400">
                <CheckCircle2 className="w-2.5 h-2.5" /> ACTIVE
              </span>
            </div>
            <div className="text-[8px] text-zinc-500 font-mono mb-2">Dockerfile.db</div>
            <p className="text-[9px] text-zinc-400 font-sans leading-relaxed">
              In-memory Redis database store without permanent disk mounts; state resets after session concludes.
            </p>
            <div className="mt-2 pt-2 border-t border-zinc-900 text-[8px] text-zinc-500">
              VOLATILE IN-MEMORY
            </div>
          </div>
        </div>

        {/* GitHub Workflow & Orchestration */}
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded mb-4">
          <div className="flex items-center gap-2 text-zinc-300 text-xs mb-2">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            <span>GITHUB ACTIONS WORKFLOW</span>
          </div>
          <div className="text-[9px] text-zinc-300 font-mono bg-zinc-900 p-2 rounded border border-zinc-800 mb-2 overflow-x-auto">
            .github/workflows/build-containers.yml
          </div>
          <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
            All 3 containers (Frontend, Backend, Database) are built with a CI/CD Pipeline in Github and then pushed to Google Cloud Run.
          </p>
        </div>

        {/* Ephemeral Rule */}
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-zinc-400" />
            <div>
              <div className="text-[10px] text-zinc-200 font-bold">{limitLabel} EPHEMERAL TIME LIMIT</div>
              <div className="text-[9px] text-zinc-400 font-sans">
                Remaining in current session: {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded text-[10px] transition-colors"
          >
            RETURN
          </button>
        </div>
      </div>
    </div>
  );
};
