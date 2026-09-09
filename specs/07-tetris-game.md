# SPEC 07 — Juego Tetris con motor real (canvas) y leaderboard en Supabase

> **Status:** Implemented
> **Depends on:** SPEC 01, SPEC 05, SPEC 06
> **Date:** 2026-09-09
> **Objective:** Portar el prototipo standalone de `references/started-games/03-tetris/` a un juego real y jugable dentro de Next.js, con id `tetris`, generalizando el patrón motor+leaderboard de SPEC 05/06 (hoy limitado a `asteroides`) para que cualquier id registrado en `GAME_ENGINES` use scores reales de Supabase.

## Scope

**In:**

- Generalización de los 4 checks hardcodeados a `"asteroides"` (`lib/games/data.ts`, `app/juego/[id]/page.tsx`, `app/juego/[id]/jugar/page.tsx`, `components/hall-of-fame.tsx`) a `id in GAME_ENGINES` / `if (Engine)`. Confirmado por grep en la fase de análisis que hoy no están generalizados.
- Nueva entrada `tetris` en `GAMES` (`lib/data.ts`), independiente de la entrada mock existente `caida` (que no se toca).
- Motor portado desde `references/started-games/03-tetris/game.js`: tablero 10×20, 8 piezas (las 7 estándar más una octava pieza `N` con forma de tuerca ya presente en el código), rotación con wall kicks `[0,±1,±2]`, soft drop y hard drop, pieza fantasma (ghost), vista previa de la siguiente pieza, limpieza de líneas, puntuación (`LINE_SCORES` × nivel) y nivel derivado de líneas completadas.
- Patrón de dos archivos aislado en `lib/games/tetris/`: `engine.ts` (factory `createTetrisGame(ctx, nextCtx)`) y `TetrisCanvas.tsx` (`"use client"`, `forwardRef`, dos `<canvas>`).
- Registro en `lib/games/registry.ts`: `tetris: TetrisCanvas`.
- Migración de Supabase con el insert de la fila `tetris` en `games`; lectura/escritura de scores reales vía `getTopScores`/`saveScore` (`lib/games/scores.ts`), ya genéricas, sin cambios de firma.
- Nuevo bloque CSS `cover-tetris` en `app/globals.css`.
- Ruido eliminado del prototipo: theme toggle (`localStorage['tetris-theme']`), lectura de la variable CSS `--grid-line` (no existe en `app/globals.css`, reemplazada por `var(--ink-dim)`), tecla `KeyP` de pausa (la pausa la controla solo el botón de React), overlay nativo DOM de PAUSA/GAME OVER (suprimido; se usan el overlay de pausa y el modal de fin de partida que ya existen en `app/juego/[id]/jugar/page.tsx`).

**Out of scope (para futuros specs):**

- Migrar los otros 6 juegos mock restantes (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) a motores reales.
- Tocar o eliminar la entrada mock `caida`.
- Controles táctiles/móviles para Tetris.
- Sonido/efectos de audio (el original no los tiene).
- Ampliar `GameEngineState` con un campo de líneas completadas visible en el HUD de React — se decidió omitirlo del HUD compartido.
- Ampliar el tipo de `lives` a `number | null` en el contrato compartido — se decidió fijarlo en `0` para juegos sin vidas.
- Ampliar `GameEngineState.status` con un valor `'dead'` real para Tetris — nunca se dispara, el mapeo es directo `paused`/`gameOver` → `'playing'`/`'gameover'`.

## Data model

```ts
// lib/data.ts — nueva entrada en GAMES, no reemplaza "caida"
{
  id: "tetris",
  title: "TETRIS",
  short: "Motor real: encaja piezas y limpia líneas sin parar.",
  long: "Versión con motor de juego real del clásico Tetris. Rota y desliza las piezas clásicas (más una pieza especial) para completar líneas, con pieza fantasma y vista previa de la siguiente pieza, mientras la velocidad crece con cada nivel.",
  cat: "PUZZLE",
  cover: "cover-tetris", // nuevo bloque CSS, ver plan
  color: "cyan",
  best: 0,
  plays: "0",
}
```

