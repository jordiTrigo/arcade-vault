export const SKIN_IDS = ["clasico", "neon", "retro"] as const;

export type SkinId = (typeof SKIN_IDS)[number];

export const DEFAULT_SKIN: SkinId = "clasico";

export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};

/**
 * Juegos cuyo engine ya acepta `skin` y expone `setSkin`. El agente skin-designer
 * agrega el id acá al terminar de convertir cada juego. El selector de la UI solo
 * se muestra para juegos presentes en este set.
 */
export const SKINNED_GAMES = new Set<string>(["asteroides", "tetris", "snake", "arkanoid"]);

export type Glow = { color: string; blur: number } | null;

/**
 * Roles de color compartidos por los cuatro engines. Todo rol usado con
 * `withAlpha` (alfa variable en tiempo de render) es hex de 6 dígitos;
 * los demás pueden ser cualquier string CSS válido.
 */
export type SkinRoles = {
  bg: string;
  grid: string;
  gridAlpha: number;
  primary: string;
  primaryAlt: string;
  primaryInk: string;
  secondary: string;
  accent: string;
  thruster: string;
  particle: string;
  hud: string;
  overlayTitle: string;
  overlaySub: string;
  overlayVeil: string;
  glow: Glow;
  sheen: string;
};

/** Compone un hex de 6 dígitos con un alfa variable, p. ej. partículas que se desvanecen. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Sanea un valor de localStorage (input no confiable) a un SkinId válido. */
export function resolveSkin(raw: string | null | undefined): SkinId {
  return (SKIN_IDS as readonly string[]).includes(raw ?? "") ? (raw as SkinId) : DEFAULT_SKIN;
}
