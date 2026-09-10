# To Do — Sugerencias de juegos

Registro del agente `game-planner`. Es su memoria: antes de proponer lee este archivo y no repite
nada de aquí. Las entradas se mueven entre secciones a mano o cuando el agente confirma el cambio
contra `lib/games/registry.ts`.

## Pendientes

<!-- formato de cada entrada:
- [ ] **`id-kebab` — TÍTULO** · CATEGORÍA · complejidad · sugerido YYYY-MM-DD
  - **Por qué encaja:** ...
  - **Mecánica núcleo:** ...
  - **Cómo puntúa:** ...
  - **Assets:** ...
  - **Riesgos:** ...
-->

- [ ] **`duelo-pixel` — DUELO PIXEL** · VERSUS · complejidad baja · sugerido 2026-09-10 · **← RECOMENDACIÓN PRINCIPAL**
  - **Por qué encaja:** VERSUS es la única categoría con cero motores reales (ARCADE 2, PUZZLE 1,
    SHOOTER 1, VERSUS 0). La entrada ya existe en la tabla `games` con id, copy y portada
    (`cover-duelo`), así que no hay que tocar el catálogo. La física de paleta + pelota de
    `lib/games/arkanoid/engine.ts` (262 líneas) es reutilizable casi tal cual, lo que la vuelve la
    opción más barata de todas.
  - **Mecánica núcleo:** dos paletas verticales devuelven una pelota; el jugador enfrenta a una CPU
    cuya velocidad de seguimiento y ángulo de devolución escalan por nivel (con modo local a dos
    jugadores como extra opcional, sin leaderboard).
  - **Cómo puntúa:** Pong puro no da un número creciente, así que se define modo supervivencia:
    +100 por punto anotado a la CPU multiplicado por el nivel actual, +10 por cada rebote del rally
    en curso; `lives` = los puntos que la CPU puede anotarte antes del `gameover` (3); `level` sube
    cada vez que le ganás un set de 5 puntos y endurece a la CPU.
  - **Assets:** ninguno nuevo — primitivas de canvas (dos rectángulos, un círculo, línea central
    punteada) y la portada CSS `cover-duelo` que ya existe.
  - **Riesgos:** la mecánica paleta/pelota se solapa con `arkanoid`, es el punto más flojo de la
    propuesta (mitigado por el oponente con IA y el modo versus). El contrato `GameEngineState` no
    se toca: `score`/`lives`/`level`/`status` cubren todo; solo hay que decidir en la spec si el
    modo 2 jugadores locales queda fuera del guardado en `scores` (recomendado: sí, fuera).

- [ ] **`duelo-tanques` — DUELO DE TANQUES** · VERSUS · complejidad media · sugerido 2026-09-10
  - **Por qué encaja:** cubre el mismo hueco de VERSUS pero con una mecánica núcleo nueva de verdad,
    sin parecido con nada de lo implementado. Reaprovecha la matemática vectorial de rotación e
    inercia de `lib/games/asteroides/engine.ts`.
  - **Mecánica núcleo:** duelo estilo Combat en una arena con obstáculos: rotar, avanzar y disparar
    proyectiles que rebotan en las paredes; el jugador se enfrenta a una CPU que persigue y esquiva.
  - **Cómo puntúa:** +500 por tanque enemigo destruido escalado por nivel, +bonus por impacto con
    rebote y por terminar la ronda sin recibir daño; `lives` = 3 tanques, `level` = arena con más
    obstáculos y CPU más agresiva.
  - **Assets:** ninguno nuevo (tanques y proyectiles con primitivas), pero hay que crear la fila en
    la tabla `games` y una portada CSS nueva (`cover-tanques`).
  - **Riesgos:** IA de persecución + colisiones contra obstáculos + rebote de balas es el motor más
    caro de los tres; alcance a controlar en la spec. El contrato del engine no se toca.