```sql
-- Migración: fila de tetris en games (mismo shape que SPEC 06)
insert into games (id, title, short, long, cat, cover, color, best, plays)
values (
  'tetris',
  'TETRIS',
  'Motor real: encaja piezas y limpia líneas sin parar.',
  'Versión con motor de juego real del clásico Tetris. Rota y desliza las piezas clásicas (más una pieza especial) para completar líneas, con pieza fantasma y vista previa de la siguiente pieza, mientras la velocidad crece con cada nivel.',
  'PUZZLE',
  'cover-tetris',
  'cyan',
  0,
  '0'
);
```

```ts
// lib/games/tetris/engine.ts
// createTetrisGame(ctx: CanvasRenderingContext2D, nextCtx: CanvasRenderingContext2D)
// Estado en closure: board (10x20), current, next, score, lines, level, isPaused, gameOver, dropAccum, dropInterval.
// getState(): GameEngineState — reutiliza el tipo existente de lib/games/registry.ts sin ampliarlo:
//   { score, lives: 0, level, status: gameOver ? "gameover" : "playing" }
// "lines" se usa internamente para calcular level/score/dropInterval pero no se expone en GameEngineState.
```

Convenciones:

- El motor no depende de React ni del DOM más allá de los dos `CanvasRenderingContext2D` que recibe; `TetrisCanvas.tsx` es el único puente con React.
- `update(dt)` recibe `dt` en **milisegundos crudos** (no segundos), a diferencia de `AsteroidsCanvas.tsx`. El acumulador `dropAccum`/`dropInterval` del original se conserva tal cual.
- `onStateChange` se invoca solo cuando `score`/`level`/`status` cambian respecto al frame anterior (`lives` siempre `0`, nunca cambia).
- No hay `keyUp`: el input de Tetris es solo `keydown` discreto (sin teclas mantenidas).

## Implementation plan

1. Generalizar los 4 checks hardcodeados a `"asteroides"`:
   - `lib/games/data.ts`: renombrar `withAsteroidesStats` a `withRealStats(row, supabase)`; reemplazar `if (row.id !== "asteroides") return row;` por `if (!(row.id in GAME_ENGINES)) return row;` (import `GAME_ENGINES` desde `@/lib/games/registry`) y usar `row.id` en vez del literal `"asteroides"` en la query a `scores`.
   - `app/juego/[id]/page.tsx`: `id === "asteroides" ? await getTopScores("asteroides", 10) : seededScores(...)` → `id in GAME_ENGINES ? await getTopScores(id, 10) : seededScores(...)`.
   - `app/juego/[id]/jugar/page.tsx`: `if (game.id === "asteroides") { await saveScoreToSupabase("asteroides", name, score); }` → `if (Engine) { await saveScoreToSupabase(game.id, name, score); }` (`Engine` ya está calculado en el componente).
   - `components/hall-of-fame.tsx`: reemplazar el estado único `asteroidesRows` por `realRows: Record<string, ScoreRow[]>`; el efecto pasa de `if (tab !== "asteroides") return;` a `if (!(tab in GAME_ENGINES)) return;` y guarda en `realRows[tab]`; `rows` pasa de `tab === "asteroides" ? asteroidesRows : mockRows` a `tab in GAME_ENGINES ? (realRows[tab] ?? []) : mockRows`.
     Verificación: `npx tsc --noEmit`; `/juego/asteroides` y el tab `asteroides` en `/salon-de-la-fama` siguen mostrando su leaderboard real, sin cambios de comportamiento.
