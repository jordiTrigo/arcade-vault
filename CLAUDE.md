# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project status

Arcade Vault is live: a Next.js App Router app for playing games online and competing for high scores, backed by Supabase for the game catalog and leaderboards.

Screens implemented in `app/`:

- `app/page.tsx` — home/library (server component, `getGames()` + `components/game-library.tsx` for grid/search/filter/tilt)
- `app/juego/[id]/page.tsx` — game detail (leaderboard, description)
- `app/juego/[id]/jugar/page.tsx` — game player (canvas engine + end-of-run score modal)
- `app/juegos/page.tsx` — full library/browse
- `app/salon-de-la-fama/page.tsx` — hall of fame / global leaderboard tabs per game
- `app/auth/page.tsx` — login/auth
- `app/acerca-de/page.tsx` — about/contact (sends mail via `app/api/contact/route.ts` + Resend)

Playable games with real canvas engines (`lib/games/<game>/`): **asteroides**, **tetris**, **arkanoid**, **snake**. Each has an `engine.ts` (game loop/state) and a `<Game>Canvas.tsx` (render + input). Registered in `lib/games/registry.ts` (`GAME_ENGINES`) so detail/player pages know which games have a real engine vs. a mock/seeded one. Other catalog entries still use seeded/mock scores (`seededScores`), not real gameplay.

## Stack

- Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4 via `@tailwindcss/postcss`
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`) — SSR client (`lib/supabase/server.ts`) for server components, browser client (`lib/supabase/client.ts`) for client-side score writes, `lib/supabase/proxy.ts` for session refresh
- Resend (`resend`) for the contact form (`app/api/contact/route.ts`)
- Path alias `@/*` maps to the repo root (`tsconfig.json`)
- Prettier + ESLint auto-run on every file write via `.claude/hooks/format.sh` (PostToolUse hook, silent by design — never blocks the turn)

## Data layer

- `lib/data.ts` — static `Game` type + legacy mock array (kept for shape/reference; screens no longer read the array directly for the catalog).
- `lib/games/data.ts` — `getGames()` / `getGame(id)`: real catalog reads from the Supabase `games` table (server client). For games in `GAME_ENGINES` (real engines), `best`/`plays` are computed live from `scores` (`MAX`/`COUNT`) instead of the static columns.
- `lib/games/scores.ts` — `getTopScores(gameId, limit)` / `saveScore(gameId, name, score)` against the Supabase `scores` table (browser client).
- `lib/games/registry.ts` — `GAME_ENGINES` map: which game ids have a real playable engine (vs. seeded/mock leaderboard).
- `lib/session.tsx` — client-side auth/session context.

Supabase tables `games` and `scores` have public `select` RLS; `scores` also has public `insert` (no auth/user_id wiring yet — out of scope until a future spec). Project ref: `khbpcrjqyhcexborkjyg` (see `.mcp.json`, `.env.template`).

Para el listado completo de juegos del catálogo (cuáles tienen motor real vs. cuáles son mock/sembrados), ver `references/implemented-games.md` — snapshot consultado directamente de la tabla `games`, puede quedar desactualizado si se agregan juegos nuevos sin regenerarlo.

## Skills

- Usa siempre `/frontend-design` para diseñar la interfaz de usuario.
- Este proyecto sigue desarrollo guiado por specs: usa `/spec` para redactar una spec nueva en `specs/`, `/spec-impl` para implementarla paso a paso, y `/spec-game` para specs que agregan un juego jugable nuevo. Instaladas en `.claude/skills/` (y espejadas en `.agents/skills/`).
- `ui-ux-pro-max` disponible para decisiones de UI/UX más profundas (paletas, tipografías, accesibilidad) cuando `/frontend-design` no baste.

## Spec-driven workflow

Cada feature vive como spec en `specs/NN-nombre.md` con estado (`Approved` → `Implemented`) antes de darse por completa. Specs existentes, en orden:

1.  Pantallas MVP de Arcade Vault
2.  Home / landing
3.  Acerca de + contacto (Resend)
4.  Integración Supabase (clientes SSR)
5.  Juego Asteroides
6.  Tabla `games` y leaderboard real en Supabase
7.  Juego Tetris
8.  Juego Arkanoid
9.  Juego Snake

Antes de asumir el estado de una spec, revisa el encabezado `> **Status:**` del archivo — puede quedar desactualizado si el trabajo se implementó sin actualizar el documento.

## Design/UX reference

`references/templates/` contiene el prototipo standalone HTML/JSX del diseño original (React + Babel por CDN, sin build — no forma parte de la app Next.js ni se importa directamente). Es la referencia de flujos/copy ya portada a `app/`, útil para consultar comportamiento original o copy pendiente:

- `Arcade Vault.html`, `data.jsx`, `nav.jsx`, `biblioteca.jsx`, `detalle.jsx`, `reproductor.jsx`, `auth.jsx`, `salon.jsx`, `app.jsx`, `home-about/`, `styles.css`

`references/source-assets/` guarda assets fuente para juegos nuevos (p. ej. `snake-assets/` con el atlas de frutas de Snake, migrado a `public/games/snake/`). `references/started-games/` guarda versiones de referencia/arranque de juegos (`02-asteroids`, `03-tetris`, `04-arkanoid`) usadas como punto de partida al portar el motor a `lib/games/`.

Cuando el prototipo y la app difieran, la app en `app/`+`lib/games/` es la fuente de verdad — el prototipo es solo referencia histórica de diseño.
