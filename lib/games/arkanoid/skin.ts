import type { SkinId, SkinRoles } from "../skins";
import type { BlockColor } from "./levels";

/**
 * Paletas de Arkanoid. El atlas (`public/games/arkanoid/spritesheet-breakout.png`)
 * es inmutable: bloques, paddle y pelota se tinen de forma procedural en
 * `sprites.ts`, region por region, sobre un canvas offscreen por skin.
 *
 * `clasico` es la copia literal de lo que el motor ya tenia: fondo `#000`, HUD y
 * overlay `#fff`, velo `rgba(0, 0, 0, 0.6)` y el atlas sin tenir (`tints: null`).
 *
 * Roles definidos por contrato que el motor no pinta: `grid`/`gridAlpha`,
 * `primaryAlt`, `primaryInk`, `thruster`, `particle`, `sheen` y `overlaySub`.
 * Los colores reales de paddle, pelota y bloques viven en `tints`, porque salen
 * del atlas y no de un `fillStyle`.
 */
export type ArkanoidTints = {
  blocks: Record<BlockColor, string>;
  paddle: string;
  ball: string;
};

export type ArkanoidSkin = SkinRoles & {
  /** Clave de la cache de sheets tenidos en `sprites.ts`. */
  id: SkinId;
  /** `null` = atlas sin tocar (clasico), riesgo cero sobre el render original. */
  tints: ArkanoidTints | null;
  /**
   * Cuanto se aplana el valor del sprite hacia su tinte, de 0 a 1. En `neon`
   * vale 0: el pase `"color"` ya distingue los bloques por tono y conviene
   * conservar el biselado original intacto. En `retro` (monocromo) el tono es
   * el mismo para todo, asi que la distinguibilidad tiene que venir del valor:
   * el aplanado acerca cada bloque a su escalon de la rampa. Con 0.75 medido
   * sobre captura, las filas quedan con separacion 1.29..1.47 y el biselado se
   * sigue viendo; sin aplanado quedarian en la luminosidad del atlas, donde
   * hay pares por debajo de 1.1.
   */
  tintFlatten: number;
};

/**
 * Escalones de la rampa ambar asignados a cada region de bloque respetando el
 * orden de luminancia que ya tenian en el atlas (gray es el mas oscuro, yellow
 * el mas claro), para que el nivel se siga leyendo igual que en clasico.
 */
const RETRO_BLOCKS: Record<BlockColor, string> = {
  gray: "#6b3f00",
  magenta: "#8a5200",
  red: "#a86800",
  hotpink: "#c77800",
  green: "#e69100",
  cyan: "#ffb000",
  // Un escalon por encima de #ffd27f: contra #ffb000 ese tope se quedaba en
  // 1.29 de separacion y la auditoria pide 1.3 entre adyacentes.
  yellow: "#ffe0a3",
};

/** Un tono distinto por region: en neon la lectura del nivel es por color. */
const NEON_BLOCKS: Record<BlockColor, string> = {
  gray: "#c7d0e0",
  red: "#ff2b4d",
  yellow: "#f5ff00",
  cyan: "#00f5ff",
  magenta: "#b026ff",
  hotpink: "#ff006e",
  green: "#00ff88",
};

export const SKINS: Record<SkinId, ArkanoidSkin> = {
  clasico: {
    id: "clasico",
    bg: "#000000",
    grid: "#ffffff",
    gridAlpha: 0.06,
    primary: "#ffffff",
    primaryAlt: "#c7c7c7",
    primaryInk: "#000000",
    secondary: "#00ffff",
    accent: "#ffd54f",
    thruster: "#ff8200",
    particle: "#ffffff",
    hud: "#ffffff",
    overlayTitle: "#ffffff",
    overlaySub: "#a6a6a6",
    overlayVeil: "rgba(0, 0, 0, 0.6)",
    glow: null,
    sheen: "#ffffff",
    tints: null,
    tintFlatten: 0,
  },
  neon: {
    id: "neon",
    bg: "#0a0a0f",
    grid: "#00f5ff",
    gridAlpha: 0.08,
    primary: "#00f5ff",
    primaryAlt: "#00ff88",
    primaryInk: "#0a0a0f",
    secondary: "#ff006e",
    accent: "#f5ff00",
    thruster: "#f5ff00",
    particle: "#ff006e",
    hud: "#e6e9ff",
    overlayTitle: "#e6e9ff",
    overlaySub: "#8a8fb5",
    overlayVeil: "rgba(10, 10, 15, 0.72)",
    glow: { color: "#00f5ff", blur: 10 },
    sheen: "#00f5ff",
    tints: { blocks: NEON_BLOCKS, paddle: "#00f5ff", ball: "#f5ff00" },
    tintFlatten: 0,
  },
  retro: {
    id: "retro",
    bg: "#0d0800",
    grid: "#3d2600",
    gridAlpha: 0.18,
    primary: "#ffb000",
    primaryAlt: "#c77800",
    primaryInk: "#2a1500",
    secondary: "#ff8a1f",
    accent: "#ffd27f",
    thruster: "#ff8a1f",
    particle: "#ffd27f",
    hud: "#ffd27f",
    overlayTitle: "#ffd27f",
    overlaySub: "#c77800",
    overlayVeil: "rgba(13, 8, 0, 0.72)",
    glow: { color: "#ffb000", blur: 4 },
    sheen: "#ffd27f",
    tints: { blocks: RETRO_BLOCKS, paddle: "#ffb000", ball: "#ffd27f" },
    tintFlatten: 0.75,
  },
};

/**
 * Solo `retro` declara rampa auditable: al ser monocromo, la unica pista para
 * distinguir una fila de bloques de otra es la separacion de luminancia. En
 * `clasico` y `neon` la distincion es de tono y una rampa de valor no aplica.
 */
export const RAMPS: Partial<Record<SkinId, string[]>> = {
  retro: [
    RETRO_BLOCKS.gray,
    RETRO_BLOCKS.magenta,
    RETRO_BLOCKS.red,
    RETRO_BLOCKS.hotpink,
    RETRO_BLOCKS.green,
    RETRO_BLOCKS.cyan,
    RETRO_BLOCKS.yellow,
  ],
};
