// Core Game Engine for Angler Escape (Megabug inspired)
import { Anglerfish, Shark, Bubble, Plant, Direction, GameState, HighScore } from '../types';
import { CELL_SIZE, createMaze, isWalkable, bfsNextStep, MazeData } from './maze';
import { soundEngine } from '../audio';

export interface GameEngineState {
  gameState: GameState;
  score: number;
  plantsEaten: number;
  level: number;
  survivalSeconds: number;
  angler: Anglerfish;
  shark: Shark;
  bubbles: Bubble[];
  maze: MazeData;
  lanternRadius: number;
  lanternFlicker: number;
  isCRTEnabled: boolean;
  demoMode: boolean;
  sessionRemainingSeconds: number;
  timeLimitSeconds: number;
  lastBubbleDist: number;
}

export class GameEngine {
  public state: GameEngineState;
  private lastTime: number = 0;
  private lastStepTime: number = 0;
  private animFrameId: number = 0;
  private onStateChange?: (state: GameEngineState) => void;
  private onGameOver?: (finalScore: HighScore) => void;

  constructor(
    onStateChange?: (state: GameEngineState) => void,
    onGameOver?: (finalScore: HighScore) => void
  ) {
    this.onStateChange = onStateChange;
    this.onGameOver = onGameOver;
    this.state = this.initInitialState('TITLE');
  }

  private initInitialState(gameState: GameState = 'TITLE'): GameEngineState {
    const maze = createMaze(1);
    const startCellX = 1;
    const startCellY = 1;
    const sharkCellX = Math.floor(maze.cols / 2);
    const sharkCellY = Math.floor(maze.rows / 2);

    return {
      gameState,
      score: 0,
      plantsEaten: 0,
      level: 1,
      survivalSeconds: 0,
      angler: {
        x: startCellX * CELL_SIZE + CELL_SIZE / 2,
        y: startCellY * CELL_SIZE + CELL_SIZE / 2,
        gridX: startCellX,
        gridY: startCellY,
        targetGridX: startCellX,
        targetGridY: startCellY,
        dir: 'RIGHT',
        nextDir: 'RIGHT',
        speed: 105, // pixels per second
        lanternRadius: 155,
        mouthOpen: 0,
        invulnerableTime: 2.0, // Grace period on start
      },
      shark: {
        x: sharkCellX * CELL_SIZE + CELL_SIZE / 2,
        y: sharkCellY * CELL_SIZE + CELL_SIZE / 2,
        gridX: sharkCellX,
        gridY: sharkCellY,
        targetGridX: sharkCellX,
        targetGridY: sharkCellY,
        dir: 'UP',
        speed: 82, // Relentless hunter, slightly slower than player so player can escape if careful
        targetBubbleId: null,
        state: 'TRACKING_BUBBLE',
        aggroDistance: 130,
        finAnim: 0,
        scentConfusionTime: 0,
      },
      bubbles: [],
      maze,
      lanternRadius: 155,
      lanternFlicker: 0,
      isCRTEnabled: true,
      demoMode: gameState === 'DEMO',
      sessionRemainingSeconds: 600,
      timeLimitSeconds: 600,
      lastBubbleDist: 0,
    };
  }

  public startNewGame() {
    const maze = createMaze(1);
    const startCellX = 1;
    const startCellY = 1;
    const sharkCellX = Math.floor(maze.cols / 2);
    const sharkCellY = Math.floor(maze.rows / 2);

    this.state.gameState = 'PLAYING';
    this.state.demoMode = false;
    this.state.score = 0;
    this.state.plantsEaten = 0;
    this.state.level = 1;
    this.state.survivalSeconds = 0;
    this.state.bubbles = [];
    this.state.maze = maze;
    this.state.lanternRadius = 155;

    this.state.angler = {
      x: startCellX * CELL_SIZE + CELL_SIZE / 2,
      y: startCellY * CELL_SIZE + CELL_SIZE / 2,
      gridX: startCellX,
      gridY: startCellY,
      targetGridX: startCellX,
      targetGridY: startCellY,
      dir: 'RIGHT',
      nextDir: 'RIGHT',
      speed: 105,
      lanternRadius: 155,
      mouthOpen: 0,
      invulnerableTime: 2.0,
    };

    this.state.shark = {
      x: sharkCellX * CELL_SIZE + CELL_SIZE / 2,
      y: sharkCellY * CELL_SIZE + CELL_SIZE / 2,
      gridX: sharkCellX,
      gridY: sharkCellY,
      targetGridX: sharkCellX,
      targetGridY: sharkCellY,
      dir: 'UP',
      speed: 82,
      targetBubbleId: null,
      state: 'TRACKING_BUBBLE',
      aggroDistance: 130,
      finAnim: 0,
      scentConfusionTime: 0,
    };

    this.notify();
  }

