import { useState, useEffect } from "react";
import "./Schedules.css"; // Tùy chỉnh CSS thuần ở bước dưới

interface Schedule {
  _id: string;
  employeeId: {
    _id: string;
    fullName: string;
    employeeCode: string;
    role: string;
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

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Giả lập thông tin user đang đăng nhập (hoặc lấy từ localStorage/Redux)
  // Phân quyền: chỉ admin_hr mới được Publish/Thêm/Xóa
  const currentUserRole = "admin_hr"; // Thử đổi thành "employee" để test chặn quyền

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/schedules", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!res.ok)
        throw new Error("Không thể tải dữ liệu lịch phân ca từ server!");
      const data = await res.json();
      setSchedules(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch dữ liệu từ Backend API
  useEffect(() => {
    fetchSchedules();
  }, []);

  // Hành động Publish lịch (Chỉ admin/hr mới gọi được API này)
  const handlePublish = async (id: string) => {
    if (currentUserRole !== "admin_hr") {
      alert("Bạn không có quyền thực hiện thao tác này!");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:5000/api/schedules/${id}/publish`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        },
      );
      if (!res.ok) throw new Error("Công bố lịch thất bại!");

      // Cập nhật lại state trực tiếp trên giao diện
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
          <button
            className="btn-primary"
            onClick={() => alert("Mở modal thêm ca mới")}
          >
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
                      {item.employeeId?.role}
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
                      <button
                        className="btn-publish"
                        onClick={() => handlePublish(item._id)}
                        title="Công bố lịch để nhân viên xem"
                      >
                        Publish
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
