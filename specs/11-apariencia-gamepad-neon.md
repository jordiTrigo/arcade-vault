# SPEC 11 — Apariencia gamepad neón en controles táctiles

> **Status:** Approved
> **Depends on:** SPEC 10
> **Date:** 2026-09-14
> **Objective:** Reestilizar `components/touch-controls.tsx` para que su apariencia visual calque el gamepad MK-II de `references/gamepad-assets/` (bisel oscuro con textura, D-pad de flechas SVG con glow y hub central decorativo, botones A/B circulares con glow y color diferenciado), sin tocar la lógica de eventos táctiles existente.

## Scope

**In:**

- Reskin visual completo de `.touch-pad` y sus hijos en `app/globals.css`: panel-bisel oscuro con borde, radio de esquina, textura de puntos sutil y glow superior/inferior, igual al `.gp`/`.gp::before`/`.gp::after` de `gamepad.html`.
- D-pad: cada botón pasa de glifo de texto (`▲◀▶▼`) a icono SVG de triángulo (`fill="currentColor"`), con `filter: drop-shadow` al estado activo, igual al `.dp .dp-arrow` de la referencia.
- Hub central decorativo en el D-pad: celda no interactiva (`aria-hidden`) con un gem/diamante (`clip-path: polygon(...)`) y animación de pulso (`pulse-led`), igual al `.dp-hub`/`.dp-hub-gem` de la referencia. Sin nuevo target táctil ni cambio de comportamiento.
- Botones A/B: color diferenciado por botón — B cian (`--cyan`), A magenta (`--magenta`) — con `radial-gradient` de cuerpo, glow (`box-shadow`) y anillo punteado que aparece al presionar (`.ab-ring`), igual al `.ab`/`.ab.a`/`.ab.b`/`.ab-ring` de la referencia. El estado `inert` (botón sin acción para el juego actual) se mantiene atenuado en gris, sobre este mismo esqueleto visual.
- Mantener el sizing responsive actual (D-pad ~52px por celda en desktop, reducción ya existente en la media query de `app/globals.css:1816-1826` para móvil) — solo cambia forma/color/textura, no dimensiones.
- Ajuste mínimo de markup en `components/touch-controls.tsx`: agregar el `<div>` del hub decorativo al D-pad, reemplazar el texto de cada flecha por un `<svg>` inline, agregar clase `a`/`b` a `ActionButton` para el color diferenciado y el `<span class="ab-ring">` decorativo.

**Out of scope (para futuros specs):**

- Cualquier cambio a `lib/games/registry.ts` (`TOUCH_ACTIONS`), `use-is-touch.ts` o la lógica de `dispatchKey`/pointer events — ese contrato queda exactamente igual al de SPEC 10.
- Adoptar las medidas en px literales del prototipo standalone (156px D-pad, 74px botones) — se descartó explícitamente, ver Decisiones.
- Cargar la fuente `Press Start 2P` — ya está disponible vía `var(--pixel)` en el proyecto, no se toca `app/layout.tsx` ni ningún `<link>` de Google Fonts.
- Sonido, vibración/haptics, animaciones nuevas fuera de las ya descritas (pulso del hub, drop-shadow del D-pad, anillo del A/B).
- Cambios al layout de `/juego/[id]/jugar` fuera de `.touch-pad` (posición debajo del `.crt`, HUD, etc. quedan como en SPEC 10).

## Data model

Este feature no agrega estructuras de datos. No toca `TouchAction`, `TouchActionMap` ni `TOUCH_ACTIONS` de SPEC 10 — es un cambio de presentación (CSS + markup decorativo) sobre el mismo componente y el mismo flujo de eventos.

## Implementation plan

