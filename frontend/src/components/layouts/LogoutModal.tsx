import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import Icon from "./Icons";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string;
  roleLabel?: string;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  roleLabel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="logout-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="logout-modal-dialog">
        <button
          className="logout-modal-close"
          onClick={onClose}
          aria-label="Đóng"
        >
          ×
        </button>

        <div className="logout-modal-icon-wrap">
          <div className="logout-modal-icon-badge">
            <Icon name="logout" size={28} />
          </div>
        </div>

        <h3 className="logout-modal-title">Xác nhận đăng xuất</h3>
        <p className="logout-modal-desc">
          Bạn có chắc chắn muốn rời khỏi phiên làm việc hiện tại không? Mọi dữ liệu chưa lưu trên trang có thể bị mất.
        </p>

        {userName && (
          <div className="logout-modal-user-box">
            <div className="logout-modal-avatar">
              {userName.trim().charAt(0).toUpperCase()}
            </div>
            <div className="logout-modal-user-meta">
              <span className="logout-modal-user-name">{userName}</span>
              {roleLabel && (
                <span className="logout-modal-user-role">{roleLabel}</span>
              )}
            </div>
          </div>
        )}

        <div className="logout-modal-actions">
          <button
            type="button"
            className="logout-modal-btn cancel"
            onClick={onClose}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="logout-modal-btn confirm"
            onClick={onConfirm}
          >
            <Icon name="logout" size={16} />
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default LogoutModal;
