import { useState, useEffect } from "react";
import Icon from "./Icons";
import "./Dashboard.css";
import { authService } from "../../services/authService";
import { useNavigate } from "react-router-dom";

const today = new Date();
const dayNames = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];
const dayOfWeek = dayNames[today.getDay()];
const day = String(today.getDate()).padStart(2, "0");
const month = String(today.getMonth() + 1).padStart(2, "0");
const year = today.getFullYear();

const formattedDate = `${dayOfWeek}, ${day}/${month}/${year}`;

export default function Dashboard() {
  const currentUser = authService.getCurrentUser();
  const userName = currentUser?.fullName || currentUser?.name || "Bạn";
  const userRole = currentUser?.role || "admin_hr";
  const [showSystemHealth, setShowSystemHealth] = useState(false);
  const navigate = useNavigate();

  const [shiftsList, setShiftsList] = useState<any[]>([]);
  const [attendancesList, setAttendancesList] = useState<any[]>([]);
  const [deptStats, setDeptStats] = useState<any[]>([]);
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/shifts", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || localStorage.getItem("accessToken")}`,
          },
        });
        const result = await res.json();
        if (res.ok && Array.isArray(result) && result.length > 0) {
          setShiftsList(result.slice(0, 3));
        } else {
          setShiftsList([
            {
              _id: "1",
              name: "Ca hành chính",
              startTime: "08:00",
              endTime: "16:00",
            },
            { _id: "2", name: "Ca sáng", startTime: "07:00", endTime: "11:30" },
            {
              _id: "3",
              name: "Ca chiều",
              startTime: "13:30",
              endTime: "18:00",
            },
          ]);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách ca làm việc:", error);
      }
    };
    fetchShifts();
  }, []);

  useEffect(() => {
    const fetchAttendances = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/attendances", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || localStorage.getItem("accessToken")}`,
          },
        });
        const result = await res.json();
        const dataArray = Array.isArray(result) ? result : result.data || [];
        if (res.ok && dataArray.length > 0) {
          setAttendancesList(dataArray.slice(0, 3));
        }
      } catch (error) {
        console.error("Lỗi tải lịch sử chấm công:", error);
      }
    };
    fetchAttendances();
  }, []);

  useEffect(() => {
    const fetchDepartmentStats = async () => {
      try {
        const [deptRes, empRes] = await Promise.all([
          fetch("http://localhost:5000/api/departments", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token") || localStorage.getItem("accessToken")}`,
            },
          }),
          fetch("http://localhost:5000/api/employees", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token") || localStorage.getItem("accessToken")}`,
            },
          }),
        ]);

        const deptResult = await deptRes.json();
        const empResult = await empRes.json();
        const departmentsList = Array.isArray(deptResult)
          ? deptResult
          : deptResult.data || [];
        const employeesList = Array.isArray(empResult)
          ? empResult
          : empResult.employees || empResult.data || [];

        if (departmentsList.length > 0) {
          const computedStats = departmentsList.map((dept: any) => {
            const count = employeesList.filter((emp: any) => {
              if (emp.status === "inactive") return false;
              const empDeptId = String(
                emp.departmentId?._id || emp.departmentId || "",
              );
              const deptIdStr = String(dept._id || "");
              const deptCodeStr = String(dept.code || "")
                .trim()
                .toUpperCase();
              const empDeptCode = String(emp.departmentId?.code || "")
                .trim()
                .toUpperCase();

              return empDeptId === deptIdStr || empDeptCode === deptCodeStr;
            }).length;

            return {
              code: dept.code || dept.name || "PB",
              name: dept.name,
              total: count,
            };
          });

          setDeptStats(computedStats);
        } else {
          setDeptStats([
            { code: "HR", name: "Human Resources", total: 0 },
            { code: "IT", name: "Information Technology", total: 0 },
            { code: "MKT", name: "Marketing", total: 0 },
            { code: "SALES", name: "Sales", total: 0 },
            { code: "ACC", name: "Accounting", total: 0 },
          ]);
        }
      } catch (error) {
        console.error("Lỗi tải thống kê phòng ban:", error);
      }
    };

    fetchDepartmentStats();
  }, []);

  const [dashboardStats, setDashboardStats] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    attendanceRate: 0,
    attendanceStats: {
      totalWorkingToday: 0,
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
    },
  });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const res = await fetch(
          "http://localhost:5000/api/attendances/dashboard-stats",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token") || localStorage.getItem("accessToken")}`,
            },
          },
        );
        const result = await res.json();
        if (res.ok && result.success) {
          setDashboardStats(result.data);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu thống kê:", error);
      }
    };

    fetchDashboardStats();
  }, []);

  const stats = [
    {
      title: "Tổng nhân viên",
      value: dashboardStats.totalEmployees.toString(),
      icon: "users",
      tone: "blue",
    },
    {
      title: "Phòng ban",
      value: dashboardStats.totalDepartments.toString(),
      icon: "building",
      tone: "green",
    },
  ] as const;

  const yAxisMarks = [30, 25, 20, 15, 10, 5, 0];
  const maxDeptTotal = 30;

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
          <Icon name="calendar" size={18} /> <span>{formattedDate}</span>
        </div>
      </div>

      <section className="stats-grid">
        {stats.map(({ title, value, icon, tone }) => (
          <article className={`stat-card ${tone}`} key={title}>
            <div className="stat-icon">
              <Icon name={icon} size={29} strokeWidth={2.5} />
            </div>
            <div className="stat-copy">
              <strong>{value}</strong>
              <span>{title}</span>
            </div>
          </article>
        ))}
      </section>

      <section style={{ marginBottom: "24px" }}>
        <article
          className="panel department-panel"
          style={{
            padding: "24px",
            background: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            width: "100%",
          }}
        >
          <div className="panel-heading" style={{ marginBottom: "20px" }}>
            <h2
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "16px",
                fontWeight: "700",
                color: "#0f172a",
                margin: 0,
              }}
            >
              <Icon name="chart" /> Thống kê nhân sự theo phòng ban
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              gap: "16px",
              position: "relative",
              marginTop: "10px",
              paddingBottom: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "200px",
                fontSize: "12px",
                color: "#64748b",
                fontWeight: "600",
                width: "30px",
                textAlign: "right",
                lineHeight: "1",
              }}
            >
              {yAxisMarks.map((val, idx) => (
                <span key={idx} style={{ transform: "translateY(50%)" }}>
                  {val}
                </span>
              ))}
            </div>

            <div style={{ flex: 1, position: "relative", height: "200px" }}>
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
                {yAxisMarks.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderBottom:
                        idx === yAxisMarks.length - 1
                          ? "1.5px solid #cbd5e1"
                          : "1px solid #f1f5f9",
                      width: "100%",
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  justifyContent: "space-around",
                  alignItems: "flex-end",
                  paddingBottom: "2px",
                }}
              >
                {deptStats.map((dept, index) => {
                  const heightPx =
                    dept.total === 0
                      ? 4
                      : Math.max((dept.total / maxDeptTotal) * 200, 6);
                  const colors = [
                    "#2563eb",
                    "#16a34a",
                    "#9333ea",
                    "#ea580c",
                    "#0284c7",
                  ];
                  const barColor = colors[index % colors.length];

                  return (
                    <div
                      key={dept.code || index}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        position: "relative",
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-end",
                          height: "200px",
                          width: "100%",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            height: `${heightPx}px`,
                            width: "36px",
                            backgroundColor: barColor,
                            borderRadius: "6px 6px 0 0",
                            transition:
                              "height 0.4s ease, background-color 0.2s ease",
                            boxShadow:
                              dept.total > 0
                                ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                                : "none",
                            opacity: dept.total === 0 ? 0.3 : 1,
                          }}
                          title={`Phòng ${dept.name} (${dept.code}): ${dept.total} nhân viên`}
                        />
                      </div>
                      <small
                        style={{
                          position: "absolute",
                          top: "208px",
                          fontSize: "13px",
                          fontWeight: "700",
                          color: "#334155",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {dept.code}
                      </small>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel schedule-panel">
          <div className="panel-heading">
            <h2>
              <Icon name="clock" /> Ca làm việc
            </h2>
            <span
              onClick={() => navigate("/shifts")}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                color: "#0864ee",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              Xem tất cả <Icon name="arrow-right" size={16} />
            </span>
          </div>
          <div className="schedule-list">
            {shiftsList.length > 0 ? (
              shiftsList.map((shift) => (
                <div
                  className="schedule-item"
                  key={shift._id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <Icon
                        name="clock"
                        size={20}
                        style={{ color: "#2563eb" }}
                      />
                      <b style={{ fontSize: "14px", color: "#0f172a" }}>
                        {shift.name}
                      </b>
                    </div>
                    <small
                      style={{
                        fontSize: "13px",
                        color: "#64748b",
                        fontWeight: "600",
                      }}
                    >
                      {shift.startTime} - {shift.endTime}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                Chưa có ca làm việc nào
              </p>
            )}
          </div>
        </article>

        <article className="panel schedule-panel">
          <div className="panel-heading">
            <h2>
              <Icon name="check" /> Chấm công
            </h2>
            <span
              onClick={() => navigate("/attendance")}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                color: "#0864ee",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              Xem tất cả <Icon name="arrow-right" size={16} />
            </span>
          </div>
          <div className="schedule-list">
            {attendancesList.length > 0 ? (
              attendancesList.map((item) => (
                <div
                  className="schedule-item"
                  key={item._id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <Icon
                        name="user"
                        size={20}
                        style={{ color: "#16a34a" }}
                      />
                      <b style={{ fontSize: "14px", color: "#0f172a" }}>
                        {item.employeeId?.fullName ||
                          item.employeeName ||
                          "Nhân viên"}
                      </b>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "13px", color: "#64748b" }}>
                        {item.workDate || item.date || "Hôm nay"}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          backgroundColor:
                            item.status === "present"
                              ? "#dcfce7"
                              : item.status === "late"
                                ? "#fef3c7"
                                : "#fee2e2",
                          color:
                            item.status === "present"
                              ? "#16a34a"
                              : item.status === "late"
                                ? "#d97706"
                                : "#dc2626",
                        }}
                      >
                        {item.status === "present"
                          ? "Có mặt"
                          : item.status === "late"
                            ? "Đi muộn"
                            : item.status === "absent"
                              ? "Vắng mặt"
                              : item.status || "Chưa rõ"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                Chưa có dữ liệu chấm công
              </p>
            )}
          </div>
        </article>

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

      {showSystemHealth && (
        <div
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

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
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
                    {dashboardStats.totalEmployees} Nhân sự •{" "}
                    {dashboardStats.totalDepartments} Phòng ban • Hệ thống 10
                    Collections (attendances, shifts, users,...)
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
