import { useState, useEffect } from "react";
import Icon from "./Icons";
import UserDropdown from "./UserDropdown";

type HeaderProps = { onToggleSidebar: () => void; collapsed: boolean };

export default function Header({ onToggleSidebar, collapsed }: HeaderProps) {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <header className="topbar">
      <button
        className="sidebar-toggle"
        onClick={onToggleSidebar}
        aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
      >
        <Icon name="menu" size={25} />
      </button>

      <div className="global-search">
        <Icon name="search" size={20} />
        <input type="search" placeholder="Tìm kiếm nhân viên, phòng ban..." />
      </div>

      <div className="topbar-spacer" />

      <button
        type="button"
        onClick={toggleTheme}
        title={isDark ? "Chuyển sang chế độ Sáng" : "Chuyển sang chế độ Tối"}
        style={{
          background: isDark ? "#334155" : "#f1f5f9",
          border: `1px solid ${isDark ? "#475569" : "#e2e8f0"}`,
          borderRadius: "50%",
          width: "38px",
          height: "38px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "17px",
          marginRight: "6px",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isDark ? "rotate(360deg)" : "rotate(0deg)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            transition: "transform 0.3s ease",
            transform: isDark ? "scale(1.15)" : "scale(1)",
          }}
        >
          {isDark ? "☀️" : "🌙"}
        </span>
      </button>

      <button className="notification-button" aria-label="Thông báo">
        <Icon name="bell" size={23} />
        <span className="notification-count">3</span>
      </button>

      <UserDropdown />
    </header>
  );
}
