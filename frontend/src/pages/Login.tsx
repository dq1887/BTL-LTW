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

      navigate("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại!";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

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
        {errorMessage && (
          <div className="login-error">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

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

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              marginTop: "16px",
              marginBottom: "24px",
              boxSizing: "border-box",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "14px",
                color: "#475569",
                whiteSpace: "nowrap",
                userSelect: "none",
                margin: 0,
              }}
            >
              <input
                type="checkbox"
                defaultChecked
                style={{
                  margin: 0,
                  width: "16px",
                  height: "16px",
                  cursor: "pointer",
                  accentColor: "#2563eb",
                }}
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>

            <span
              className="forgot-password"
              style={{
                fontSize: "14px",
                color: "#2563eb",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontWeight: "500",
              }}
            >
              Quên mật khẩu?
            </span>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Đang xác thực..." : "Đăng nhập vào hệ thống"}
          </button>
        </form>

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
