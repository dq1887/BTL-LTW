# BÀI TẬP LỚN MÔN LẬP TRÌNH WEB
# DỰ ÁN HRM INTERNAL - HỆ THỐNG QUẢN LÝ NHÂN SỰ & CHẤM CÔNG NỘI BỘ

**Quy mô:** nhóm 5 thành viên (Mô hình Fullstack khép kín 5 Module)

---
## 1. TỔNG QUAN DỰ ÁN 

Dự án HRM Internal được thiết kế theo mô hình kiến trúc Web Fullstack hiện đại, mô phỏng quy trình vận hành nhân sự nội bộ khép kín cho doanh nghiệp vừa và nhỏ

---

## 2. CÁC CHỨC NĂNG CHÍNH

HRM Internal tập trung vào các nghiệp vụ quản lý nhân sự cốt lõi và liên thông chặt chẽ về dữ liệu. bao gồm:

- **Quản lý nhân viên:** Quản lý hồ sơ, thông tin cá nhân và thông tin công việc của nhân viên.
- **Quản lý phòng ban:** Tổ chức, phân chia và quản lý cơ cấu phòng ban trong doanh nghiệp.
- **Quản lý ca làm việc:** Thiết lập, cấu hình và quản lý các ca làm việc của nhân viên.
- **Quản lý chấm công:** Theo dõi, ghi nhận và quản lý dữ liệu chấm công thực tế.
- **Quản lý nghỉ phép:** Cho phép nhân viên gửi yêu cầu nghỉ phép và hỗ trợ quản lý xét duyệt yêu cầu.
- **Quản lý tiền lương:** Tổng hợp dữ liệu chấm công, tính toán và lập bảng lương dựa trên các quy định của doanh nghiệp.

---

## 3. CÔNG NGHỆ SỬ DỤNG

Hệ thống được phát triển dựa trên hệ sinh thái JavaScript toàn diện (MERN Stack nâng cao), kết hợp với các công cụ hiện đại để tối ưu cả hiệu suất máy chủ lẫn trải nghiệm người dùng:

**Frontend (Client-side)**
- **Core Framework:** React 19, Vite (Tối ưu hóa tốc độ build)
- **Routing:** React Router DOM v6 (Quản lý điều hướng trang)
- **State Management:** Zustand (Quản lý state toàn cục linh hoạt) & React Context API (Quản lý phiên đăng nhập)
- **HTTP Client:** Axios (Xử lý giao tiếp với API và cấu hình Interceptors đính kèm token)
- **UI & Styling:** CSS3 / Tailwind CSS 

**Backend (Server-side)**
- **Runtime & Framework:** Node.js, Express.js
- **Bảo mật & Xác thực:** JSON Web Token (JWT) phân quyền người dùng, bcrypt (Băm và đối chiếu mật khẩu), CORS
- **Kiến trúc:** RESTful API chuẩn hóa kết hợp mô hình MVC (Model - View - Controller)

**Cơ sở dữ liệu (Database)**
- **Hệ quản trị CSDL:** MongoDB (NoSQL) lưu trữ đám mây qua MongoDB Atlas
- **ODM (Object Data Modeling):** Mongoose (Định nghĩa Schema, ràng buộc dữ liệu và xử lý quan hệ giữa các Collection)

**DevOps & Công cụ quản lý (Tools & Deployment)**
- **Quản lý mã nguồn:** Git & GitHub (Quy trình phân nhánh chia task)
- **Triển khai (Hosting):** Vercel (Hosting cho Frontend) & Render (Hosting cho Backend API)
- **Công cụ kiểm thử & Quản trị:** Thunder Client Extension (Test các endpoint API), MongoDB Compass (Quản trị dữ liệu trực tiếp)

---

## 4. Cấu trúc thư mục

```
BTL-LTW
├── backend/
|   ├── src/
|   |   ├── controllers/          # Xử lý logic nghiệp vụ
|   |   ├── middleware/           # Middleware xử lý yêu cầu
|   |   ├── models/               # Các mô hình dữ liệu MongoDB
|   |   ├── routes/               # Định nghĩa các API 
|   |   ├── utils/                # Các hàm tiện ích
|   |
|   ├── .env                      # Cấu hình biến môi trường
|   ├── .gitignore                # Cấu hình Git
|   ├── package-lock.json         # Khóa phiên bản thư viện
|   ├── package.json              # Thông tin và thư viện Backend
|   ├── recalculate.js            # Script tính toán lại dữ liệu
|   ├── seed_50_employees.js      # Script tạo dữ liệu nhân viên mẫu
|   ├── seed_attendances.js       # Script tạo dữ liệu chấm công mẫu
|   ├── server.js                 # Khởi chạy máy chủ Backend
|
├── frontend/
|   ├── dist/                     # Thư mục chứa bản build
|   ├── src/                      # Mã nguồn giao diện React
|   ├── public/                   # Tài nguyên tĩnh
│   ├── index.html                # Trang HTML gốc
│   ├── eslint.config.js          # Cấu hình ESLint
│   ├── .gitignore                # Cấu hình Git
│   ├── package.json              # Thông tin và thư viện Frontend
│   └── package-lock.json 
│
├── .gitignore                    # Cấu hình Git toàn dự án
└── README.md                     # Tài liệu giới thiệu dự án
```
## 5. Hướng dẫn cài đặt