- [ ] **`invasores` — INVASORES** · SHOOTER · complejidad media · sugerido 2026-09-10
  - **Por qué encaja:** no cubre el hueco de VERSUS, pero es el mejor candidato fuera de él: ya
    existe como entrada mock en el catálogo (id, copy, `cover-invaders`) y su mecánica —formación de
    enemigos que baja en bloque, escudos destructibles, disparo enemigo— no se parece al vuelo libre
    de `asteroides` pese a compartir categoría.
  - **Mecánica núcleo:** cañón que se mueve en horizontal y dispara contra filas de alienígenas que
    descienden acelerando a medida que quedan menos, con búnkeres que se erosionan.
  - **Cómo puntúa:** puntos por alienígena según su fila (10/20/30), bonus del OVNI que cruza arriba
    y bonus por limpiar la oleada completa; `lives` = 3 cañones, `level` = oleada.
  - **Assets:** dibujable con primitivas o sprites pixelados simples; si se quieren sprites reales
    hay que sumarlos a `public/games/invasores/` (patrón ya usado por `snake`).
  - **Riesgos:** la erosión por píxel de los búnkeres es la parte fina del motor (se puede simplificar
    a una grilla de celdas). El contrato del engine no se toca.

- [ ] **`gemas-neon` — GEMAS NEÓN** · PUZZLE · complejidad media · sugerido 2026-09-10
  - **Por qué encaja:** match-3 no se parece a nada implementado (sin piezas cayendo ni paleta) y reaprovecha la grilla de `lib/games/snake/engine.ts` y el atlas `public/games/snake/fruits.png` — cero assets nuevos.
  - **Mecánica núcleo:** intercambiás dos celdas adyacentes; si forman línea de 3+ explotan, caen y encadenan cascadas; objetivo de color por nivel con presupuesto de movimientos.
  - **Cómo puntúa:** 10 por gema × multiplicador de cascada, +50 match de 4, +100 match de 5, bonus por movimientos sobrantes; `level` = tablero, `lives` = reshuffles (3).
  - **Assets:** ninguno nuevo (reusa `fruits.png`); fila en `games` + portada CSS `cover-gemas`.
  - **Riesgos:** máquina de estados swap→resolve→fall→refill para evitar cascadas mal resueltas; detectar tablero sin jugadas posibles.

- [ ] **`nucleo-2048` — NÚCLEO 2048** · PUZZLE · complejidad baja · sugerido 2026-09-10
  - **Por qué encaja:** el más barato del lote; score entero estrictamente creciente sin traducción forzada, grilla 4x4 sin física ni colisiones.
  - **Mecánica núcleo:** deslizás fichas en una dirección, las iguales se fusionan al chocar (una fusión por ficha/movimiento), aparece ficha nueva en hueco libre.
  - **Cómo puntúa:** score += valor de cada fusión; `level` = derivado de la ficha más alta; `status: win` al llegar a 2048.
  - **Assets:** ninguno — rects redondeados + texto en canvas 2D.
  - **Riesgos:** sin concepto natural de vidas, hay que mapear `lives` (recomendado: 3 "deshacer"); animar deslizamiento con tween corto dentro de `update(dt)`.

- [ ] **`buscaminas` — BUSCAMINAS** · PUZZLE · complejidad media · sugerido 2026-09-10
  - **Por qué encaja:** lógica deductiva pura, la mecánica más alejada de todo el catálogo (sin movimiento continuo). Input mouse con precedente en `ArkanoidCanvas.tsx`.
  - **Mecánica núcleo:** clic revela celda (flood-fill en valor 0, primer clic siempre seguro), clic derecho marca bandera; ganás al revelar todo sin pisar mina.
  - **Cómo puntúa:** puntos por celda revelada según densidad de minas, bonus por tablero limpio y por tiempo restante; `level` = dificultad (9x9→16x16→16x30), `lives` = minas tolerables antes de `gameover`.
  - **Assets:** ninguno — números y banderas con primitivas.
  - **Riesgos:** `preventDefault` de `contextmenu` sobre canvas + alternativa táctil para banderas; arrancar con 3 "detectores" en vez de 1 vida.

