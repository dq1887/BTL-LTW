import { useEffect, useRef, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { setAccessToken } from '../api';
import { useLeaveFilters } from '../stores/useLeaveFilters';
import type { User } from '../types';
import RequestsPage from '../pages/RequestsPage';
import TypesPage from '../pages/TypesPage';
import ErrorBoundary from '../components/ErrorBoundary';
import '../style.css';
export default function LeaveModule({ user, token, view, onSessionExpired, theme = 'light' }: { user: User; token: string; view: 'requests' | 'types'; onSessionExpired: () => void; theme?: 'light' | 'dark' }) {
  const sessionKey = user.id + ':' + token; const [ready, setReady] = useState(''); const expiredHandler = useRef(onSessionExpired);
  useEffect(() => { expiredHandler.current = onSessionExpired; }, [onSessionExpired]);
  useEffect(() => { setAccessToken(token); useLeaveFilters.getState().reset(); setReady(sessionKey); const expired = () => expiredHandler.current(); window.addEventListener('auth-expired', expired); return () => { window.removeEventListener('auth-expired', expired); setAccessToken(''); }; }, [token, sessionKey]);
  return <div className="leave-ui embedded" data-theme={theme}>{ready !== sessionKey ? <p role="status">Đang chuẩn bị dữ liệu…</p> : <AuthContext.Provider value={{ user, loading: false, login: async () => { throw new Error('Dùng đăng nhập chung của nhóm.'); }, logout: onSessionExpired }}><ErrorBoundary key={view + user.id}>{view === 'requests' ? <RequestsPage key={user.id} /> : <TypesPage key={user.id} />}</ErrorBoundary></AuthContext.Provider>}</div>;
}
