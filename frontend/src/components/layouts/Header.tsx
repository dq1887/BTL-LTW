import Icon from "./Icons";
import UserDropdown from "./UserDropdown";

type HeaderProps = { onToggleSidebar: () => void; collapsed: boolean };

export default function Header({ onToggleSidebar, collapsed }: HeaderProps) {
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
      <button className="notification-button" aria-label="Thông báo">
        <Icon name="bell" size={23} />
        <span className="notification-count">3</span>
      </button>
      <UserDropdown />
    </header>
  );
}
