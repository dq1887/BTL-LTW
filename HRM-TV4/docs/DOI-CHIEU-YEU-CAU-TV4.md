# Đối chiếu yêu cầu TV4 theo ảnh đề bài

Bản rà soát ngày 05/11/2026. Phạm vi: module 04, không thay thế phần nhân sự/lịch/công/lương của các thành viên khác.

## A. Phạm vi sở hữu

| Yêu cầu | Triển khai |
|---|---|
| Trang /leave/requests | client/src/pages/RequestsPage.tsx và components/RequestForm.tsx: CRUD pending, tìm kiếm/lọc, chi tiết, lịch sử, duyệt/từ chối/hủy, số dư |
| Trang /leave/types | client/src/pages/TypesPage.tsx: CRUD loại nghỉ, paid/quota/active |
| leaveTypes đủ trường | server/src/models/LeaveType.js: code, name, paid, annualQuota, active |
| leaveRequests đủ trường | server/src/models/LeaveRequest.js: employeeId, leaveTypeId, fromDate, toDate, requestedDays, status, reviewerId |
| Nhận nhân viên TV1, lịch TV2 | integrations/hrmGateway.js và referenceModels.js; khi ghép thay bằng model thật |
| Xuất ngày nghỉ TV3/TV5 | GET /api/leave-approved-days; mỗi ngày có employeeId, date, paid, requestId, leaveTypeId |

Hai collection trên là dữ liệu nghiệp vụ TV4. hrmLocks là collection kỹ thuật phục vụ transaction. Các collection ngoài module chỉ là model tối thiểu cho demo và tích hợp.

## B. Sáu quy tắc phải giải thích được

1. **Ngày nguyên và lịch published:** validators/leave.js kiểm tra ngày có thật, đúng định dạng, thứ tự; hrmGateway.publishedDates chỉ lấy lịch published, loại ngày trùng. requestedDays bằng số ngày này, không nhận từ client.
2. **Không chồng khoảng ngày:** validateBusiness trong leaveService.js tìm đơn cùng người, pending/approved, có fromDate <= ngày kết thúc mới và toDate >= ngày bắt đầu mới. Khi sửa/duyệt loại chính đơn đang xử lý khỏi truy vấn.
3. **Không vượt quota:** quotaCheck cộng ngày approved cùng loại, theo từng năm, rồi cộng ngày đơn mới. Kiểm tra cả khi tạo/sửa và duyệt. Pending chưa trừ số dư. null nghĩa là không giới hạn.
4. **Quyền và trạng thái:** owner/HR sửa pending; nhân viên hủy pending của mình. assertReviewer chỉ cho manager/HR, kiểm tra phòng quản lý và cấm tự duyệt. Backend kiểm tra, không dựa vào việc ẩn nút.
5. **Trừ/hoàn phép:** balances tính quota trừ tổng ngày approved. Duyệt làm tăng số ngày đã dùng; hủy approved làm số ngày đó không còn được tính. Chặn hủy lặp. Chọn chính sách HR hủy approved khi kỳ lương chưa closed, phải có lý do.
6. **Không trùng công và paid:** trước duyệt gọi assertNoAttendance. TV3 phải gọi assertNoApprovedLeave trước mọi thao tác ghi công. paidSnapshot chốt tại thời điểm duyệt, feed cung cấp paid để TV5 chỉ cộng ngày có lương và không cộng trùng workCredit.

Các thao tác ghi trong module dùng withHrmTransaction. Để quy tắc 6 đúng ở toàn hệ thống, TV3/TV5 phải tích hợp các guard và transaction chung theo TICH-HOP.md. Source TV4 không tự thay đổi code của các thành viên chưa được cung cấp.

## C. REST API

Đã khai báo đủ trong server/src/routes/leaveRoutes.js, prefix /api trong app.js:

- GET/POST /api/leave-types
- GET/PATCH/DELETE /api/leave-types/:id
- GET/POST /api/leave-requests
- GET/PATCH/DELETE /api/leave-requests/:id
- POST /api/leave-requests/:id/approve
- POST /api/leave-requests/:id/reject
- GET /api/leave-balances/:employeeId

Bổ sung POST /api/leave-requests/:id/cancel để thực hiện hủy; GET /api/leave-approved-days để xuất ngày; GET /api/leave-employees cho danh sách nhân viên theo quyền. API nghiệp vụ yêu cầu Bearer token; không tự cung cấp role trong body.

## D. Tám ca kiểm thử bắt buộc

| Ca đề bài | Test trong server/test/leave.integration.test.js | Kết quả mong đợi |
|---|---|---|
| 1. Tạo loại nghỉ | 01 | HR tạo 201; code trùng 409; employee bị chặn |
| 2. Ngày kết thúc trước bắt đầu | 02 | 400, không lưu |
| 3. Đơn trùng lịch | 04 | 409 với cả pending/approved |
| 4. Vượt quota | 05 | 409 |
| 5. Gửi pending | 03 | 201, pending, số ngày đúng lịch published |
| 6. Manager đúng phòng | 06 | Đúng phòng 200, sai phòng 403 |
| 7. Không self-approve | 07 | Manager và HR tự duyệt đều 403 |
| 8. Hủy hoàn phép | 08 | HR hủy 200, số dư về 12, hủy lại 409 |

Bản v2 có 17 unit test, 23 HTTP API test với model giả lập và 23 client test đã chạy đạt. Bộ 23 integration test MongoDB thật vẫn cần chạy lại trên máy có MongoDB demo hoạt động. Không coi API mock test là bằng chứng transaction/index MongoDB đã đạt. Xem KIEM-THU.md.


## E. Demo cá nhân

1. Giữ terminal npm.cmd run demo chạy. Mở app trên Chrome để có không gian rộng hơn trình duyệt nhúng VS Code.
2. Login employee / 123456, ghi lại số phép năm hiện tại.
3. Chọn hai ngày làm liên tiếp trong 90 ngày đã seed; ví dụ nếu đang demo tháng 11/2026 thì 09–10/11/2026. Chọn ngày chưa có đơn pending/approved.
4. Tạo đơn phép năm, lý do ít nhất 5 ký tự. Kỳ vọng pending, 2 ngày, số dư chưa giảm.
5. Logout và login manager / 123456. Duyệt đơn của employee, không tạo đơn của manager rồi tự duyệt.
6. Login employee, kiểm tra approved và số dư giảm 2. Xem lịch sử.
7. Có thể login hr hủy approved với lý do, kiểm tra số dư phục hồi.
8. Chỉ ra API và phần kiểm tra quyền/quota trong service khi giảng viên hỏi.

## Quy ước cần chốt với nhóm

employeeId luôn là Employee._id, reviewerId là User._id trong bản này. Ngày YYYY-MM-DD; role employee/manager/admin_hr; lịch published; lương closed. Chốt trạng thái cancelled và chính sách hủy với nhóm. Nếu nhóm đã có quy ước khác, sửa adapter/model/auth theo nhóm, không tạo danh tính riêng cho cùng nhân viên.

## Nâng cấp v2

POST /api/leave-requests/preview cho form xem ngày tính phép và số dư dự kiến. GET leave-types trả thêm used để khóa UI trường chính sách đã dùng. createLeaveRouter nhận middleware auth nhóm. identityAdapter, forSchedule, forAttendance, forPayroll là code bàn giao thực tế. Giao diện thêm sáng/tối, mobile card, tìm kiếm debounce, filter/sort/pagination/CSV và retry.
