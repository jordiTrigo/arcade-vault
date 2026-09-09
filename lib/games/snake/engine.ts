import { FRUIT_NAMES, drawFruit, type FruitName } from "./sprites";

const GRID_COLS = 20;
const GRID_ROWS = 20;
const CELL = 40; // canvas 800x800
const INITIAL_INTERVAL_MS = 160; // tiempo entre pasos de grilla al nivel 1
const INTERVAL_STEP_MS = 12; // reducción de intervalo por nivel
const MIN_INTERVAL_MS = 60; // piso de velocidad
const FRUITS_PER_LEVEL = 5;
const POINTS_PER_FRUIT = 10;
const INITIAL_LENGTH = 3;
const MAX_STEPS_PER_FRAME = 5;
const DEAD_FREEZE_MS = 400;

const W = GRID_COLS * CELL;
const H = GRID_ROWS * CELL;

type Cell = { col: number; row: number };
type Direction = { dx: number; dy: number };

const UP: Direction = { dx: 0, dy: -1 };
const DOWN: Direction = { dx: 0, dy: 1 };
const LEFT: Direction = { dx: -1, dy: 0 };
const RIGHT: Direction = { dx: 1, dy: 0 };

export type SnakeStatus = "playing" | "dead" | "gameover";

export type SnakeState = {
  score: number;
  lives: number;
  level: number;
  status: SnakeStatus;
};

export function createSnakeGame(ctx: CanvasRenderingContext2D) {
  let body: Cell[];
  let direction: Direction;
  let pendingDirection: Direction;
  let fruit: Cell & { name: FruitName };
  let score = 0;
  let level = 1;
  let fruitsEaten = 0;
  let interval = INITIAL_INTERVAL_MS;
  let accumulator = 0;
  let status: SnakeStatus = "playing";
  let deadTimer = 0;

  function randomEmptyCell(): Cell {
    const occupied = new Set(body.map((c) => `${c.col},${c.row}`));
    const empty: Cell[] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      for (let row = 0; row < GRID_ROWS; row++) {
        if (!occupied.has(`${col},${row}`)) empty.push({ col, row });
      }
    }
    return empty[Math.floor(Math.random() * empty.length)];
  }

  function spawnFruit() {
    const cell = randomEmptyCell();
    const name = FRUIT_NAMES[Math.floor(Math.random() * FRUIT_NAMES.length)];
    fruit = { ...cell, name };
  }

  function initGame() {
    const startCol = Math.floor(GRID_COLS / 2);
    const startRow = Math.floor(GRID_ROWS / 2);
    body = Array.from({ length: INITIAL_LENGTH }, (_, i) => ({
      col: startCol - i,
      row: startRow,
    }));
    direction = RIGHT;
    pendingDirection = RIGHT;
    score = 0;
    level = 1;
    fruitsEaten = 0;
    interval = INITIAL_INTERVAL_MS;
    accumulator = 0;
    status = "playing";
    deadTimer = 0;
    spawnFruit();
  }

  function die() {
    status = "dead";
    deadTimer = DEAD_FREEZE_MS;
  }

  function step() {
    direction = pendingDirection;
    const head = body[0];
    const newHead: Cell = { col: head.col + direction.dx, row: head.row + direction.dy };

    if (
      newHead.col < 0 ||
      newHead.col >= GRID_COLS ||
      newHead.row < 0 ||
      newHead.row >= GRID_ROWS
    ) {
      die();
      return;
    }

    const ateFruit = newHead.col === fruit.col && newHead.row === fruit.row;
    const newBody = [newHead, ...body];
    if (!ateFruit) newBody.pop();

    const collided = newBody
      .slice(1)
      .some((seg) => seg.col === newHead.col && seg.row === newHead.row);
    if (collided) {
      die();
      return;
    }

    body = newBody;

    if (ateFruit) {
      score += POINTS_PER_FRUIT;
      fruitsEaten++;
      if (fruitsEaten % FRUITS_PER_LEVEL === 0) {
        level++;
        interval = Math.max(MIN_INTERVAL_MS, INITIAL_INTERVAL_MS - (level - 1) * INTERVAL_STEP_MS);
      }
      spawnFruit();
    }
  }

  function drawGrid() {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = "#8a8fb5";
    ctx.lineWidth = 0.5;
    for (let c = 1; c < GRID_COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, H);
      ctx.stroke();
    }
    for (let r = 1; r < GRID_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(W, r * CELL);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSnake() {
    body.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? "#7CFC8A" : "#22c55e";
      ctx.fillRect(seg.col * CELL + 1, seg.row * CELL + 1, CELL - 2, CELL - 2);
    });
  }

  function drawHUD() {
    ctx.fillStyle = "#fff";
    ctx.font = "15px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE  ${score}`, 14, 26);
    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${level}`, W / 2, 26);
  }

  function drawOverlay() {
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 46px monospace";
    ctx.fillText("GAME OVER", W / 2, H / 2 - 18);
    ctx.font = "18px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText(`PUNTAJE: ${score}`, W / 2, H / 2 + 22);
  }

  initGame();

  const game = {
    isPaused: false,

    update(dt: number) {
      if (game.isPaused) return;

      if (status === "gameover") return;

      if (status === "dead") {
        deadTimer -= dt;
        if (deadTimer <= 0) status = "gameover";
        return;
      }

      accumulator += dt;
      let steps = 0;
      while (accumulator >= interval && steps < MAX_STEPS_PER_FRAME && status === "playing") {
        accumulator -= interval;
        step();
        steps++;
      }
    },

    draw() {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      drawGrid();
      drawSnake();
      drawFruit(ctx, fruit.name, fruit.col * CELL, fruit.row * CELL, CELL, CELL);
      drawHUD();
      if (status === "gameover") drawOverlay();
    },

    getState(): SnakeState {
      return { score, lives: 1, level, status };
    },

    reset() {
      initGame();
    },

    setPaused(v: boolean) {
      game.isPaused = v;
    },

    keyDown(code: string) {
      if (game.isPaused || status !== "playing") return;
      let next: Direction | null = null;
      switch (code) {
        case "ArrowUp":
          next = UP;
          break;
        case "ArrowDown":
          next = DOWN;
          break;
        case "ArrowLeft":
          next = LEFT;
          break;
        case "ArrowRight":
          next = RIGHT;
          break;
        default:
          return;
      }
      if (next.dx === -direction.dx && next.dy === -direction.dy) return;
      pendingDirection = next;
    },

    keyUp(_code: string) {
      // sin efecto: el motor usa movimiento discreto por pasos de grilla, no teclas sostenidas
    },
  };

  return game;
}

export type SnakeGame = ReturnType<typeof createSnakeGame>;
