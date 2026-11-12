import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setAccessToken } from '../api';
import type { User } from '../types';
import { useLeaveFilters } from '../stores/useLeaveFilters';
import { readStorage, writeStorage } from '../lib/storage';
export interface AuthValue { user: User | null; loading: boolean; login: (username: string, password: string) => Promise<void>; logout: () => void }
export const AuthContext = createContext<AuthValue | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true);
  function logout() { setAccessToken(''); writeStorage('hrm-token', null); setUser(null); useLeaveFilters.getState().reset(); }
  useEffect(() => {
    const controller = new AbortController(); const token = readStorage('hrm-token');
    window.addEventListener('auth-expired', logout);
    if (token) {
      setAccessToken(token);
      api<User>('/auth/me', 'GET', undefined, controller.signal).then((value) => { if (!controller.signal.aborted) setUser(value); }).catch(() => { if (!controller.signal.aborted) logout(); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    } else setLoading(false);
    return () => { controller.abort(); window.removeEventListener('auth-expired', logout); };
  }, []);
  async function login(username: string, password: string) {
    const data = await api<{ token: string; user: User }>('/auth/login', 'POST', { username: username.trim(), password });
    setAccessToken(data.token); writeStorage('hrm-token', data.token); setUser(data.user); useLeaveFilters.getState().reset();
  }
  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('Thiáº¿u AuthProvider'); return context; }


