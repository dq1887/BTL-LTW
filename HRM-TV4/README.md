# HRM TV4 — Nghỉ phép và phê duyệt · v2

Bản đầy đủ module 04 của nhóm 5: hai màn hình, hai collection nghiệp vụ, toàn bộ REST API, sáu quy tắc nghiệp vụ và tám tình huống kiểm thử bắt buộc. Frontend React + TypeScript strict + Vite + Router + AuthContext + Zustand; backend Express 5 + Mongoose + MongoDB replica set. Backend viết JavaScript ESM.

## Chạy trên Windows

Cài Node.js 22.12 trở lên, mở terminal tại thư mục HRM-TV4 chứa package.json gốc:

```powershell
npm.cmd ci --foreground-scripts
npm.cmd run demo
```

Hoặc mở CHAY-DEMO.cmd. Trên macOS/Linux dùng npm thay npm.cmd. Giữ terminal chạy trong lúc sử dụng. Mở địa chỉ Vite trong log, mặc định http://127.0.0.1:5173; nếu cổng bận dùng đúng cổng Vite thông báo. Không mở bằng Live Server. Backend mặc định cổng 4000.

Bản v2 dùng mongodb-memory-server-core nên npm ci không tự tải MongoDB. Lần chạy demo đầu tiên mới tải binary MongoDB 7.0.24: trên Windows có thể gần 600 MB. Đây là tiến trình tải, không phải lỗi; chờ log hoàn tất. Các lần sau thường dùng bản đã tải trong cache. Máy cần Internet lần đầu và quyền chạy mongod.

## Tài khoản mẫu

| Tài khoản | Mật khẩu | Phạm vi |
|---|---|---|
| employee | 123456 | Nhân viên An — Kỹ thuật |
| manager | 123456 | Quản lý Kỹ thuật |
| hr | 123456 | Nhân sự toàn công ty |
| other | 123456 | Nhân viên Bình — Kinh doanh |
| otherManager | 123456 | Quản lý Kinh doanh |

Màn hình đăng nhập có nút điền nhanh tài khoản. Đơn của chính bạn không có nút duyệt kể cả HR. Muốn thử duyệt: employee gửi đơn, logout rồi manager đăng nhập và duyệt đơn employee.

Seed tạo nhân viên, hai loại nghỉ và lịch published thứ Hai–Sáu trong 90 ngày từ lúc chạy. Demo dùng MongoDB thật tạm thời, dữ liệu reset khi tắt. Không dùng chế độ này để giữ dữ liệu nộp lâu dài.

## Database lưu lâu dài

Dùng Atlas hoặc MongoDB local đã cấu hình replica set. Tại root chạy:

```powershell
Copy-Item server/.env.example server/.env
```

Sửa MONGODB_URI và JWT_SECRET (ít nhất 32 ký tự). Dùng database trống riêng cho dữ liệu mẫu:

```powershell
npm.cmd run seed
npm.cmd run dev
```

Seed từ chối database đã có dữ liệu nghiệp vụ. Không seed vào database nhóm đang sử dụng.

## Những gì có trong bản v2

- Đơn nghỉ: tìm kiếm có debounce, lọc nhân viên/ngày/trạng thái, đếm trạng thái trong kết quả lọc, sắp xếp, phân trang, xuất CSV.
- Form gửi/sửa: xem trước ngày được tính phép, số dư dự kiến; kiểm tra lại phía server khi lưu và duyệt.
- Duyệt/từ chối/hủy/xóa: xác nhận thao tác, lý do, chống submit khi đang xử lý, lịch sử và số dư tự tải lại.
- Loại nghỉ: CRUD, tìm kiếm, lọc hoạt động, chi tiết; khóa trường chính sách nếu loại đã có đơn, ngừng sử dụng thay vì xóa.
- Giao diện sáng/tối, bố cục mobile bằng thẻ đơn, loading/error/retry/empty state, bàn phím, dialog native, thông báo kết quả.
- API kiểm tra role, phòng, self-approve, khoảng ngày, lịch published, trùng đơn, quota, xung đột công và kỳ lương.
- Hàm tích hợp có thể gọi trực tiếp cho TV1, TV2, TV3, TV5. Xem docs/BAN-GIAO.md.

