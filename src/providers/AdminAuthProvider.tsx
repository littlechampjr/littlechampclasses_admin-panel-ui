"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "lcc_admin_jwt";

export type AdminSession = {
  token: string;
  admin: { id: string; email: string; role: string; permissions: string[] };
};

type AdminAuthContextValue = {
  /** `false` during SSR and the hydration pass so SSR markup matches the first client paint. */
  authHydrated: boolean;
  token: string | null;
  admin: AdminSession["admin"] | null;
  login: (session: AdminSession) => void;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const sessionListeners = new Set<() => void>();

function emitSessionChange() {
  sessionListeners.forEach((l) => l());
}

function subscribeSession(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  sessionListeners.add(onStoreChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    sessionListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSessionRawSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

function getServerSessionRawSnapshot(): string | null {
  return null;
}

/** SSR / hydration snapshot — matches server HTML until the client takes over (React docs). */
function subscribeHydrationComplete(): () => void {
  return () => {};
}

function getClientHydratedSnapshot(): boolean {
  return true;
}

function getServerHydratedSnapshot(): boolean {
  return false;
}

function parseStoredSession(raw: string | null): AdminSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AdminSession;
    if (parsed.token && parsed.admin) return parsed;
    return null;
  } catch {
    return null;
  }
}

function readStoredSession(): AdminSession | null {
  return parseStoredSession(getSessionRawSnapshot());
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const rawSession = useSyncExternalStore(
    subscribeSession,
    getSessionRawSnapshot,
    getServerSessionRawSnapshot,
  );
  const clientReady = useSyncExternalStore(
    subscribeHydrationComplete,
    getClientHydratedSnapshot,
    getServerHydratedSnapshot,
  );

  const session = clientReady ? parseStoredSession(rawSession) : null;
  const token = session?.token ?? null;
  const admin = session?.admin ?? null;

  const login = useCallback((sessionData: AdminSession) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    emitSessionChange();
  }, []);

  const logout = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    emitSessionChange();
  }, []);

  const value = useMemo(
    () => ({
      authHydrated: clientReady,
      token,
      admin,
      login,
      logout,
    }),
    [clientReady, token, admin, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}

export function readStoredAdminToken(): string | null {
  return readStoredSession()?.token ?? null;
}
