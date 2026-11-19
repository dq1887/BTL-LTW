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

const pad = (n: number) => String(n).padStart(2, "0");
const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Thứ 2 của tuần chứa ngày d, cộng thêm weekOffset tuần
const mondayOf = (d: Date, weekOffset = 0) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7) + weekOffset * 7);
  return x;
};
const rangeLabel = (monday: Date) => {
  const fri = new Date(monday);
  fri.setDate(monday.getDate() + 4);
  return `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)} - ${pad(
    fri.getDate(),
  )}/${pad(fri.getMonth() + 1)}/${fri.getFullYear()}`;
};

const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const WEEKDAY_LONG = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];
const parseDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (s: string, n: number) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return fmtDate(d);
};
const longDateLabel = (s: string) => {
  const d = parseDate(s);
  return `${WEEKDAY_LONG[d.getDay()]}, ${pad(d.getDate())}/${pad(
    d.getMonth() + 1,
  )}/${d.getFullYear()}`;
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

  // Chế độ xem: toàn bộ danh sách hoặc theo từng ngày
  const [view, setView] = useState<"all" | "day">("all");
  const [selectedDate, setSelectedDate] = useState(fmtDate(new Date()));

  // Modal tự động phân ca
  const [showAuto, setShowAuto] = useState(false);
  const [autoMode, setAutoMode] = useState<"this" | "next" | "custom">("this");
  const [autoDate, setAutoDate] = useState("");
  const [autoError, setAutoError] = useState<string | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);

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

  // ----- Tự động phân ca -----
  const getAutoMonday = (): Date | null => {
    if (autoMode === "this") return mondayOf(new Date());
    if (autoMode === "next") return mondayOf(new Date(), 1);
    if (!autoDate) return null;
    const [y, m, d] = autoDate.split("-").map(Number);
    return mondayOf(new Date(y, m - 1, d));
  };

  const openAuto = () => {
    setAutoMode("this");
    setAutoDate("");
    setAutoError(null);
    setShowAuto(true);
  };

  const handleAutoGenerate = async () => {
    const monday = getAutoMonday();
    if (!monday) {
      setAutoError("Vui lòng chọn một ngày thuộc tuần cần phân ca.");
      return;
    }
    try {
      setAutoLoading(true);
      setAutoError(null);
      const res = await api.post("/schedules/auto-generate", {
        weekStart: fmtDate(monday),
      });
      setShowAuto(false);
      await fetchSchedules(true);
      alert(res.data?.message || "Đã tạo lịch tự động!");
    } catch (err: unknown) {
      setAutoError(
        err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.",
      );
    } finally {
      setAutoLoading(false);
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

  const renderActions = (item: Schedule) =>
    item.status === "draft" ? (
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
    ) : null;

  const renderAllView = () => (
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
                <td>{renderActions(item)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderDayView = () => {
    const dayItems = schedules.filter((s) => s.workDate === selectedDate);
    const published = dayItems.filter((s) => s.status === "published").length;

    // Gom theo ca, sắp xếp theo giờ bắt đầu
    const map = new Map<
      string,
      { shift: Schedule["shiftId"]; items: Schedule[] }
    >();
    for (const it of dayItems) {
      const key = it.shiftId?._id || "none";
      if (!map.has(key)) map.set(key, { shift: it.shiftId, items: [] });
      map.get(key)!.items.push(it);
    }
    const groups = [...map.values()]
      .sort((a, b) =>
        (a.shift?.startTime || "").localeCompare(b.shift?.startTime || ""),
      )
      .map((g) => ({
        ...g,
        items: [...g.items].sort((a, b) =>
          (a.employeeId?.employeeCode || "").localeCompare(
            b.employeeId?.employeeCode || "",
            "en",
            { numeric: true },
          ),
        ),
      }));

    // Thanh tuần: số ca của từng ngày trong tuần đang xem
    const countByDate: Record<string, number> = {};
    for (const s of schedules)
      countByDate[s.workDate] = (countByDate[s.workDate] || 0) + 1;
    const monday = mondayOf(parseDate(selectedDate));
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = fmtDate(d);
      return {
        key,
        label: WEEKDAY_SHORT[d.getDay()],
        short: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
        count: countByDate[key] || 0,
      };
    });

    return (
      <div className="day-view">
        <div className="day-nav">
          <button
            className="btn-nav"
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            title="Ngày trước"
          >
            ‹
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
          />
          <button
            className="btn-nav"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            title="Ngày sau"
          >
            ›
          </button>
          <button
            className="btn-today"
            onClick={() => setSelectedDate(fmtDate(new Date()))}
          >
            Hôm nay
          </button>
        </div>

        <div className="week-strip">
          {weekDays.map((d) => (
            <button
              key={d.key}
              className={`week-chip${d.key === selectedDate ? " active" : ""}`}
              onClick={() => setSelectedDate(d.key)}
            >
              <span className="week-chip-day">{d.label}</span>
              <span className="week-chip-date">{d.short}</span>
              <span className="week-chip-count">{d.count} ca</span>
            </button>
          ))}
        </div>

        <div className="day-summary">
          <h3>{longDateLabel(selectedDate)}</h3>
          <span className="badge status-published">
            Đã công bố: {published}
          </span>
          <span className="badge status-draft">
            Nháp: {dayItems.length - published}
          </span>
          <span className="day-total">Tổng: {dayItems.length} ca</span>
        </div>

        {groups.length === 0 ? (
          <div className="table-responsive">
            <p className="no-data">Chưa có lịch phân ca cho ngày này.</p>
          </div>
        ) : (
          groups.map((g) => (
            <div className="shift-group" key={g.shift?._id || "none"}>
              <div className="shift-group-title">
                <strong>{g.shift?.name || "Chưa rõ ca"}</strong>
                {g.shift && (
                  <span>
                    {g.shift.startTime} - {g.shift.endTime}
                  </span>
                )}
                <span className="shift-group-count">
                  {g.items.length} người
                </span>
              </div>
              <div className="table-responsive">
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th>Mã NV</th>
                      <th>Họ và Tên</th>
                      <th>Vai trò</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((item) => (
                      <tr key={item._id}>
                        <td>{item.employeeId?.employeeCode || "N/A"}</td>
                        <td>
                          <strong>{item.employeeId?.fullName || "N/A"}</strong>
                        </td>
                        <td>
                          <span
                            className={`badge role-${item.employeeId?.role}`}
                          >
                            {item.employeeId?.position || item.employeeId?.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge status-${item.status}`}>
                            {item.status === "draft"
                              ? "Nháp (Draft)"
                              : "Đã công bố"}
                          </span>
                        </td>
                        <td>{renderActions(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <h2>Quản lý Lịch Phân Ca Làm Việc</h2>
        {canManage && (
          <div className="header-actions">
            <button className="btn-auto" onClick={openAuto}>
              ⚡ Tự động phân ca
            </button>
            <button className="btn-primary" onClick={openModal}>
              + Phân ca thủ công
            </button>
          </div>
        )}
      </div>

      <div className="view-toggle">
        <button
          className={view === "all" ? "active" : ""}
          onClick={() => setView("all")}
        >
          Tất cả
        </button>
        <button
          className={view === "day" ? "active" : ""}
          onClick={() => setView("day")}
        >
          Theo ngày
        </button>
      </div>

      {view === "all" ? renderAllView() : renderDayView()}

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
      {showAuto && (
        <div
          className="modal-overlay"
          onClick={() => !autoLoading && setShowAuto(false)}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>⚡ Tự động phân ca</h3>

            <div className="radio-group">
              <label className="radio-row">
                <input
                  type="radio"
                  checked={autoMode === "this"}
                  onChange={() => setAutoMode("this")}
                />
                <span>Tuần này ({rangeLabel(mondayOf(new Date()))})</span>
              </label>
              <label className="radio-row">
                <input
                  type="radio"
                  checked={autoMode === "next"}
                  onChange={() => setAutoMode("next")}
                />
                <span>Tuần sau ({rangeLabel(mondayOf(new Date(), 1))})</span>
              </label>
              <label className="radio-row">
                <input
                  type="radio"
                  checked={autoMode === "custom"}
                  onChange={() => setAutoMode("custom")}
                />
                <span>Chọn tuần khác</span>
              </label>
            </div>

            {autoMode === "custom" && (
              <label className="form-field">
                <span>Chọn một ngày bất kỳ trong tuần</span>
                <input
                  type="date"
                  value={autoDate}
                  onChange={(e) => setAutoDate(e.target.value)}
                />
                {getAutoMonday() && (
                  <small className="form-hint">
                    Tuần được chọn: {rangeLabel(getAutoMonday() as Date)}
                  </small>
                )}
              </label>
            )}

            <p className="form-hint">
              Thứ 2 - Thứ 6. Manager và Admin HR làm Ca hành chính, nhân viên
              còn lại chia đều Ca sáng / Ca chiều theo từng phòng ban. Lịch tạo
              ở trạng thái Nháp; ai đã có lịch trong ngày đó sẽ được giữ nguyên.
            </p>

            {autoError && <p className="form-error">{autoError}</p>}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowAuto(false)}
                disabled={autoLoading}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleAutoGenerate}
                disabled={autoLoading}
              >
                {autoLoading ? "Đang tạo..." : "Tạo lịch tự động"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
