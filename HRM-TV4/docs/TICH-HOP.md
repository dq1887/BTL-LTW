# Hợp đồng tích hợp

## Chuẩn chung

API prefix /api. JWT trong Authorization: Bearer TOKEN. Response thành công `{ "success": true, "data": ... }`; xóa trả 204. API xuất `id` dạng string từ MongoDB `_id`; ngày nghiệp vụ YYYY-MM-DD, timestamp ISO. Không dùng userId thay employeeId.

Các role: employee, manager, admin_hr. Middleware nhóm phải thiết lập `req.actor = { id, username, role, employeeId, fullName }` trong đó id là User id và employeeId là Employee id. Nhân viên inactive bị chặn ngay cả token còn hạn. Không đọc quyền từ body.

## API module

| Method | Endpoint | Chức năng |
|---|---|---|
| GET, POST | /api/leave-types | Xem / HR tạo loại |
| GET, PATCH, DELETE | /api/leave-types/:id | Xem / HR sửa / HR xóa nếu chưa dùng |
| GET, POST | /api/leave-requests | Lọc danh sách / tạo đơn |
| GET, PATCH, DELETE | /api/leave-requests/:id | Chi tiết / sửa pending / xóa pending |
| POST | /api/leave-requests/:id/approve | Manager đúng phòng hoặc HR duyệt |
| POST | /api/leave-requests/:id/reject | Từ chối kèm note |
| POST | /api/leave-requests/:id/cancel | Hủy kèm note |
| GET | /api/leave-balances/:employeeId?year=2026 | Số dư theo loại/năm |
| GET | /api/leave-approved-days?employeeId=ID&from=2026-11-01&to=2026-11-30 | Ngày nghỉ gửi TV3/TV5 |
| GET | /api/leave-employees | Dropdown nhân viên theo quyền |

Bộ lọc đơn: q, status, employeeId, from, to. Lọc khoảng ngày lấy các đơn giao với khoảng lọc. Body tạo đơn:

```json
{
  "leaveTypeId": "ID_MONGODB_24_KY_TU_HEX",
  "fromDate": "2026-11-09",
  "toDate": "2026-11-10",
  "reason": "Giải quyết việc gia đình"
}
```

HR có thể thêm employeeId để tạo hộ. Nhân viên không được tạo hộ người khác. Không gửi requestedDays/status/reviewerId. Reject/cancel dùng `{ "note": "Lý do cụ thể" }`; approve dùng `{}` hoặc note. Thay ID mẫu bằng ID thật trả từ API.

Ngày approved trả `{ employeeId, date, paid, requestId, leaveTypeId }`. paid là snapshot tại lúc duyệt. TV5 chỉ cộng paid=true, không biến unpaid thành công có lương.

## Ghép backend

1. Copy models LeaveType/LeaveRequest, validators, lib, services, controller, routes và các integrations liên quan vào server nhóm, sửa import theo cấu trúc chung.
2. Thay referenceModels bằng import Employee/Department/User/Schedule/Attendance/Payroll thật; đảm bảo tên model populate đúng. Không đăng ký hai model cùng tên với schema khác nhau. File referenceModels chỉ phục vụ standalone.
3. Sửa hrmGateway nếu enum/field nhóm khác: `active`, `published`, `closed`, `period`, `workDate`, `workCredit`.
4. Dùng middleware auth chung và map req.actor. Dùng một connection Mongoose tới replica set; gọi initHrmLock khi startup.
5. Mount leaveRouter dưới /api; hợp nhất error middleware của TV3. Cài các dependency module còn thiếu, giữ lockfile nhóm.
6. Không copy login demo, index/demo/seed-cli vào startup thật nếu đã có. Không chạy seed package này trên dữ liệu đang dùng.

## Chống xung đột giữa các module

Lock nội bộ TV4 chỉ bảo vệ các thao tác đi qua withHrmTransaction. Muốn bảo vệ toàn nhóm, TV2/TV3/TV5 phải dùng cùng helper và cùng database/connection khi ghi dữ liệu liên quan. Chỉ GET kiểm tra rồi POST ở request khác vẫn có thể bị race condition.