2. Crear `lib/games/tetris/engine.ts` portando de `game.js` el tablero, las 8 piezas, `collide`, `rotateCW`/`tryRotate`, `merge`, `clearLines`, `ghostY`, `hardDrop`/`softDrop`, scoring y nivel, envueltos en `createTetrisGame(ctx, nextCtx)` con todo el estado en closure (sin variables de módulo). Expone `{ isPaused, update(dtMs), draw(), getState(), reset(), setPaused(v), keyDown(code) }` — sin `keyUp`. El color de las líneas de grilla usa `var(--ink-dim)` con alpha baja en vez de `getComputedStyle(...).getPropertyValue('--grid-line')`. Verificación: `npx tsc --noEmit`.
3. Crear `lib/games/tetris/TetrisCanvas.tsx` (`"use client"`, `forwardRef`) modelado sobre `AsteroidsCanvas.tsx`: refs `canvasRef`, `nextCanvasRef`, `gameRef`, `lastStateRef`, `lastTimeRef`, `rafRef`, `onStateChangeRef`; el loop calcula `dt = lastTimeRef.current === null ? 0 : Math.min(ts - lastTimeRef.current, 1000)` (milisegundos crudos, sin dividir por 1000); listener único de `keydown` (sin `keyup`) para `ArrowLeft`/`ArrowRight`/`ArrowDown`/`ArrowUp`/`KeyX`/`Space` con `preventDefault()`, sin `KeyP`. `resume`/`reset` ponen `lastTimeRef.current = null` antes de continuar. Renderiza dos `<canvas>` (300×600 y 120×120) dentro de `.crt-screen`. Verificación: `npx tsc --noEmit`.
4. Registrar en `lib/games/registry.ts`: import de `TetrisCanvas` + entrada `tetris: TetrisCanvas` en `GAME_ENGINES`. Verificación: `npx tsc --noEmit`.
5. Agregar la entrada `tetris` a `GAMES` en `lib/data.ts` con los valores de la sección Data model. Verificación: `/juego/tetris/jugar` no dispara `notFound()`.
6. Migración de Supabase (`mcp__supabase__apply_migration`) con el `insert into games` de la fila `tetris` (sección Data model). Verificación: `mcp__supabase__execute_sql` con `select * from games where id = 'tetris'` devuelve 1 fila.
7. Agregar el bloque `cover-tetris` en `app/globals.css` (gradiente + formas geométricas cayendo, tono cyan/púrpura, mismo patrón que los `cover-*` existentes) — distinto de `cover-tetro` (usado por el mock `caida`). Verificación visual: `/juego/tetris` muestra la portada nueva.
8. Verificación manual en navegador: el `player-hud` de React (Jugador/Puntuación/Vidas `—`/Nivel) refleja los valores reales del motor; `←`/`→` mueven, `↑` o `X` rotan, `↓` hace soft drop, `Espacio` hace hard drop; la pieza fantasma se ve semitransparente en su posición de aterrizaje; la vista previa se actualiza al fijar cada pieza; completar una línea la limpia y sube score/nivel; el botón `PAUSA` congela el motor (el acumulador de caída no avanza) y `REANUDAR` continúa sin salto de tiempo; llenar el tablero abre el modal de fin de partida existente; `GUARDAR` inserta una fila en `scores` con `game_id = 'tetris'`; el tab `TETRIS` en `/salon-de-la-fama` arma podio/tabla desde esos scores.
9. Limpieza final: `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores.

## Acceptance criteria

- [x] `GAME_ENGINES` en `lib/games/registry.ts` incluye `tetris: TetrisCanvas`.
- [x] `lib/games/data.ts`, `app/juego/[id]/page.tsx`, `app/juego/[id]/jugar/page.tsx` y `components/hall-of-fame.tsx` ya no contienen el literal `"asteroides"` como condición — usan `id in GAME_ENGINES` / `if (Engine)`.
- [x] `/juego/asteroides` y el tab `asteroides` de `/salon-de-la-fama` siguen mostrando exactamente el mismo comportamiento que antes de generalizar (sin regresión).
- [x] `GAMES` en `lib/data.ts` incluye una entrada `tetris` distinta de `caida` (ambas coexisten).
- [x] `select count(*) from games` incluye la fila `tetris` con los valores del Data model.
- [x] `/juego/tetris` muestra la ficha del juego con la portada `cover-tetris` y un leaderboard real (vacío hasta la primera partida guardada).
- [x] `/juego/tetris/jugar` monta dos canvas reales (tablero 300×600 y siguiente pieza 120×120) dentro del `.crt-screen`.
- [x] El `player-hud` de React muestra `Vidas: —` (constante) y `Puntuación`/`Nivel` reales del motor.
- [x] `←`/`→` mueven la pieza, `↑`/`X` rotan con wall kick, `↓` hace soft drop, `Espacio` hace hard drop.
- [x] La pieza fantasma se dibuja semitransparente en la posición donde aterrizaría la pieza actual.
- [x] Completar una línea la elimina, suma puntos según `LINE_SCORES × nivel` y sube el nivel cada 10 líneas.
- [x] Pulsar el botón `PAUSA` del contenedor React congela el descenso de la pieza; `REANUDAR` continúa sin salto de tiempo (la pieza no cae varias filas de golpe).
- [x] Llenar el tablero (una pieza nueva no puede aparecer) dispara `status: "gameover"` y abre el modal de React para guardar la puntuación.
- [x] Guardar el nombre en el modal inserta una fila en la tabla `scores` de Supabase con `game_id = "tetris"`.
- [x] El tab `TETRIS` en `/salon-de-la-fama` arma podio/tabla desde los scores reales guardados.
- [x] El mock `caida` sigue funcionando exactamente igual que antes (bucle de puntuación falso, `seededScores`).
- [x] `npm run lint` y `npm run build` terminan sin errores.

## Decisions

- **Sí:** id nuevo `tetris`, independiente de la entrada mock `caida` ya existente. Razón: decisión explícita del usuario, mismo patrón que `asteroides`/`rocas` en SPEC 05.
- **Sí:** generalizar los 4 checks hardcodeados a `"asteroides"` como parte de este spec. Razón: decisión explícita del usuario — quiere leaderboard real en Supabase para Tetris desde el día uno, y el porting-guide identifica esta generalización como el paso que lo habilita para cualquier motor futuro sin volver a tocar esos 4 archivos.
- **Sí:** `lives` fijo en `0` para Tetris, sin ampliar el tipo del contrato compartido. Razón: decisión explícita del usuario — evita un cambio de tipo que afectaría a todos los motores (incluido `asteroides`) por un caso que no lo necesita.
- **Sí:** `status` nunca vale `'dead'` para Tetris, solo `'playing'`/`'gameover'`. Razón: decisión explícita del usuario — Tetris no tiene el concepto de "perder una vida con respawn" que sí tiene Asteroides.
- **Sí:** `update(dt)` recibe milisegundos crudos con clamp propio (`Math.min(dt, 1000)`) en vez de convertir a segundos como Asteroids. Razón: decisión explícita del usuario — conserva el acumulador `dropAccum`/`dropInterval` del original sin reescribir su lógica.
- **Sí:** la factory recibe un segundo `ctx` (`createTetrisGame(ctx, nextCtx)`) y dibuja la vista previa ahí, en vez de subir la forma de la siguiente pieza a estado de React. Razón: decisión explícita del usuario — más fiel al original, mismo patrón de "el juego vive en el canvas" que Asteroides.
- **Sí:** omitir un stat de líneas completadas en el `player-hud` de React; el conteo de líneas se sigue usando internamente para nivel/velocidad/score. Razón: decisión explícita del usuario — no ampliar el contrato compartido `GameEngineState` por un solo motor.
- **Sí:** suprimir el overlay nativo DOM de PAUSA/GAME OVER del prototipo; solo quedan el overlay de pausa y el modal de fin de partida que ya existen en `app/juego/[id]/jugar/page.tsx`. Razón: decisión explícita del usuario — el overlay original es DOM puro (no dibujo de canvas), no tiene sentido re-implementarlo cuando React ya cubre el mismo mensaje.
- **Sí:** eliminar la tecla `KeyP` de pausa nativa; la pausa la controla solo el botón de React. Razón: decisión explícita del usuario — evita que el motor y el botón de React se desincronicen sobre quién es la fuente de verdad del estado de pausa.
- **Sí:** conservar las 8 piezas del código (7 estándar + la pieza `N` no documentada en el README). Razón: decisión explícita del usuario — mismo criterio que SPEC 05 con el power-up de disparo triple no documentado: es comportamiento actual y probado del prototipo.
- **Sí:** reemplazar `getComputedStyle(...).getPropertyValue('--grid-line')` por `var(--ink-dim)` con alpha baja. Razón: decisión explícita del usuario — esa variable CSS no existe en `app/globals.css`; se reutiliza una ya definida en vez de introducir una nueva.
- **Sí:** nuevo bloque CSS `cover-tetris`, distinto del `cover-tetro` que usa el mock `caida`. Razón: decisión explícita del usuario — mantiene visualmente separadas la entrada mock y la entrada con motor real, a diferencia de `asteroides`/`rocas` que sí comparten portada.
- **No:** eliminar theme toggle y su persistencia en `localStorage['tetris-theme']`. Razón: no tiene equivalente en el shell de Next (que no tiene modo claro/oscuro alternable) y no fue pedido.
- **No:** migrar los otros 6 juegos mock restantes en este spec. Razón: fuera de alcance — este spec solo aplica el patrón (ya generalizado) a Tetris.
- **No:** controles táctiles ni sonido. Razón: no forman parte del prototipo original ni fueron pedidos.

## Risks

| Riesgo                                                                                                                                                                                                                                         | Mitigación                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generalizar los 4 checks hardcodeados a `"asteroides"` puede introducir una regresión en el comportamiento ya funcionando de Asteroides (SPEC 05/06).                                                                                          | El paso 1 del plan verifica explícitamente, antes de tocar nada de Tetris, que `/juego/asteroides` y su tab en `/salon-de-la-fama` no cambian de comportamiento tras la generalización.                                   |
| `dt` en milisegundos sin clamp adecuado podría producir una caída de varias filas de golpe tras una pestaña en segundo plano o un frame muy lento.                                                                                             | El paso 3 especifica un clamp propio (`Math.min(dt, 1000)`) antes de sumarlo a `dropAccum`.                                                                                                                               |
| El estado `realRows` de `hall-of-fame.tsx` pasa de un único valor (`asteroidesRows`) a un registro por id (`Record<string, ScoreRow[]>`); un error en la clave usada al guardar o leer dejaría el tab de un juego mostrando las filas de otro. | El paso 1 verifica manualmente ambos tabs (`asteroides` y, tras el paso 8, `tetris`) por separado antes de dar el spec por cerrado.                                                                                       |
| El `<canvas id="board">` del original mide 300×600 fijos; si `TetrisCanvas.tsx` lo estira con `width:100%` como hace `AsteroidsCanvas.tsx`, el aspect ratio 1:2 podría deformarse en pantallas anchas.                                         | El paso 3 mantiene los mismos atributos `width`/`height` internos (300×600); si el `.crt-screen` requiere ajuste de proporción, se resuelve con `aspect-ratio`/`object-fit` en el CSS del contenedor, sin tocar el motor. |

## What is **not** in this spec

- Motores reales para los otros 6 juegos mock restantes de la biblioteca.
- Cambios a la entrada mock `caida`.
- Controles táctiles/móviles, audio, o un stat de líneas visible en el HUD compartido.
- Ampliar el tipo de `lives` o de `status` en `GameEngineState`.

Cada uno de estos, si se necesita, va en su propio spec.
