// frontend/src/pages/Departments.tsx

import React, { useState, useEffect } from "react";
import "./Departments.css";
import { departmentService, type Department } from "../services/departmentService";
import { authService } from "../services/authService";

export const Departments: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  const canManage = currentUser?.role === "admin_hr";

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc tìm kiếm nhân viên trong phòng ban
  const [empSearch, setEmpSearch] = useState("");

  // Modal Thêm / Sửa phòng ban
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDept, setCurrentDept] = useState({
    code: "",
    name: "",
    description: "",
  });

  // Tải danh sách phòng ban kèm nhân viên trực thuộc
  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await departmentService.getAll();
      setDepartments(data);
      if (data.length > 0 && !selectedDeptId) {
        setSelectedDeptId(data[0]._id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi tải danh sách phòng ban";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  // Phòng ban đang được chọn
  const activeDepartment =
    departments.find((d) => d._id === selectedDeptId) || departments[0];

  // Danh sách nhân viên của phòng ban đang chọn (có lọc tìm kiếm)
  const activeEmployees = (activeDepartment?.employees || []).filter((emp) => {
    if (!empSearch.trim()) return true;
    const term = empSearch.toLowerCase();
    return (
      emp.fullName.toLowerCase().includes(term) ||
      emp.employeeCode.toLowerCase().includes(term) ||
      emp.position.toLowerCase().includes(term) ||
      emp.email.toLowerCase().includes(term)
    );
  });

  // Mở modal thêm phòng ban
  const handleOpenAddModal = () => {
    setCurrentDept({ code: "", name: "", description: "" });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  // Mở modal sửa phòng ban
  const handleOpenEditModal = (dept: Department) => {
    setCurrentDept({
      code: dept.code,
      name: dept.name,
      description: dept.description || "",
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // Lưu form phòng ban
  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDept.code.trim() || !currentDept.name.trim()) {
      alert("Vui lòng nhập Mã và Tên phòng ban!");
      return;
    }

    try {
      if (isEditing && activeDepartment) {
        await departmentService.update(activeDepartment._id, currentDept);
        alert("Cập nhật thông tin phòng ban thành công!");
      } else {
        await departmentService.create({
          code: currentDept.code.trim().toUpperCase(),
          name: currentDept.name.trim(),
          description: currentDept.description.trim(),
        });
        alert("Tạo phòng ban mới thành công!");
      }
      setIsModalOpen(false);
      loadDepartments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Thao tác thất bại";
      alert(msg);
    }
  };

  // Xóa phòng ban (Backend chặn nếu còn nhân viên)
  const handleDeleteDept = async (dept: Department) => {
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa phòng ban "${dept.name}" (${dept.code})?`
      )
    ) {
      return;
    }

    try {
      await departmentService.delete(dept._id);
      alert("Đã xóa phòng ban thành công!");
      setSelectedDeptId(null);
      loadDepartments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể xóa phòng ban";
      alert(msg);
    }
  };

  return (
    <div className="departments-container">
      {/* Header */}
      <div className="departments-header">
        <div>
          <h2>🏢 Quản lý Phòng ban & Cơ cấu Tổ chức</h2>
          <p>
            Theo dõi danh sách các phòng ban và toàn bộ nhân viên trực thuộc từng
            phòng ban
          </p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={handleOpenAddModal}>
            + Thêm phòng ban mới
          </button>
        )}
      </div>

      {/* Thông báo lỗi */}
      {error && (
        <div
          style={{
            color: "#ef4444",
            padding: "12px",
            background: "#fee2e2",
            borderRadius: "8px",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {loading && departments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
          Đang tải dữ liệu phòng ban...
        </div>
      ) : (
        <div className="dept-layout">
          {/* CỘT TRÁI: DANH SÁCH PHÒNG BAN */}
          <div className="dept-list-panel">
            <h4
              style={{
                margin: "0 0 4px 0",
                fontSize: "14px",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Phòng ban ({departments.length})
            </h4>

            {departments.map((dept) => {
              const isSelected = dept._id === activeDepartment?._id;
              const count = dept.employeeCount || dept.employees?.length || 0;

              return (
                <div
                  key={dept._id}
                  className={`dept-card-item ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedDeptId(dept._id);
                    setEmpSearch("");
                  }}
                >
                  <div className="dept-card-top">
                    <span className="dept-code-pill">{dept.code}</span>
                    <span className="dept-emp-count">
                      👥 {count} nhân viên
                    </span>
                  </div>
                  <h4 className="dept-name">{dept.name}</h4>
                  <p className="dept-desc">
                    {dept.description || "Chưa có mô tả cho phòng ban này."}
                  </p>
                </div>
              );
            })}

            {departments.length === 0 && (
              <p style={{ color: "#94a3b8", textAlign: "center" }}>
                Chưa có phòng ban nào được tạo.
              </p>
            )}
          </div>

          {/* CỘT PHẢI: CHI TIẾT & DANH SÁCH NHÂN VIÊN THUỘC PHÒNG BAN */}
          {activeDepartment ? (
            <div className="dept-detail-panel">
              {/* Header chi tiết phòng ban */}
              <div className="dept-detail-header">
                <div className="dept-detail-title">
                  <div className="dept-big-icon">🏢</div>
                  <div>
                    <h3>
                      {activeDepartment.name}{" "}
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#2563eb",
                          background: "#eff6ff",
                          padding: "3px 8px",
                          borderRadius: "6px",
                        }}
                      >
                        {activeDepartment.code}
                      </span>
                    </h3>
                    <p>
                      {activeDepartment.description ||
                        "Không có mô tả chi tiết."}
                    </p>
                  </div>
                </div>

                {canManage && (
                  <div className="dept-actions">
                    <button
                      className="btn-secondary-sm"
                      onClick={() => handleOpenEditModal(activeDepartment)}
                    >
                      ✏️ Chỉnh sửa
                    </button>
                    <button
                      className="btn-danger-sm"
                      onClick={() => handleDeleteDept(activeDepartment)}
                      title="Chỉ xóa được khi không còn nhân viên nào trong phòng"
                    >
                      🗑️ Xóa phòng
                    </button>
                  </div>
                )}
              </div>

              {/* Danh sách nhân viên thuộc phòng ban */}
              <div className="dept-employees-section">
                <h4>
                  <span>
                    👥 Danh sách nhân viên trực thuộc (
                    {activeDepartment.employees?.length || 0} người)
                  </span>
                  <div style={{ width: "240px" }}>
                    <input
                      type="text"
                      placeholder="Tìm nhân viên trong phòng..."
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                </h4>

                <div className="dept-emp-table-wrap">
                  <table className="dept-emp-table">
                    <thead>
                      <tr>
                        <th>Mã NV</th>
                        <th>Họ và tên</th>
                        <th>Chức vụ (Position)</th>
                        <th>Email</th>
                        <th>Số điện thoại</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeEmployees.map((emp) => (
                        <tr key={emp._id}>
                          <td>
                            <strong
                              style={{
                                fontFamily: "monospace",
                                color: "#475569",
                              }}
                            >
                              {emp.employeeCode}
                            </strong>
                          </td>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              <div
                                style={{
                                  width: "30px",
                                  height: "30px",
                                  borderRadius: "50%",
                                  background: "#2563eb",
                                  color: "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                }}
                              >
                                {emp.fullName.trim().charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 600 }}>
                                {emp.fullName}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "12.5px",
                                fontWeight: 600,
                                background:
                                  emp.role === "manager"
                                    ? "#fef3c7"
                                    : "#dbeafe",
                                color:
                                  emp.role === "manager"
                                    ? "#b45309"
                                    : "#1e40af",
                              }}
                            >
                              {emp.role === "manager" ? "⭐ " : ""}
                              {emp.position || "Nhân viên"}
                            </span>
                          </td>
                          <td>{emp.email}</td>
                          <td>{emp.phone || "---"}</td>
                          <td>
                            <span
                              style={{
                                fontSize: "12.5px",
                                color:
                                  emp.status === "active"
                                    ? "#16a34a"
                                    : "#94a3b8",
                                fontWeight: 500,
                              }}
                            >
                              {emp.status === "active"
                                ? "● Đang làm việc"
                                : "○ Đã nghỉ"}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {activeEmployees.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            style={{
                              textAlign: "center",
                              padding: "24px",
                              color: "#94a3b8",
                            }}
                          >
                            {empSearch
                              ? "Không tìm thấy nhân viên nào khớp với từ khóa tìm kiếm."
                              : "Phòng ban này hiện chưa có nhân viên nào."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "#ffffff",
                padding: "40px",
                textAlign: "center",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                color: "#64748b",
              }}
            >
              Vui lòng chọn một phòng ban ở danh sách bên trái để xem chi tiết
              nhân viên trực thuộc.
            </div>
          )}
        </div>
      )}

      {/* Modal Thêm / Sửa phòng ban */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "460px" }}>
            <div className="modal-header">
              <h3>{isEditing ? "Chỉnh sửa phòng ban" : "Thêm phòng ban mới"}</h3>
              <button
                className="close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveDept}>
              <div className="form-group">
                <label>Mã phòng ban (Code) *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: IT, HR, MKT, SALES..."
                  value={currentDept.code}
                  onChange={(e) =>
                    setCurrentDept({ ...currentDept, code: e.target.value })
                  }
                  required
                  disabled={isEditing}
                />
              </div>

              <div className="form-group">
                <label>Tên phòng ban *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Phòng Công nghệ thông tin"
                  value={currentDept.name}
                  onChange={(e) =>
                    setCurrentDept({ ...currentDept, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Mô tả nhiệm vụ</label>
                <textarea
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    fontFamily: "inherit",
                  }}
                  rows={3}
                  placeholder="Mô tả chức năng nhiệm vụ của phòng ban..."
                  value={currentDept.description}
                  onChange={(e) =>
                    setCurrentDept({
                      ...currentDept,
                      description: e.target.value,
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
                  {isEditing ? "Lưu thay đổi" : "Tạo phòng ban"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

