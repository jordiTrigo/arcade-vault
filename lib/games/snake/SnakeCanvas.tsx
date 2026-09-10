"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createSnakeGame, type SnakeGame, type SnakeState } from "./engine";
import type { SkinId } from "../skins";
import { SKINS } from "./skin";

export type SnakeCanvasHandle = {
  pause: () => void;
  resume: () => void;
  reset: () => void;
};

export type SnakeCanvasProps = {
  onStateChange: (state: SnakeState) => void;
  skin: SkinId;
};

const KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

export const SnakeCanvas = forwardRef<SnakeCanvasHandle, SnakeCanvasProps>(function SnakeCanvas(
  { onStateChange, skin },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<SnakeGame | null>(null);
  const lastStateRef = useRef<SnakeState | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const onStateChangeRef = useRef(onStateChange);
  const skinRef = useRef(skin);
  skinRef.current = skin;
  const [loading, setLoading] = useState(true);

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
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let cancelled = false;
    const game = createSnakeGame(ctx, SKINS[skinRef.current]);
    gameRef.current = game;
    lastStateRef.current = null;
    lastTimeRef.current = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!KEYS.includes(e.code)) return;
      e.preventDefault();
      game.keyDown(e.code);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!KEYS.includes(e.code)) return;
      e.preventDefault();
      game.keyUp(e.code);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

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

    const waitForReady = () => {
      if (cancelled) return;
      if (game.ready) {
        setLoading(false);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      setTimeout(waitForReady, 16);
    };
    waitForReady();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      gameRef.current = null;
    };
  }, []);

  // Deliberadamente separado del efecto de creación: si `skin` entrara en sus
  // deps, cambiar de skin recrearía el juego y reiniciaría la partida.
  useEffect(() => {
    gameRef.current?.setSkin(SKINS[skin]);
  }, [skin]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={800}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      {loading && (
        <div
          className="mono"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-dim)",
            fontSize: 12,
            letterSpacing: "0.16em",
          }}
        >
          CARGANDO...
        </div>
      )}
    </div>
  );
});
