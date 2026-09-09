// Motor de Arkanoid portado desde references/started-games/04-arkanoid/game.js.
// Sin variables globales de módulo: todo el estado vive en la closure de createArkanoidGame.
// Overlay de pausa con selector de nivel y tecla P/Escape del original: eliminados (ver SPEC 08).

import { LEVELS, type BlockColor } from "./levels";
import {
  drawSprite,
  drawFrame,
  loadSpritesheet,
  EXPLOSION_FRAMES,
  EXPLOSION_DURATION,
} from "./sprites";

const W = 800;
const H = 600;

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;

type Block = { x: number; y: number; w: number; h: number; color: BlockColor; alive: boolean };
type Explosion = { x: number; y: number; w: number; h: number; color: BlockColor; elapsed: number };

export type ArkanoidStatus = "playing" | "gameover" | "win";

export type ArkanoidState = {
  score: number;
  lives: number;
  level: number;
  status: ArkanoidStatus;
};

function playSound(audio: HTMLAudioElement) {
  const el = audio.cloneNode() as HTMLAudioElement;
  el.play().catch(() => {});
}

export function createArkanoidGame(ctx: CanvasRenderingContext2D) {
  const paddle = { x: 0, y: 560, w: 81, h: 14 };
  const ball = { x: 0, y: 0, w: 16, h: 16, vx: BASE_BALL_VX, vy: BASE_BALL_VY };

  const bounceSound = new Audio("/games/arkanoid/sounds/ball-bounce.mp3");
  const breakSound = new Audio("/games/arkanoid/sounds/break-sound.mp3");

  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let lives = 3;
  let score = 0;
  let status: ArkanoidStatus = "playing";
  let currentLevel = 1;
  let ready = false;

  const keysHeld: Record<string, boolean> = {};

  function initPaddle() {
    paddle.x = (W - paddle.w) / 2;
  }

  function loadLevel(n: number) {
    currentLevel = n;
    const level = LEVELS[n - 1];
    blocks = level.blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * level.speed;
    ball.vy = BASE_BALL_VY * level.speed;
  }

  function collideAABB(block: Block) {
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }

  function initGame() {
    lives = 3;
    score = 0;
    status = "playing";
    initPaddle();
    loadLevel(1);
  }

  const game = {
    isPaused: false,
    ready: false,

    update(dt: number) {
      if (!ready || game.isPaused || status !== "playing") return;

      if (keysHeld["ArrowLeft"]) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
      if (keysHeld["ArrowRight"]) paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x <= 0) {
        ball.x = 0;
        ball.vx = Math.abs(ball.vx);
        playSound(bounceSound);
      }
      if (ball.x + ball.w >= W) {
        ball.x = W - ball.w;
        ball.vx = -Math.abs(ball.vx);
        playSound(bounceSound);
      }
      if (ball.y <= 0) {
        ball.y = 0;
        ball.vy = Math.abs(ball.vy);
        playSound(bounceSound);
      }

      if (
        ball.vy > 0 &&
        ball.x + ball.w > paddle.x &&
        ball.x < paddle.x + paddle.w &&
        ball.y + ball.h >= paddle.y &&
        ball.y + ball.h <= paddle.y + paddle.h + 8
      ) {
        ball.y = paddle.y - ball.h;
        ball.vy = -Math.abs(ball.vy);
        playSound(bounceSound);
      }

      for (const block of blocks) {
        if (!block.alive) continue;
        if (collideAABB(block)) {
          block.alive = false;
          explosions.push({
            x: block.x,
            y: block.y,
            w: block.w,
            h: block.h,
            color: block.color,
            elapsed: 0,
          });
          score += 10;
          ball.vy = -ball.vy;
          playSound(breakSound);
          if (blocks.every((b) => !b.alive)) {
            if (currentLevel < 5) loadLevel(currentLevel + 1);
            else status = "win";
          }
          break; // un bloque por frame
        }
      }

      for (const exp of explosions) exp.elapsed += dt * 1000;
      explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

      if (ball.y > H) {
        lives--;
        if (lives <= 0) {
          lives = 0;
          status = "gameover";
        } else {
          ball.x = paddle.x + (paddle.w - ball.w) / 2;
          ball.y = paddle.y - ball.h;
          const speed = LEVELS[currentLevel - 1].speed;
          ball.vx = BASE_BALL_VX * speed;
          ball.vy = BASE_BALL_VY * speed;
        }
      }
    },

    draw() {
      if (!ready) return;

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      for (const block of blocks) {
        if (block.alive)
          drawSprite(ctx, `block_${block.color}`, block.x, block.y, block.w, block.h);
      }

      for (const exp of explosions) {
        const frameIndex = Math.min(Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4), 3);
        drawFrame(ctx, EXPLOSION_FRAMES[exp.color][frameIndex], exp.x, exp.y, exp.w, exp.h);
      }

      drawSprite(ctx, "paddle", paddle.x, paddle.y, paddle.w, paddle.h);
      drawSprite(ctx, "ball", ball.x, ball.y, ball.w, ball.h);

      if (status === "playing") {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 18px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("Score: " + score, 10, 10);
        ctx.textAlign = "center";
        ctx.fillText("Nivel: " + currentLevel, W / 2, 10);
        const ballSize = 16;
        const ballSpacing = 4;
        for (let i = 0; i < lives; i++) {
          const bx = W - 10 - (lives - i) * (ballSize + ballSpacing);
          drawSprite(ctx, "ball", bx, 10, ballSize, ballSize);
        }
      }

      if (status === "gameover" || status === "win") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 48px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const message = status === "gameover" ? "GAME OVER" : "¡Completaste el juego!";
        ctx.fillText(message, W / 2, H / 2);
      }
    },

    getState(): ArkanoidState {
      return { score, lives, level: currentLevel, status };
    },

    reset() {
      initGame();
    },

    setPaused(v: boolean) {
      game.isPaused = v;
    },

    keyDown(code: string) {
      if (code === "ArrowLeft" || code === "ArrowRight") keysHeld[code] = true;
    },

    keyUp(code: string) {
      if (code === "ArrowLeft" || code === "ArrowRight") keysHeld[code] = false;
    },

    pointerMove(x: number) {
      paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2));
    },
  };

  loadSpritesheet(() => {
    initGame();
    ready = true;
    game.ready = true;
  });

  return game;
}

export type ArkanoidGame = ReturnType<typeof createArkanoidGame>;
