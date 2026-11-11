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

