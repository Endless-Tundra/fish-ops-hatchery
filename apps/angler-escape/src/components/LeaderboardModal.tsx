import React, { useState, useEffect } from 'react';
import { Trophy, X, Send } from 'lucide-react';
import { HighScore } from '../types';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingScore?: HighScore | null;
  onScoreSubmitted?: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  pendingScore,
  onScoreSubmitted,
}) => {
  const [scores, setScores] = useState<HighScore[]>([]);
  const [initials, setInitials] = useState('ANG');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fetchScores = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/scores');
      const data = await res.json();
      if (data.scores) {
        setScores(data.scores);
      }
    } catch {
      // Backend fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchScores();
      setSubmitted(false);
    }
  }, [isOpen]);

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingScore || submitted) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initials: initials.slice(0, 3).toUpperCase() || 'ANG',
          score: pendingScore.score,
          plantsEaten: pendingScore.plantsEaten,
          survivalSeconds: pendingScore.survivalSeconds,
          depthLevel: pendingScore.depthLevel,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        await fetchScores();
        if (onScoreSubmitted) {
          onScoreSubmitted();
        }
      }
    } catch {
      // Error handling
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 font-nes">
      <div className="relative w-full max-w-lg bg-slate-900 border-4 border-amber-500/80 rounded-lg p-5 text-slate-100 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
          <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
          <h2 className="text-base text-amber-300 font-bold tracking-wider">
            ANGLER ESCAPE HALL OF FAME
          </h2>
        </div>

        {/* Submit Pending High Score Form */}
        {pendingScore && !submitted && (
          <form onSubmit={handleSubmitScore} className="mb-4 p-3 bg-slate-950 border border-amber-500/40 rounded">
            <div className="text-[11px] text-amber-400 mb-2">NEW SCORE RECORDED: {pendingScore.score} PTS</div>
            <div className="text-[9px] text-slate-400 mb-3">
              ZONE {pendingScore.depthLevel} · {pendingScore.plantsEaten} PODS DEVOURED · {pendingScore.survivalSeconds}s SURVIVED
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="arcade-initials" className="text-[10px] text-slate-300 whitespace-nowrap">
                ENTER 3 INITIALS:
              </label>
              <input
                id="arcade-initials"
                type="text"
                maxLength={3}
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                className="w-20 bg-slate-800 border-2 border-amber-400 text-amber-300 px-2 py-1 text-center font-bold text-sm tracking-widest focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded transition-colors"
              >
                <Send className="w-3 h-3" />
                <span>SAVE</span>
              </button>
            </div>
          </form>
        )}

        {/* Scores Table */}
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
              RETRIEVING EPHEMERAL SCORES...
            </div>
          ) : scores.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              NO EXPEDITIONS RECORDED YET
            </div>
          ) : (
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-[9px]">
                  <th className="py-2 px-1">RANK</th>
                  <th className="py-2 px-2">INITIALS</th>
                  <th className="py-2 px-2 text-right">SCORE</th>
                  <th className="py-2 px-2 text-right">PODS</th>
                  <th className="py-2 px-2 text-right">ZONE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {scores.map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-slate-800/50">
                    <td className="py-2 px-1 text-slate-400 tabular-nums">#{idx + 1}</td>
                    <td className="py-2 px-2 text-cyan-300 font-bold tracking-widest">{s.initials}</td>
                    <td className="py-2 px-2 text-amber-400 font-bold text-right tabular-nums">{s.score}</td>
                    <td className="py-2 px-2 text-teal-300 text-right tabular-nums">{s.plantsEaten}</td>
                    <td className="py-2 px-2 text-slate-300 text-right">Z-{s.depthLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-500">
          <span>EPHEMERAL DATABASE: POSTGRES / REDIS</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
