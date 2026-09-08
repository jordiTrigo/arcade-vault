# SPEC 05 — Juego Asteroides con motor real (canvas)

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-09-08
> **Objective:** Portar el prototipo standalone de `references/started-games/02-asteroids/` a un juego real y jugable dentro de Next.js, con id `asteroides`, aislado del resto de juegos mock y notificando su estado al HUD de React.

## Scope

**In:**

- Nueva entrada `asteroides` en `GAMES` (`lib/data.ts`): juego nuevo, independiente de la entrada mock existente `rocas` (que no se toca).
- Motor de juego portado 1:1 desde `references/started-games/02-asteroids/game.js`: nave, asteroides con split por tamaño, disparo, colisiones toroidales, partículas de explosión, 3 vidas con invencibilidad temporal, niveles progresivos, power-up de disparo triple (`PowerUp`/`tripleShot`).
- El motor vive aislado en su propio módulo (`lib/games/asteroides/`), montado por un componente de canvas de React (`"use client"`).
- La ruta dinámica genérica `app/juego/[id]/jugar/page.tsx` sigue sirviendo a todos los juegos; internamente resuelve un registro (`lib/games/registry.ts`) que mapea `id → componente de motor`. Si el id tiene motor registrado (`asteroides`), lo monta; si no, sigue usando el bucle de puntuación falso actual (sin cambios para los demás juegos).
- Contrato canvas → React: el componente del motor expone una ref imperativa (`pause()`, `resume()`, `reset()`) y un prop `onStateChange({ score, lives, level, status })` que se dispara en cada cambio de score, vidas, nivel o status (`'playing' | 'dead' | 'gameover'`).
- El `player-hud` de React (Jugador/Puntuación/Vidas/Nivel) muestra los valores reales recibidos por `onStateChange`, en paralelo al HUD que el propio canvas ya dibuja (`drawHUD` de `game.js`, sin quitar nada). Ambos HUD conviven.
- El botón `PAUSA` del contenedor React llama a `pause()`/`resume()` sobre la ref del motor; el motor deja de avanzar `update(dt)` mientras está pausado (sigue pidiendo `requestAnimationFrame` para no perder el listener de teclado) y al reanudar resetea el `dt` acumulado para evitar un salto de tiempo grande.
- Cuando `onStateChange` reporta `status === 'gameover'`, además del overlay "GAME OVER" + reinicio con Espacio que ya dibuja el propio canvas (sin quitar), React abre el modal existente de fin de partida (nombre + botón GUARDAR) para persistir en `localStorage["av_scores"]`, igual que hoy hace el botón FIN manual. El botón FIN manual sigue disponible para terminar antes de perder las 3 vidas.
- Reiniciar con Espacio dentro del canvas (tras gameover) también dispara `onStateChange` con el estado reseteado, sincronizando el `player-hud` de React.
- Controles: `←`/`→` rotar, `↑` propulsar, `Espacio` disparar (y reiniciar en gameover) — igual que el original, vía `keydown`/`keyup` en `window`.
- Canvas fijo 800×600 dentro del contenedor `.crt-screen` ya existente (mismo lugar donde hoy se ve el placeholder animado con `.game-arena`/`.enemy`).

**Out of scope (para futuros specs):**

- Migrar los otros 7 juegos mock (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) a motores reales. Este spec solo establece el patrón (`registry` + módulo aislado por juego) y lo aplica a `asteroides`.
- Tocar o eliminar la entrada mock `rocas` de `GAMES`.
- Controles táctiles/móviles para Asteroides.
- Leaderboard real leyendo `av_scores` (sigue siendo mock/`seededScores`, igual que SPEC 01).
- Nueva clase CSS de portada dedicada: se reutiliza `cover-rocas` (ya temáticamente afín — campo de asteroides) para la portada de `asteroides`.
- Sonido/efectos de audio (el original no los tiene).

## Data model

```ts
// lib/data.ts — nueva entrada en GAMES, no reemplaza "rocas"
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "...",
  long: "...",
  cat: "SHOOTER",
  cover: "cover-rocas", // reutilizada, ver Decisions
  color: "yellow",
  best: 0,
  plays: "0",
}
```

```ts
// lib/games/registry.ts
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

// Registro id -> componente de motor real (forwardRef<GameEngineHandle, GameEngineProps>)
export const GAME_ENGINES: Record<string, React.ForwardRefExoticComponent<...>> = {
  asteroides: AsteroidsCanvas,
};
```

```ts
// lib/games/asteroides/engine.ts
// Clases portadas tal cual de game.js: Bullet, Asteroid, PowerUp, Ship, Particle.
// Mismas constantes: RADII, SPEEDS, POINTS, POWERUP_DROP_CHANCE, POWERUP_DURATION, POWERUP_TTL, TRIPLE_SPREAD.
// Sin cambios de balance/comportamiento respecto al original.
```

