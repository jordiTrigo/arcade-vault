import type { SkinId, SkinRoles } from "../skins";

/**
 * Paletas de Asteroides. `clasico` es la copia literal de los colores que el
 * motor ya tenia (#fff vectorial sobre negro, powerup cian, llama naranja).
 * Asteroides no dibuja rejilla ni sheen: esos roles existen por contrato.
 */
export type AsteroidsSkin = SkinRoles;

export const SKINS: Record<SkinId, AsteroidsSkin> = {
  clasico: {
    bg: "#000000",
    grid: "#ffffff",
    gridAlpha: 0.06,
    primary: "#ffffff",
    primaryAlt: "#ffffff",
    primaryInk: "#000000",
    secondary: "#00ffff",
    accent: "#00ffff",
    thruster: "#ff8200",
    particle: "#ffffff",
    hud: "#ffffff",
    overlayTitle: "#ffffff",
    overlaySub: "#a6a6a6",
    overlayVeil: "rgba(0, 0, 0, 0)",
    glow: null,
    sheen: "#ffffff",
  },
  neon: {
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
    glow: { color: "#00f5ff", blur: 12 },
    sheen: "#00f5ff",
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
  },
};
