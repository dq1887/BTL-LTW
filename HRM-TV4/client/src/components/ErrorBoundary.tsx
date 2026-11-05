import { Component, type ErrorInfo, type ReactNode } from 'react';
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('HRM UI:', error, info.componentStack); }
  render() { return this.state.failed ? <div className="empty" role="alert"><h2>Trang chưa thể hiển thị</h2><p>Hãy tải lại trang. Nếu vẫn gặp lỗi, kiểm tra phản hồi dữ liệu từ máy chủ.</p><button onClick={() => window.location.reload()}>Tải lại trang</button></div> : this.props.children; }
}
