import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

export const SESSION_KEY = 'harbor.session';

export interface SessionUser {
  email: string;
  name: string;
  role: string;
}

export interface Session {
  token: string;
  user: SessionUser;
}

interface AuthContextValue {
  session: Session | null;
  login: (session: Session) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readSession(): Session | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession());

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      login: (next) => {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
        setSession(next);
      },
      logout: () => {
        sessionStorage.removeItem(SESSION_KEY);
        setSession(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