Convenciones:

- El motor (`engine.ts`) no conoce React ni el DOM más allá del `CanvasRenderingContext2D` que recibe; el componente `AsteroidsCanvas.tsx` es el único puente con React (ref, callback, ciclo de vida).
- `onStateChange` se invoca solo cuando alguno de `score`/`lives`/`level`/`status` cambia respecto al frame anterior (no en cada `update`), para no forzar renders de React a 60fps.

## Implementation plan

1. Agregar la entrada `asteroides` a `GAMES` en `lib/data.ts` (título, descripciones, `cat: "SHOOTER"`, `cover: "cover-rocas"`, `color`, `best: 0`, `plays: "0"`). Verificación: `npx tsc --noEmit` sin errores; `/juego/asteroides` (vía `app/juego/[id]/page.tsx` ya existente) muestra la ficha del juego.
2. Crear `lib/games/asteroides/engine.ts` portando literalmente las clases y funciones de `game.js` (`Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, `spawnAsteroids`, `initGame`, `nextLevel`, `explode`, `killShip`, `update`, `draw`, `drawHUD`, `drawOverlay`, `wrap`, `dist`, `rand`, `randInt`), envuelto en una función `createAsteroidsGame(ctx)` que devuelve `{ update(dt), draw(), getState(), reset(), isPaused, setPaused(v) }` en vez de usar variables globales de módulo. Verificación: `npx tsc --noEmit` sin errores (aún no se usa desde ningún componente).
3. Crear `lib/games/asteroides/AsteroidsCanvas.tsx` (`"use client"`, `forwardRef`): monta un `<canvas width={800} height={600}>`, instancia `createAsteroidsGame` en un `useEffect`, corre el loop con `requestAnimationFrame` (igual estructura que `game.js`, `dt` capado a 50ms), expone `pause`/`resume`/`reset` vía `useImperativeHandle`, y llama `onStateChange` cuando cambian `score`/`lives`/`level`/`status`. Verificación: componente compila (`npx tsc --noEmit`) aunque todavía no esté montado en ninguna página.
4. Crear `lib/games/registry.ts` con `GAME_ENGINES = { asteroides: AsteroidsCanvas }`. Verificación: `npx tsc --noEmit` sin errores.
5. Modificar `app/juego/[id]/jugar/page.tsx`: si `GAME_ENGINES[id]` existe, renderizar `AsteroidsCanvas` (con `ref` propia y `onStateChange` actualizando `score`/`lives`/`level` en el estado de React) dentro del `.crt-screen` en vez del placeholder `.game-arena`; el botón `PAUSA` llama a `ref.current.pause()/resume()`; cuando `onStateChange` reporta `status === 'gameover'`, se abre el modal existente (`over = true`) igual que hace hoy el botón FIN. Para cualquier otro id, el comportamiento no cambia (bucle falso actual). Verificación manual en navegador: entrar a `/juego/asteroides/jugar`, mover la nave con flechas, disparar con Espacio, romper asteroides, ver el HUD de React (Puntuación/Vidas/Nivel) actualizarse junto con el HUD propio del canvas.
6. Verificación manual completa: perder las 3 vidas dispara el overlay "GAME OVER" del canvas y, en paralelo, el modal de React para guardar puntuación; guardar escribe en `localStorage["av_scores"]`; reiniciar con Espacio dentro del canvas resetea también el HUD de React; pulsar PAUSA congela el juego (la nave no se mueve, los asteroides no avanzan) y REANUDAR lo continúa sin saltos bruscos; recoger el power-up `3x` habilita disparo triple durante 5s.
7. Limpieza final: `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores.

## Acceptance criteria

- [ ] `GAMES` en `lib/data.ts` incluye una entrada `asteroides` distinta de `rocas` (ambas coexisten).
- [ ] `/juego/asteroides` muestra la ficha del juego (portada, descripción, stats, leaderboard mock).
- [ ] `/juego/asteroides/jugar` monta el canvas real de 800×600 dentro del `.crt-screen`, con el HUD propio del juego (SCORE, NIVEL, iconos de vidas, timer `3x` si aplica) visible.
- [ ] El `player-hud` de React (Puntuación/Vidas/Nivel) refleja el score/lives/level reales del motor, no una fórmula falsa.
- [ ] `←`/`→` rotan la nave, `↑` propulsa, `Espacio` dispara.
- [ ] Destruir un asteroide grande lo divide en dos medianos, y un mediano en dos pequeños; uno pequeño desaparece sin dividirse.
- [ ] Perder una vida deja a la nave con parpadeo de invencibilidad temporal antes de poder volver a chocar.
- [ ] Perder las 3 vidas muestra el overlay "GAME OVER" del canvas Y abre el modal de React para guardar la puntuación.
- [ ] Guardar el nombre en el modal escribe una entrada en `localStorage["av_scores"]` con `game: "asteroides"`.
- [ ] Reiniciar con Espacio dentro del overlay "GAME OVER" del canvas resetea también el `player-hud` de React (score vuelve a 0, vidas a 3, nivel a 1).
- [ ] Pulsar el botón `PAUSA` del contenedor React congela el movimiento de la nave y los asteroides; `REANUDAR` continúa el juego sin salto brusco de posiciones.
- [ ] Al matar suficientes asteroides (o por probabilidad) aparece el power-up `3x`; recogerlo activa disparo triple durante 5 segundos, visible en ambos HUD.
- [ ] Los otros 7 juegos de la biblioteca siguen usando el reproductor con bucle de puntuación falso, sin cambios de comportamiento.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisions

- **Sí:** id nuevo `asteroides`, independiente de la entrada mock `rocas` ya existente. Razón: decisión explícita del usuario — son juegos distintos, `rocas` sigue siendo un mock de la biblioteca.
- **Sí:** reutilizar la clase CSS `cover-rocas` para la portada de `asteroides` en vez de crear una nueva. Razón: ya existe una portada temáticamente afín (campo de asteroides); crear una nueva es rediseño visual fuera de alcance de este spec.
- **Sí:** ruta dinámica genérica (`app/juego/[id]/jugar/page.tsx`) con un registro (`lib/games/registry.ts`) que resuelve el motor por id, en vez de una ruta hardcodeada por juego. Razón: decisión explícita del usuario — mantener la ruta genérica pero con el código de cada motor aislado en su propio módulo, sentando el patrón para futuros juegos reales.
- **Sí:** el motor (`engine.ts`) no depende de React; el puente es un componente de canvas con ref imperativa (`pause`/`resume`/`reset`) + callback `onStateChange`. Razón: decisión explícita del usuario — el juego vive físicamente en el canvas y notifica a React, no al revés.
- **Sí:** conservar el HUD propio del canvas (`drawHUD`, overlay "GAME OVER", reinicio con Espacio) tal cual, en paralelo al HUD de React. Razón: decisión explícita del usuario — no se borra el HUD del juego, conviven los dos.
- **Sí:** el gameover del motor abre también el modal de React de guardar puntuación (no solo el botón FIN manual). Razón: decisión explícita del usuario — el modal debe abrirse igual cuando el juego termina solo, además de seguir disponible manualmente.
- **Sí:** portar el power-up de disparo triple (`PowerUp`/`tripleShot`) tal cual, aunque no esté documentado en el `README.md` del prototipo. Razón: decisión explícita del usuario — es parte del comportamiento actual y probado del juego.
- **Sí:** la pausa la controla el contenedor de React (ref imperativa), no una tecla propia del juego. Razón: decisión explícita del usuario — el juego original no tenía pausa; el contenedor de la app es quien la gestiona.
- **No:** migrar los otros 7 juegos a motores reales en este spec. Razón: fuera de alcance — este spec solo establece el patrón y lo aplica a Asteroides.
- **No:** controles táctiles, sonido, o leer `av_scores` para leaderboards reales. Razón: no forman parte del prototipo original ni fueron pedidos; quedan para specs futuros si se necesitan.

## Risks

| Riesgo                                                                                                                                                                                                      | Mitigación                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El motor usaba variables globales de módulo (`ship`, `bullets`, `score`, `state`, ...) en `game.js`; si dos instancias del canvas coexistieran (navegación rápida, StrictMode doble-mount) podrían pisarse. | El paso 2 del plan encapsula todo el estado dentro de `createAsteroidsGame(ctx)`, sin variables globales de módulo — cada instancia del componente crea su propia closure de estado. |
| Llamar `onStateChange` en cada frame (60fps) puede saturar renders de React y notarse como jank en el HUD.                                                                                                  | El componente solo invoca `onStateChange` cuando `score`/`lives`/`level`/`status` cambian respecto al frame anterior (ver Data model), no en cada `update`.                          |
| Pausar cancelando por completo el loop (`cancelAnimationFrame`) sin resetear `dt` al reanudar produciría un salto de tiempo grande (la nave "teletransportada").                                            | El paso 3 especifica que `resume()` resetea el `dt` acumulado antes de continuar el loop.                                                                                            |

## What is **not** in this spec

- Motores reales para los otros 7 juegos de la biblioteca.
- Cambios a la entrada mock `rocas`.
- Controles táctiles/móviles, audio, o nueva clase CSS de portada.
- Leaderboards reales alimentados por partidas jugadas.

Cada uno de estos, si se necesita, va en su propio spec.
