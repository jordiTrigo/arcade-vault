# ENGINE — `lib/games/invasores/engine.ts`

> **Status:** Draft
> **Spec de integración:** [spec.md](./spec.md) · **Game design:** [design.md](./design.md)
> **Date:** 2026-09-10

## Firma de la factory

```ts
export function createInvadersGame(ctx: CanvasRenderingContext2D, skin: InvadersSkin): InvadersGame;

export type InvadersState = {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
};

export type InvadersGame = {
  isPaused: boolean;
  update(dt: number): void;
  draw(): void;
  getState(): InvadersState;
  reset(): void;
  setPaused(v: boolean): void;
  setSkin(next: InvadersSkin): void;
  keyDown(code: string): void;
  keyUp(code: string): void;
};
```

Un solo `ctx`, un solo canvas de 800×600. Sin React, sin `document`, sin `getComputedStyle`: los
colores nunca son literales sueltos — vienen todos de `skin: InvadersSkin`
(`lib/games/invasores/skin.ts`, contrato `SkinRoles` de `lib/games/skins.ts`; ver tabla de paleta por
skin en `design.md`). `skin` entra como último parámetro de la factoría y se guarda en closure
(`let skin = initialSkin`, nunca variable de módulo); `setSkin(next)` la reemplaza sin tocar
`score`/`lives`/`level`/`isPaused` ni las posiciones en juego, para poder cambiar de skin en medio de
una partida sin resetearla. El tipo `InvadersState` es estructuralmente idéntico a
`GameEngineState` de `lib/games/registry.ts`; el contrato no se amplía y `"win"` no se emite nunca.

## Estado en closure

Todo dentro del cuerpo de `createInvadersGame`, nunca como variable de módulo, para soportar remount y React StrictMode.

| Campo            | Tipo                                    | Rol                                                          |
| ---------------- | --------------------------------------- | ------------------------------------------------------------ |
| `cannonX`        | `number`                                | Centro horizontal del cañón                                  |
| `keysHeld`       | `Set<string>`                           | Teclas de movimiento mantenidas                              |
| `firePressed`    | `boolean`                               | Flanco de `Space` consumido en el próximo `update`           |
| `aliens`         | `Alien[]`                               | Los 55 alienígenas, índice = `row * COLS + col`              |
| `alienDir`       | `1 \| -1`                               | Dirección horizontal vigente del bloque                      |
| `formationX`     | `number`                                | Desplazamiento horizontal acumulado del bloque               |
| `formationY`     | `number`                                | Altura actual del bloque                                     |
| `stepAccum`      | `number`                                | Segundos acumulados hacia el próximo salto                   |
| `animFrame`      | `0 \| 1`                                | Fotograma de aleteo, alterna en cada salto                   |
| `playerBullet`   | `Bullet \| null`                        | Única bala propia en vuelo                                   |
| `enemyBullets`   | `Bullet[]`                              | Balas enemigas activas                                       |
| `enemyFireAccum` | `number`                                | Segundos hasta el próximo intento de disparo enemigo         |
| `ufo`            | `Ufo`                                   | OVNI activo o `null`                                         |
| `ufoAccum`       | `number`                                | Segundos hasta la próxima aparición del OVNI                 |
| `bunkers`        | `BunkerCell[]`                          | 4 grillas de 5×8 booleanos                                   |
| `explosions`     | `{ x: number; y: number; t: number }[]` | Partículas de impacto, `t` decreciente en segundos           |
| `stars`          | `{ x: number; y: number; r: number }[]` | Campo de estrellas, generado una vez en la factory           |
| `score`          | `number`                                | Puntuación acumulada                                         |
| `lives`          | `number`                                | Cañones restantes (3 → 0)                                    |
| `level`          | `number`                                | Oleada actual (1..n)                                         |
| `status`         | `InvadersState["status"]`               | Estado del contrato                                          |
| `deathTimer`     | `number`                                | Segundos restantes de la explosión del cañón, 0 si no aplica |
| `isPaused`       | `boolean`                               | Propiedad pública del objeto devuelto                        |

```ts
type Alien = { col: number; row: number; alive: boolean; type: 0 | 1 | 2 };
type Bullet = { x: number; y: number; vy: number };
type Ufo = { x: number; vx: number; value: number } | null;
type BunkerCell = boolean[][]; // [fila][columna]
```

Los sprites de alienígena viven como constantes de módulo **inmutables** (arrays de strings de `0`/`1`, 11×8, dos fotogramas por tipo). Son datos de solo lectura compartidos, no estado, así que su lugar fuera de la closure es correcto.

## Unidades de `dt`

