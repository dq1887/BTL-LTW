import React, { useState, useEffect } from "react";

interface AdjustmentRecord {
  _id: string;
  requestReason: string;
  status: string;
  proposedIn?: string;
  proposedOut?: string;
}

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<AdjustmentRecord[]>([]);
  const [message, setMessage] = useState("");

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

  const fetchAdjustments = async () => {
    try {
      const res = await fetch(
        "http://localhost:5000/api/attendance-adjustments",
        {
          headers: getHeaders(),
        },
      );
      const result = await res.json();
      if (result.data) {
        setAdjustments(result.data);
      }
    } catch (err) {
      console.error("Lỗi fetch adjustments:", err);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/attendance-adjustments/${id}/approve`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            reviewNote: "Đã xác minh và đồng ý điều chỉnh công",
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi duyệt đơn");
      setMessage(
        "✅ Đã phê duyệt đơn thành công! Bản ghi chấm công đã được cập nhật lại.",
      );
      fetchAdjustments();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setTimeout(() => setMessage(""), 4000);
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
          <span>📋</span> Danh Sách Đề Nghị Sửa Công Chờ Duyệt
        </h2>
      </div>

      {message && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#15803d",
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
              <th style={{ padding: "14px 20px" }}>Lý do đề nghị</th>
              <th style={{ padding: "14px 20px" }}>Giờ vào đề xuất</th>
              <th style={{ padding: "14px 20px" }}>Giờ ra đề xuất</th>
              <th style={{ padding: "14px 20px" }}>Trạng thái</th>
              <th style={{ padding: "14px 20px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody style={{ color: "#334155" }}>
            {adjustments.length > 0 ? (
              adjustments.map((item) => (
                <tr
                  key={item._id}
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                >
                  <td
                    style={{
                      padding: "14px 20px",
                      fontWeight: "500",
                      color: "#0f172a",
                    }}
                  >
                    {item.requestReason}
                  </td>
                  <td
                    style={{
                      padding: "14px 20px",
                      color: "#2563eb",
                      fontWeight: "500",
                    }}
                  >
                    {item.proposedIn
                      ? new Date(item.proposedIn).toLocaleTimeString("vi-VN", {
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
                    {item.proposedOut
                      ? new Date(item.proposedOut).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--:--"}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        backgroundColor:
                          item.status === "approved" ? "#dcfce7" : "#fef3c7",
                        color:
                          item.status === "approved" ? "#15803d" : "#b45309",
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    {item.status === "pending" ? (
                      <button
                        onClick={() => handleApprove(item._id)}
                        style={{
                          padding: "6px 14px",
                          backgroundColor: "#10b981",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontWeight: "600",
                          fontSize: "13px",
                          cursor: "pointer",
                        }}
                      >
                        Duyệt đơn
                      </button>
                    ) : (
                      <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                        Đã duyệt
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    padding: "36px",
                    color: "#94a3b8",
                  }}
                >
                  Chưa có đơn khiếu nại nào cần duyệt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
