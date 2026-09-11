# SPEC 10 — Controles táctiles en móvil

> **Status:** Approved
> **Depends on:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-09-11
> **Objective:** Agregar un D-pad y dos botones de acción táctiles debajo del canvas para que los 4 juegos con motor real se puedan jugar completos desde un teléfono.

## Scope

**In:**

- Detección automática de dispositivo táctil (`matchMedia("(pointer: coarse)")`) vía hook `lib/games/use-is-touch.ts`. En desktop no aparece ningún control nuevo y el teclado sigue funcionando exactamente igual.
- Componente reutilizable `components/touch-controls.tsx`: D-pad de 4 flechas (izquierda) + botones `A`/`B` (derecha), montado **debajo** del `.crt` en `app/juego/[id]/jugar/page.tsx`, no superpuesto al canvas.
- Cada control del D-pad y cada botón despacha un `KeyboardEvent` sintético (`keydown`/`keyup`) en `window` con el mismo `code` que ya usan los motores actuales (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Space`, `KeyX`). No se toca ningún `engine.ts` para leer estos eventos — ya escuchan en `window` y no filtran por `isTrusted`.
- Soporte multitáctil real: cada botón captura su propio puntero (`pointerdown`/`pointerup`/`pointercancel`/`pointerleave`, `setPointerCapture`), así se puede sostener una dirección y pulsar un botón de acción al mismo tiempo.
- Mapa de acciones por juego en `lib/games/registry.ts` (`TOUCH_ACTIONS`), con el D-pad siempre mostrando las 4 flechas en los 4 juegos y los botones `A`/`B` siempre visibles — atenuados y sin efecto cuando el juego no los usa:

  | Juego      | D-pad ← →   | D-pad ↑        | D-pad ↓                    | Botón A                 | Botón B                    |
  | ---------- | ----------- | -------------- | -------------------------- | ----------------------- | -------------------------- |
  | asteroides | rotar nave  | empuje         | inerte                     | DISPARAR (`Space`)      | inerte                     |
  | tetris     | mover pieza | rotar (`KeyX`) | bajada suave (`ArrowDown`) | ROTAR (`KeyX`)          | CAÍDA (`Space`, hard drop) |
  | arkanoid   | mover pala  | inerte         | inerte                     | LANZAR (`Space`, nuevo) | inerte                     |
  | snake      | girar       | girar          | girar                      | inerte                  | inerte                     |

- Saque manual de bola en arkanoid: hoy `ball.vx`/`ball.vy` se asignan de inmediato al arrancar nivel y al perder vida (`lib/games/arkanoid/engine.ts:80-83` y `:176-180`), así que no hay forma de "lanzar" — el botón A necesita algo que lanzar. Se agrega estado `ballHeld`: la bola queda pegada a la pala (sigue su `x`) hasta que se pulsa `Space`. Esto también cambia el arranque en desktop (antes: bola sale sola; ahora: bola espera saque con `Space`).
- CSS del control (`.touch-pad`, `.touch-dpad`, `.touch-ab`, estados `:active` y atenuado) en el lenguaje visual retro/neón existente, siguiendo `/frontend-design`.
- Ajustes CSS móviles de `.player-hud` y `.hud-actions` para que no se amontonen entre 360px y 430px de ancho (hoy solo `.av-player` tiene una regla en `@media (max-width: 720px)`, `app/globals.css:1685`).

**Out of scope (para futuros specs):**

- Juegos mock/sembrados sin motor real (no están en `GAME_ENGINES`).
- Controles por gestos/swipe sobre el canvas.
- Bloqueo o sugerencia de rotar a landscape.
- El `aspect-ratio: 4/3` fijo de `.crt-screen` que estira el canvas cuadrado de snake (800×800) — bug pre-existente también en desktop, va en spec propio.
- Sonido, vibración/haptics al tocar los controles.
- Controles táctiles en pantallas que no sean `/juego/[id]/jugar` (portada, detalle, salón de la fama).
- Hiperespacio como mecánica nueva de asteroides — no aplica: el botón "arriba" del D-pad ya cubre el empuje existente, no se agrega teletransporte.

## Data model

Este feature no agrega persistencia nueva. Introduce tipos de configuración en memoria:

```ts
// lib/games/registry.ts
export type TouchAction = {
  code: string; // KeyboardEvent.code a despachar, ej. "Space"
  label: string; // texto corto del botón, ej. "DISPARAR"
};

export type TouchActionMap = {
  a?: TouchAction; // ausente = botón atenuado/inerte
  b?: TouchAction;
};

export const TOUCH_ACTIONS: Partial<Record<string, TouchActionMap>> = {
  asteroides: { a: { code: "Space", label: "DISPARAR" } },
  tetris: {
    a: { code: "KeyX", label: "ROTAR" },
    b: { code: "Space", label: "CAÍDA" },
  },
  arkanoid: { a: { code: "Space", label: "LANZAR" } },
  snake: {},
};
```

```ts
// lib/games/arkanoid/engine.ts — nuevo estado interno, no expuesto en GameEngineState
let ballHeld: boolean; // true al iniciar nivel y al perder vida; false tras el saque
```

Convenciones:

- El D-pad siempre despacha las 4 direcciones (`ArrowUp/Down/Left/Right`); el motor decide si les hace caso.
- `TOUCH_ACTIONS` es la única fuente de verdad de qué botón hace qué por juego — `touch-controls.tsx` no tiene lógica condicional por `id` de juego, solo lee el mapa.

## Implementation plan

1. Crear `lib/games/use-is-touch.ts`: hook `useIsTouch()` con `matchMedia("(pointer: coarse)")`, mismo patrón de efecto que `lib/games/use-skin.ts`. Devuelve `false` en el render inicial (server/primer paint) para no romper la hidratación, y se actualiza en un `useEffect`. Verificación: `npx tsc --noEmit`.
2. Agregar `TouchAction`, `TouchActionMap` y `TOUCH_ACTIONS` a `lib/games/registry.ts` con el mapeo de la tabla de arriba. Verificación: `npx tsc --noEmit`.
3. Crear `components/touch-controls.tsx` (`"use client"`): recibe `gameId: string`, lee `TOUCH_ACTIONS[gameId]`, renderiza D-pad (4 flechas fijas) + botones A/B (atenuados si `TOUCH_ACTIONS[gameId]?.a`/`b` es `undefined`). Cada control usa `pointerdown` (despacha `keydown` + `setPointerCapture`) y `pointerup`/`pointercancel`/`pointerleave` (despacha `keyup`). `touch-action: none; user-select: none` en el contenedor. Verificación: `npx tsc --noEmit`.
4. Estilos en `app/globals.css`: `.touch-pad`, `.touch-dpad`, `.touch-ab` y sus estados (`:active`, atenuado), más media queries para `.player-hud`/`.hud-actions` entre 360px y 430px. Usar `/frontend-design` para las decisiones visuales de color/tipografía dentro del sistema retro/neón existente. Verificación visual manual en un viewport de 390px.
5. Montar `<TouchControls gameId={id} />` en `app/juego/[id]/jugar/page.tsx`, debajo del bloque `.crt`, condicionado a `useIsTouch() && Engine`. Verificación: `npx tsc --noEmit`.
6. En `lib/games/arkanoid/engine.ts`: agregar `ballHeld`, seguir la pala mientras `ballHeld` es `true` (en el arranque de nivel y tras perder vida), y lanzar (asignar `vx`/`vy` como hoy) cuando `keyDown("Space")` llega con `ballHeld === true`. En `lib/games/arkanoid/ArkanoidCanvas.tsx`: agregar `"Space"` a la whitelist `KEYS`. Verificación: `npx tsc --noEmit`.
7. Verificación manual en dispositivo táctil real (o DevTools con emulación táctil) para los 4 juegos: D-pad y botones responden según la tabla, multitáctil simultáneo funciona, botones inertes no hacen nada, arkanoid espera el saque, no hay scroll de página al tocar los controles, desktop sin cambios de comportamiento salvo el saque manual de arkanoid.
8. Limpieza final: `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores.

## Acceptance criteria

- [ ] En un dispositivo/viewport sin puntero táctil (`pointer: fine`), `<TouchControls>` no se renderiza y el teclado funciona exactamente igual que hoy.
- [ ] En un dispositivo/viewport táctil (`pointer: coarse`), el D-pad y los botones A/B aparecen debajo del `.crt` en `/juego/[id]/jugar` para los 4 juegos con motor real.
- [ ] asteroides: D-pad izquierda/derecha rota, arriba empuja, botón A dispara; botón B y D-pad abajo no hacen nada.
- [ ] tetris: D-pad izquierda/derecha mueve, abajo hace bajada suave, arriba rota; botón A rota, botón B hace caída dura (hard drop).
- [ ] arkanoid: D-pad izquierda/derecha mueve la pala; la bola nace pegada a la pala y no se mueve hasta pulsar el botón A (o `Space` en desktop); D-pad arriba/abajo y botón B no hacen nada.
- [ ] snake: las 4 flechas del D-pad cambian de dirección (con el bloqueo de reversa de 180° ya existente); botones A y B no hacen nada.
- [ ] Sostener una dirección del D-pad y pulsar un botón de acción al mismo tiempo funciona (multitáctil real, sin que un puntero cancele al otro).
- [ ] Los botones sin acción para el juego actual se ven visualmente atenuados.
- [ ] Tocar cualquier control no dispara scroll ni zoom de la página.
- [ ] A 360px de ancho de viewport, `/juego/[id]/jugar` no tiene overflow horizontal.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisions

- **Sí:** alcance limitado a los 4 juegos con motor real (`GAME_ENGINES`). Razón: decisión explícita del usuario — los juegos mock no tienen gameplay real que controlar.
- **Sí:** control simulado debajo del `.crt`, no superpuesto al canvas. Razón: decisión explícita del usuario, con referencia visual (screenshot): franja separada con D-pad a la izquierda y botones a la derecha.
- **Sí:** D-pad fijo de 4 flechas en los 4 juegos, aunque el motor no use todas. Razón: decisión explícita del usuario — un solo componente visual sin configuración de D-pad por juego; las direcciones no usadas simplemente no hacen nada.
- **Sí:** botones A/B siempre visibles, atenuados cuando el juego no los usa (en vez de ocultarlos). Razón: decisión explícita del usuario — layout idéntico en los 4 juegos.
- **Sí:** detección automática por `matchMedia("(pointer: coarse)")`, sin toggle manual. Razón: decisión explícita del usuario — simplicidad, el teclado sigue disponible igual en desktop.
- **Sí:** despachar `KeyboardEvent` sintético en `window` en vez de extender `GameEngineHandle` con `keyDown`/`keyUp` por ref. Razón: decisión explícita del usuario — cero cambios en los 4 `*Canvas.tsx` (excepto la whitelist de arkanoid) ni en los `engine.ts` (excepto la mecánica nueva de arkanoid); los listeners ya existentes en `window` no filtran por `isTrusted`, confirmado por inspección de código.
- **Sí:** sin bloqueo ni sugerencia de orientación landscape. Razón: decisión explícita del usuario — simplicidad, el canvas ya escala dentro de `.crt-screen` con `width:100%; height:100%`.
- **No:** hiperespacio como mecánica nueva en asteroides. Razón: al indagar, el usuario aclaró que se refería al empuje ya existente (`ArrowUp`) — no hace falta agregar teletransporte; el botón "arriba" del D-pad ya lo cubre.
- **Sí:** saque manual de bola en arkanoid (`ballHeld`), aplicado también en desktop vía `Space`. Razón: decisión explícita del usuario — el botón A necesita una acción real que disparar; sin esto quedaría inerte igual que el B.
- **No:** arreglar el `aspect-ratio: 4/3` de `.crt-screen` que estira el canvas cuadrado de snake. Razón: decisión explícita del usuario — es un bug pre-existente de desktop, no de este spec; mezclarlo ensucia el alcance.

## Risks

| Riesgo                                                                                                                                                                               | Mitigación                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `pointercancel` (el sistema operativo interrumpe el gesto, p. ej. al recibir una notificación) podría dejar una tecla "trabada" en estado presionado si solo se escucha `pointerup`. | `touch-controls.tsx` escucha también `pointercancel` y `pointerleave` para despachar el `keyup` correspondiente.              |
| El saque manual de arkanoid cambia el comportamiento de arranque también en desktop (antes: bola sale sola).                                                                         | Documentado explícitamente en Scope y Decisions; los criterios de aceptación lo verifican como cambio esperado, no regresión. |
| Un componente táctil superpuesto mal posicionado podría capturar toques destinados al botón PAUSA/FIN/SALIR del HUD.                                                                 | El control se monta como bloque separado debajo del `.crt`, no superpuesto — sin overlap de área táctil con el HUD.           |

## What is **not** in this spec

- Juegos mock/sembrados sin motor real.
- Controles por gestos/swipe.
- Bloqueo o sugerencia de orientación landscape.
- Corrección del aspect-ratio estirado del canvas de snake.
- Sonido o vibración/haptics en los controles táctiles.
- Controles táctiles fuera de `/juego/[id]/jugar`.
- Hiperespacio como mecánica nueva de asteroides.

Cada uno de estos, si se necesita, va en su propio spec.
