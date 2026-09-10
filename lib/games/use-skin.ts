"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_SKIN, resolveSkin, type SkinId } from "./skins";

const STORAGE_KEY = "av_skins";
const listeners = new Set<() => void>();

function readAll(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeStoredSkin(gameId: string, skin: SkinId) {
  try {
    const all = readAll();
    all[gameId] = skin;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
  listeners.forEach((notify) => notify());
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getServerSnapshot(): SkinId {
  return DEFAULT_SKIN;
}

/** Skin activa de un juego, persistida por juego en localStorage. */
export function useSkin(gameId: string): [SkinId, (next: SkinId) => void] {
  const skin = useSyncExternalStore(
    subscribe,
    () => resolveSkin(readAll()[gameId]),
    getServerSnapshot,
  );

  const setSkin = useCallback((next: SkinId) => writeStoredSkin(gameId, next), [gameId]);

  return [skin, setSkin];
}
