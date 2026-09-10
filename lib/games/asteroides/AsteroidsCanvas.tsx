"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createAsteroidsGame, type AsteroidsGame, type AsteroidsState } from "./engine";
import type { SkinId } from "../skins";
import { SKINS } from "./skin";

export type AsteroidsCanvasHandle = {
  pause: () => void;
  resume: () => void;
  reset: () => void;
};

export type AsteroidsCanvasProps = {
  onStateChange: (state: AsteroidsState) => void;
  /** Paleta activa; se aplica en caliente sin reiniciar la partida. */
  skin: SkinId;
};

const KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space"];

export const AsteroidsCanvas = forwardRef<AsteroidsCanvasHandle, AsteroidsCanvasProps>(
  function AsteroidsCanvas({ onStateChange, skin }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<AsteroidsGame | null>(null);
    const lastStateRef = useRef<AsteroidsState | null>(null);
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
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const game = createAsteroidsGame(ctx, SKINS[skinRef.current]);
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
        game.keyUp(e.code);
      };
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      const loop = (ts: number) => {
        const dt =
          lastTimeRef.current === null ? 0 : Math.min((ts - lastTimeRef.current) / 1000, 0.05);
        lastTimeRef.current = ts;

        game.update(dt);
        game.draw();

        const state = game.getState();
        const prev = lastStateRef.current;
        if (
          !prev ||
          prev.score !== state.score ||
          prev.lives !== state.lives ||
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
        window.removeEventListener("keyup", handleKeyUp);
        gameRef.current = null;
      };
    }, []);

    // Deliberadamente separado del efecto de creación: si `skin` entrara en sus
    // deps, cambiar de paleta recrearía el juego y reiniciaría la partida.
    useEffect(() => {
      gameRef.current?.setSkin(SKINS[skin]);
    }, [skin]);

    return (
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    );
  },
);
