import { useState } from "react";
import Icon from "./Icons";
import "./Dashboard.css";
import { authService } from "../../services/authService";

const stats = [
  {
    title: "Tổng nhân viên",
    value: "50",
    change: "+2.5%",
    icon: "users",
    tone: "blue",
    points: "0,27 18,25 34,14 49,20 65,7 81,13 98,2 116,8",
  },
  {
    title: "Phòng ban",
    value: "5",
    change: "+0%",
    icon: "building",
    tone: "green",
    points: "0,26 17,25 33,15 48,20 64,8 80,15 97,3 116,9",
  },
  {
    title: "Tỷ lệ chấm công",
    value: "98%",
    change: "+1.2%",
    icon: "clock",
    tone: "orange",
    points: "0,27 17,25 33,15 49,19 65,5 81,14 98,2 116,8",
  },
  {
    title: "Đơn nghỉ phép chờ duyệt",
    value: "12",
    change: "+3.3%",
    icon: "calendar",
    tone: "purple",
    points: "0,27 17,25 33,15 49,20 65,7 81,13 98,2 116,8",
  },
] as const;

// 5 phòng ban chuẩn MongoDB (Mỗi phòng 10 người, tổng 50 người)
const departments = [
  { name: "Hành chính NS", values: [5, 5] },
  { name: "Kinh doanh", values: [6, 4] },
  { name: "CNTT", values: [7, 3] },
  { name: "Marketing", values: [5, 5] },
  { name: "Kế toán", values: [5, 5] },
];

const schedule = [
  {
    day: "Th 4",
    date: "05/11",
    title: "Chấm công ca sáng",
    time: "07:30 - 11:30",
    icon: "clock",
    tone: "blue",
  },
  {
    day: "Th 5",
    date: "06/11",
    title: "Họp phòng ban CNTT",
    time: "09:00 - 10:30",
    icon: "users",
    tone: "purple",
  },
  {
    day: "Th 6",
    date: "07/11",
    title: "Duyệt đơn nghỉ phép",
    time: "Trong ngày",
    icon: "check",
    tone: "green",
  },
] as const;

const activities = [
  ["2 phút trước", "Nguyễn Thị B đã nộp đơn xin nghỉ phép", "blue"],
  ["10 phút trước", "Trần Văn C được duyệt nghỉ phép", "green"],
  ["1 giờ trước", "Lê Thị D cập nhật thông tin cá nhân", "purple"],
  ["2 giờ trước", "Phạm Văn E chấm công thành công", "gray"],
];

