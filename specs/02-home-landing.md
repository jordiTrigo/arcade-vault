# SPEC 02 — Home / landing y reubicación de la Biblioteca

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-09-07
> **Objective:** Portar la pantalla de inicio (`home.jsx` de `references/templates/home-about/`) como la nueva landing en `/`, moviendo la Biblioteca actual (hoy en `/`) a `/juegos` y actualizando el `Nav` con los 4 links del prototipo.

## Scope

**In:**

- Nueva landing en `/` portada de `home.jsx`: hero con silhouettes flotantes decorativas, sección "¿POR QUÉ ARCADE VAULT?" (feature grid de 4 tarjetas), sección "JUEGOS DISPONIBLES AHORA" (mini-rail con los primeros 6 juegos de `GAMES`), sección de stats, sección "ACTIVIDAD EN VIVO" (ticker de puntuaciones recientes + top 5 jugadores), sección de precios (plan único gratis + FAQ), CTA final.
- Animaciones `reveal` (scroll-in vía `IntersectionObserver`) igual que en el prototipo.
- Reubicación de la pantalla Biblioteca (hoy en `app/page.tsx` / `/`) a `app/juegos/page.tsx` / `/juegos`, sin cambios de contenido.
- Actualización de `components/nav.tsx` para mostrar 4 links como en `nav.jsx`: **Inicio** (`/`), **Biblioteca** (`/juegos`), **Salón de la Fama** (`/salon-de-la-fama`), **Acerca de** (`/acerca-de`), con el resaltado de link activo correcto para cada ruta, en desktop y en el panel móvil.
- Ajuste de los botones/redirecciones que asumían que `/` era la Biblioteca:
  - `/salon-de-la-fama`: "VOLVER A LA BIBLIOTECA" → `/juegos`.
  - `/auth`: tras iniciar sesión o "JUGAR COMO INVITADO" → `/juegos` (en vez de `/`).
- Estilos: portar a `app/globals.css` las secciones `HOME PAGE`, `ACTIVITY` y `PRICING` de `references/templates/home-about/styles.css` (no existen aún en el proyecto), reutilizando el resto de clases ya portadas en spec 01.

**Out of scope (para otro spec):**

- La pantalla "Acerca de" (`about.jsx`), incluyendo la sección de contacto. El link "Acerca de" se agrega ya en el `Nav` apuntando a `/acerca-de`, pero esa ruta no existe todavía y mostrará la página not-found de Next.js hasta que se implemente en su propio spec.
- Backend real de envío de correo (la sección de contacto ni siquiera se construye aquí).
- Lógica real de juegos, backend, autenticación real, lectura de `av_scores` para leaderboards reales — sigue igual que en spec 01.
- Extraer los datos mock de actividad/top jugadores/stats/FAQ de precios a `lib/data.ts`: quedan inline en el componente Home, igual que en el prototipo.
- Redirects automáticos desde la vieja URL de biblioteca; no se configura ninguna redirección de `/` hacia `/juegos` porque `/` pasa a tener contenido propio (la landing).

## Data model

No se introduce ningún dato nuevo. La sección "JUEGOS DISPONIBLES AHORA" reutiliza `GAMES` de `lib/data.ts` (ya existente desde spec 01), tomando los primeros 6 con `GAMES.slice(0, 6)`. El resto de contenido de la landing (ticker de puntuaciones, top 5 jugadores, stats, FAQ de precios) son arrays estáticos declarados inline dentro de `app/page.tsx`, igual que en `home.jsx`, sin pasar por `lib/data.ts`.

## Implementation plan

