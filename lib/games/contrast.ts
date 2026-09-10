/** Utilidades de contraste WCAG 2.x sobre luminancia relativa sRGB, sin dependencias. */

function channel(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Parsea hex de 6 dígitos o `rgb()`/`rgba()`. Alfa implícito 1 si no viene en el string. */
function parseColor(color: string): [number, number, number, number] {
  if (color.startsWith("rgb")) {
    const nums = color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
    return [nums[0], nums[1], nums[2], nums[3] ?? 1];
  }
  const clean = color.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
    1,
  ];
}

function toRgb(hex: string): [number, number, number] {
  const [r, g, b] = parseColor(hex);
  return [r, g, b];
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Compone un color con alfa sobre un fondo, para medir p. ej. una rejilla translúcida. */
export function composite(fgHex: string, alpha: number, bgHex: string): string {
  const [fr, fg, fb] = toRgb(fgHex);
  const [br, bg, bb] = toRgb(bgHex);
  const mix = (f: number, b: number) => Math.round(f * alpha + b * (1 - alpha));
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(mix(fr, br))}${toHex(mix(fg, bg))}${toHex(mix(fb, bb))}`;
}

export type ContrastViolation = {
  check: string;
  ratio: number;
  threshold: number;
  rule: "min" | "max";
};

type AuditableSkin = {
  bg: string;
  grid: string;
  gridAlpha: number;
  primary: string;
  primaryAlt: string;
  primaryInk: string;
  secondary: string;
  accent: string;
  hud: string;
  overlayTitle: string;
  overlaySub: string;
  overlayVeil: string;
};

const BLACK = "#000000";

function check(
  violations: ContrastViolation[],
  label: string,
  a: string,
  b: string,
  threshold: number,
  rule: "min" | "max" = "min",
) {
  const ratio = contrastRatio(a, b);
  const ok = rule === "min" ? ratio >= threshold : ratio <= threshold;
  if (!ok) violations.push({ check: label, ratio: Number(ratio.toFixed(2)), threshold, rule });
}

/** Audita los roles compartidos de una skin. Los extras por juego (rampas) se auditan aparte. */
export function auditSkin(roles: AuditableSkin): ContrastViolation[] {
  const v: ContrastViolation[] = [];

  check(v, "hud vs bg", roles.hud, roles.bg, 4.5);
  check(v, "hud vs #000", roles.hud, BLACK, 4.5);
  check(v, "overlayTitle vs bg", roles.overlayTitle, roles.bg, 4.5);
  check(v, "overlaySub vs bg", roles.overlaySub, roles.bg, 4.5);

  check(v, "primary vs bg", roles.primary, roles.bg, 3);
  check(v, "primary vs #000", roles.primary, BLACK, 3);
  check(v, "primaryAlt vs bg", roles.primaryAlt, roles.bg, 3);
  check(v, "secondary vs bg", roles.secondary, roles.bg, 3);
  check(v, "accent vs bg", roles.accent, roles.bg, 3);
  check(v, "primaryInk vs primary", roles.primaryInk, roles.primary, 3);

  const gridComposited = composite(roles.grid, roles.gridAlpha, roles.bg);
  check(v, "grid vs bg", gridComposited, roles.bg, 2, "max");

  const [vr, vg, vb, va] = parseColor(roles.overlayVeil);
  const veilHex = `#${[vr, vg, vb].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  const veilComposited = composite(veilHex, va, roles.bg);
  check(v, "overlayTitle vs veil", roles.overlayTitle, veilComposited, 4.5);

  return v;
}

/** Audita la separación de luminancia entre colores adyacentes de una rampa multicolor. */
export function auditRampSeparation(ramp: string[], minRatio = 1.3): ContrastViolation[] {
  const v: ContrastViolation[] = [];
  for (let i = 0; i < ramp.length - 1; i++) {
    const ratio = contrastRatio(ramp[i], ramp[i + 1]);
    if (ratio < minRatio) {
      v.push({
        check: `ramp[${i}] vs ramp[${i + 1}]`,
        ratio: Number(ratio.toFixed(2)),
        threshold: minRatio,
        rule: "min",
      });
    }
  }
  return v;
}
