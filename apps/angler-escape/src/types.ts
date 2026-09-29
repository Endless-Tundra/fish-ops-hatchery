export type GameState = 'TITLE' | 'DEMO' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'SESSION_EXPIRED';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';

export interface Position {
  x: number;
  y: number;
}

export interface GridCell {
  wall: boolean;
  hasPlant: boolean;
  isLantern: boolean;
}

export interface Bubble {
  id: string;
  x: number;
  y: number;
  createdAt: number;
  radius: number;
  wobbleOffset: number;
}

export interface Plant {
  id: string;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  isLantern: boolean; // Collectible lantern that increases light radius
  eaten: boolean;
  color: string;
}

export interface Anglerfish {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  targetGridX: number;
  targetGridY: number;
  dir: Direction;
  nextDir: Direction;
  speed: number;
  lanternRadius: number;
  mouthOpen: number;
  invulnerableTime: number;
}

export interface Shark {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  targetGridX: number;
  targetGridY: number;
  dir: Direction;
  speed: number;
  targetBubbleId: string | null;
  state: 'TRACKING_BUBBLE' | 'DIRECT_CHASE' | 'PATROL';
  aggroDistance: number;
  finAnim: number;
  scentConfusionTime: number;
}

export interface HighScore {
  id: string;
  initials: string;
  score: number;
  plantsEaten: number;
  survivalSeconds: number;
  depthLevel: number;
  date: string;
}

export interface SessionInfo {
  sessionId: string;
  startTime: number;
  limitSeconds: number; // 600s = 10 min
  elapsedSeconds: number;
  remainingSeconds: number;
  isExpired: boolean;
}

export interface ContainerInfo {
  name: string;
  role: string;
  status: 'running' | 'ephemeral' | 'healthy';
  details: string;
  port?: number;
}
