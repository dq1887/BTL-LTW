import { useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { roleLabel } from './types';
import { initials } from './lib/presentation';
import { readStorage, writeStorage } from './lib/storage';
import LoginPage from './pages/LoginPage';
import RequestsPage from './pages/RequestsPage';
import TypesPage from './pages/TypesPage';
import Icon from './components/Icon';
import ErrorBoundary from './components/ErrorBoundary';
function ProtectedLayout() {
  const { user, logout } = useAuth(); const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <div className="app-shell"><a className="skip-link" href="#main-content">Đến nội dung chính</a><aside className="sidebar"><NavLink to="/leave/requests" className="brand"><span className="brand-mark"><Icon name="grid" size={21} /></span><span>HRM<small>NỘI BỘ DOANH NGHIỆP</small></span></NavLink><div className="nav-caption">KHÔNG GIAN LÀM VIỆC</div><nav aria-label="Điều hướng chính"><NavLink to="/leave/requests"><Icon name="calendar" /><span>Đơn nghỉ & phê duyệt</span></NavLink><NavLink to="/leave/types"><Icon name="layers" /><span>Danh mục loại nghỉ</span></NavLink></nav><div className="sidebar-foot"><div className="module-tag">04</div><div><strong>Nghỉ phép</strong><small>Nhân sự · Công · Lương</small></div></div></aside><div className="workspace"><header className="topbar"><div className="breadcrumb">Không gian làm việc<Icon name="chevron" size={13} /><strong>{location.pathname === '/leave/types' ? 'Loại nghỉ' : 'Đơn nghỉ'}</strong></div><div className="topbar-right"><span className="avatar user-avatar">{initials(user.fullName)}</span><div className="user-info"><strong>{user.fullName}</strong><small>{roleLabel[user.role]}</small></div><button className="icon-button" onClick={logout} title="Đăng xuất" aria-label="Đăng xuất"><Icon name="logout" /></button></div></header><main id="main-content" className="main"><ErrorBoundary key={location.pathname}><Outlet /></ErrorBoundary></main><footer className="workspace-footer"><span>HRM / Quản lý nghỉ phép</span><span>Dữ liệu hiển thị theo quyền tài khoản</span></footer></div></div>;
}
export default function App() {
  const { loading } = useAuth(); const [theme, setTheme] = useState(() => readStorage('hrm-theme', true) === 'dark' ? 'dark' : 'light');
  function toggle() { const next = theme === 'light' ? 'dark' : 'light'; setTheme(next); writeStorage('hrm-theme', next, true); }
  return <div className="leave-ui" data-theme={theme}><button className="theme-toggle icon-button" onClick={toggle} title={theme === 'light' ? 'Chuyển giao diện tối' : 'Chuyển giao diện sáng'} aria-label={theme === 'light' ? 'Chuyển giao diện tối' : 'Chuyển giao diện sáng'}><Icon name={theme === 'light' ? 'moon' : 'sun'} /></button>{loading ? <div className="empty fullscreen" role="status"><div className="loader" /><p>Đang kiểm tra phiên đăng nhập…</p></div> : <Routes><Route path="/login" element={<LoginPage />} /><Route element={<ProtectedLayout />}><Route index element={<Navigate to="/leave/requests" replace />} /><Route path="/leave/requests" element={<RequestsPage />} /><Route path="/leave/types" element={<TypesPage />} /><Route path="*" element={<section className="empty"><p className="eyebrow">404</p><h1>Không tìm thấy trang</h1><p>Đường dẫn có thể đã thay đổi hoặc không còn tồn tại.</p><NavLink className="link-button" to="/leave/requests">Về danh sách đơn nghỉ</NavLink></section>} /></Route></Routes>}</div>;
}
