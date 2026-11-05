# Gửi code cho từng thành viên

Bốn gói bàn giao chứa code thật và README riêng. Các gói là phần của một hệ thống chung, không phải bốn app độc lập. Core nghỉ phép do TV4 sở hữu, cần được đưa vào backend chung một lần.

| Gửi ai | Tệp | Nội dung code | Đặt vào đâu |
|---|---|---|---|
| TV1 hoặc người tổng hợp backend | TV1-Backend-Auth.zip | Models, routes, controllers, services, validators, lib; adapter req.user → req.actor; core transaction | server/src/modules/leave/ |
| TV2 | TV2-GiaoDien-LichLam.zip | Hai trang, form, modal, chi tiết, CSS, store, API, bridge nhận user/token chung; guard sửa lịch | client/src/modules/leave/ và server/src/modules/leave/integrations/forSchedule.js |
| TV3 | TV3-ChamCong.zip | forAttendance.js; ví dụ nối service công trong cùng transaction | server/src/modules/leave/integrations/forAttendance.js |
| TV5 | TV5-TinhLuong.zip | forPayroll.js; ví dụ lấy paidLeaveDays/unpaidLeaveDays và chặn pending/xung đột | server/src/modules/leave/integrations/forPayroll.js |

## Thứ tự ghép

1. TV1/người tổng hợp đưa core TV4 vào backend; nạp model thật và nối auth. Không chạy thêm login demo.
2. TV2 đưa frontend module vào client; gắn hai route dưới layout nhóm bằng LeaveModule. Truyền user, token, callback logout. Nếu dùng cookie auth, sửa transport theo chuẩn nhóm trước khi ghép.
3. TV2/TV3/TV5 gắn các guard vào đường ghi dữ liệu liên quan, dùng cùng mongoose connection/session và hrmLocks. Không chỉ gọi GET kiểm tra rồi ghi ở request khác.
4. Chạy API và UI test module; chạy lại integration MongoDB thật; sau đó chạy luồng nhóm.

## Phần mỗi người phải trả lại TV4

- TV1: model User/Employee/Department thật và user sau middleware auth; quy ước role, identity.
- TV2: model Schedule/Shift thật, trạng thái published, layout/router dùng chung.
- TV3: model Attendance thật, quy tắc công thực tế và các service ghi/duyệt điều chỉnh.
- TV5: model Payroll thật, period/status và service tính/chốt kỳ.

## Lưu ý tránh ghép nhầm

- Source standalone HRM-TV4 là bản demo đầy đủ; không chép App.tsx/main.tsx/login/seed lên startup nhóm để thay toàn ứng dụng.
- Bản TV1 cố ý dùng referenceModels.js chỉ lấy model đã đăng ký của nhóm. Nó sẽ báo lỗi rõ nếu nhóm chưa nạp model, không âm thầm tạo schema giả.
- Các đoạn example dùng dependency injection: nhóm truyền model/service thật vào; không chứa placeholder giả làm API đã hoàn thành của TV3/TV5.
- Các callback write phải sử dụng session được truyền vào. Đọc schedule/công bên trong resolver chung session; không nhận workDate/role tin cậy trực tiếp từ body người dùng.
- TV4 không được coi là tích hợp toàn nhóm hoàn tất cho đến khi chạy thật với repo chung.
