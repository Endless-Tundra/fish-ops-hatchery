import React, { useRef, useEffect } from 'react';
import { GameEngineState } from '../game/engine';
import { CELL_SIZE } from '../game/maze';
import { Direction } from '../types';

interface GameCanvasProps {
  gameState: GameEngineState;
  onCanvasClick?: () => void;
  onDirection?: (dir: Direction) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, onCanvasClick, onDirection }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Viewport dimensions
    const width = canvas.width;
    const height = canvas.height;

    // Camera offset: Center viewport on the Anglerfish
    const cameraX = Math.round(gameState.angler.x - width / 2);
    const cameraY = Math.round(gameState.angler.y - height / 2);

    // Clear canvas with deep abyssal black
    ctx.fillStyle = '#010409';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Translate by camera
    ctx.translate(-cameraX, -cameraY);

    // 1. Draw Maze Floor & Corridors
    const worldW = gameState.maze.cols * CELL_SIZE;
    const worldH = gameState.maze.rows * CELL_SIZE;

    // Oceanic seabed floor
    ctx.fillStyle = '#061325';
    ctx.fillRect(0, 0, worldW, worldH);

    // Draw floor grit / abyssal sediment pattern
    ctx.fillStyle = '#091c36';
    for (let c = 0; c < gameState.maze.cols; c += 2) {
      for (let r = 0; r < gameState.maze.rows; r += 2) {
        if (gameState.maze.grid[r][c] === 0) {
          ctx.fillRect(c * CELL_SIZE + 6, r * CELL_SIZE + 6, 4, 4);
          ctx.fillRect(c * CELL_SIZE + 20, r * CELL_SIZE + 18, 3, 3);
        }
      }
    }

    // 2. Draw Walls (Abyssal Trench / Basalt Reefs)
    const { grid, cols, rows } = gameState.maze;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 1) {
          const wx = c * CELL_SIZE;
          const wy = r * CELL_SIZE;

          // Main rock block
          ctx.fillStyle = '#0c2444';
          ctx.fillRect(wx, wy, CELL_SIZE, CELL_SIZE);

          // Top highlight (NES 8-bit stone ledge)
          ctx.fillStyle = '#184785';
          ctx.fillRect(wx, wy, CELL_SIZE, 3);
          ctx.fillRect(wx, wy, 3, CELL_SIZE);

          // Deep shadow
          ctx.fillStyle = '#040d1a';
          ctx.fillRect(wx + CELL_SIZE - 3, wy, 3, CELL_SIZE);
          ctx.fillRect(wx, wy + CELL_SIZE - 3, CELL_SIZE, 3);

          // Inner rock texture detail
          ctx.fillStyle = '#123561';
          ctx.fillRect(wx + 8, wy + 8, 6, 6);
          ctx.fillRect(wx + 18, wy + 16, 7, 7);

          // Bioluminescent moss accents
          if ((r + c) % 5 === 0) {
            ctx.fillStyle = '#005f73';
            ctx.fillRect(wx + 4, wy + 4, 3, 3);
          }
        }
      }
    }

    // 3. Draw Edible Luminous Plants & Collectible Lanterns
    const time = performance.now();
    for (const plant of gameState.maze.plants) {
      if (!plant.eaten) {
        const pulse = Math.sin(time * 0.005 + plant.gridX + plant.gridY) * 1.5;

        if (plant.isLantern) {
          // Collectible Lantern (increases the size of your light radius!)
          ctx.save();
          ctx.translate(plant.x, plant.y);

          // Warm ambient lantern glow
          ctx.fillStyle = 'rgba(254, 202, 87, 0.28)';
          ctx.beginPath();
          ctx.arc(0, 0, 16 + pulse, 0, Math.PI * 2);
          ctx.fill();

          // Outer faint halo
          ctx.fillStyle = 'rgba(255, 159, 67, 0.12)';
          ctx.beginPath();
          ctx.arc(0, 0, 24 + pulse * 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Wire handle (curved top arc)
          ctx.strokeStyle = '#ced6e0';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, -9, 5, Math.PI, 0);
          ctx.stroke();

          // Lantern brass cap
          ctx.fillStyle = '#d35400';
          ctx.fillRect(-6, -9, 12, 3);
          ctx.fillStyle = '#f39c12';
          ctx.fillRect(-4, -9, 8, 1);

          // Glass cylinder chamber
          ctx.fillStyle = 'rgba(254, 202, 87, 0.35)';
          ctx.fillRect(-5, -6, 10, 11);
          ctx.strokeStyle = '#7f8c8d';
          ctx.lineWidth = 1;
          ctx.strokeRect(-5, -6, 10, 11);

          // Inner brilliant flame / filament (pulsing warm light)
          ctx.fillStyle = '#feca57';
          ctx.fillRect(-2, -4, 4, 7);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-1, -3, 2, 4);

          // Lantern base
          ctx.fillStyle = '#d35400';
          ctx.fillRect(-6, 5, 12, 3);

          ctx.restore();
        } else {
          // Standard Luminous Algae / Deep-sea Plant
          ctx.save();
          ctx.translate(plant.x, plant.y);

          // Glow halo
          ctx.fillStyle = plant.color === '#00d2d3' ? 'rgba(0, 210, 211, 0.2)' : 'rgba(16, 172, 132, 0.2)';
          ctx.beginPath();
          ctx.arc(0, 0, 6 + pulse, 0, Math.PI * 2);
          ctx.fill();

          // Plant stem and bulb
          ctx.fillStyle = plant.color;
          ctx.fillRect(-2, -2, 4, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-1, -1, 2, 2);

          // Stem
          ctx.fillStyle = '#0652dd';
          ctx.fillRect(-1, 2, 2, 4);

          ctx.restore();
        }
      }
    }

    // 4. Draw Bubble Trail (Bubbles do not disappear!)
    for (const b of gameState.bubbles) {
      const wobble = Math.sin(time * 0.006 + b.wobbleOffset) * 1.5;

      ctx.save();
      ctx.translate(b.x + wobble, b.y);

      // Bubble outline
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Bubble interior tint
      ctx.fillStyle = 'rgba(180, 240, 255, 0.35)';
      ctx.fill();

      // Specular pixel highlight (NES style)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-b.radius * 0.4, -b.radius * 0.4, 2, 2);

      ctx.restore();
    }

    // 5. Draw Shark (Megabug Relentless Hunter)
    const { shark } = gameState;
    ctx.save();
    ctx.translate(shark.x, shark.y);

    // Orientation angle
    let sharkAngle = 0;
    if (shark.dir === 'RIGHT') sharkAngle = 0;
    if (shark.dir === 'DOWN') sharkAngle = Math.PI / 2;
    if (shark.dir === 'LEFT') sharkAngle = Math.PI;
    if (shark.dir === 'UP') sharkAngle = -Math.PI / 2;
    ctx.rotate(sharkAngle);

    // Shark Body (8-bit menacing predator)
    const tailWiggle = Math.sin(shark.finAnim) * 3;

    // Body base
    ctx.fillStyle = '#2f3542';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shark snout
    ctx.fillStyle = '#57606f';
    ctx.beginPath();
    ctx.moveTo(10, -7);
    ctx.lineTo(20, 0);
    ctx.lineTo(10, 7);
    ctx.closePath();
    ctx.fill();

    // White belly
    ctx.fillStyle = '#ced6e0';
    ctx.beginPath();
    ctx.ellipse(2, 4, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dorsal Fin
    ctx.fillStyle = '#1e272e';
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.lineTo(0, -15);
    ctx.lineTo(6, -6);
    ctx.closePath();
    ctx.fill();

    // Pectoral Fins
    ctx.beginPath();
    ctx.moveTo(-2, 7);
    ctx.lineTo(2, 14);
    ctx.lineTo(6, 7);
    ctx.closePath();
    ctx.fill();

    // Tail Fin (wiggle)
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-24, -10 + tailWiggle);
    ctx.lineTo(-19, 0);
    ctx.lineTo(-24, 10 + tailWiggle);
    ctx.closePath();
    ctx.fill();

    // Jaws / Teeth
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(12, 2);
    ctx.lineTo(14, 5);
    ctx.lineTo(16, 2);
    ctx.lineTo(18, 5);
    ctx.fill();

    // Glowing Crimson Predator Eyes
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.arc(10, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(11, -5, 1, 1);

    // Eye glow halo
    ctx.fillStyle = 'rgba(255, 71, 87, 0.4)';
    ctx.beginPath();
    ctx.arc(10, -4, 6, 0, Math.PI * 2);
    ctx.fill();

    // If confused by phosphor bloom, draw dizzy bubbles around head
    if (shark.scentConfusionTime > 0) {
      ctx.fillStyle = '#feca57';
      const confAngle = time * 0.01;
      for (let i = 0; i < 3; i++) {
        const ca = confAngle + (i * Math.PI * 2) / 3;
        ctx.fillRect(Math.cos(ca) * 16, Math.sin(ca) * 16 - 8, 3, 3);
      }
    }

    ctx.restore();

    // 6. Draw Player (Anglerfish)
    const { angler } = gameState;
    ctx.save();
    ctx.translate(angler.x, angler.y);

    let anglerAngle = 0;
    if (angler.dir === 'RIGHT') anglerAngle = 0;
    if (angler.dir === 'DOWN') anglerAngle = Math.PI / 2;
    if (angler.dir === 'LEFT') anglerAngle = Math.PI;
    if (angler.dir === 'UP') anglerAngle = -Math.PI / 2;

    ctx.rotate(anglerAngle);

    // Invulnerability blink
    if (angler.invulnerableTime <= 0 || Math.floor(time / 100) % 2 === 0) {
      // Tail Fin
      const anglerTailWiggle = Math.sin(time * 0.015) * 3;
      ctx.fillStyle = '#00a8ff';
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-20, -7 + anglerTailWiggle);
      ctx.lineTo(-16, 0);
      ctx.lineTo(-20, 7 + anglerTailWiggle);
      ctx.closePath();
      ctx.fill();

      // Main Round Body
      ctx.fillStyle = '#0097e6';
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body skin texture & belly
      ctx.fillStyle = '#00d2d3';
      ctx.beginPath();
      ctx.ellipse(1, 3, 9, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Big curious white eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(4, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      // Black pupil looking forward
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(6, -4, 2, 0, Math.PI * 2);
      ctx.fill();

      // Mouth & Needle Teeth (animated opening & closing)
      const mouthGap = 2 + angler.mouthOpen * 6;
      ctx.fillStyle = '#0c2461';
      ctx.beginPath();
      ctx.moveTo(8, -2);
      ctx.lineTo(15, 0);
      ctx.lineTo(8, mouthGap);
      ctx.closePath();
      ctx.fill();

      // Sharp white teeth
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(9, -2, 2, 3);
      ctx.fillRect(12, -1, 1, 2);
      ctx.fillRect(9, mouthGap - 2, 2, 2);

      // Dorsal Fin
      ctx.fillStyle = '#006266';
      ctx.beginPath();
      ctx.moveTo(-4, -8);
      ctx.lineTo(0, -12);
      ctx.lineTo(4, -8);
      ctx.closePath();
      ctx.fill();

      // Pectoral Fin
      ctx.fillStyle = '#00a8ff';
      ctx.beginPath();
      ctx.arc(0, 4, 4, 0, Math.PI);
      ctx.fill();

      // Bioluminescent Illicium (Stalk) & Esca (Lantern bulb)
      ctx.strokeStyle = '#feca57';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(2, -9);
      // Curve forward arching above head
      ctx.quadraticCurveTo(12, -22, 18, -12);
      ctx.stroke();

      // Esca Bulb (Light Source)
      const escaX = 18;
      const escaY = -12;

      // Glow burst around bulb
      ctx.fillStyle = 'rgba(254, 202, 87, 0.4)';
      ctx.beginPath();
      ctx.arc(escaX, escaY, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#feca57';
      ctx.beginPath();
      ctx.arc(escaX, escaY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(escaX - 1, escaY - 1, 2, 2);
    }

    ctx.restore();

    // 7. Megabug Circular Lantern Mask (Bioluminescent Spotlight)
    // Restore transformation to draw full-screen darkness with circular mask
    ctx.restore();

    // Calculate screen position of the Angler's lantern
    const lanternScreenX = gameState.angler.x - cameraX;
    const lanternScreenY = gameState.angler.y - cameraY;
    const radius = gameState.lanternRadius + gameState.lanternFlicker;

    // Create dark abyss mask using composite operation
    ctx.save();

    // Create an offscreen-style darkness overlay with radial gradient transparency
    const lightGrad = ctx.createRadialGradient(
      lanternScreenX,
      lanternScreenY,
      radius * 0.4,
      lanternScreenX,
      lanternScreenY,
      radius
    );

    // Inside is completely clear, edge fades to pitch darkness
    lightGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    lightGrad.addColorStop(0.7, 'rgba(1, 4, 10, 0.3)');
    lightGrad.addColorStop(0.9, 'rgba(1, 4, 10, 0.85)');
    lightGrad.addColorStop(1, 'rgba(1, 4, 10, 0.99)');

    // Draw the circular falloff
    ctx.fillStyle = lightGrad;
    ctx.beginPath();
    ctx.arc(lanternScreenX, lanternScreenY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Pitch black everywhere outside the lantern circle
    ctx.fillStyle = '#01040a';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.arc(lanternScreenX, lanternScreenY, radius, 0, Math.PI * 2, true);
    ctx.fill();

    // Vintage Lens Ring / Bioluminescent Halo Border
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lanternScreenX, lanternScreenY, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(lanternScreenX, lanternScreenY, radius - 3, 0, Math.PI * 2);
    ctx.stroke();

    // If Shark is in the dark outside the light, show its glowing red eyes cutting through the dark!
    const sharkScreenX = gameState.shark.x - cameraX;
    const sharkScreenY = gameState.shark.y - cameraY;
    const distToLantern = Math.hypot(sharkScreenX - lanternScreenX, sharkScreenY - lanternScreenY);

    if (distToLantern > radius && distToLantern < radius + 180) {
      // Glow red predator eyes in the dark abyss!
      const eyeOpacity = Math.max(0.2, 1 - (distToLantern - radius) / 180);
      ctx.fillStyle = `rgba(255, 71, 87, ${eyeOpacity * 0.5})`;
      ctx.beginPath();
      ctx.arc(sharkScreenX, sharkScreenY, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 71, 87, ${eyeOpacity})`;
      ctx.beginPath();
      ctx.arc(sharkScreenX - 3, sharkScreenY, 2.5, 0, Math.PI * 2);
      ctx.arc(sharkScreenX + 3, sharkScreenY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // 8. Demo Mode Overlay & Attract Banners
    if (gameState.demoMode) {
      ctx.save();
      // Retro flashing DEMO banner
      const isBlink = Math.floor(time / 450) % 2 === 0;

      // Header Banner with Angler Escape & Megabug Homage above DEMO
      ctx.fillStyle = 'rgba(9, 9, 11, 0.88)';
      ctx.fillRect(0, 14, width, 84);
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 14, width, 84);

      ctx.fillStyle = '#34d399';
      ctx.font = '15px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ANGLER ESCAPE', width / 2, 38);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '8.5px "Press Start 2P", monospace';
      ctx.fillText('DEEP MAZE · MEGABUG HOMAGE', width / 2, 54);

      ctx.fillStyle = isBlink ? '#f97316' : '#ffffff';
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillText('* DEMO *', width / 2, 74);

      ctx.fillStyle = '#71717a';
      ctx.font = '7.5px "Press Start 2P", monospace';
      ctx.fillText('PRESS ANY KEY OR TAP TO PLAY', width / 2, 88);

      // Helpful mechanics tutorial callouts
      const hintIdx = Math.floor((time / 3000) % 3);
      const hints = [
        'COLLECT LANTERNS TO EXPAND LIGHT RADIUS',
        'EATING PLANTS LEAVES PERMANENT BUBBLES',
        'SHARK RELENTLESSLY TRACKS YOUR BUBBLE TRAIL',
      ];

      ctx.fillStyle = 'rgba(15, 17, 21, 0.9)';
      ctx.fillRect(width / 2 - 230, height - 52, 460, 36);
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1;
      ctx.strokeRect(width / 2 - 230, height - 52, 460, 36);

      ctx.fillStyle = '#f4f4f5';
      ctx.font = '8.5px "Press Start 2P", monospace';
      ctx.fillText(hints[hintIdx], width / 2, height - 30);

      ctx.restore();
    }
  }, [gameState]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !onDirection) return;
    const touchEnd = e.changedTouches[0];
    if (!touchEnd) return;

    const dx = touchEnd.clientX - touchStartRef.current.x;
    const dy = touchEnd.clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 15) {
      if (absX > absY) {
        onDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        onDirection(dy > 0 ? 'DOWN' : 'UP');
      }
    }
    touchStartRef.current = null;
  };

  return (
    <div
      onClick={onCanvasClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full aspect-[4/3] bg-black rounded-b-lg overflow-hidden border-x-2 border-b-2 border-zinc-800 shadow-2xl cursor-pointer"
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-full block pixelated"
      />
    </div>
  );
};
