# BÀI TẬP LỚN MÔN LẬP TRÌNH WEB
# DỰ ÁN HRM INTERNAL - HỆ THỐNG QUẢN LÝ NHÂN SỰ & CHẤM CÔNG NỘI BỘ

> **Học phần:** Lập trình Web  
> **Quy mô:** Nhóm 5 thành viên (Mô hình Fullstack khép kín 5 Module nghiệp vụ)

### Thành viên nhóm thực hiện

| STT | Họ và tên | Mã sinh viên | Module / Vai trò phụ trách |
| :---: | :--- | :--- | :--- |
| 1 | Dương Hoài Nam | B25DCCC150 | Auth, Nhân sự & Phòng ban |
| 2 | Đỗ Vũ Hồng Quân | B25DCCC198 | Ca làm việc & Lịch phân ca |
| 3 | Vũ Tuấn Minh | B25DCCC144 | Chấm công & Dashboard|
| 4 | Đồng Mạnh Cường | B25DCCC048 | Quản lý nghỉ phép |
| 5 | Phạm Thành Đạt | B25DCCC288 | Tính lương & Bảng lương |

---

## 1. TỔNG QUAN DỰ ÁN

**HRM Internal** là hệ thống phần mềm quản trị nguồn nhân lực (Human Resource Management) được xây dựng theo kiến trúc Web Fullstack hiện đại. Dự án giải quyết bài toán số hóa quy trình quản trị nhân sự nội bộ cho doanh nghiệp vừa và nhỏ (SME): từ quản lý hồ sơ, luân chuyển phòng ban, phân công ca làm việc, chấm công - nghỉ phép trực tuyến cho đến tổng hợp công nợ và tự động tính bảng lương.

Hệ thống được thiết kế hướng tới trải nghiệm người dùng mượt mà, phân quyền vai trò (Role-Based Access Control) chặt chẽ, tối ưu hóa giao diện đa chế độ (Sáng / Tối - Dark Mode) cùng hệ thống UI Component tùy biến cao cấp.

---

## 2. CÁC CHỨC NĂNG CHÍNH

Hệ thống tích hợp chặt chẽ 7 phân hệ cốt lõi với luồng dữ liệu liên thông hoàn chỉnh:

1. **Xác thực & Phân quyền (Authentication & RBAC):**
   - Đăng nhập bảo mật qua JWT (JSON Web Token), hỗ trợ đối chiếu mật khẩu băm `bcrypt` và tài khoản thử nghiệm nhanh 1-click.
   - Phân quyền 3 cấp độ: **Quản trị viên Nhân sự (Admin HR)**, **Trưởng phòng / Quản lý (Manager)** và **Nhân viên (Employee)**.
   - Bảo vệ route nghiêm ngặt (`ProtectedRoute`), menu điều hướng theo quyền hạn, modal xác nhận đăng xuất chuyên nghiệp dùng React Portal.

2. **Quản lý Nhân sự & Hồ sơ (Employees Management):**
   - Danh sách nhân sự trực quan: Mã NV, Họ tên, Chức vụ, Email/SĐT, Phòng ban, Trạng thái hoạt động.
   - Tìm kiếm thời gian thực (Live Search) theo tên/mã/chức vụ; lọc nâng cao theo Phòng ban và Trạng thái.
   - Thêm mới nhân sự, chỉnh sửa thông tin, điều chuyển phòng ban linh hoạt với xác thực dữ liệu chặt chẽ.
   - Cơ chế **Xóa mềm (Soft Delete)**: Chuyển nhân viên sang `inactive` để giữ toàn vẹn lịch sử lương/chấm công; hỗ trợ khôi phục kích hoạt lại tài khoản.

3. **Quản lý Phòng ban & Cơ cấu tổ chức (Departments):**
   - Bố cục Master-Detail trực quan: Danh sách phòng ban bên trái và chi tiết thành viên bên phải.
   - Thống kê tự động quân số thực tế của từng phòng ban (chỉ tính nhân viên `active`).
   - Tạo mới, chỉnh sửa thông tin phòng ban, chặn xóa phòng ban nếu còn nhân sự trực thuộc.

