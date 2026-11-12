import { useEffect, useState } from 'react';
import { api } from '../api';
import { errorMessage, statusLabel, type LeaveRequest } from '../types';
import { formatDate } from '../lib/presentation';
import Modal from './Modal';
import Icon from './Icon';
const labels: Record<string, string> = { created: 'ÄÃ£ gá»­i Ä‘Æ¡n', updated: 'ÄÃ£ chá»‰nh sá»­a', approved: 'ÄÃ£ duyá»‡t Ä‘Æ¡n', rejected: 'ÄÃ£ tá»« chá»‘i', cancelled: 'ÄÃ£ há»§y Ä‘Æ¡n' };
export default function RequestDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<LeaveRequest | null>(null); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  useEffect(() => { const controller = new AbortController(); setError(''); setData(null); api<LeaveRequest>(`/leave-requests/${id}`, 'GET', undefined, controller.signal).then((value) => { if (!controller.signal.aborted) setData(value); }).catch((value: unknown) => { if (!controller.signal.aborted) setError(errorMessage(value)); }); return () => controller.abort(); }, [id, retry]);
  return <Modal title="Chi tiáº¿t Ä‘Æ¡n nghá»‰" onClose={onClose} wide>{error ? <div className="error" role="alert">{error}<button className="text-button" onClick={() => setRetry((value) => value + 1)}>Thá»­ láº¡i</button></div> : !data ? <p className="empty" role="status">Äang táº£i chi tiáº¿tâ€¦</p> : <>
    <div className="detail-person"><div><strong>{data.employeeId.fullName}</strong><small>{data.employeeId.employeeCode}</small></div><span className={`badge ${data.status}`}>{statusLabel[data.status]}</span></div>
    <div className="detail-summary"><div><span>Loáº¡i nghá»‰</span><strong>{data.typeNameSnapshot ?? data.leaveTypeId.name}</strong></div><div><span>Cháº¿ Ä‘á»™</span><strong>{(data.paidSnapshot ?? data.leaveTypeId.paid) ? 'CÃ³ lÆ°Æ¡ng' : 'KhÃ´ng lÆ°Æ¡ng'}</strong></div><div><span>Thá»i gian</span><strong>{formatDate(data.fromDate)} â€“ {formatDate(data.toDate)}</strong></div><div><span>Sá»‘ ngÃ y tÃ­nh phÃ©p</span><strong>{data.requestedDays} ngÃ y</strong></div></div>
    <h3>LÃ½ do nghá»‰</h3><p className="reason-block">{data.reason}</p><h3>NgÃ y Ä‘Æ°á»£c tÃ­nh phÃ©p</h3><div className="date-chips">{data.leaveDates.map((date) => <span key={date}>{formatDate(date)}</span>)}</div>
    <h3>Lá»‹ch sá»­ xá»­ lÃ½</h3><ol className="timeline">{data.history.map((item, index) => <li key={index}><span className="timeline-dot"><Icon name={item.action === 'approved' ? 'check' : item.action === 'cancelled' || item.action === 'rejected' ? 'close' : 'file'} size={13} /></span><div><strong>{labels[item.action] ?? item.action}</strong><small>{item.actorId?.username ?? 'TÃ i khoáº£n khÃ´ng cÃ²n tá»“n táº¡i'} Â· {new Date(item.at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</small>{item.note && <p className="preserve">{item.note}</p>}</div></li>)}</ol>
    <div className="modal-actions"><button className="secondary" onClick={onClose}>ÄÃ³ng chi tiáº¿t</button></div>
  </>}</Modal>;
}


