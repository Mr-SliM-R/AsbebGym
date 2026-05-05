import { createContext, useContext, useMemo, useState } from "react";
import { api } from "./api";
import type { Account, AuthSession, Organization, User } from "./types";

type AuthContextValue = {
  user: User | null;
  account: Account | null;
  organization: Organization | null;
  token: string | null;
  login: (payload: { username?: string; email?: string; password?: string }) => Promise<void>;
  signup: (payload: { email: string; password: string; displayName: string; organizationName: string; inviteCode?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const storageKey = "gym-rival-session";

function readStoredSession() {
  const raw = localStorage.getItem(storageKey);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession | User;
    if ("user" in parsed && "token" in parsed) {
      return parsed;
    }

    return {
      user: parsed as User,
      account: null,
      organization: null,
      token: "demo"
    };
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      account: session?.account ?? null,
      organization: session?.organization ?? null,
      token: session?.token ?? null,
      login: async (payload) => {
        const result = await api.login(payload);
        setSession(result);
        localStorage.setItem(storageKey, JSON.stringify(result));
      },
      signup: async (payload) => {
        const result = await api.signup(payload);
        setSession(result);
        localStorage.setItem(storageKey, JSON.stringify(result));
      },
      logout: () => {
        setSession(null);
        localStorage.removeItem(storageKey);
      },
      updateUser: (nextUser: User) => {
        setSession((current) => {
          const nextSession = current
            ? { ...current, user: nextUser }
            : { user: nextUser, account: null, organization: null, token: "demo" };
          localStorage.setItem(storageKey, JSON.stringify(nextSession));
          return nextSession;
        });
      }
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return value;
}