TV3: gọi `assertNoApprovedLeave(employeeId, workDate, session)` từ leaveService trong `withHrmTransaction`, sau đó mới lưu check-in/điều chỉnh với chính session đó. Dùng cùng guard cho mọi đường ghi công, kể cả phê duyệt điều chỉnh. TV4 đã kiểm tra chiều ngược khi duyệt phép.

TV2: trước sửa/xóa lịch, kiểm tra ngày cũ và ngày mới không thuộc approved bằng guard trên; kiểm tra công theo module TV3. Thực hiện trong cùng transaction. Với đơn pending, TV4 bắt lưu lại đơn nếu ngày published đã thay đổi.

TV5: trong transaction chung, gọi `assertNoPendingLeave(employeeId, from, to, session)` trước tính/chốt kỳ theo quy ước nhóm; đọc LeaveRequest approved và leaveDates bằng session ấy; tách paid/unpaid, loại ngày đã có workCredit; lưu payroll với cùng session. Endpoint approved-days phù hợp đọc/hiển thị, không thay thế transaction khi chốt kỳ. TV4 chặn thay đổi phép nếu Payroll.status=closed.

TV1: quản lý user.employeeId, department.managerId đúng Employee id; giữ referential integrity khi khóa/chuyển nhân viên. Các thay đổi quyền và trạng thái cần được kiểm tra khi tích hợp đồng thời.

Đây là các điểm ghép bắt buộc, không phải các module khác đã được sửa sẵn trong package.

## Ghép frontend

- Dùng BrowserRouter và AuthContext sẵn của nhóm; adapter useAuth cần cung cấp user/login/logout/loading theo client này.
- Gắn RequestsPage vào /leave/requests, TypesPage vào /leave/types dưới protected layout TV2.
- Copy types/api/Modal/RequestForm/store; api set token từ AuthContext chung. Nếu nhóm dùng cookie auth, thay transport thống nhất thay vì thêm cơ chế token khác.
- CSS hiện dành cho app độc lập. Khi ghép, giới hạn selector trong container module hoặc hòa vào design system nhóm để tránh ảnh hưởng layout chung.
- Reset filter và dữ liệu nhạy cảm khi logout/đổi user. Quyền UI chỉ hỗ trợ trải nghiệm, backend vẫn kiểm tra mọi thao tác.

## Adapter v2

- createLeaveRouter({ authenticate: [groupAuthenticate, createLeaveActorAdapter(mapVerifiedUser)] }): gắn đăng nhập nhóm. mapVerifiedUser chỉ đọc req.user đã xác thực từ middleware nhóm.
- POST /api/leave-requests/preview: body employeeId (tùy chọn), leaveTypeId, fromDate, toDate và requestId khi sửa; trả requestedDays, leaveDates, paid, years. Xem trước không ghi đơn, không giữ quota.
- forSchedule.withScheduleLeaveGuard: resolveAffectedDays(session) đọc lịch thật rồi trả cả cặp nhân viên/ngày cũ và mới bị ảnh hưởng; write(session) ghi lịch sau kiểm tra phép, vẫn cần kiểm tra công theo TV3.
- forAttendance.withAttendanceLeaveGuard: resolveWorkDate(session) đọc workDate từ Schedule thật, không tin ngày client tự gửi; write(session, workDate) ghi công/điều chỉnh.
- forPayroll.withPayrollLeaveGuard: readWorkedDates(session) đọc công thực tế; write(session, leave) nhận paidLeaveDays/unpaidLeaveDays và dates để ghép công thức TV5.
- LeaveModule.tsx nhận user/token/view/onSessionExpired để ghép frontend, không tạo BrowserRouter/login thứ hai.

Các guard này phải dùng cùng connection/session và collection hrmLocks của core TV4. Callback phải đọc/ghi bằng session được truyền, không mở transaction lồng nhau. Với các cập nhật dữ liệu nguồn có thể ảnh hưởng quyền hay liên kết lịch, nhóm cần kiểm tra lại ở thời điểm ghi.
