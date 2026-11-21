import { useState, useEffect } from "react";
import Icon from "../components/layouts/Icons";

interface EmployeeInfo {
  _id?: string;
  fullName?: string;
  employeeCode?: string;
  position?: string;
}

interface AttendanceRecord {
  _id: string;
  employeeId?: EmployeeInfo;
  workDate: string;
  checkInAt?: string;
  checkOutAt?: string;
  minutesWorked: number;
  workCredit: number;
  overtimeCredit: number;
  status: string;
}

export default function AttendancePage() {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isManagerOrAdmin =
    currentUser?.role === "admin_hr" || currentUser?.role === "manager";

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

      if (!res.ok) {
        if (
          result.message?.includes("Token") ||
          result.message?.includes("hết hạn")
        ) {
          localStorage.clear();
          window.location.href = "/login";
          return;
        }
        throw new Error(result.message);
      }

      if (result.data) {
        setAttendances(result.data);
      }
    } catch (err: any) {
      console.error("Lỗi fetch attendances:", err);
      setMessage(`❌ ${err.message || "Lỗi tải dữ liệu"}`);
    }
  };

  useEffect(() => {
    fetchAttendances();
  }, []);

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
      setMessage(`✅ ${data.message || "Vào ca thành công!"}`);
      fetchAttendances();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "http://localhost:5000/api/attendances/check-out",
        {
          method: "POST",
          headers: getHeaders(),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi check-out");
      setMessage(
        `✅ ${data.message || "Tan ca thành công! Ca làm đã được chốt giờ."}`,
      );
      fetchAttendances();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  const isErrorMessage = message.startsWith("❌");

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
            backgroundColor: isErrorMessage ? "#fef2f2" : "#eff6ff",
            border: `1px solid ${isErrorMessage ? "#fecaca" : "#bfdbfe"}`,
            color: isErrorMessage ? "#b91c1c" : "#1d4ed8",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          {message}
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
              {isManagerOrAdmin && (
                <th style={{ padding: "14px 20px" }}>Nhân viên</th>
              )}
              <th style={{ padding: "14px 20px" }}>Giờ bắt đầu</th>
              <th style={{ padding: "14px 20px" }}>Giờ kết thúc</th>
              <th style={{ padding: "14px 20px" }}>Thời gian làm</th>
              <th style={{ padding: "14px 20px" }}>Công chuẩn</th>
              <th style={{ padding: "14px 20px" }}>Công thêm</th>
              <th style={{ padding: "14px 20px" }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody style={{ color: "#334155" }}>
            {attendances.length > 0 ? (
              attendances.map((att) => (
                <tr key={att._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
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
                      color: "#2563eb",
                    }}
                  >
                    {att.checkInAt ? (
                      <>
                        <span style={{ fontWeight: "700", fontSize: "15px" }}>
                          {new Date(att.checkInAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <br />
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          {att.workDate}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>--:--</span>
                    )}
                  </td>

                  <td
                    style={{
                      padding: "14px 20px",
                      color: "#059669",
                    }}
                  >
                    {att.checkOutAt ? (
                      <>
                        <span style={{ fontWeight: "700", fontSize: "15px" }}>
                          {new Date(att.checkOutAt).toLocaleTimeString(
                            "vi-VN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                        <br />
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          {att.workDate}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>--:--</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    {att.minutesWorked || 0} phút
                  </td>

                  <td style={{ padding: "14px 20px", fontWeight: "700" }}>
                    <span style={{ color: "#0f172a" }}>
                      {att.workCredit !== undefined && att.workCredit !== null
                        ? att.workCredit
                        : 0}
                    </span>
                  </td>

                  <td style={{ padding: "14px 20px" }}>
                    {att.overtimeCredit && att.overtimeCredit > 0 ? (
                      <span style={{ color: "#16a34a", fontWeight: "bold" }}>
                        +{att.overtimeCredit}
                      </span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>0</span>
                    )}
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
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={isManagerOrAdmin ? 7 : 6}
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
