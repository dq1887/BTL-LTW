import { useCallback, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import {
  leaveService,
  type LeaveRequest,
  type LeaveType,
} from "../services/leaveService";
import "./LeaveRequests.css";

type StatusFilter = "all" | LeaveRequest["status"];
type FormState = {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
};

const emptyForm: FormState = {
  leaveTypeId: "",
  startDate: "",
  endDate: "",
  reason: "",
};

const statusLabels: Record<LeaveRequest["status"], string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  cancelled: "Đã hủy",
};

const dateLabel = (value?: string) => {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const getEmployee = (request: LeaveRequest) =>
  typeof request.employeeId === "string" ? null : request.employeeId;

const getLeaveType = (request: LeaveRequest) =>
  typeof request.leaveTypeId === "string" ? null : request.leaveTypeId;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Đã xảy ra lỗi. Vui lòng thử lại.";

export default function LeaveRequests() {
  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.id || "";
  const canReview = ["admin_hr", "manager"].includes(currentUser?.role || "");
  const isAdminHr = currentUser?.role === "admin_hr";

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [scheduleDates, setScheduleDates] = useState<string[]>([]);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [typeData, requestData] = await Promise.all([
        leaveService.getTypes(),
        leaveService.getRequests(),
      ]);
      setTypes(typeData);
      setRequests(requestData);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    let active = true;
    if (!form.startDate || !form.endDate) {
      setScheduleDates([]);
      setScheduleError("");
      setScheduleLoading(false);
      return;
    }
    if (form.startDate > form.endDate) {
      setScheduleDates([]);
      setScheduleError("Ngày bắt đầu không được sau ngày kết thúc.");
      setScheduleLoading(false);
      return;
    }

    setScheduleLoading(true);
    setScheduleError("");
    const timeout = window.setTimeout(() => {
      leaveService
        .getScheduleDays(form.startDate, form.endDate)
        .then((result) => {
          if (active) setScheduleDates(result.dates || []);
        })
        .catch((scheduleLoadError: unknown) => {
          if (active) {
            setScheduleDates([]);
            setScheduleError(getErrorMessage(scheduleLoadError));
          }
        })
        .finally(() => {
          if (active) setScheduleLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [form.startDate, form.endDate]);

  const visibleRequests = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("vi");
    return requests.filter((request) => {
      if (filter !== "all" && request.status !== filter) return false;
      if (!term) return true;
      const employee = getEmployee(request);
      const type = getLeaveType(request);
      return [
        employee?.fullName,
        employee?.employeeCode,
        type?.name,
        request.reason,
      ].some((value) => (value || "").toLocaleLowerCase("vi").includes(term));
    });
  }, [requests, filter, search]);

  const stats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((item) => item.status === "pending").length,
      approved: requests.filter((item) => item.status === "approved").length,
      rejected: requests.filter((item) => item.status === "rejected").length,
    }),
    [requests],
  );

  const openCreateForm = () => {
    setEditingRequest(null);
    setForm({ ...emptyForm, leaveTypeId: types[0]?._id || "" });
    setScheduleDates([]);
    setScheduleError("");
    setNotice("");
    setIsFormOpen(true);
  };

  const openEditForm = (request: LeaveRequest) => {
    setEditingRequest(request);
    setForm({
      leaveTypeId:
        typeof request.leaveTypeId === "string"
          ? request.leaveTypeId
          : request.leaveTypeId._id,
      startDate: request.startDate,
      endDate: request.endDate,
      reason: request.reason,
    });
    setScheduleDates(request.scheduledDates || []);
    setScheduleError("");
    setNotice("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (submitting) return;
    setIsFormOpen(false);
    setEditingRequest(null);
    setForm(emptyForm);
    setScheduleDates([]);
    setScheduleError("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.leaveTypeId || !form.startDate || !form.endDate || !form.reason.trim()) {
      setScheduleError("Vui lòng điền đầy đủ thông tin đơn nghỉ phép.");
      return;
    }
    if (scheduleLoading) return;
    if (scheduleDates.length === 0) {
      setScheduleError("Khoảng ngày đã chọn không có ngày được phân ca trong cơ sở dữ liệu.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        leaveTypeId: form.leaveTypeId,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
      };
      if (editingRequest) {
        await leaveService.update(editingRequest._id, payload);
        setNotice("Đã cập nhật đơn nghỉ phép.");
      } else {
        await leaveService.create(payload);
        setNotice("Đã gửi đơn nghỉ phép thành công.");
      }
      setIsFormOpen(false);
      setEditingRequest(null);
      setForm(emptyForm);
      await loadData();
    } catch (submitError) {
      setScheduleError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (request: LeaveRequest) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa đơn nghỉ phép đang chờ duyệt này?")) return;
    try {
      setActionId(request._id);
      setError("");
      await leaveService.remove(request._id);
      setNotice("Đã xóa đơn nghỉ phép.");
      await loadData();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setActionId("");
    }
  };

  const handleReview = async (request: LeaveRequest, action: "approve" | "reject") => {
    const label = action === "approve" ? "duyệt" : "từ chối";
    if (!window.confirm(`Bạn xác nhận ${label} đơn nghỉ phép của ${getEmployee(request)?.fullName || "nhân viên này"}?`)) return;
    const reviewNote = window.prompt("Ghi chú xử lý (có thể để trống):") ?? null;
    if (reviewNote === null) return;

    try {
      setActionId(request._id);
      setError("");
      if (action === "approve") {
        await leaveService.approve(request._id, reviewNote);
        setNotice("Đã duyệt đơn nghỉ phép.");
      } else {
        await leaveService.reject(request._id, reviewNote);
        setNotice("Đã từ chối đơn nghỉ phép.");
      }
      await loadData();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setActionId("");
    }
  };

  return (
    <div className="leave-page">
      <div className="leave-heading">
        <div>
          <div className="leave-eyebrow">NHÂN SỰ · QUẢN LÝ THỜI GIAN</div>
          <h1>Quản lý nghỉ phép</h1>
          <p>Theo dõi đơn nghỉ và xử lý theo lịch làm việc đã được phân công.</p>
        </div>
        <button className="leave-primary-btn" onClick={openCreateForm} disabled={types.length === 0 && !loading}>
          <span aria-hidden="true">＋</span> Tạo đơn nghỉ phép
        </button>
      </div>

      {notice && (
        <div className="leave-notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Đóng thông báo">×</button>
        </div>
      )}
      {error && (
        <div className="leave-alert" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Đóng lỗi">×</button>
        </div>
      )}

      <section className="leave-stats" aria-label="Thống kê đơn nghỉ phép">
        <div className="leave-stat-card">
          <span className="leave-stat-icon blue">▤</span>
          <div><strong>{stats.total}</strong><span>Tổng đơn hiển thị</span></div>
        </div>
        <div className="leave-stat-card">
          <span className="leave-stat-icon amber">◷</span>
          <div><strong>{stats.pending}</strong><span>Chờ duyệt</span></div>
        </div>
        <div className="leave-stat-card">
          <span className="leave-stat-icon green">✓</span>
          <div><strong>{stats.approved}</strong><span>Đã duyệt</span></div>
        </div>
        <div className="leave-stat-card">
          <span className="leave-stat-icon red">×</span>
          <div><strong>{stats.rejected}</strong><span>Đã từ chối</span></div>
        </div>
      </section>

      <section className="leave-panel">
        <div className="leave-toolbar">
          <div>
            <h2>{canReview ? "Danh sách đơn nghỉ phép" : "Đơn nghỉ phép của tôi"}</h2>
            <p>{isAdminHr ? "Phạm vi: toàn công ty" : currentUser?.role === "manager" ? "Phạm vi: phòng ban của bạn và đơn của chính bạn" : "Bạn có thể theo dõi và quản lý các đơn đang chờ duyệt"}</p>
          </div>
          <div className="leave-tools">
            <label className="leave-search">
              <span aria-hidden="true">⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm nhân viên, loại nghỉ..." />
            </label>
            <select value={filter} onChange={(event) => setFilter(event.target.value as StatusFilter)} aria-label="Lọc trạng thái">
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="leave-empty"><span className="leave-spinner" />Đang tải dữ liệu từ MongoDB...</div>
        ) : visibleRequests.length === 0 ? (
          <div className="leave-empty">
            <div className="leave-empty-icon">▧</div>
            <strong>Chưa có đơn nghỉ phép phù hợp</strong>
            <span>{requests.length === 0 ? "Tạo đơn nghỉ phép đầu tiên để bắt đầu." : "Thử thay đổi từ khóa hoặc bộ lọc trạng thái."}</span>
          </div>
        ) : (
          <div className="leave-table-wrap">
            <table className="leave-table">
              <thead>
                <tr>
                  {canReview && <th>Nhân viên</th>}
                  <th>Loại nghỉ</th>
                  <th>Thời gian nghỉ</th>
                  <th>Số ngày</th>
                  <th>Lý do</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleRequests.map((request) => {
                  const employee = getEmployee(request);
                  const type = getLeaveType(request);
                  const isOwner = employee?._id === currentUserId || request.employeeId === currentUserId;
                  const canEdit = isOwner && request.status === "pending";
                  const canDelete = request.status === "pending" && (isOwner || isAdminHr);
                  const canHandle = canReview && request.status === "pending" && !isOwner;
                  return (
                    <tr key={request._id}>
                      {canReview && (
                        <td>
                          <div className="leave-employee">
                            <span className="leave-avatar">{(employee?.fullName || "N").charAt(0).toLocaleUpperCase("vi")}</span>
                            <span><strong>{employee?.fullName || "Nhân viên"}</strong><small>{employee?.employeeCode || "—"}</small></span>
                          </div>
                        </td>
                      )}
                      <td><span className="leave-type-name">{type?.name || "Loại nghỉ"}</span><small className="leave-subtle">{type?.isPaid ? "Có hưởng lương" : "Không hưởng lương"}</small></td>
                      <td><strong>{dateLabel(request.startDate)}</strong><small className="leave-subtle">đến {dateLabel(request.endDate)}</small></td>
                      <td><span className="leave-days">{request.totalDays} ngày</span></td>
                      <td><span className="leave-reason" title={request.reason}>{request.reason}</span></td>
                      <td><span className={`leave-status ${request.status}`}>{statusLabels[request.status]}</span></td>
                      <td>
                        <div className="leave-actions">
                          {canHandle && <>
                            <button className="leave-action approve" onClick={() => void handleReview(request, "approve")} disabled={actionId === request._id}>Duyệt</button>
                            <button className="leave-action reject" onClick={() => void handleReview(request, "reject")} disabled={actionId === request._id}>Từ chối</button>
                          </>}
                          {canEdit && <button className="leave-action edit" onClick={() => openEditForm(request)}>Sửa</button>}
                          {canDelete && <button className="leave-action delete" onClick={() => void handleDelete(request)} disabled={actionId === request._id}>Xóa</button>}
                          {!canHandle && !canEdit && !canDelete && <span className="leave-muted-action">Đã khóa</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="leave-footnote">
        <span>ⓘ</span>
        <p>Số ngày nghỉ được tính theo các ngày có ca làm được phân công trong cơ sở dữ liệu, không tính ngày không có lịch. Đơn đã duyệt/từ chối được giữ lại để bảo toàn lịch sử.</p>
      </div>

      {isFormOpen && (
        <div className="leave-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <section className="leave-modal" role="dialog" aria-modal="true" aria-labelledby="leave-form-title">
            <div className="leave-modal-header">
              <div><span className="leave-eyebrow">YÊU CẦU NGHỈ PHÉP</span><h2 id="leave-form-title">{editingRequest ? "Chỉnh sửa đơn nghỉ" : "Tạo đơn nghỉ phép"}</h2></div>
              <button className="leave-close" onClick={closeForm} disabled={submitting} aria-label="Đóng">×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="leave-form-grid">
                <label className="leave-field full"><span>Loại nghỉ phép</span>
                  <select value={form.leaveTypeId} onChange={(event) => setForm((value) => ({ ...value, leaveTypeId: event.target.value }))} required>
                    <option value="">Chọn loại nghỉ phép</option>
                    {types.map((type) => <option key={type._id} value={type._id}>{type.name}{type.isPaid ? " · Có lương" : " · Không lương"}</option>)}
                  </select>
                </label>
                <label className="leave-field"><span>Từ ngày</span>
                  <input type="date" value={form.startDate} onChange={(event) => setForm((value) => ({ ...value, startDate: event.target.value }))} required />
                </label>
                <label className="leave-field"><span>Đến ngày</span>
                  <input type="date" min={form.startDate || undefined} value={form.endDate} onChange={(event) => setForm((value) => ({ ...value, endDate: event.target.value }))} required />
                </label>
                <label className="leave-field full"><span>Lý do nghỉ phép</span>
                  <textarea rows={4} maxLength={1000} placeholder="Nhập lý do cụ thể để người quản lý xem xét..." value={form.reason} onChange={(event) => setForm((value) => ({ ...value, reason: event.target.value }))} required />
                  <small>{form.reason.length}/1000 ký tự</small>
                </label>
              </div>

              <div className={`leave-schedule-preview ${scheduleError ? "has-error" : ""}`}>
                <div><strong>Ngày làm việc được tính</strong><span>{scheduleLoading ? "Đang kiểm tra lịch trong MongoDB..." : `${scheduleDates.length} ngày có phân ca`}</span></div>
                {scheduleDates.length > 0 && <p>{scheduleDates.map(dateLabel).join(" · ")}</p>}
                {scheduleError && <p className="leave-schedule-error">{scheduleError}</p>}
                {!scheduleError && !scheduleLoading && form.startDate && form.endDate && scheduleDates.length === 0 && <p>Không tìm thấy ca làm được phân công trong khoảng này.</p>}
              </div>

              <div className="leave-modal-footer">
                <button type="button" className="leave-secondary-btn" onClick={closeForm} disabled={submitting}>Hủy</button>
                <button type="submit" className="leave-primary-btn" disabled={submitting || scheduleLoading || scheduleDates.length === 0}>
                  {submitting ? "Đang lưu..." : editingRequest ? "Lưu thay đổi" : "Gửi đơn nghỉ phép"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
