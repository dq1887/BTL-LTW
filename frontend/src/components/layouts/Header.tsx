import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icons";
import UserDropdown from "./UserDropdown";
import { useTheme } from "../../context/ThemeContext";

type HeaderProps = { onToggleSidebar: () => void; collapsed: boolean };

export default function Header({ onToggleSidebar, collapsed }: HeaderProps) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  const normalizeText = (str: string) =>
    (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .trim();

  // Tải ngầm danh sách nhân viên & phòng ban để nhận diện khi nhấn Enter
  useEffect(() => {
    const fetchSearchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const [empRes, deptRes] = await Promise.all([
          fetch("http://localhost:5000/api/employees", { headers }),
          fetch("http://localhost:5000/api/departments", { headers }),
        ]);

        const empData = await empRes.json();
        const deptData = await deptRes.json();

        setEmployees(
          Array.isArray(empData)
            ? empData
            : empData.data || empData.employees || [],
        );
        setDepartments(
          Array.isArray(deptData)
            ? deptData
            : deptData.data || deptData.departments || [],
        );
      } catch (err) {
        console.error("Lỗi tải dữ liệu tìm kiếm:", err);
      }
    };

    fetchSearchData();
  }, []);

  const executeSearch = () => {
    const raw = searchQuery.trim();
    if (!raw) return;

    const keyword = normalizeText(raw);

    // 1. Kiểm tra xem từ khóa có khớp với Phòng ban nào không
    const matchedDept = departments.find((d) => {
      const name = normalizeText(d.name || d.departmentName || "");
      const code = normalizeText(d.code || "");
      return name.includes(keyword) || code === keyword;
    });

    // 2. Kiểm tra xem từ khóa có khớp với Nhân viên nào không
    const matchedEmp = employees.find((e) => {
      const fullName = normalizeText(e.fullName || e.name || "");
      const code = normalizeText(e.employeeCode || e.code || "");
      return fullName.includes(keyword) || code === keyword;
    });

    // Nếu khớp Phòng ban (và không khớp Nhân viên) -> sang trang Phòng ban
    if (matchedDept && !matchedEmp) {
      const deptName = matchedDept.name || matchedDept.departmentName;
      navigate(`/departments?search=${encodeURIComponent(deptName)}`);
      return;
    }

    // Nếu khớp Nhân viên -> sang trang Nhân sự
    if (matchedEmp) {
      const empName = matchedEmp.fullName || matchedEmp.name;
      navigate(`/employees?search=${encodeURIComponent(empName)}`);
      return;
    }

    // Fallback nếu trùng cả hai hoặc chưa tải xong danh sách
    if (matchedDept) {
      const deptName = matchedDept.name || matchedDept.departmentName;
      navigate(`/departments?search=${encodeURIComponent(deptName)}`);
    } else {
      navigate(`/employees?search=${encodeURIComponent(raw)}`);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeSearch();
    }
  };

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
        <button
          type="button"
          onClick={executeSearch}
          aria-label="Tìm kiếm"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            display: "flex",
            alignItems: "center",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          <Icon name="search" size={20} />
        </button>

        <input
          type="text"
          value={searchQuery}
          placeholder="Tìm kiếm nhân viên, phòng ban..."
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />

        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            aria-label="Xóa tìm kiếm"
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              fontSize: "17px",
              lineHeight: 1,
              cursor: "pointer",
              padding: "0 4px",
            }}
          >
            ×
          </button>
        )}
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
