import { useMemo } from 'react';
import LeaveModule from '../modules/leave/integration/LeaveModule';
import type { User as LeaveUser, Role } from '../modules/leave/types';
import { authService } from '../services/authService';
import { useLocation } from 'react-router-dom';
export default function LeavePage() {
  const current = authService.getCurrentUser();
  const token = authService.getToken();
  const location = useLocation();
  const leaveUser = useMemo<LeaveUser | null>(() => {
    if (!current) return null;
    return { id: String(current.id), employeeId: String(current.id), username: current.email,
      fullName: current.fullName || current.name || current.email, role: (current.role || 'employee') as Role };
  }, [current?.id, current?.email, current?.role, current?.name, current?.fullName]);
  if (!token || !leaveUser) return <p>ChÆ°a cÃ³ phiÃªn Ä‘Äƒng nháº­p. HÃ£y Ä‘Äƒng nháº­p láº¡i.</p>;
  return <LeaveModule token={token} user={leaveUser} view={location.pathname.endsWith('leave-types') ? 'types' : 'requests'} onSessionExpired={() => authService.logout()}/>;
}


