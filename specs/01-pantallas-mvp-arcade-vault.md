# SPEC 01 — Pantallas visuales del MVP de Arcade Vault

> **Status:** Approved
> **Depends on:** —
> **Date:** 2026-09-07
> **Objective:** Portar las 5 pantallas del prototipo estático (`references/templates/`) a rutas reales de Next.js App Router, como maqueta visual completa sin lógica de juego real.

## Scope

**In:**

- Las 5 pantallas del prototipo convertidas en rutas reales:
  - Biblioteca (`/`) — grid de juegos con buscador y chips de categoría.
  - Detalle de juego (`/juego/[id]`) — ficha del juego + leaderboard.
  - Reproductor (`/juego/[id]/jugar`) — pantalla de "partida" con HUD, CRT y modal de fin de partida.
  - Autenticación (`/auth`) — tabs de iniciar sesión / crear cuenta + modo invitado.
  - Salón de la Fama (`/salon-de-la-fama`) — podio y tabla de puntuaciones por juego.
- Barra de navegación compartida (`Nav`), con resaltado de link activo, menú hamburguesa móvil (breakpoint 840px), contador de créditos y botón de sesión.
- Módulo de datos mock (`GAMES`, `CATS`, `seededScores`) portado de `data.jsx`.
- Sesión falsa client-side (login/registro/invitado) persistida en `localStorage` bajo la clave `av_user`, igual que el prototipo.
- Guardado de puntuación al final de una partida en `localStorage` bajo la clave `av_scores` (solo escritura, igual que el prototipo).
- Estilos: reutilizar las clases ya portadas en `app/globals.css` (`.av-nav`, `.card`, `.btn`, `.crt`, etc.); usar utilidades de Tailwind 4 solo para lo que esas clases no cubran.
- Responsive según los breakpoints ya definidos en `globals.css` (840px nav, 900px/720px grids).

**Out of scope (para futuros specs):**

- Lógica real de cualquiera de los 8 juegos (bloque-buster, caída, serpentina, glotón, invasores, rocas, ranaria, duelo-pixel). El reproductor conserva el bucle falso de puntuación auto-incremental del prototipo, sin motor de juego real.
- Backend real, base de datos, autenticación real (OAuth). Los botones "GOOGLE" / "GITHUB" quedan como placeholders no funcionales, igual que en el prototipo.
- Leer de vuelta las puntuaciones guardadas en `av_scores` para mostrarlas en algún leaderboard — las tablas siguen usando datos mock (`seededScores`), igual que el prototipo.
- Multijugador, sincronización en la nube, páginas de perfil/ajustes de cuenta.
- Rediseño visual: la estética es un port directo de `globals.css`, ya validado.

## Data model

```ts
// lib/data.ts
type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // clase CSS ya definida en globals.css (cover-bricks, cover-tetro, ...)
  color: "cyan" | "magenta" | "green" | "yellow";
  best: number;
  plays: string;
};

const GAMES: Game[] = [/* 8 juegos, portados de data.jsx */];
const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;

function seededScores(seed: number, count?: number): {
  rank: number; name: string; score: number; date: string;
}[];
```

```ts
// lib/session.tsx — sesión falsa compartida vía React Context
type SessionUser = { name: string } | null;

// useSession() expone: { user: SessionUser, login: (u: SessionUser) => void, logout: () => void }
// Persistencia: localStorage["av_user"], leída en el primer render del provider.
```

```ts
// localStorage["av_scores"] — solo escritura, formato:
// { game: string; score: number; name: string; at: number }[]
```

Convenciones:

- IDs de juego en kebab-case (`bloque-buster`, `duelo-pixel`, ...), igual que el prototipo.
- Los textos de la UI se mantienen en español, igual que el prototipo.

## Implementation plan

1. Crear `lib/data.ts` con `GAMES`, `CATS` y `seededScores` tipados, portados de `data.jsx`. Verificación: `npx tsc --noEmit` sin errores.
2. Crear `lib/session.tsx` (`"use client"`) con `SessionProvider` y el hook `useSession`, respaldado por `localStorage["av_user"]`. Envolver `{children}` en `app/layout.tsx` con el provider. Verificación: `npm run dev` sigue mostrando la página scaffold sin errores en consola.
3. Crear `components/nav.tsx` (`"use client"`), portando `nav.jsx` (usa `usePathname` para el link activo y `useSession` para mostrar usuario/botón de sesión). Añadir `Nav` y el footer (texto de `app.jsx`) en `app/layout.tsx`. Verificación: la barra de navegación y el footer aparecen en todas las rutas (aunque `/juego/*`, `/auth` y `/salon-de-la-fama` todavía den 404).
4. Crear `components/game-card.tsx` (`"use client"`, por el efecto tilt con `onMouseMove`) y reemplazar `app/page.tsx` por la pantalla Biblioteca (`"use client"`, hero, buscador, chips, grid), portando `biblioteca.jsx`. Verificación: `/` muestra los 8 juegos, el buscador filtra por título y los chips filtran por categoría.
5. Crear `app/juego/[id]/page.tsx` (server component) portando `detalle.jsx`; usar `notFound()` si el `id` no existe en `GAMES`. Verificación: `/juego/bloque-buster` muestra ficha, stats y leaderboard; `/juego/no-existe` muestra la página 404 de Next.js.
6. Crear `app/juego/[id]/jugar/page.tsx` (`"use client"`) portando `reproductor.jsx`: HUD, pantalla CRT, pausa, subida de nivel, modal de fin de partida que guarda en `localStorage["av_scores"]`. Verificación: jugar, pausar, terminar y guardar puntuación funcionan visualmente como en el prototipo.
7. Crear `app/auth/page.tsx` (`"use client"`) portando `auth.jsx`, usando `useSession().login` y redirigiendo a `/` con `useRouter().push` tras iniciar sesión o entrar como invitado. Verificación: iniciar sesión actualiza el nombre en el `Nav`; cerrar sesión desde el `Nav` vuelve a mostrar "Iniciar Sesión".
8. Crear `app/salon-de-la-fama/page.tsx` (`"use client"`) portando `salon.jsx`: tabs por juego, podio (top 3) y tabla completa, con fila extra "TU MEJOR MARCA" cuando hay sesión iniciada. Verificación: cambiar de tab actualiza podio y tabla; la fila "TU MEJOR MARCA" solo aparece logueado.
9. Limpieza final: eliminar el scaffold de `create-next-app` que quede sin usar (p. ej. referencias a `next.svg`/`vercel.svg` si ya no se usan) y correr `npm run lint` y `npm run build`. Verificación: ambos comandos terminan sin errores.