**Segundos, con clamp `Math.min(dt, 0.05)` aplicado en `InvadersCanvas.tsx`** — el mismo esquema de `asteroides` y `arkanoid`.

Justificación: la mayoría de las entidades del juego son movimiento continuo con velocidad en px/s (cañón, bala propia, balas enemigas, OVNI, temporizador de explosión). Solo la formación avanza a pasos discretos, y eso se resuelve con un acumulador dentro del propio motor:

```ts
stepAccum += dt;
const interval = currentStepInterval(); // segundos, depende de vivos y level
if (stepAccum >= interval) {
  stepAccum -= interval;
  stepFormation();
}
```

Un acumulador en milisegundos crudos (estilo `tetris`/`snake`) obligaría a dividir por 1000 en cada una de las cinco integraciones continuas del juego, que son mayoría. El clamp a 50 ms evita que una pestaña en background haga saltar varias posiciones de golpe; el `stepAccum` se resta (no se pone en cero) para que el ritmo del bloque no derive con frames irregulares.

## Pseudo-estructura de `update(dt)`

```
update(dt):
  if isPaused: return
  if status == "gameover": return

  if deathTimer > 0:                    # explosión del cañón, todo congelado salvo el timer
     deathTimer -= dt
     if deathTimer <= 0:
        if lives <= 0: status = "gameover"
        else:          respawnCannon(); status = "playing"
     return

  # 1. cañón
  mover cannonX según keysHeld, clamp a [CANNON_HALF, W - CANNON_HALF]
  if firePressed and playerBullet == null:
     playerBullet = nueva bala en la boca del cañón
  firePressed = false

  # 2. formación (pasos discretos)
  stepAccum += dt
  if stepAccum >= currentStepInterval():
     stepAccum -= currentStepInterval()
     animFrame ^= 1
     si el vivo más lateral tocaría el borde:
        formationY += DROP_STEP; alienDir *= -1
     si no:
        formationX += alienDir * STEP_PX
     if bottomAliveY() >= DEFENSE_LINE_Y: status = "gameover"; return

  # 3. disparo enemigo
  enemyFireAccum -= dt
  if enemyFireAccum <= 0 and enemyBullets.length < maxEnemyBullets():
     col = columna viva al azar; alien = el más bajo de esa columna
     enemyBullets.push(bala desde alien)
     enemyFireAccum = ENEMY_FIRE_INTERVAL / (1 + 0.1 * (level - 1))

  # 4. OVNI
  ufoAccum -= dt
  if ufo == null and ufoAccum <= 0: ufo = spawnUfo()
  if ufo: ufo.x += ufo.vx * dt; si sale de pantalla -> ufo = null, ufoAccum = UFO_INTERVAL

  # 5. proyectiles
  mover playerBullet y enemyBullets por vy * dt; descartar los que salen del canvas

  # 6. colisiones (en este orden)
  playerBullet vs ufo        -> score += ufo.value * level
  playerBullet vs alien      -> índice de celda de la formación, no barrido lineal
                                alien.alive = false; score += VALUES[type] * level; explosión
  playerBullet vs bunker     -> apagar celda + vecinas
  enemyBullet  vs bunker     -> apagar celda + vecinas
  enemyBullet  vs cannon     -> lives -= 1; deathTimer = DEATH_TIME; status = "dead";
                                limpiar balas
  alien vivo   vs bunker     -> apagar celdas que la formación atraviesa

  # 7. fin de oleada
  if ningún alien vivo:
     score += 1000 * level + 100 * lives
     level += 1
     resetWave(level)         # formación nueva, búnkeres reconstruidos, balas limpias

  # 8. explosiones
  decrementar t de cada explosión, descartar las agotadas
```

`currentStepInterval()`:

```
ratio = aliveCount / TOTAL_ALIENS                     # 1.0 -> 0.0
base  = STEP_INTERVAL_MIN + (STEP_INTERVAL_MAX - STEP_INTERVAL_MIN) * ratio
return max(STEP_INTERVAL_FLOOR, base / (1 + 0.12 * (level - 1)))
```

## Pseudo-estructura de `draw()`

Orden de dibujado, de atrás hacia adelante:

```
draw():
  limpiar canvas con BG
  dibujar stars (puntos tenues, estáticos)
  dibujar línea de defensa punteada
  dibujar búnkeres (solo celdas true)
  dibujar aliens vivos (matriz de bits del tipo + animFrame, escala PIXEL)
  dibujar ufo si existe
  dibujar cañón (salvo durante deathTimer, donde se dibuja la explosión)
  dibujar playerBullet y enemyBullets
  dibujar explosiones
  dibujar HUD nativo: score (izq), OLEADA n (centro), vidas como iconos de cañón (der)
  if isPaused:            overlay "EN PAUSA"
  if status == "gameover": overlay "GAME OVER" + score final
```

