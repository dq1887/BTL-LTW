import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "./MainLayout.css";

type MainLayoutProps = { children: ReactNode };

export function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`app-shell ${collapsed ? "sidebar-is-collapsed" : ""}`}>
      <Sidebar collapsed={collapsed} />
      <div className="main-area">
        <Header
          onToggleSidebar={() => setCollapsed((current) => !current)}
          collapsed={collapsed}
        />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

export default MainLayout;
