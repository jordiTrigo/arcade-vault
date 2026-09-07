# SPEC 03 — Página "Acerca de" y envío de correo de contacto con Resend

> **Status:** Approved
> **Depends on:** SPEC 02
> **Date:** 2026-09-07
> **Objective:** Portar la pantalla "Acerca de" (`about.jsx` de `references/templates/home-about/`) a `/acerca-de`, con su formulario de contacto enviando correos reales vía Resend a través de un Route Handler.

## Scope

**In:**

- Nueva ruta `app/acerca-de/page.tsx` que porta `about.jsx` completo: hero "ACERCA DE ARCADE VAULT" con misión y fila de 3 highlights (con sus iconos SVG pixelados), banner divisor animado, y sección de contacto con el formulario.
- Animaciones `reveal` (scroll-in vía `IntersectionObserver`) igual que en el resto del sitio portado en specs anteriores.
- Envío real de correo: al enviar el formulario, se hace `fetch` a un nuevo Route Handler `app/api/contact/route.ts`, que valida los datos y llama a la API de Resend server-side para enviar el mensaje a `XXXXX@gmail.com`, con `Reply-To` igual al email escrito en el formulario.
- Validación: los 3 campos (nombre, email, mensaje) no vacíos, más formato de email válido — tanto en cliente (antes de enviar) como en el Route Handler (antes de llamar a Resend).
- Estados del formulario: edición (inicial) → enviando (loading real mientras se espera la respuesta del `fetch`) → éxito (pantalla terminal del prototipo, con los pasos mostrados ya confirmados al recibir OK) → error (mensaje inline en estilo terminal, el formulario vuelve a ser editable sin perder lo escrito, permitiendo reintentar).
- Instalar la dependencia `resend` (`npm install resend`).
- Configuración de credenciales: `RESEND_API_KEY` en `.env.local` (git-ignorado; ya cubierto por `.gitignore`), más un `.env.template` documentando la variable para que cualquiera que clone el repo sepa qué debe definir.
- Remitente: se usa el remitente de pruebas de Resend (`onboarding@resend.dev`) en modo sandbox — no se configura dominio propio verificado.
- Estilos: portar a `app/globals.css` la sección `ABOUT PAGE` (líneas 1071–1150) de `references/templates/home-about/styles.css`, que no existe aún en el proyecto.

**Out of scope (para otro spec):**

- Verificación de un dominio propio en Resend y cambio del remitente `from` a una dirección propia (ej. `contacto@arcadevault.com`). Mientras tanto, en modo sandbox, Resend solo permite entregar a la dirección de correo verificada del dueño de la cuenta — limitación conocida y aceptada para este spec.
- Persistencia de los mensajes de contacto en base de datos o archivo — el mensaje solo se envía por correo; si Resend confirma el envío, se considera entregado y no se guarda copia en el servidor.
- Protección anti-spam (honeypot, rate limiting, CAPTCHA) — se puede añadir después si se vuelve un problema real.
- Cambios al `Nav` — ya apunta a `/acerca-de` y resalta el link activo correctamente desde spec 02, no requiere cambios.
- Cualquier backend, base de datos o autenticación real ajena al envío de este correo (sigue igual que specs anteriores).

## Data model

No se introduce ningún dato persistente nuevo (no hay base de datos ni tabla). El único "dato" nuevo es la forma del payload que viaja entre el formulario y el Route Handler:

```ts
// Request body de POST /api/contact
type ContactPayload = {
  name: string;
  email: string;
  msg: string;
};

// Response de POST /api/contact
type ContactResponse =
  | { ok: true }
  | { ok: false; error: string };
```

`RESEND_API_KEY` se lee server-side desde `process.env.RESEND_API_KEY` dentro del Route Handler; nunca se expone al cliente.

## Implementation plan

