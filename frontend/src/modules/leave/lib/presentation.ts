import type { LeaveRequest, User } from '../types';
export function formatDate(value: string): string { const [year, month, day] = value.split('-'); return `${day}/${month}/${year}`; }
export function initials(value: string): string { return value.trim().split(/\s+/).slice(-2).map((word) => word[0]).join('').toUpperCase(); }
export function permissions(user: User, request: LeaveRequest) {
  const owner = user.employeeId === request.employeeId.id;
  return { owner, edit: request.status === 'pending' && (owner || user.role === 'admin_hr'), review: request.status === 'pending' && !owner && (user.role === 'admin_hr' || user.role === 'manager'), cancel: request.status === 'pending' && (owner || user.role === 'admin_hr') || request.status === 'approved' && user.role === 'admin_hr' };
}
export function csvCell(value: unknown): string {
  let text = String(value ?? ''); if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}


