# SPEC — Juego Invasores con motor real (canvas)

> **Status:** Draft
> **Depends on:** SPEC 01, SPEC 05, SPEC 06
> **Date:** 2026-09-10
> **Objective:** Convertir la entrada mock `invasores` del catálogo en un juego jugable con motor real en canvas (formación alienígena que desciende en bloque, búnkeres destructibles y disparo enemigo), integrado al leaderboard real de Supabase.

Documentos hermanos: [design.md](./design.md) (game design) y [engine.md](./engine.md) (arquitectura del motor).

## Scope

**In:**

- Motor nuevo en `lib/games/invasores/` siguiendo el patrón de dos archivos ya usado en `asteroides`/`tetris`/`arkanoid`/`snake`: `engine.ts` (factory sin React) + `InvadersCanvas.tsx` (`"use client"`, único puente con React).
- Canvas único de 800×600, mismo tamaño que `asteroides`.
- Formación de 5 filas × 11 columnas de alienígenas que avanza en pasos horizontales discretos, baja un escalón e invierte dirección al tocar un borde, y acelera a medida que quedan menos vivos.
- Tres tipos de alienígena por fila con valores distintos (30 / 20 / 10 puntos base), dibujados con matrices de bits escaladas, sin archivos de imagen.
- Cañón del jugador con movimiento horizontal continuo y una sola bala propia en vuelo a la vez (regla clásica).
- Disparo enemigo: solo el alienígena más bajo de una columna elegida al azar dispara; el número de balas enemigas simultáneas crece con la oleada.
- Cuatro búnkeres destructibles modelados como grilla de celdas de 8×8 px (erosión por celda, no por píxel).
- OVNI de bonus que cruza la franja superior cada cierto tiempo, con valor sorteado.
- 3 vidas (cañones). Perder las 3, o que la formación alcance la línea de defensa, termina la partida.
- `level` = número de oleada, infinito; al limpiar la formación se genera la siguiente, un escalón más abajo y más rápida.
- Registro en `GAME_ENGINES` (`lib/games/registry.ts`) para activar leaderboard real, `best`/`plays` calculados y podio del salón de la fama.
- Migración de Supabase que pone en cero las columnas mock `best`/`plays` de la fila `invasores` ya existente.
- HUD nativo del canvas (puntuación / vidas / oleada) en paralelo al `player-hud` de React, y overlay nativo "GAME OVER" en paralelo al modal de React — ambos conviven, mismo patrón que asteroides.

**Out of scope (para futuros specs):**

- Cambiar el copy (`title`, `short`, `long`), la portada (`cover-invaders`) o el color (`green`) de la entrada de catálogo — se reutilizan tal cual.
- Portada CSS nueva: `.cover-invaders` ya existe en `app/globals.css`.
- Assets binarios (sprites PNG, audio) en `public/games/invasores/`.
- Controles táctiles o de puntero.
- Estado de victoria (`status: "win"`) — el juego es infinito por oleadas.
- Erosión de búnkeres por píxel real (`ImageData`), power-ups, alienígenas con movimiento propio fuera de la formación, o modo de dos jugadores por turnos.
- Tocar la entrada mock `rocas` u otras entradas de catálogo.

## Data model

La fila de catálogo **ya existe** (mock) tanto en `lib/data.ts` como en la tabla `games`. No se crea una entrada nueva: se conserva el copy y la portada, y solo se ponen en cero las columnas mock de estadísticas.

```ts
// lib/data.ts — entrada existente `invasores`, se conservan title/short/long/cat/cover/color
{
  id: "invasores",
  title: "INVASORES",
  short: "Defiende el planeta de filas alienígenas.",
  long: "Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.",
  cat: "SHOOTER",
  cover: "cover-invaders",
  color: "green",
  best: 0,   // antes 54190 (mock)
  plays: "0", // antes "18.0K" (mock)
}
```

