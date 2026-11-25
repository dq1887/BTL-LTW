import { useCallback, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import {
  leaveService,
  type LeaveRequest,
  type LeaveType,
  type PaidLeaveBalance,
} from "../services/leaveService";
import "./LeaveRequests.css";
import CustomSelect from "../components/layouts/CustomSelect";

type StatusFilter = "all" | LeaveRequest["status"];
type ViewTab = "mine" | "review";
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

// Giới hạn phần năm tối đa 4 chữ số
const sanitizeDateInput = (raw: string) => {
  if (!raw) return "";
  const parts = raw.split("-");
  if (parts[0] && parts[0].length > 4) {
    parts[0] = parts[0].slice(0, 4);
    return parts.join("-");
  }
  return raw;
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
  const [activeTab, setActiveTab] = useState<ViewTab>("mine");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [scheduleDates, setScheduleDates] = useState<string[]>([]);
  const [draftDates, setDraftDates] = useState<string[]>([]);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [paidBalance, setPaidBalance] = useState<PaidLeaveBalance | null>(null);
  const [balanceError, setBalanceError] = useState("");

  const balanceYear =
    form.startDate && /^20\d{2}-/.test(form.startDate)
      ? Number(form.startDate.slice(0, 4))
      : new Date().getFullYear();

  const isOwnRequest = useCallback(
    (request: LeaveRequest) => {
      const employee = getEmployee(request);
      return (
        employee?._id === currentUserId || request.employeeId === currentUserId
      );
    },
    [currentUserId],
  );

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
      setDraftDates([]);
      setScheduleError("");
      setScheduleLoading(false);
      return;
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(form.startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(form.endDate)
    ) {
      return;
    }
    if (form.startDate > form.endDate) {
      setScheduleDates([]);
      setDraftDates([]);
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
          if (active) {
            setScheduleDates(result.dates || []);
            setDraftDates(result.draftDates || []);
          }
        })
        .catch((scheduleLoadError: unknown) => {
          if (active) {
            setScheduleDates([]);
            setDraftDates([]);
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

  useEffect(() => {
    let active = true;
    leaveService
      .getPaidBalance(balanceYear)
      .then((value) => {
        if (active) {
          setPaidBalance(value);
          setBalanceError("");
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setPaidBalance(null);
          setBalanceError(getErrorMessage(err));
        }
      });
    return () => {
      active = false;
    };
  }, [balanceYear, requests]);

  // Tách riêng đơn của chính tài khoản đăng nhập và đơn nhân viên khác cần duyệt
  const myRequests = useMemo(
    () => requests.filter((request) => isOwnRequest(request)),
    [requests, isOwnRequest],
  );

  const reviewRequests = useMemo(
    () =>
      canReview ? requests.filter((request) => !isOwnRequest(request)) : [],
    [requests, canReview, isOwnRequest],
  );

  const pendingReviewCount = useMemo(
    () => reviewRequests.filter((item) => item.status === "pending").length,
    [reviewRequests],
  );

  const currentTabRequests =
    canReview && activeTab === "review" ? reviewRequests : myRequests;

  const visibleRequests = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("vi");
    return currentTabRequests.filter((request) => {
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
  }, [currentTabRequests, filter, search]);

  // Thống kê & tổng số ngày đã duyệt tính chuẩn theo riêng đơn của nhân viên đang đăng nhập
  const stats = useMemo(() => {
    const approvedList = myRequests.filter(
      (item) => item.status === "approved",
    );
    const approvedDays = approvedList.reduce(
      (sum, item) => sum + (item.totalDays ?? item.scheduledDates?.length ?? 0),
      0,
    );
    return {
      total: myRequests.length,
      pending: myRequests.filter((item) => item.status === "pending").length,
      approved: approvedList.length,
      approvedDays,
      rejected: myRequests.filter((item) => item.status === "rejected").length,
    };
  }, [myRequests]);

  const showEmployeeColumn = canReview && activeTab === "review";

  const openCreateForm = () => {
    setEditingRequest(null);
    setForm({ ...emptyForm, leaveTypeId: types[0]?._id || "" });
    setScheduleDates([]);
    setDraftDates([]);
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
    setDraftDates([]);
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
    setDraftDates([]);
    setScheduleError("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !form.leaveTypeId ||
      !form.startDate ||
      !form.endDate ||
      !form.reason.trim()
    ) {
      setScheduleError("Vui lòng điền đầy đủ thông tin đơn nghỉ phép.");
      return;
    }
    if (scheduleLoading) {
      setScheduleError("Đang kiểm tra lịch làm việc, vui lòng đợi giây lát.");
      return;
    }
    // Bắt buộc có lịch làm việc được phân công cho cả nghỉ có lương và không lương
    if (scheduleDates.length === 0) {
      setScheduleError(
        "Bạn không có lịch làm việc được phân công trong khoảng thời gian này nên không thể tạo đơn xin nghỉ.",
      );
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
      setActiveTab("mine");
      await loadData();
    } catch (submitError) {
      setScheduleError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (request: LeaveRequest) => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xóa đơn nghỉ phép đang chờ duyệt này?",
      )
    )
      return;
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

  const handleReview = async (
    request: LeaveRequest,
    action: "approve" | "reject",
  ) => {
    const label = action === "approve" ? "duyệt" : "từ chối";
    if (
      !window.confirm(
        `Bạn xác nhận ${label} đơn nghỉ phép của ${getEmployee(request)?.fullName || "nhân viên này"}?`,
      )
    )
      return;
    const reviewNote =
      window.prompt("Ghi chú xử lý (có thể để trống):") ?? null;
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
          <p>
            Theo dõi đơn nghỉ và xử lý theo lịch làm việc đã được phân công.
          </p>
        </div>
        <button
          className="leave-primary-btn"
          onClick={openCreateForm}
          disabled={types.length === 0 && !loading}
        >
          <span aria-hidden="true">＋</span> Tạo đơn nghỉ phép
        </button>
      </div>

      {notice && (
        <div className="leave-notice" role="status">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="leave-alert" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Đóng lỗi"
          >
            ×
          </button>
        </div>
      )}

      <section className="leave-balance" aria-label="Hạn mức nghỉ có lương">
        <strong>Phép có lương năm {balanceYear}: tối đa 12 ngày</strong>
        {paidBalance ? (
          <p>
            Đã duyệt: <b>{paidBalance.usedDays}</b> ngày · Đang chờ duyệt:{" "}
            <b>{paidBalance.reservedDays}</b> ngày · Còn có thể xin:{" "}
            <b>{paidBalance.remainingDays}</b> ngày.
          </p>
        ) : (
          <p>Đang tải số ngày phép...</p>
        )}
        {paidBalance?.unresolvedApproved.length ? (
          <p className="leave-schedule-error">
            Có {paidBalance.unresolvedApproved.length} đơn đã duyệt chưa xác
            định số ngày; cần kiểm tra lịch trước khi xin thêm phép có lương.
          </p>
        ) : null}
        {balanceError ? (
          <p className="leave-schedule-error">
            Không tải được số dư phép: {balanceError}
          </p>
        ) : null}
      </section>

      <section className="leave-stats" aria-label="Thống kê đơn nghỉ phép">
        <div className="leave-stat-card">
          <span className="leave-stat-icon blue">▤</span>
          <div>
            <strong>{stats.total}</strong>
            <span>Tổng đơn của tôi</span>
          </div>
        </div>
        <div className="leave-stat-card">
          <span className="leave-stat-icon amber">◷</span>
          <div>
            <strong>{stats.pending}</strong>
            <span>Chờ duyệt</span>
          </div>
        </div>
        <div className="leave-stat-card">
          <span className="leave-stat-icon green">✓</span>
          <div>
            <strong>{stats.approvedDays} ngày</strong>
            <span>Đã duyệt ({stats.approved} đơn)</span>
          </div>
        </div>
        <div className="leave-stat-card">
          <span className="leave-stat-icon red">×</span>
          <div>
            <strong>{stats.rejected}</strong>
            <span>Đã từ chối</span>
          </div>
        </div>
      </section>

      <section className="leave-panel">
        <div className="leave-toolbar">
          <div>
            <h2>
              {showEmployeeColumn
                ? "Duyệt đơn nghỉ phép nhân viên"
                : "Đơn nghỉ phép của tôi"}
            </h2>
            <p>
              {showEmployeeColumn
                ? isAdminHr
                  ? "Phạm vi duyệt: toàn công ty"
                  : "Phạm vi duyệt: nhân viên thuộc phòng ban của bạn"
                : "Chỉ hiển thị các đơn xin nghỉ phép của riêng bạn"}
            </p>
            {canReview && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className={
                    activeTab === "mine"
                      ? "leave-primary-btn"
                      : "leave-secondary-btn"
                  }
                  onClick={() => setActiveTab("mine")}
                >
                  Đơn của tôi ({myRequests.length})
                </button>
                <button
                  type="button"
                  className={
                    activeTab === "review"
                      ? "leave-primary-btn"
                      : "leave-secondary-btn"
                  }
                  onClick={() => setActiveTab("review")}
                >
                  Duyệt đơn nhân viên
                  {pendingReviewCount > 0 ? ` (${pendingReviewCount})` : ""}
                </button>
              </div>
            )}
          </div>
          <div className="leave-tools">
            <label className="leave-search">
              <span aria-hidden="true">⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  showEmployeeColumn
                    ? "Tìm nhân viên, loại nghỉ..."
                    : "Tìm loại nghỉ, lý do..."
                }
              />
            </label>
            <CustomSelect
              value={filter}
              onChange={(val) => setFilter(val as StatusFilter)}
              options={[
                { value: "all", label: "Tất cả trạng thái" },
                { value: "pending", label: "Chờ duyệt" },
                { value: "approved", label: "Đã duyệt" },
                { value: "rejected", label: "Từ chối" },
                { value: "cancelled", label: "Đã hủy" },
              ]}
            />
          </div>
        </div>

        {loading ? (
          <div className="leave-empty">
            <span className="leave-spinner" />
            Đang tải dữ liệu từ MongoDB...
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="leave-empty">
            <div className="leave-empty-icon">▧</div>
            <strong>Chưa có đơn nghỉ phép phù hợp</strong>
            <span>
              {currentTabRequests.length === 0
                ? showEmployeeColumn
                  ? "Hiện chưa có đơn nào của nhân viên cần xử lý."
                  : "Tạo đơn nghỉ phép đầu tiên để bắt đầu."
                : "Thử thay đổi từ khóa hoặc bộ lọc trạng thái."}
            </span>
          </div>
        ) : (
          <div className="leave-table-wrap">
            <table className="leave-table">
              <thead>
                <tr>
                  {showEmployeeColumn && <th>Nhân viên</th>}
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
                  const isOwner = isOwnRequest(request);
                  const canEdit = isOwner && request.status === "pending";
                  const canDelete =
                    request.status === "pending" && (isOwner || isAdminHr);
                  const canHandle =
                    canReview && request.status === "pending" && !isOwner;
                  return (
                    <tr key={request._id}>
                      {showEmployeeColumn && (
                        <td>
                          <div className="leave-employee">
                            <span className="leave-avatar">
                              {(employee?.fullName || "N")
                                .charAt(0)
                                .toLocaleUpperCase("vi")}
                            </span>
                            <span>
                              <strong>
                                {employee?.fullName || "Nhân viên"}
                              </strong>
                              <small>{employee?.employeeCode || "—"}</small>
                            </span>
                          </div>
                        </td>
                      )}
                      <td>
                        <span className="leave-type-name">
                          {type?.name || "Loại nghỉ"}
                        </span>
                        <small className="leave-subtle">
                          {type?.isPaid
                            ? "Có hưởng lương"
                            : "Không hưởng lương"}
                        </small>
                      </td>
                      <td>
                        <strong>{dateLabel(request.startDate)}</strong>
                        <small className="leave-subtle">
                          đến {dateLabel(request.endDate)}
                        </small>
                      </td>
                      <td>
                        <span className="leave-days">
                          {request.totalDays == null
                            ? "Chưa xác định"
                            : `${request.totalDays} ngày`}
                        </span>
                      </td>
                      <td>
                        <span className="leave-reason" title={request.reason}>
                          {request.reason}
                        </span>
                      </td>
                      <td>
                        <span className={`leave-status ${request.status}`}>
                          {statusLabels[request.status]}
                        </span>
                      </td>
                      <td>
                        <div className="leave-actions">
                          {canHandle && (
                            <>
                              <button
                                className="leave-action approve"
                                onClick={() =>
                                  void handleReview(request, "approve")
                                }
                                disabled={actionId === request._id}
                              >
                                Duyệt
                              </button>
                              <button
                                className="leave-action reject"
                                onClick={() =>
                                  void handleReview(request, "reject")
                                }
                                disabled={actionId === request._id}
                              >
                                Từ chối
                              </button>
                            </>
                          )}
                          {canEdit && (
                            <button
                              className="leave-action edit"
                              onClick={() => openEditForm(request)}
                            >
                              Sửa
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="leave-action delete"
                              onClick={() => void handleDelete(request)}
                              disabled={actionId === request._id}
                            >
                              Xóa
                            </button>
                          )}
                          {!canHandle && !canEdit && !canDelete && (
                            <span className="leave-muted-action">Đã khóa</span>
                          )}
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

      {isFormOpen && (
        <div
          className="leave-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            className="leave-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-form-title"
          >
            <div className="leave-modal-header">
              <div>
                <span className="leave-eyebrow">YÊU CẦU NGHỈ PHÉP</span>
                <h2 id="leave-form-title">
                  {editingRequest ? "Chỉnh sửa đơn nghỉ" : "Tạo đơn nghỉ phép"}
                </h2>
              </div>
              <button
                className="leave-close"
                onClick={closeForm}
                disabled={submitting}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="leave-form-grid">
                <label className="leave-field full">
                  <span>Loại nghỉ phép</span>
                  <CustomSelect
                    value={form.leaveTypeId}
                    onChange={(val) =>
                      setForm((value) => ({ ...value, leaveTypeId: val }))
                    }
                    placeholder="Chọn loại nghỉ phép"
                    options={[
                      { value: "", label: "Chọn loại nghỉ phép" },
                      ...types.map((type) => ({
                        value: type._id,
                        label: `${type.name}${type.isPaid ? " · Có lương" : " · Không lương"}`,
                      })),
                    ]}
                  />
                </label>
                <label className="leave-field">
                  <span>Từ ngày</span>
                  <input
                    type="date"
                    min="2000-01-01"
                    max="2099-12-31"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        startDate: sanitizeDateInput(event.target.value),
                      }))
                    }
                    required
                  />
                </label>
                <label className="leave-field">
                  <span>Đến ngày</span>
                  <input
                    type="date"
                    min={form.startDate || "2000-01-01"}
                    max="2099-12-31"
                    value={form.endDate}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        endDate: sanitizeDateInput(event.target.value),
                      }))
                    }
                    required
                  />
                </label>
                <label className="leave-field full">
                  <span>Lý do nghỉ phép</span>
                  <textarea
                    rows={4}
                    maxLength={1000}
                    placeholder="Nhập lý do cụ thể để người quản lý xem xét..."
                    value={form.reason}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        reason: event.target.value,
                      }))
                    }
                    required
                  />
                  <small>{form.reason.length}/1000 ký tự</small>
                </label>
              </div>

              <div
                className={`leave-schedule-preview ${scheduleError || (!scheduleLoading && form.startDate && form.endDate && scheduleDates.length === 0) ? "has-error" : ""}`}
              >
                <div>
                  <strong>Ngày làm việc được tính</strong>
                  <span>
                    {scheduleLoading
                      ? "Đang kiểm tra lịch trong MongoDB..."
                      : `${scheduleDates.length} ngày có phân ca`}
                  </span>
                </div>
                {scheduleDates.length > 0 && (
                  <p>{scheduleDates.map(dateLabel).join(" · ")}</p>
                )}
                {draftDates.length > 0 && (
                  <p>
                    {draftDates.length} ngày đang ở trạng thái nháp:{" "}
                    {draftDates.map(dateLabel).join(" · ")}
                  </p>
                )}
                {scheduleError && (
                  <p className="leave-schedule-error">{scheduleError}</p>
                )}
                {!scheduleError &&
                  !scheduleLoading &&
                  form.startDate &&
                  form.endDate &&
                  scheduleDates.length === 0 && (
                    <p className="leave-schedule-error">
                      Không có lịch làm việc được phân công trong khoảng thời
                      gian này. Bạn chỉ được tạo đơn nghỉ phép vào ngày đã có
                      lịch phân công.
                    </p>
                  )}
              </div>

              <div className="leave-modal-footer">
                <button
                  type="button"
                  className="leave-secondary-btn"
                  onClick={closeForm}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="leave-primary-btn"
                  disabled={
                    submitting ||
                    scheduleLoading ||
                    !form.startDate ||
                    !form.endDate ||
                    scheduleDates.length === 0
                  }
                >
                  {submitting
                    ? "Đang lưu..."
                    : editingRequest
                      ? "Lưu thay đổi"
                      : "Gửi đơn nghỉ phép"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
