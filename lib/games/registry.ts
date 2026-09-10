import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { AsteroidsCanvas } from "./asteroides/AsteroidsCanvas";
import { TetrisCanvas } from "./tetris/TetrisCanvas";
import { ArkanoidCanvas } from "./arkanoid/ArkanoidCanvas";
import { SnakeCanvas } from "./snake/SnakeCanvas";
import type { SkinId } from "./skins";

export type GameEngineHandle = {
  pause: () => void;
  resume: () => void;
  reset: () => void;
};

export type GameEngineState = {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover" | "win";
};

export type GameEngineProps = {
  onStateChange: (state: GameEngineState) => void;
  skin: SkinId;
};

type GameEngineComponent = ForwardRefExoticComponent<
  GameEngineProps & RefAttributes<GameEngineHandle>
>;

export const GAME_ENGINES: Partial<Record<string, GameEngineComponent>> = {
  asteroides: AsteroidsCanvas,
  tetris: TetrisCanvas,
  arkanoid: ArkanoidCanvas,
  snake: SnakeCanvas,
};

export const GAME_ENGINE_IDS = Object.keys(GAME_ENGINES);