---

## 6. Module TV4 – Quản lý nghỉ phép

### Chức năng

- Nhân viên gửi, xem, chỉnh sửa và xóa đơn đang chờ duyệt của chính mình.
- Nhân viên có thể tra trước các ngày được phân ca trong khoảng xin nghỉ.
- Trưởng phòng xem và duyệt/từ chối đơn của nhân viên thuộc phòng ban mình; không được tự duyệt đơn của chính mình.
- Admin HR xem và xử lý đơn trên toàn công ty.
- Chặn ngày không có lịch phân công, dữ liệu lịch/ca bị thiếu, đơn trùng ngày làm việc và thao tác xử lý một đơn đã được người khác duyệt.
- Các đơn đã duyệt/từ chối được giữ lại; chỉ đơn đang chờ duyệt mới được xóa để tránh mất lịch sử xử lý.

### Dữ liệu lịch làm việc được dùng

Trong source nhóm gửi ngày 15/11/2026, `Shift` mới là danh mục mẫu ca (`name`, `startTime`, `endTime`); trang Chấm công hiện tại không gửi `scheduleId` khi check-in và source chưa có màn hình/API phân công ca theo từng nhân viên/ngày. Vì vậy danh mục `shifts` một mình chưa đủ để tính ngày nghỉ.

TV4 đọc lịch theo thứ tự ưu tiên sau:

1. **Nguồn chính – collection `workschedules`:** lịch đã công bố, trạng thái `published`, có `employeeId`, `workDate` (`YYYY-MM-DD`) và `shiftId` tham chiếu tới `shifts`.
2. **Tương thích dữ liệu cũ – collection `attendances`:** bản ghi có `employeeId`, `workDate` và `scheduleId` tham chiếu tới `shifts` tồn tại. Bản ghi chấm công không có `scheduleId` không được xem là lịch phân công.

Model `WorkSchedule` của TV4 định nghĩa hợp đồng nguồn chính để TV2 tích hợp:

```json
{
  "employeeId": "<ObjectId nhân viên>",
  "shiftId": "<ObjectId ca làm trong shifts>",
  "workDate": "2026-11-20",
  "status": "published",
  "publishedBy": "<ObjectId người công bố>",
  "publishedAt": "2026-11-15T09:00:00.000Z"
}
```

`employeeId`, `shiftId` và `publishedBy` phải là ObjectId thật trong MongoDB, không dùng các chuỗi placeholder trong ví dụ. Bản ghi `draft` hoặc `cancelled` không được tính. TV4 chỉ đọc lịch, không tự tạo lịch giả hoặc tự coi toàn bộ ngày trong khoảng là ngày làm việc.

**Việc cần TV2 xác nhận khi ghép nhóm:** module phân ca cần ghi lịch đã công bố vào `workschedules` theo đúng các trường trên (hoặc tiếp tục ghi `attendances.scheduleId` nếu nhóm đang dùng cấu trúc cũ). Trong source ZIP hiện tại chưa có chức năng tạo/công bố các bản ghi này, nên nếu DB chưa có dữ liệu phân ca thì form nghỉ phép sẽ chặn gửi đơn và báo rõ nguyên nhân; không thể kiểm thử end-to-end việc tạo/duyệt đơn cho đến khi DB có lịch thật.

### API TV4

Tất cả endpoint dưới đây yêu cầu JWT Bearer Token:

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/api/leave/types` | Lấy danh mục loại nghỉ; tự khởi tạo 4 loại mặc định ở lần gọi đầu |
| POST | `/api/leave/types` | Admin HR tạo loại nghỉ |
| PATCH | `/api/leave/types/:id` | Admin HR cập nhật/khóa loại nghỉ |
| GET | `/api/leave/schedule-days?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | Xem trước các ngày có ca được phân công của tài khoản đăng nhập |
| GET | `/api/leave/requests` | Lấy danh sách đơn theo phạm vi quyền |
| POST | `/api/leave/requests` | Tạo đơn nghỉ phép |
| GET | `/api/leave/requests/:id` | Xem chi tiết đơn trong phạm vi quyền |
| PATCH | `/api/leave/requests/:id` | Chủ đơn chỉnh sửa khi còn chờ duyệt |
| DELETE | `/api/leave/requests/:id` | Chủ đơn hoặc Admin HR xóa đơn đang chờ duyệt |
| POST | `/api/leave/requests/:id/approve` | Trưởng phòng/Admin HR duyệt đơn |
| POST | `/api/leave/requests/:id/reject` | Trưởng phòng/Admin HR từ chối đơn |

### Chạy dự án

1. Tạo `backend/.env` với `MONGO_URI` và `JWT_SECRET` theo cấu hình MongoDB/JWT của nhóm. Không commit file `.env` lên Git.
2. Mở terminal tại `backend`, chạy `npm install`, sau đó `npm run dev`.
3. Mở terminal khác tại `frontend`, chạy `npm install`, sau đó `npm run dev`.
4. Đăng nhập bằng tài khoản đang có trong MongoDB, mở mục **Nghỉ phép** ở sidebar.
