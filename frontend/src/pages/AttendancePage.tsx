import React, { useState, useEffect } from "react";
import Icon from "../components/layouts/Icons";

interface EmployeeInfo {
  _id?: string;
  fullName?: string;
  employeeCode?: string;
  position?: string;
}

interface AttendanceRecord {
  _id: string;
  employeeId?: EmployeeInfo; // Nhận thông tin nhân viên từ backend populate
  workDate: string;
  checkInAt?: string;
  checkOutAt?: string;
  minutesWorked: number;
  workCredit: number;
  status: string;
}

export default function AttendancePage() {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedAttId, setSelectedAttId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  // Kiểm tra quyền từ tài khoản đang đăng nhập
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isManagerOrAdmin =
    currentUser?.role === "admin_hr" ||
    (currentUser?.position || "").toLowerCase().includes("trưởng phòng") ||
    (currentUser?.position || "").toLowerCase().includes("leader") ||
    (currentUser?.position || "").toLowerCase().includes("giám đốc");

  const getHeaders = () => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      "";
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchAttendances = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/attendances", {
        headers: getHeaders(),
      });
      const result = await res.json();
      if (result.data) {
        setAttendances(result.data);
      }
    } catch (err) {
      console.error("Lỗi fetch attendances:", err);
    }
  };

  useEffect(() => {
    fetchAttendances();
  }, []);

  // 1. Check-in (Vào ca)
  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "http://localhost:5000/api/attendances/check-in",
        {
          method: "POST",
          headers: getHeaders(),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi check-in");
      setMessage("✅ Check-in thành công!");
      fetchAttendances();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  // 2. Check-out (Tan ca)
  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const todayRecord = attendances.find((a) => a.workDate === todayStr);

      const targetId = todayRecord
        ? todayRecord._id
        : attendances[0]?._id || "current";
      const res = await fetch(
        `http://localhost:5000/api/attendances/${targetId}/check-out`,
        {
          method: "POST",
          headers: getHeaders(),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi check-out");
      setMessage("✅ Check-out thành công! Đã tính số phút & quy đổi công.");
      fetchAttendances();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  // 3. Gửi khiếu nại (Đề nghị sửa công)
  const handleSendAdjustment = async () => {
    if (!selectedAttId || !reason) return;
    try {
      const res = await fetch(
        "http://localhost:5000/api/attendance-adjustments",
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            attendanceId: selectedAttId,
            requestReason: reason,
            proposedIn: new Date().setHours(8, 0, 0, 0),
            proposedOut: new Date().setHours(17, 0, 0, 0),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi gửi đề nghị");
      alert("Đã gửi đơn khiếu nại thành công sang trạng thái pending!");
      setSelectedAttId(null);
      setReason("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div
      className="page-content"
      style={{
        fontFamily: "inherit",
        width: "100%",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#1e293b",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>⏱️</span> Bảng Chấm Công Thời Gian Thực
        </h2>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleCheckIn}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 18px",
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <Icon name="check" size={16} /> Vào ca
          </button>
          <button
            onClick={handleCheckOut}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 18px",
              backgroundColor: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <Icon name="clock" size={16} /> Tan ca
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1d4ed8",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          {message}
        </div>
      )}

      {/* Modal khiếu nại */}
      {selectedAttId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "12px",
              width: "420px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>
              Gửi đề nghị sửa công
            </h3>
            <textarea
              rows={3}
              placeholder="Nhập lý do giải trình (ví dụ: Quên bấm máy chấm công do đi công tác)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                boxSizing: "border-box",
                marginBottom: "16px",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                onClick={() => setSelectedAttId(null)}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleSendAdjustment}
                style={{
                  padding: "8px 16px",
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Gửi đề nghị
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
            textAlign: "left",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                color: "#64748b",
                fontWeight: "600",
              }}
            >
              {/* Cột Nhân viên hiển thị riêng cho Admin hoặc Trưởng phòng */}
              {isManagerOrAdmin && (
                <th style={{ padding: "14px 20px" }}>Nhân viên</th>
              )}
              <th style={{ padding: "14px 20px" }}>Ngày làm việc</th>
              <th style={{ padding: "14px 20px" }}>Giờ bắt đầu</th>
              <th style={{ padding: "14px 20px" }}>Giờ kết thúc</th>
              <th style={{ padding: "14px 20px" }}>Thời gian làm</th>
              <th style={{ padding: "14px 20px" }}>Công chuẩn</th>
              <th style={{ padding: "14px 20px" }}>Trạng thái</th>
              <th style={{ padding: "14px 20px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody style={{ color: "#334155" }}>
            {attendances.length > 0 ? (
              attendances.map((att) => (
                <tr key={att._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  {/* Ô thông tin nhân viên cho Quản lý / Admin */}
                  {isManagerOrAdmin && (
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>
                        {att.employeeId?.fullName || "—"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {att.employeeId?.employeeCode || ""}
                        {att.employeeId?.position
                          ? ` • ${att.employeeId.position}`
                          : ""}
                      </div>
                    </td>
                  )}
                  <td
                    style={{
                      padding: "14px 20px",
                      fontWeight: "600",
                      color: "#0f172a",
                    }}
                  >
                    {att.workDate}
                  </td>
                  <td
                    style={{
                      padding: "14px 20px",
                      color: "#2563eb",
                      fontWeight: "500",
                    }}
                  >
                    {att.checkInAt
                      ? new Date(att.checkInAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--:--"}
                  </td>
                  <td
                    style={{
                      padding: "14px 20px",
                      color: "#059669",
                      fontWeight: "500",
                    }}
                  >
                    {att.checkOutAt
                      ? new Date(att.checkOutAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--:--"}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    {att.minutesWorked || 0} phút
                  </td>
                  <td style={{ padding: "14px 20px", fontWeight: "700" }}>
                    <span
                      style={{
                        color: att.workCredit > 1 ? "#16a34a" : "#0f172a",
                      }}
                    >
                      {att.workCredit}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        backgroundColor:
                          att.status === "present" ? "#dcfce7" : "#fee2e2",
                        color: att.status === "present" ? "#15803d" : "#b91c1c",
                      }}
                    >
                      {att.status === "present"
                        ? "Có mặt"
                        : att.status === "late"
                          ? "Đi muộn"
                          : "Vắng mặt"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <button
                      onClick={() => setSelectedAttId(att._id)}
                      style={{
                        padding: "6px 12px",
                        fontSize: "13px",
                        backgroundColor: "#f1f5f9",
                        color: "#475569",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "500",
                      }}
                    >
                      Khiếu nại
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={isManagerOrAdmin ? 8 : 7}
                  style={{
                    textAlign: "center",
                    padding: "36px",
                    color: "#94a3b8",
                  }}
                >
                  Chưa có dữ liệu chấm công.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
