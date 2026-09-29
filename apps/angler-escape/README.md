# Angler Escape

A lightweight, vintage NES-inspired pixel art maze game inspired by the 1982 classic **Megabug**.

## 🎮 Game Mechanics

- **Megabug Inspiration & Circular Vision**: In Megabug, you navigated a dark maze viewed through a magnifying lens. Here, you play as an **Anglerfish** deep in the oceanic abyss. The bioluminescent light of your lantern (*esca*) illuminates a circular spotlight of the cavern around you while the rest remains pitch dark.
- **Eating Luminous Plants**: Devour glowing plants and algae pods scattered through the labyrinth to earn points, replenish lantern brightness, and trigger special Phosphor Blooms that temporarily disorient predators.
- **Bubble Trail Scent Mechanic**: As you swim through the maze, you leave behind an effervescent trail of bubbles.
- **Relentless Shark Predator**: A menacing abyssal shark slowly sniffs out and follows your bubble trail to track you down, creating persistent tension and a classic cat-and-mouse hunt.
- **Attract Demo Mode**: When the user is idle on the title screen or between rounds, an autonomous attract demo automatically plays, demonstrating how to swim, eat plants, lay bubble trails, and evade the stalking shark.
- **10-Minute Ephemeral Limit**: The entire game session is strictly ephemeral with a 10-minute countdown limit. Scores and achievements are logged to the ephemeral high score database before the session resets.
- **Vintage NES 8-bit Audio & Visuals**: CRT phosphor scanlines toggle, authentic 8-bit NES color palette, and Web Audio API synthesized chiptune sounds (bubble pops, crunch bites, pulsing Jaws-style predator heartbeat that speeds up as danger nears).

---

## 🏗️ 3-Container Ephemeral Architecture

The application is structured into 3 decoupled containers:

1. **Frontend Container (`Dockerfile.frontend`)**:
   - Multi-stage build (Node.js build step + lightweight Nginx Alpine runner).
   - Serves the React 19 SPA, canvas pixel-art renderer, and Web Audio synthesizer.
   - Proxies `/api/*` traffic to the backend service.
   - Exposes Port `80`.

2. **Backend Container (`Dockerfile.backend`)**:
   - Lightweight Node.js Alpine service running Express.
   - Provides REST endpoints:
     - `GET /api/scores`: Fetch ephemeral high scores.
     - `POST /api/scores`: Save a player's run.
     - `GET /api/session`: 10-minute ephemeral session countdown authority.
     - `POST /api/session/reset`: Reset the 10-minute ephemeral session.
     - `GET /api/containers`: Container status and architecture topology metadata.
     - `GET /api/health`: Healthcheck endpoint.
   - Exposes Port `3000`.

3. **Database Container (`Dockerfile.db`)**:
   - Ephemeral in-memory database store (Redis or lightweight volatile engine).
   - Completely ephemeral with zero disk mounts; state resets after session concludes.
   - Exposes Port `6379`.

---

## 🚀 GitHub Actions Workflow

A dedicated GitHub Actions workflow is provided at `.github/workflows/build-containers.yml`:
- Builds all 3 containers (`frontend`, `backend`, `database`) in parallel using Docker Buildx.
- Utilizes layer caching for rapid builds.
- Validates multi-container orchestration with Docker Compose.

---

## 🛠️ Local Development & Docker Compose

### Run with Docker Compose:
```bash
docker compose up --build
```
Open [http://localhost](http://localhost) in your browser.

### Run in Development:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
