// Maze generation and pathfinding for Angler Escape (Megabug inspired)
import { Plant } from '../types';

export const CELL_SIZE = 32;
export const MAZE_COLS = 29;
export const MAZE_ROWS = 21;

export interface MazeData {
  cols: number;
  rows: number;
  grid: number[][]; // 1 = wall, 0 = corridor
  plants: Plant[];
}

export function createMaze(level: number = 1): MazeData {
  const cols = MAZE_COLS;
  const rows = MAZE_ROWS;
  const grid: number[][] = [];

  // Initialize with walls (1)
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = 1;
    }
  }

  // Recursive backtracking maze carving with loop creation
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

  function carve(r: number, c: number) {
    visited[r][c] = true;
    grid[r][c] = 0;

    const directions = [
      [-2, 0], // Up
      [2, 0],  // Down
      [0, -2], // Left
      [0, 2],  // Right
    ].sort(() => Math.random() - 0.5);

    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && !visited[nr][nc]) {
        // Carve through the wall in-between
        grid[r + dr / 2][c + dc / 2] = 0;
        carve(nr, nc);
      }
    }
  }

  // Start carving from (1, 1)
  carve(1, 1);

  // Add cross loops so the maze has escape paths like Megabug (not strict trees with only dead ends)
  for (let r = 2; r < rows - 2; r += 2) {
    for (let c = 2; c < cols - 2; c += 2) {
      if (grid[r][c] === 1 && Math.random() < 0.28) {
        grid[r][c] = 0;
      }
    }
  }

  // Ensure center clearing exists for spawn or chase room
  const midR = Math.floor(rows / 2);
  const midC = Math.floor(cols / 2);
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      grid[midR + dr][midC + dc] = 0;
    }
  }

  // Populate edible luminous plants and collectible lanterns in open corridors
  const plants: Plant[] = [];
  let plantIdCounter = 0;
  const candidates: Array<{ c: number; r: number }> = [];

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (grid[r][c] === 0) {
        // Leave shark starting zone clear
        const distFromCenter = Math.hypot(c - midC, r - midR);
        if (distFromCenter < 2) continue;

        candidates.push({ c, r });
      }
    }
  }

  // Pick 3-4 distinct corridor locations for collectible lanterns (far from start)
  const lanternIndices = new Set<number>();
  const cornerCandidates = candidates
    .map((pos, idx) => ({ ...pos, idx }))
    .filter((p) => (p.r <= 3 || p.r >= rows - 4) && (p.c <= 3 || p.c >= cols - 4) && !(p.c <= 3 && p.r <= 3));

  // Select 3 or 4 lanterns
  for (const cc of cornerCandidates.sort(() => Math.random() - 0.5).slice(0, 4)) {
    lanternIndices.add(cc.idx);
  }

  candidates.forEach((cand, idx) => {
    const isLantern = lanternIndices.has(idx);

    // If it's a lantern, always spawn it. Otherwise 85% chance of little plant
    if (isLantern || Math.random() < 0.85) {
      plants.push({
        id: `item-${plantIdCounter++}`,
        gridX: cand.c,
        gridY: cand.r,
        x: cand.c * CELL_SIZE + CELL_SIZE / 2,
        y: cand.r * CELL_SIZE + CELL_SIZE / 2,
        isLantern,
        eaten: false,
        color: isLantern ? '#feca57' : (Math.random() < 0.5 ? '#00d2d3' : '#10ac84'),
      });
    }
  });

  return { cols, rows, grid, plants };
}

// Check if a grid coordinate is walkable
export function isWalkable(grid: number[][], c: number, r: number): boolean {
  if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) {
    return false;
  }
  return grid[r][c] === 0;
}

// Breadth-First Search (BFS) pathfinder for AI Shark tracking bubble scent or chasing player
export function bfsNextStep(
  grid: number[][],
  startCol: number,
  startRow: number,
  targetCol: number,
  targetRow: number
): { col: number; row: number } | null {
  if (startCol === targetCol && startRow === targetRow) {
    return { col: startCol, row: startRow };
  }

  const rows = grid.length;
  const cols = grid[0].length;
  const queue: Array<[number, number]> = [[startCol, startRow]];
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const parent = new Map<string, string>();

  visited[startRow][startCol] = true;
  let found = false;

  const dirs = [
    [0, -1], // Up
    [0, 1],  // Down
    [-1, 0], // Left
    [1, 0],  // Right
  ];

  while (queue.length > 0) {
    const [currC, currR] = queue.shift()!;
    if (currC === targetCol && currR === targetRow) {
      found = true;
      break;
    }

    for (const [dc, dr] of dirs) {
      const nc = currC + dc;
      const nr = currR + dr;

      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
        if (!visited[nr][nc] && grid[nr][nc] === 0) {
          visited[nr][nc] = true;
          parent.set(`${nc},${nr}`, `${currC},${currR}`);
          queue.push([nc, nr]);
        }
      }
    }
  }

  if (!found) return null;

  // Reconstruct path backward from target to start
  let curr = `${targetCol},${targetRow}`;
  let prev = curr;

  while (curr !== `${startCol},${startRow}`) {
    prev = curr;
    const p = parent.get(curr);
    if (!p) break;
    curr = p;
  }

  const [nextC, nextR] = prev.split(',').map(Number);
  return { col: nextC, row: nextR };
}
