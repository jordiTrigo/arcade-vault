# Skins por juego

Registro del agente `skin-designer`. Fuente: `lib/games/registry.ts` (`GAME_ENGINES`) +
`lib/games/skins.ts` (`SKINNED_GAMES`) + auditoría de contraste en
`/api/dev/skin-contrast`, consultada 2026-09-10. El contrato de skins (`clasico`, `neon`, `retro`) y
los roles de color viven en `lib/games/skins.ts` — este archivo es solo el estado por juego, no la
fuente de verdad del contrato.

## Matriz juego × skin

| id | clasico | neon | retro | ratio mínimo medido |
|---|---|---|---|---|
| `asteroides` | ok | ok | ok | 5.15 (neon: `secondary` vs `bg`) |
| `tetris` | ok | ok | ok | 2.31 (retro: pieza I, el escalon mas oscuro de la rampa, vs `bg`) |
| `arkanoid` | ok | ok | ok | 2.22 (retro: `gray`, el escalon mas oscuro de la rampa de bloques, vs `bg`; entre roles el minimo es 5.81) |
| `snake` | ok | ok | ok | 5.15 (neon: `secondary` vs `bg`, rol no pintado; el mínimo entre roles que el motor sí dibuja es 6.28) |

## Notas por juego

- **asteroides**: juego 100% vectorial, sin atlas ni rampa multicolor, así que no exporta `RAMPS`.
  Los roles `grid`/`gridAlpha` y `sheen` se definen por contrato pero el motor no los dibuja.
  `overlayVeil` tampoco se pinta: el overlay de GAME OVER se dibuja directo sobre la escena como
  siempre, y en `clasico` el rol vale `rgba(0, 0, 0, 0)` para dejarlo explícito. El `overlaySub` de
  `clasico` es `#a6a6a6`, el resultado exacto de componer el `rgba(255,255,255,0.65)` original sobre
  el fondo negro. El halo (`glow`) se aplica una sola vez por frame con `shadowColor`/`shadowBlur`
  alrededor de toda la escena; con `glow: null` (clásico) el blur queda en 0 y el render es idéntico
  al de antes de la conversión.
  Ratios mínimos por skin: `clasico` 8.63, `neon` 5.15, `retro` 5.81.
- **tetris**: las ocho piezas (I, O, T, S, Z, J, L, N) viven en el rol extra `pieces` de
  `TetrisSkin`, indexado por el tipo de pieza del motor (1..8). `RAMPS` solo declara `retro`: es el
  unico monocromo, donde la separacion de luminancia entre escalones es lo que distingue una pieza
  de otra; en `clasico` y `neon` la distincion es por tono y una rampa de valor no aplica. La rampa
  retro tiene separacion adyacente >= 1.34 y su escalon mas oscuro queda en 2.31 contra el fondo:
  es el suelo posible manteniendo los ocho escalones sin que el mas claro se pase del blanco calido
  del fosforo. La rejilla ya no se lee con `getComputedStyle(--ink-dim)`, ahora sale de
  `grid`/`gridAlpha` (`clasico` reproduce el `#8a8fb5` al 0.25 del original). El brillo del bloque
  (`rgba(255,255,255,0.12)`) pasa por `withAlpha(skin.sheen, 0.12)`. El halo (`glow`) envuelve solo
  fantasma y pieza activa: con los 200 bloques del tablero el `shadowBlur` por `fillRect` cuesta
  demasiado por frame. El tablero ahora pinta `skin.bg` (en `clasico` es `#000000`, identico al
  negro del CRT que se veia a traves del canvas transparente). `setSkin` repinta el preview de la
  proxima pieza, que solo se dibuja al spawnear y si no se quedaria con la paleta anterior. El HUD y
  los overlays los dibuja la pagina del reproductor, no el canvas: esos roles existen por contrato y
  se auditan igual.
  Ratios minimos por rol: `clasico` 6.68, `neon` 5.15, `retro` 5.81.
- **arkanoid**: el atlas (`public/games/arkanoid/spritesheet-breakout.png`) no se toca. El tinte por
  skin es procedural, sobre un canvas offscreen por skin (`globalCompositeOperation = "color"` +
  pase `destination-in` con la imagen cruda para restaurar el alfa).
  `sprites.ts` conserva ahora la imagen cruda (`rawSheet`) ademas de la rasterizacion, porque hace
  falta como mascara de alfa, y cachea una variante del atlas por skin en un `Map<SkinId, canvas>`;
  la clave sale del rol extra `id` de `ArkanoidSkin`. `drawSprite`/`drawFrame` reciben el sheet
  activo como parametro explicito. En `clasico` la variante es la rasterizacion sin tocar
  (`tints: null`): riesgo cero sobre el render original.
  Las regiones tenidas son el bloque de cada `BlockColor`, sus cuatro cuadros de explosion, el
  paddle y la pelota. La tira de explosion de `gray` reutiliza los mismos rects que la de `red`, asi
  que se dedupe por `sx,sy` y se tine una sola vez (gana `red`, que es su dueña).
  Roles extra de `ArkanoidSkin`: `id`, `tints` y `tintFlatten`. El aplanado existe porque
  `"color"` conserva la luminosidad del sprite: medido sobre el atlas, las siete regiones de bloque
  tienen luminancia media 0.095..0.416 con pares a 1.04..1.09 de separacion, o sea que en monocromo
  el tono unificado dejaria filas indistinguibles. `retro` usa `tintFlatten: 0.75` (un pase
  `source-atop` con el mismo tinte) y las filas quedan medidas en captura con separacion 1.29..1.47
  conservando el biselado; `neon` usa 0, porque ahi la lectura del nivel es por tono.
  El escalon mas claro de la rampa retro es `#ffe0a3` y no `#ffd27f`: contra `#ffb000` ese tope se
  quedaba en 1.29 y la auditoria pide 1.3 entre adyacentes.
  El halo (`glow`) envuelve solo paddle y pelota; con los sesenta bloques del nivel el `shadowBlur`
  por `drawImage` cuesta demasiado por frame. Roles definidos por contrato que el motor no pinta:
  `grid`/`gridAlpha`, `primaryAlt`, `primaryInk`, `thruster`, `particle`, `sheen` y `overlaySub` —
  el color de bloques, paddle y pelota sale del atlas, no de un `fillStyle`.
  Ratios minimos por rol: `clasico` 8.63, `neon` 5.15, `retro` 5.81.
