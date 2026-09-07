"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type SessionUser = { name: string } | null;

type SessionContextValue = {
  user: SessionUser;
  login: (u: SessionUser) => void;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser>(null);

  useEffect(() => {
    try {
      setUser(JSON.parse(localStorage.getItem("av_user") || "null"));
    } catch {
      setUser(null);
    }
  }, []);

  const login = (u: SessionUser) => {
    setUser(u);
    localStorage.setItem("av_user", JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("av_user");
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