1. Crear `app/juegos/page.tsx` con el contenido actual de `app/page.tsx` (Biblioteca, sin cambios de lógica) y actualizar el botón "VOLVER A LA BIBLIOTECA" en `app/salon-de-la-fama/page.tsx` para que navegue a `/juegos`. Verificación: `/juegos` muestra el mismo grid/buscador/chips que antes tenía `/`; el botón en Salón de la Fama lleva a `/juegos`.
2. Añadir a `app/globals.css` las secciones `HOME PAGE` (líneas 930–1069), `ACTIVITY` (1621–1671) y `PRICING` (1672–1730) portadas tal cual de `references/templates/home-about/styles.css`, sin tocar las reglas existentes. Verificación: `npm run build` compila sin errores y `/juegos`, `/salon-de-la-fama` se ven igual que antes.
3. Reescribir `app/page.tsx` (`"use client"`) portando `home.jsx` completo: `FloatingSilhouettes`, `MiniCard`, `FeatureIcon` como componentes locales del archivo; hero con CTAs "EXPLORAR JUEGOS" → `/juegos` y "CREAR CUENTA" → `/auth`; feature grid; mini-rail de `GAMES.slice(0, 6)` (cada tarjeta → `/juego/[id]`) con botón "VER TODOS LOS JUEGOS →" → `/juegos`; stats; actividad en vivo (ticker + top jugadores, con botón "VER SALÓN →" → `/salon-de-la-fama`); precios (price-card + FAQ, botón "EMPEZAR GRATIS →" → `/auth`); CTA final "INSERTAR MONEDA →" → `/juegos`. Verificación: `/` muestra la landing completa, las secciones con clase `reveal` aparecen al hacer scroll, y cada CTA navega a la ruta correcta.
4. Actualizar `components/nav.tsx`: agregar link "Inicio" (`href="/"`), cambiar el link "Biblioteca" para que apunte a `/juegos`, agregar link "Acerca de" (`href="/acerca-de"`), y actualizar `isActive` para las 4 rutas — Inicio exacto en `/`, Biblioteca en `/juegos` y `/juego/*`, Acerca de en `/acerca-de`, Salón y Auth igual que antes. Replicar los mismos 4 links en el panel móvil. Verificación: el Nav muestra los 4 links en desktop y en el menú móvil, y resalta el correcto en cada ruta.
5. Actualizar `app/auth/page.tsx`: cambiar `router.push("/")` por `router.push("/juegos")` tanto al iniciar sesión como al entrar como invitado. Verificación: iniciar sesión o pulsar "JUGAR COMO INVITADO" navega a `/juegos`.
6. Limpieza final: correr `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores.

## Acceptance criteria

- [ ] `/` muestra la nueva landing (hero, silhouettes, feature grid, mini-rail de juegos, stats, actividad en vivo, precios, CTA final) en vez de la Biblioteca.
- [ ] `/juegos` muestra el grid de juegos con buscador y chips de categoría, igual que antes tenía `/`.
- [ ] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/juegos`.
- [ ] "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/auth`.
- [ ] "VER SALÓN →" navega a `/salon-de-la-fama`.
- [ ] Las 6 mini-cards de "JUEGOS DISPONIBLES AHORA" corresponden a los primeros 6 elementos de `GAMES` y cada una navega a `/juego/[id]` al hacer click.
- [ ] Las secciones con clase `reveal` aparecen con animación fade/slide al hacer scroll hasta ellas.
- [ ] El `Nav` muestra 4 links: Inicio, Biblioteca, Salón de la Fama, Acerca de (desktop y menú móvil).
- [ ] El link activo del `Nav` coincide con la ruta actual: Inicio en `/`, Biblioteca en `/juegos` y en `/juego/*`, Salón de la Fama en `/salon-de-la-fama`, Acerca de en `/acerca-de`.
- [ ] Click en "Acerca de" navega a `/acerca-de` y muestra la página not-found de Next.js.
- [ ] Iniciar sesión o pulsar "JUGAR COMO INVITADO" en `/auth` redirige a `/juegos`.
- [ ] El botón "VOLVER A LA BIBLIOTECA" en `/salon-de-la-fama` navega a `/juegos`.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisions

- **Sí:** mover la Biblioteca de `/` a `/juegos` y usar `/` para la nueva landing (Inicio). Razón: decisión explícita del usuario — coincide con el prototipo, donde Inicio y Biblioteca son pantallas separadas en el nav.
- **Sí:** agregar ya el link "Acerca de" → `/acerca-de` en el `Nav`, aunque la pantalla todavía no existe. Razón: decisión explícita del usuario; el 404 es aceptable hasta que se implemente el spec de About.
- **Sí:** los datos mock de actividad, top jugadores, stats y FAQ de precios quedan inline en `app/page.tsx`, igual que en el prototipo. Razón: decisión explícita del usuario — son ejemplos decorativos, no datos reales, y no ameritan una estructura en `lib/data.ts`.
- **Sí:** redirigir login/invitado en `/auth` a `/juegos` en vez de `/`. Razón: consecuencia directa de que `/` deja de ser la Biblioteca; enviar al jugador a la landing de marketing justo después de loguearse no tendría sentido de producto.
- **No:** implementar la pantalla "Acerca de" (`about.jsx`), incluida su sección de contacto. Razón: decisión explícita del usuario — se hará en un spec aparte.
- **No:** backend real de envío de correo. Razón: fuera de alcance — ni siquiera se construye la pantalla de contacto en este spec.
- **No:** extraer los mocks de actividad/pricing a `lib/data.ts`. Razón: decisión explícita del usuario, se mantiene igual que el prototipo.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| El link "Acerca de" del `Nav` apunta a una ruta que no existe (`/acerca-de`) hasta el próximo spec. | Comportamiento aceptado explícitamente por el usuario: muestra el not-found estándar de Next.js hasta implementar ese spec. |
| Las animaciones `reveal` dependen de `IntersectionObserver` en cliente; con JS deshabilitado las secciones quedarían con `opacity: 0`. | Mismo comportamiento que el prototipo original; riesgo aceptado, no se agrega fallback sin JS. |

## What is **not** in this spec

- La pantalla "Acerca de" (`about.jsx`) y su formulario de contacto.
- Backend real de envío de correo.
- Lógica real de los 8 juegos, backend, base de datos o autenticación real (igual que spec 01).
- Lectura de `av_scores` para alimentar leaderboards reales.
- Extraer los mocks de actividad/top jugadores/stats/pricing a `lib/data.ts`.

Cada uno de estos, si se necesita, va en su propio spec.
