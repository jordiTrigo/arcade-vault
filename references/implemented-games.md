# Juegos implementados

Fuente: tabla `games` en Supabase (proyecto `xxxxxx`), consultada 2026-09-10. 13 juegos en catálogo, 4 con motor real jugable (canvas + leaderboard en `scores`); el resto usa puntuaciones sembradas (`seededScores`), sin motor de juego real todavía.

## Con motor real (canvas + leaderboard real en Supabase)

| id | Título | Categoría | Descripción corta |
|---|---|---|---|
| `asteroides` | ASTEROIDES | SHOOTER | Motor real: pulveriza rocas en gravedad cero. |
| `tetris` | TETRIS | PUZZLE | Motor real: encaja piezas y limpia líneas sin parar. |
| `arkanoid` | ARKANOID | ARCADE | Motor real: rebota la pelota y destruye muros de neón. |
| `snake` | SNAKE | ARCADE | Sprites reales de fruta te esperan en la grilla. |

Motores en `lib/games/<id>/`, registrados en `lib/games/registry.ts` (`GAME_ENGINES`).

## Catálogo mock (sin motor real, `best`/`plays` sembrados)

| id | Título | Categoría | Descripción corta |
|---|---|---|---|
| `bloque-buster` | BLOQUE BUSTER | ARCADE | Rebota la pelota y destruye muros de neón. |
| `caida` | CAÍDA | PUZZLE | Encaja las piezas antes de que el techo te aplaste. |
| `serpentina` | SERPENTINA | ARCADE | Crece sin morder tu propia cola. |
| `gloton` | GLOTÓN | ARCADE | Devora puntos y escapa de los fantasmas. |
| `invasores` | INVASORES | SHOOTER | Defiende el planeta de filas alienígenas. |
| `rocas` | ROCAS | SHOOTER | Pulveriza asteroides en gravedad cero. |
| `ranaria` | RANARIA | ARCADE | Cruza la autopista de pixeles. |
| `duelo-pixel` | DUELO PIXEL | VERSUS | Dos paletas. Una pelota. Reflejos máximos. |

Nota: `bloque-buster`/`caida`/`serpentina`/`rocas` son las versiones mock originales de los juegos que luego recibieron motor real (`arkanoid`/`tetris`/`snake`/`asteroides`) — coexisten como entradas separadas en el catálogo, no se reemplazaron.
