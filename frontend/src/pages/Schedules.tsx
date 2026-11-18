import { useState, useEffect, type SyntheticEvent } from "react";
import api from "../services/api"; // chỉnh đường dẫn cho đúng vị trí api.ts của bạn
import "./Schedules.css";

interface Schedule {
  _id: string;
  employeeId: {
    _id: string;
    fullName: string;
    employeeCode: string;
    role: string;
    position?: string;
  };
  shiftId: {
    _id: string;
    name: string;
    startTime: string;
    endTime: string;
  };
  workDate: string;
  status: "draft" | "published";
}

interface EmployeeOption {
  _id: string;
  employeeCode: string;
  fullName: string;
  role: string;
  position?: string;
}

interface ShiftOption {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
}

// API có thể trả mảng trơn, { data: [...] }, { employees: [...] },
// hoặc lồng thêm một tầng như { data: { items: [...] } } -> tìm mảng đầu tiên
const toArray = <T,>(json: unknown, depth = 0): T[] => {
  if (Array.isArray(json)) return json as T[];
  if (json && typeof json === "object" && depth < 3) {
    for (const value of Object.values(json as Record<string, unknown>)) {
      const found = toArray<T>(value, depth + 1);
      if (found.length > 0) return found;
    }
  }
  return [];
};

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal phân ca thủ công
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [form, setForm] = useState({
    employeeId: "",
    shiftId: "",
    workDate: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Giả lập user đang đăng nhập (sau này lấy từ localStorage/Redux)
  const currentUserRole = "admin_hr";
  const canManage =
    currentUserRole === "admin_hr" || currentUserRole === "manager";

  const fetchSchedules = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get("/schedules");
      setSchedules(toArray<Schedule>(res.data));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Mở modal: tải danh sách nhân viên và ca (chỉ tải lần đầu)
  const openModal = async () => {
    setForm({ employeeId: "", shiftId: "", workDate: "" });
    setFormError(null);
    setShowModal(true);
    if (employees.length > 0 && shifts.length > 0) return;
    try {
      const [empRes, shiftRes] = await Promise.all([
        api.get("/employees"),
        api.get("/shifts"),
      ]);
      setEmployees(toArray<EmployeeOption>(empRes.data));
      setShifts(toArray<ShiftOption>(shiftRes.data));
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.",
      );
    }
  };

  const closeModal = () => {
    if (!saving) setShowModal(false);
  };

  const handleCreate = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.shiftId || !form.workDate) {
      setFormError("Vui lòng chọn nhân viên, ca làm việc và ngày làm.");
      return;
    }
    try {
      setSaving(true);
      setFormError(null);
      // Lỗi 409 (trùng ca) được api.ts ném ra kèm message từ backend
      await api.post("/schedules", form);
      setShowModal(false);
      await fetchSchedules(true); // tải lại để có dữ liệu populate đầy đủ
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Xóa lịch (chỉ lịch draft, backend cũng chặn lịch đã published)
  const handleDelete = async (item: Schedule) => {
    if (item.status !== "draft") return;
    const ok = window.confirm(
      `Xóa ca ${item.shiftId?.name || ""} ngày ${item.workDate} của ${
        item.employeeId?.fullName || "nhân viên này"
      }?`,
    );
    if (!ok) return;
    try {
      await api.delete(`/schedules/${item._id}`);
      setSchedules((prev) => prev.filter((s) => s._id !== item._id));
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.",
      );
    }
  };

  const handlePublish = async (id: string) => {
    if (currentUserRole !== "admin_hr") {
      alert("Bạn không có quyền thực hiện thao tác này!");
      return;
    }
    try {
      await api.post(`/schedules/${id}/publish`); // khớp router.post("/:id/publish")
      setSchedules((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, status: "published" } : item,
        ),
      );
      alert("Đã công bố lịch thành công!");
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.",
      );
    }
  };

  if (loading)
    return <div className="schedule-loading">Đang tải dữ liệu phân ca...</div>;
  if (error) return <div className="schedule-error">Lỗi: {error}</div>;

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <h2>Quản lý Lịch Phân Ca Làm Việc</h2>
        {(currentUserRole === "admin_hr" || currentUserRole === "manager") && (
          <button className="btn-primary" onClick={openModal}>
            + Phân ca thủ công
          </button>
        )}
      </div>

      <div className="table-responsive">
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Mã NV</th>
              <th>Họ và Tên</th>
              <th>Vai trò</th>
              <th>Ngày làm</th>
              <th>Ca làm việc</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-data">
                  Chưa có lịch phân ca nào được tạo.
                </td>
              </tr>
            ) : (
              schedules.map((item) => (
                <tr key={item._id}>
                  <td>{item.employeeId?.employeeCode || "N/A"}</td>
                  <td>
                    <strong>{item.employeeId?.fullName || "N/A"}</strong>
                  </td>
                  <td>
                    <span className={`badge role-${item.employeeId?.role}`}>
                      {item.employeeId?.position || item.employeeId?.role}
                    </span>
                  </td>
                  <td>{item.workDate}</td>
                  <td>
                    {item.shiftId?.name} ({item.shiftId?.startTime} -{" "}
                    {item.shiftId?.endTime})
                  </td>
                  <td>
                    <span className={`badge status-${item.status}`}>
                      {item.status === "draft" ? "Nháp (Draft)" : "Đã công bố"}
                    </span>
                  </td>
                  <td>
                    {item.status === "draft" && (
                      <div className="action-cell">
                        <button
                          className="btn-publish"
                          onClick={() => handlePublish(item._id)}
                          title="Công bố lịch để nhân viên xem"
                        >
                          Publish
                        </button>
                        {canManage && (
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(item)}
                            title="Xóa ca này (chỉ khi còn là nháp)"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <form
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
          >
            <h3>Phân ca thủ công</h3>

            <label className="form-field">
              <span>Nhân viên</span>
              <select
                value={form.employeeId}
                onChange={(e) =>
                  setForm({ ...form, employeeId: e.target.value })
                }
                required
              >
                <option value="">-- Chọn nhân viên --</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.employeeCode} - {emp.fullName} (
                    {emp.position || emp.role})
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Ca làm việc</span>
              <select
                value={form.shiftId}
                onChange={(e) => setForm({ ...form, shiftId: e.target.value })}
                required
              >
                <option value="">-- Chọn ca --</option>
                {shifts.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.startTime} - {s.endTime})
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Ngày làm</span>
              <input
                type="date"
                value={form.workDate}
                onChange={(e) => setForm({ ...form, workDate: e.target.value })}
                required
              />
            </label>

            {formError && <p className="form-error">{formError}</p>}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={closeModal}
                disabled={saving}
              >
                Hủy
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu phân ca"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
