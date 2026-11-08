// frontend/src/services/authService.ts

const API_AUTH_URL = "http://localhost:5000/api/auth";

export interface User {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  role: "admin_hr" | "manager" | "employee" | string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  // 1. Gửi request đăng nhập lên Backend
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_AUTH_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Đăng nhập thất bại!");
    }

    // Lưu token và thông tin user vào localStorage
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    return data;
  },

  // 2. Lấy thông tin user hiện tại
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // 3. Lấy token
  getToken(): string | null {
    return localStorage.getItem("token");
  },

  // 4. Kiểm tra đã đăng nhập chưa
  isAuthenticated(): boolean {
    return !!localStorage.getItem("token");
  },

  // 5. Đăng xuất
  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  },
};

