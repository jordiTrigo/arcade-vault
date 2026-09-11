"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { TOUCH_ACTIONS, type TouchAction } from "@/lib/games/registry";

function dispatchKey(type: "keydown" | "keyup", code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
}

function DpadButton({
  code,
  label,
  className,
}: {
  code: string;
  label: string;
  className: string;
}) {
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
      {label}
    </button>
  );
}

function ActionButton({ action, fallbackLabel }: { action?: TouchAction; fallbackLabel: string }) {
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
      className={`touch-ab-btn${inert ? " inert" : ""}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {action ? action.label : fallbackLabel}
    </button>
  );
}

export function TouchControls({ gameId }: { gameId: string }) {
  const actions = TOUCH_ACTIONS[gameId];

  return (
    <div className="touch-pad" style={{ touchAction: "none", userSelect: "none" }}>
      <div className="touch-dpad">
        <DpadButton code="ArrowUp" label="▲" className="up" />
        <DpadButton code="ArrowLeft" label="◀" className="left" />
        <DpadButton code="ArrowRight" label="▶" className="right" />
        <DpadButton code="ArrowDown" label="▼" className="down" />
      </div>
      <div className="touch-ab">
        <ActionButton action={actions?.b} fallbackLabel="B" />
        <ActionButton action={actions?.a} fallbackLabel="A" />
      </div>
    </div>
  );
}
