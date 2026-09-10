# DESIGN — INVASORES

> **Status:** Draft
> **Spec de integración:** [spec.md](./spec.md) · **Arquitectura del motor:** [engine.md](./engine.md)
> **Tema del jam:** invasores
> **Date:** 2026-09-10

## Pitch

Sos lo único que queda entre la superficie y una marea de invasores que baja en formación cerrada: cada disparo tuyo abre un hueco, cada disparo suyo te come el refugio.

## Mecánica núcleo

El jugador controla un cañón que solo se desplaza en horizontal sobre la línea inferior del canvas. Enfrente tiene una **formación de 55 alienígenas** (5 filas × 11 columnas) que se comporta como un único cuerpo rígido.

**El bloque.** La formación no se mueve de forma continua: avanza a **saltos discretos** de 12 px en la dirección vigente. Cuando el alienígena vivo más lateral toca el margen del canvas, todo el bloque **baja un escalón de 20 px** e invierte la dirección. El intervalo entre saltos no es fijo: depende de cuántos alienígenas quedan vivos. Con los 55 en pie el bloque es lento y pesado; con los últimos tres es un enjambre nervioso. Esa aceleración es la tensión central del juego, y no requiere ninguna curva de dificultad artificial: la produce el propio jugador al ir matando.

**El disparo del jugador.** Una sola bala propia puede estar en vuelo a la vez. Es la restricción que define el ritmo: no se puede ametrallar, cada tiro es una apuesta y hay que esperar a que impacte o salga de pantalla. Un tiro largo hacia la fila superior deja al jugador desarmado durante casi medio segundo.

**El disparo enemigo.** Solo el alienígena **más bajo de su columna** puede disparar, y las columnas se eligen al azar entre las que tienen al menos un vivo. El número máximo de balas enemigas simultáneas crece con la oleada (2 en la primera, hasta un tope de 5). Las balas enemigas caen en línea recta, más lento que las del jugador, lo que las hace esquivables pero obliga a leer el tablero mientras se apunta.

**Los búnkeres.** Cuatro refugios de 64×40 px separan al cañón de la formación. Internamente son una grilla de celdas de 8×8 px. Cada impacto (propio o enemigo) apaga la celda alcanzada y sus vecinas inmediatas siguiendo un patrón irregular, así que los búnkeres se erosionan con bordes dentados y terminan agujereados. Las balas del jugador también los destruyen: refugiarse detrás de un búnker cuesta munición y, a la larga, el refugio mismo. El recurso se gasta y no se recupera dentro de la oleada.

**El OVNI.** Cada cierto tiempo, una nave de bonus cruza la franja superior de lado a lado a velocidad constante. Derribarla otorga un premio sorteado entre cuatro valores. Es la única fuente de puntos que exige abandonar la posición segura para perseguir un blanco que se va.

**La línea de defensa.** Hay una altura por debajo de la cual la formación no puede llegar. Si el alienígena más bajo la cruza, la partida termina de inmediato, sin importar cuántas vidas queden. Es la presión de tiempo del juego: matar lento también es perder.

## Controles

| Tecla                  | Acción                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `ArrowLeft` / `KeyA`   | Mover el cañón a la izquierda (tecla mantenida, movimiento continuo)                |
| `ArrowRight` / `KeyD`  | Mover el cañón a la derecha (tecla mantenida, movimiento continuo)                  |
| `Space`                | Disparar (flanco de pulsación, no auto-fuego; ignorado si ya hay una bala en vuelo) |
| Botón `PAUSA` de React | Congela formación, balas, OVNI y explosiones (no hay tecla nativa de pausa)         |

Sin mouse, sin touch, sin tecla de pausa nativa. Las cinco teclas del juego llaman `preventDefault()` para que `Space` y las flechas no hagan scroll de la página.

## Fórmula de puntuación

Todo puntúa en enteros y todo escala con la oleada (`level`), de modo que sobrevivir más produce números claramente mayores.

| Evento                                    | Puntos                                        |
| ----------------------------------------- | --------------------------------------------- |
| Alienígena de la fila 1 (superior)        | `30 × level`                                  |
| Alienígena de las filas 2 y 3             | `20 × level`                                  |
| Alienígena de las filas 4 y 5             | `10 × level`                                  |
| OVNI derribado                            | `[50, 100, 150, 300] elegido al azar × level` |
| Oleada completada (los 55 derribados)     | `1000 × level`                                |
| Cada vida restante al completar la oleada | `+100` por vida                               |

Una oleada 1 limpia sin perder vidas da: 11×30 + 22×20 + 22×10 = 990 de alienígenas, +1000 de bonus, +300 de vidas = **2290 puntos**. La oleada 2 con la misma actuación vale el doble en alienígenas y bonus. El leaderboard premia la profundidad, no la prolijidad en la primera pantalla.

## Curva de niveles y dificultad

`level` = número de oleada, sin techo. Cada oleada nueva endurece tres ejes a la vez:

