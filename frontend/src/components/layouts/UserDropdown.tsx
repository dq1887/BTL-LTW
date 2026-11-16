import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Icon from "./Icons";
import { authService } from "../../services/authService";

export default function UserDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const currentUser = authService.getCurrentUser();

  const handleLogout = () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
      authService.logout();
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "admin_hr":
        return "Admin HR";
      case "manager":
        return "Trưởng phòng";
      case "employee":
        return "Nhân viên";
      case "accountant":
        return "Kế toán";
      default:
        return role || "Người dùng";
    }
  };

  const displayName =
    currentUser?.fullName || currentUser?.name || "Người dùng";
  const firstLetter = displayName.trim().charAt(0).toUpperCase() || "U";
  const roleLabel = getRoleLabel(currentUser?.role);

  return (
    <div className="user-menu-wrap">
      <button
        className="user-profile"
        onClick={() => setOpen((value) => !value)}
      >
        <div className="avatar">{firstLetter}</div>
        <span className="user-info">
          <strong>{displayName}</strong>
          <small>{roleLabel}</small>
        </span>
        <Icon name="chevron-down" size={16} />
      </button>
      {open && (
        <div className="user-dropdown">
          <button
            onClick={() => {
              setOpen(false);
              navigate("/profile");
            }}
            style={{ cursor: "pointer" }}
          >
            <Icon name="user" size={16} /> Hồ sơ cá nhân
          </button>
          <button
            onClick={() => {
              setOpen(false);
              navigate("/settings");
            }}
            style={{ cursor: "pointer" }}
          >
            <Icon name="settings" size={16} /> Cài đặt tài khoản
          </button>
          <button className="dropdown-logout" onClick={handleLogout}>
            <Icon name="logout" size={16} /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
