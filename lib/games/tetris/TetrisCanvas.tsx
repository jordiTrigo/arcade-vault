"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createTetrisGame, type TetrisGame, type TetrisState } from "./engine";
import type { SkinId } from "../skins";
import { SKINS } from "./skin";

export type TetrisCanvasHandle = {
  pause: () => void;
  resume: () => void;
  reset: () => void;
};

export type TetrisCanvasProps = {
  onStateChange: (state: TetrisState) => void;
  /** Paleta activa; se aplica en caliente sin reiniciar la partida. */
  skin: SkinId;
};

const KEYS = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "KeyX", "Space"];

export const TetrisCanvas = forwardRef<TetrisCanvasHandle, TetrisCanvasProps>(function TetrisCanvas(
  { onStateChange, skin },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<TetrisGame | null>(null);
  const lastStateRef = useRef<TetrisState | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const onStateChangeRef = useRef(onStateChange);
  const skinRef = useRef(skin);
  skinRef.current = skin;

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useImperativeHandle(
    ref,
    () => ({
      pause: () => {
        gameRef.current?.setPaused(true);
      },
      resume: () => {
        lastTimeRef.current = null;
        gameRef.current?.setPaused(false);
      },
      reset: () => {
        lastTimeRef.current = null;
        gameRef.current?.reset();
      },
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const nextCanvas = nextCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    const nextCtx = nextCanvas?.getContext("2d");
    if (!canvas || !nextCanvas || !ctx || !nextCtx) return;

    const game = createTetrisGame(ctx, nextCtx, SKINS[skinRef.current]);
    gameRef.current = game;
    lastStateRef.current = null;
    lastTimeRef.current = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!KEYS.includes(e.code)) return;
      e.preventDefault();
      game.keyDown(e.code);
    };
    window.addEventListener("keydown", handleKeyDown);

    const loop = (ts: number) => {
      const dt = lastTimeRef.current === null ? 0 : Math.min(ts - lastTimeRef.current, 1000);
      lastTimeRef.current = ts;

      game.update(dt);
      game.draw();

      const state = game.getState();
      const prev = lastStateRef.current;
      if (
        !prev ||
        prev.score !== state.score ||
        prev.level !== state.level ||
        prev.status !== state.status
      ) {
        lastStateRef.current = state;
        onStateChangeRef.current(state);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", handleKeyDown);
      gameRef.current = null;
    };
  }, []);

  // Deliberadamente separado del efecto de creación: si `skin` entrara en sus
  // deps, cambiar de paleta recrearía el juego y reiniciaría la partida.
  useEffect(() => {
    gameRef.current?.setSkin(SKINS[skin]);
  }, [skin]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      <canvas ref={canvasRef} width={300} height={600} style={{ height: "100%", width: "auto" }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <span className="pixel neon-cyan" style={{ fontSize: 10, letterSpacing: "0.16em" }}>
          NEXT
        </span>
        <canvas ref={nextCanvasRef} width={120} height={120} style={{ width: 90, height: 90 }} />
      </div>
    </div>
  );
});