- **snake**: las 22 frutas del atlas (`public/games/snake/fruits.png`) nunca se tiñen — un hue
  distinto rompe el reconocimiento del objetivo del juego. Solo `retro` aplica un filtro sepia suave
  (`fruitFilter`) para que la foto a color no desentone del tablero monocromo.
  `SnakeSkin` agrega dos roles extra: `scanline` (el sombreado horizontal dentro de cada segmento,
  siempre con alfa fija 0.25) y `fruitFilter` (filtro de canvas para el atlas, `none` en `clasico` y
  `neon`, `grayscale(0.6) sepia(0.55) saturate(1.25)` en `retro` — desaturación más sepia, nunca
  `hue-rotate`). `drawFruit` recibe el filtro como parámetro y lo aplica entre `save`/`restore`.
  A diferencia de asteroides y tetris, en snake `clasico` sí tiene `glow`: el original ya pintaba
  `rgba(34, 255, 120, 0.55)` con blur 6 por segmento, así que el rol vale `#22ff78` y el alfa 0.55
  queda como constante del motor (`GLOW_ALPHA`). El `overlaySub` de `clasico` es `#a6a6a6`, el
  resultado de componer el `rgba(255,255,255,0.65)` original sobre el fondo negro (mismo criterio
  que asteroides). Roles definidos por contrato que el motor no pinta: `secondary`, `accent`,
  `thruster`, `particle`, `sheen` y `overlayVeil` (el GAME OVER se dibuja sin velo).
  `RAMPS` solo declara `retro` con `[primaryAlt, primary]` = cuerpo y cabeza: en el monocromo ámbar
  la cabeza se distingue por luminancia (separación 1.87). En `neon` cabeza (`#00f5ff`) y cuerpo
  (`#00ff88`) tienen casi la misma luminancia (1.01) y se distinguen por tono más los ojos; por eso
  `neon` no declara rampa.
  Ratios mínimos por skin: `clasico` 8.63, `neon` 5.15, `retro` 5.81.

## Registro de invocaciones

<!-- cada fila la agrega skin-designer al terminar un juego: fecha, juego, resultado, violaciones pendientes si las hay -->

| fecha | juego | resultado | violaciones pendientes |
|---|---|---|---|
| 2026-09-11 | `arkanoid` | tres skins creadas (`skin.ts` con los roles extra `id`, `tints` y `tintFlatten` + `RAMPS.retro`), `sprites.ts` con `rawSheet` conservado y cache `Map<SkinId, canvas>` de atlas tenidos, `drawSprite`/`drawFrame` reciben el sheet como parametro, motor parametrizado con `setSkin`, canvas conectado con `useEffect` deps `[skin]`; verificado en Playwright que en partida pausada el ciclo retro -> clasico -> neon conserva puntuacion 10, 2 vidas, nivel 01, los mismos bloques rotos y las posiciones de bola y paddle, y que no quedan rectangulos opacos en ninguna region tenida | ninguna |
| 2026-09-10 | `snake` | tres skins creadas (`skin.ts` con los roles extra `scanline` y `fruitFilter` + `RAMPS.retro`), motor parametrizado con `setSkin`, `drawFruit` acepta filtro, canvas conectado con `useEffect` deps `[skin]`; verificado en Playwright que cambiar de skin en partida pausada conserva puntuación 10, nivel 01 y las mismas celdas ocupadas del tablero en las tres skins | ninguna |
| 2026-09-10 | `tetris` | tres skins creadas (`skin.ts` con el rol extra `pieces` + `RAMPS.retro`), `getComputedStyle` eliminado del engine, `setSkin` repinta el preview; verificado en Playwright que cambiar de skin en partida conserva puntuacion 52, nivel 01 y el tablero completo | ninguna |
| 2026-09-10 | `asteroides` | tres skins creadas (`skin.ts`), engine parametrizado con `setSkin`, canvas conectado con `useEffect` deps `[skin]`; verificado en Playwright que cambiar de skin en partida pausada conserva score 90, 1 vida, nivel 1 y las posiciones de los 7 asteroides | ninguna |
