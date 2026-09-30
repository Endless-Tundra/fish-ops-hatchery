import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GAME_TIME_LIMIT_SECONDS } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Ephemeral Database Store
// Stores session-bound high scores and tracks configurable game limit
interface ScoreEntry {
  id: string;
  initials: string;
  score: number;
  plantsEaten: number;
  survivalSeconds: number;
  depthLevel: number;
  date: string;
}

const ephemeralDb = {
  scores: [
    { id: '1', initials: 'MEG', score: 12850, plantsEaten: 184, survivalSeconds: 412, depthLevel: 5, date: '2026-09-28' },
    { id: '2', initials: 'BUG', score: 9420, plantsEaten: 132, survivalSeconds: 310, depthLevel: 4, date: '2026-09-28' },
    { id: '3', initials: 'SHK', score: 7100, plantsEaten: 98, survivalSeconds: 245, depthLevel: 3, date: '2026-09-28' },
    { id: '4', initials: 'ANG', score: 5340, plantsEaten: 76, survivalSeconds: 190, depthLevel: 2, date: '2026-09-28' },
    { id: '5', initials: 'DEE', score: 3200, plantsEaten: 45, survivalSeconds: 130, depthLevel: 1, date: '2026-09-28' },
  ] as ScoreEntry[],
  // Configurable ephemeral session management
  sessionStart: Date.now(),
  maxSessionSeconds: GAME_TIME_LIMIT_SECONDS,
};

// API: Get high scores
app.get('/api/scores', (_req, res) => {
  const sorted = [...ephemeralDb.scores].sort((a, b) => b.score - a.score).slice(0, 10);
  res.json({
    success: true,
    scores: sorted,
    count: sorted.length,
    storage: 'ephemeral-in-memory',
  });
});

// API: Save high score
app.post('/api/scores', (req, res) => {
  const { initials, score, plantsEaten, survivalSeconds, depthLevel } = req.body;
  if (!initials || typeof score !== 'number') {
    return res.status(400).json({ error: 'Valid initials and score are required' });
  }

  const sanitizedInitials = String(initials).trim().toUpperCase().slice(0, 3) || 'AAA';
  const newEntry: ScoreEntry = {
    id: `score-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    initials: sanitizedInitials,
    score: Math.max(0, Math.floor(score)),
    plantsEaten: Number(plantsEaten) || 0,
    survivalSeconds: Number(survivalSeconds) || 0,
    depthLevel: Number(depthLevel) || 1,
    date: new Date().toISOString().slice(0, 10),
  };

  ephemeralDb.scores.push(newEntry);
  ephemeralDb.scores.sort((a, b) => b.score - a.score);
  // Keep top 20
  if (ephemeralDb.scores.length > 20) {
    ephemeralDb.scores = ephemeralDb.scores.slice(0, 20);
  }

  res.status(201).json({
    success: true,
    entry: newEntry,
    scores: ephemeralDb.scores.slice(0, 10),
  });
});

// API: Get current 10-minute session status
app.get('/api/session', (_req, res) => {
  const now = Date.now();
  const elapsed = Math.floor((now - ephemeralDb.sessionStart) / 1000);
  const remaining = Math.max(0, ephemeralDb.maxSessionSeconds - elapsed);
  const isExpired = remaining <= 0;

  res.json({
    startTime: ephemeralDb.sessionStart,
    limitSeconds: ephemeralDb.maxSessionSeconds,
    elapsedSeconds: elapsed,
    remainingSeconds: remaining,
    isExpired,
  });
});

// API: Reset session timer (allows starting fresh 10-minute session)
app.post('/api/session/reset', (_req, res) => {
  ephemeralDb.sessionStart = Date.now();
  res.json({
    success: true,
    startTime: ephemeralDb.sessionStart,
    limitSeconds: ephemeralDb.maxSessionSeconds,
    remainingSeconds: ephemeralDb.maxSessionSeconds,
    isExpired: false,
  });
});

// API: Container Architecture & Workflow status
app.get('/api/containers', (_req, res) => {
  res.json({
    architecture: '3-Container Microservices (Ephemeral)',
    containers: [
      {
        name: 'frontend',
        role: 'Vite React NES Client + CRT Shader Viewport',
        status: 'running',
        port: 3000,
        dockerfile: 'Dockerfile.frontend',
      },
      {
        name: 'backend',
        role: 'Node Express API Engine + Game Session Authority',
        status: 'running',
        port: 3000,
        dockerfile: 'Dockerfile.backend',
      },
      {
        name: 'database',
        role: 'Ephemeral High Scores & Session State Store',
        status: 'ephemeral',
        dockerfile: 'Dockerfile.db',
      },
    ],
    workflow: '.github/workflows/build-containers.yml',
    ephemeral: true,
    timeLimitMinutes: 10,
  });
});

// API: Healthcheck / Startup probe
app.get(['/api/health', '/health'], (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Angler Escape] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
