# SPEC 09 — Juego Snake con motor real (canvas)

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 05, SPEC 06
> **Date:** 2026-09-09
> **Objective:** Crear el juego Snake desde cero (sin prototipo de referencia, con sprites de fruta reales provistos en `references/source-assets/snake-assets/`) como motor real en canvas, id `snake`, integrado al leaderboard real de Supabase.

## Scope

**In:**

- Nueva entrada `snake` en `GAMES` (`lib/data.ts`) y en `games` (Supabase): juego nuevo, independiente de la entrada mock existente `serpentina` (que no se toca).
- Motor de juego diseñado desde cero: grilla de 20×20 celdas de 40px (canvas 800×800), la serpiente se mueve a pasos de grilla mediante un acumulador de tiempo en milisegundos, crece 1 segmento por fruta comida, gira con las flechas bloqueando la reversa de 180° sobre su propio cuerpo, y muere al chocar contra el borde de la grilla o contra su propio cuerpo.
- Frutas dibujadas con sprites reales del atlas de `references/source-assets/snake-assets/` (`fruits.png` + `sprites.js`), migrados a `public/games/snake/fruits.png` y `lib/games/snake/sprites.ts` (módulo TS con import ES, sin script global). En cada spawn se elige una fruta al azar entre las 22 del atlas; todas otorgan el mismo puntaje.
- El nivel sube cada 5 frutas comidas; cada nivel reduce el intervalo de movimiento (la serpiente acelera) hasta un piso mínimo.
- El motor vive aislado en `lib/games/snake/` (`engine.ts` + `SnakeCanvas.tsx`), montado por un componente de canvas de React (`"use client"`), siguiendo el patrón de dos archivos ya usado en `asteroides`/`tetris`/`arkanoid`.
- Contrato canvas → React: ref imperativa (`pause`/`resume`/`reset`) + `onStateChange({score, lives, level, status})`. `lives` queda fijo en `1` (sin sistema de vidas); `status` usa `"playing" | "dead" | "gameover"` (no se usa `"win"` — snake es infinito hasta morir).
- El HUD nativo del canvas (puntaje, nivel) se dibuja en paralelo al `player-hud` de React — ambos conviven, mismo patrón que asteroides.
- El overlay nativo "GAME OVER" del canvas se dibuja en paralelo al modal de React de fin de partida — ambos conviven.
- `PAUSA`/`REANUDAR` del contenedor React controla `setPaused(v)` leído en cada tick del motor; al reanudar se resetea el tiempo acumulado para evitar un salto grande.
- Leaderboard real: `getTopScores`/`saveScore` de Supabase para `snake`, vía el registro `GAME_ENGINES` ya generalizado (los 4 checks hardcodeados de `"asteroides"` ya están expresados como `id in GAME_ENGINES` / `if (Engine)` en `lib/games/data.ts`, `app/juego/[id]/page.tsx`, `app/juego/[id]/jugar/page.tsx` y `components/hall-of-fame.tsx` — confirmado, no requieren cambios).
- Migración de Supabase insertando la fila de `snake` en `games`.

**Out of scope (para futuros specs):**

- Tocar o eliminar la entrada mock `serpentina` de `GAMES`.
- Controles táctiles/móviles.
- Sonido/efectos de audio (no hay assets de audio provistos).
- Power-ups, obstáculos, o niveles con diseño distinto del de aceleración progresiva.
- Estado de victoria (`"win"`) — snake es infinito, no tiene condición de fin salvo morir.
- Portada CSS nueva — se reutiliza `cover-snake`, ya existente.

## Data model

```ts
// lib/data.ts — nueva entrada en GAMES, no reemplaza "serpentina"
{
  id: "snake",
  title: "SNAKE",
  short: "Sprites reales de fruta te esperan en la grilla.",
  long: "Guía la serpiente por una grilla neón devorando frutas reales — banana, sandía, kiwi y más — mientras crece y acelera. Un giro en falso contra el borde o tu propia cola termina la partida.",
  cat: "ARCADE",
  cover: "cover-snake", // reutilizada, ver Decisions
  color: "green",
  best: 0,
  plays: "0",
}
```

```ts
// lib/games/registry.ts — GameEngineState se reutiliza tal cual, sin ampliar el contrato
// lives siempre 1; status nunca reporta "win" para este juego
```

