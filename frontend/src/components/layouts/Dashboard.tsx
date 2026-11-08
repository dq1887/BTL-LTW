import Icon from "./Icons";
import "./Dashboard.css";
import { authService } from "../../services/authService";

const stats = [
  {
    title: "Tổng nhân viên",
    value: "128",
    change: "+2.5%",
    icon: "users",
    tone: "blue",
    points: "0,27 18,25 34,14 49,20 65,7 81,13 98,2 116,8",
  },
  {
    title: "Phòng ban",
    value: "8",
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

const departments = [
  { name: "Kỹ thuật", values: [23, 17, 18] },
  { name: "Kinh doanh", values: [26, 16, 22] },
  { name: "Marketing", values: [24, 15, 18] },
  { name: "Tài chính", values: [30, 25, 21] },
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
    title: "Họp phòng ban Kỹ thuật",
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
            <button className="period-select">
              Tháng này <Icon name="chevron-down" size={16} />
            </button>
          </div>
          <div className="chart-area">
            <div className="y-labels">
              <span>40</span>
              <span>30</span>
              <span>20</span>
              <span>10</span>
              <span>0</span>
            </div>
            <div className="chart-main">
              <div className="chart-grid-lines">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="bar-groups">
                {departments.map((dept) => (
                  <div className="bar-group" key={dept.name}>
                    <div className="bars">
                      {dept.values.map((v, index) => (
                        <span
                          key={index}
                          className={`bar bar-${index}`}
                          style={{ height: `${v * 5.5}px` }}
                        />
                      ))}
                    </div>
                    <small>{dept.name}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="chart-legend">
              <span>
                <i className="legend-blue" /> Nam
              </span>
              <span>
                <i className="legend-light" /> Nữ
              </span>
            </div>
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
              <b>125 / 128</b>
            </div>
            <div className="attendance-legend">
              <p>
                <i className="dot teal" /> Đi làm đúng giờ <b>125</b>
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

        <article className="promo-card">
          <div>
            <h2>HRM Internal</h2>
            <p>Đồng hành cùng doanh nghiệp trong công tác quản lý nhân sự</p>
            <button>
              Tìm hiểu thêm <Icon name="arrow-right" size={16} />
            </button>
          </div>
          <div className="promo-illustration">
            <Icon name="laptop" size={76} strokeWidth={1.3} />
          </div>
        </article>
      </section>
    </div>
  );
}