1. `npm install resend`. Crear `.env.template` con `RESEND_API_KEY=` (comentario explicando que se obtiene en https://resend.com/api-keys) y crear `.env.local` con el mismo placeholder vacío para que el usuario complete su clave real. Verificación: `npm run build` sigue funcionando (la ausencia de clave real aún no rompe el build, solo fallaría en runtime al enviar).
2. Añadir a `app/globals.css` la sección `ABOUT PAGE` (líneas 1071–1150) portada tal cual de `references/templates/home-about/styles.css`, sin tocar las reglas existentes. Verificación: `npm run build` compila sin errores.
3. Crear `app/api/contact/route.ts` con un `export async function POST(request: Request)`: parsea el JSON body, valida `name`/`email`/`msg` no vacíos y formato de email con una regex simple; si la validación falla, responde `400` con `{ ok: false, error: "..." }`; si pasa, instancia `new Resend(process.env.RESEND_API_KEY)` y llama a `resend.emails.send({ from: "Arcade Vault <onboarding@resend.dev>", to: "XXXXX@gmail.com", replyTo: email, subject: "Nuevo mensaje de contacto — Arcade Vault", text: ... })`; si Resend devuelve error, responde `500` con `{ ok: false, error: "..." }`; si tiene éxito, responde `200` con `{ ok: true }`. Verificación: probar con `curl -X POST localhost:3000/api/contact -H "Content-Type: application/json" -d '{"name":"Test","email":"test@test.com","msg":"hola"}'` y confirmar que llega el correo a `XXXXX@gmail.com` (una vez la API key real esté en `.env.local`) o que responde error controlado si la key no está configurada.
4. Crear `app/acerca-de/page.tsx` (`"use client"`) portando `about.jsx`: hero con misión y highlights (`HighlightIcon` como componente local del archivo), divisor animado, sección de contacto con el formulario. El `onSubmit` valida campos (no vacíos + formato de email) igual que el prototipo pero, si pasa, en vez de `setSent` directo hace `fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })` mostrando un estado de carga en el botón mientras espera; según la respuesta, pasa a estado éxito (pantalla terminal del prototipo) o estado error (línea roja tipo terminal con el mensaje, formulario vuelve a ser editable). Verificación: `/acerca-de` muestra la pantalla completa, las secciones `reveal` animan al hacer scroll, y el formulario recorre los 4 estados (edición, enviando, éxito, error) correctamente.
5. Limpieza final: correr `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores.

## Acceptance criteria

- [ ] `/acerca-de` muestra el hero "ACERCA DE ARCADE VAULT" con la misión y los 3 highlights (HECHO CON ❤️, JUEGOS EN HTML, PROYECTO EN CRECIMIENTO).
- [ ] El banner divisor animado aparece entre el hero y la sección de contacto.
- [ ] La sección de contacto muestra el formulario con campos Nombre, Correo electrónico y Mensaje, y los 3 tips (respuesta en 24-48h, sugerencias bienvenidas, sin spam).
- [ ] Enviar el formulario con algún campo vacío dispara el "shake" del formulario sin llamar al backend.
- [ ] Enviar el formulario con un email con formato inválido (ej. `"noesunemail"`) muestra un error de validación sin llamar al backend.
- [ ] Enviar el formulario con datos válidos hace `POST /api/contact`, muestra un estado de carga mientras espera respuesta, y si Resend confirma el envío, la sección se reemplaza por la pantalla terminal de éxito del prototipo con el nombre en mayúsculas.
- [ ] Si `POST /api/contact` responde error (simulable quitando/invalidando `RESEND_API_KEY`), se muestra un mensaje de error inline en estilo terminal y el formulario permanece editable con los datos que el usuario ya había escrito.
- [ ] El botón "ENVIAR OTRO MENSAJE" tras un envío exitoso limpia el formulario y vuelve al estado de edición.
- [ ] Con `RESEND_API_KEY` real configurada en `.env.local`, un envío exitoso hace llegar un correo a `XXXXX@gmail.com` con `Reply-To` igual al email del formulario.
- [ ] Las secciones con clase `reveal` de `/acerca-de` animan al hacer scroll, igual que en el resto del sitio.
- [ ] El link "Acerca de" del `Nav` (desktop y móvil) sigue resaltándose correctamente al estar en `/acerca-de` (ya funciona desde spec 02, se verifica que no se rompió).
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisions

- **Sí:** usar un Route Handler (`app/api/contact/route.ts`) en vez de una Server Action. Razón: decisión explícita del usuario — patrón estándar y explícito de Next.js App Router para este tipo de integración.
- **Sí:** usar el remitente sandbox de Resend (`onboarding@resend.dev`) sin dominio propio verificado. Razón: decisión explícita del usuario — permite dejar el flujo funcionando ya; se sabe que en sandbox Resend solo entrega al email verificado del dueño de la cuenta.
- **Sí:** destino fijo `XXXXX@gmail.com`. Razón: decisión explícita del usuario.
- **Sí:** mostrar loading real mientras se espera la respuesta del `fetch`, y al recibir éxito mostrar la pantalla terminal del prototipo con los pasos ya confirmados. Razón: decisión explícita del usuario — más honesto que animar pasos falsos que no reflejan el estado real de la red.
- **Sí:** mostrar un estado de error inline (estilo terminal, formulario editable, permite reintentar) si el envío falla. Razón: decisión explícita del usuario — el prototipo no contemplaba fallos porque no tenía backend real; ahora que lo hay, un error silencioso confundiría al jugador.
- **Sí:** validar formato de email además de campos no vacíos, en cliente y en el Route Handler. Razón: decisión explícita del usuario — evita envíos claramente inválidos antes de gastar la llamada a Resend.
- **Sí:** `Reply-To` = email del formulario. Razón: decisión explícita del usuario — permite responder directo desde el cliente de correo sin copiar/pegar la dirección del jugador.
- **No:** persistir los mensajes de contacto en base de datos o archivo. Razón: decisión explícita del usuario — no hay base de datos en el proyecto todavía, y el correo entregado por Resend ya es el registro.
- **No:** protección anti-spam (honeypot, rate limiting, CAPTCHA). Razón: decisión explícita del usuario — MVP, se evalúa después si se vuelve un problema real.
- **No:** verificar dominio propio en Resend en este spec. Razón: decisión explícita del usuario — requiere acceso a DNS del dominio real, se hace en otro momento cuando el dominio esté listo.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| En modo sandbox, Resend rechaza (o no entrega) correos si el `to` no es la dirección verificada del dueño de la cuenta. | Se documenta como limitación conocida en el spec; `XXXXX@gmail.com` debe ser la dirección verificada en el dashboard de Resend para que funcione en sandbox. Se resuelve verificando un dominio propio en un spec futuro. |
| Si `RESEND_API_KEY` no está configurada (o es inválida) en `.env.local`, todo intento de envío falla. | Comportamiento esperado: el Route Handler responde `500` con error controlado y el formulario muestra el estado de error inline, sin romper la página. |
| Las animaciones `reveal` dependen de `IntersectionObserver` en cliente; con JS deshabilitado las secciones quedarían con `opacity: 0`. | Mismo comportamiento aceptado en specs anteriores del proyecto; no se agrega fallback sin JS. |

## What is **not** in this spec

- Verificación de dominio propio en Resend y cambio de remitente `from`.
- Persistencia de mensajes de contacto en base de datos o archivo.
- Protección anti-spam (honeypot, rate limiting, CAPTCHA).
- Cambios al `Nav` (ya está resuelto desde spec 02).
- Cualquier backend, base de datos o autenticación real ajena al envío de este correo.

Cada uno de estos, si se necesita, va en su propio spec.
