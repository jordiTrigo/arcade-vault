# Guía de porting — referencia técnica de `/spec-game`

Este archivo es consulta para la Fase 1 del skill. No es texto para copiar en el spec: es el conocimiento
que permite hacer las preguntas correctas en la Fase 2.

---

## El contrato del motor

`lib/games/registry.ts`:

```ts
export type GameEngineHandle = {
  pause: () => void;
  resume: () => void;
  reset: () => void;
};

export type GameEngineState = {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
};

export type GameEngineProps = {
  onStateChange: (state: GameEngineState) => void;
};

export const GAME_ENGINES: Partial<Record<string, GameEngineComponent>> = {
  asteroides: AsteroidsCanvas,
  // <id>: <X>Canvas,
};
```

`status` solo tiene tres valores. Un prototipo con estado de victoria (arkanoid) necesita ampliarlo a
`"playing" | "dead" | "gameover" | "win"` — eso es una decisión de spec, no una libertad de implementación.
Lo mismo si un juego no tiene vidas (tetris): usar `lives: 0` fijo, o ampliar el contrato a `lives: number | null`,
son dos caminos distintos y hay que elegir uno explícitamente.

## El patrón de dos archivos (modelo: `lib/games/asteroides/`)

**`engine.ts`** — sin React, sin DOM más allá de `CanvasRenderingContext2D`. Factory que encierra todo el
estado en closure (nunca variables de módulo, para soportar remount/StrictMode):

```ts
export function createAsteroidsGame(ctx: CanvasRenderingContext2D) {
  // estado en closure: ship, bullets, asteroids, score, lives, level, status...
  return {
    isPaused: false,
    update(dt: number) {},
    draw() {},
    getState(): AsteroidsState {},
    reset() {},
    setPaused(v: boolean) {},
    keyDown(code: string) {},
    keyUp(code: string) {},
  };
}
```

**`<X>Canvas.tsx`** — el único puente con React. Esqueleto anotado (`AsteroidsCanvas.tsx`, 113 líneas):

- Refs: `canvasRef`, `gameRef`, `lastStateRef`, `lastTimeRef`, `rafRef`, `onStateChangeRef`.
- `onStateChangeRef` se mantiene fresco con un `useEffect([onStateChange])` — sin esto el loop de rAF
  captura una closure vieja del callback.
- `useImperativeHandle(ref, () => ({ pause, resume, reset }), [])`: `resume` y `reset` ponen
  `lastTimeRef.current = null` **antes** de reanudar, para que el próximo frame calcule `dt = 0` en vez de
  un salto grande de tiempo transcurrido durante la pausa.
- Único `useEffect([])` de montaje: obtiene el `ctx`, crea el juego, registra `keydown`/`keyup` en `window`
  con `preventDefault()` solo para las teclas del juego (`KEYS`), y corre el loop:
  ```ts
  const dt = lastTimeRef.current === null ? 0 : Math.min((ts - lastTimeRef.current) / 1000, 0.05);
  game.update(dt); game.draw();
  const state = game.getState();
  if (/* score/lives/level/status distinto del anterior */) onStateChangeRef.current(state);
  ```
  Este clamp de `dt` a 50ms y su cálculo en **segundos** asume física continua — no vale tal cual para un
  motor que mide en milisegundos con acumulador (ver eje 1 abajo).
- Cleanup: `cancelAnimationFrame`, remueve listeners, limpia `gameRef`.
- Render: `<canvas width={W} height={H} style={{position:"absolute", inset:0, width:"100%", height:"100%"}} />`.

## Los 4 checks hardcodeados que hoy limitan el leaderboard real a "asteroides"

| Archivo                         | Línea aprox. | Hoy                                                                                      |
| ------------------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| `lib/games/data.ts`             | 5            | `if (row.id !== "asteroides") return row;`                                               |
| `app/juego/[id]/page.tsx`       | 13           | `id === "asteroides" ? await getTopScores("asteroides", 10) : seededScores(...)`         |
| `app/juego/[id]/jugar/page.tsx` | 63           | `if (game.id === "asteroides") { await saveScoreToSupabase(...) }`                       |
| `components/hall-of-fame.tsx`   | 18, 29       | `if (tab !== "asteroides") return;` / `tab === "asteroides" ? asteroidesRows : mockRows` |

Generalizarlos a `id in GAME_ENGINES` / `if (Engine)` hace que registrar un motor nuevo baste para activar
scores reales, `best`/`plays` calculados y podio real — sin tocar estos 4 archivos otra vez en cada juego
futuro. Verificar con Grep si ya están generalizados antes de incluir este paso en el spec: si otro spec ya
lo hizo, se omite.

---

## Los 11 ejes de variación

Cada eje trae la pregunta concreta que debe ir en la Fase 2 cuando el prototipo lo dispara.

