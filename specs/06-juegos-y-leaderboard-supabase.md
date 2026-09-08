# SPEC 06 — Tabla de juegos y leaderboard real en Supabase

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 04, SPEC 05
> **Date:** 2026-09-08
> **Objective:** Crear las tablas `games` y `scores` en Supabase, migrar la biblioteca/detalle a leer `games` en vez del mock, y hacer que Asteroides guarde y muestre puntuaciones reales desde `scores` en vez de `localStorage["av_scores"]`.

## Scope

**In:**

- Migración de Supabase (`mcp__supabase__apply_migration`) que crea las tablas `games` y `scores`, con RLS habilitado.
- Seed de los 9 juegos actuales (los 8 de `lib/data.ts` + `asteroides` de SPEC 05) insertados en `games` con sus valores reales migrados tal cual (título, descripciones, categoría, cover, color, `best`, `plays`).
- `lib/games/data.ts`: `getGames()` y `getGame(id)` async, que reemplazan el array estático `GAMES` de `lib/data.ts` consultando la tabla `games` vía el cliente de servidor de Supabase (`lib/supabase/server.ts`, ya existente de SPEC 04).
- `lib/games/scores.ts`: `getTopScores(gameId, limit)` (lee `scores`) y `saveScore(gameId, name, score)` (inserta en `scores`), vía el cliente de navegador de Supabase.
- `app/page.tsx` (Biblioteca) pasa a server component que hace `await getGames()` y delega el grid/buscador/chips/tilt a un client component (`components/game-library.tsx`).
- `app/juego/[id]/page.tsx` usa `getGame(id)` en vez de buscar en el array `GAMES`; si `id === "asteroides"` el leaderboard sale de `getTopScores`, para el resto sigue usando `seededScores` (sin cambios).
- El modal de fin de partida en `app/juego/[id]/jugar/page.tsx`, solo para `id === "asteroides"`, llama a `saveScore` (Supabase) en vez de escribir en `localStorage["av_scores"]`.
- `app/salon-de-la-fama/page.tsx`: la lista de tabs sale de `getGames()`; el tab `asteroides` arma podio y tabla desde `getTopScores`, el resto sigue con `seededScores` sin cambios.
- Para `asteroides`, `best` y `plays` mostrados en card/detalle se calculan en cada carga (`MAX(score)` / `COUNT(*)` sobre `scores`), no desde la columna estática de `games`. Para los otros 8 juegos, `best`/`plays` siguen siendo los valores estáticos migrados a `games` (sin cambios de comportamiento).
- RLS: lectura pública (`select`) en `games` y `scores`; inserción pública (`insert`) en `scores`. Sin políticas de `update`/`delete` en ninguna, ni de `insert` en `games` (el catálogo se gestiona solo por migración).

**Out of scope (para specs futuros):**

- Autenticación real / `user_id` poblado. La columna `scores.user_id` se crea nullable pero queda siempre `null` — no hay forma de vincular un score a un usuario real todavía (SPEC 04 dejó auth fuera explícitamente).
- Migrar los otros 7 juegos con bucle falso a scores reales — siguen con `seededScores` y `localStorage["av_scores"]`, sin cambios.
- Anti-cheat o validación de score en servidor (Edge Function, RPC con reglas) — el insert público confía en el cliente, igual de "confiable" que el mock actual.
- Paginación o límites de tamaño en `scores` (borrado de históricos, límite de filas por juego).
- Editar/borrar el catálogo `games` desde la UI — solo se puebla por migración/seed.

## Data model

```sql
-- games: catálogo de juegos, reemplaza el array GAMES de lib/data.ts
create table games (
  id text primary key,               -- kebab-case, igual a los ids actuales (ej. "asteroides")
  title text not null,
  short text not null,
  long text not null,
  cat text not null,                 -- 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS'
  cover text not null,               -- clase CSS existente en globals.css
  color text not null,               -- 'cyan' | 'magenta' | 'green' | 'yellow'
  best integer not null default 0,   -- valor estático migrado; ignorado para "asteroides" (se calcula de scores)
  plays text not null default '0',   -- valor estático migrado; ignorado para "asteroides" (se calcula de scores)
  created_at timestamptz not null default now()
);

-- scores: puntuaciones reales, hoy solo alimentada por Asteroides
create table scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id),
  user_id uuid,                      -- siempre null hasta que exista auth real
  name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);
```

