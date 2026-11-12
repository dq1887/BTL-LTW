import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage } from '../types';
import Icon from '../components/Icon';
export default function LoginPage() {
  const { user, login } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [visible, setVisible] = useState(false);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const state: unknown = location.state;
  const from = typeof state === 'object' && state !== null && 'from' in state && typeof state.from === 'string' && state.from.startsWith('/leave/') ? state.from : '/leave/requests';
  if (user) return <Navigate to={from} replace />;
  async function submit(event: FormEvent) { event.preventDefault(); if (busy) return; setBusy(true); setError(''); try { await login(username, password); navigate(from, { replace: true }); } catch (value) { setError(errorMessage(value)); } finally { setBusy(false); } }
  return <main className="login-page"><section className="login-intro"><div className="brand"><span className="brand-mark"><Icon name="grid" size={23} /></span><span>HRM<small>Ná»˜I Bá»˜ DOANH NGHIá»†P</small></span></div><div><p className="eyebrow">MODULE 04</p><h2>Nghá»‰ phÃ©p<br />& phÃª duyá»‡t<span>.</span></h2><p>KhÃ´ng gian quáº£n lÃ½ Ä‘Æ¡n nghá»‰, sá»‘ dÆ° phÃ©p vÃ  chÃ­nh sÃ¡ch nghá»‰ dÃ nh cho nhÃ¢n viÃªn, quáº£n lÃ½ vÃ  HR.</p><div className="login-feature"><Icon name="calendar" /><span>ÄÆ¡n nghá»‰ vÃ  sá»‘ dÆ° theo nÄƒm</span></div><div className="login-feature"><Icon name="shield" /><span>PhÃª duyá»‡t Ä‘Ãºng quyá»n, lÆ°u lá»‹ch sá»­</span></div><div className="login-feature"><Icon name="layers" /><span>LiÃªn káº¿t dá»¯ liá»‡u cÃ´ng vÃ  lÆ°Æ¡ng</span></div></div><small>HRM / INTERNAL WORKSPACE</small></section><section className="login-form-section"><div className="login-box"><p className="eyebrow">TÃ€I KHOáº¢N Ná»˜I Bá»˜</p><h1>ÄÄƒng nháº­p</h1><p className="muted">Sá»­ dá»¥ng tÃ i khoáº£n Ä‘Æ°á»£c cáº¥p Ä‘á»ƒ tiáº¿p tá»¥c.</p><form className="form" onSubmit={submit}><fieldset disabled={busy}>
    <label>TÃ i khoáº£n<input autoComplete="username" required maxLength={100} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Nháº­p tÃªn tÃ i khoáº£n" /></label><label>Máº­t kháº©u<div className="password-field"><input type={visible ? 'text' : 'password'} autoComplete="current-password" required maxLength={100} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nháº­p máº­t kháº©u" /><button type="button" className="text-button" aria-label={visible ? 'áº¨n máº­t kháº©u' : 'Hiá»‡n máº­t kháº©u'} onClick={() => setVisible(!visible)}>{visible ? 'áº¨n' : 'Hiá»‡n'}</button></div></label></fieldset>{error && <p role="alert" className="error">{error}</p>}<button className="login-submit" disabled={busy}>{busy ? 'Äang Ä‘Äƒng nháº­pâ€¦' : 'ÄÄƒng nháº­p'}<Icon name="arrow" /></button>
  </form><div className="demo-accounts"><p>TÃ i khoáº£n thá»­ nghiá»‡m <small>Máº­t kháº©u: 123456</small></p><div>{[['employee', 'NhÃ¢n viÃªn'], ['manager', 'Quáº£n lÃ½'], ['hr', 'NhÃ¢n sá»± / HR']].map(([account, label]) => <button className="secondary" type="button" disabled={busy} key={account} onClick={() => { setUsername(account); setPassword('123456'); setError(''); }}>{label}</button>)}</div><small>Chá»n vai trÃ² Ä‘á»ƒ Ä‘iá»n tÃ i khoáº£n, sau Ä‘Ã³ báº¥m ÄÄƒng nháº­p.</small></div></div></section></main>;
}


