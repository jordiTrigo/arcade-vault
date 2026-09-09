---
name: spec-game
description: Diseña el spec para integrar un juego nuevo en Arcade Vault, con motor real en canvas y leaderboard en Supabase. Pregunta antes de escribir y guarda specs/NN-<game>-game.md. Usalo antes de portar un prototipo de references/started-games o de crear un juego desde cero.
disable-model-invocation: true
argument-hint: <nombre del juego o carpeta de references/started-games>
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(date:*), Bash(wc:*), mcp__supabase__execute_sql
---

# /spec-game — Diseñador de specs de juegos

## Session context

Fecha de hoy (úsala en el header del spec, nunca la adivines):
!`date +%F`

Specs que ya existen:
!`ls specs/ 2>/dev/null || echo "specs/ no existe todavía"`

Prototipos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "no hay references/started-games/"`

Motores ya registrados:
!`cat lib/games/registry.ts 2>/dev/null`

Módulos de juego existentes:
!`ls lib/games/ 2>/dev/null`

---

Este skill produce el spec para integrar un juego nuevo — motor real en canvas + leaderboard real en
Supabase — en Arcade Vault. **No escribís código acá.** Tu trabajo es leer el prototipo (si lo hay),
identificar qué diferencias estructurales importan, preguntar lo que no esté definido, y dejar un spec
listo en `specs/` para que `/spec-impl` lo ejecute después.

## Filosofía

Portar un juego de `references/started-games/` no es un trabajo mecánico. Cada prototipo varía en
unidades de tiempo, número de canvas, dueño del HUD, modelo de pausa, forma del estado, e input. Un spec
que no resuelve esas diferencias antes de escribir código produce un motor que no encaja en el contrato
`GameEngineHandle`/`GameEngineState` de `lib/games/registry.ts`, o un adaptador que copia mal el patrón
de `AsteroidsCanvas.tsx`. Por eso este flujo es lento en la fase de definición.

Lee `porting-guide.md` (mismo directorio que este skill) antes de la Fase 2 — ahí está el contrato
completo, el patrón de dos archivos, los 4 checks hardcodeados a generalizar, los 11 ejes de variación,
y las fichas de `02-asteroids`, `03-tetris` y `04-arkanoid`.

Este skill es una especialización de `/spec` para juegos: la parte de _qué preguntar sobre el motor_ es
propia, pero el formato del archivo final, el tono de las preguntas y el criterio de cuándo parar de
preguntar son los de `/spec`. Por eso la Fase 1 manda leer `.agents/skills/spec/SKILL.md` completo antes
de escribir una sola pregunta.

## Fase 1 — Identificar el origen y leer el prototipo

`$ARGUMENTS` puede ser tres cosas:

1. **Una carpeta de `references/started-games/`** (ej. `03-tetris`, o solo `tetris`): buscar la carpeta,
   leer `game.js` (o el archivo principal), `index.html`, `README.md` y `CLAUDE.md` si existen.
2. **El nombre de un juego que ya está en la biblioteca mock** (`lib/data.ts`, los otros 7 con bucle
   falso): confirmar con el usuario si quiere portarlo desde cero o si hay un prototipo relacionado en
   `references/started-games/`.
3. **Vacío o una descripción de juego nuevo sin prototipo**: no hay archivo que leer — todo sale de las
   preguntas de Fase 2, incluyendo el diseño del motor desde cero.

Antes que nada, siempre:

- Leé `.agents/skills/spec/SKILL.md` completo y `.agents/skills/spec/template.md`. Son la referencia de
  formato para todo spec de este repo: orden de secciones, forma del header en blockquote, estados
  válidos (`Draft`/`In review`/`Approved`/`Implemented`/`Obsolete`), regla del objetivo en una sola
  frase, criterio de "cuándo parar de preguntar", y el tono directo sin rodeos al hacer preguntas. La
  Fase 2 y la Fase 3 de este skill siguen ese mismo criterio — no lo repiten, lo heredan.
- Leé `specs/05-juego-asteroides.md` y `specs/06-juegos-y-leaderboard-supabase.md` para ver ese formato
  ya aplicado a este repo en español: wording de estados, nivel de detalle de los criterios de
  aceptación, y el precedente exacto del patrón motor+leaderboard que este skill replica.

Si además hay prototipo, antes de preguntar nada:

- Leelo completo y **clasificalo contra los 11 ejes de `porting-guide.md`**: unidades de `dt`, número de
  canvas, dueño del HUD, modelo de pausa, forma del enum de estado, vidas/niveles, globals multi-archivo,
  assets, superficie de input, ruido a eliminar, overlay nativo vs. modal de React. Sabé de antemano qué
  ejes aplican y cuáles no — eso decide qué preguntar en la Fase 2.
- Con Grep, comprobá si los 4 checks hardcodeados `"asteroides"` (`lib/games/data.ts`,
  `app/juego/[id]/page.tsx`, `app/juego/[id]/jugar/page.tsx`, `components/hall-of-fame.tsx`) ya fueron
  generalizados a `id in GAME_ENGINES`. Si ya lo están, el paso 1 condicional del plan se omite.

## Fase 2 — Preguntas guiadas

Bloques de 3 a 5 preguntas con `AskUserQuestion`, nunca una por una. Recomendación primero cuando ofrezcas
opciones. Solo preguntá lo que el prototipo no responde por sí solo o lo que es una decisión de producto.

**Bloque 1 — Identidad de catálogo**

- `id` kebab-case (verificar que no colisiona con `lib/data.ts` ni con `select id from games` si hay
  conexión a Supabase disponible).
- `title`, `short`, `long`.
- `cat`: `ARCADE` | `PUZZLE` | `SHOOTER` | `VERSUS`.
- `color`: `cyan` | `magenta` | `green` | `yellow`.
- `cover`: ¿reutiliza una clase `cover-*` existente en `app/globals.css` (temáticamente afín, como hizo
  asteroids con `cover-rocas`) o necesita un bloque CSS nuevo?
- `best`/`plays` iniciales — normalmente `0` y `"0"`, recalculados en vivo una vez que hay motor.

**Bloque 2 — Contrato de estado**

- ¿Tiene vidas? Si no, ¿`lives` queda fijo en un valor constante o se amplía el contrato?
- ¿Niveles finitos o infinitos? Si son finitos, ¿qué pasa al completarlos?
- ¿Existe estado de victoria? Si sí, ampliar `GameEngineState.status` a incluir `"win"` es una decisión
  explícita que va en la sección Decisions del spec, no un detalle implícito del plan.

**Bloque 3 — Puente canvas↔React**

- Dimensiones y número de canvas (¿necesita un segundo canvas tipo "next piece"?).
- Unidades de `dt` del motor original (segundos con física continua, o milisegundos con acumulador) y
  si el clamp `Math.min(dt, 0.05)` del patrón asteroids aplica tal cual o necesita adaptarse.
- Modelo de pausa del prototipo (ninguno, flag, o cancela-el-loop) y cómo se reduce a
  `setPaused(v)` leído dentro de `update`.
- Dueño del HUD: ¿se conserva dibujado en canvas, se elimina y todo sale por `getState()` hacia el
  `player-hud` de React que ya existe, o ambos conviven (como en asteroids)?
- Overlays nativos (game over, pausa, selector de nivel): ¿se portan en paralelo al modal de React, o
  se suprimen para no duplicar el mensaje?
- Input: teclas mantenidas vs. flanco vs. puntero (mousemove/click), y qué teclas necesitan
  `preventDefault()`.

**Bloque 4 — Migración y limpieza**

- Assets: ¿hay binarios (imágenes, audio) que mover a `public/`? ¿Cómo se gatea un arranque asíncrono del
  loop mientras cargan?
- Globals multi-archivo: ¿el prototipo reparte estado en varios `<script>` que hay que consolidar o pasar
  a imports ES?
- Qué se elimina explícitamente del prototipo (theme toggles, lecturas de variables CSS ajenas a
  `app/globals.css`, cualquier UI sin equivalente en el shell de Next).
- Confirmar si el refactor de los 4 checks hardcodeados (detectado en Fase 1) va incluido como paso 1 del
  plan o si ya está hecho.

**Cuándo parar de preguntar:** cuando puedas responder sin asumir nada: qué archivos van a aparecer o
cambiar, cuál es el primer y el último paso ejecutable, y cómo se verifica que el juego quedó integrado
(HUD real, pausa real, leaderboard real, podio real en el salón de la fama).

## Fase 3 — Escribir el spec

Estructura y formato: los de `.agents/skills/spec/template.md`, leído en Fase 1 — no te apartes de ese
orden de secciones ni inventes uno propio. Idioma y wording: los de `specs/05-juego-asteroides.md` y
`specs/06-juegos-y-leaderboard-supabase.md`. Contenido de cada sección para este tipo de spec:

1. **Header**: `# SPEC NN — <Título>`, blockquote con `**Status:** Draft`, `**Depends on:** SPEC 01`
   (biblioteca base) `, SPEC 05` (patrón de motor) `, SPEC 06` (leaderboard Supabase) — ajustá si el
   plan no toca leaderboard real. `**Date:**` desde el session context. `**Objective:**` una sola frase.