```sql
-- Supabase: la fila ya existe (creada por SPEC 06 con valores mock).
-- No corresponde un insert: se limpian las estadísticas sembradas.
update games
set best = 0, plays = '0'
where id = 'invasores';

-- Equivalente idempotente, si la fila faltara en otro entorno:
-- insert into games (id, title, short, long, cat, cover, color, best, plays)
-- values ('invasores', 'INVASORES', 'Defiende el planeta de filas alienígenas.',
--   'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.',
--   'SHOOTER', 'cover-invaders', 'green', 0, '0')
-- on conflict (id) do update set best = 0, plays = '0';
```

```ts
// lib/games/registry.ts — el contrato GameEngineState se reutiliza tal cual, sin ampliarlo.
// score: entero creciente; lives: 3..0; level: oleada (1..n); status: "playing" | "dead" | "gameover".
// "win" no se usa en este juego.
```

```ts
// lib/games/invasores/engine.ts — entidades principales
type Alien = { col: number; row: number; alive: boolean; type: 0 | 1 | 2 };
type Bullet = { x: number; y: number; vy: number };
type Ufo = { x: number; vx: number; value: number } | null;
type BunkerCell = boolean[][]; // 5 filas × 8 columnas por búnker, true = celda intacta
```

Convenciones:

- Coordenadas con origen arriba-izquierda, canvas 800×600.
- `update(dt)` recibe `dt` en **segundos** con clamp `Math.min(dt, 0.05)`, igual que `asteroides`/`arkanoid`; el avance por pasos de la formación se resuelve con un acumulador interno también en segundos (ver `engine.md`).
- `onStateChange` se invoca solo cuando `score`/`lives`/`level`/`status` difieren del frame anterior.
- El motor (`engine.ts`) no conoce React ni el DOM más allá del `CanvasRenderingContext2D`.

La tabla completa de constantes de balance está en [engine.md](./engine.md); la fórmula de puntuación y la curva de oleadas, en [design.md](./design.md).

## Implementation plan

