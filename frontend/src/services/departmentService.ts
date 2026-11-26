import type { Employee } from "./employeeService";

const API_BASE_URL = "http://localhost:5000/api/departments";

export interface Department {
  _id: string;
  code: string;
  name: string;
  description?: string;
  status?: "active" | "inactive";
  employeeCount?: number;
  employees?: Employee[];
  createdAt?: string;
  updatedAt?: string;
}

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token") || "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const departmentService = {
  async getAll(): Promise<Department[]> {
    const res = await fetch(API_BASE_URL, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Lỗi khi tải danh sách phòng ban");
    }
    return data;
  },

  async getById(id: string): Promise<Department> {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Không tìm thấy phòng ban");
    }
    return data;
  },

  async getEmployeesByDeptId(id: string): Promise<Employee[]> {
    const res = await fetch(`${API_BASE_URL}/${id}/employees`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Không thể tải nhân viên phòng ban");
    }
    return data;
  },

  async create(deptData: {
    code: string;
    name: string;
    description?: string;
  }): Promise<Department> {
    const res = await fetch(API_BASE_URL, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(deptData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Lỗi khi tạo phòng ban mới");
    }
    return data;
  },

  async update(id: string, deptData: Partial<Department>): Promise<Department> {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(deptData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Lỗi khi cập nhật phòng ban");
    }
    return data;
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Lỗi khi xóa phòng ban");
    }
  },
};