- [ ] **`cajas-neon` — CAJAS NEÓN** · PUZZLE · complejidad media · sugerido 2026-09-10
  - **Por qué encaja:** sokoban, puzzle por niveles determinista con motor mínimo; la estructura de niveles ya tiene precedente exacto en `lib/games/arkanoid/levels.ts`.
  - **Mecánica núcleo:** empujás cajas por una grilla hasta dejarlas todas en sus marcas objetivo; con deshacer y reinicio de nivel.
  - **Cómo puntúa:** 1000 × nivel al completar tablero, -1 por movimiento, -25 por deshacer usado, bonus si igualás el óptimo; `level` = tablero, `lives` = deshacer restantes.
  - **Assets:** ninguno obligatorio (rects con glow + marcas como diamantes).
  - **Riesgos:** el costo real es diseñar 8-12 niveles con curva de dificultad; definir cuándo se guarda el score (al `gameover` o al terminar la tanda, no al abandonar).

- [ ] **`tuberias` — TUBERÍAS** · PUZZLE · complejidad media · sugerido 2026-09-10
  - **Por qué encaja:** conserva pulso arcade (el flujo avanza solo); mecánica de cola de piezas + propagación no existe en el catálogo, encaja bien en el `update(dt)` ya usado por los cuatro motores.
  - **Mecánica núcleo:** colocás piezas de tubería (de una cola lateral) en la grilla antes de que el flujo que avanza solo llegue; podés sobrescribir piezas no inundadas.
  - **Cómo puntúa:** puntos por celda inundada, bonus creciente por exceder longitud mínima del nivel, bonus por completar circuito; `level` = velocidad de flujo, `lives` = fugas permitidas (3).
  - **Assets:** ninguno — tubos con `lineWidth` + arcos, estética neón nativa.
  - **Riesgos:** estado por celda (pieza/conexiones/inundación) y regla de no reemplazar pieza ya inundada.

- [ ] **`frogger` — FROGGER** · ARCADE · complejidad media · sugerido 2026-09-10
  - **Por qué encaja:** mecánica de timing sobre carriles móviles, sin proyectiles ni paleta; el mock `ranaria` ya en catálogo aporta copy/portada reutilizable.
  - **Mecánica núcleo:** cruzar de abajo hacia arriba una autopista con vehículos y luego un río donde solo se sobrevive sobre troncos/tortugas, hasta ocupar 5 nenúfares.
  - **Cómo puntúa:** +10 por fila avanzada, +50 por nenúfar ocupado, +200 al completar los 5, bonus por tiempo restante; `lives` = 3, `level` sube con cada tablero completado.
  - **Assets:** dibujable con primitivas; atlas opcional en `public/games/frogger/`. Fila nueva en `games`.
  - **Riesgos:** "montarse" en plataformas móviles es la parte fina de colisión; el timer por intento no cabe en `GameEngineState`, se dibuja dentro del canvas.

- [ ] **`flappy-neon` — FLAPPY NEON** · ARCADE · complejidad baja · sugerido 2026-09-10
  - **Por qué encaja:** el motor más barato del lote, único de control de un solo botón; gravedad + impulso no se parece a nada del catálogo.
  - **Mecánica núcleo:** ave/nave cae por gravedad constante, cada pulsación da impulso hacia arriba; atravesar huecos de columnas generadas proceduralmente.
  - **Cómo puntúa:** +1 por columna × nivel, bonus por pasar centrado; `lives` = 1 (muerte instantánea), `level` sube cada 10 columnas.
  - **Assets:** cero — columnas y ave con primitivas. Fila nueva en `games` + portada `cover-flappy`.
  - **Riesgos:** puntuaciones bajas frente a otros leaderboards (definir escala); `lives = 1` deja ese campo del HUD sin info útil.

- [ ] **`runner-neon` — RUNNER NEON** · ARCADE · complejidad media · sugerido 2026-09-10
  - **Por qué encaja:** endless runner, género ausente; encaja perfecto con leaderboard porque el score crece solo con la supervivencia.
  - **Mecánica núcleo:** personaje corre solo a velocidad creciente, jugador salta (altura variable) o se agacha para esquivar obstáculos altos/bajos procedurales.
  - **Cómo puntúa:** +1 por distancia, +25 por moneda en el aire, multiplicador de racha que resetea al chocar; `lives` = 3 impactos, `level` = tramo de velocidad.
  - **Assets:** viable con primitivas; atlas opcional en `public/games/runner-neon/`.
  - **Riesgos:** garantizar que todo patrón sea esquivable (tabla de patrones prediseñados, no aleatoriedad pura); input de salto variable exige keydown/keyup.