```ts
// lib/games/snake/engine.ts — constantes de diseño
const GRID_COLS = 20;
const GRID_ROWS = 20;
const CELL = 40; // canvas 800x800
const INITIAL_INTERVAL_MS = 160; // tiempo entre pasos de grilla al nivel 1
const INTERVAL_STEP_MS = 12; // reducción de intervalo por nivel
const MIN_INTERVAL_MS = 60; // piso de velocidad
const FRUITS_PER_LEVEL = 5;
const POINTS_PER_FRUIT = 10;
const INITIAL_LENGTH = 3;
```

```ts
// lib/games/snake/sprites.ts — portado 1:1 de references/source-assets/snake-assets/sprites.js
export type FruitName =
  | "banana"
  | "orange"
  | "grape"
  | "garlic"
  | "eggplant"
  | "strawberry"
  | "cherry"
  | "carrot"
  | "mushroom"
  | "broccoli"
  | "watermelon"
  | "pepper"
  | "kiwi"
  | "lemon"
  | "peach"
  | "peanut"
  | "apple"
  | "tomato"
  | "berries"
  | "grapes2"
  | "pineapple"
  | "melon";

export const FRUIT_ATLAS: Record<FruitName, { x: number; y: number; w: number; h: number }>;
// mismos 22 recortes que hoy tiene window.SPRITE_ATLAS.fruits en sprites.js

export function loadFruitsImage(cb: () => void): void; // async, mismo patrón que loadSpritesheet de arkanoid
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  name: FruitName,
  x: number,
  y: number,
  w: number,
  h: number,
): void; // escala manteniendo aspect ratio dentro de la celda, sin deformar
```

```sql
-- insert de la fila del juego en games (SPEC 06 ya creó la tabla)
insert into games (id, title, short, long, cat, cover, color, best, plays)
values ('snake', 'SNAKE', 'Sprites reales de fruta te esperan en la grilla.',
  'Guía la serpiente por una grilla neón devorando frutas reales — banana, sandía, kiwi y más — mientras crece y acelera. Un giro en falso contra el borde o tu propia cola termina la partida.',
  'ARCADE', 'cover-snake', 'green', 0, '0');
```

Convenciones:

- El motor (`engine.ts`) no conoce React ni el DOM más allá del `CanvasRenderingContext2D`; `SnakeCanvas.tsx` es el único puente con React.
- `update(dt)` recibe `dt` en milisegundos crudos (sin clamp de segundos tipo asteroides — no aplica a movimiento discreto de grilla) y acumula en un contador interno; cuando supera el intervalo vigente, ejecuta como máximo unos pocos pasos de grilla por frame (evita que un frame lento haga "saltar" varias celdas de golpe).
- `onStateChange` se invoca solo cuando `score`/`level`/`status` cambian respecto al frame anterior (`lives` no varía, nunca dispara por sí solo).

## Implementation plan