  public startDemoMode() {
    this.startNewGame();
    this.state.gameState = 'DEMO';
    this.state.demoMode = true;
    this.notify();
  }

  public setInputDirection(dir: Direction) {
    if (this.state.gameState === 'DEMO' || this.state.gameState === 'TITLE') {
      // Any user interaction during DEMO or TITLE starts the active game!
      this.startNewGame();
      this.state.angler.nextDir = dir;
      return;
    }
    if (this.state.gameState === 'PLAYING') {
      this.state.angler.nextDir = dir;
    }
  }

  public togglePause() {
    if (this.state.gameState === 'PLAYING') {
      this.state.gameState = 'PAUSED';
    } else if (this.state.gameState === 'PAUSED') {
      this.state.gameState = 'PLAYING';
    }
    this.notify();
  }

  public toggleCRT() {
    this.state.isCRTEnabled = !this.state.isCRTEnabled;
    this.notify();
  }

  public updateSessionTime(remainingSeconds: number) {
    this.state.sessionRemainingSeconds = remainingSeconds;
    if (remainingSeconds <= 0 && (this.state.gameState === 'PLAYING' || this.state.gameState === 'DEMO')) {
      this.handleSessionExpired();
    }
  }

  private handleSessionExpired() {
    this.state.gameState = 'SESSION_EXPIRED';
    soundEngine.playGameOver();
    if (this.onGameOver) {
      this.onGameOver({
        id: `score-${Date.now()}`,
        initials: 'EXP',
        score: this.state.score,
        plantsEaten: this.state.plantsEaten,
        survivalSeconds: Math.floor(this.state.survivalSeconds),
        depthLevel: this.state.level,
        date: new Date().toISOString().slice(0, 10),
      });
    }
    this.notify();
  }

  // Next level when all or almost all plants are eaten
  private nextLevel() {
    const nextLvl = this.state.level + 1;
    const maze = createMaze(nextLvl);
    const startCellX = 1;
    const startCellY = 1;
    const sharkCellX = Math.floor(maze.cols / 2);
    const sharkCellY = Math.floor(maze.rows / 2);

    this.state.level = nextLvl;
    this.state.maze = maze;
    this.state.bubbles = [];
    this.state.score += 1000 * this.state.level;

    // Reset player position with brief invulnerability
    this.state.angler.x = startCellX * CELL_SIZE + CELL_SIZE / 2;
    this.state.angler.y = startCellY * CELL_SIZE + CELL_SIZE / 2;
    this.state.angler.gridX = startCellX;
    this.state.angler.gridY = startCellY;
    this.state.angler.targetGridX = startCellX;
    this.state.angler.targetGridY = startCellY;
    this.state.angler.invulnerableTime = 2.0;

    // Shark gets slightly faster with each level
    this.state.shark.x = sharkCellX * CELL_SIZE + CELL_SIZE / 2;
    this.state.shark.y = sharkCellY * CELL_SIZE + CELL_SIZE / 2;
    this.state.shark.gridX = sharkCellX;
    this.state.shark.gridY = sharkCellY;
    this.state.shark.targetGridX = sharkCellX;
    this.state.shark.targetGridY = sharkCellY;
    this.state.shark.speed = 82 + (nextLvl - 1) * 7;

    soundEngine.playVictory();
    this.notify();
  }

  // Main Loop
  public start() {
    this.lastTime = performance.now();
    this.lastStepTime = performance.now();
    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
      this.lastTime = timestamp;

      this.update(dt);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    cancelAnimationFrame(this.animFrameId);
  }