2. **Scope** (In / Out of scope), explícito en ambos.
3. **Data model**: la entrada en `GAMES` (`lib/data.ts`), el shape de `<X>State` si difiere del
   `GameEngineState` base, y el insert SQL para `games`.
4. **Implementation plan**: numerado, cada paso deja el sistema funcional y con su verificación. Usá esta
   plantilla como base, ajustando lo que no aplique según lo resuelto en Fase 2:

   1. _(Condicional, solo si Grep en Fase 1 mostró que faltan)_ Generalizar los 4 checks hardcodeados
      `"asteroides"` a `id in GAME_ENGINES` / `if (Engine)` en `lib/games/data.ts`,
      `app/juego/[id]/page.tsx`, `app/juego/[id]/jugar/page.tsx`, `components/hall-of-fame.tsx`.
      Verificación: `npx tsc --noEmit`; `/juego/asteroides` sigue mostrando su leaderboard real sin
      cambios de comportamiento.
   2. Crear `lib/games/<id>/engine.ts` portando el prototipo a una factory `create<X>Game(ctx)` con todo
      el estado en closure (sin variables de módulo), devolviendo
      `{ isPaused, update(dt), draw(), getState(), reset(), setPaused(v), keyDown(code), keyUp(code) }`.
      Verificación: `npx tsc --noEmit`.
   3. Crear `lib/games/<id>/<X>Canvas.tsx` (`"use client"`, `forwardRef`) modelado sobre
      `lib/games/asteroides/AsteroidsCanvas.tsx`: mismos refs (`canvasRef`, `gameRef`, `lastStateRef`,
      `lastTimeRef`, `rafRef`, `onStateChangeRef`), `lastTimeRef.current = null` en `resume`/`reset`,
      `onStateChange` disparado solo cuando el estado difiere del frame anterior. Verificación:
      `npx tsc --noEmit`.
   4. Registrar en `lib/games/registry.ts`: import + entrada en `GAME_ENGINES`. Verificación:
      `npx tsc --noEmit`.
   5. Agregar la entrada a `GAMES` en `lib/data.ts` (obligatorio: `jugar/page.tsx` valida contra ese
      array estático, no contra Supabase). Verificación: `/juego/<id>/jugar` no dispara `notFound()`.
   6. Migración de Supabase (`mcp__supabase__apply_migration`) con el `insert into games` de la fila del
      juego. Verificación: `mcp__supabase__execute_sql` con `select * from games where id = '<id>'`
      devuelve 1 fila.
   7. _(Si aplica)_ Bloque `cover-<id>` en `app/globals.css`, si no se reutiliza uno existente.
   8. _(Si aplica)_ Mover assets a `public/`, con gate de carga asíncrona antes de arrancar el loop.
   9. Verificación manual en navegador: HUD de React (Jugador/Puntuación/Vidas/Nivel) refleja los valores
      reales; PAUSA congela el motor y REANUDAR continúa sin salto de tiempo; perder abre el modal de fin
      de partida; GUARDAR inserta una fila en `scores` con `game_id = '<id>'`; el tab del juego en
      `/salon-de-la-fama` arma podio/tabla desde esos scores.
   10. Limpieza final: `npm run lint` y `npm run build` sin errores.

