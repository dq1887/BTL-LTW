// frontend/src/pages/Login.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import "./Login.css";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Xử lý gửi form đăng nhập
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage("Vui lòng nhập đầy đủ Email và Mật khẩu!");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await authService.login(email.trim(), password);
      // Đăng nhập thành công, chuyển hướng đến trang tổng quan Dashboard
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại!";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Hàm chọn nhanh tài khoản mẫu (Demo)
  const handleSelectDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("123456");
    setErrorMessage(null);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h1>HRM System</h1>
          <p>Hệ thống Quản lý Nhân sự & Phân ca</p>
        </div>

        {/* Thông báo lỗi */}
        {errorMessage && (
          <div className="login-error">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form đăng nhập */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email công ty</label>
            <div className="input-wrapper">
              <input
                id="email"
                type="email"
                placeholder="Ví dụ: nam.duong1@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Ẩn / Hiện mật khẩu"
              >
                {showPassword ? "🙈 Ẩn" : "👁️ Hiện"}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" defaultChecked />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <span className="forgot-password">Quên mật khẩu?</span>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Đang xác thực..." : "Đăng nhập vào hệ thống"}
          </button>
        </form>

        {/* Khối gợi ý tài khoản Demo cho BTL */}
        <div className="demo-accounts">
          <div className="demo-title">⚡ Chọn nhanh tài khoản Demo (BTL):</div>
          <div className="demo-chips">
            <button
              type="button"
              className="demo-chip"
              onClick={() => handleSelectDemo("nam.duong1@gmail.com")}
            >
              <span>
                <strong>Dương Hoài Nam</strong> (nam.duong1@gmail.com)
              </span>
              <span className="chip-role role-admin">Admin HR</span>
            </button>
            <button
              type="button"
              className="demo-chip"
              onClick={() => handleSelectDemo("an.nguyen2@gmail.com")}
            >
              <span>
                <strong>Nguyễn Văn An</strong> (an.nguyen2@gmail.com)
              </span>
              <span className="chip-role role-manager">Trưởng phòng</span>
            </button>
            <button
              type="button"
              className="demo-chip"
              onClick={() => handleSelectDemo("binh.tran3@gmail.com")}
            >
              <span>
                <strong>Trần Thị Bình</strong> (binh.tran3@gmail.com)
              </span>
              <span className="chip-role role-employee">Nhân viên</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

