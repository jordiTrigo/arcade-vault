"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia("(pointer: coarse)");
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/** Detecta dispositivos de puntero grueso (táctil). false en el primer render. */
export function useIsTouch(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
