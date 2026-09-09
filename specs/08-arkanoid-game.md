# SPEC 08 — Juego Arkanoid con motor real (canvas) y leaderboard en Supabase

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 05, SPEC 06
> **Date:** 2026-09-09
> **Objective:** Portar el prototipo standalone de `references/started-games/04-arkanoid/` a un juego real y jugable dentro de Next.js, con id `arkanoid`, incluyendo victoria en 5 niveles, control por teclado y mouse, sonido, y leaderboard real en Supabase vía el patrón ya generalizado por SPEC 07.

## Scope

**In:**

- Nueva entrada `arkanoid` en `GAMES` (`lib/data.ts`), independiente de la entrada mock existente `bloque-buster` (que no se toca).
- Motor portado desde `references/started-games/04-arkanoid/game.js` + `levels.js` + `assets/spritesheet.js`: paleta, pelota, 10×6 bloques por nivel, colisiones AABB, animación de explosión al romper un bloque, 3 vidas, 5 niveles con velocidad creciente (`speed` multiplicador de `LEVELS`), victoria al completar el quinto nivel.
- Patrón de tres módulos aislados en `lib/games/arkanoid/`: `levels.ts` (datos de `LEVELS`), `sprites.ts` (carga y dibujo del spritesheet), `engine.ts` (factory `createArkanoidGame(ctx)`) y `ArkanoidCanvas.tsx` (`"use client"`, `forwardRef`, un solo canvas).
- Ampliación de `GameEngineState.status` en `lib/games/registry.ts` a `"playing" | "dead" | "gameover" | "win"`.
- Ampliación de `app/juego/[id]/jugar/page.tsx`: `handleEngineStateChange` abre el modal de fin de partida también cuando `status === "win"`, no solo `"gameover"`.
- Registro en `lib/games/registry.ts`: `arkanoid: ArkanoidCanvas`.
- Migración de Supabase con el insert de la fila `arkanoid` en `games`; lectura/escritura de scores reales vía `getTopScores`/`saveScore` (ya genéricas desde SPEC 07, sin cambios de firma).
- Nuevo bloque CSS `cover-arkanoid` en `app/globals.css`.
- Control de la paleta por teclado (`←`/`→` mantenidas) y por mouse (`mousemove` sobre el propio canvas), ambos activos simultáneamente, igual que el original.
- Sonido: los dos efectos (`ball-bounce.mp3`, `break-sound.mp3`) se portan tal cual, primer juego del sitio con audio.
- Ruido eliminado del prototipo: el overlay de pausa con selector de nivel interactivo (click hit-test sobre botones dibujados) y la tecla `P`/`Escape` de pausa nativa — la pausa pasa a ser un flag simple controlado solo por el botón PAUSA de React.

**Out of scope (para futuros specs):**

- Migrar los 5 juegos mock restantes (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) a motores reales.
- Tocar o eliminar la entrada mock `bloque-buster`.
- Controles táctiles/móviles para Arkanoid.
- Volumen configurable, mute, o cualquier UI de audio — los sonidos se reproducen siempre, igual que el original.
- Reintentar o continuar tras la victoria del nivel 5 — el juego se detiene ahí, sin reinicio automático.

## Data model

```ts
// lib/data.ts — nueva entrada en GAMES, no reemplaza "bloque-buster"
{
  id: "arkanoid",
  title: "ARKANOID",
  short: "Motor real: rebota la pelota y destruye muros de neón.",
  long: "Versión con motor de juego real del clásico rompebloques. Desliza la paleta con teclado o mouse para rebotar la pelota, pulveriza los 5 niveles de bloques cromáticos con velocidad creciente y complétalos todos para ganar.",
  cat: "ARCADE",
  cover: "cover-arkanoid", // nuevo bloque CSS, ver plan
  color: "magenta",
  best: 0,
  plays: "0",
}
```

```sql
-- Migración: fila de arkanoid en games (mismo shape que SPEC 06/07)
insert into games (id, title, short, long, cat, cover, color, best, plays)
values (
  'arkanoid',
  'ARKANOID',
  'Motor real: rebota la pelota y destruye muros de neón.',
  'Versión con motor de juego real del clásico rompebloques. Desliza la paleta con teclado o mouse para rebotar la pelota, pulveriza los 5 niveles de bloques cromáticos con velocidad creciente y complétalos todos para ganar.',
  'ARCADE',
  'cover-arkanoid',
  'magenta',
  0,
  '0'
);
```