## Acceptance criteria

- [ ] `npm run dev` arranca sin errores y `/` muestra el grid de juegos con buscador y chips de categoría.
- [ ] Escribir en el buscador filtra las tarjetas visibles por título (sin distinguir mayúsculas/minúsculas).
- [ ] Pulsar un chip de categoría filtra las tarjetas; "TODOS" muestra todas.
- [ ] Pulsar una tarjeta o su botón "JUGAR" navega a `/juego/[id]`.
- [ ] `/juego/[id]` muestra portada, descripción, stats y un leaderboard de 10 filas.
- [ ] Un id de juego inválido (p. ej. `/juego/no-existe`) muestra la página not-found de Next.js.
- [ ] "JUGAR AHORA" navega a `/juego/[id]/jugar`.
- [ ] En el reproductor, la puntuación sube automáticamente cada ~220ms mientras no está en pausa.
- [ ] Pulsar "PAUSA" detiene la puntuación y muestra el overlay "EN PAUSA"; pulsar "REANUDAR" la reanuda.
- [ ] Pulsar "FIN" abre el modal de fin de partida con la puntuación final.
- [ ] Guardar el nombre en el modal de fin de partida muestra la confirmación "PUNTUACIÓN GUARDADA" y escribe una entrada en `localStorage["av_scores"]`.
- [ ] `/auth` muestra los tabs de iniciar sesión / crear cuenta; enviar el formulario de inicio de sesión loguea y redirige a `/`, y el `Nav` muestra el nombre introducido.
- [ ] "JUGAR COMO INVITADO" navega a `/` sin dejar sesión iniciada.
- [ ] Pulsar el botón de usuario en el `Nav` cierra sesión y vuelve a mostrar "Iniciar Sesión".
- [ ] `/salon-de-la-fama` muestra podio (top 3) y tabla completa para el primer juego por defecto, y cambiar de tab actualiza ambos.
- [ ] Con sesión iniciada, `/salon-de-la-fama` muestra una fila extra "TU MEJOR MARCA".
- [ ] Por debajo de 840px de ancho, el menú hamburguesa abre el panel lateral con los mismos links de navegación.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisions

- **Sí:** conservar el bucle falso de puntuación del reproductor (`reproductor.jsx`) tal cual. Razón: decisión explícita del usuario — da sensación de interactividad sin implementar ningún motor de juego real.
- **Sí:** sesión (`av_user`) y guardado de puntuación (`av_scores`) client-side vía `localStorage`, sin backend. Razón: este spec es solo la capa visual; persistencia/autenticación real queda para otro spec.
- **Sí:** rutas en español con slugs de juego (`/juego/[id]`, `/juego/[id]/jugar`, `/auth`, `/salon-de-la-fama`). Razón: coincide con la copy en español de toda la app.
- **Sí:** reutilizar las clases ya portadas en `app/globals.css` en vez de reescribir con utilidades Tailwind. Razón: el diseño ya está migrado y validado visualmente; usar Tailwind solo para lo que falte evita duplicar trabajo.
- **Sí:** usar un React Context (`lib/session.tsx`) para la sesión en vez de pasar props manualmente. Razón: con App Router no existe un componente raíz único (como `App.jsx` en el prototipo) que pueda repartir el estado por props; `Nav` vive en el layout y las páginas viven en rutas separadas.
- **No:** implementar lógica real de juego para ninguno de los 8 juegos. Razón: pedido explícito del usuario — este spec es solo la parte visual.
- **No:** autenticación real, base de datos o backend. Razón: fuera de alcance de este MVP visual; los botones sociales quedan como placeholders.
- **No:** leer `av_scores` para alimentar leaderboards reales. Razón: el prototipo tampoco lo hace; los leaderboards son mock (`seededScores`).

## Risks

| Riesgo | Mitigación |
| --- | --- |
| `localStorage` deshabilitado (navegación privada) | La sesión y el guardado de puntuación simplemente no persisten entre recargas; no bloquea ninguna pantalla porque es un mock decorativo, igual que en el prototipo. |

## What is **not** in this spec

- Lógica real de los 8 juegos.
- Backend, base de datos o autenticación real.
- Lectura de `av_scores` para leaderboards reales.
- Multijugador, sincronización en la nube, perfil/ajustes de cuenta.
- Rediseño visual más allá del port ya hecho en `globals.css`.

Cada uno de estos, si se necesita, va en su propio spec.
