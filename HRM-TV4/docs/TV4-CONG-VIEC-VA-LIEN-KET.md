# Công việc TV4

Bạn sở hữu phần nghỉ phép từ giao diện đến database. Bạn không chỉ làm form: phải giải thích được vì sao đơn được/không được duyệt và dữ liệu ấy ảnh hưởng công/lương thế nào.

## Hai màn hình

**Đơn nghỉ:** xem đơn theo quyền; tìm theo nhân viên/lý do/loại nghỉ; lọc trạng thái, khoảng ngày; xem số phép còn lại theo năm; gửi đơn; sửa/xóa/hủy pending; quản lý duyệt/từ chối; HR hủy approved theo chính sách; xem lịch sử.

**Loại nghỉ:** code duy nhất, tên, có lương hay không, hạn mức năm, trạng thái hoạt động. HR thêm/sửa/xóa; loại đã có đơn không được xóa. Ngừng sử dụng bằng active=false.

## Backend và database

- LeaveType lưu chính sách, LeaveRequest lưu đơn và ngày published thực sự được tính.
- Routes xác định endpoint; controller đọc/validate request và chuẩn response; service kiểm tra nghiệp vụ; model lưu và truy vấn MongoDB.
- Auth middleware xác minh JWT và lấy user từ database. Không tin role, requestedDays, trạng thái do client gửi.
- Mỗi chuyển trạng thái ghi người thao tác, thời gian, lý do. Xóa chỉ áp dụng pending; hủy giữ lịch sử.
- Tính lại quota khi duyệt trong transaction để hai người duyệt đồng thời không vượt quota. hrmLocks là cơ chế đơn giản dành cho phạm vi BTL, có thể giới hạn throughput nếu triển khai lớn.

## Liên kết cụ thể

| Thành viên | Bạn nhận | Bạn gửi / cùng phối hợp | Khóa nối |
|---|---|---|---|
| TV1 — Nhân sự, phòng ban; auth dùng chung | Nhân viên active, phòng ban, quản lý, user và role | Hiển thị đúng người; phạm vi quyền; seed mẫu và kiểm thử chung để TV1 review | User.employeeId → Employee._id; Employee.departmentId → Department._id; Department.managerId → Employee._id |
| TV2 — Ca và lịch | Các ngày lịch published | Review layout/router/responsive; không sửa/xóa lịch liên quan approved tùy tiện | Schedule.employeeId + workDate; Schedule.shiftId |
| TV3 — Công và điều chỉnh | Công thực tế đã ghi nhận | Danh sách ngày approved; guard chặn ghi/điều chỉnh công trùng phép | Attendance.employeeId + scheduleId → Schedule.workDate |
| TV5 — Lương | Payroll employeeId/period/status để biết kỳ đã chốt | Ngày approved và paid; chặn chốt khi còn pending; sau thay đổi phép tính lại bảng draft | employeeId + workDate/period YYYY-MM |

Kết nối qua API và service/database dùng chung, không chỉ qua đường dẫn trang. `integrations/hrmGateway.js` là chỗ bạn sửa khi schema nhóm khác bản mẫu. `integrations/referenceModels.js` phải thay bằng import model thật của nhóm.

## Một ví dụ để trình bày

1. TV1 có An thuộc Kỹ thuật, trạng thái active, manager M quản lý phòng.
2. TV2 công bố lịch thứ Hai và thứ Ba cho An.
3. An gửi đơn nghỉ phép năm cho hai ngày đó. Backend tính 2 ngày; không cho client tự gửi số ngày.
4. Nếu không trùng đơn và còn đủ quota, đơn ở pending. Chưa trừ phép đã dùng.
5. M duyệt. Backend kiểm tra lại phòng, không tự duyệt, lịch, quota, công và kỳ lương.
6. Thành approved: phép còn từ 12 xuống 10; TV3 không ghi công thực tế cho hai ngày ấy.
7. TV5 nhận 2 ngày paid để tính lương theo công thức nhóm, không cộng thêm lần nữa vào workCredit.
8. HR hủy khi kỳ chưa closed: đơn cancelled, số dư trở lại 12; TV5 tính lại draft. Nếu đã closed, từ chối hủy.

## Việc chung bạn còn phải làm khi ghép nhóm

- Chốt tên trường/enum, import model, auth và cấu trúc response cùng TV1/TV3.
- Gắn hai route vào layout do TV2 sở hữu; dùng AuthContext của TV1, không tạo login thứ hai.
- Kết hợp seed demo với seed nhóm theo thứ tự nhân sự → lịch → công/phép → lương.
- Cùng TV3 thử xung đột công/phép, cùng TV5 thử paid/unpaid và khóa kỳ.
- Review layout/router TV2; để TV1 review seed/integration của bạn.
- Chạy test, lưu bằng chứng và demo 4–6 phút. Không ghi test đạt nếu chưa chạy.

Phần được giao trong file PDF là HRM module 04; yêu cầu bài ShopMini trước đó là bài khác, không áp dụng Context Theme/cart Redux cho module này.