`draw()` no muta estado, ni siquiera contadores de animación: `animFrame` se alterna en `update`. `shadowBlur` se activa por grupo de elementos y se restaura a 0 al final de cada grupo, para no arrastrar el halo a los textos del HUD.

## Mapeo a `GameEngineState`

```ts
getState(): InvadersState {
  return { score, lives, level, status };
}
```

| Campo del contrato | Origen                                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `score`            | Acumulador entero: alienígenas + OVNI + bonus de oleada + bonus de vidas. Nunca decrece.                                                                                      |
| `lives`            | Cañones restantes, arranca en `3`, baja de a 1 por impacto enemigo.                                                                                                           |
| `level`            | Número de oleada, arranca en `1`, sube al limpiar la formación. Sin techo.                                                                                                    |
| `status`           | `"playing"` normal; `"dead"` mientras corre `deathTimer` con vidas restantes; `"gameover"` al agotar vidas o al cruzar la formación la línea de defensa. `"win"` no se emite. |

`InvadersCanvas.tsx` compara los cuatro campos con el frame anterior (`lastStateRef`) y solo llama `onStateChangeRef.current(state)` cuando alguno difiere.

## Modelo de pausa

`setPaused(v: boolean)` es la **única** fuente de verdad. Escribe el flag público `isPaused`, que `update(dt)` lee en su primera línea y del que sale sin tocar nada más. No hay tecla nativa de pausa: `KeyP` no está en la lista de teclas reconocidas, precisamente para que el botón `PAUSA` de React no pueda desincronizarse del motor.

`draw()` **sí** sigue ejecutándose en pausa (el rAF de React nunca se cancela), de modo que la pantalla queda congelada y encima se dibuja el overlay "EN PAUSA". Al reanudar, `InvadersCanvas.tsx` pone `lastTimeRef.current = null` **antes** de `setPaused(false)`, así el primer frame tras la pausa calcula `dt = 0` y ni la formación ni las balas dan un salto proporcional al tiempo transcurrido.

`reset()` reconstruye el estado inicial completo (formación de oleada 1, búnkeres intactos, `score = 0`, `lives = 3`, `level = 1`, `status = "playing"`, acumuladores en cero, `keysHeld` vaciado) y deja `isPaused` en `false`. El campo de estrellas se conserva: es decorado, no estado de partida.

## Superficie de input

```ts
keyDown(code: string): void
keyUp(code: string): void
```

| `code`               | Efecto                                                                  |
| -------------------- | ----------------------------------------------------------------------- |
| `ArrowLeft`, `KeyA`  | `keysHeld.add(code)` — movimiento continuo mientras se mantiene         |
| `ArrowRight`, `KeyD` | `keysHeld.add(code)` — movimiento continuo mientras se mantiene         |
| `Space`              | `firePressed = true` si no estaba ya presionada — flanco, no auto-fuego |
| Cualquier otro       | Ignorado                                                                |

`keyUp` remueve de `keysHeld` y, para `Space`, libera el flanco para permitir el próximo disparo. La distinción entre tecla mantenida y flanco es la misma que en `lib/games/asteroides/engine.ts`.

`InvadersCanvas.tsx` registra `keydown`/`keyup` en `window` y llama `preventDefault()` **solo** para las cinco teclas del juego (`["ArrowLeft","ArrowRight","KeyA","KeyD","Space"]`), para no romper el scroll ni la navegación por teclado del resto de la página.

**Sin `pointerMove(x)`**: el juego no acepta input de puntero. No hay listeners sobre el `<canvas>`, así que tampoco hace falta escalar coordenadas con `getBoundingClientRect()` pese a que el canvas se renderiza estirado a `width: 100%`.

## Gate de carga asíncrona

**No aplica.** El motor no carga ningún asset: alienígenas, cañón, OVNI, búnkeres y estrellas se dibujan con primitivas y matrices de bits definidas en el propio `engine.ts`. El loop de `requestAnimationFrame` arranca de forma síncrona en el `useEffect([])` de montaje, sin estado de "cargando" ni guard contra unmount durante la carga.

## Tabla de constantes de balance

```ts
// lib/games/invasores/engine.ts
```