4. **Quản lý Ca & Lịch phân ca (Shifts & Schedules):**
   - Thiết lập danh mục ca làm việc: Ca sáng, ca chiều, ca hành chính (tên ca, giờ bắt đầu, giờ kết thúc).
   - Bảng phân ca làm việc chi tiết theo từng ngày/tuần cho từng nhân viên (`WorkSchedule`).
   - Điều hướng lịch trực quan theo tuần (Thứ Hai đến Chủ Nhật) và công cụ phân ca nhanh.

5. **Quản lý Chấm công & Điểm danh (Attendance):**
   - Nhân viên điểm danh Check-in / Check-out theo thời gian thực.
   - Tự động đối chiếu ca làm việc, tính toán giờ làm thực tế, phát hiện đi muộn / về sớm.
   - Thống kê tổng quan tỷ lệ đi làm theo ngày/tháng ngay trên trang Dashboard.

6. **Quản lý Nghỉ phép (Leave Requests):**
   - Đa dạng loại nghỉ phép: Nghỉ phép năm (có lương), nghỉ ốm, việc riêng, thai sản.
   - Tra cứu tự động ngày có ca làm việc thực tế trong khoảng xin nghỉ trước khi nộp đơn.
   - Luồng xét duyệt thông minh: Trưởng phòng duyệt đơn cho nhân viên thuộc phòng mình; Admin HR quản lý toàn công ty; chặn tự duyệt đơn của chính mình.
   - Bảo toàn lịch sử: Chỉ cho phép hủy/xóa các đơn đang chờ duyệt (`pending`).

7. **Bảng lương & Chế độ đãi ngộ (Payroll):**
   - Tự động tổng hợp dữ liệu công chuẩn, số giờ làm thực tế, ngày nghỉ phép hưởng lương.
   - Tính toán lương cơ bản, phụ cấp, các khoản khấu trừ và lương thực nhận (Net Salary).
   - Xuất phiếu lương minh bạch cho từng nhân viên.

---

## 3. CÔNG NGHỆ SỬ DỤNG

### **Frontend (Client-side)**
- **Core:** React 19, TypeScript, Vite 
- **Routing:** React Router DOM v7
- **Giao diện & Trải nghiệm (UI/UX):**
  - Hệ thống CSS3 tùy biến hiện đại, đáp ứng chuẩn Responsive.
  - Hỗ trợ toàn diện **Dark Mode / Light Mode** lưu trữ qua `localStorage` và đồng bộ tức thì.
  - Bộ component tùy biến độc quyền: `CustomSelect` (Dropdown tùy biến cao cấp thay thế thẻ select gốc của OS), `LogoutModal` (React Portal), SVG Icons bộ riêng.
- **Quản lý phiên:** LocalStorage & Auth Service đính kèm Authorization Header Bearer Token.

### **Backend (Server-side)**
- **Môi trường & Framework:** Node.js, Express.js (RESTful API chuẩn hóa theo mô hình MVC)
- **Bảo mật:** JSON Web Token (JWT), `bcryptjs` (băm mật khẩu), CORS middleware
- **Biến môi trường:** `dotenv`

### **Cơ sở dữ liệu (Database)**
- **Database:** MongoDB Atlas (Cloud NoSQL Database)
- **ODM:** Mongoose 9.x (Schema validation, indexing, pre/post hooks, auto timestamps)

---

## 4. CẤU TRÚC THƯ MỤC DỰ ÁN

```text
BTL-LTW/
├── backend/
│   ├── src/
│   │   ├── controllers/         # Bộ điều khiển xử lý nghiệp vụ (Auth, Employee, Dept, Schedule, Shift, Leave, Attendance, Payroll)
│   │   ├── middleware/          # Middleware xác thực JWT & phân quyền vai trò (authMiddleware)
│   │   ├── models/              # Schema Mongoose (User, Employee, Department, Shift, Schedule, LeaveRequest, Attendance, Payroll)
│   │   ├── routes/              # Khai báo Endpoint RESTful API
│   │   └── utils/               # Các hàm tiện ích hỗ trợ tính toán, format
│   ├── scripts/                 # Scripts tiện ích kiểm tra & cập nhật dữ liệu
│   ├── tests/                   # Kịch bản kiểm thử tự động
│   ├── .env                     # Biến môi trường Backend (Port, Mongo URI, JWT Secret)
│   ├── package.json             # Khai báo dependencies Backend
│   └── server.js                # Điểm khởi chạy máy chủ Express
│
├── frontend/
│   ├── public/                  # Tài nguyên tĩnh
│   ├── src/
│   │   ├── components/
│   │   │   └── layouts/         # Layout chung, Header, Sidebar, UserDropdown, LogoutModal, CustomSelect, Icons
│   │   ├── context/             # ThemeContext (Quản lý Dark / Light mode toàn ứng dụng)
│   │   ├── pages/               # Các trang giao diện (Dashboard, Employees, Departments, Shifts, Schedules, Attendance, LeaveRequests, Payroll, Login, Profile)
│   │   ├── services/            # Tầng gọi API qua Fetch/Axios (authService, employeeService, departmentService, shiftService, leaveService...)
│   │   ├── App.tsx              # Cấu hình Routing & ProtectedRoute
│   │   └── main.tsx             # Entry point React
│   ├── index.html               # Trang HTML gốc
│   ├── package.json             # Khai báo dependencies Frontend
│   ├── tsconfig.json            # Cấu hình TypeScript
│   └── vite.config.ts           # Cấu hình Vite
│
├── .gitignore                   # Cấu hình bỏ qua tệp Git
└── README.md                    # Tài liệu hướng dẫn dự án
```