1. Crear `lib/games/invasores/engine.ts` portando [engine.md](./engine.md) a una factory `createInvadersGame(ctx: CanvasRenderingContext2D)` con **todo** el estado en closure (cañón, formación de aliens, dirección y acumulador de paso, bala del jugador, balas enemigas, OVNI, búnkeres, score, vidas, oleada, status, temporizadores). Devuelve `{ isPaused, update(dt), draw(), getState(), reset(), setPaused(v), keyDown(code), keyUp(code) }`. Verificación: `npx tsc --noEmit` sin errores.
2. Crear `lib/games/invasores/InvadersCanvas.tsx` (`"use client"`, `forwardRef`) modelado sobre `lib/games/asteroides/AsteroidsCanvas.tsx`: `<canvas width={800} height={600}>` con `position:absolute; inset:0; width:100%; height:100%`, mismos refs (`canvasRef`, `gameRef`, `lastStateRef`, `lastTimeRef`, `rafRef`, `onStateChangeRef`), `useEffect([onStateChange])` que mantiene fresco `onStateChangeRef`, `useImperativeHandle` con `pause`/`resume`/`reset` poniendo `lastTimeRef.current = null` en `resume` y `reset`, listeners de `keydown`/`keyup` en `window` con `preventDefault()` solo para `["ArrowLeft","ArrowRight","KeyA","KeyD","Space"]`, `dt` en segundos con clamp a `0.05`, y `onStateChange` disparado solo cuando el estado difiere del frame anterior. Verificación: `npx tsc --noEmit` sin errores.
3. Registrar en `lib/games/registry.ts`: `import { InvadersCanvas } from "./invasores/InvadersCanvas";` + entrada `invasores: InvadersCanvas` en `GAME_ENGINES`. Verificación: `npx tsc --noEmit` sin errores.
4. Actualizar la entrada `invasores` de `GAMES` en `lib/data.ts`: `best: 0` y `plays: "0"`, sin tocar `title`/`short`/`long`/`cat`/`cover`/`color`. Verificación: `/juego/invasores/jugar` no dispara `notFound()` y monta el canvas real en vez del mock.
5. Migración de Supabase (`mcp__supabase__apply_migration`) con el `update games set best = 0, plays = '0' where id = 'invasores'` de la sección Data model. Verificación: `mcp__supabase__execute_sql` con `select * from games where id = 'invasores'` devuelve 1 fila con `best = 0` y `plays = '0'`.
6. _(No aplica)_ Portada CSS: se reutiliza el bloque `.cover-invaders` ya presente en `app/globals.css`, no se agrega ninguno nuevo.
7. _(No aplica)_ Assets en `public/`: no hay ninguno; los alienígenas, el cañón, el OVNI y los búnkeres se dibujan con primitivas de canvas y matrices de bits definidas en `engine.ts`. Sin gate de carga asíncrona: el loop arranca de forma síncrona en el montaje.
8. Verificación manual en navegador (`/juego/invasores/jugar`): el `player-hud` de React refleja puntuación, vidas y oleada reales del motor; las flechas (o `A`/`D`) mueven el cañón y `Espacio` dispara una sola bala a la vez; impactar un alienígena suma según su fila; una bala enemiga o del jugador erosiona celdas de búnker; el OVNI cruza y otorga bonus; limpiar la formación sube de oleada; `PAUSA` congela la formación, las balas y el OVNI, y `REANUDAR` continúa sin salto de tiempo; perder las 3 vidas (o que la formación llegue a la línea de defensa) dibuja el overlay nativo "GAME OVER" y abre el modal de fin de partida de React; `GUARDAR` inserta una fila en `scores` con `game_id = 'invasores'`; el tab `invasores` en `/salon-de-la-fama` arma podio y tabla desde esos scores.
9. Limpieza final: `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores.

> Nota: no se incluye el paso de generalizar los 4 checks hardcodeados a `"asteroides"`. Verificado por Grep: `lib/games/data.ts` usa `if (!(row.id in GAME_ENGINES)) return row;`, `app/juego/[id]/page.tsx` usa `id in GAME_ENGINES`, `app/juego/[id]/jugar/page.tsx` usa `const Engine = GAME_ENGINES[id]` con `if (Engine)`, y `components/hall-of-fame.tsx` usa `tab in GAME_ENGINES`. Registrar el motor basta.

## Acceptance criteria

- [ ] `npx tsc --noEmit` no reporta errores tras crear `engine.ts`, `InvadersCanvas.tsx` y registrar el motor.
- [ ] `GAME_ENGINES` en `lib/games/registry.ts` incluye la clave `invasores`.
- [ ] La entrada `invasores` de `GAMES` en `lib/data.ts` tiene `best: 0` y `plays: "0"`, y conserva `title`, `short`, `long`, `cat`, `cover: "cover-invaders"` y `color: "green"` sin cambios.
- [ ] `select * from games where id = 'invasores'` devuelve 1 fila con `best = 0` y `plays = '0'`.
- [ ] `/juego/invasores` muestra la ficha con leaderboard real (`getTopScores`) en vez de puntuaciones sembradas.
- [ ] `/juego/invasores/jugar` monta un canvas real de 800×600 y no dispara `notFound()`.
- [ ] El `player-hud` de React refleja puntuación, vidas (3 al inicio) y oleada (1 al inicio) reales del motor.
- [ ] `ArrowLeft`/`ArrowRight` (y `KeyA`/`KeyD`) mueven el cañón sin salirse de los bordes del canvas.
- [ ] `Space` dispara y no permite una segunda bala del jugador mientras la anterior sigue en vuelo.
- [ ] Derribar un alienígena de la fila superior suma 30 × oleada; de las filas medias, 20 × oleada; de las inferiores, 10 × oleada.
- [ ] La formación avanza en pasos horizontales, baja un escalón al tocar un borde e invierte dirección, y acelera a medida que quedan menos alienígenas vivos.
- [ ] Al menos un alienígena dispara hacia abajo, y solo lo hace el más bajo de su columna.
- [ ] Una bala (propia o enemiga) que impacta un búnker destruye celdas y deja un hueco visible por el que luego pasan otras balas.
- [ ] El OVNI cruza la franja superior y, al ser derribado, suma un bonus de 50/100/150/300 × oleada.
- [ ] Limpiar los 55 alienígenas suma el bonus de oleada, incrementa `level` y genera una formación nueva más baja y más rápida.
- [ ] Perder un cañón pone `status` en `"dead"`, reinicia la posición del cañón y descuenta una vida.
- [ ] Perder las 3 vidas pone `status` en `"gameover"`, dibuja el overlay nativo "GAME OVER" y abre el modal de fin de partida de React.
- [ ] Que la formación alcance la línea de defensa termina la partida de inmediato (`"gameover"`), sin importar las vidas restantes.
- [ ] `PAUSA` congela formación, balas y OVNI; `REANUDAR` continúa sin salto de posición.
- [ ] Guardar el nombre en el modal inserta una fila en `scores` con `game_id = 'invasores'`.
- [ ] El tab `invasores` en `/salon-de-la-fama` arma podio y tabla con esos scores reales.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisions

- **Sí:** `invasores` como juego del jam. Razón: brief del usuario; es el mejor candidato fuera del hueco de VERSUS porque su fila de catálogo, copy y portada `cover-invaders` ya existen (costo de integración casi nulo) y su mecánica de formación en bloque no se parece al vuelo libre de `asteroides` pese a compartir la categoría SHOOTER.
- **No:** "Enjambre orbital" — cañón que orbita un planeta circular disparando hacia afuera contra un anillo de invasores que se cierra. Descartado por su matemática polar más cara y por solaparse con la rotación/inercia ya resuelta en `asteroides`.
- **No:** "Invasión inversa" — el jugador controla la formación alienígena contra torretas humanas. Descartado porque invierte la agencia respecto al copy ya publicado del catálogo ("Mueve tu cañón en horizontal") y obligaría a fila y portada nuevas.
- **Sí:** categoría `SHOOTER`, color `green`, portada `cover-invaders`. Razón: son los valores que la fila mock ya tiene en `lib/data.ts` y en `games`; cambiarlos rompería la consistencia visual del catálogo sin ganancia.
- **Sí:** reutilizar la fila existente con un `update` de `best`/`plays` en vez de un `insert` de fila nueva. Razón: el id ya está ocupado por el mock; duplicarlo con otro id (patrón `rocas`/`asteroides`) dejaría dos entradas de invasores en el catálogo, que es peor. Las columnas mock se ponen en cero porque `lib/games/data.ts` calcula `best`/`plays` en vivo desde `scores` para los ids de `GAME_ENGINES`, y dejar 54190/18.0K sería un valor muerto y engañoso en cualquier otra lectura de la tabla.
- **Sí:** 3 vidas (cañones), mismo esquema que `asteroides`/`arkanoid`. Razón: es la convención del género y `lives` del contrato la soporta sin cambios.
- **Sí:** `level` = oleada, infinita. Razón: da un score entero estrictamente creciente para el leaderboard y evita diseñar un final.
- **No:** `status: "win"`. Razón: sin oleada final no hay victoria posible; el enum se usa como `"playing" | "dead" | "gameover"`, igual que `snake`. El contrato `GameEngineState` no se toca.
- **Sí:** `"dead"` como estado transitorio al perder un cañón, con una pausa corta de explosión antes de reanudar. Razón: patrón ya establecido en `asteroides`; distingue perder una vida de terminar la partida en el HUD de React.
- **Sí:** `dt` en segundos con clamp `Math.min(dt, 0.05)`, estilo `asteroides`/`arkanoid`. Razón: balas, OVNI y explosiones son movimiento continuo; solo la formación avanza a pasos, y eso se resuelve con un acumulador en segundos dentro del motor sin necesitar milisegundos crudos.
- **Sí:** búnkeres como grilla de celdas booleanas de 8×8 px (8 columnas × 5 filas por búnker). Razón: la erosión por píxel con `ImageData` es la parte más cara y frágil del motor clásico; la grilla da el mismo efecto visual de desgaste progresivo con colisión trivial (índice de celda) y estado serializable.
- **Sí:** una sola bala del jugador en vuelo a la vez. Razón: regla clásica del género, define el ritmo del juego y evita el balance de cadencia libre.
- **Sí:** solo el alienígena más bajo de una columna puede disparar. Razón: regla clásica; evita que balas enemigas salgan desde detrás de la propia formación.
- **Sí:** HUD nativo en canvas y overlay nativo "GAME OVER" conviviendo con el `player-hud` y el modal de React. Razón: decisión ya tomada en SPEC 05 para `asteroides` y repetida en SPEC 09 para `snake`; mantener la coherencia entre motores pesa más que evitar la duplicación.
- **Sí:** `setPaused(v)` como única fuente de verdad de la pausa, sin tecla nativa. Razón: el botón PAUSA de React es el dueño; una tecla `KeyP` en el motor podría desincronizar el estado del botón.
- **Sí:** alienígenas dibujados desde matrices de bits definidas en `engine.ts`, escaladas por un factor de píxel. Razón: da la estética pixelada del género con cero assets y cero carga asíncrona, y permite alternar dos fotogramas de animación por tipo sin archivos.
- **No:** sprites PNG y sonido en `public/games/invasores/`. Razón: fuera de alcance; el resto del sitio salvo `arkanoid` no tiene audio y las primitivas alcanzan para el estilo neón.
- **No:** refactor de los 4 checks hardcodeados a `"asteroides"`. Razón: ya están generalizados a `id in GAME_ENGINES` / `if (Engine)`, confirmado por Grep en los cuatro archivos.
- **Nota de proceso:** el id `invasores` figura en la sección Pendientes de `references/game-suggestions-todo.md`, propuesto por `game-planner`. No es una colisión: este spec **es** la materialización de esa propuesta, con el brief del usuario como confirmación. El archivo de sugerencias no se edita desde acá.

## Risks

| Riesgo                                                                                                                                                       | Mitigación                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El id `invasores` ya tiene fila en `games` y en `lib/data.ts` con estadísticas mock; un `insert` fallaría por clave primaria duplicada.                      | La migración es un `update` de `best`/`plays`, con variante `insert ... on conflict (id) do update` documentada para entornos donde la fila no exista.                                                  |
| La aceleración de la formación en función de alienígenas vivos puede volverse injugable en las últimas unidades de oleadas altas.                            | El intervalo de paso tiene un piso duro (`STEP_INTERVAL_MIN`) que ningún multiplicador de oleada puede atravesar; la tabla de balance de `engine.md` fija el valor.                                     |
| Con 55 alienígenas, 4 búnkeres de 40 celdas y varias balas por frame, una colisión por fuerza bruta contra todo podría notarse.                              | Colisión de bala contra alien resuelta por índice de celda de la formación (no recorriendo el array completo) y contra búnker por índice de celda; el orden de magnitud queda muy por debajo del frame. |
| La formación baja un escalón inicial por oleada; en oleadas altas podría arrancar ya por debajo de la línea de defensa y provocar un `gameover` instantáneo. | El escalón inicial por oleada está topado (`START_Y_MAX`), de modo que la formación nunca nace debajo de la altura de los búnkeres.                                                                     |
| Erosionar el búnker por celdas de 8 px puede verse tosco frente a la erosión por píxel del original.                                                         | Cada impacto apaga la celda alcanzada más sus vecinas inmediatas con un patrón irregular, lo que produce bordes dentados en vez de bloques limpios; decisión asumida en Decisions.                      |

## What is **not** in this spec

- Cambiar el copy, la portada o el color de la entrada `invasores` del catálogo.
- Portada CSS nueva (se reutiliza `.cover-invaders`).
- Assets binarios (sprites PNG o audio) en `public/games/invasores/`.
- Controles táctiles o de puntero.
- Estado de victoria (`status: "win"`), power-ups, alienígenas que se desprenden de la formación, o modo de dos jugadores.
- Erosión de búnkeres por píxel real con `ImageData`.

Cada uno de estos, si se necesita, va en su propio spec.
