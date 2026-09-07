"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

export type SessionUser = { name: string } | null;

type SessionContextValue = {
  user: SessionUser;
  login: (u: SessionUser) => void;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const listeners = new Set<() => void>();

function readUser(): SessionUser {
  try {
    return JSON.parse(localStorage.getItem("av_user") || "null");
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function emitChange() {
  listeners.forEach((l) => l());
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(subscribe, readUser, () => null);

  const login = (u: SessionUser) => {
    localStorage.setItem("av_user", JSON.stringify(u));
    emitChange();
  };

  const logout = () => {
    localStorage.removeItem("av_user");
    emitChange();
  };

  return (
    <SessionContext.Provider value={{ user, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