---

## 5. HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN

### **Yêu cầu môi trường:**
- **Node.js:** phiên bản `18.x` hoặc cao hơn
- **npm:** phiên bản `9.x` hoặc cao hơn
- Kết nối Internet (để kết nối MongoDB Atlas)

---

### **Bước 1: Cài đặt Backend**

1. Mở cửa sổ dòng lệnh tại thư mục gốc và di chuyển vào `backend`:
   ```bash
   cd backend
   ```

2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```

3. Cấu hình file biến môi trường `.env` tại thư mục `backend/`:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/EmployeeManagement?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_jwt_key_here
   NODE_ENV=development
   ```

4. Khởi chạy máy chủ Backend:
   ```bash
   npm run dev
   ```
   > Máy chủ chạy tại: `http://localhost:5000`

---

### **Bước 2: Cài đặt Frontend**

1. Mở một cửa sổ dòng lệnh mới và di chuyển vào thư mục `frontend`:
   ```bash
   cd frontend
   ```

2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```

3. Khởi chạy môi trường phát triển:
   ```bash
   npm run dev
   ```
   > Ứng dụng chạy tại: `http://localhost:5173` (hoặc cổng hiển thị trên terminal)

---

### **Bước 3: Tài khoản thử nghiệm (1-Click Demo Accounts)**

Trang Đăng nhập (`/login`) tích hợp sẵn các nút chọn tài khoản mẫu theo từng quyền hạn để dễ dàng kiểm thử:

| Vai trò (Role) | Email đăng nhập | Mật khẩu mặc định | Quyền hạn tiêu biểu |
| :--- | :--- | :--- | :--- |
| **Admin HR** | `nam.duong1@gmail.com` | `123456` | Toàn quyền quản trị nhân sự, cơ cấu phòng ban, phê duyệt nghỉ phép toàn công ty, thiết lập bảng lương |
| **Trưởng phòng (Manager)** | `an.nguyen2@gmail.com` | `123456` | Quản lý thành viên trong phòng ban, duyệt đơn nghỉ phép của nhân viên trực thuộc |
| **Nhân viên (Employee)** | `binh.tran3@gmail.com` | `123456` | Điểm danh chấm công, gửi yêu cầu nghỉ phép, xem lịch làm việc cá nhân, xem phiếu lương |

---

## 6. DANH SÁCH ENDPOINTS API CHÍNH (RESTful API)

Tất cả các endpoint (ngoại trừ login) đều yêu cầu đính kèm Header: `Authorization: Bearer <Token>`.

### **1. Xác thực (Auth)**
- `POST /api/auth/login`: Xác thực thông tin đăng nhập, trả về JWT Token và User profile.
- `PUT /api/auth/change-password`: Đổi mật khẩu tài khoản hiện tại.
- `GET /api/auth/login-history`: Xem lịch sử đăng nhập.

### **2. Nhân viên (Employees)**
- `GET /api/employees`: Lấy danh sách nhân viên (hỗ trợ query tìm kiếm, lọc phòng ban, trạng thái).
- `POST /api/employees`: Thêm mới hồ sơ nhân sự (yêu cầu quyền Admin HR).
- `GET /api/employees/:id`: Xem thông tin chi tiết một nhân viên.
- `PUT /api/employees/:id`: Chỉnh sửa thông tin nhân viên.
- `DELETE /api/employees/:id`: Xóa mềm nhân viên (chuyển trạng thái `inactive`).
- `PATCH /api/employees/:id/restore`: Khôi phục tài khoản nhân viên đã nghỉ việc sang `active`.
- `PATCH /api/employees/:id/transfer`: Điều chuyển phòng ban cho nhân sự.

