import type { SkinId, SkinRoles } from "../skins";

/**
 * Paletas de Snake. `clasico` es la copia literal de los colores que el motor ya
 * tenia: cabeza `#7cfc8a`, cuerpo `#22c55e`, ojos `#062b0f`, rejilla `#0f5c2a` al
 * 0.35 y el halo verde `rgba(34, 255, 120, 0.55)` con blur 6.
 *
 * Roles que el motor de Snake no pinta (existen por contrato y se auditan igual):
 * `secondary`, `accent`, `thruster`, `particle`, `sheen` y `overlayVeil` — el
 * overlay de GAME OVER se dibuja directo sobre la escena, sin velo.
 */
export type SnakeSkin = SkinRoles & {
  /** Sombreado de las scanlines dentro de cada segmento; se usa con alfa fija 0.25. */
  scanline: string;
  /**
   * Filtro de canvas para las 22 frutas del atlas. Nunca cambia el hue: la
   * silueta y el color de la fruta son el objetivo del juego y tienen que
   * seguir reconociendose. `none` en `clasico` y `neon`.
   */
  fruitFilter: string;
};

export const SKINS: Record<SkinId, SnakeSkin> = {
  clasico: {
    bg: "#000000",
    grid: "#0f5c2a",
    gridAlpha: 0.35,
    primary: "#7cfc8a",
    primaryAlt: "#22c55e",
    primaryInk: "#062b0f",
    secondary: "#22ff78",
    accent: "#ffffff",
    thruster: "#22ff78",
    particle: "#7cfc8a",
    hud: "#ffffff",
    overlayTitle: "#ffffff",
    // Resultado exacto de componer el rgba(255,255,255,0.65) original sobre el negro.
    overlaySub: "#a6a6a6",
    overlayVeil: "rgba(0, 0, 0, 0)",
    glow: { color: "#22ff78", blur: 6 },
    sheen: "#ffffff",
    scanline: "#000000",
    fruitFilter: "none",
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
    scanline: "#000000",
    fruitFilter: "none",
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
    scanline: "#000000",
    // Desaturacion + sepia: baja el color de la foto sin mover el hue.
    fruitFilter: "grayscale(0.6) sepia(0.55) saturate(1.25)",
  },
};

/**
 * Solo `retro` declara rampa auditable: al ser monocromo, cabeza y cuerpo se
 * distinguen por luminancia y no por tono. En `clasico` y `neon` la diferencia
 * ya es de tono ademas de valor.
 */
export const RAMPS: Partial<Record<SkinId, string[]>> = {
  retro: [SKINS.retro.primaryAlt, SKINS.retro.primary],
};
