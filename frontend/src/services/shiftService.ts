// frontend/src/services/shiftService.ts

const API_BASE_URL = "http://localhost:5000/api/shifts";

export interface Shift {
  _id?: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  createdAt?: string;
  updatedAt?: string;
}

// Hàm lấy header kèm JWT Token từ localStorage nếu có
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

export const shiftService = {
  // 1. Lấy danh sách tất cả ca làm việc
  async getAll(): Promise<Shift[]> {
    const res = await fetch(API_BASE_URL, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Lỗi khi tải danh sách ca làm việc!");
    }
    return data;
  },

  // 2. Lấy thông tin 1 ca làm việc theo ID
  async getById(id: string): Promise<Shift> {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Không thể tải thông tin ca làm việc!");
    }
    return data;
  },

  // 3. Thêm ca làm việc mới
  async create(shiftData: Omit<Shift, "_id" | "createdAt" | "updatedAt">): Promise<Shift> {
    const res = await fetch(API_BASE_URL, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(shiftData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Lỗi khi thêm ca làm việc mới!");
    }
    return data;
  },

  // 4. Cập nhật ca làm việc
  async update(
    id: string,
    shiftData: Partial<Omit<Shift, "_id" | "createdAt" | "updatedAt">>
  ): Promise<Shift> {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(shiftData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Lỗi khi cập nhật ca làm việc!");
    }
    return data;
  },

  // 5. Xóa ca làm việc
  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Lỗi khi xóa ca làm việc!");
    }
  },
};

