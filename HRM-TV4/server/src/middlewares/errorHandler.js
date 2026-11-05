import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
const labels = { employeeId: 'Nhân viên', leaveTypeId: 'Loại nghỉ', requestId: 'Đơn nghỉ', fromDate: 'Từ ngày', toDate: 'Đến ngày', reason: 'Lý do', note: 'Ghi chú', name: 'Tên loại nghỉ', code: 'Mã loại nghỉ', paid: 'Chế độ lương', annualQuota: 'Hạn mức', active: 'Trạng thái', year: 'Năm', from: 'Từ ngày', to: 'Đến ngày', username: 'Tài khoản', password: 'Mật khẩu' };
function validationMessage(issue) {
  const field = labels[issue.path[0]] ?? '';
  let message = issue.message;
  if (issue.code === 'unrecognized_keys') message = 'Có trường dữ liệu không được phép gửi hoặc cập nhật.';
  else if (issue.code === 'invalid_type') message = 'Giá trị bị thiếu hoặc không đúng kiểu dữ liệu.';
  else if (issue.code === 'invalid_format') message = ['fromDate', 'toDate', 'from', 'to'].includes(issue.path[0]) ? 'Dùng định dạng YYYY-MM-DD.' : 'Giá trị không đúng định dạng yêu cầu.';
  else if (issue.code === 'too_small' || issue.code === 'too_big') message = issue.origin === 'string' ? `Độ dài phải ${issue.code === 'too_small' ? 'từ' : 'không quá'} ${issue.minimum ?? issue.maximum} ký tự.` : `Giá trị phải ${issue.code === 'too_small' ? 'từ' : 'không quá'} ${issue.minimum ?? issue.maximum}.`;
  return field ? `${field}: ${message}` : message;
}
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof ZodError) return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: error.issues.map(validationMessage).join('; ') });
  if (error instanceof AppError) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
  if (error.code === 11000) return res.status(409).json({ success: false, code: 'DUPLICATE', message: 'Mã đã tồn tại.' });
  if (error.name === 'CastError' || error.name === 'ValidationError' || error.type === 'entity.parse.failed') return res.status(400).json({ success: false, code: 'INVALID_INPUT', message: 'Dữ liệu gửi lên không hợp lệ.' });
  console.error(error);
  return res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ. Kiểm tra kết nối MongoDB replica set và log backend.' });
}
