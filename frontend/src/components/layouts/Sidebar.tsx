import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import Icon from "./Icons";
import type { ComponentProps } from "react";
import { authService } from "../../services/authService";
import LogoutModal from "./LogoutModal";

type SidebarProps = { collapsed: boolean };

const menu = [
  { label: "Tổng quan", icon: "dashboard", path: "/dashboard" },
  { label: "Nhân sự", icon: "users", arrow: true, path: "/employees" },
  { label: "Phòng ban", icon: "network", path: "/departments" },
  { label: "Ca làm việc", icon: "calendar", path: "/shifts" },
  { label: "Lịch phân ca", icon: "calendar", path: "/schedules" },
  { label: "Chấm công", icon: "clock", path: "/attendance" },
  { label: "Nghỉ phép", icon: "send", path: "/leave-requests" },
  { label: "Bảng lương", icon: "wallet", path: "/payroll" },
  { label: "Cài đặt", icon: "settings", arrow: true, path: "/settings" },
] as const;

export default function Sidebar({ collapsed }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const currentUser = authService.getCurrentUser();

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    authService.logout();
  };

  const displayName =
    currentUser?.fullName || currentUser?.name || "Người dùng";

  return (
    <>
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
            className="logout-link"
            onClick={(e) => {
              e.preventDefault();
              setShowLogoutModal(true);
            }}
            title={collapsed ? "Đăng xuất" : undefined}
            style={{
              background: "none",
              border: "none",
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <Icon name="logout" size={21} />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        userName={displayName}
      />
    </>
  );
}
