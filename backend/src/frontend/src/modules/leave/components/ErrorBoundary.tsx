import { Component, type ErrorInfo, type ReactNode } from 'react';
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('HRM UI:', error, info.componentStack); }
  render() { return this.state.failed ? <div className="empty" role="alert"><h2>Trang chÆ°a thá»ƒ hiá»ƒn thá»‹</h2><p>HÃ£y táº£i láº¡i trang. Náº¿u váº«n gáº·p lá»—i, kiá»ƒm tra pháº£n há»“i dá»¯ liá»‡u tá»« mÃ¡y chá»§.</p><button onClick={() => window.location.reload()}>Táº£i láº¡i trang</button></div> : this.props.children; }
}


