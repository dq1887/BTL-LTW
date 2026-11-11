import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icons";
import type { ComponentProps } from "react";
import { authService } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";

type SidebarProps = { collapsed: boolean };

const menu = [
  { label: "Tổng quan", icon: "dashboard", path: "/dashboard" },
  { label: "Nhân sự", icon: "users", arrow: true, path: "/employees" },
  { label: "Phòng ban", icon: "network", path: "/departments" },
  { label: "Ca làm việc", icon: "calendar", path: "/shifts" },
  { label: "Chấm công", icon: "clock", path: "/attendance" },
  { label: "Duyệt sửa công", icon: "check", path: "/attendance-adjustments" },
  { label: "Nghỉ phép", icon: "send", path: "/leave-requests" },
  { label: "Bảng lương", icon: "wallet", path: "/payroll" },
  { label: "Báo cáo", icon: "chart", arrow: true, path: "/reports" },
  { label: "Cài đặt", icon: "settings", arrow: true, path: "/settings" },
] as const;

export default function Sidebar({ collapsed }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
      authService.logout();
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div
        className="brand"
        onClick={() => navigate("/dashboard")}
        style={{ cursor: "pointer" }}
      >
        <div className="brand-mark">
          <Icon name="users" size={37} strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="brand-copy">
            <strong>HRM Internal</strong>
            <span>Quản lý nhân sự thông minh</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Điều hướng chính">
        {menu.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.label}
              to={item.path}
              className={`nav-item ${isActive ? "active" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                name={item.icon as ComponentProps<typeof Icon>["name"]}
                size={23}
                strokeWidth={2.2}
              />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && "arrow" in item && item.arrow && (
                <Icon name="chevron-right" size={17} className="nav-arrow" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <button
          type="button"
          className={`theme-switch ${isDark ? "dark-mode" : "light-mode"}`}
          onClick={toggleTheme}
          title={isDark ? "Đang ở chế độ Tối (bấm để chuyển Sáng)" : "Đang ở chế độ Sáng (bấm để chuyển Tối)"}
          aria-label="Chuyển chế độ sáng tối"
        >
          <span className={`theme-opt ${isDark ? "active" : ""}`}>☾</span>
          <span className={`theme-opt ${!isDark ? "active" : ""}`}>☼</span>
        </button>
        <button
          className="logout-link"
          onClick={handleLogout}
          title={collapsed ? "Đăng xuất" : undefined}
          style={{
            background: "none",
            border: "none",
            width: "100%",
            textAlign: "left",
          }}
        >
          <Icon name="logout" size={21} />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}