1. **Altura inicial.** La formación nace 16 px más abajo que la anterior, hasta un tope: nunca por debajo de la altura de los búnkeres. Menos margen para reaccionar.
2. **Velocidad de paso.** El intervalo entre saltos del bloque se divide por `1 + 0.12 × (level - 1)`, con un piso duro que ninguna oleada puede atravesar. Con ese piso, la oleada 10 es rápida pero no imposible.
3. **Densidad de fuego.** Las balas enemigas simultáneas pasan de 2 a un máximo de 5, y su velocidad de caída sube 20 px/s por oleada.

Los búnkeres se **reconstruyen enteros** al empezar cada oleada. Es la única concesión de alivio de la curva, y es deliberada: sin ella, la oleada 3 sería un campo abierto y el juego se volvería un test de reflejos sin lectura táctica.

Dentro de una misma oleada, la dificultad la fabrica el propio jugador: el intervalo entre saltos interpola linealmente entre el valor lento (55 vivos) y el rápido (1 vivo). Los últimos dos alienígenas son siempre el momento más tenso de la pantalla.

## Condiciones de muerte y de victoria

**Perder un cañón** (`status: "dead"`, transitorio) ocurre por dos causas:

- Una bala enemiga impacta el cañón.
- El OVNI no mata: pasa de largo, es solo bonus.

Al perder un cañón: explosión de 0.9 s durante la cual nada más se mueve, se descuenta una vida, las balas en vuelo se limpian y el cañón reaparece centrado.

**Terminar la partida** (`status: "gameover"`) ocurre por dos causas:

- Se pierde la tercera vida.
- El alienígena vivo más bajo cruza la línea de defensa (y = 500). Fin inmediato, con vidas restantes o sin ellas.

**Victoria:** no existe. El juego es infinito por oleadas y `status` nunca reporta `"win"`. La única métrica de éxito es el score guardado en el leaderboard.

## Arte y paleta neón

Todo se dibuja con primitivas de canvas sobre fondo `--bg` (`#0a0a0f`), usando los tokens ya definidos en `app/globals.css`:

| Elemento                       | Color                                 | Notas                                                                   |
| ------------------------------ | ------------------------------------- | ----------------------------------------------------------------------- |
| Cañón del jugador              | `--cyan` (`#00f5ff`)                  | Base trapezoidal + torreta central, con `shadowBlur` para el halo neón  |
| Alienígena fila 1 (tipo 0)     | `--magenta` (`#ff006e`)               | El más valioso, el más arriba                                           |
| Alienígenas filas 2–3 (tipo 1) | `--yellow` (`#f5ff00`)                |                                                                         |
| Alienígenas filas 4–5 (tipo 2) | `--green` (`#00ff88`)                 | Coherente con el `color: green` de la ficha de catálogo                 |
| Búnkeres                       | `--green` con alfa 0.85               | Celdas apagadas simplemente no se dibujan                               |
| OVNI                           | `--magenta` con halo pulsante         | Silueta lenticular ancha, distinta de cualquier alienígena              |
| Bala del jugador               | `--cyan`                              | Rectángulo de 3×14 px                                                   |
| Balas enemigas                 | `--yellow`                            | Rectángulo de 3×12 px con leve zigzag por fotograma                     |
| Línea de defensa               | `--magenta` con alfa 0.25             | Línea horizontal punteada, avisa visualmente del límite                 |
| HUD nativo (canvas)            | `--ink` (`#e6e9ff`) / `--ink-dim`     | Puntuación arriba-izquierda, oleada arriba-centro, vidas arriba-derecha |
| Overlay "GAME OVER"            | `--magenta` sobre velo `#0a0a0f` α0.7 | Convive con el modal de React                                           |

Los alienígenas se dibujan desde **matrices de bits** de 11×8 definidas como arrays de strings en `engine.ts`, escaladas por un factor de 3 px por bit. Cada tipo tiene dos fotogramas que alternan en cada salto de la formación: el clásico "aleteo" sincronizado con el movimiento, gratis en costo de assets.

El fondo suma un campo de estrellas estático (puntos `--ink-faint` generados una vez al crear el juego) para que el vacío no quede plano.

## Assets necesarios

Ninguno — primitivas de canvas. Sin PNG, sin audio, sin carga asíncrona: el loop arranca de forma síncrona en el montaje del componente. La portada del catálogo reutiliza el bloque `.cover-invaders` que ya existe en `app/globals.css`.

## Copy de catálogo

La entrada ya existe en `lib/data.ts` y en la tabla `games`. Se conserva **tal cual**; solo cambian `best` y `plays`.

```ts
{
  id: "invasores",
  title: "INVASORES",
  short: "Defiende el planeta de filas alienígenas.",
  long: "Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.",
  cat: "SHOOTER",
  cover: "cover-invaders",
  color: "green",
  best: 0,
  plays: "0",
}
```
