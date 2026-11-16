const BASE_URL = "http://localhost:5000/api";

export interface PayrollRow {
  _id: string | null; // null = chưa được lưu vào database
  employeeId: {
    _id: string;
    fullName: string;
    employeeCode?: string;
    position?: string;
  };
  month: string;
  totalCredit: number;
  totalHours: number;
  baseSalary: number;
  hourRate: number;
  allowance: number;
  adjustment: number;
  hourBonus: number;
  total: number;
  note: string;
  status: "draft" | "finalized";
}

export interface SalaryRequestRow {
  _id: string;
  employeeId: { _id: string; fullName: string; employeeCode?: string };
  month: string;
  message: string;
  status: "pending" | "resolved" | "rejected";
  reply: string;
}

export interface PayrollEdit {
  employeeId: string;
  month: string;
  baseSalary: number;
  hourRate: number;
  allowance: number;
  adjustment: number;
  note: string;
}

async function request<T>(
  method: "GET" | "POST" | "PUT",
  path: string,
  options: { params?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  const url = new URL(BASE_URL + path);
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) =>
      url.searchParams.set(key, value),
    );
  }

  const token = localStorage.getItem("token");
  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Đã có lỗi xảy ra!");
  }
  return data as T;
}

export const getPayrolls = (month: string) =>
  request<{ canManage: boolean; currentUserId: string; data: PayrollRow[] }>(
    "GET",
    "/payroll",
    { params: { month } },
  );

export const updatePayroll = (body: PayrollEdit) =>
  request<{ message: string }>("PUT", "/payroll/edit", { body });

export const finalizePayroll = (month: string) =>
  request<{
    message: string;
    count: number;
    saved: number;
    total: number;
    finalizedAt: string;
  }>("POST", "/payroll/finalize", { body: { month } });

export const getRequests = () =>
  request<{ canManage: boolean; data: SalaryRequestRow[] }>(
    "GET",
    "/payroll/requests",
  );

export const createRequest = (body: { month: string; message: string }) =>
  request<{ message: string }>("POST", "/payroll/requests", { body });

export const handleRequest = (
  id: string,
  body: { status: "resolved" | "rejected"; reply: string },
) => request<{ message: string }>("PUT", `/payroll/requests/${id}`, { body });