## State và cấu trúc

| Nơi | Dữ liệu và lý do |
|---|---|
| useState | Form, modal, danh sách, loading/error, sắp xếp/phân trang và theme; phục vụ UI hiện tại |
| AuthContext | Danh tính đăng nhập và login/logout; dùng chung cho trang và protected route |
| Zustand | Bộ lọc q/status/employeeId/from/to/year; giữ khi chuyển trang và reset khi đổi tài khoản |
| MongoDB | Loại nghỉ, đơn nghỉ và lịch sử; backend quyết định nghiệp vụ |

client/src/pages là hai trang chính; components là form/chi tiết/modal/icon; integration/LeaveModule.tsx ghép vào layout có sẵn. server/src/services/leaveService.js là nghiệp vụ; leaveIntegrationService.js là hàm nối công/lương; routes/controllers/validators/models/lib thực hiện API.

Hai collection TV4 là leaveTypes và leaveRequests. hrmLocks là collection kỹ thuật bảo vệ ghi đồng thời. referenceModels.js trong bản chạy độc lập chỉ là model tối thiểu cho demo, không thay thế module của các thành viên khác. Token demo lưu sessionStorage; giao diện sáng/tối lưu localStorage.

## Chính sách triển khai

- Ngày YYYY-MM-DD, múi giờ nghiệp vụ Asia/Ho_Chi_Minh; đếm mỗi ngày published một lần.
- Quota theo loại/năm; null không giới hạn, 0 là không có phép. Đơn tối đa 367 ngày lịch; không chuyển phép năm trước.
- Pending chặn trùng khoảng ngày, chưa giữ quota; quota kiểm tra lại khi duyệt.
- Số dư = quota − ngày approved trong năm; hủy approved tự hoàn qua cách tính này, hủy lặp bị chặn.
- Bổ sung cancelled và POST cancel. HR mới được hủy approved, có lý do và kỳ chưa closed.
- HR tạo hộ được; manager duyệt đúng phòng; mọi role cấm tự duyệt/từ chối đơn của mình.
- Loại đã có đơn chỉ đổi tên/active; đổi code/paid/quota cần tạo loại mới.
- Lịch đổi sau gửi: sửa/lưu lại pending trước khi duyệt.
- Đã có công thực tế thì không duyệt phép; TV3 phải gắn guard chiều ngược. TV5 chỉ cộng paid và chặn xung đột công.

Các lựa chọn trên phải được đối chiếu với nhóm khi ghép. Chưa có source nhóm để xác nhận mapping model và auth.

## Kiểm tra

```powershell
npm.cmd run check
npm.cmd run test:integration
```

check chạy TypeScript + Vite build và các test không cần tiến trình MongoDB. Kết quả hiện tại: 63 test đạt (17 unit, 23 HTTP API với model giả lập, 23 test client gồm render phía server/transport/quyền). Bộ 23 integration test MongoDB thật được giữ riêng, chưa xác nhận đạt trong môi trường tạo source. Chưa xác minh tương tác UI bằng trình duyệt và toàn bộ luồng repo nhóm. Xem docs/KIEM-THU.md.

## Tài liệu

- docs/DOI-CHIEU-YEU-CAU-TV4.md: đối chiếu A–E theo đề.
- docs/BAN-GIAO.md: gửi gói nào cho TV1/2/3/5.
- docs/TICH-HOP.md: hợp đồng API và guard dùng chung.
- docs/KIEM-THU.md: cách kiểm tra, giới hạn và demo cá nhân.
- docs/TV4.postman_collection.json: bộ request để import Postman.

Không đưa node_modules, dist, .env hoặc cache/database demo lên Git.