1. **Unidades de `dt`.** Asteroids/arkanoid: segundos, física continua. Tetris: **milisegundos**,
   acumulador que dispara un paso de rejilla (`dropAccum += dt; if (dropAccum >= dropInterval) step()`).
   → Preguntar: ¿el loop de React normaliza `dt` en segundos (clamp a 50ms) o el motor necesita milisegundos
   crudos para su acumulador?
2. **Número de canvas.** Tetris usa dos: `#board` (300×600) y `#next-canvas` (120×120) para la pieza
   siguiente. → Preguntar: ¿la factory recibe un segundo `ctx` (`createGame(ctx, nextCtx)`) o la preview
   sube a estado de React y se dibuja aparte?
3. **Propiedad del HUD.** Asteroids/arkanoid dibujan HUD dentro del canvas (`drawHUD`). Tetris escribe en
   8 nodos DOM (`#score`, `#lines`, `#level`, `#overlay`...) que no existen en el shell de Next.
   → Preguntar: ¿el HUD nativo se elimina y todo pasa por `getState()` hacia el `player-hud` de React
   (ya existe), se conserva en canvas además, o ambos?
4. **Modelo de pausa.** Asteroids no tenía pausa (la inventó el port). Tetris **cancela y reinicia el
   rAF completo** en `togglePause` — incompatible con que React sea dueño del loop. Arkanoid ya tiene un
   flag `isPaused` (el más cercano al contrato) pero su overlay de pausa dibuja un **selector de nivel
   con hit-test de click** que competiría con el botón PAUSA de React.
   → Preguntar: ¿se reduce siempre a un flag `setPaused(v)` leído al inicio de `update`? ¿Qué pasa con el
   selector de nivel de arkanoid — se porta, se elimina, o se reemplaza por otra UI?
5. **Forma del enum de estado.** `'playing'|'dead'|'gameover'` (asteroids) vs. dos booleanos
   `paused`/`gameOver` (tetris) vs. `'playing'|'gameover'|'win'` + `isPaused` aparte (arkanoid).
   → Preguntar: ¿el juego necesita `'win'` en `GameEngineState.status`? Si sí, ampliar el tipo en
   `registry.ts` es un paso explícito del plan, no un detalle de implementación.
6. **Vidas y niveles.** Tetris no tiene vidas (su noción de "perder" es el tablero lleno) y su nivel
   deriva de líneas completadas. Arkanoid tiene 5 niveles finitos con velocidad creciente y un estado
   de victoria al terminar el quinto.
   → Preguntar: si no hay vidas, ¿`lives` se fija en un valor constante (ej. 0 o 1) o el contrato se
   amplía a opcional? Si los niveles son finitos, ¿qué pasa al completarlos — vuelve a nivel 1,
   entra en `'win'`, o se detiene?
7. **Globals multi-archivo.** Arkanoid reparte estado entre `game.js`, `levels.js`
   (`LEVELS`) y `assets/spritesheet.js` (`drawSprite`, `loadSpritesheet`), acoplados por variables
   globales implícitas y el orden de los `<script>` en `index.html`.
   → Preguntar: ¿se consolida todo en un solo `engine.ts`, o se separan en módulos con imports ES
   explícitos (`import { LEVELS } from "./levels"`)?
8. **Assets.** Solo arkanoid trae binarios: un spritesheet PNG y dos MP3. Su `loadSpritesheet(callback)`
   es asíncrono, así que el loop no puede arrancar de forma síncrona en el montaje.
   → Preguntar: ¿los assets van a `public/games/<id>/`? ¿Cómo se gatea el arranque del loop mientras
   cargan (estado de "cargando" en el componente, guard contra unmount durante la carga)? ¿El sonido
   se porta o se deja fuera de scope (el resto del sitio no tiene audio)?
9. **Superficie de input.** Asteroids: teclas mantenidas + flanco (`keysHeld`/`justPressed`). Tetris:
   solo `keydown` discreto, sin estado de tecla mantenida. Arkanoid: teclas mantenidas **más**
   `mousemove` sobre el canvas con `getBoundingClientRect()` para escalar coordenadas, **más** un
   `click` que hace hit-test contra botones dibujados en el overlay de pausa. El canvas en React se
   estira a `width:100%`, así que cualquier cálculo de coordenadas de mouse debe usar el tamaño real
   renderizado, no `W`/`H` fijos.
   → Preguntar: ¿el juego necesita input de puntero? Si sí, ¿se añaden listeners de `mousemove`/`click`
   en el propio `<canvas>` (no en `window`, a diferencia del teclado)?
10. **Ruido a eliminar.** Tetris trae un theme toggle con `localStorage.getItem('tetris-theme')` y un
    `drawGrid()` que lee `getComputedStyle(document.body).getPropertyValue('--grid-line')` — esa
    variable CSS no existe en `app/globals.css` y devolvería vacío.
    → Preguntar: confirmar qué se elimina del prototipo antes de portar (theme toggle, lecturas de
    variables CSS ajenas, cualquier UI que no tenga equivalente en el shell de Next).
