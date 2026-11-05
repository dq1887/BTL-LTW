import { useEffect, useId, useRef, type ReactNode } from 'react';
import Icon from './Icon';
export default function Modal({ title, children, onClose, busy = false, wide = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null); const titleId = useId();
  useEffect(() => {
    const dialog = ref.current; const previous = document.activeElement;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { dialog?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} onClick={(event) => { if (event.target === ref.current && !busy) { const box = ref.current.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }}>
    <div className="modal-heading"><div><p className="eyebrow">QUẢN LÝ NGHỈ PHÉP</p><h2 id={titleId}>{title}</h2></div><button type="button" className="icon-button" disabled={busy} onClick={onClose} aria-label="Đóng hộp thoại"><Icon name="close" /></button></div>{children}
  </dialog>;
}
