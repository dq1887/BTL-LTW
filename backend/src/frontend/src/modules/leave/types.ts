export type Role = 'admin_hr' | 'manager' | 'employee';
export interface User { id: string; username: string; role: Role; employeeId: string; fullName: string }
export interface Employee { id: string; employeeCode: string; fullName: string; departmentId: string; status: string }
export interface LeaveType { id: string; code: string; name: string; paid: boolean; annualQuota: number | null; active: boolean; used?: boolean }
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export interface LeaveRequest {
  id: string; employeeId: Employee; leaveTypeId: LeaveType; fromDate: string; toDate: string;
  requestedDays: number; leaveDates: string[]; reason: string; status: RequestStatus;
  createdAt?: string; updatedAt?: string; typeNameSnapshot?: string;
  reviewerId?: { id: string; username: string }; reviewNote?: string; cancelReason?: string;
  paidSnapshot?: boolean; history: { action: string; actorId: { id: string; username: string } | null; at: string; note: string }[];
}
export interface Balance { leaveTypeId: string; name: string; paid: boolean; active: boolean; annualQuota: number | null; usedDays: number; pendingDays: number; remainingDays: number | null; year: number }
export const statusLabel: Record<RequestStatus, string> = { pending: 'Chá» duyá»‡t', approved: 'ÄÃ£ duyá»‡t', rejected: 'Tá»« chá»‘i', cancelled: 'ÄÃ£ há»§y' };
export const roleLabel: Record<Role, string> = { admin_hr: 'NhÃ¢n sá»± / HR', manager: 'Quáº£n lÃ½ phÃ²ng', employee: 'NhÃ¢n viÃªn' };
export function todayVN(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year','month','day'].map((type) => parts.find((p) => p.type === type)?.value).join('-');
}
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'ÄÃ£ xáº£y ra lá»—i.';

export interface LeavePreview { requestedDays: number; leaveDates: string[]; paid: boolean; years: { year: number; days: number; remainingBefore: number | null; remainingAfter: number | null }[] }


