"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { TOUCH_ACTIONS, type TouchAction } from "@/lib/games/registry";

function dispatchKey(type: "keydown" | "keyup", code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
}

function DpadButton({ code, path, className }: { code: string; path: string; className: string }) {
  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dispatchKey("keydown", code);
  };
  const onPointerUp = () => dispatchKey("keyup", code);

  return (
    <button
      type="button"
      className={`touch-key ${className}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
      aria-label={code}
    >
      <svg className="touch-key-arrow" viewBox="0 0 24 24">
        <path d={path} fill="currentColor" />
      </svg>
    </button>
  );
}

function ActionButton({
  action,
  fallbackLabel,
  variant,
}: {
  action?: TouchAction;
  fallbackLabel: string;
  variant: "a" | "b";
}) {
  const inert = !action;

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!action) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dispatchKey("keydown", action.code);
  };
  const onPointerUp = () => {
    if (!action) return;
    dispatchKey("keyup", action.code);
  };

  return (
    <button
      type="button"
      className={`touch-ab-btn ${variant}${inert ? " inert" : ""}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <span className="touch-ab-ring" aria-hidden="true" />
      {action ? action.label : fallbackLabel}
    </button>
  );
}

export function TouchControls({ gameId }: { gameId: string }) {
  const actions = TOUCH_ACTIONS[gameId];

  return (
    <div className="touch-pad" style={{ touchAction: "none", userSelect: "none" }}>
      <div className="touch-dpad">
        <DpadButton code="ArrowUp" path="M12 4 L20 16 L4 16 Z" className="up" />
        <DpadButton code="ArrowLeft" path="M16 4 L16 20 L4 12 Z" className="left" />
        <DpadButton code="ArrowRight" path="M8 4 L20 12 L8 20 Z" className="right" />
        <DpadButton code="ArrowDown" path="M4 8 L20 8 L12 20 Z" className="down" />
        <div className="touch-dpad-hub" aria-hidden="true">
          <span className="touch-dpad-hub-gem" />
        </div>
      </div>
      <div className="touch-ab">
        <ActionButton action={actions?.b} fallbackLabel="B" variant="b" />
        <ActionButton action={actions?.a} fallbackLabel="A" variant="a" />
      </div>
    </div>
  );
}
