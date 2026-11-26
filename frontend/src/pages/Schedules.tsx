import { useState, useEffect, type SyntheticEvent } from "react";
import api from "../services/api";
import "./Schedules.css";
import CustomSelect from "../components/layouts/CustomSelect";

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
const viDate = (s: string) => {
  const d = parseDate(s);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const openDatePicker = (e: { currentTarget: HTMLInputElement }) => {
  try {
    e.currentTarget.showPicker?.();
  } catch {}
};
const longDateLabel = (s: string) => {
  const d = parseDate(s);
  return `${WEEKDAY_LONG[d.getDay()]}, ${pad(d.getDate())}/${pad(
    d.getMonth() + 1,
  )}/${d.getFullYear()}`;
};

const getCurrentRole = (): string => {
  const roleOf = (v: unknown): string | null => {
    const o = v as {
      role?: unknown;
      user?: { role?: unknown };
      employee?: { role?: unknown };
    } | null;
    const r = o?.role ?? o?.user?.role ?? o?.employee?.role;
    return typeof r === "string" ? r : null;
  };
  try {
    const keys = ["user", "currentUser", "userInfo", "employee", "auth"];
    for (const key of [...keys, ...Object.keys(localStorage)]) {
      const raw = localStorage.getItem(key);
      if (!raw || raw[0] !== "{") continue;
      const role = roleOf(JSON.parse(raw));
      if (role) return role;
    }
    const token = localStorage.getItem("token");
    if (token) {
      const payload = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      const role = roleOf(payload);
      if (role) return role;
    }
  } catch {}
  console.warn("Không xác định được vai trò đăng nhập, mặc định chỉ xem.");
  return "employee";
};

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  const [selectedDate, setSelectedDate] = useState(fmtDate(new Date()));

  const [showAuto, setShowAuto] = useState(false);
  const [autoMode, setAutoMode] = useState<"this" | "next" | "custom">("this");
  const [autoDate, setAutoDate] = useState("");
  const [autoError, setAutoError] = useState<string | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);

  const currentUserRole = getCurrentRole();

  const canManage =
    currentUserRole === "admin_hr" || currentUserRole === "manager";
  const canPublish = currentUserRole === "admin_hr";
  const canDelete = currentUserRole === "admin_hr";

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

      await api.post("/schedules", form);
      setShowModal(false);
      await fetchSchedules(true);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.",
      );
    } finally {
      setSaving(false);
    }
  };

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

  const handleDelete = async (item: Schedule) => {
    if (!canDelete || item.status !== "draft") return;
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
      await api.post(`/schedules/${id}/publish`);
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

  const renderActions = (item: Schedule) => {
    if (!canPublish && !canDelete) {
      return <span className="action-readonly">Chỉ xem</span>;
    }
    if (item.status !== "draft") return null;
    return (
      <div className="action-cell">
        {canPublish && (
          <button
            className="btn-publish"
            onClick={() => handlePublish(item._id)}
            title="Công bố lịch để nhân viên xem"
          >
            Publish
          </button>
        )}
        {canDelete && (
          <button
            className="btn-delete"
            onClick={() => handleDelete(item)}
            title="Xóa ca này (chỉ khi còn là nháp)"
          >
            Xóa
          </button>
        )}
      </div>
    );
  };

  const renderDayView = () => {
    const dayItems = schedules.filter((s) => s.workDate === selectedDate);
    const published = dayItems.filter((s) => s.status === "published").length;

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
          <label
            className="date-pick"
            style={{ position: "relative" }}
            title="Chọn ngày"
          >
            <span>{viDate(selectedDate)}</span>
            <svg
              className="date-pick-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>

            <input
              type="date"
              className="date-pick-input"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                opacity: 0,
                cursor: "pointer",
              }}
              value={selectedDate}
              onClick={openDatePicker}
              onChange={(e) =>
                e.target.value && setSelectedDate(e.target.value)
              }
            />
          </label>
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

      {renderDayView()}

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
              <CustomSelect
                value={form.employeeId}
                onChange={(val) => setForm({ ...form, employeeId: val })}
                placeholder="-- Chọn nhân viên --"
                options={[
                  { value: "", label: "-- Chọn nhân viên --" },
                  ...employees.map((emp) => ({
                    value: emp._id,
                    label: `${emp.employeeCode} - ${emp.fullName} (${emp.position || emp.role})`,
                  })),
                ]}
              />
            </label>

            <label className="form-field">
              <span>Ca làm việc</span>
              <CustomSelect
                value={form.shiftId}
                onChange={(val) => setForm({ ...form, shiftId: val })}
                placeholder="-- Chọn ca --"
                options={[
                  { value: "", label: "-- Chọn ca --" },
                  ...shifts.map((s) => ({
                    value: s._id,
                    label: `${s.name} (${s.startTime} - ${s.endTime})`,
                  })),
                ]}
              />
            </label>

            <label className="form-field">
              <span>Ngày làm</span>
              <input
                type="date"
                value={form.workDate}
                onClick={openDatePicker}
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
                  onClick={openDatePicker}
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
