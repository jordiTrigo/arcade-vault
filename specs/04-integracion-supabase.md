# SPEC 04 — Integración base de Next.js con Supabase (clientes SSR)

> **Status:** Implemented 
> **Depends on:** SPEC 01
> **Date:** 2026-09-08
> **Objective:** Conectar la aplicación Next.js al proyecto de Supabase ya provisionado (`XXXXXXXXXXXXXXX`) con los clientes oficiales `@supabase/ssr`, sin tocar autenticación ni crear ninguna tabla todavía, como base de conexión para specs futuros.

## Scope

**In:**

- Instalación de `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.template` (documentadas) y `.env.local` (valores reales del proyecto `XXXXXXXXXXXXXXX`).
- Cliente de navegador: `lib/supabase/client.ts` (`createBrowserClient` de `@supabase/ssr`).
- Cliente de servidor: `lib/supabase/server.ts` (`createServerClient` async, usando `cookies()` de `next/headers`), para usar desde Server Components y Route Handlers.
- Refresco de sesión en cada request: `lib/supabase/proxy.ts` (helper `updateSession`) invocado desde `proxy.ts` en la raíz del proyecto (convención Next 16 — reemplaza a `middleware.ts`, deprecado en esta versión), con `matcher` que excluye assets estáticos.

**Out of scope (para specs futuros):**

- Cualquier tabla en la base de datos (`profiles` u otra) — no se crea ninguna en este spec.
- Autenticación real: `/auth` sigue funcionando exactamente igual que hoy, con la sesión mock de `localStorage["av_user"]` (`lib/session.tsx` sin cambios).
- Migrar `localStorage["av_scores"]` ni los leaderboards mock (`seededScores`) a Supabase.
- Proteger rutas (redirigir a `/auth` si no hay sesión) — `proxy.ts` solo refresca cookies de sesión, no bloquea ni redirige nada.
- OAuth (Google/GitHub), modo invitado con Supabase, Realtime, Edge Functions — mencionados por el usuario como fases futuras, ninguna se implementa aquí.

## Data model

No se introduce ningún dato nuevo ni se crea ninguna tabla. Este spec es solo la capa de conexión (clientes + refresco de sesión); el primer dato persistente en Supabase se define en el spec que implemente autenticación real.

## Implementation plan

1. Ejecutar `npm install @supabase/supabase-js @supabase/ssr`. Añadir a `.env.template` `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` (comentario: se obtienen en Project Settings → API Keys del proyecto `XXXXXXXXXXXXXXX`), y completar `.env.local` con los valores reales. Verificación: `npm run build` sigue compilando sin errores (las variables aún no se usan en ningún archivo).
2. Crear `lib/supabase/client.ts` exportando `createClient()` con `createBrowserClient` de `@supabase/ssr`, y `lib/supabase/server.ts` exportando un `createClient()` async con `createServerClient`, usando `cookies()` de `next/headers` para leer/escribir las cookies de sesión. Verificación: `npx tsc --noEmit` sin errores.
3. Crear `lib/supabase/proxy.ts` con `updateSession(request)`: crea un `createServerClient` a partir de las cookies del `request`, llama a `supabase.auth.getClaims()` para refrescar el token, y devuelve la respuesta con las cookies actualizadas — sin redirigir ninguna ruta. Crear `proxy.ts` en la raíz del proyecto (no `middleware.ts`, deprecado en Next 16) que exporta `proxy(request)` invocando `updateSession`, con `config.matcher` excluyendo `_next/static`, `_next/image`, `favicon.ico` y archivos estáticos. Verificación: `npm run dev` arranca sin errores; navegar a cualquier ruta existente (`/`, `/juegos`, `/auth`, etc.) no produce errores de conexión a Supabase en la consola del servidor.
4. Limpieza final: `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores.

## Acceptance criteria

- [ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen en `package.json`.
- [ ] `.env.template` documenta `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `.env.local` tiene los valores reales del proyecto `XXXXXXXXXXXXXXX`.
- [ ] `lib/supabase/client.ts` exporta un `createClient()` que usa `createBrowserClient`.
- [ ] `lib/supabase/server.ts` exporta un `createClient()` async que usa `createServerClient` con `cookies()` de `next/headers`.
- [ ] `proxy.ts` existe en la raíz (no `middleware.ts`) e invoca `lib/supabase/proxy.ts::updateSession`, con `matcher` que excluye assets estáticos.
- [ ] `npm run dev` arranca sin errores; navegar por cualquier ruta existente no produce errores de conexión a Supabase en la consola del servidor.
- [ ] Ninguna pantalla existente cambia de comportamiento: `/auth` sigue usando la sesión mock (`av_user`), `/salon-de-la-fama` sigue con datos mock, no hay tablas nuevas en el proyecto.
- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `mcp__supabase__list_tables` sobre el esquema `public` sigue devolviendo cero tablas al terminar este spec.

## Decisions

- **Sí:** este spec es solo la capa de conexión (clientes SSR + refresco de sesión), sin auth real ni tablas. Razón: decisión explícita del usuario — quiere la integración lista como base, sin ampliar el alcance todavía.
- **Sí:** usar `@supabase/ssr` (`createBrowserClient` / `createServerClient`) en vez de `@supabase/auth-helpers-nextjs`. Razón: es el paquete oficial vigente para Next.js App Router; el paquete anterior está deprecado.
- **Sí:** usar `proxy.ts` en vez de `middleware.ts`. Razón: Next.js 16 deprecó `middleware.ts` renombrándolo a `proxy.ts` (confirmado en `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`); el nombre viejo seguiría funcionando pero con warning de deprecación.
- **Sí:** usar la publishable key (`sb_publishable_...`) en vez de la legacy anon key (JWT). Razón: es la recomendación actual de Supabase para apps nuevas; la legacy key se mantiene solo por compatibilidad.
- **No:** crear tabla `profiles` ni ninguna otra. Razón: decisión explícita del usuario — se hará en el spec que implemente autenticación real.
- **No:** tocar `/auth`, `lib/session.tsx` ni el mock `av_user`/`av_scores`. Razón: decisión explícita del usuario — fuera de alcance de este spec.
- **No:** proteger rutas desde `proxy.ts` (redirect si no hay sesión). Razón: no hay auth real todavía; no tiene sentido bloquear rutas.
- **No:** OAuth, modo invitado con Supabase, Realtime, Edge Functions. Razón: fases futuras mencionadas explícitamente por el usuario, cada una en su propio spec.

## Risks

| Riesgo                                                                                                                                                                                                                                      | Mitigación                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Si `.env.local` no tiene `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` completos, `createServerClient` en `proxy.ts` lanza error en cada request (bloquea toda la app, porque el `matcher` cubre casi todas las rutas). | Paso 1 del plan documenta y completa `.env.local` antes de crear `proxy.ts` (paso 3); se verifica con `npm run dev` inmediatamente después. |
| `proxy.ts` corre en (casi) cada request; un `matcher` mal configurado podría bloquear estáticos o rutas innecesarias.                                                                                                                       | Se usa el patrón de exclusión estándar de Supabase/Next (`_next/static`, `_next/image`, `favicon.ico`, assets), verificado en el paso 3.    |

## What is **not** in this spec

- Cualquier tabla en Supabase (`profiles` u otra).
- Autenticación real (`/auth` sigue con el mock `av_user`).
- Migrar `av_scores`/leaderboards a Supabase.
- Protección de rutas.
- OAuth, modo invitado con Supabase, Realtime, Edge Functions.

Cada uno de estos, si se necesita, va en su propio spec.
