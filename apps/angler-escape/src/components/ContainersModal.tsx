import React from 'react';
import { X, Server, Layers, GitBranch, Clock, CheckCircle2 } from 'lucide-react';

interface ContainersModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionRemainingSeconds: number;
}

export const ContainersModal: React.FC<ContainersModalProps> = ({
  isOpen,
  onClose,
  sessionRemainingSeconds,
}) => {
  if (!isOpen) return null;

  const mins = Math.floor(sessionRemainingSeconds / 60);
  const secs = Math.floor(sessionRemainingSeconds % 60);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 font-nes">
      <div className="relative w-full max-w-2xl bg-slate-900 border-4 border-indigo-600 rounded-lg p-5 text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
          <Layers className="w-6 h-6 text-indigo-400" />
          <div>
            <h2 className="text-base text-indigo-300 font-bold tracking-wider">
              3-CONTAINER ARCHITECTURE
            </h2>
            <p className="text-[9px] text-slate-400 font-sans mt-0.5">
              Lightweight ephemeral microservices architecture built via GitHub Actions
            </p>
          </div>
        </div>

        {/* 3 Containers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {/* Container 1: Frontend */}
          <div className="p-3 bg-slate-950 border border-cyan-800 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-cyan-300 font-bold">1. FRONTEND</span>
              <span className="flex items-center gap-1 text-[8px] text-emerald-400">
                <CheckCircle2 className="w-2.5 h-2.5" /> RUNNING
              </span>
            </div>
            <div className="text-[8px] text-slate-400 font-mono mb-2">Dockerfile.frontend</div>
            <p className="text-[9px] text-slate-300 font-sans leading-relaxed">
              Lightweight Nginx + React 19 SPA rendering pixel-art canvas, CRT scanline shader, and Web Audio synthesizers.
            </p>
            <div className="mt-2 pt-2 border-t border-slate-900 text-[8px] text-cyan-400">
              PORT: 80 / 3000
            </div>
          </div>

          {/* Container 2: Backend */}
          <div className="p-3 bg-slate-950 border border-amber-800 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-amber-300 font-bold">2. BACKEND</span>
              <span className="flex items-center gap-1 text-[8px] text-emerald-400">
                <CheckCircle2 className="w-2.5 h-2.5" /> RUNNING
              </span>
            </div>
            <div className="text-[8px] text-slate-400 font-mono mb-2">Dockerfile.backend</div>
            <p className="text-[9px] text-slate-300 font-sans leading-relaxed">
              Node Express API controlling ephemeral high scores, session expiration authority, and health endpoints.
            </p>
            <div className="mt-2 pt-2 border-t border-slate-900 text-[8px] text-amber-400">
              ROUTES: /api/scores, /api/session
            </div>
          </div>

          {/* Container 3: Database */}
          <div className="p-3 bg-slate-950 border border-violet-800 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-violet-300 font-bold">3. DATABASE</span>
              <span className="flex items-center gap-1 text-[8px] text-amber-400">
                <Clock className="w-2.5 h-2.5" /> EPHEMERAL
              </span>
            </div>
            <div className="text-[8px] text-slate-400 font-mono mb-2">Dockerfile.db</div>
            <p className="text-[9px] text-slate-300 font-sans leading-relaxed">
              In-memory ephemeral database store without permanent disk mounts; state resets after session concludes.
            </p>
            <div className="mt-2 pt-2 border-t border-slate-900 text-[8px] text-violet-400">
              NO DISK MOUNT (VOLATILE)
            </div>
          </div>
        </div>

        {/* GitHub Workflow & Orchestration */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded mb-4">
          <div className="flex items-center gap-2 text-indigo-400 text-xs mb-2">
            <GitBranch className="w-4 h-4" />
            <span>GITHUB ACTIONS WORKFLOW</span>
          </div>
          <div className="text-[9px] text-slate-300 font-mono bg-slate-900 p-2 rounded border border-slate-800 mb-2 overflow-x-auto">
            .github/workflows/build-containers.yml
          </div>
          <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
            All 3 containers (Frontend, Backend, Database) are automated with a CI/CD build matrix using Docker Buildx and validated through Docker Compose.
          </p>
        </div>

        {/* 10-Minute Ephemeral Rule */}
        <div className="p-3 bg-slate-950 border border-amber-900/50 rounded flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] text-amber-300 font-bold">10-MINUTE EPHEMERAL TIME LIMIT</div>
              <div className="text-[9px] text-slate-400 font-sans">
                Remaining in current session: {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] transition-colors"
          >
            RETURN
          </button>
        </div>
      </div>
    </div>
  );
};
