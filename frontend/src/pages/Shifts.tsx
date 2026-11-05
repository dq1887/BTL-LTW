import React, { useState } from "react";
import "./Shifts.css";

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
}

export const Shifts: React.FC = () => {
  // Dữ liệu mẫu ban đầu (khớp kịch bản demo: ca hành chính)
  const [shifts, setShifts] = useState<Shift[]>([
    {
      id: "1",
      name: "Ca hành chính",
      startTime: "08:00",
      endTime: "17:00",
      breakMinutes: 60,
    },
    {
      id: "2",
      name: "Ca sáng",
      startTime: "07:30",
      endTime: "11:30",
      breakMinutes: 15,
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState<Partial<Shift>>({});
  const [isEditing, setIsEditing] = useState(false);

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

  // Xử lý lưu form (Thêm hoặc Sửa)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !currentShift.name ||
      !currentShift.startTime ||
      !currentShift.endTime
    ) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    // Quy tắc nghiệp vụ kiểm tra logic thời gian cơ bản
    if (currentShift.startTime >= currentShift.endTime) {
      alert("Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!");
      return;
    }

    if (isEditing) {
      // Cập nhật ca
      setShifts(
        shifts.map((s) =>
          s.id === currentShift.id ? (currentShift as Shift) : s,
        ),
      );
    } else {
      // Thêm mới ca
      const newShift: Shift = {
        id: Date.now().toString(),
        name: currentShift.name!,
        startTime: currentShift.startTime!,
        endTime: currentShift.endTime!,
        breakMinutes: Number(currentShift.breakMinutes) || 0,
      };
      setShifts([...shifts, newShift]);
    }

    setIsModalOpen(false);
  };

  // Xóa ca làm
  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa ca làm này không?")) {
      setShifts(shifts.filter((s) => s.id !== id));
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

      {/* Bảng danh sách ca */}
      <div className="table-card">
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
              <tr key={shift.id}>
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
                    onClick={() => handleDelete(shift.id)}
                    title="Xóa"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {shifts.length === 0 && (
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
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  {isEditing ? "Cập nhật" : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
