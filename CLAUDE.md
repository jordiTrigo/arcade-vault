# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project status

This is a freshly scaffolded Next.js app (`create-next-app` defaults are still in `app/page.tsx` and `app/layout.tsx`) — the real Arcade Vault application has not been built yet.

Arcade Vault is a platform for playing games online and competing for high scores.

## Commands

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `eslint-config-next`)

There is no test setup in this repo yet.

## Stack

- Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4 via `@tailwindcss/postcss`
- Path alias `@/*` maps to the repo root (`tsconfig.json`)

## Design/UX reference

`resources/resources/templates/` contains a standalone HTML/JSX prototype of the intended app (plain React + Babel loaded from CDN, no build step — not part of the Next.js app and not meant to be imported directly). It's the UX/behavior spec to port into the real App Router implementation:

- `Arcade Vault.html` — shell that wires the scripts together
- `data.jsx` — mock game data
- `nav.jsx` — navigation
- `biblioteca.jsx` — game library/browse screen
- `detalle.jsx` — game detail screen
- `reproductor.jsx` — game player screen
- `auth.jsx` — login/auth screen
- `salon.jsx` — hall of fame / leaderboard screen
- `app.jsx` — root component tying screens together via hash-based routing (`route` state synced to `location.hash`), with `user` session and score entries persisted to `localStorage`
- `styles.css` — retro arcade visual styling (Press Start 2P / JetBrains Mono fonts)

When implementing screens in `app/`, treat these files as the source of truth for flows and copy, not as code to keep as-is — they use hash routing and `localStorage` because they have no server, whereas the Next.js app should use real App Router routes and, where a backend exists, real persistence.

## Spec-driven workflow

Per `README.md`, this project is meant to follow spec-driven development using the `/spec` and `/spec-impl` skills from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (installed via `npx skills@latest add Klerith/fernando-skills`). If those skills aren't installed in a given environment, fall back to normal incremental development.
