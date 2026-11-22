import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import Icon from "./Icons";
import { authService } from "../../services/authService";
import LogoutModal from "./LogoutModal";

export default function UserDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentUser = authService.getCurrentUser();

  // Đóng dropdown khi nhấp ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    authService.logout();
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.clear();
    window.location.href = "/login";
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
  const userEmail = currentUser?.email || "";
  const firstLetter = displayName.trim().charAt(0).toUpperCase() || "U";
  const roleLabel = getRoleLabel(currentUser?.role);

  return (
    <>
      <div className="user-menu-wrap" ref={dropdownRef}>
        <button
          className={`user-profile ${open ? "active" : ""}`}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <div className="avatar">{firstLetter}</div>
          <span className="user-info">
            <strong>{displayName}</strong>
            <small>{roleLabel}</small>
          </span>
          <Icon
            name="chevron-down"
            size={16}
            style={{
              transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              opacity: 0.7,
            }}
          />
        </button>

        {open && (
          <div className="user-dropdown">
            {/* Header thông tin người dùng trong dropdown */}
            <div className="user-dropdown-header">
              <div className="dropdown-avatar-wrap">
                <div className="dropdown-mini-avatar">{firstLetter}</div>
                <div className="dropdown-user-details">
                  <span className="dropdown-name">{displayName}</span>
                  {userEmail && (
                    <span className="dropdown-email">{userEmail}</span>
                  )}
                </div>
              </div>
              <span className="dropdown-role-badge">{roleLabel}</span>
            </div>

            <div className="dropdown-divider" />

            <div className="dropdown-menu-list">
              <button
                className="dropdown-item"
                onClick={() => {
                  setOpen(false);
                  navigate("/profile");
                }}
              >
                <div className="dropdown-item-icon">
                  <Icon name="user" size={17} />
                </div>
                <span>Hồ sơ cá nhân</span>
              </button>

              <button
                className="dropdown-item"
                onClick={() => {
                  setOpen(false);
                  navigate("/settings");
                }}
              >
                <div className="dropdown-item-icon">
                  <Icon name="settings" size={17} />
                </div>
                <span>Cài đặt tài khoản</span>
              </button>
            </div>

            <div className="dropdown-divider" />

            <button
              className="dropdown-item dropdown-logout"
              onClick={() => {
                setOpen(false);
                setShowLogoutModal(true);
              }}
            >
              <div className="dropdown-item-icon logout-icon">
                <Icon name="logout" size={17} />
              </div>
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        userName={displayName}
        roleLabel={roleLabel}
      />
    </>
  );
}
