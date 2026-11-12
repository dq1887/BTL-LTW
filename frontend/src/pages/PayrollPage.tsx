import { useEffect, useMemo, useState } from "react";
import {
  createRequest,
  finalizePayroll,
  getPayrolls,
  getRequests,
  handleRequest,
  updatePayroll,
  type PayrollRow,
  type SalaryRequestRow,
} from "../services/payrollApi";
import "./PayrollPage.css";

const money = (n: number) => (n ?? 0).toLocaleString("vi-VN") + " đ";
const signed = (n: number) => (n > 0 ? "+" : "") + money(n);
const thisMonth = () => new Date().toISOString().slice(0, 7);
const initial = (name?: string) =>
  (name || "?").trim().split(/\s+/).pop()!.charAt(0).toUpperCase();

const REQUEST_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Chờ xử lý", cls: "pending" },
  resolved: { label: "Đã xử lý", cls: "resolved" },
  rejected: { label: "Từ chối", cls: "rejected" },
};

const getErr = (e: unknown) =>
  e instanceof Error ? e.message : "Đã có lỗi xảy ra!";

type NumberField = "baseSalary" | "hourRate" | "allowance" | "adjustment";

const FIELDS: { key: NumberField; label: string }[] = [
  { key: "baseSalary", label: "Lương cơ bản" },
  { key: "hourRate", label: "Thưởng mỗi giờ" },
  { key: "allowance", label: "Phụ cấp" },
  { key: "adjustment", label: "Điều chỉnh (+/-)" },
];