- [ ] **`topo-loco` — TOPO LOCO** · ARCADE · complejidad baja · sugerido 2026-09-10
  - **Por qué encaja:** único candidato de reacción pura sin desplazamiento del jugador; reaprovecha el input de mouse ya resuelto en `ArkanoidCanvas.tsx`.
  - **Mecánica núcleo:** grilla 3x3 de agujeros con topos que asoman en ventanas cada vez más cortas; click o teclas numéricas para golpear, topos-trampa restan.
  - **Cómo puntúa:** +100 por topo × nivel, combo creciente (x2 desde 5, x3 desde 10) que se rompe al fallar; `lives` = 3 fallos, `level` sube cada 15 aciertos.
  - **Assets:** dibujable con primitivas, gana con sprite simple. Fila nueva en `games`.
  - **Riesgos:** el que más trabajo de arte pide para no verse pobre; necesita fallback de teclado; sin `status: win` posible (infinito, como snake).

- [ ] **`pinball-neon` — PINBALL NEON** · ARCADE · complejidad alta · sugerido 2026-09-10
  - **Por qué encaja:** mayor techo de puntuación y mejor sensación arcade; combos y multiplicadores dan leaderboard con números grandes y variados.
  - **Mecánica núcleo:** bola con gravedad recorre mesa vertical rebotando en bumpers/rampas/dianas; jugador solo controla dos flippers inferiores.
  - **Cómo puntúa:** bumper 100, diana 500, rampa completa 1000, multiplicador de mesa por sets de dianas, bonus de fin de bola; `lives` = 3 bolas, `level` = fase/multiplicador.
  - **Assets:** ninguno obligatorio — geometría vectorial encaja con el estilo neón; sonido reusable de `public/games/arkanoid/sounds/ball-bounce.mp3`.
  - **Riesgos:** el más caro — colisión círculo-contra-segmento rotatorio con transferencia de momento angular, requiere paso de simulación subdividido; diseñar mesa divertida es trabajo de game design aparte.

- [ ] **`defensa-orbital` — DEFENSA ORBITAL** · SHOOTER · complejidad media · sugerido 2026-09-10
  - **Por qué encaja:** SHOOTER más distinto del catálogo — sin nave protagonista, apuntado con mouse y detonación en un punto; estrena input de click preciso.
  - **Mecánica núcleo:** misiles enemigos caen en línea recta hacia seis ciudades; jugador dispara contraproyectiles al punto del cursor, cada uno genera explosión expansiva que encadena.
  - **Cómo puntúa:** +25 por misil interceptado × nivel, bonus de cadena creciente, +100 por ciudad viva al fin de oleada; `lives` = ciudades restantes (6), `level` = oleada.
  - **Assets:** ninguno nuevo — líneas, arcos, trapecios. Fila nueva en `games` + portada `cover-defensa`.
  - **Riesgos:** array de explosiones con radio animado y colisión círculo-punto por frame; balance munición/densidad de misiles a fijar en la spec.

- [ ] **`escuadron-neon` — ESCUADRÓN NEÓN** · SHOOTER · complejidad media · sugerido 2026-09-10
  - **Por qué encaja:** paso natural de dificultad tras `invasores`; trayectorias paramétricas y ataques en picada no existen en ningún motor del repo.
  - **Mecánica núcleo:** cazador en horizontal dispara hacia arriba; enemigos entran por curvas Bézier hasta su hueco en formación y se desprenden en picada disparando.
  - **Cómo puntúa:** valor base por tipo (50/80/150) duplicado en picada, bonus de oleada perfecta (+1000), ronda de bonus cada 3 niveles; `lives` = 3, `level` = oleada.
  - **Assets:** dibujable con primitivas, gana con spritesheet en `public/games/escuadron-neon/`.
  - **Riesgos:** trayectorias como tablas de puntos de control evaluadas por tiempo normalizado; solapamiento moderado con `invasores` si se implementan ambos.