1. Mover `fruits.png` a `public/games/snake/fruits.png`. Crear `lib/games/snake/sprites.ts` portando el contenido de `sprites.js` a `FRUIT_ATLAS` (22 frutas tipadas) + `loadFruitsImage(cb)` asíncrono (mismo patrón que `lib/games/arkanoid/sprites.ts::loadSpritesheet`) + `drawFruit(ctx, name, x, y, w, h)` que escala preservando aspect ratio. Verificación: `npx tsc --noEmit`.
2. Crear `lib/games/snake/engine.ts`: factory `createSnakeGame(ctx)` con todo el estado en closure (cuerpo de la serpiente como array de celdas `{col, row}`, dirección actual y pendiente, fruta activa con su `FruitName` aleatorio, score, nivel, intervalo de movimiento vigente, status). Expone `{ isPaused, update(dt), draw(), getState(), reset(), setPaused(v), keyDown(code), keyUp(code) }`. `update(dt)` acumula tiempo y avanza pasos de grilla según el intervalo vigente; `keyDown` cambia la dirección pendiente bloqueando el giro de 180°; colisión con el borde o el propio cuerpo pone `status` en `"dead"` y luego `"gameover"`; comer fruta agrega 1 segmento, suma `POINTS_PER_FRUIT`, sortea la próxima fruta y sube de nivel cada `FRUITS_PER_LEVEL`. `draw()` dibuja la grilla, el cuerpo/cabeza de la serpiente, la fruta activa (`drawFruit`), el HUD nativo (puntaje/nivel) y el overlay "GAME OVER" cuando corresponde. Verificación: `npx tsc --noEmit`.
3. Crear `lib/games/snake/SnakeCanvas.tsx` (`"use client"`, `forwardRef`) modelado sobre `TetrisCanvas.tsx`/`AsteroidsCanvas.tsx`: `<canvas width={800} height={800}>`, gate de carga (el loop no arranca hasta que `loadFruitsImage` resuelve), mismos refs (`canvasRef`, `gameRef`, `lastStateRef`, `lastTimeRef`, `rafRef`, `onStateChangeRef`), `dt` del loop pasado en milisegundos crudos, `lastTimeRef.current = null` en `resume`/`reset`, `useImperativeHandle` con `pause`/`resume`/`reset`, listeners de `keydown`/`keyup` en `window` para `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` con `preventDefault()`, `onStateChange` disparado solo cuando `score`/`level`/`status` cambian. Verificación: `npx tsc --noEmit`.
4. Registrar en `lib/games/registry.ts`: import de `SnakeCanvas` + entrada `snake: SnakeCanvas` en `GAME_ENGINES`. Verificación: `npx tsc --noEmit`.
5. Agregar la entrada `snake` a `GAMES` en `lib/data.ts` (después de `serpentina`, sin tocarla): título, `short`/`long`, `cat: "ARCADE"`, `cover: "cover-snake"`, `color: "green"`, `best: 0`, `plays: "0"`. Verificación: `npx tsc --noEmit`; `/juego/snake/jugar` no dispara `notFound()`.
6. Migración de Supabase (`mcp__supabase__apply_migration`) con el `insert into games` de la fila `snake` (mismos valores que el paso 5). Verificación: `mcp__supabase__execute_sql` con `select * from games where id = 'snake'` devuelve 1 fila.
7. Verificación manual en navegador: entrar a `/juego/snake/jugar`, mover la serpiente con flechas, comer frutas (sprites reales visibles), ver el `player-hud` de React (Puntuación/Nivel; Vidas muestra 1 corazón fijo) actualizarse junto al HUD nativo del canvas; intentar girar 180° se ignora; chocar contra el borde o contra el propio cuerpo dispara el overlay "GAME OVER" del canvas Y abre el modal de React; `PAUSA` congela el movimiento y `REANUDAR` continúa sin salto; `GUARDAR` inserta una fila en `scores` con `game_id = 'snake'`; el tab `snake` en `/salon-de-la-fama` arma podio/tabla desde esos scores; la entrada mock `serpentina` sigue con su bucle falso, sin cambios.
8. Limpieza final: `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores.

## Acceptance criteria

- [ ] `GAMES` en `lib/data.ts` incluye una entrada `snake` distinta de `serpentina` (ambas coexisten).
- [ ] `select * from games where id = 'snake'` devuelve 1 fila.
- [ ] `/juego/snake` muestra la ficha del juego con leaderboard real (`getTopScores`).
- [ ] `/juego/snake/jugar` monta el canvas real de 800×800, con las frutas dibujadas con sprites reales de `fruits.png`.
- [ ] El `player-hud` de React (Puntuación/Nivel) refleja los valores reales del motor; Vidas muestra 1 fijo.
- [ ] Las flechas mueven la serpiente; presionar la dirección opuesta a la actual se ignora (no permite reversa de 180°).
- [ ] Comer una fruta suma 1 segmento a la serpiente y 10 puntos; cada 5 frutas sube de nivel y la serpiente acelera (hasta el piso de 60ms).
- [ ] Chocar contra el borde de la grilla o contra el propio cuerpo dispara el overlay "GAME OVER" del canvas Y abre el modal de React para guardar la puntuación.
- [ ] Guardar el nombre en el modal inserta una fila en `scores` con `game_id = "snake"`.
- [ ] Pulsar `PAUSA` congela el movimiento de la serpiente; `REANUDAR` continúa sin salto brusco de posición.
- [ ] La entrada mock `serpentina` sigue mostrando su bucle de puntuación falso, sin cambios de comportamiento.
- [ ] `/salon-de-la-fama` con el tab `snake` seleccionado muestra podio/tabla con los scores reales guardados.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisions

- **Sí:** id nuevo `snake`, independiente de la entrada mock `serpentina` ya existente. Razón: decisión explícita del usuario — mismo patrón que `asteroides`/`rocas` en SPEC 05.
- **Sí:** reutilizar `cover-snake` y `color: green` para la portada. Razón: decisión explícita del usuario — ya existe una portada temáticamente afín (serpiente sobre grilla).
- **Sí:** muere al chocar contra el borde de la grilla (sin wrap toroidal). Razón: decisión explícita del usuario — snake clásico.
- **Implícito:** chocar contra el propio cuerpo también mata a la serpiente. Razón: regla base del género snake, no una bifurcación de diseño con alternativa razonable — no se preguntó aparte.
- **Sí:** 1 vida fija (`lives` siempre `1` en `GameEngineState`), morir termina la partida de inmediato, sin sistema de vidas extra. Razón: decisión explícita del usuario — snake clásico no tiene vidas.
- **Sí:** sin estado de victoria (`"win"` no se usa) — el juego es infinito hasta morir. Razón: decisión explícita del usuario.
- **Sí:** el nivel sube cada 5 frutas comidas, con velocidad creciente hasta un piso de 60ms. Razón: decisión explícita del usuario (derivar el nivel del progreso, mismo patrón que tetris); los valores concretos (5 frutas, paso de 12ms, piso de 60ms, intervalo inicial de 160ms) son un punto de partida de diseño razonable fijado en este spec.
- **Sí:** `dt` del motor en milisegundos con acumulador de tick de grilla, no segundos con clamp tipo asteroides. Razón: decisión explícita del usuario — movimiento discreto de grilla, no física continua.
- **Sí:** bloquear el giro de 180° sobre el propio cuerpo. Razón: decisión explícita del usuario — regla clásica de snake.
- **Sí:** HUD nativo del canvas (puntaje/nivel) en paralelo al `player-hud` de React — conviven. Razón: decisión explícita del usuario, mismo patrón que asteroides.
- **Sí:** overlay nativo "GAME OVER" del canvas en paralelo al modal de React. Razón: decisión explícita del usuario, mismo patrón que asteroides.
- **Sí:** grilla de 20×20 celdas de 40px, canvas 800×800. Razón: decisión explícita del usuario (canvas 800×800); la división en 20 columnas/filas de 40px es la que mejor acomoda el tamaño de los sprites de fruta (hasta 170px de ancho, escalados a la celda) sin quedar ni muy chica ni muy grande.
- **Sí:** fruta con sprite aleatorio entre las 22 del atlas, mismo puntaje para todas (10 puntos). Razón: decisión explícita del usuario — variedad visual sin complejidad de balance por rareza.
- **Sí:** `fruits.png` migrado a `public/games/snake/`, `sprites.js` convertido a `lib/games/snake/sprites.ts` (módulo TS con import ES, carga asíncrona con `loadFruitsImage`), no script global. Razón: decisión explícita del usuario, mismo patrón que `lib/games/arkanoid/sprites.ts`.
- **No:** refactor de los 4 checks hardcodeados `"asteroides"`. Razón: ya están generalizados a `id in GAME_ENGINES` (confirmado por inspección de `lib/games/data.ts`, `app/juego/[id]/page.tsx`, `app/juego/[id]/jugar/page.tsx` y `components/hall-of-fame.tsx`); este spec no necesita tocar esos archivos.
- **No:** sonido, controles táctiles, power-ups u obstáculos. Razón: fuera de alcance — no hay assets de audio provistos ni fue pedido.

## Risks

| Riesgo                                                                                                                                            | Mitigación                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dt` en un motor de tick, tras un frame muy lento (pestaña en background), podría acumular varios pasos de grilla pendientes de golpe.            | `update(dt)` procesa los pasos pendientes en un bucle acotado a unos pocos pasos por frame, evitando que la serpiente "salte" varias celdas de una vez.        |
| Los sprites de fruta tienen anchos distintos (110–170px); escalarlos a una celda fija de 40×40 puede deformarlos si no se preserva la proporción. | `drawFruit` centra y escala manteniendo el aspect ratio original dentro de la celda, con márgenes en vez de estirar.                                           |
| La carga asíncrona de `fruits.png` podría fallar o tardar, dejando el canvas en blanco.                                                           | Mismo patrón que arkanoid: el loop no arranca hasta que `loadFruitsImage` resuelve; el componente puede mostrar un estado de "cargando" simple mientras tanto. |

## What is **not** in this spec

- Cambios a la entrada mock `serpentina`.
- Sonido, controles táctiles, power-ups, obstáculos, estado de victoria.
- Portada CSS nueva (se reutiliza `cover-snake`).

Cada uno de estos, si se necesita, va en su propio spec.