```ts
// lib/games/registry.ts — ampliación del tipo compartido
export type GameEngineState = {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover" | "win"; // "win" nuevo, solo lo emite arkanoid
};
```

```ts
// lib/games/arkanoid/levels.ts
// export const LEVELS = [...] — 5 niveles, cada uno { speed: number, blocks: {col,row,color}[] }, portado 1:1 de levels.js.

// lib/games/arkanoid/sprites.ts
// export const SPRITES, EXPLOSION_FRAMES, EXPLOSION_DURATION, drawSprite(ctx,...), drawFrame(ctx,...), loadSpritesheet(cb)
// loadSpritesheet apunta a "/games/arkanoid/spritesheet-breakout.png".

// lib/games/arkanoid/engine.ts
// createArkanoidGame(ctx: CanvasRenderingContext2D)
// Estado en closure: paddle, ball, blocks, explosions, lives, score, currentLevel, isPaused, status, ready.
// getState(): GameEngineState — { score, lives, level: currentLevel, status }
// status: "playing" | "gameover" | "win" (nunca "dead": arkanoid no tiene invencibilidad temporal, pierde una vida y sigue en "playing").
```

Convenciones:

- El motor no depende de React ni del DOM más allá del `CanvasRenderingContext2D` que recibe; `ArkanoidCanvas.tsx` es el único puente con React.
- `update(dt)` recibe `dt` en **segundos** con clamp `Math.min(dt, 0.05)`, igual que `AsteroidsCanvas.tsx` (el original no tenía clamp).
- `onStateChange` se invoca solo cuando `score`/`lives`/`level`/`status` cambian respecto al frame anterior.
- El motor no arranca `update`/`draw` hasta que `ready === true` (spritesheet cargado); `ArkanoidCanvas.tsx` no llama `requestAnimationFrame` hasta entonces.
- `keyDown(code)`/`keyUp(code)` solo reconocen `"ArrowLeft"`/`"ArrowRight"`. `pointerMove(x)` recibe la coordenada X ya escalada al espacio del canvas (800×600), calculada en `ArkanoidCanvas.tsx` con `canvas.getBoundingClientRect()`.

## Implementation plan