11. **Overlay nativo vs. modal de React.** Los tres prototipos dibujan su propio "GAME OVER" (canvas o
    DOM). El shell de `app/juego/[id]/jugar/page.tsx` ya tiene un modal de fin de partida y un overlay
    de pausa (`EN PAUSA` / `PULSA REANUDAR`) — SPEC 05 decidió que para asteroids **ambos conviven**.
    → Preguntar: ¿este juego también conserva su overlay nativo en paralelo al modal de React, o se
    suprime para evitar duplicar el mensaje?

---

## Fichas de los tres prototipos de `references/started-games/`

### `02-asteroids` — ya portado, es el modelo de referencia

Un archivo (`game.js`, 510 líneas), un canvas 800×600, `dt` en segundos, HUD dibujado en canvas,
sin pausa nativa (la añadió el port), teclas mantenidas + flanco, sin assets. Ejes que dispara: ninguno
adicional — es el caso base que ya resuelve `lib/games/asteroides/`.

### `03-tetris` — dispara los ejes 1, 2, 3, 4 (parcial), 5, 6, 10

Un archivo (`game.js`, 332 líneas) sin clases, solo funciones sobre un array 2D. **Dos canvas**
(`#board` 300×600, `#next-canvas` 120×120) más **8 nodos DOM** para HUD y overlay. `dt` en
**milisegundos** con acumulador (`dropAccum`/`dropInterval`), no física continua. Pausa que **cancela y
reinicia el rAF** en vez de un flag leído por `update`. Estado como dos booleanos `paused`/`gameOver`,
sin enum. **Sin vidas**; nivel derivado de líneas completadas (`floor(lines/10)+1`), gobierna
`dropInterval`. Trae theme toggle con `localStorage` y lectura de variable CSS `--grid-line` a eliminar.
Input: solo `keydown` discreto (`ArrowLeft/Right/Down`, `ArrowUp`/`KeyX` rotar, `Space` hard drop,
`KeyP` pausa). Nota: el README documenta 7 piezas pero el código tiene una octava no estándar (`N`,
forma de tuerca) — confirmar con el usuario si se conserva.

### `04-arkanoid` — dispara los ejes 5, 6, 7, 8, 9, 11

**Tres archivos** con globals implícitos y orden de carga en `index.html`: `game.js` (268 líneas),
`levels.js` (`LEVELS`, 5 niveles con patrón y multiplicador de velocidad), `assets/spritesheet.js`
(`drawSprite`, `loadSpritesheet` asíncrono con cola de callbacks). Canvas 800×600 vía
`canvas.width`/`canvas.height` (no constantes `W`/`H`). `dt` en segundos, **sin clamp** (a diferencia de
asteroids). Boot asíncrono: `loadSpritesheet(() => { initPaddle(); loadLevel(1); requestAnimationFrame(loop); })`.
Estado `gameState: 'playing'|'gameover'|'win'` **más** `isPaused` aparte — el contrato actual no tiene
`'win'`. 3 vidas, 5 niveles finitos con velocidad creciente, victoria al completar el quinto. Overlay de
pausa **interactivo**: dibuja botones de selección de nivel y hace hit-test de `click` contra ellos.
Input: teclas mantenidas + `mousemove` sobre el canvas (con `getBoundingClientRect`) + `click` para el
selector de nivel. Trae assets binarios (spritesheet PNG + 2 MP3 reproducidos con
`new Audio(...).cloneNode().play()`) que deben moverse a `public/`.

---

## Trampas conocidas (para el checklist de verificación del spec)

- **Doble HUD**: si el motor sigue dibujando su propio HUD en canvas mientras `player-hud` de React
  también muestra los mismos números, confirmar que es intencional (fue la decisión explícita en SPEC 05)
  y no un descuido.
- **Doble overlay**: mismo razonamiento para GAME OVER / pausa nativos vs. los del shell de React.
- **Desincronización de pausa**: si el motor tiene su propia tecla o UI de pausa además del botón PAUSA
  de React, pueden desincronizarse — el spec debe decidir una sola fuente de verdad.
- **`dt` sin clamp**: un motor portado sin clamp puede saltar físicamente tras una pestaña en background
  o un frame lento; decidir si el adaptador `<X>Canvas.tsx` le aplica el mismo `Math.min(dt, 0.05)` que
  asteroids o uno propio acorde a sus unidades.
- **`getBoundingClientRect` con canvas estirado**: el `<canvas>` de React se renderiza a `width:100%`
  pero su `width`/`height` internos son fijos (800×600); cualquier cálculo de coordenadas de mouse debe
  escalar por `canvas.clientWidth`/`clientHeight`, no asumir 1:1.
- **`getComputedStyle` de variables CSS inexistentes**: un motor portado que lea variables CSS del
  prototipo original (`--grid-line`, etc.) debe usar valores literales o las variables ya definidas en
  `app/globals.css` (`--cyan`, `--magenta`, `--green`, `--yellow`, `--ink`, ...).
