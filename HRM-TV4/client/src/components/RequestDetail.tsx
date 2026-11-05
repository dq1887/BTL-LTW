import { useEffect, useState } from 'react';
import { api } from '../api';
import { errorMessage, statusLabel, type LeaveRequest } from '../types';
import { formatDate } from '../lib/presentation';
import Modal from './Modal';
import Icon from './Icon';
const labels: Record<string, string> = { created: 'Đã gửi đơn', updated: 'Đã chỉnh sửa', approved: 'Đã duyệt đơn', rejected: 'Đã từ chối', cancelled: 'Đã hủy đơn' };
export default function RequestDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<LeaveRequest | null>(null); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  useEffect(() => { const controller = new AbortController(); setError(''); setData(null); api<LeaveRequest>(`/leave-requests/${id}`, 'GET', undefined, controller.signal).then((value) => { if (!controller.signal.aborted) setData(value); }).catch((value: unknown) => { if (!controller.signal.aborted) setError(errorMessage(value)); }); return () => controller.abort(); }, [id, retry]);
  return <Modal title="Chi tiết đơn nghỉ" onClose={onClose} wide>{error ? <div className="error" role="alert">{error}<button className="text-button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div> : !data ? <p className="empty" role="status">Đang tải chi tiết…</p> : <>
    <div className="detail-person"><div><strong>{data.employeeId.fullName}</strong><small>{data.employeeId.employeeCode}</small></div><span className={`badge ${data.status}`}>{statusLabel[data.status]}</span></div>
    <div className="detail-summary"><div><span>Loại nghỉ</span><strong>{data.typeNameSnapshot ?? data.leaveTypeId.name}</strong></div><div><span>Chế độ</span><strong>{(data.paidSnapshot ?? data.leaveTypeId.paid) ? 'Có lương' : 'Không lương'}</strong></div><div><span>Thời gian</span><strong>{formatDate(data.fromDate)} – {formatDate(data.toDate)}</strong></div><div><span>Số ngày tính phép</span><strong>{data.requestedDays} ngày</strong></div></div>
    <h3>Lý do nghỉ</h3><p className="reason-block">{data.reason}</p><h3>Ngày được tính phép</h3><div className="date-chips">{data.leaveDates.map((date) => <span key={date}>{formatDate(date)}</span>)}</div>
    <h3>Lịch sử xử lý</h3><ol className="timeline">{data.history.map((item, index) => <li key={index}><span className="timeline-dot"><Icon name={item.action === 'approved' ? 'check' : item.action === 'cancelled' || item.action === 'rejected' ? 'close' : 'file'} size={13} /></span><div><strong>{labels[item.action] ?? item.action}</strong><small>{item.actorId?.username ?? 'Tài khoản không còn tồn tại'} · {new Date(item.at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</small>{item.note && <p className="preserve">{item.note}</p>}</div></li>)}</ol>
    <div className="modal-actions"><button className="secondary" onClick={onClose}>Đóng chi tiết</button></div>
  </>}</Modal>;
}
