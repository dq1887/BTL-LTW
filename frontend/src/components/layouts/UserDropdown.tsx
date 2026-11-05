import { useState } from "react";
import Icon from "./Icons";

export default function UserDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <div className="user-menu-wrap">
      <button className="user-profile" onClick={() => setOpen((value) => !value)}>
        <div className="avatar">A</div>
        <span className="user-info"><strong>Nguyễn Văn A</strong><small>Admin</small></span>
        <Icon name="chevron-down" size={16} />
      </button>
      {open && (
        <div className="user-dropdown">
          <button><Icon name="user" size={16} /> Hồ sơ cá nhân</button>
          <button><Icon name="settings" size={16} /> Cài đặt tài khoản</button>
          <button className="dropdown-logout"><Icon name="logout" size={16} /> Đăng xuất</button>
        </div>
      )}
    </div>
  );
}
