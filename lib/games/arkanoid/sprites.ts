import type { SkinId } from "../skins";
import type { BlockColor } from "./levels";
import type { ArkanoidSkin } from "./skin";

export type SpriteFrame = { sx: number; sy: number; sw: number; sh: number };

export const EXPLOSION_FRAMES: Record<BlockColor, SpriteFrame[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

export const EXPLOSION_DURATION = 150;

const SPRITES: {
  paddle: SpriteFrame;
  ball: SpriteFrame;
  blocks: Record<BlockColor, SpriteFrame>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};

// La imagen cruda se conserva ademas de la rasterizacion: hace falta como
// mascara de alfa para cada variante tenida.
let rawSheet: HTMLImageElement | null = null;
let ssLoaded = false;
const ssCallbacks: Array<() => void> = [];
/** Una variante del atlas por skin; se construye la primera vez que se pide. */
const sheets = new Map<SkinId, HTMLCanvasElement>();

export function loadSpritesheet(cb: () => void) {
  if (ssLoaded) {
    cb();
    return;
  }
  ssCallbacks.push(cb);
  if (rawSheet) return;

  const rawImg = new Image();
  rawImg.onload = () => {
    rawSheet = rawImg;
    ssLoaded = true;
    ssCallbacks.forEach((f) => f());
  };
  rawImg.onerror = () => console.error("Failed to load spritesheet");
  rawImg.src = "/games/arkanoid/spritesheet-breakout.png";
}

type TintRegion = SpriteFrame & { tint: string };

/** Las regiones del atlas que se tinen: bloque + tiras de explosion, paddle y pelota. */
function tintRegions(skin: ArkanoidSkin): TintRegion[] {
  const tints = skin.tints;
  if (!tints) return [];
  const regions: TintRegion[] = [];
  const seen = new Set<string>();
  const push = (frame: SpriteFrame, tint: string) => {
    const key = `${frame.sx},${frame.sy}`;
    // La tira de explosion de `gray` reutiliza los mismos rects que la de `red`;
    // la primera en insertarse gana y la region se tine una sola vez.
    if (seen.has(key)) return;
    seen.add(key);
    regions.push({ ...frame, tint });
  };

  for (const [color, frame] of Object.entries(SPRITES.blocks)) {
    push(frame, tints.blocks[color as BlockColor]);
  }
  for (const [color, frames] of Object.entries(EXPLOSION_FRAMES)) {
    for (const frame of frames) push(frame, tints.blocks[color as BlockColor]);
  }
  push(SPRITES.paddle, tints.paddle);
  push(SPRITES.ball, tints.ball);
  return regions;
}

function buildSheet(skin: ArkanoidSkin, raw: HTMLImageElement): HTMLCanvasElement {
  const oc = document.createElement("canvas");
  oc.width = raw.width;
  oc.height = raw.height;
  const octx = oc.getContext("2d")!;
  octx.drawImage(raw, 0, 0);

  for (const r of tintRegions(skin)) {
    octx.save();
    octx.beginPath();
    octx.rect(r.sx, r.sy, r.sw, r.sh);
    octx.clip();

    // "color" toma tono y saturacion del tinte y conserva la luminosidad (el
    // biselado) del sprite original.
    octx.globalCompositeOperation = "color";
    octx.fillStyle = r.tint;
    octx.fillRect(r.sx, r.sy, r.sw, r.sh);

    // Aplanado de valor hacia el tinte, solo donde la skin lo pide (monocromo).
    if (skin.tintFlatten > 0) {
      octx.globalCompositeOperation = "source-atop";
      octx.globalAlpha = skin.tintFlatten;
      octx.fillRect(r.sx, r.sy, r.sw, r.sh);
      octx.globalAlpha = 1;
    }

    // Restaura el alfa original: sin este pase la region queda como un
    // rectangulo opaco.
    octx.globalCompositeOperation = "destination-in";
    octx.drawImage(raw, 0, 0);

    octx.restore();
    octx.globalCompositeOperation = "source-over";
  }

  return oc;
}

/** Atlas tenido para esta skin, cacheado por id. `null` mientras el atlas no cargo. */
export function getSheet(skin: ArkanoidSkin): HTMLCanvasElement | null {
  if (!ssLoaded || !rawSheet) return null;
  const cached = sheets.get(skin.id);
  if (cached) return cached;
  const built = buildSheet(skin, rawSheet);
  sheets.set(skin.id, built);
  return built;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLCanvasElement,
  frame: SpriteFrame,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.drawImage(sheet, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLCanvasElement,
  name: "paddle" | "ball" | `block_${BlockColor}`,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const sp: SpriteFrame | undefined = name.startsWith("block_")
    ? SPRITES.blocks[name.slice(6) as BlockColor]
    : SPRITES[name as "paddle" | "ball"];
  if (!sp) return;
  ctx.drawImage(sheet, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
}