- [ ] **`tormenta-balas` — TORMENTA DE BALAS** · SHOOTER · complejidad alta · sugerido 2026-09-10
  - **Por qué encaja:** esquivar es el juego, disparar es secundario — mecánica de tensión ausente en el catálogo; hitbox mínimo desacoplado del sprite.
  - **Mecánica núcleo:** scroll vertical, disparo automático, nave en 8 direcciones sin inercia esquivando patrones densos (abanicos, espirales, anillos); tecla de foco reduce velocidad y revela hitbox.
  - **Cómo puntúa:** puntos por enemigo + multiplicador de "graze" (rozar sin ser tocado) que se pierde entero al recibir impacto; bonus por jefe según tiempo restante; `lives` = 3, `level` = fase, `status: win` en fase final.
  - **Assets:** ninguno obligatorio — círculos con halo (`shadowBlur`).
  - **Riesgos:** el más alto — rendimiento con 500-1500 proyectiles vivos (arrays planos, sin crear objetos por frame); patrones de disparo como datos, no código suelto; fácil hacerlo injugable sin presupuesto de balas por fase.

- [ ] **`patrulla-dunas` — PATRULLA DUNAS** · SHOOTER · complejidad alta · sugerido 2026-09-10
  - **Por qué encaja:** único candidato con mundo mayor que la pantalla (scroll lateral bidireccional + radar); suma objetivo secundario de rescate, ausente en el catálogo.
  - **Mecánica núcleo:** nave lateral vuela izquierda/derecha invirtiendo cámara, dispara y evita que enemigos secuestren colonos del suelo; colono abducido muta al captor en enemigo más agresivo.
  - **Cómo puntúa:** +150 por enemigo, +500 por atrapar colono en caída +500 extra por depositarlo, bonus de oleada por colono vivo; `lives` = 3, `level` = oleada.
  - **Assets:** ninguno nuevo — terreno como polilínea, radar en canvas secundario.
  - **Riesgos:** el más caro en diseño de sistemas — cámara con mundo cíclico, minimapa, IA de abducción con estados; thrust lateral roza `asteroides`, mitigable con velocidad directa sin rotación libre.

- [ ] **`galeria-neon` — GALERÍA NEÓN** · SHOOTER · complejidad baja · sugerido 2026-09-10
  - **Por qué encaja:** el más barato de los cinco SHOOTER, puntería mouse pura estilo light-gun; mejor candidato para sesión corta y para móvil/táctil.
  - **Mecánica núcleo:** rondas cronometradas con blancos neón cruzando en trayectorias variadas; disparo con cursor, munición limitada, blancos penalizadores a evitar.
  - **Cómo puntúa:** valor del blanco por velocidad/tamaño × racha de aciertos consecutivos, bonus de ronda por munición sin usar y por precisión >90%; `lives` = blancos escapados tolerables (3), `level` = ronda.
  - **Assets:** primitivas suficientes; gana con spritesheet propio en `public/games/galeria-neon/`.
  - **Riesgos:** riesgo de repetitividad si no varían tipos de blanco (mínimo 3 con comportamiento distinto); conversión de coordenadas cliente→canvas como ya hace `ArkanoidCanvas`.

- [ ] **`reversi-neon` — REVERSI NEÓN** · VERSUS · complejidad media · sugerido 2026-09-10
  - **Por qué encaja:** primer juego por turnos con IA que piensa (minimax) en vez de perseguir; no canibaliza a `duelo-pixel` ni `duelo-tanques`.
  - **Mecánica núcleo:** colocás fichas en grilla 8x8 encerrando líneas rivales para voltearlas, turnos alternados contra CPU con minimax + poda alfa-beta y pesos posicionales.
  - **Cómo puntúa:** al cerrar partida, `score += fichas*100 + margen*250` × nivel; bonus +1000 por las 4 esquinas, +2000 por barrido total; `lives` = 3 derrotas, `level` = profundidad de CPU.
  - **Assets:** ninguno — tablero y fichas con primitivas.
  - **Riesgos:** minimax en el hilo principal, capar profundidad (4-6) o usar presupuesto de tiempo para no congelar el rAF; input por click es patrón nuevo en el repo.