```ts
// lib/games/data.ts
async function getGames(): Promise<Game[]>;
async function getGame(id: string): Promise<Game | null>;
// Game: mismo shape que SPEC 01 (id/title/short/long/cat/cover/color/best/plays),
// con best/plays de "asteroides" sobreescritos por el cálculo de scores.

// lib/games/scores.ts
async function getTopScores(
  gameId: string,
  limit?: number,
): Promise<{ rank: number; name: string; score: number; date: string }[]>;
async function saveScore(gameId: string, name: string, score: number): Promise<void>;
```

Convenciones:

- `games.id` sigue siendo el slug kebab-case ya usado en rutas (`/juego/[id]`); no se introduce un id numérico/uuid separado.
- `CATS` y `seededScores` (`lib/data.ts`) no se tocan — siguen usándose para los 8 juegos sin scores reales.
- `scores.game_id` no tiene `on delete cascade`; no se prevé borrar juegos desde la app.

## Implementation plan

1. Crear la migración de Supabase (`mcp__supabase__apply_migration`) con las tablas `games` y `scores` de la sección Data model, `alter table ... enable row level security` en ambas, y las policies: `select` público en `games` y `scores`, `insert` público en `scores`. Verificación: `mcp__supabase__list_tables` muestra `games` y `scores`; `mcp__supabase__get_advisors` no reporta RLS deshabilitado en ninguna de las dos.
2. Insertar (misma migración o una siguiente) los 9 juegos actuales con los valores exactos hoy presentes en `GAMES` de `lib/data.ts` (incluyendo `asteroides` de SPEC 05). Verificación: `mcp__supabase__execute_sql` con `select count(*) from games` devuelve 9.
3. Crear `lib/games/data.ts` con `getGames()`/`getGame(id)` usando `lib/supabase/server.ts::createClient()`; para `asteroides`, sobreescribir `best`/`plays` con `MAX(score)`/`COUNT(*)` de `scores` (0 si no hay filas). Verificación: `npx tsc --noEmit` sin errores.
4. Crear `lib/games/scores.ts` con `getTopScores`/`saveScore` usando `lib/supabase/client.ts::createClient()`. Verificación: `npx tsc --noEmit` sin errores.
5. Extraer el grid/buscador/chips/tilt actuales de `app/page.tsx` a `components/game-library.tsx` (`"use client"`, recibe `games: Game[]` por props); `app/page.tsx` pasa a server component que hace `const games = await getGames()` y renderiza `<GameLibrary games={games} />`. Verificación: `/` sigue mostrando los 9 juegos, el buscador filtra por título y los chips por categoría, igual que antes.
6. Modificar `app/juego/[id]/page.tsx` para usar `await getGame(id)` (`notFound()` si es `null`) en vez de buscar en `GAMES`; si `id === "asteroides"`, el leaderboard sale de `await getTopScores("asteroides", 10)`, si no, sigue usando `seededScores` igual que hoy. Verificación: `/juego/asteroides` compila y muestra el leaderboard vacío (0 filas, recién migrado); `/juego/bloque-buster` se ve idéntico a antes.
7. Modificar el modal de fin de partida en `app/juego/[id]/jugar/page.tsx`: si `id === "asteroides"`, el botón guardar llama a `saveScore("asteroides", name, score)` en vez de escribir en `localStorage["av_scores"]`; para el resto de juegos, sin cambios (siguen usando `localStorage["av_scores"]`). Verificación manual: jugar Asteroides, perder las 3 vidas, guardar con un nombre, y confirmar con `mcp__supabase__execute_sql` (`select * from scores`) que la fila aparece.
8. Modificar `app/salon-de-la-fama/page.tsx`: los tabs salen de `await getGames()`; al seleccionar el tab `asteroides`, podio y tabla se arman desde `await getTopScores("asteroides", ...)`; el resto de tabs sigue con `seededScores`, sin cambios visuales. Verificación: tras guardar el score del paso 7, el tab `asteroides` en `/salon-de-la-fama` lo muestra en podio o tabla según el puesto.
9. Limpieza final: `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores.

## Acceptance criteria

- [ ] `mcp__supabase__list_tables` muestra `games` y `scores` con RLS habilitado.
- [ ] `select count(*) from games` devuelve 9 filas, incluyendo `asteroides`.
- [ ] `/` (Biblioteca) muestra los 9 juegos leídos de Supabase; buscador y chips de categoría filtran igual que antes.
- [ ] `/juego/[id]` para cualquiera de los 9 ids muestra portada, descripción y stats correctos (sin `notFound()`); un id inexistente sigue mostrando la página not-found.
- [ ] `/juego/asteroides` muestra un leaderboard leído de `scores` (vacío hasta la primera partida guardada); los otros 8 juegos siguen mostrando su leaderboard mock (`seededScores`) sin cambios.
- [ ] Terminar una partida de Asteroides y guardar el nombre inserta una fila en `scores` con `game_id = "asteroides"`, visible con `select * from scores`.
- [ ] Terminar una partida en cualquiera de los otros 7 juegos (bucle falso) sigue guardando en `localStorage["av_scores"]`, sin insertar nada en Supabase.
- [ ] Después de guardar un score de Asteroides, su card en `/` y su detalle en `/juego/asteroides` muestran `best`/`plays` recalculados (`MAX(score)`/`COUNT(*)` de `scores`), no el valor estático migrado en el seed.
- [ ] `/salon-de-la-fama` con el tab `asteroides` seleccionado muestra podio/tabla con los scores reales guardados; los otros tabs siguen mostrando su mock sin cambios.
- [ ] Insertar directamente en `scores` vía `anon key` (sin sesión) funciona (RLS lo permite); intentar `insert`/`update`/`delete` directo en `games` vía `anon key` falla (RLS lo bloquea).
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisions

- **Sí:** un solo spec para `games` + `scores`. Razón: decisión explícita del usuario — `scores` tiene FK a `games`, tiene sentido crearlas y migrar juntas.
- **Sí:** `games` reemplaza el array mock `GAMES` como fuente de biblioteca y detalle. Razón: decisión explícita del usuario.
- **Sí:** solo Asteroides pasa a guardar/leer scores reales; los otros 7 juegos (bucle falso) siguen con `seededScores`/`localStorage["av_scores"]`. Razón: decisión explícita del usuario — son los únicos con un motor de juego real (SPEC 05); los demás no representan una partida real que valga la pena persistir todavía.
- **Sí:** `insert` público (vía `anon key`, sin auth) en `scores`. Razón: decisión explícita del usuario — sin auth real (SPEC 04 la dejó fuera) no hay forma de restringir quién inserta; es igual de "confiable" que el mock actual.
- **Sí:** columna `scores.user_id` nullable, sin poblar todavía. Razón: decisión explícita del usuario — preparar el enlace a auth real sin bloquear este spec por no tenerla.
- **Sí:** `best`/`plays` de Asteroides se calculan de `scores` en cada carga; los de los otros 8 juegos quedan estáticos en `games` (valores migrados del mock). Razón: decisión explícita del usuario — solo Asteroides tiene datos reales que agregar; los demás no tienen scores reales que contar.
- **Sí:** `games.id` es el slug kebab-case ya usado en rutas (clave primaria de texto), no un uuid separado. Razón: evita traducir entre id de ruta e id de fila; es el mismo patrón que ya usa toda la app (`/juego/[id]`).
- **No:** anti-cheat o validación de score en servidor. Razón: fuera de alcance — el modal cliente ya calculaba el score sin validación previa (SPEC 01/05); mismo nivel de confianza que hoy.
- **No:** migrar los otros 7 juegos a scores reales en este spec. Razón: decisión explícita del usuario — ninguno tiene motor de juego real todavía.
- **No:** modificar el texto de SPEC 05 con este cambio de comportamiento. Razón: decisión explícita del usuario — SPEC 05 queda como registro histórico; este spec nuevo documenta el cambio del modal de Asteroides.

## Risks

| Riesgo                                                                                                                                                     | Mitigación                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `insert` público en `scores` sin auth permite spam/scores falsos ilimitados.                                                                               | Aceptado explícitamente por el usuario como limitación temporal — mismo nivel de confianza que el mock actual; se revisará cuando exista auth real. |
| Calcular `best`/`plays` de Asteroides con una query agregada en cada carga de `/` y `/juego/asteroides` añade una consulta extra por render.               | Volumen esperado bajo (MVP); si se vuelve un problema de rendimiento, se puede cachear o denormalizar en un spec futuro.                            |
| Extraer el grid de `app/page.tsx` a `components/game-library.tsx` podría romper el efecto tilt si las props no coinciden exactamente con el estado actual. | Paso 5 del plan verifica manualmente que buscador, chips y tilt se comporten igual que antes de la migración.                                       |

## What is **not** in this spec

- Autenticación real o `scores.user_id` poblado.
- Scores reales para los otros 7 juegos con bucle falso.
- Anti-cheat o validación de score en servidor.
- Paginación, límites o borrado de históricos en `scores`.
- Edición/borrado del catálogo `games` desde la UI.

Cada uno de estos, si se necesita, va en su propio spec.
