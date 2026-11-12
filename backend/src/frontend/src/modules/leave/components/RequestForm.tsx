import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage, todayVN, type Employee, type LeaveRequest, type LeaveType, type LeavePreview } from '../types';
import { formatDate } from '../lib/presentation';
import Modal from './Modal';
import Icon from './Icon';
export default function RequestForm({ editing, employees, types, onClose, onSaved }: { editing?: LeaveRequest; employees: Employee[]; types: LeaveType[]; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState(editing?.employeeId.id ?? user?.employeeId ?? '');
  const [leaveTypeId, setLeaveTypeId] = useState(editing?.leaveTypeId.id ?? types.find((type) => type.active)?.id ?? '');
  const [fromDate, setFromDate] = useState(editing?.fromDate ?? todayVN()); const [toDate, setToDate] = useState(editing?.toDate ?? todayVN());
  const [reason, setReason] = useState(editing?.reason ?? ''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<LeavePreview | null>(null); const [previewError, setPreviewError] = useState(''); const [checking, setChecking] = useState(true); const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setPreview(null); setPreviewError(''); setChecking(true);
    const timer = window.setTimeout(() => {
      if (!employeeId || !leaveTypeId || !fromDate || !toDate || fromDate > toDate) { setPreviewError('Chá»n nhÃ¢n viÃªn, loáº¡i nghá»‰ vÃ  khoáº£ng ngÃ y há»£p lá»‡.'); setChecking(false); return; }
      api<LeavePreview>('/leave-requests/preview', 'POST', { employeeId, leaveTypeId, fromDate, toDate, ...(editing ? { requestId: editing.id } : {}) }, controller.signal)
        .then((data) => { if (!controller.signal.aborted) setPreview(data); })
        .catch((value: unknown) => { if (!controller.signal.aborted) setPreviewError(errorMessage(value)); })
        .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [employeeId, leaveTypeId, fromDate, toDate, editing, retry]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || checking || !preview) return; setError('');
    if (reason.trim().length < 5) { setError('LÃ½ do cáº§n Ã­t nháº¥t 5 kÃ½ tá»±, khÃ´ng tÃ­nh khoáº£ng tráº¯ng á»Ÿ Ä‘áº§u vÃ  cuá»‘i.'); return; }
    setBusy(true);
    try { await api(editing ? `/leave-requests/${editing.id}` : '/leave-requests', editing ? 'PATCH' : 'POST', { leaveTypeId, fromDate, toDate, reason: reason.trim(), ...(editing ? {} : { employeeId }) }); onSaved(); }
    catch (value) { setError(errorMessage(value)); setRetry((value) => value + 1); } finally { setBusy(false); }
  }
  return <Modal title={editing ? 'Chá»‰nh sá»­a Ä‘Æ¡n nghá»‰' : 'Táº¡o Ä‘Æ¡n nghá»‰'} onClose={onClose} busy={busy} wide><form onSubmit={submit} className="form">
    <p className="muted">Chá»n thá»i gian nghá»‰. Há»‡ thá»‘ng tÃ­nh ngÃ y theo lá»‹ch lÃ m Ä‘Ã£ cÃ´ng bá»‘.</p>
    <fieldset disabled={busy}><div className="form-row"><label>NhÃ¢n viÃªn<select value={employeeId} disabled={Boolean(editing) || user?.role !== 'admin_hr'} onChange={(event) => setEmployeeId(event.target.value)} required>{employees.filter((item) => item.status === 'active' || item.id === employeeId).map((item) => <option value={item.id} key={item.id}>{item.employeeCode} Â· {item.fullName}</option>)}</select></label>
    <label>Loáº¡i nghá»‰<select value={leaveTypeId} onChange={(event) => setLeaveTypeId(event.target.value)} required><option value="">Chá»n loáº¡i nghá»‰</option>{types.filter((item) => item.active || item.id === leaveTypeId).map((item) => <option key={item.id} value={item.id} disabled={!item.active}>{item.name}{!item.active ? ' (ÄÃ£ ngá»«ng)' : ''}</option>)}</select></label></div>
    <div className="form-row"><label>Tá»« ngÃ y<input type="date" required value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label>Äáº¿n ngÃ y<input type="date" min={fromDate} required value={toDate} onChange={(event) => setToDate(event.target.value)} /></label></div>
    <div className="preview-box" aria-live="polite">{checking ? <p><Icon name="clock" /> Äang kiá»ƒm tra lá»‹ch vÃ  háº¡n má»©câ€¦</p> : previewError ? <div><p className="preview-error">{previewError}</p><button type="button" className="text-button" onClick={() => setRetry((value) => value + 1)}>Kiá»ƒm tra láº¡i</button></div> : preview && <><div className="preview-total"><span><Icon name="calendar" /> Sá»‘ ngÃ y xin nghá»‰</span><strong>{preview.requestedDays} <small>ngÃ y Â· {preview.paid ? 'CÃ³ lÆ°Æ¡ng' : 'KhÃ´ng lÆ°Æ¡ng'}</small></strong></div><div className="date-chips">{preview.leaveDates.map((date) => <span key={date}>{formatDate(date)}</span>)}</div>{preview.years.map((year) => <p key={year.year} className="hint">NÄƒm {year.year}: {year.remainingBefore === null ? 'KhÃ´ng giá»›i háº¡n háº¡n má»©c' : `cÃ²n ${year.remainingBefore} ngÃ y â†’ cÃ²n ${year.remainingAfter} ngÃ y náº¿u Ä‘Æ°á»£c duyá»‡t`}.</p>)}</>}</div>
    <label>LÃ½ do nghá»‰<textarea minLength={5} maxLength={1000} required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nháº­p lÃ½ do Ä‘á»ƒ ngÆ°á»i duyá»‡t xem xÃ©tâ€¦" /><span className="field-meta">Ãt nháº¥t 5 kÃ½ tá»± <span>{reason.length}/1000</span></span></label></fieldset>
    <p className="hint"><Icon name="shield" /> Káº¿t quáº£ xem trÆ°á»›c chÆ°a giá»¯ chá»— phÃ©p. Há»‡ thá»‘ng kiá»ƒm tra láº¡i khi lÆ°u vÃ  khi duyá»‡t.</p>
    {error && <p className="error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>ÄÃ³ng</button><button disabled={busy || checking || !preview}><Icon name="check" />{busy ? 'Äang lÆ°uâ€¦' : editing ? 'LÆ°u thay Ä‘á»•i' : 'Gá»­i Ä‘Æ¡n nghá»‰'}</button></div>
  </form></Modal>;
}


