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
      if (!employeeId || !leaveTypeId || !fromDate || !toDate || fromDate > toDate) { setPreviewError('Chọn nhân viên, loại nghỉ và khoảng ngày hợp lệ.'); setChecking(false); return; }
      api<LeavePreview>('/leave-requests/preview', 'POST', { employeeId, leaveTypeId, fromDate, toDate, ...(editing ? { requestId: editing.id } : {}) }, controller.signal)
        .then((data) => { if (!controller.signal.aborted) setPreview(data); })
        .catch((value: unknown) => { if (!controller.signal.aborted) setPreviewError(errorMessage(value)); })
        .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [employeeId, leaveTypeId, fromDate, toDate, editing, retry]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || checking || !preview) return; setError('');
    if (reason.trim().length < 5) { setError('Lý do cần ít nhất 5 ký tự, không tính khoảng trắng ở đầu và cuối.'); return; }
    setBusy(true);
    try { await api(editing ? `/leave-requests/${editing.id}` : '/leave-requests', editing ? 'PATCH' : 'POST', { leaveTypeId, fromDate, toDate, reason: reason.trim(), ...(editing ? {} : { employeeId }) }); onSaved(); }
    catch (value) { setError(errorMessage(value)); setRetry((value) => value + 1); } finally { setBusy(false); }
  }
  return <Modal title={editing ? 'Chỉnh sửa đơn nghỉ' : 'Tạo đơn nghỉ'} onClose={onClose} busy={busy} wide><form onSubmit={submit} className="form">
    <p className="muted">Chọn thời gian nghỉ. Hệ thống tính ngày theo lịch làm đã công bố.</p>
    <fieldset disabled={busy}><div className="form-row"><label>Nhân viên<select value={employeeId} disabled={Boolean(editing) || user?.role !== 'admin_hr'} onChange={(event) => setEmployeeId(event.target.value)} required>{employees.filter((item) => item.status === 'active' || item.id === employeeId).map((item) => <option value={item.id} key={item.id}>{item.employeeCode} · {item.fullName}</option>)}</select></label>
    <label>Loại nghỉ<select value={leaveTypeId} onChange={(event) => setLeaveTypeId(event.target.value)} required><option value="">Chọn loại nghỉ</option>{types.filter((item) => item.active || item.id === leaveTypeId).map((item) => <option key={item.id} value={item.id} disabled={!item.active}>{item.name}{!item.active ? ' (Đã ngừng)' : ''}</option>)}</select></label></div>
    <div className="form-row"><label>Từ ngày<input type="date" required value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label>Đến ngày<input type="date" min={fromDate} required value={toDate} onChange={(event) => setToDate(event.target.value)} /></label></div>
    <div className="preview-box" aria-live="polite">{checking ? <p><Icon name="clock" /> Đang kiểm tra lịch và hạn mức…</p> : previewError ? <div><p className="preview-error">{previewError}</p><button type="button" className="text-button" onClick={() => setRetry((value) => value + 1)}>Kiểm tra lại</button></div> : preview && <><div className="preview-total"><span><Icon name="calendar" /> Số ngày xin nghỉ</span><strong>{preview.requestedDays} <small>ngày · {preview.paid ? 'Có lương' : 'Không lương'}</small></strong></div><div className="date-chips">{preview.leaveDates.map((date) => <span key={date}>{formatDate(date)}</span>)}</div>{preview.years.map((year) => <p key={year.year} className="hint">Năm {year.year}: {year.remainingBefore === null ? 'Không giới hạn hạn mức' : `còn ${year.remainingBefore} ngày → còn ${year.remainingAfter} ngày nếu được duyệt`}.</p>)}</>}</div>
    <label>Lý do nghỉ<textarea minLength={5} maxLength={1000} required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do để người duyệt xem xét…" /><span className="field-meta">Ít nhất 5 ký tự <span>{reason.length}/1000</span></span></label></fieldset>
    <p className="hint"><Icon name="shield" /> Kết quả xem trước chưa giữ chỗ phép. Hệ thống kiểm tra lại khi lưu và khi duyệt.</p>
    {error && <p className="error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Đóng</button><button disabled={busy || checking || !preview}><Icon name="check" />{busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Gửi đơn nghỉ'}</button></div>
  </form></Modal>;
}
