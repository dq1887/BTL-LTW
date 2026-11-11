// frontend/src/services/employeeService.ts

const API_BASE_URL = "http://localhost:5000/api/employees";

export interface DepartmentInfo {
  _id: string;
  name: string;
  code?: string;
}

export interface Employee {
  _id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  departmentId?: DepartmentInfo | string;
  position: string;
  role: "admin_hr" | "manager" | "employee" | string;
  salary?: number;
  status: "active" | "inactive";
  transferHistory?: Array<{
    oldDepartment?: DepartmentInfo | string;
    newDepartment?: DepartmentInfo | string;
    updatedAt?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetEmployeesResponse {
  employees: Employee[];
  page: number;
  pages: number;
  total: number;
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

export const employeeService = {
  // 1. Lấy danh sách nhân viên (hỗ trợ tìm kiếm, lọc theo phòng ban, lấy tất cả hoặc phân trang)
  async getAll(params?: {
    search?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
  }): Promise<GetEmployeesResponse> {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.departmentId) query.append("departmentId", params.departmentId);
    if (params?.page !== undefined) query.append("page", params.page.toString());
    if (params?.limit !== undefined) query.append("limit", params.limit.toString());

    const url = `${API_BASE_URL}${query.toString() ? `?${query.toString()}` : ""}`;
    const res = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Lỗi khi tải danh sách nhân viên");
    }
    return data;
  },

  // 2. Lấy chi tiết nhân viên
  async getById(id: string): Promise<Employee> {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Không thể tìm thấy nhân viên");
    }
    return data;
  },

  // 3. Tạo mới nhân viên
  async create(employeeData: Partial<Employee>): Promise<Employee> {
    const res = await fetch(API_BASE_URL, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(employeeData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Lỗi khi thêm nhân viên");
    }
    return data;
  },

  // 4. Cập nhật nhân viên
  async update(id: string, employeeData: Partial<Employee>): Promise<Employee> {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(employeeData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Lỗi khi cập nhật nhân viên");
    }
    return data;
  },

  // 5. Điều chuyển phòng ban
  async transfer(id: string, newDepartmentId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/${id}/transfer`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ newDepartmentId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Lỗi khi điều chuyển phòng ban");
    }
    return data;
  },

  // 6. Xóa mềm nhân viên
  async delete(id: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Lỗi khi xóa nhân viên");
    }
    return data;
  },
};