export default function PayrollPage() {
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [requests, setRequests] = useState<SalaryRequestRow[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<PayrollRow | null>(null);
  const [reqMsg, setReqMsg] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [finalizing, setFinalizing] = useState(false);

  // Tải lại dữ liệu sau khi thao tác (chốt, sửa, gửi yêu cầu...)
  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  // Tải dữ liệu khi đổi tháng hoặc khi gọi reload()
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [p, r] = await Promise.all([getPayrolls(month), getRequests()]);
        if (cancelled) return;
        setRows(p.data);
        setCanManage(p.canManage);
        setCurrentUserId(p.currentUserId);
        setRequests(r.data);
      } catch (e) {
        if (!cancelled) alert(getErr(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [month, reloadKey]);

  // Lọc theo ô tìm kiếm, phiếu của mình luôn nằm trên cùng
  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (!term) return true;
      return (
        (r.employeeId?.fullName || "").toLowerCase().includes(term) ||
        (r.employeeId?.employeeCode || "").toLowerCase().includes(term) ||
        (r.employeeId?.position || "").toLowerCase().includes(term)
      );
    });
    return [...filtered].sort((a, b) => {
      const aMe = a.employeeId?._id === currentUserId ? 0 : 1;
      const bMe = b.employeeId?._id === currentUserId ? 0 : 1;
      if (aMe !== bMe) return aMe - bMe;
      return (a.employeeId?.employeeCode || "").localeCompare(
        b.employeeId?.employeeCode || "",
      );
    });
  }, [rows, search, currentUserId]);

  const finalizedCount = rows.filter((r) => r.status === "finalized").length;
  const draftCount = rows.length - finalizedCount;
  const allFinalized = rows.length > 0 && draftCount === 0;
  const totalPay = rows.reduce((s, r) => s + (r.total || 0), 0);
  const totalHours = rows.reduce((s, r) => s + (r.totalHours || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (r.totalCredit || 0), 0);

  // CHỐT LƯƠNG: ghi các bảng lương chưa chốt vào database
  const onFinalize = async () => {
    if (
      !confirm(
        `Chốt lương tháng ${month} cho ${draftCount} bảng lương chưa chốt và lưu vào cơ sở dữ liệu?`,
      )
    )
      return;
    try {
      setFinalizing(true);
      const res = await finalizePayroll(month);
      setNotice(
        `✔ Đã lưu vào cơ sở dữ liệu ${res.count} bảng lương. Tháng ${month} hiện có ${res.saved} bảng đã chốt, tổng chi lương ${money(res.total)}.`,
      );
      reload();
    } catch (e) {
      alert(getErr(e));
    } finally {
      setFinalizing(false);
    }
  };

  // SỬA LƯƠNG: lưu vào database và đưa phiếu về Nháp để chốt lại
  const onSave = async () => {
    if (!editing) return;
    try {
      await updatePayroll({
        employeeId: editing.employeeId._id,
        month,
        baseSalary: Number(editing.baseSalary),
        hourRate: Number(editing.hourRate),
        allowance: Number(editing.allowance),
        adjustment: Number(editing.adjustment),
        note: editing.note,
      });
      setNotice(
        `✔ Đã lưu thay đổi lương của ${editing.employeeId.fullName}. Phiếu lương chuyển về Nháp, hãy bấm "Chốt lương tháng" để chốt lại.`,
      );
      setEditing(null);
      reload();
    } catch (e) {
      alert(getErr(e));
    }
  };

  const onSendRequest = async () => {
    try {
      await createRequest({ month, message: reqMsg });
      setReqMsg("");
      reload();
    } catch (e) {
      alert(getErr(e));
    }
  };

  const onHandle = async (id: string, status: "resolved" | "rejected") => {
    const reply = prompt("Phản hồi cho nhân viên (có thể bỏ trống):") ?? "";
    try {
      await handleRequest(id, { status, reply });
      reload();
    } catch (e) {
      alert(getErr(e));
    }
  };

  // Số tiền dự kiến trong cửa sổ sửa lương
  const preview = editing
    ? Number(editing.baseSalary) +
      Math.round(editing.totalHours * Number(editing.hourRate)) +
      Number(editing.allowance) +
      Number(editing.adjustment)
    : 0;

  return (
    <div className="pay-page">
      {/* Tiêu đề + công cụ */}
      <div className="pay-header">
        <div>
          <h1>💰 Bảng lương</h1>
          <p className="pay-sub">
            {canManage
              ? "Lương tính tự động từ chấm công. Dữ liệu chỉ được lưu vào cơ sở dữ liệu khi bấm Chốt lương"
              : "Lương được tính tự động từ dữ liệu chấm công trong tháng"}
          </p>
        </div>
        <div className="pay-tools">
          <input
            type="month"
            value={month}
            onChange={(e) => {
              setLoading(true);
              setNotice("");
              setMonth(e.target.value);
            }}
            className="pay-input"
          />
          {canManage && (
            <input
              type="text"
              placeholder="🔍 Tìm nhân viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pay-input pay-search"
            />
          )}
          {canManage && (
            <button
              onClick={onFinalize}
              disabled={allFinalized || loading || finalizing}
              className="pay-btn green"
            >
              {finalizing
                ? "Đang lưu..."
                : allFinalized
                  ? "✔ Đã chốt lương"
                  : `Chốt lương tháng (${draftCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Thông báo đã lưu */}
      {notice && (
        <div className="pay-notice">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="Đóng">
            ✕
          </button>
        </div>
      )}

      {/* Thẻ thống kê */}
      <div className="pay-stats">
        {canManage ? (
          <>
            <div className="pay-stat">
              <span className="pay-stat-label">Số nhân viên</span>
              <span className="pay-stat-value">{rows.length}</span>
            </div>
            <div className="pay-stat">
              <span className="pay-stat-label">Tổng giờ làm</span>
              <span className="pay-stat-value">
                {totalHours.toFixed(1)} giờ
              </span>
            </div>
            <div className="pay-stat accent">
              <span className="pay-stat-label">Tổng chi lương</span>
              <span className="pay-stat-value">{money(totalPay)}</span>
            </div>
            <div className="pay-stat">
              <span className="pay-stat-label">Đã chốt</span>
              <span className="pay-stat-value">
                {finalizedCount}/{rows.length}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="pay-stat">
              <span className="pay-stat-label">Tổng công</span>
              <span className="pay-stat-value">{totalCredit.toFixed(1)}</span>
            </div>
            <div className="pay-stat">
              <span className="pay-stat-label">Tổng giờ làm</span>
              <span className="pay-stat-value">
                {totalHours.toFixed(1)} giờ
              </span>
            </div>
            <div className="pay-stat accent">
              <span className="pay-stat-label">Thực nhận</span>
              <span className="pay-stat-value">{money(totalPay)}</span>
            </div>
          </>
        )}
      </div>

      {/* Danh sách phiếu lương */}
      <div className="pay-grid">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="pc skeleton">
              <div className="sk-line w60" />
              <div className="sk-line w40 big" />
              <div className="sk-line" />
              <div className="sk-line" />
              <div className="sk-line w80" />
            </div>
          ))}

        {!loading && visibleRows.length === 0 && (
          <div className="pay-empty">
            {search ? "Không tìm thấy nhân viên phù hợp" : "Chưa có dữ liệu"}
          </div>
        )}

        {!loading &&
          visibleRows.map((r) => {
            const isMe = r.employeeId?._id === currentUserId;
            const isFinal = r.status === "finalized";
            return (
              <div
                key={r.employeeId._id}
                className={`pc ${isMe ? "me" : ""} ${isFinal ? "final" : ""}`}
              >
                <div className="pc-top">
                  <span className="pay-avatar">
                    {initial(r.employeeId?.fullName)}
                  </span>
                  <div className="pc-id">
                    <div className="pc-name">
                      {r.employeeId?.fullName}
                      {isMe && <span className="pay-me">Bạn</span>}
                    </div>
                    <div className="pc-sub">
                      {r.employeeId?.employeeCode} ·{" "}
                      {r.employeeId?.position || "Nhân viên"}
                    </div>
                  </div>
                  <span className={`pay-pill ${isFinal ? "final" : "draft"}`}>
                    {isFinal ? "Đã chốt" : "Nháp"}
                  </span>
                </div>

                <div className="pc-net">
                  <span className="pc-net-label">Thực nhận</span>
                  <span className="pc-net-value">{money(r.total)}</span>
                </div>

                <div className="pc-meta">
                  <span>⏱ {r.totalHours} giờ</span>
                  <span>📅 {r.totalCredit} công</span>
                </div>

                <ul className="pc-lines">
                  <li>
                    <span>Lương cơ bản</span>
                    <b>{money(r.baseSalary)}</b>
                  </li>
                  <li>
                    <span>
                      Thưởng giờ ({r.totalHours}h ×{" "}
                      {r.hourRate.toLocaleString("vi-VN")})
                    </span>
                    <b className="plus">{signed(r.hourBonus)}</b>
                  </li>
                  <li>
                    <span>Phụ cấp</span>
                    <b className="plus">{signed(r.allowance)}</b>
                  </li>
                  <li>
                    <span>Điều chỉnh</span>
                    <b
                      className={
                        r.adjustment > 0
                          ? "plus"
                          : r.adjustment < 0
                            ? "minus"
                            : ""
                      }
                    >
                      {r.adjustment === 0 ? "0 đ" : signed(r.adjustment)}
                    </b>
                  </li>
                </ul>

                {r.note && <p className="pc-note">📝 {r.note}</p>}

                {canManage && (
                  <button
                    onClick={() => setEditing({ ...r })}
                    className="pay-edit pc-btn"
                  >
                    ✏️ Sửa lương
                  </button>
                )}
              </div>
            );
          })}
      </div>

      {/* Nhân viên gửi yêu cầu cho kế toán */}
      {!canManage && (
        <div className="pay-card">
          <h2>📨 Gửi yêu cầu sửa lương cho kế toán</h2>
          <textarea
            value={reqMsg}
            onChange={(e) => setReqMsg(e.target.value)}
            rows={3}
            placeholder="Ví dụ: Ngày 05 tôi làm đủ ca nhưng bị thiếu công..."
            className="pay-textarea"
          />
          <div>
            <button
              onClick={onSendRequest}
              disabled={!reqMsg.trim()}
              className="pay-btn blue"
            >
              Gửi kế toán
            </button>
          </div>
        </div>
      )}

      {/* Danh sách yêu cầu */}
      <div className="pay-section">
        <h2>{canManage ? "📥 Yêu cầu từ nhân viên" : "📋 Yêu cầu của tôi"}</h2>
        {requests.length === 0 && (
          <p className="pay-muted">Chưa có yêu cầu nào.</p>
        )}
        {requests.map((q) => (
          <div key={q._id} className="pay-request">
            <div className="pay-request-head">
              <b>{q.employeeId?.fullName}</b>
              <span className="pay-muted">Tháng {q.month}</span>
              <span
                className={`pay-pill ${REQUEST_STATUS[q.status].cls} right`}
              >
                {REQUEST_STATUS[q.status].label}
              </span>
            </div>
            <p>{q.message}</p>
            {q.reply && <p className="pay-muted">💬 Phản hồi: {q.reply}</p>}
            {canManage && q.status === "pending" && (
              <div className="pay-request-actions">
                <button
                  onClick={() => onHandle(q._id, "resolved")}
                  className="pay-link green"
                >
                  ✔ Đã xử lý
                </button>
                <button
                  onClick={() => onHandle(q._id, "rejected")}
                  className="pay-link red"
                >
                  ✖ Từ chối
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cửa sổ sửa lương */}
      {editing && (
        <div className="pay-overlay" onClick={() => setEditing(null)}>
          <div className="pay-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sửa lương: {editing.employeeId?.fullName}</h3>
            <p className="pay-muted">
              Tháng {editing.month} · {editing.totalHours} giờ làm
            </p>
            {editing.status === "finalized" && (
              <p className="warn">
                Phiếu này đã chốt. Sau khi lưu, phiếu sẽ chuyển về Nháp và bạn
                cần bấm "Chốt lương tháng" để chốt lại.
              </p>
            )}
            {FIELDS.map((f) => (
              <label key={f.key}>
                {f.label}
                <input
                  type="number"
                  value={editing[f.key]}
                  onChange={(e) =>
                    setEditing({ ...editing, [f.key]: Number(e.target.value) })
                  }
                  className="pay-input"
                />
              </label>
            ))}
            <label>
              Ghi chú
              <input
                value={editing.note || ""}
                onChange={(e) =>
                  setEditing({ ...editing, note: e.target.value })
                }
                className="pay-input"
              />
            </label>
            <div className="pay-preview">
              Thực nhận dự kiến: <b>{money(preview)}</b>
            </div>
            <div className="pay-modal-actions">
              <button onClick={() => setEditing(null)} className="pay-btn ghost">
                Hủy
              </button>
              <button onClick={onSave} className="pay-btn blue">
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}