### **3. Phòng ban (Departments)**
- `GET /api/departments`: Lấy danh sách phòng ban kèm số lượng nhân viên hoạt động.
- `POST /api/departments`: Thêm mới phòng ban.
- `PUT /api/departments/:id`: Cập nhật tên/thông tin phòng ban.
- `DELETE /api/departments/:id`: Xóa phòng ban (ràng buộc kiểm tra không còn nhân sự).

### **4. Ca làm việc & Lịch phân ca (Shifts & Schedules)**
- `GET /api/shifts`: Lấy danh mục các ca làm việc.
- `POST /api/shifts`: Thêm mới ca làm việc.
- `GET /api/schedules`: Lấy lịch phân ca (lọc theo khoảng ngày, phòng ban, nhân viên).
- `POST /api/schedules`: Tạo phân ca làm việc mới.
- `DELETE /api/schedules/:id`: Xóa phân ca làm việc.

### **5. Chấm công (Attendance)**
- `GET /api/attendances`: Lấy bảng chấm công theo ngày/tháng.
- `POST /api/attendances/check-in`: Ghi nhận giờ vào làm.
- `POST /api/attendances/check-out`: Ghi nhận giờ về (hoặc `POST /api/attendances/:id/check-out`).
- `GET /api/attendances/dashboard-stats`: Lấy số liệu thống kê tổng quan cho Dashboard.

### **6. Nghỉ phép (Leave Requests)**
- `GET /api/leave/types`: Lấy danh mục loại nghỉ phép.
- `GET /api/leave/schedule-days`: Xem trước số ngày làm việc thực tế trong khoảng xin nghỉ.
- `GET /api/leave/requests`: Lấy danh sách đơn nghỉ theo phạm vi quyền (Admin / Manager / Employee).
- `POST /api/leave/requests`: Nhân viên tạo đơn xin nghỉ phép.
- `DELETE /api/leave/requests/:id`: Xóa đơn nghỉ phép (chỉ khi đang ở trạng thái `pending`).
- `POST /api/leave/requests/:id/approve`: Quản lý / Admin duyệt đơn nghỉ phép.
- `POST /api/leave/requests/:id/reject`: Quản lý / Admin từ chối đơn nghỉ phép.

### **7. Bảng lương (Payroll)**
- `GET /api/payroll`: Lấy danh sách bảng lương theo kỳ.
- `POST /api/payroll/finalize`: Chốt bảng lương tháng (yêu cầu quyền Kế toán / Giám đốc).
- `PUT /api/payroll/edit`: Chỉnh sửa thông tin bảng lương (yêu cầu quyền Kế toán / Giám đốc).
- `GET /api/payroll/requests`: Lấy danh sách yêu cầu chỉnh sửa lương.
- `POST /api/payroll/requests`: Tạo yêu cầu chỉnh sửa lương.
- `PUT /api/payroll/requests/:id`: Phê duyệt / xử lý yêu cầu chỉnh sửa lương.

---

## 7. ĐIỂM NỔI BẬT VỀ MẶT KỸ THUẬT & TRẢI NGHIỆM
- **Toàn vẹn dữ liệu (Data Integrity):** Áp dụng xóa mềm (`soft-delete`) cho nhân sự để bảo vệ tính nhất quán của bảng lương và lịch sử chấm công quá khứ.
- **Tối ưu UI/UX hiện đại:** 
  - Toàn bộ dropdown select sử dụng React Component riêng, khắc phục hoàn toàn nhược điểm thẻ `<select>` nguyên bản của hệ điều hành.
  - Hộp thoại xác nhận đăng xuất được gắn ra `document.body` qua **React Portal**, đảm bảo căn giữa màn hình tuyệt đối và loại bỏ lỗi đè lớp giao diện.
- **Hiệu năng & Tương thích:** Tích hợp bộ chuyển đổi giao diện **Dark / Light Theme** mượt mà, lưu trạng thái người dùng trong `localStorage`.
- **Clean Architecture:** Phân tách rõ ràng giữa Service Layer, State Management, Custom Hook và Presentation Component.
