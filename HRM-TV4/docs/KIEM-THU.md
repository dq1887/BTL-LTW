# Kiểm thử TV4 v2

## Kết quả đã chạy

Lệnh `npm.cmd run check` thực hiện frontend TypeScript strict + Vite production build và ba bộ test sau:

| Bộ | Số ca | Phạm vi |
|---|---:|---|
| server/test/leave.unit.test.js | 17 | Ngày, quota input, PATCH, response, identity adapter |
| server/test/leave.api.test.js | 23 | Express HTTP, JWT/role, controller/service thật, model persistence giả lập trong bộ nhớ |
| client/test/client.test.tsx | 23 | Render HTML phía server, quyền UI, bộ lọc, CSV, storage, HTTP transport, cú pháp CSS |
| Tổng | 63 | Đã chạy đạt trong môi trường tạo source |

Test API này sử dụng model giả lập. Nó không kiểm chứng transaction, chỉ mục, query semantics đầy đủ hoặc độ bền MongoDB. Test client là server render và helper/transport test; không chứng minh click/keyboard/layout thực tế đã đạt trong trình duyệt.

## Bộ MongoDB thật

`npm.cmd run test:integration` chạy server/test/leave.integration.test.js gồm 23 ca với MongoMemoryReplSet thật, trong đó có thao tác tạo/duyệt đồng thời. Bộ này chưa xác nhận đạt ở bản bàn giao: môi trường tạo source từng từ chối chạy mongod và hiện không cài lại được dependency tải từ registry. Giữ nguyên bộ test để chạy trên máy bạn đã chạy được demo. Không ghi 23/23 passed nếu chưa chạy.

Không mở hoặc dùng database thật của nhóm cho bộ integration; nó tạo database tạm riêng.

## Tám ca bắt buộc

| Đề bài | API test trong bộ 23 ca | Kỳ vọng |
|---|---|---|
| Tạo loại nghỉ | 01 | HR tạo 201, trùng code 409 |
| Ngày kết thúc trước bắt đầu | 02 | 400, không lưu |
| Đơn trùng lịch | 03 | 409 với pending/approved |
| Vượt quota | 04 | 409, kiểm tra lại khi duyệt |
| Gửi đơn pending | 05 | Tính theo published, chưa trừ quota |
| Manager đúng phòng | 06 | Đúng phòng 200, sai phòng 403 |
| Từ chối self-approve | 07 | HR/manager đều bị chặn |
| Hủy và hoàn phép | 08 | HR hủy đúng policy, hoàn đúng một lần |

## Kiểm tra tương tác UI trên máy

- Chưa đăng nhập mở /leave/requests → login; đăng nhập quay lại trang đã yêu cầu.
- Đăng nhập employee, tạo đơn với hai ngày published còn trống. Preview hiện đúng ngày/remainingAfter, không có bản ghi mới trước khi submit.
- Chọn ngày không có lịch, khoảng trùng hoặc vượt quota; phải thấy lỗi và không lưu.
- Sửa ngày/loại nghỉ liên tục: kết quả preview cuối cùng phải tương ứng lựa chọn mới nhất.
- Manager duyệt đơn người khác trong phòng, đơn của mình không có nút duyệt.
- Reject/cancel cần lý do; submit khi đang xử lý không được gửi lặp.
- HR xem/sửa/ngừng sử dụng loại đã dùng; không đổi paid/quota/code, không xóa loại đã có đơn.
- Search/filter/sort/pagination/CSV đúng tập dữ liệu; CSV mở được tiếng Việt.
- Kiểm tra 375px, tablet, desktop và sáng/tối; thẻ mobile không bắt cuộn ngang cả trang.
- Tab/Shift+Tab trong dialog; Escape đóng khi không busy; focus trở về nút đã mở.
- Tắt API/mất mạng: hiện lỗi dễ hiểu, có thử lại; lỗi một vùng không làm mất toàn bộ app.

Chưa xác minh các tương tác này bằng trình duyệt trong môi trường tạo source: cloud browser chặn truy cập bản local. Không dùng render test để khẳng định UI E2E đã đạt.

## Demo cá nhân

Giữ terminal demo chạy → employee gửi 2 ngày → xem pending và quota chưa giảm → logout/login manager → duyệt → employee xem approved và còn ít hơn 2 ngày. HR hủy approved khi kỳ chưa chốt → số dư phục hồi. Đổi tài khoản không dừng server.

## Kiểm thử toàn nhóm

- TV1: nhân viên active/inactive, đúng employeeId và managerId.
- TV2: lịch published, thay đổi lịch sau gửi, chặn thay đổi lịch đang có approved.
- TV3: công trước phép thì duyệt bị chặn; phép trước công thì ghi/điều chỉnh bị chặn.
- TV5: paid/unpaid, pending chưa xử lý, xung đột công/phép, hủy phép, kỳ closed.
- Kịch bản PDF: 22 ngày lịch làm, 19 ngày công, 2 paid và 1 unpaid không trùng; base 12.000.000 + allowance 500.000 − deduction 200.000 cho kết quả mong đợi 11.754.545 VND theo công thức nhóm. Đây là kỳ vọng tích hợp, không phải kết quả đã chạy TV5.
