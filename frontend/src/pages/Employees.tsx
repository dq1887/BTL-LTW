import React, { useState, useEffect } from "react";
import "./Employees.css";
import { employeeService, type Employee } from "../services/employeeService";
import {
  departmentService,
  type Department,
} from "../services/departmentService";
import { authService } from "../services/authService";
import { useSearchParams } from "react-router-dom";

export const Employees: React.FC = () => {
  const currentUser = authService.getCurrentUser();

  const canManage =
    currentUser?.role === "admin_hr" || currentUser?.role === "manager";
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const keywordFromHeader = searchParams.get("search");
    if (keywordFromHeader !== null) {
      setSearchTerm(keywordFromHeader);
    }
  }, [searchParams]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmp, setNewEmp] = useState({
    employeeCode: "",
    fullName: "",
    email: "",
    password: "123456",
    phone: "",
    departmentId: "",
    position: "Nhân viên",
    role: "employee",
  });

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedEmpForTransfer, setSelectedEmpForTransfer] =
    useState<Employee | null>(null);
  const [targetDeptId, setTargetDeptId] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [empRes, deptRes] = await Promise.all([
        employeeService.getAll({ limit: 0 }),
        departmentService.getAll(),
      ]);

      setEmployees(empRes.employees);
      setDepartments(deptRes);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải dữ liệu!";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEmployees = employees.filter((emp) => {
    const matchSearch =
      !searchTerm.trim() ||
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());

    const empDeptId =
      typeof emp.departmentId === "object"
        ? emp.departmentId?._id
        : emp.departmentId;
    const matchDept = !selectedDept || empDeptId === selectedDept;

    const matchStatus =
      selectedStatus === "all" ||
      (selectedStatus === "active" && emp.status === "active") ||
      (selectedStatus === "inactive" && emp.status === "inactive");

    return matchSearch && matchDept && matchStatus;
  });

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newEmp.employeeCode ||
      !newEmp.fullName ||
      !newEmp.email ||
      !newEmp.departmentId
    ) {
      alert("Vui lòng điền đầy đủ các trường bắt buộc (*)");
      return;
    }

    try {
      await employeeService.create(newEmp);
      alert("Thêm nhân viên mới thành công!");
      setIsAddModalOpen(false);
      setNewEmp({
        employeeCode: "",
        fullName: "",
        email: "",
        password: "123456",
        phone: "",
        departmentId: "",
        position: "Nhân viên",
        role: "employee",
      });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi thêm nhân viên";
      alert(msg);
    }
  };

  const handleOpenTransfer = (emp: Employee) => {
    setSelectedEmpForTransfer(emp);
    const currentDeptId =
      typeof emp.departmentId === "object"
        ? emp.departmentId?._id
        : emp.departmentId;
    setTargetDeptId(currentDeptId || "");
    setTransferModalOpen(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForTransfer || !targetDeptId) return;

    try {
      await employeeService.transfer(selectedEmpForTransfer._id, targetDeptId);
      alert(
        `Đã điều chuyển nhân viên ${selectedEmpForTransfer.fullName} thành công!`,
      );
      setTransferModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Lỗi điều chuyển phòng ban";
      alert(msg);
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (
      !confirm(
        `Bạn có chắc muốn chuyển trạng thái của ${emp.fullName} sang Inactive (Xóa mềm)?`,
      )
    ) {
      return;
    }

    try {
      await employeeService.delete(emp._id);
      alert("Đã chuyển trạng thái nhân viên thành công!");
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi thao tác";
      alert(msg);
    }
  };

  const getDepartmentName = (deptId?: any) => {
    if (!deptId) return "Chưa phân bổ";
    if (typeof deptId === "object" && deptId.name) return deptId.name;
    const found = departments.find((d) => d._id === deptId);
    return found ? found.name : "Chưa phân bổ";
  };

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === "active").length;

  return (
    <div className="employees-container">
      <div className="employees-header">
        <div>
          <h2>👥 Quản lý Danh sách Nhân sự</h2>
          <p>Hiển thị toàn bộ nhân viên và chức vụ trong tổ chức</p>
        </div>
        {canManage && (
          <button
            className="btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Thêm nhân viên mới
          </button>
        )}
      </div>

      <div className="stats-strip">
        <div className="stat-box">
          <div className="stat-box-icon blue">👨‍💼</div>
          <div className="stat-box-info">
            <h4>Tổng số nhân viên</h4>
            <div className="value">{totalEmployees}</div>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-box-icon green">✅</div>
          <div className="stat-box-info">
            <h4>Đang hoạt động</h4>
            <div className="value">{activeEmployees}</div>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-box-icon purple">🏢</div>
          <div className="stat-box-info">
            <h4>Số phòng ban</h4>
            <div className="value">{departments.length}</div>
          </div>
        </div>
      </div>
      <div className="filter-bar">
        <div className="search-box">
          <span className="search-icon-inside">🔍</span>
          <input
            type="text"
            placeholder="Tìm theo tên, mã NV, chức vụ, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-selects">
          <select
            className="filter-select"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="">Tất cả phòng ban ({departments.length})</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã nghỉ việc / Inactive</option>
          </select>
        </div>
      </div>

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

      <div className="employees-table-card">
        {loading ? (
          <div
            style={{ padding: "40px", textAlign: "center", color: "#64748b" }}
          >
            Đang tải danh sách nhân viên từ máy chủ...
          </div>
        ) : (
          <table className="employees-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và tên</th>
                <th>Chức vụ (Position)</th>
                <th>Phòng ban</th>
                <th>Email / SĐT</th>
                <th>Trạng thái</th>
                {canManage && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp._id}>
                  <td>
                    <span className="emp-code-badge">{emp.employeeCode}</span>
                  </td>
                  <td>
                    <div className="emp-name-cell">
                      <div className="emp-avatar">
                        {emp.fullName.trim().charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="emp-name-text">{emp.fullName}</div>
                        <small style={{ color: "#94a3b8" }}>
                          {emp.role === "admin_hr"
                            ? "Admin HR"
                            : emp.role === "manager"
                              ? "Quản lý"
                              : "Nhân viên"}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="emp-position-badge">
                      ⭐ {emp.position || "Nhân viên"}
                    </span>
                  </td>
                  <td>
                    <span className="emp-dept-tag">
                      {getDepartmentName(emp.departmentId)}
                    </span>
                  </td>
                  <td>
                    <div>{emp.email}</div>
                    <small style={{ color: "#64748b" }}>
                      {emp.phone || "---"}
                    </small>
                  </td>
                  <td>
                    <span className={`emp-status ${emp.status}`}>
                      <span className="emp-status-dot"></span>
                      {emp.status === "active"
                        ? "Đang làm việc"
                        : "Đã nghỉ / Inactive"}
                    </span>
                  </td>
                  {canManage && (
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon-action transfer"
                          title="Điều chuyển phòng ban"
                          onClick={() => handleOpenTransfer(emp)}
                        >
                          🔄 Chuyển phòng
                        </button>
                        {emp.status === "active" && (
                          <button
                            className="btn-icon-action delete"
                            title="Xóa mềm nhân viên"
                            onClick={() => handleDelete(emp)}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredEmployees.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: "30px",
                      color: "#94a3b8",
                    }}
                  >
                    Không tìm thấy nhân viên nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "540px" }}>
            <div className="modal-header">
              <h3>Thêm nhân viên mới</h3>
              <button
                className="close-btn"
                onClick={() => setIsAddModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateEmployee}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div className="form-group">
                  <label>Mã nhân viên *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: EMP051"
                    value={newEmp.employeeCode}
                    onChange={(e) =>
                      setNewEmp({ ...newEmp, employeeCode: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Họ và tên *</label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={newEmp.fullName}
                    onChange={(e) =>
                      setNewEmp({ ...newEmp, fullName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    placeholder="a.nguyen@company.com"
                    value={newEmp.email}
                    onChange={(e) =>
                      setNewEmp({ ...newEmp, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="0912345678"
                    value={newEmp.phone}
                    onChange={(e) =>
                      setNewEmp({ ...newEmp, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div className="form-group">
                  <label>Phòng ban trực thuộc *</label>
                  <select
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                    }}
                    value={newEmp.departmentId}
                    onChange={(e) =>
                      setNewEmp({ ...newEmp, departmentId: e.target.value })
                    }
                    required
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Chức vụ (Position) *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Trưởng phòng, Kỹ sư, Chuyên viên..."
                    value={newEmp.position}
                    onChange={(e) =>
                      setNewEmp({ ...newEmp, position: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Vai trò hệ thống</label>
                <select
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                  }}
                  value={newEmp.role}
                  onChange={(e) =>
                    setNewEmp({ ...newEmp, role: e.target.value })
                  }
                >
                  <option value="employee">
                    Nhân viên thông thường (Employee)
                  </option>
                  <option value="manager">
                    Trưởng phòng / Quản lý (Manager)
                  </option>
                  <option value="admin_hr">
                    Quản trị viên Nhân sự (Admin HR)
                  </option>
                </select>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  Thêm nhân viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {transferModalOpen && selectedEmpForTransfer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "460px" }}>
            <div className="modal-header">
              <h3>Điều chuyển phòng ban</h3>
              <button
                className="close-btn"
                onClick={() => setTransferModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleTransferSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <p style={{ margin: "0 0 6px 0", color: "#64748b" }}>
                  Nhân viên:
                </p>
                <strong style={{ fontSize: "16px", color: "#0f172a" }}>
                  {selectedEmpForTransfer.fullName} (
                  {selectedEmpForTransfer.employeeCode})
                </strong>
                <p
                  style={{
                    margin: "6px 0 0 0",
                    fontSize: "13px",
                    color: "#64748b",
                  }}
                >
                  Phòng ban hiện tại:{" "}
                  <strong style={{ color: "#2563eb" }}>
                    {getDepartmentName(selectedEmpForTransfer.departmentId)}
                  </strong>
                </p>
              </div>

              <div className="form-group">
                <label>Chọn phòng ban mới cần chuyển đến *</label>
                <select
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                  }}
                  value={targetDeptId}
                  onChange={(e) => setTargetDeptId(e.target.value)}
                  required
                >
                  <option value="">-- Chọn phòng ban mới --</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setTransferModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  Xác nhận chuyển
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
