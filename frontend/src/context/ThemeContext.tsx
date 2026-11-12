// frontend/src/context/ThemeContext.tsx

import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const isDark = theme === "dark";

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme, isDark]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {/* Tự động áp dụng bảng màu chữ sáng khi bật chế độ tối (isDark = true) */}
      {isDark && (
        <style>{`
          /* 1. Đổi toàn bộ tiêu đề và chữ đậm sang màu trắng sáng (#f8fafc) */
          html.dark h1,
          html.dark h2,
          html.dark h3,
          html.dark h4,
          html.dark strong,
          html.dark .emp-name-text,
          html.dark .stat-box-info .value,
          html.dark .dept-name,
          html.dark [style*="color: rgb(15, 23, 42)"],
          html.dark [style*="color: rgb(30, 41, 59)"],
          html.dark [style*="color: #0f172a"],
          html.dark [style*="color: #1e293b"] {
            color: #f8fafc !important;
          }

          /* 2. Đổi chữ nội dung bảng, label, mô tả sang màu xám sáng dễ đọc (#cbd5e1) */
          html.dark p,
          html.dark label,
          html.dark td,
          html.dark th,
          html.dark .dept-desc,
          html.dark .dept-emp-count,
          html.dark .stat-box-info h4,
          html.dark [style*="color: rgb(51, 65, 85)"],
          html.dark [style*="color: rgb(71, 85, 105)"],
          html.dark [style*="color: rgb(100, 116, 139)"],
          html.dark [style*="color: #334155"],
          html.dark [style*="color: #475569"],
          html.dark [style*="color: #64748b"] {
            color: #cbd5e1 !important;
          }

          /* 3. Đổi chữ màu xanh dương đậm (#2563eb) sang xanh dương sáng (#60a5fa) */
          html.dark [style*="color: rgb(37, 99, 235)"],
          html.dark [style*="color: #2563eb"] {
            color: #60a5fa !important;
          }

          /* 4. Đổi các khung Card, Bảng nền trắng sang nền tối (#1e293b) */
          html.dark .dept-card-item,
          html.dark .dept-detail-panel,
          html.dark .stat-box,
          html.dark .filter-bar,
          html.dark .employees-table-card,
          html.dark .modal-content,
          html.dark [style*="background: rgb(255, 255, 255)"],
          html.dark [style*="background-color: rgb(255, 255, 255)"] {
            background-color: #1e293b !important;
            border-color: #334155 !important;
          }

          /* 5. Đổi nền tiêu đề bảng (thead), dòng hover và các ô phụ sang nền tối sâu (#0f172a) */
          html.dark .employees-table th,
          html.dark .dept-emp-table th,
          html.dark .employees-table tbody tr:hover,
          html.dark .dept-emp-table tr:hover,
          html.dark .emp-code-badge,
          html.dark .emp-dept-tag,
          html.dark .btn-secondary-sm,
          html.dark .btn-icon-action,
          html.dark [style*="background: rgb(248, 250, 252)"],
          html.dark [style*="background-color: rgb(248, 250, 252)"],
          html.dark [style*="background: rgb(241, 245, 249)"],
          html.dark [style*="background-color: rgb(241, 245, 249)"] {
            background-color: #0f172a !important;
            color: #e2e8f0 !important;
            border-color: #334155 !important;
          }

          /* 6. Đổi màu ô nhập liệu (input, select, textarea) trong chế độ tối */
          html.dark input:not([type="checkbox"]),
          html.dark select,
          html.dark textarea {
            background-color: #0f172a !important;
            color: #f8fafc !important;
            border-color: #334155 !important;
          }

          html.dark input::placeholder,
          html.dark textarea::placeholder {
            color: #64748b !important;
          }

          /* 7. Đổi màu đường kẻ ngang trong bảng */
          html.dark tr,
          html.dark td,
          html.dark th,
          html.dark .dept-detail-header,
          html.dark .dept-emp-table-wrap {
            border-color: #334155 !important;
          }
        `}</style>
      )}
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};