  private update(dt: number) {
    if (this.state.gameState !== 'PLAYING' && this.state.gameState !== 'DEMO') {
      return;
    }

    this.state.survivalSeconds += dt;
    this.state.lanternFlicker = Math.sin(performance.now() * 0.006) * 3;

    // Decrement session remaining
    this.state.sessionRemainingSeconds = Math.max(0, this.state.sessionRemainingSeconds - dt);
    if (this.state.sessionRemainingSeconds <= 0) {
      this.handleSessionExpired();
      return;
    }

    // Update invulnerability
    if (this.state.angler.invulnerableTime > 0) {
      this.state.angler.invulnerableTime = Math.max(0, this.state.angler.invulnerableTime - dt);
    }

    // Update Shark confusion
    if (this.state.shark.scentConfusionTime > 0) {
      this.state.shark.scentConfusionTime = Math.max(0, this.state.shark.scentConfusionTime - dt);
    }

    // 1. Update Anglerfish (Player or Demo Bot)
    if (this.state.demoMode) {
      this.updateDemoBot(dt);
    }
    this.updateAnglerfish(dt);

    // 2. Update Bubble Trails
    this.updateBubbles(dt);

    // 3. Update Shark AI
    this.updateShark(dt);

    // 4. Check Food Eaten
    this.checkFoodEaten();

    // 5. Check Shark Attack Collision
    this.checkSharkCollision();

    // 6. Audio tension heartbeat
    const distToShark = Math.hypot(this.state.angler.x - this.state.shark.x, this.state.angler.y - this.state.shark.y);
    const maxWarnDist = 320;
    const ratio = distToShark / maxWarnDist;
    soundEngine.updateHeartbeat(ratio);

    this.notify();
  }

  private updateAnglerfish(dt: number) {
    const { angler, maze } = this.state;
    angler.mouthOpen = (Math.sin(performance.now() * 0.012) + 1) / 2;

    const currentCellCenterX = angler.gridX * CELL_SIZE + CELL_SIZE / 2;
    const currentCellCenterY = angler.gridY * CELL_SIZE + CELL_SIZE / 2;

    // Try changing direction if queued
    if (angler.nextDir !== angler.dir && angler.nextDir !== 'NONE') {
      const isOpposite =
        (angler.dir === 'LEFT' && angler.nextDir === 'RIGHT') ||
        (angler.dir === 'RIGHT' && angler.nextDir === 'LEFT') ||
        (angler.dir === 'UP' && angler.nextDir === 'DOWN') ||
        (angler.dir === 'DOWN' && angler.nextDir === 'UP');

      if (isOpposite) {
        angler.dir = angler.nextDir;
      } else {
        // Can turn if close to cell center and destination is walkable
        const distToCenter = Math.hypot(angler.x - currentCellCenterX, angler.y - currentCellCenterY);
        if (distToCenter < 10) {
          let testX = angler.gridX;
          let testY = angler.gridY;
          if (angler.nextDir === 'LEFT') testX--;
          if (angler.nextDir === 'RIGHT') testX++;
          if (angler.nextDir === 'UP') testY--;
          if (angler.nextDir === 'DOWN') testY++;

          if (isWalkable(maze.grid, testX, testY)) {
            angler.dir = angler.nextDir;
            angler.x = currentCellCenterX;
            angler.y = currentCellCenterY;
          }
        }
      }
    }

    // Move in current direction
    let dx = 0;
    let dy = 0;
    if (angler.dir === 'LEFT') dx = -1;
    if (angler.dir === 'RIGHT') dx = 1;
    if (angler.dir === 'UP') dy = -1;
    if (angler.dir === 'DOWN') dy = 1;

    if (dx !== 0 || dy !== 0) {
      const prevX = angler.x;
      const prevY = angler.y;

      const nextX = angler.x + dx * angler.speed * dt;
      const nextY = angler.y + dy * angler.speed * dt;

      // Check wall collision ahead
      const nextGridX = Math.floor((nextX + (dx > 0 ? 12 : -12)) / CELL_SIZE);
      const nextGridY = Math.floor((nextY + (dy > 0 ? 12 : -12)) / CELL_SIZE);

      if (isWalkable(maze.grid, nextGridX, nextGridY)) {
        angler.x = nextX;
        angler.y = nextY;
      } else {
        // Stop at wall boundary
        if (dx > 0) angler.x = Math.min(nextX, (angler.gridX + 1) * CELL_SIZE - 12);
        if (dx < 0) angler.x = Math.max(nextX, angler.gridX * CELL_SIZE + 12);
        if (dy > 0) angler.y = Math.min(nextY, (angler.gridY + 1) * CELL_SIZE - 12);
        if (dy < 0) angler.y = Math.max(nextY, angler.gridY * CELL_SIZE + 12);
      }

      // Update current grid cell
      angler.gridX = Math.floor(angler.x / CELL_SIZE);
      angler.gridY = Math.floor(angler.y / CELL_SIZE);
    }
  }

