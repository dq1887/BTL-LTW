import { useCallback, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import {
  leaveService,
  type LeaveRequest,
  type LeaveType,
  type PaidLeaveBalance,
  type LeaveEmployee,
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

const validDate = (value: string) => {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
};
const calendarDays = (start: string, end: string) => {
  if (!validDate(start) || !validDate(end) || start > end) return null;
  return (
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86400000 +
    1
  );
};
const currentYear = () =>
  Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date()),
  );

const dateLabel = (value?: string) => {
  if (!value || !validDate(value.slice(0, 10))) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const todayDate = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)?.value || "")
    .join("-");
};
const makeDate = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

function LeaveCalendar({
  value,
  min,
  onSelect,
  onClose,
}: {
  value: string;
  min: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}) {
  const today = todayDate();
  const initial =
    validDate(value) && value >= min ? value : today >= min ? today : min;
  const [year, setYear] = useState(Number(initial.slice(0, 4)));
  const [month, setMonth] = useState(Number(initial.slice(5, 7)));
  const minYear = Number(min.slice(0, 4));
  const minMonth = Number(min.slice(5, 7));
  const firstMonth = year === minYear ? minMonth : 1;
  const firstDay = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const moveMonth = (delta: number) => {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth() + 1);
  };
  return (
    <section
      className="leave-calendar"
      aria-label="Chọn ngày nghỉ"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="leave-calendar-toolbar">
        <button
          type="button"
          aria-label="Tháng trước"
          disabled={year === minYear && month === minMonth}
          onClick={() => moveMonth(-1)}
        >
          ‹
        </button>
        <select
          aria-label="Chọn tháng"
          value={month}
          onChange={(event) => setMonth(Number(event.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m} disabled={m < firstMonth}>
              Tháng {m}
            </option>
          ))}
        </select>
        <select
          aria-label="Chọn năm"
          value={year}
          onChange={(event) => {
            const y = Number(event.target.value);
            setYear(y);
            if (y === minYear && month < minMonth) setMonth(minMonth);
          }}
        >
          {Array.from({ length: 2100 - minYear }, (_, i) => minYear + i).map(
            (y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ),
          )}
        </select>
        <button
          type="button"
          aria-label="Tháng sau"
          disabled={year === 2099 && month === 12}
          onClick={() => moveMonth(1)}
        >
          ›
        </button>
      </div>
      <div className="leave-calendar-grid">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
          <span className="leave-calendar-weekday" key={day}>
            {day}
          </span>
        ))}
        {Array.from({ length: firstDay }, (_, i) => (
          <span aria-hidden="true" key={`empty-${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const day = i + 1;
          const date = makeDate(year, month, day);
          return (
            <button
              type="button"
              key={date}
              className={`leave-calendar-day${date === value ? " selected" : ""}${date === today ? " today" : ""}${(firstDay + i) % 7 >= 5 ? " weekend" : ""}`}
              disabled={date < min}
              aria-label={dateLabel(date)}
              aria-pressed={date === value}
              onClick={() => onSelect(date)}
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className="leave-calendar-footer">
        <button type="button" onClick={() => onSelect("")}>
          Xóa ngày
        </button>
        <button
          type="button"
          disabled={!validDate(today) || today < min}
          onClick={() => onSelect(today)}
        >
          Hôm nay
        </button>
        <button type="button" onClick={onClose}>
          Đóng lịch
        </button>
      </div>
    </section>
  );
}

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
  const [calendarField, setCalendarField] = useState<
    "startDate" | "endDate" | null
  >(null);
  const [scheduleDates, setScheduleDates] = useState<string[]>([]);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [previewKey, setPreviewKey] = useState("");
  const [balanceEmployees, setBalanceEmployees] = useState<LeaveEmployee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [reviewBalance, setReviewBalance] = useState<PaidLeaveBalance | null>(
    null,
  );
  const [reviewBalanceError, setReviewBalanceError] = useState("");
  const [reviewYear, setReviewYear] = useState(currentYear);
  const formCalendarDays = calendarDays(form.startDate, form.endDate);
  const previewReady =
    previewKey === `${form.startDate}/${form.endDate}` && !scheduleLoading;

  const [paidBalance, setPaidBalance] = useState<PaidLeaveBalance | null>(null);
  const [balanceError, setBalanceError] = useState("");

  const balanceYear =
    form.startDate && /^20\d{2}-/.test(form.startDate)
      ? Number(form.startDate.slice(0, 4))
      : currentYear();

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
    setPreviewKey("");
    setScheduleDates([]);
    if (!form.startDate || !form.endDate) {
      setScheduleDates([]);
      setScheduleError("");
      setScheduleLoading(false);
      return;
    }
    if (!validDate(form.startDate) || !validDate(form.endDate)) {
      setScheduleError("Ngày nghỉ không hợp lệ.");
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
          if (active) {
            setScheduleDates(result.dates || []);
            setPreviewKey(`${form.startDate}/${form.endDate}`);
          }
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

  useEffect(() => {
    if (!canReview) return;
    let active = true;
    leaveService
      .getBalanceEmployees()
      .then((data) => {
        if (active) setBalanceEmployees(data);
      })
      .catch((err: unknown) => {
        if (active) setReviewBalanceError(getErrorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [canReview]);

  useEffect(() => {
    let active = true;
    setReviewBalance(null);
    setReviewBalanceError("");
    if (!canReview || !selectedEmployeeId) return;
    if (
      reviewYear < 2000 ||
      reviewYear > 2099 ||
      !Number.isInteger(reviewYear)
    ) {
      setReviewBalanceError("Năm không hợp lệ.");
      return;
    }
    leaveService
      .getPaidBalance(reviewYear, selectedEmployeeId)
      .then((data) => {
        if (active) setReviewBalance(data);
      })
      .catch((err: unknown) => {
        if (active) setReviewBalanceError(getErrorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [canReview, selectedEmployeeId, reviewYear, requests]);

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
    setCalendarField(null);
    setEditingRequest(null);
    setForm({ ...emptyForm });
    setScheduleDates([]);
    setScheduleError("");
    setNotice("");
    setIsFormOpen(true);
  };

  const openEditForm = (request: LeaveRequest) => {
    setCalendarField(null);
    setEditingRequest(request);
    setForm({
      leaveTypeId:
        typeof request.leaveTypeId === "string"
          ? request.leaveTypeId
          : request.leaveTypeId?._id || "",
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
    setCalendarField(null);
    setIsFormOpen(false);
    setEditingRequest(null);
    setForm(emptyForm);
    setScheduleDates([]);
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
    if (!previewReady) {
      setScheduleError("Đang tính số ngày nghỉ, vui lòng đợi giây lát.");
      return;
    }

    if (scheduleDates.length === 0) {
      setScheduleError(
        "Khoảng thời gian này chỉ gồm ngày nghỉ hằng tuần hoặc ngày lễ.",
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
    if (action === "approve" && !request.totalDays) {
      setError("Khoảng thời gian này không có ngày làm việc tính nghỉ.");
      return;
    }
    if (
      !window.confirm(
        `Bạn xác nhận ${label} đơn nghỉ phép của ${getEmployee(request)?.fullName || "nhân viên này"}? ${action === "approve" ? `Số ngày nghỉ: ${request.totalDays}. Loại nghỉ nhân viên đã chọn: ${getLeaveType(request)?.name || "—"}. Khi duyệt, loại nghỉ này được giữ nguyên.` : ""}`,
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
        const result = await leaveService.approve(
          request._id,
          reviewNote,
          request.scheduledDates,
          request.updatedAt,
        );
        setNotice(result.message || "Đã duyệt đơn nghỉ phép.");
      } else {
        await leaveService.reject(request._id, reviewNote, request.updatedAt);
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
          <p>Đăng ký nghỉ phép, theo dõi hạn mức và kết quả phê duyệt.</p>
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
            {paidBalance.unresolvedApproved.length ? (
              <b>Cần kiểm tra</b>
            ) : (
              <>
                <b>{paidBalance.remainingDays}</b> ngày.
              </>
            )}
          </p>
        ) : (
          <p>Đang tải số ngày phép...</p>
        )}
        {paidBalance?.unresolvedApproved.length ? (
          <p className="leave-schedule-error">
            Có {paidBalance.unresolvedApproved.length} đơn đã duyệt chưa xác
            định số ngày; cần đối chiếu đơn cũ trước khi xin thêm phép có lương.
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
            <span>Ngày đã duyệt ({stats.approved} đơn)</span>
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
            <button
              className="leave-secondary-btn"
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
            >
              Làm mới
            </button>
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

        {showEmployeeColumn && (
          <section
            className="leave-review-balance"
            aria-label="Tra cứu phép nhân viên"
          >
            <div className="leave-review-controls">
              <label className="leave-field">
                <span>Tra cứu phép nhân viên</span>
                <CustomSelect
                  value={selectedEmployeeId}
                  onChange={setSelectedEmployeeId}
                  options={[
                    { value: "", label: "Chọn nhân viên" },
                    ...balanceEmployees.map((emp) => ({
                      value: emp._id,
                      label: `${emp.employeeCode} · ${emp.fullName}`,
                    })),
                  ]}
                />
              </label>
              <label className="leave-field">
                <span>Năm</span>
                <input
                  type="number"
                  min={2000}
                  max={2099}
                  value={reviewYear || ""}
                  onChange={(event) =>
                    setReviewYear(Number(event.target.value))
                  }
                />
              </label>
            </div>
            {reviewBalance && (
              <div className="leave-balance-result">
                <strong>
                  {reviewBalance.unresolvedApproved.length
                    ? "Số dư cần kiểm tra"
                    : `Còn có thể xin: ${reviewBalance.remainingDays}/${reviewBalance.limit} ngày`}
                </strong>
                <span>
                  Đã duyệt: {reviewBalance.usedDays} ngày · Chờ duyệt:{" "}
                  {reviewBalance.reservedDays} ngày
                </span>
                {reviewBalance.unresolvedApproved.length > 0 && (
                  <p className="leave-day-warning">
                    Có đơn đã duyệt cần kiểm tra trước khi cấp thêm phép.
                  </p>
                )}
              </div>
            )}
            {selectedEmployeeId && !reviewBalance && !reviewBalanceError && (
              <p>Đang tải số dư phép...</p>
            )}
            {reviewBalanceError && (
              <p className="leave-day-warning">{reviewBalanceError}</p>
            )}
          </section>
        )}

        {loading ? (
          <div className="leave-empty">
            <span className="leave-spinner" />
            Đang tải dữ liệu...
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
                  <th>Tổng thời gian</th>
                  <th>Ngày tính phép</th>
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
                  const spanDays =
                    request.calendarDays ??
                    calendarDays(request.startDate, request.endDate);
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
                              {employee && (
                                <button
                                  type="button"
                                  className="leave-balance-link"
                                  onClick={() => {
                                    setSelectedEmployeeId(employee._id);
                                    setReviewYear(
                                      Number(request.startDate.slice(0, 4)) ||
                                        currentYear(),
                                    );
                                  }}
                                >
                                  Xem số dư phép
                                </button>
                              )}
                            </span>
                          </div>
                        </td>
                      )}
                      <td>
                        <span className="leave-type-name">
                          {type?.name || "Loại nghỉ"}
                        </span>
                        <small className="leave-subtle">
                          {type
                            ? type.isPaid
                              ? "Có hưởng lương"
                              : "Không hưởng lương"
                            : "Chưa xác định"}
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
                          {spanDays === null
                            ? "Chưa xác định"
                            : `${spanDays} ngày`}
                        </span>
                        <small className="leave-subtle">Theo lịch</small>
                      </td>
                      <td>
                        <span className="leave-days">
                          {request.totalDays == null
                            ? "Chưa xác định"
                            : `${request.totalDays} ngày`}
                        </span>
                        {request.status === "pending" && (
                          <small className="leave-subtle">
                            Dự kiến
                            {request.scheduleChanged
                              ? " · Số ngày đã thay đổi"
                              : ""}
                          </small>
                        )}
                        {request.status === "approved" &&
                          (request.scheduleChanged || request.unresolved) && (
                            <small className="leave-day-warning">
                              Cần đối chiếu số ngày
                            </small>
                          )}
                        <details className="leave-day-detail">
                          <summary>Chi tiết ngày nghỉ</summary>
                          <div className="leave-date-list">
                            {(request.scheduledDates || []).length ? (
                              request.scheduledDates.map((d) => (
                                <span key={d}>{dateLabel(d)}</span>
                              ))
                            ) : (
                              <small>Chưa xác định được ngày nghỉ.</small>
                            )}
                          </div>
                          {request.status === "approved" &&
                            request.scheduleChanged && (
                              <p className="leave-day-warning">
                                Số ngày theo quy định hiện tại khác với đơn đã
                                duyệt. Số ngày đã duyệt được giữ nguyên.
                              </p>
                            )}
                          {request.status === "pending" &&
                            spanDays !== null &&
                            spanDays > (request.totalDays ?? 0) && (
                              <p className="leave-subtle">
                                Không tính ngày nghỉ hằng tuần và ngày lễ theo
                                quy định.
                              </p>
                            )}
                          {request.unresolved && (
                            <p className="leave-day-warning">
                              Dữ liệu cũ chưa đủ căn cứ xác định số ngày.
                            </p>
                          )}
                        </details>
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
                                disabled={
                                  actionId === request._id || !request.totalDays
                                }
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
                <fieldset className="leave-field full leave-type-choice">
                  <legend>Loại nghỉ phép mong muốn</legend>
                  <div className="leave-type-options">
                    {["paid", "unpaid"].map((code) => {
                      const type = types.find((item) => item.code === code);
                      const selected = !!type && form.leaveTypeId === type._id;
                      return (
                        <label
                          key={code}
                          className={`leave-type-option${selected ? " selected" : ""}${!type ? " unavailable" : ""}`}
                        >
                          <input
                            type="radio"
                            name="leave-type"
                            value={type?._id || ""}
                            checked={selected}
                            disabled={!type || submitting}
                            required
                            onChange={() =>
                              type &&
                              setForm((value) => ({
                                ...value,
                                leaveTypeId: type._id,
                              }))
                            }
                          />
                          <span>
                            <strong>
                              {code === "paid"
                                ? "Nghỉ có lương"
                                : "Nghỉ không lương"}
                            </strong>
                            <small>
                              {code === "paid"
                                ? "Tối đa 12 ngày/năm"
                                : "Không trừ phép năm"}
                            </small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {types.length === 0 && (
                    <p className="leave-day-warning">
                      Chưa tải được loại nghỉ. Vui lòng tải lại trang.
                    </p>
                  )}
                  <p className="leave-type-hint">
                    Bạn chọn loại nghỉ; người quản lý duyệt hoặc từ chối đơn
                    theo loại đã đăng ký.
                  </p>
                </fieldset>
                <div className="leave-field">
                  <span id="leave-start-label">Từ ngày</span>
                  <button
                    type="button"
                    className="leave-date-trigger"
                    aria-labelledby="leave-start-label leave-start-value"
                    aria-expanded={calendarField === "startDate"}
                    disabled={submitting}
                    onClick={() =>
                      setCalendarField((old) =>
                        old === "startDate" ? null : "startDate",
                      )
                    }
                  >
                    <span id="leave-start-value">
                      {form.startDate
                        ? dateLabel(form.startDate)
                        : "Chọn ngày bắt đầu"}
                    </span>
                    <span aria-hidden="true">▦</span>
                  </button>
                </div>
                <div className="leave-field">
                  <span id="leave-end-label">Đến ngày</span>
                  <button
                    type="button"
                    className="leave-date-trigger"
                    aria-labelledby="leave-end-label leave-end-value"
                    aria-expanded={calendarField === "endDate"}
                    disabled={submitting}
                    onClick={() =>
                      setCalendarField((old) =>
                        old === "endDate" ? null : "endDate",
                      )
                    }
                  >
                    <span id="leave-end-value">
                      {form.endDate
                        ? dateLabel(form.endDate)
                        : "Chọn ngày kết thúc"}
                    </span>
                    <span aria-hidden="true">▦</span>
                  </button>
                </div>
                {calendarField && (
                  <div className="leave-field full">
                    <span>
                      {calendarField === "startDate"
                        ? "Chọn ngày bắt đầu"
                        : "Chọn ngày kết thúc"}
                    </span>
                    <LeaveCalendar
                      key={calendarField}
                      value={form[calendarField]}
                      min={
                        calendarField === "endDate" && validDate(form.startDate)
                          ? form.startDate
                          : "2000-01-01"
                      }
                      onClose={() => setCalendarField(null)}
                      onSelect={(date) => {
                        setForm((value) =>
                          calendarField === "startDate"
                            ? {
                                ...value,
                                startDate: date,
                                endDate:
                                  date && value.endDate < date
                                    ? ""
                                    : value.endDate,
                              }
                            : { ...value, endDate: date },
                        );
                        setCalendarField(null);
                      }}
                    />
                  </div>
                )}
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
                className={`leave-schedule-preview ${scheduleError || (previewReady && form.startDate && form.endDate && scheduleDates.length === 0) ? "has-error" : ""}`}
              >
                <div>
                  <strong>Tổng thời gian nghỉ</strong>
                  <span>
                    {formCalendarDays === null
                      ? "—"
                      : `${formCalendarDays} ngày`}
                  </span>
                </div>
                <div>
                  <strong>Ngày nghỉ tính phép</strong>
                  <span>
                    {scheduleLoading
                      ? "Đang tính số ngày nghỉ..."
                      : !previewReady
                        ? "Chưa xác định"
                        : `${scheduleDates.length} ngày`}
                  </span>
                </div>
                {scheduleDates.length > 0 && (
                  <div className="leave-date-list">
                    {scheduleDates.map((d) => (
                      <span key={d}>{dateLabel(d)}</span>
                    ))}
                  </div>
                )}
                {previewReady &&
                  formCalendarDays !== null &&
                  formCalendarDays > scheduleDates.length && (
                    <p>
                      Không tính ngày nghỉ hằng tuần và ngày lễ theo quy định.
                    </p>
                  )}
                {previewReady && form.leaveTypeId && (
                  <p>
                    {types.find((t) => t._id === form.leaveTypeId)?.isPaid
                      ? `Dự kiến trừ ${scheduleDates.length} ngày phép có lương.`
                      : "Nghỉ không lương không trừ hạn mức phép năm."}
                  </p>
                )}
                {scheduleError && (
                  <p className="leave-schedule-error">{scheduleError}</p>
                )}
                {!scheduleError &&
                  previewReady &&
                  form.startDate &&
                  form.endDate &&
                  scheduleDates.length === 0 && (
                    <p className="leave-schedule-error">
                      Khoảng thời gian này chỉ gồm ngày nghỉ hằng tuần hoặc ngày
                      lễ.
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
                    !previewReady ||
                    !form.leaveTypeId ||
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
