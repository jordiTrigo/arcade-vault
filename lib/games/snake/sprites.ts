export type FruitName =
  | "banana"
  | "orange"
  | "grape"
  | "garlic"
  | "eggplant"
  | "strawberry"
  | "cherry"
  | "carrot"
  | "mushroom"
  | "broccoli"
  | "watermelon"
  | "pepper"
  | "kiwi"
  | "lemon"
  | "peach"
  | "peanut"
  | "apple"
  | "tomato"
  | "berries"
  | "grapes2"
  | "pineapple"
  | "melon";

type SpriteFrame = { x: number; y: number; w: number; h: number };

export const FRUIT_ATLAS: Record<FruitName, SpriteFrame> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
};

export const FRUIT_NAMES = Object.keys(FRUIT_ATLAS) as FruitName[];

let fruitsImg: HTMLImageElement | null = null;
let fruitsLoaded = false;
const fruitsCallbacks: Array<() => void> = [];

export function loadFruitsImage(cb: () => void) {
  if (fruitsLoaded) {
    cb();
    return;
  }
  fruitsCallbacks.push(cb);
  if (fruitsImg) return;

  const img = new Image();
  img.onload = () => {
    fruitsLoaded = true;
    fruitsCallbacks.forEach((f) => f());
  };
  img.onerror = () => console.error("Failed to load fruits spritesheet");
  fruitsImg = img;
  img.src = "/games/snake/fruits.png";
}

/**
 * `filter` es un filtro de canvas opcional que aporta la skin. Nunca mueve el
 * hue: la fruta tiene que seguir reconociendose como esa fruta.
 */
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  name: FruitName,
  x: number,
  y: number,
  w: number,
  h: number,
  filter = "none",
) {
  if (!fruitsLoaded || !fruitsImg) return;
  const frame = FRUIT_ATLAS[name];
  const scale = Math.min(w / frame.w, h / frame.h);
  const dw = frame.w * scale;
  const dh = frame.h * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.save();
  ctx.filter = filter;
  ctx.drawImage(fruitsImg, frame.x, frame.y, frame.w, frame.h, dx, dy, dw, dh);
  ctx.restore();
}
