import jwt from 'jsonwebtoken';
import { User, Employee } from '../integrations/referenceModels.js';
import { jwtSecret } from '../config.js';
import { ensure, AppError } from '../lib/errors.js';
export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  ensure(token, 401, 'Vui lòng đăng nhập.', 'UNAUTHENTICATED');
  let payload;
  try { payload = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] }); }
  catch { throw new AppError(401, 'Phiên đăng nhập hết hạn hoặc không hợp lệ.', 'UNAUTHENTICATED'); }
  ensure(typeof payload === 'object' && /^[a-f0-9]{24}$/i.test(payload.sub ?? ''), 401, 'Token không hợp lệ.');
  const user = await User.findById(payload.sub);
  ensure(user, 401, 'Tài khoản không còn tồn tại.');
  const employee = await Employee.findById(user.employeeId);
  ensure(employee?.status === 'active', 403, 'Nhân viên không còn hoạt động.', 'EMPLOYEE_INACTIVE');
  req.actor = { id: String(user._id), username: user.username, role: user.role, employeeId: String(user.employeeId), fullName: employee.fullName };
  next();
}
export function hrOnly(req, res, next) {
  ensure(req.actor.role === 'admin_hr', 403, 'Chỉ Admin/HR được quản lý loại nghỉ.'); next();
}