1. En `app/globals.css`, reescribir `.touch-pad` como panel-bisel: fondo `linear-gradient` oscuro, `border-radius`, `border: 1px solid var(--line)`, pseudo-elemento `::before` con borde interior sutil y pseudo-elemento `::after` con textura de puntos (`radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)`), más `box-shadow` de glow superior/inferior con `--cyan`/`--magenta` en baja opacidad. Verificación: `npx tsc --noEmit` (no afecta TS) + recarga visual en `/juego/asteroides/jugar` en desktop.
2. En `components/touch-controls.tsx`, reemplazar el texto de cada `DpadButton` (`▲◀▶▼`) por un `<svg viewBox="0 0 24 24">` con un `<path>` de triángulo por dirección (mismos paths que `gamepad.html`). Actualizar `.touch-key` en `globals.css` para centrar el SVG y aplicar `filter: drop-shadow(0 0 6px var(--cyan))` en el estado activo (reemplaza el `color`/`box-shadow` actual del botón por el glow del icono). Verificación: `npx tsc --noEmit`.
3. Agregar el hub decorativo al D-pad: en `touch-controls.tsx`, un `<div className="touch-dpad-hub" aria-hidden="true"><span className="touch-dpad-hub-gem" /></div>` ubicado en la celda central del grid 3×3 ya existente. En `globals.css`, estilos `.touch-dpad-hub` (celda `grid-column: 2; grid-row: 2`, fondo radial oscuro, borde sutil) y `.touch-dpad-hub-gem` (rombo vía `clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%)`, color `--cyan`, `animation: pulse-led 2s ease-in-out infinite`). Reusar/declarar el `@keyframes pulse-led` de la referencia. Verificación: `npx tsc --noEmit` + visual.
4. En `components/touch-controls.tsx`, agregar prop/clase de color a `ActionButton` (`className={ab ${action's key === "a" ? "a" : "b"}}`, determinado por qué instancia se está renderizando — B primero, A segundo, igual que hoy) y el `<span className="touch-ab-ring" />` decorativo dentro del botón. En `globals.css`, reescribir `.touch-ab-btn` con `radial-gradient` de cuerpo por variante (`.touch-ab-btn.b` cian, `.touch-ab-btn.a` magenta, usando el mismo patrón `--ab-mid`/`--ab-deep`/`--ab-glow` de la referencia) y `.touch-ab-ring` (borde punteado, `opacity: 0` en reposo, `opacity: 1` + `transform: scale(1.08)` en `:active`/`.on`). El estado `.inert` existente se mantiene por encima de esta base (gris, sin glow), sin distinguir color a/b cuando está atenuado. Verificación: `npx tsc --noEmit`.
5. Ajustar la media query móvil de `app/globals.css:1816-1826`: mantener los tamaños ya definidos, solo confirmar que el hub y los SVG escalan correctamente (sin números nuevos, solo revisar que ningún valor quede fijo en px que rompa el `.touch-dpad-hub` a 46px de celda). Verificación visual manual en viewport 390px (DevTools).
6. Verificación manual en `/juego/[id]/jugar` para los 4 juegos con motor real: D-pad muestra triángulos con glow al presionar, hub pulsa sin ser tocable, botón A magenta y B cian (o gris si inerte), anillo aparece al presionar, sin regresión de comportamiento (multitáctil, `pointercancel`, teclado en desktop) respecto a SPEC 10.
7. Limpieza final: `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores.

## Acceptance criteria

- [ ] `.touch-pad` se ve como un panel-bisel oscuro con textura de puntos y glow de borde, no como la barra plana actual.
- [ ] Cada botón del D-pad muestra un triángulo SVG (no texto) que brilla (`drop-shadow`) al presionarlo o mientras la tecla está activa por teclado.
- [ ] El centro del D-pad muestra un hub con un gem/diamante que pulsa continuamente, sin reaccionar a toques ni clicks (no es un botón).
- [ ] El botón B se ve cian y el botón A se ve magenta cuando ambos tienen acción asignada para el juego actual.
- [ ] Al presionar un botón A/B activo aparece un anillo punteado alrededor, y desaparece al soltar.
- [ ] Un botón A/B sin acción para el juego actual (`inert`) se sigue viendo atenuado en gris, sin color cian/magenta ni glow.
- [ ] El comportamiento funcional (qué tecla despacha cada control, multitáctil, `pointercancel`/`pointerleave`, mapeo por juego de `TOUCH_ACTIONS`) es idéntico al de SPEC 10 — solo cambió la apariencia.
- [ ] A 390px de ancho de viewport el `.touch-pad` no genera overflow horizontal nuevo (mismo criterio que SPEC 10).
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisions

- **Sí:** mantener el sizing responsive actual de SPEC 10 (D-pad ~52px, botones 64px, media query de 620px ya existente) y solo cambiar forma/color/textura. Razón: decisión explícita del usuario — cero riesgo de romper el layout ya probado en 360–430px.
- **No:** adoptar las medidas literales del prototipo standalone (D-pad 156px, botones 74px). Razón: decisión explícita del usuario, ligada a la anterior.
- **Sí:** color diferenciado por botón (B cian, A magenta) en vez del esquema único magenta actual. Razón: decisión explícita del usuario — calca la referencia exacta; el estado `inert` sigue distinguiéndose en gris.
- **Sí:** reemplazar los glifos de texto del D-pad por SVG con `drop-shadow`. Razón: decisión explícita del usuario — coincide exacto con la referencia visual.
- **Sí:** agregar hub decorativo pulsante en el centro del D-pad. Razón: decisión explícita del usuario — completa el look "gamepad físico"; es puramente estético (`aria-hidden`), no agrega superficie táctil nueva.
- **No:** cargar una fuente nueva. Razón: el proyecto ya expone `Press Start 2P` vía `var(--pixel)`, usado en toda la UI existente — cargarla de nuevo sería redundante.
- **No:** tocar `lib/games/registry.ts`, `use-is-touch.ts` o el despacho de `KeyboardEvent`. Razón: este spec es puramente visual; el contrato de eventos de SPEC 10 ya está probado y en uso.

## What is **not** in this spec

- Cambios a la lógica de eventos táctiles, mapeo de acciones por juego o detección de dispositivo (`use-is-touch.ts`).
- Medidas literales del prototipo standalone de referencia.
- Carga de fuentes nuevas.
- Sonido, vibración/haptics.
- Cambios de layout fuera de `.touch-pad` en `/juego/[id]/jugar`.

Cada uno de estos, si se necesita, va en su propio spec.
