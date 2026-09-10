"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createArkanoidGame, type ArkanoidGame, type ArkanoidState } from "./engine";
import { SKINS } from "./skin";
import type { SkinId } from "../skins";

export type ArkanoidCanvasHandle = {
  pause: () => void;
  resume: () => void;
  reset: () => void;
};

export type ArkanoidCanvasProps = {
  onStateChange: (state: ArkanoidState) => void;
  skin: SkinId;
};

const KEYS = ["ArrowLeft", "ArrowRight"];

export const ArkanoidCanvas = forwardRef<ArkanoidCanvasHandle, ArkanoidCanvasProps>(
  function ArkanoidCanvas({ onStateChange, skin }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<ArkanoidGame | null>(null);
    const lastStateRef = useRef<ArkanoidState | null>(null);
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
      const game = createArkanoidGame(ctx, SKINS[skinRef.current]);
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
      const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        game.pointerMove((e.clientX - rect.left) * scaleX);
      };
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      canvas.addEventListener("mousemove", handleMouseMove);

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

      // El spritesheet carga async (loadSpritesheet dentro del engine); se espera con
      // setTimeout (no rAF) a que game.ready sea true antes de arrancar el loop.
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
        canvas.removeEventListener("mousemove", handleMouseMove);
        gameRef.current = null;
      };
    }, []);

    // Cambiar de skin no recrea el juego: solo repinta con otra paleta.
    useEffect(() => {
      gameRef.current?.setSkin(SKINS[skin]);
    }, [skin]);

    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
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
  },
);
