import type { SkinId, SkinRoles } from "../skins";

/**
 * Paletas de Tetris. `clasico` es la copia literal de los colores que el motor
 * ya tenia: las ocho piezas del original y la rejilla `--ink-dim` al 0.25 que
 * antes se leia con getComputedStyle. El HUD y los overlays viven fuera del
 * canvas (los dibuja la pagina del reproductor): esos roles existen por
 * contrato y se auditan, pero el motor no los pinta.
 */
export type TetrisSkin = SkinRoles & {
  /** Color por indice de pieza (1..8 en el motor: I, O, T, S, Z, J, L, N). */
  pieces: string[];
};

const CLASICO_PIECES = [
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metalico)
];

/** Mismas familias de tono que el clasico, saturadas a los tokens de app/globals.css. */
const NEON_PIECES = [
  "#00f5ff", // I
  "#f5ff00", // O
  "#b026ff", // T
  "#00ff88", // S
  "#ff006e", // Z
  "#4d7cff", // J
  "#ff9e00", // L
  "#c7d0e0", // N
];

/**
 * Ambar monocromo: ocho escalones de luminancia con separacion >= 1.34 entre
 * adyacentes, porque en un monocromo la pieza se distingue por valor, no por
 * tono. El escalon mas oscuro queda en 2.3 contra el fondo (el suelo posible
 * si el mas claro no debe pasarse del blanco calido del fosforo).
 */
const RETRO_PIECES = [
  "#674500", // I
  "#805700", // O
  "#9b6a00", // T
  "#b77e00", // S
  "#d79400", // Z
  "#f9ac00", // J
  "#ffd26c", // L
  "#fff7e5", // N
];

export const SKINS: Record<SkinId, TetrisSkin> = {
  clasico: {
    bg: "#000000",
    grid: "#8a8fb5",
    gridAlpha: 0.25,
    primary: "#4dd0e1",
    primaryAlt: "#81c784",
    primaryInk: "#000000",
    secondary: "#e57373",
    accent: "#ffd54f",
    thruster: "#ffb74d",
    particle: "#ffffff",
    hud: "#e6e9ff",
    overlayTitle: "#e6e9ff",
    overlaySub: "#8a8fb5",
    overlayVeil: "rgba(0, 0, 0, 0)",
    glow: null,
    sheen: "#ffffff",
    pieces: CLASICO_PIECES,
  },
  neon: {
    bg: "#0a0a0f",
    grid: "#00f5ff",
    gridAlpha: 0.1,
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
    glow: { color: "#00f5ff", blur: 8 },
    sheen: "#ffffff",
    pieces: NEON_PIECES,
  },
  retro: {
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
    pieces: RETRO_PIECES,
  },
};

/**
 * Solo `retro` declara rampa auditable: es el unico monocromo, donde la
 * separacion de luminancia entre piezas adyacentes es la que las hace legibles.
 * En `clasico` y `neon` las piezas se distinguen por tono, no por valor.
 */
export const RAMPS: Partial<Record<SkinId, string[]>> = {
  retro: RETRO_PIECES,
};
