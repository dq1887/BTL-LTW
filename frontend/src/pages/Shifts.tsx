import React, { useState, useEffect } from "react";
import "./Shifts.css";
import { shiftService, type Shift } from "../services/shiftService";

export const Shifts: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState<Partial<Shift>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Tải danh sách ca làm việc từ Backend
  const loadShifts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await shiftService.getAll();
      setShifts(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi!";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  // Mở modal thêm mới
  const handleOpenAddModal = () => {
    setCurrentShift({ name: "", startTime: "", endTime: "", breakMinutes: 0 });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (shift: Shift) => {
    setCurrentShift(shift);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // Xử lý lưu form (Thêm hoặc Sửa thông qua API Backend)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !currentShift.name?.trim() ||
      !currentShift.startTime ||
      !currentShift.endTime
    ) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    if (currentShift.startTime >= currentShift.endTime) {
      alert("Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: currentShift.name.trim(),
        startTime: currentShift.startTime,
        endTime: currentShift.endTime,
        breakMinutes: Number(currentShift.breakMinutes) || 0,
      };

      if (isEditing && currentShift._id) {
        await shiftService.update(currentShift._id, payload);
        alert("Cập nhật ca làm việc thành công!");
      } else {
        await shiftService.create(payload);
        alert("Thêm ca làm việc mới thành công!");
      }

      setIsModalOpen(false);
      await loadShifts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Thao tác thất bại!";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Xóa ca làm việc
  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm("Bạn có chắc chắn muốn xóa ca làm này không?")) {
      return;
    }

    try {
      await shiftService.delete(id);
      alert("Đã xóa ca làm việc thành công!");
      await loadShifts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể xóa ca làm!";
      alert(message);
    }
  };

  return (
    <div className="shifts-container">
      {/* Tiêu đề & Nút thêm */}
      <div className="shifts-header-top">
        <h2>⏰ Quản lý Danh mục Ca làm việc</h2>
        <button className="btn-primary" onClick={handleOpenAddModal}>
          + Thêm ca làm mới
        </button>
      </div>

      {/* Hiển thị lỗi nếu có */}
      {error && (
        <div style={{ color: "#ef4444", marginBottom: "16px", padding: "10px", background: "#fee2e2", borderRadius: "6px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Bảng danh sách ca */}
      <div className="table-card">
        {loading ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
            Đang tải dữ liệu từ máy chủ...
          </div>
        ) : (
          <table className="shifts-table">
            <thead>
              <tr>
                <th>Tên ca</th>
                <th>Giờ bắt đầu</th>
                <th>Giờ kết thúc</th>
                <th>Thời gian nghỉ (phút)</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => (
                <tr key={shift._id}>
                  <td>
                    <strong>{shift.name}</strong>
                  </td>
                  <td>
                    <span className="badge-time">{shift.startTime}</span>
                  </td>
                  <td>
                    <span className="badge-time">{shift.endTime}</span>
                  </td>
                  <td>{shift.breakMinutes} phút</td>
                  <td>
                    <button
                      className="btn-action edit"
                      onClick={() => handleOpenEditModal(shift)}
                      title="Sửa"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-action delete"
                      onClick={() => handleDelete(shift._id)}
                      title="Xóa"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {shifts.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      color: "#94a3b8",
                      padding: "20px",
                    }}
                  >
                    Chưa có ca làm việc nào được tạo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Thêm / Sửa ca làm */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isEditing ? "Chỉnh sửa ca làm" : "Thêm ca làm mới"}</h3>
              <button
                className="close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Tên ca làm việc</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ca hành chính"
                  value={currentShift.name || ""}
                  onChange={(e) =>
                    setCurrentShift({ ...currentShift, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Giờ bắt đầu</label>
                <input
                  type="time"
                  value={currentShift.startTime || ""}
                  onChange={(e) =>
                    setCurrentShift({
                      ...currentShift,
                      startTime: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Giờ kết thúc</label>
                <input
                  type="time"
                  value={currentShift.endTime || ""}
                  onChange={(e) =>
                    setCurrentShift({
                      ...currentShift,
                      endTime: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Thời gian nghỉ giữa ca (phút)</label>
                <input
                  type="number"
                  min="0"
                  value={currentShift.breakMinutes ?? ""}
                  onChange={(e) =>
                    setCurrentShift({
                      ...currentShift,
                      breakMinutes: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting
                    ? "Đang lưu..."
                    : isEditing
                    ? "Cập nhật"
                    : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