  private dropBubble(x: number, y: number) {
    const bubble: Bubble = {
      id: `bubble-${Date.now()}-${Math.random()}`,
      x,
      y,
      createdAt: performance.now(),
      radius: 4 + Math.random() * 2,
      wobbleOffset: Math.random() * Math.PI * 2,
    };
    this.state.bubbles.push(bubble);
  }

  private updateBubbles(_dt: number) {
    // The trail does not disappear: bubbles persist permanently
    // (Shark cleans them up as it tracks along the scent path)
  }

  private updateShark(dt: number) {
    const { shark, angler, bubbles, maze } = this.state;
    shark.finAnim += dt * 4;

    const sharkCellCenterX = shark.gridX * CELL_SIZE + CELL_SIZE / 2;
    const sharkCellCenterY = shark.gridY * CELL_SIZE + CELL_SIZE / 2;
    const distToCenter = Math.hypot(shark.x - sharkCellCenterX, shark.y - sharkCellCenterY);

    // If disoriented from eating phosphor pod, wander randomly
    if (shark.scentConfusionTime > 0) {
      shark.state = 'PATROL';
    } else {
      // Determine shark state: Direct chase if within alert distance and clear line of sight, or track bubbles!
      const distToPlayer = Math.hypot(shark.x - angler.x, shark.y - angler.y);
      if (distToPlayer < shark.aggroDistance) {
        shark.state = 'DIRECT_CHASE';
      } else if (bubbles.length > 0) {
        shark.state = 'TRACKING_BUBBLE';
      } else {
        shark.state = 'PATROL';
      }
    }

    // Determine target coordinate for pathfinding when reaching cell center
    if (distToCenter < 6) {
      let targetX = angler.gridX;
      let targetY = angler.gridY;

      if (shark.state === 'TRACKING_BUBBLE' && bubbles.length > 0) {
        // Find the oldest or nearest bubble in the scent trail!
        // To simulate scent tracking, find the bubble that is closest to shark or nearest in scent chain
        let closestBubble = bubbles[0];
        let minDist = Infinity;
        for (const b of bubbles) {
          const d = Math.hypot(b.x - shark.x, b.y - shark.y);
          if (d < minDist) {
            minDist = d;
            closestBubble = b;
          }
        }
        targetX = Math.floor(closestBubble.x / CELL_SIZE);
        targetY = Math.floor(closestBubble.y / CELL_SIZE);
        shark.targetBubbleId = closestBubble.id;
      } else if (shark.state === 'PATROL') {
        // Wander toward center or random corridor
        targetX = Math.floor(maze.cols / 2);
        targetY = Math.floor(maze.rows / 2);
      }

      // Compute next step using BFS
      const nextStep = bfsNextStep(maze.grid, shark.gridX, shark.gridY, targetX, targetY);
      if (nextStep) {
        if (nextStep.col > shark.gridX) shark.dir = 'RIGHT';
        else if (nextStep.col < shark.gridX) shark.dir = 'LEFT';
        else if (nextStep.row > shark.gridY) shark.dir = 'DOWN';
        else if (nextStep.row < shark.gridY) shark.dir = 'UP';
      }
    }

    // Move shark in current direction
    let dx = 0;
    let dy = 0;
    if (shark.dir === 'LEFT') dx = -1;
    if (shark.dir === 'RIGHT') dx = 1;
    if (shark.dir === 'UP') dy = -1;
    if (shark.dir === 'DOWN') dy = 1;

    // Direct chase provides slight boost
    const currentSpeed = shark.state === 'DIRECT_CHASE' ? shark.speed * 1.15 : shark.speed;

    const nextX = shark.x + dx * currentSpeed * dt;
    const nextY = shark.y + dy * currentSpeed * dt;

    const nextGridX = Math.floor((nextX + (dx > 0 ? 12 : -12)) / CELL_SIZE);
    const nextGridY = Math.floor((nextY + (dy > 0 ? 12 : -12)) / CELL_SIZE);

    if (isWalkable(maze.grid, nextGridX, nextGridY)) {
      shark.x = nextX;
      shark.y = nextY;
    } else {
      // Stopped at wall
      shark.x = sharkCellCenterX;
      shark.y = sharkCellCenterY;
    }

    shark.gridX = Math.floor(shark.x / CELL_SIZE);
    shark.gridY = Math.floor(shark.y / CELL_SIZE);

    // Shark eats/pops bubbles it comes in contact with
    this.state.bubbles = this.state.bubbles.filter((b) => {
      const d = Math.hypot(b.x - shark.x, b.y - shark.y);
      return d > 16;
    });
  }