- [ ] **`cuatro-en-linea` — CUATRO EN LÍNEA** · VERSUS · complejidad baja · sugerido 2026-09-10
  - **Por qué encaja:** camino más barato a un VERSUS con IA real — reglas de tres líneas, minimax a profundidad 6-7 ya juega fuerte. Mejor relación resultado/costo de la lista.
  - **Mecánica núcleo:** jugador y CPU alternan soltando fichas por columnas en grilla 7x6; gana quien alinee 4 en horizontal/vertical/diagonal.
  - **Cómo puntúa:** `score += 1000 * level` por victoria + bonus de eficiencia por ganar rápido + bonus por amenaza doble; `lives` = 3 derrotas, `level` = agresividad de CPU.
  - **Assets:** ninguno — grilla y fichas con animación de caída.
  - **Riesgos:** el más bajo del lote; techo de sensación arcade bajo (se compensa con animación y resaltado de línea ganadora). Input por columna, incluso con teclas 1-7.

- [ ] **`flota-oculta` — FLOTA OCULTA** · VERSUS · complejidad media · sugerido 2026-09-10
  - **Por qué encaja:** única mecánica de información oculta/deducción del catálogo; doble tablero se ve bien en el formato CRT del reproductor.
  - **Mecánica núcleo:** colocás flota en grilla 10x10 (o despliegue aleatorio) y alternás disparos con CPU hunt/target que persigue orientación del barco herido.
  - **Cómo puntúa:** +100 por impacto, +500 por barco hundido según tamaño, bonus de precisión final; todo × nivel; `lives` = 3 flotas propias, `level` = rigor de la CPU.
  - **Assets:** ninguno — grillas y marcas con primitivas; sprites opcionales en `public/games/flota-oculta/`.
  - **Riesgos:** colocación manual de barcos es UI extra — mitigar con botón "REDISTRIBUIR" aleatorio; acortar animación del turno de CPU para que no se sienta lento.

- [ ] **`duelo-dojo` — DUELO DOJO** · VERSUS · complejidad alta · sugerido 2026-09-10
  - **Por qué encaja:** VERSUS con más carácter arcade — combate cuerpo a cuerpo y barras de vida enfrentadas, ausente en todo el catálogo.
  - **Mecánica núcleo:** lucha 1v1 en escenario corto: avanzar/retroceder, salto, golpe alto/bajo, barrido, bloqueo; CPU con perfiles por nivel que reaccionan a distancia y frames de recuperación.
  - **Cómo puntúa:** +1000 por asalto × nivel, +10 por punto de daño, +2500 por victoria perfecta, bonus por combos 3+; `lives` = 3 combates, `level` = rival siguiente.
  - **Assets:** el punto caro — luchador tipo silueta/stick-figure neón sin sprites es lo coherente; pixel art multiplicaría el costo.
  - **Riesgos:** el más alto — frame data, hitboxes/hurtboxes, prioridad de ataques, IA balanceada. Acotar a un personaje espejado, 3 ataques, sin combos aéreos. Barras de vida no caben en el HUD compartido, van dentro del canvas.

- [ ] **`hockey-neon` — HOCKEY NEÓN** · VERSUS · complejidad media · sugerido 2026-09-10
  - **Por qué encaja:** reaprovecha colisión círculo-rectángulo y manejo de puntero de `lib/games/arkanoid/engine.ts`; mazo en dos ejes con inercia cambia la sensación respecto a Pong.
  - **Mecánica núcleo:** mesa vertical con dos porterías; jugador arrastra mazo con mouse/teclado, golpea disco con fricción baja hacia la portería rival; CPU alterna defensa/embestida.
  - **Cómo puntúa:** +250 por gol × nivel, +25 por parada limpia, +1500 por set a cero; `lives` = 3 sets perdibles, `level` = velocidad de mazo/disco.
  - **Assets:** ninguno — mesa y disco con primitivas; sonido reusable de `ball-bounce.mp3`.
  - **Riesgos:** solapa con `duelo-pixel` (mazo/disco vs paleta/pelota) — si se implementan ambos, uno sobra. Mazo movido por mouse puede teletransportarse entre frames; hay que topar velocidad por delta.

## Implementados

## Descartados

<!-- cada entrada conserva el motivo del descarte y la fecha -->