1. Crear `lib/games/arkanoid/levels.ts` portando `LEVELS` de `levels.js` con `export const LEVELS = [...]`, mismos 5 niveles/velocidades/patrones de bloques. Verificación: `npx tsc --noEmit`.
2. Crear `lib/games/arkanoid/sprites.ts` portando `assets/spritesheet.js`: `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`, `drawSprite`, `drawFrame`, `loadSpritesheet(cb)`, con la ruta del PNG apuntando a `/games/arkanoid/spritesheet-breakout.png`. Verificación: `npx tsc --noEmit`.
3. Ampliar `GameEngineState.status` en `lib/games/registry.ts` a `"playing" | "dead" | "gameover" | "win"`. Verificación: `npx tsc --noEmit`; asteroides y tetris no emiten `'win'`, sin cambio de comportamiento.
4. Modificar `app/juego/[id]/jugar/page.tsx`: en `handleEngineStateChange`, cambiar `if (state.status === "gameover") setOver(true);` por `if (state.status === "gameover" || state.status === "win") setOver(true);`. Verificación: `npx tsc --noEmit`; asteroides/tetris (que nunca emiten `'win'`) siguen abriendo el modal solo en `'gameover'`, sin regresión.
5. Crear `lib/games/arkanoid/engine.ts` portando de `game.js` el estado (`paddle`, `ball`, `blocks`, `explosions`, `lives`, `score`, `currentLevel`, `isPaused`), `initPaddle`, `initBall`, `loadLevel`, `collideAABB`, `update`, `draw`, `drawOverlay` (mensajes "GAME OVER" / "¡Completaste el juego!"), en una factory `createArkanoidGame(ctx)` con todo el estado en closure (sin variables de módulo). Expone `{ isPaused, update(dt), draw(), getState(), reset(), setPaused(v), keyDown(code), keyUp(code), pointerMove(x), ready }`, sin el hit-test de click del selector de nivel (eliminado) y sin la tecla `P`/`Escape` de pausa nativa (eliminada). La factory dispara `loadSpritesheet` internamente y pone `ready = true` en el callback; `update`/`draw` no hacen nada mientras `ready` es `false`. `bounceSound`/`breakSound` apuntan a `/games/arkanoid/sounds/ball-bounce.mp3` y `/games/arkanoid/sounds/break-sound.mp3`, reproducidos con `.cloneNode().play()` igual que el original. Verificación: `npx tsc --noEmit`.
6. Crear `lib/games/arkanoid/ArkanoidCanvas.tsx` (`"use client"`, `forwardRef`) modelado sobre `AsteroidsCanvas.tsx`: mismos refs (`canvasRef`, `gameRef`, `lastStateRef`, `lastTimeRef`, `rafRef`, `onStateChangeRef`); el loop no llama `requestAnimationFrame` hasta que `game.ready === true` (poll con un intervalo corto o efecto que espera el callback de carga), mostrando mientras tanto un estado simple de "cargando" en vez del canvas; `dt = lastTimeRef.current === null ? 0 : Math.min((ts - lastTimeRef.current) / 1000, 0.05)`; listener de `keydown`/`keyup` en `window` solo para `ArrowLeft`/`ArrowRight` con `preventDefault()` (sin `KeyP`/`Escape`); listener de `mousemove` en el propio `<canvas>` (no en `window`) que escala la coordenada X por `canvas.getBoundingClientRect()`/`clientWidth` y llama `game.pointerMove(x)`; sin listener de `click`. `resume`/`reset` ponen `lastTimeRef.current = null` antes de continuar. Verificación: `npx tsc --noEmit`.
7. Registrar en `lib/games/registry.ts`: import de `ArkanoidCanvas` + entrada `arkanoid: ArkanoidCanvas` en `GAME_ENGINES`. Verificación: `npx tsc --noEmit`.
8. Agregar la entrada `arkanoid` a `GAMES` en `lib/data.ts` con los valores de la sección Data model. Verificación: `/juego/arkanoid/jugar` no dispara `notFound()`.
9. Migración de Supabase (`mcp__supabase__apply_migration`) con el `insert into games` de la fila `arkanoid` (sección Data model). Verificación: `mcp__supabase__execute_sql` con `select * from games where id = 'arkanoid'` devuelve 1 fila.
10. Agregar el bloque `cover-arkanoid` en `app/globals.css` (gradiente + bloques cayendo estilo rompebloques, tono magenta/cyan), distinto de `cover-bricks` (mock `bloque-buster`). Verificación visual: `/juego/arkanoid` muestra la portada nueva.
11. Mover assets a `public/games/arkanoid/`: `spritesheet-breakout.png`, `sounds/ball-bounce.mp3`, `sounds/break-sound.mp3`. Verificación: `/juego/arkanoid/jugar` no dispara 404 en la pestaña Network para esos tres archivos.
12. Verificación manual en navegador: el `player-hud` de React (Jugador/Puntuación/Vidas/Nivel) refleja los valores reales del motor; el HUD propio del canvas (Score/Nivel/bolas de vida) se sigue viendo en paralelo; `←`/`→` mueven la paleta con teclado y mover el mouse sobre el canvas también la mueve; romper un bloque reproduce el sonido y la animación de explosión de 4 frames; limpiar todos los bloques de un nivel avanza al siguiente con velocidad mayor; completar el nivel 5 dispara `status: "win"`, muestra el overlay "¡Completaste el juego!" del canvas Y abre el modal de React para guardar puntuación; perder las 3 vidas dispara `status: "gameover"` con el mismo overlay+modal; el botón `PAUSA` de React congela paleta/pelota/bloques (sin selector de nivel) y `REANUDAR` continúa sin salto de tiempo; `GUARDAR` inserta una fila en `scores` con `game_id = "arkanoid"`; el tab `ARKANOID` en `/salon-de-la-fama` arma podio/tabla desde esos scores.
13. Limpieza final: `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores.

## Acceptance criteria

- [ ] `GameEngineState.status` en `lib/games/registry.ts` incluye `"win"`.
- [ ] `app/juego/[id]/jugar/page.tsx` abre el modal de fin de partida tanto en `"gameover"` como en `"win"`.
- [ ] `GAME_ENGINES` en `lib/games/registry.ts` incluye `arkanoid: ArkanoidCanvas`.
- [ ] `GAMES` en `lib/data.ts` incluye una entrada `arkanoid` distinta de `bloque-buster` (ambas coexisten).
- [ ] `select count(*) from games` incluye la fila `arkanoid` con los valores del Data model.
- [ ] `/juego/arkanoid` muestra la ficha del juego con la portada `cover-arkanoid` y un leaderboard real (vacío hasta la primera partida guardada).
- [ ] `/juego/arkanoid/jugar` monta un canvas real de 800×600 dentro del `.crt-screen`, sin errores de carga de assets.
- [ ] El `player-hud` de React muestra `Puntuación`/`Vidas`/`Nivel` reales del motor.
- [ ] `←`/`→` mueven la paleta; mover el mouse sobre el canvas también la mueve.
- [ ] Romper un bloque suma 10 puntos, reproduce sonido y dispara la animación de explosión de 4 frames.
- [ ] Limpiar todos los bloques de un nivel carga el siguiente con velocidad mayor (`speed` de `LEVELS`).
- [ ] Completar el nivel 5 dispara `status: "win"`, muestra el overlay "¡Completaste el juego!" del canvas y abre el modal de React para guardar puntuación.
- [ ] Perder las 3 vidas dispara `status: "gameover"`, muestra el overlay "GAME OVER" del canvas y abre el mismo modal.
- [ ] Pulsar el botón `PAUSA` del contenedor React congela paleta, pelota y bloques; no aparece ningún selector de nivel; `REANUDAR` continúa sin salto de tiempo.
- [ ] Guardar el nombre en el modal inserta una fila en la tabla `scores` de Supabase con `game_id = "arkanoid"`.
- [ ] El tab `ARKANOID` en `/salon-de-la-fama` arma podio/tabla desde los scores reales guardados.
- [ ] El mock `bloque-buster` sigue funcionando exactamente igual que antes (bucle de puntuación falso, `seededScores`).
- [ ] Los juegos `asteroides` y `tetris` no cambian de comportamiento tras ampliar `GameEngineState.status` y la condición de `handleEngineStateChange`.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisions

- **Sí:** id nuevo `arkanoid`, independiente de la entrada mock `bloque-buster` ya existente. Razón: decisión explícita del usuario, mismo patrón que `asteroides`/`rocas` y `tetris`/`caida`.
- **Sí:** `color: "magenta"`, distinto del `cyan` de `bloque-buster`. Razón: decisión explícita del usuario, mismo criterio que tetris (cyan) frente a caida (magenta) — diferenciar visualmente mock de motor real.
- **Sí:** nuevo bloque CSS `cover-arkanoid`, en vez de reutilizar `cover-bricks`. Razón: decisión explícita del usuario, mismo criterio que tetris/caida.
- **Sí:** ampliar `GameEngineState.status` con `"win"`. Razón: decisión explícita del usuario — victoria es semánticamente distinta de perder, y el porting-guide identifica este caso como el que justifica ampliar el contrato compartido.
- **Sí:** al completar el nivel 5, el juego se detiene en `status: "win"` sin reinicio automático. Razón: decisión explícita del usuario, fiel al original (`gameState = 'win'`, sin loop de niveles).
- **Sí:** clamp `Math.min(dt, 0.05)` en el loop de `ArkanoidCanvas.tsx`, aunque el original no lo tenía. Razón: decisión explícita del usuario, mismo patrón que `AsteroidsCanvas.tsx`, evita saltos físicos tras un frame lento o pestaña en segundo plano.
- **Sí:** eliminar el overlay de pausa con selector de nivel interactivo (click hit-test). La pausa se reduce a un flag `setPaused(v)` controlado solo por el botón PAUSA de React. Razón: decisión explícita del usuario, mismo criterio que tetris — una sola fuente de verdad de pausa, evita que el motor y el botón de React se desincronicen.
- **Sí:** conservar el HUD propio del canvas (Score/Nivel/bolas de vida) tal cual, en paralelo al `player-hud` de React. Razón: decisión explícita del usuario, mismo patrón que asteroides — no se borra el HUD del juego.
- **Sí:** los overlays nativos "GAME OVER" y "¡Completaste el juego!" (dibujados en canvas) conviven con el modal de React de guardar puntuación. Razón: decisión explícita del usuario, mismo criterio que asteroides — a diferencia de tetris, este overlay es dibujo de canvas, no DOM, y no hay razón para suprimirlo.
- **Sí:** portar el control de la paleta por mouse (`mousemove` sobre el canvas) además de teclado. Razón: decisión explícita del usuario — comportamiento probado del original, mismo criterio que conservar el power-up no documentado de asteroides o la octava pieza de tetris.
- **Sí:** eliminar la tecla `P`/`Escape` de pausa nativa del motor. Razón: decisión explícita del usuario, mismo criterio que tetris — pausa solo por el botón de React.
- **Sí:** portar los dos sonidos (`ball-bounce.mp3`, `break-sound.mp3`) tal cual, primer juego del sitio con audio. Razón: decisión explícita del usuario — se aparta del precedente de asteroides/tetris (sin sonido) porque el usuario lo pidió expresamente para este juego.
- **Sí:** separar el motor en tres módulos (`engine.ts`, `levels.ts`, `sprites.ts`) con imports ES, reflejando la separación de archivos del original. Razón: decisión explícita del usuario — más mantenible que consolidar todo en un único archivo.
- **Sí:** el motor no arranca `update`/`draw` hasta que el spritesheet cargó (`ready`), con un estado de carga breve en `ArkanoidCanvas.tsx` y guard contra unmount durante la carga. Razón: decisión explícita del usuario — `loadSpritesheet` es asíncrono en el original, el loop no puede arrancar de forma síncrona en el montaje.
- **Sí:** `status` nunca vale `'dead'` para arkanoid, solo `'playing'`/`'gameover'`/`'win'`. Razón: el original no tiene invencibilidad temporal al perder una vida (a diferencia de asteroides) — pierde una vida y sigue jugando en el mismo frame.
- **No:** migrar los 5 juegos mock restantes en este spec. Razón: fuera de alcance — este spec solo aplica el patrón (ya generalizado por SPEC 07) a Arkanoid.
- **No:** controles táctiles, volumen configurable, o mute. Razón: no forman parte del prototipo original ni fueron pedidos.
- **No:** reiniciar o continuar tras la victoria del nivel 5 dentro del propio motor. Razón: decisión explícita del usuario, fiel al original.

## Risks

| Riesgo                                                                                                                                                                                   | Mitigación                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ampliar `GameEngineState.status` con `"win"` es un cambio de tipo compartido; una condición olvidada en algún consumidor dejaría la victoria sin abrir el modal de guardar puntuación.   | El paso 4 identifica el único punto de consumo (`handleEngineStateChange` en `app/juego/[id]/jugar/page.tsx`, confirmado por grep en la fase de análisis) y lo actualiza explícitamente.          |
| Los navegadores pueden bloquear la reproducción de audio si `Audio.play()` se llama sin una interacción de usuario reciente en la pestaña.                                               | El usuario ya interactuó (botón "JUGAR" o navegación) antes de que el motor reproduzca el primer sonido; si algún navegador lo bloquea igual, el `.play()` falla en silencio sin romper el juego. |
| `loadSpritesheet` es asíncrono; si `ArkanoidCanvas.tsx` se desmonta antes de que termine de cargar, el callback podría intentar actualizar un componente ya desmontado.                  | El paso 6 especifica un guard contra unmount durante la carga (mismo criterio que cualquier efecto asíncrono en React: verificar que el componente sigue montado antes de arrancar el loop).      |
| El original mueve la paleta con mouse en todo el documento indirectamente vía el canvas, pero el `<canvas>` de React se estira a `width:100%` mientras su `width` interno es 800px fijo. | El paso 6 escala la coordenada X con `canvas.getBoundingClientRect()`/`clientWidth`, no con `1:1`, mismo criterio documentado para tetris/asteroides.                                             |

## What is **not** in this spec

- Motores reales para los 5 juegos mock restantes de la biblioteca.
- Cambios a la entrada mock `bloque-buster`.
- Controles táctiles/móviles, volumen configurable o mute.
- Reinicio automático o continuación tras completar el nivel 5.

Cada uno de estos, si se necesita, va en su propio spec.