5. **Acceptance criteria**: checklist booleano, no aspiracional — derivado 1:1 de las verificaciones del
   plan.
6. **Decisions**: cada decisión de los Bloques 2 y 3 (ampliar `status`, qué hacer con vidas/niveles
   ausentes, conservar o suprimir overlays nativos, alcance del refactor de los 4 checks) con su razón.
7. **Risks**: solo si aplica — por ejemplo, `dt` sin clamp, `getBoundingClientRect` con canvas estirado,
   o dependencia de assets externos.

## Fase 4 — Guardar

1. `NN` = mayor número existente en `specs/` + 1, con cero a la izquierda.
2. Slug kebab-case del objetivo, sufijo `-game` para diferenciarlo de otros specs del mismo juego
   (ej. `07-tetris-game.md`).
3. Escribir directo en `specs/NN-<slug>.md`. **No pidas permiso para el nombre del archivo** — anuncialo
   en la confirmación final. Preguntá solo si el archivo destino ya existe.
4. Estado `Draft`. **Nunca lo marques `Approved`** — eso lo hace el usuario después de releerlo.
5. Si el header referencia specs (`SPEC 01`, `SPEC 05`, `SPEC 06`), confirmá que existen en `specs/`
   antes de escribir la referencia.
6. Confirmá al usuario: ruta del archivo creado, que queda en `Draft`, y que el siguiente paso es
   `/spec-impl NN-<slug>`. **Parar ahí.**

## Hard rules

- **Nunca escribís código en este skill.** Solo el `.md` del spec al final.
- **Nunca ejecutás `mcp__supabase__apply_migration`** — ese SQL va en el spec, lo aplica `/spec-impl`.
  `mcp__supabase__execute_sql` solo se usa de forma read-only, para chequear colisión de `id` en Fase 2.
- **Nunca propongas implementar después de guardar.** Tu trabajo termina con el archivo escrito.
- **Nunca asumas una decisión que el usuario no confirmó** — de los 11 ejes de `porting-guide.md`,
  cada uno que el prototipo dispare necesita una respuesta explícita, no una elegida por vos.
- **El spec va siempre en español**, igual que los specs 01–06 existentes.
- **Toda ampliación del contrato base** (`GameEngineState.status` con `"win"`, `lives` opcional, un
  segundo `ctx`) se documenta como decisión explícita, nunca como detalle implícito del plan.