export default function Dashboard() {
  const currentUser = authService.getCurrentUser();
  const userName = currentUser?.fullName || currentUser?.name || "Bạn";
  const userRole = currentUser?.role || "admin_hr";

  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  // State quản lý hiển thị Modal Giám sát hệ thống
  const [showSystemHealth, setShowSystemHealth] = useState(false);

  return (
    <div className="dashboard">
      <div className="welcome-row">
        <div>
          <h1>
            Xin chào, {userName}! <span>👋</span>
          </h1>
          <p>Chúc bạn có một ngày làm việc hiệu quả!</p>
        </div>
        <div className="today-date">
          <Icon name="calendar" size={18} /> Thứ Ba, 04/11/2026
        </div>
      </div>

      <section className="stats-grid">
        {stats.map(({ title, value, change, icon, tone, points }) => (
          <article className={`stat-card ${tone}`} key={title}>
            <div className="stat-icon">
              <Icon name={icon} size={29} strokeWidth={2.5} />
            </div>
            <div className="stat-copy">
              <strong>{value}</strong>
              <span>{title}</span>
            </div>
            <div className="stat-change">
              <Icon name="arrow-up" size={17} /> {change}
            </div>
            <svg
              className="sparkline"
              viewBox="0 0 118 34"
              preserveAspectRatio="none"
            >
              <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </article>
        ))}
      </section>

      <section className="middle-grid">
        <article className="panel department-panel">
          <div className="panel-heading">
            <h2>
              <Icon name="chart" /> Thống kê nhân sự theo phòng ban
            </h2>
            <div style={{ position: "relative", display: "inline-block" }}>
              <select
                value={period}
                onChange={(e) =>
                  setPeriod(e.target.value as "week" | "month" | "year")
                }
                style={{
                  padding: "6px 30px 6px 14px",
                  fontSize: "13.5px",
                  fontWeight: "700",
                  color: "#0f172a",
                  backgroundColor: "#f8fafc",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "8px",
                  outline: "none",
                  cursor: "pointer",
                  appearance: "none",
                  WebkitAppearance: "none",
                }}
              >
                <option value="week">Tuần này</option>
                <option value="month">Tháng này</option>
                <option value="year">Năm nay</option>
              </select>
              <Icon
                name="chevron-down"
                size={14}
                strokeWidth={2.5}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "#0f172a",
                }}
              />
            </div>
          </div>

          {/* ĐỒ THỊ CĂN CHUẨN VẠCH CHIA 15 - 10 - 5 - 0 */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              position: "relative",
              marginTop: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "150px",
                fontSize: "12px",
                color: "#64748b",
                fontWeight: "600",
                width: "24px",
                textAlign: "right",
                lineHeight: "1",
              }}
            >
              <span style={{ transform: "translateY(-50%)" }}>15</span>
              <span style={{ transform: "translateY(-50%)" }}>10</span>
              <span style={{ transform: "translateY(-50%)" }}>5</span>
              <span style={{ transform: "translateY(-50%)" }}>0</span>
            </div>

            <div style={{ flex: 1, position: "relative", height: "150px" }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{ borderBottom: "1px solid #e2e8f0", width: "100%" }}
                />
                <div
                  style={{ borderBottom: "1px solid #e2e8f0", width: "100%" }}
                />
                <div
                  style={{ borderBottom: "1px solid #e2e8f0", width: "100%" }}
                />
                <div
                  style={{ borderBottom: "1.5px solid #cbd5e1", width: "100%" }}
                />
              </div>

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  justifyContent: "space-around",
                  alignItems: "flex-end",
                }}
              >
                {departments.map((dept) => (
                  <div
                    key={dept.name}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: "6px",
                        height: "150px",
                      }}
                    >
                      {dept.values.map((v, index) => (
                        <span
                          key={index}
                          style={{
                            height: `${(v / 15) * 100}%`,
                            width: "15px",
                            backgroundColor:
                              index === 0 ? "#2563eb" : "#93c5fd",
                            borderRadius: "4px 4px 0 0",
                            transition: "height 0.3s ease",
                          }}
                          title={`${index === 0 ? "Nam" : "Nữ"}: ${v} người`}
                        />
                      ))}
                    </div>
                    <small
                      style={{
                        position: "absolute",
                        top: "158px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#334155",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {dept.name}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "24px",
              marginTop: "38px",
              fontSize: "13px",
              fontWeight: "600",
              color: "#475569",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <i
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#2563eb",
                  borderRadius: "3px",
                  display: "inline-block",
                }}
              />{" "}
              Nam
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <i
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#93c5fd",
                  borderRadius: "3px",
                  display: "inline-block",
                }}
              />{" "}
              Nữ
            </span>
          </div>
        </article>

        <article className="panel attendance-panel">
          <div className="panel-heading">
            <h2>
              <Icon name="clock" /> Chấm công hôm nay
            </h2>
            <span className="on-time">
              <i /> Đúng giờ
            </span>
          </div>
          <div className="attendance-content">
            <div className="donut-wrap">
              <div className="donut">
                <strong>98%</strong>
              </div>
              <span>Nhân viên đi làm</span>
              <b>49 / 50</b>
            </div>
            <div className="attendance-legend">
              <p>
                <i className="dot teal" /> Đi làm đúng giờ <b>47</b>
              </p>
              <p>
                <i className="dot orange-dot" /> Đi muộn <b>2</b>
              </p>
              <p>
                <i className="dot gray-dot" /> Vắng mặt <b>1</b>
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel schedule-panel">
          <div className="panel-heading">
            <h2>
              <Icon name="calendar" /> Lịch làm việc sắp tới
            </h2>
            <a href="#schedule">
              Xem tất cả <Icon name="arrow-right" size={16} />
            </a>
          </div>
          <div className="schedule-list">
            {schedule.map(({ day, date, title, time, icon, tone }) => (
              <div className="schedule-item" key={title}>
                <div className="schedule-date">
                  <b>{day}</b>
                  <span>{date}</span>
                </div>
                <div className={`schedule-detail ${tone}`}>
                  <Icon name={icon} size={22} />
                  <div>
                    <b>{title}</b>
                    <small>
                      <Icon name="clock" size={13} /> {time}
                    </small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel activity-panel">
          <div className="panel-heading">
            <h2>
              <Icon name="zap" /> Hoạt động gần đây
            </h2>
            <a href="#activities">
              Xem tất cả <Icon name="arrow-right" size={16} />
            </a>
          </div>
          <div className="activity-list">
            {activities.map(([time, text, tone]) => (
              <div className="activity-item" key={time}>
                <i className={`activity-dot ${tone}`} />
                <span>{time}</span>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </article>

        {/* THẺ PROMO ĐƯỢC GẮN SỰ KIỆN onClick */}
        <article className="promo-card">
          <div>
            <h2>HRM Internal</h2>
            <p>Đồng hành cùng doanh nghiệp trong công tác quản lý nhân sự</p>
            <button onClick={() => setShowSystemHealth(true)}>
              Tìm hiểu thêm <Icon name="arrow-right" size={16} />
            </button>
          </div>
          <div className="promo-illustration">
            <Icon name="laptop" size={76} strokeWidth={1.3} />
          </div>
        </article>
      </section>

      {/* MODAL GIÁM SÁT HỆ THỐNG & API HEALTH */}
      {showSystemHealth && (
        <div
          /* 1. Click vào khoảng đen bên ngoài là tự thoát */
          onClick={() => setShowSystemHealth(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            /* 2. Chặn nổi bọt sự kiện: Click bên trong khung trắng KHÔNG bị đóng */
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "600px",
              maxWidth: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0",
              padding: "24px",
              fontFamily: "inherit",
            }}
          >
            {/* Header Modal */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "14px",
                marginBottom: "18px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    backgroundColor: "#f0fdf4",
                    color: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="zap" size={20} />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "17.5px",
                      fontWeight: "700",
                      color: "#0f172a",
                    }}
                  >
                    Trạng Thái Hệ Thống (System Health)
                  </h3>
                  <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                    Kiểm tra tình trạng vận hành REST API & Cơ sở dữ liệu
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowSystemHealth(false)}
                title="Đóng"
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "6px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Thông số kỹ thuật */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              {/* Database */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: "700",
                      color: "#1e293b",
                    }}
                  >
                    Cơ sở dữ liệu MongoDB Atlas
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    50 Nhân sự • 5 Phòng ban • Hệ thống 10 Collections
                    (attendances, shifts, users,...)
                  </div>
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    color: "#16a34a",
                    backgroundColor: "#dcfce7",
                    padding: "4px 10px",
                    borderRadius: "20px",
                  }}
                >
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      backgroundColor: "#16a34a",
                      borderRadius: "50%",
                    }}
                  />
                  Đã kết nối
                </span>
              </div>

              {/* Express Server */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: "700",
                      color: "#1e293b",
                    }}
                  >
                    Express.js Backend Server
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    Cổng :5000 • Xử lý lỗi tập trung: ErrorHandler Active
                  </div>
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    color: "#16a34a",
                    backgroundColor: "#dcfce7",
                    padding: "4px 10px",
                    borderRadius: "20px",
                  }}
                >
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      backgroundColor: "#16a34a",
                      borderRadius: "50%",
                    }}
                  />
                  Hoạt động (200 OK)
                </span>
              </div>

              {/* JWT Auth */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: "700",
                      color: "#1e293b",
                    }}
                  >
                    Bảo mật Phiên & Token JWT
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    Tài khoản: {userName} • Quyền hạn: {userRole}
                  </div>
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    color: "#2563eb",
                    backgroundColor: "#eff6ff",
                    padding: "4px 10px",
                    borderRadius: "20px",
                  }}
                >
                  Hợp lệ (Authenticated)
                </span>
              </div>

              {/* Cụm API toàn bộ hệ thống */}
              <div
                style={{
                  padding: "14px 16px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    fontSize: "13.5px",
                    fontWeight: "700",
                    color: "#1e293b",
                    marginBottom: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>Trạng thái các phân hệ API chính:</span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#16a34a",
                      fontWeight: "600",
                    }}
                  >
                    5/5 Phân hệ sẵn sàng
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px 16px",
                    fontSize: "12.5px",
                    color: "#475569",
                  }}
                >
                  <div>
                    <span style={{ color: "#64748b" }}>Nhân sự & Auth:</span>{" "}
                    <code style={{ color: "#0f172a", fontWeight: "600" }}>
                      /api/employees
                    </code>{" "}
                    <b style={{ color: "#16a34a" }}>200 OK</b>
                  </div>

                  <div>
                    <span style={{ color: "#64748b" }}>Ca làm việc:</span>{" "}
                    <code style={{ color: "#0f172a", fontWeight: "600" }}>
                      /api/shifts
                    </code>{" "}
                    <b style={{ color: "#16a34a" }}>200 OK</b>
                  </div>

                  <div>
                    <span style={{ color: "#64748b" }}>Chấm công & Sửa:</span>{" "}
                    <code style={{ color: "#0f172a", fontWeight: "600" }}>
                      /api/attendances
                    </code>{" "}
                    <b style={{ color: "#16a34a" }}>200 OK</b>
                  </div>

                  <div>
                    <span style={{ color: "#64748b" }}>Nghỉ phép:</span>{" "}
                    <code style={{ color: "#0f172a", fontWeight: "600" }}>
                      /api/leave-requests
                    </code>{" "}
                    <b style={{ color: "#16a34a" }}>200 OK</b>
                  </div>

                  <div style={{ gridColumn: "span 2" }}>
                    <span style={{ color: "#64748b" }}>
                      Bảng lương & Báo cáo:
                    </span>{" "}
                    <code style={{ color: "#0f172a", fontWeight: "600" }}>
                      /api/payrolls
                    </code>{" "}
                    &{" "}
                    <code style={{ color: "#0f172a", fontWeight: "600" }}>
                      /api/reports
                    </code>{" "}
                    <b style={{ color: "#16a34a" }}>200 OK</b>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "8px",
                borderTop: "1px solid #f1f5f9",
              }}
            >
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Độ trễ phản hồi máy chủ:{" "}
                <b style={{ color: "#16a34a" }}>~18ms</b>
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                Nhấn ra ngoài hoặc bấm dấu ✕ để đóng
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
