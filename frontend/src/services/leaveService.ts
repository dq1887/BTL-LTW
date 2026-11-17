import api from "./api";

export interface LeaveType {
  _id: string;
  code: string;
  name: string;
  description?: string;
  isPaid: boolean;
}

export interface LeaveEmployee {
  _id: string;
  employeeCode: string;
  fullName: string;
  position?: string;
  departmentId?: string;
}

export interface LeaveRequest {
  _id: string;
  employeeId: LeaveEmployee | string;
  leaveTypeId: LeaveType | string;
  startDate: string;
  endDate: string;
  scheduledDates: string[];
  totalDays: number | null;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewedBy?: { _id: string; fullName: string; employeeCode: string } | null;
  reviewedAt?: string | null;
  reviewNote?: string;
  createdAt: string;
};

interface ApiList<T> {
  success: boolean;
  count: number;
  data: T[];
}

interface ApiItem<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface SchedulePreview {
  success: boolean;
  count: number;
  dates: string[];
  draftDates?: string[];
  data: { date: string; source?: string; shift: { id: string; name: string; startTime: string; endTime: string } }[];
}

export const leaveService = {
  async getTypes(): Promise<LeaveType[]> {
    const response = await api.get("/leave/types");
    return (response.data as ApiList<LeaveType>).data;
  },

  async getRequests(): Promise<LeaveRequest[]> {
    const response = await api.get("/leave/requests");
    return (response.data as ApiList<LeaveRequest>).data;
  },

  async getScheduleDays(startDate: string, endDate: string): Promise<SchedulePreview> {
    const response = await api.get("/leave/schedule-days", {
      params: { startDate, endDate },
    });
    return response.data as SchedulePreview;
  },

  async create(payload: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
  }): Promise<LeaveRequest> {
    const response = await api.post("/leave/requests", payload);
    return (response.data as ApiItem<LeaveRequest>).data;
  },

  async update(
    id: string,
    payload: { leaveTypeId: string; startDate: string; endDate: string; reason: string },
  ): Promise<LeaveRequest> {
    const response = await api.patch(`/leave/requests/${id}`, payload);
    return (response.data as ApiItem<LeaveRequest>).data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/leave/requests/${id}`);
  },

  async approve(id: string, reviewNote: string): Promise<LeaveRequest> {
    const response = await api.post(`/leave/requests/${id}/approve`, { reviewNote });
    return (response.data as ApiItem<LeaveRequest>).data;
  },

  async reject(id: string, reviewNote: string): Promise<LeaveRequest> {
    const response = await api.post(`/leave/requests/${id}/reject`, { reviewNote });
    return (response.data as ApiItem<LeaveRequest>).data;
  },
};
