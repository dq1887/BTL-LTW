import Icon from "./Icons";
import type { ComponentProps } from "react";

type SidebarProps = { collapsed: boolean };

const menu = [
  { label: "Tổng quan", icon: "dashboard", active: true, path: "/dashboard" },
  { label: "Nhân sự", icon: "users", arrow: true, path: "/employees" },
  { label: "Phòng ban", icon: "network", path: "/departments" },
  { label: "Ca làm việc", icon: "calendar", path: "/shifts" },
  { label: "Chấm công", icon: "calendar", arrow: true, path: "/attendance" },
  { label: "Nghỉ phép", icon: "send", path: "/leave-requests" },
  { label: "Bảng lương", icon: "wallet", path: "/payroll" },
  { label: "Báo cáo", icon: "chart", arrow: true, path: "/reports" },
  { label: "Cài đặt", icon: "settings", arrow: true, path: "/settings" },
] as const;

export default function Sidebar({ collapsed }: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div className="brand">
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
          const isActive = "active" in item && item.active;

          return (
            <a
              key={item.label}
              href={item.path}
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
            </a>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="theme-switch" title="Giao diện">
          <span>☾</span>
          <span>☼</span>
        </div>
        <a
          className="logout-link"
          href="#logout"
          title={collapsed ? "Đăng xuất" : undefined}
        >
          <Icon name="logout" size={21} />
          {!collapsed && <span>Đăng xuất</span>}
        </a>
      </div>
    </aside>
  );
}
