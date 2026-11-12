import { useEffect, useRef, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { setAccessToken } from '../api';
import { useLeaveFilters } from '../stores/useLeaveFilters';
import type { User } from '../types';
import RequestsPage from '../pages/RequestsPage';
import TypesPage from '../pages/TypesPage';
import ErrorBoundary from '../components/ErrorBoundary';
import '../style.css';
export default function LeaveModule({ user, token, view, onSessionExpired }: { user: User; token: string; view: 'requests' | 'types'; onSessionExpired: () => void }) {
  const sessionKey = user.id + ':' + token; const [ready, setReady] = useState(''); const expiredHandler = useRef(onSessionExpired);
  useEffect(() => { expiredHandler.current = onSessionExpired; }, [onSessionExpired]);
  useEffect(() => { setAccessToken(token); useLeaveFilters.getState().reset(); setReady(sessionKey); const expired = () => expiredHandler.current(); window.addEventListener('auth-expired', expired); return () => { window.removeEventListener('auth-expired', expired); setAccessToken(''); }; }, [token, sessionKey]);
  return <div className="leave-ui embedded" data-theme="light">{ready !== sessionKey ? <p role="status">Äang chuáº©n bá»‹ dá»¯ liá»‡uâ€¦</p> : <AuthContext.Provider value={{ user, loading: false, login: async () => { throw new Error('DÃ¹ng Ä‘Äƒng nháº­p chung cá»§a nhÃ³m.'); }, logout: onSessionExpired }}><ErrorBoundary key={view + user.id}>{view === 'requests' ? <RequestsPage key={user.id} /> : <TypesPage key={user.id} />}</ErrorBoundary></AuthContext.Provider>}</div>;
}