  private checkFoodEaten() {
    const { angler, maze } = this.state;
    let uneatenCount = 0;

    for (const plant of maze.plants) {
      if (!plant.eaten) {
        const d = Math.hypot(angler.x - plant.x, angler.y - plant.y);
        if (d < 18) {
          plant.eaten = true;
          this.state.plantsEaten++;
          if (plant.isLantern) {
            // Collectible lantern: increases the size of the light radius!
            this.state.score += 300;
            this.state.lanternRadius = Math.min(320, this.state.lanternRadius + 45);
            soundEngine.playSpecialEat();
          } else {
            // Regular plant: leaves behind a bubble trail that never disappears!
            this.state.score += 50;
            this.dropBubble(plant.x, plant.y);
            soundEngine.playEat();
          }
        } else {
          uneatenCount++;
        }
      }
    }

    // If level cleared, advance to next depth!
    if (uneatenCount === 0) {
      this.nextLevel();
    }
  }

  private checkSharkCollision() {
    const { angler, shark } = this.state;
    if (angler.invulnerableTime > 0) return;

    const dist = Math.hypot(angler.x - shark.x, angler.y - shark.y);
    if (dist < 22) {
      // Caught by shark!
      soundEngine.playSharkAlert();
      soundEngine.playGameOver();
      this.state.gameState = 'GAME_OVER';

      const finalRecord: HighScore = {
        id: `score-${Date.now()}`,
        initials: this.state.demoMode ? 'BOT' : 'ANG',
        score: this.state.score,
        plantsEaten: this.state.plantsEaten,
        survivalSeconds: Math.floor(this.state.survivalSeconds),
        depthLevel: this.state.level,
        date: new Date().toISOString().slice(0, 10),
      };

      if (this.onGameOver) {
        this.onGameOver(finalRecord);
      }
      this.notify();
    }
  }

  // Demo bot AI: Demonstrates how to play by gathering plants and evading the shark
  private updateDemoBot(_dt: number) {
    const { angler, shark, maze } = this.state;
    const now = performance.now();
    if (now - this.lastStepTime < 180) return; // Evaluate every 180ms
    this.lastStepTime = now;

    const distToShark = Math.hypot(angler.x - shark.x, angler.y - shark.y);

    if (distToShark < 140) {
      // Flee away from shark!
      const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
      let bestDir: Direction = angler.dir;
      let maxDist = -1;

      for (const d of dirs) {
        let testX = angler.gridX;
        let testY = angler.gridY;
        if (d === 'LEFT') testX--;
        if (d === 'RIGHT') testX++;
        if (d === 'UP') testY--;
        if (d === 'DOWN') testY++;

        if (isWalkable(maze.grid, testX, testY)) {
          const testWorldX = testX * CELL_SIZE + CELL_SIZE / 2;
          const testWorldY = testY * CELL_SIZE + CELL_SIZE / 2;
          const dist = Math.hypot(testWorldX - shark.x, testWorldY - shark.y);
          if (dist > maxDist) {
            maxDist = dist;
            bestDir = d;
          }
        }
      }
      this.state.angler.nextDir = bestDir;
    } else {
      // Find nearest uneaten plant
      let nearestPlant: Plant | null = null;
      let minDist = Infinity;
      for (const p of maze.plants) {
        if (!p.eaten) {
          const d = Math.hypot(angler.x - p.x, angler.y - p.y);
          if (d < minDist) {
            minDist = d;
            nearestPlant = p;
          }
        }
      }

      if (nearestPlant) {
        const step = bfsNextStep(maze.grid, angler.gridX, angler.gridY, nearestPlant.gridX, nearestPlant.gridY);
        if (step) {
          if (step.col > angler.gridX) this.state.angler.nextDir = 'RIGHT';
          else if (step.col < angler.gridX) this.state.angler.nextDir = 'LEFT';
          else if (step.row > angler.gridY) this.state.angler.nextDir = 'DOWN';
          else if (step.row < angler.gridY) this.state.angler.nextDir = 'UP';
        }
      }
    }
  }

  private notify() {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }
}