| Constante               | Valor                 | Unidad | Significado                                                    |
| ----------------------- | --------------------- | ------ | -------------------------------------------------------------- |
| `W`                     | 800                   | px     | Ancho del canvas                                               |
| `H`                     | 600                   | px     | Alto del canvas                                                |
| `COLS`                  | 11                    | —      | Columnas de la formación                                       |
| `ROWS`                  | 5                     | —      | Filas de la formación                                          |
| `TOTAL_ALIENS`          | 55                    | —      | `COLS * ROWS`                                                  |
| `CELL_W`                | 48                    | px     | Ancho de celda de formación                                    |
| `CELL_H`                | 40                    | px     | Alto de celda de formación                                     |
| `PIXEL`                 | 3                     | px     | Escala de la matriz de bits (sprite 11×8 → 33×24)              |
| `FORMATION_START_X`     | 136                   | px     | Margen izquierdo inicial del bloque                            |
| `FORMATION_START_Y`     | 90                    | px     | Altura inicial del bloque en la oleada 1                       |
| `START_Y_PER_LEVEL`     | 16                    | px     | Cuánto más abajo nace la formación por oleada                  |
| `START_Y_MAX`           | 210                   | px     | Tope de altura inicial, nunca por debajo de los búnkeres       |
| `STEP_PX`               | 12                    | px     | Avance horizontal por salto del bloque                         |
| `DROP_STEP`             | 20                    | px     | Descenso al tocar un borde                                     |
| `STEP_INTERVAL_MAX`     | 0.75                  | s      | Intervalo entre saltos con los 55 vivos                        |
| `STEP_INTERVAL_MIN`     | 0.09                  | s      | Intervalo entre saltos con 1 vivo (antes del factor de oleada) |
| `STEP_INTERVAL_FLOOR`   | 0.05                  | s      | Piso duro que ninguna oleada puede atravesar                   |
| `LEVEL_SPEED_FACTOR`    | 0.12                  | —      | Aceleración por oleada: `interval / (1 + f × (level - 1))`     |
| `DEFENSE_LINE_Y`        | 500                   | px     | Cruzarla con un alien vivo es `gameover` inmediato             |
| `CANNON_Y`              | 540                   | px     | Altura fija del cañón                                          |
| `CANNON_W`              | 52                    | px     | Ancho del cañón                                                |
| `CANNON_H`              | 26                    | px     | Alto del cañón                                                 |
| `CANNON_SPEED`          | 320                   | px/s   | Velocidad horizontal del cañón                                 |
| `PLAYER_BULLET_SPEED`   | 620                   | px/s   | Velocidad de la bala propia (hacia arriba)                     |
| `ENEMY_BULLET_SPEED`    | 260                   | px/s   | Velocidad base de las balas enemigas (hacia abajo)             |
| `ENEMY_SPEED_PER_LEVEL` | 20                    | px/s   | Incremento de velocidad de bala enemiga por oleada             |
| `ENEMY_FIRE_INTERVAL`   | 1.1                   | s      | Intervalo base entre intentos de disparo enemigo               |
| `ENEMY_BULLETS_BASE`    | 2                     | —      | Balas enemigas simultáneas en la oleada 1                      |
| `ENEMY_BULLETS_MAX`     | 5                     | —      | Tope de balas enemigas simultáneas                             |
| `BUNKER_COUNT`          | 4                     | —      | Cantidad de búnkeres                                           |
| `BUNKER_COLS`           | 8                     | —      | Celdas por fila de búnker                                      |
| `BUNKER_ROWS`           | 5                     | —      | Filas de celdas por búnker                                     |
| `BUNKER_CELL`           | 8                     | px     | Lado de cada celda de búnker (búnker = 64×40 px)               |
| `BUNKER_Y`              | 460                   | px     | Altura superior de los búnkeres                                |
| `UFO_INTERVAL`          | 22                    | s      | Tiempo entre apariciones del OVNI                              |
| `UFO_SPEED`             | 140                   | px/s   | Velocidad de cruce del OVNI                                    |
| `UFO_Y`                 | 56                    | px     | Altura de la franja del OVNI                                   |
| `UFO_VALUES`            | `[50, 100, 150, 300]` | pts    | Valores posibles del OVNI, sorteados (antes de × `level`)      |
| `ALIEN_VALUES`          | `[30, 20, 10]`        | pts    | Valor por tipo 0/1/2 (antes de × `level`)                      |
| `WAVE_BONUS`            | 1000                  | pts    | Bonus por limpiar la oleada (antes de × `level`)               |
| `LIFE_BONUS`            | 100                   | pts    | Bonus por vida restante al completar la oleada                 |
| `INITIAL_LIVES`         | 3                     | —      | Cañones al empezar                                             |
| `DEATH_TIME`            | 0.9                   | s      | Duración de la explosión del cañón antes de reaparecer         |
| `EXPLOSION_TIME`        | 0.25                  | s      | Duración de la explosión de un alienígena                      |
