import { z } from 'zod';
import { ensure } from '../lib/errors.js';
import { objectId } from '../validators/leave.js';
const actorSchema = z.object({ id: objectId, username: z.string().min(1), role: z.enum(['employee', 'manager', 'admin_hr']), employeeId: objectId, fullName: z.string().min(1) }).strict();
export function createLeaveActorAdapter(mapVerifiedUser) {
  if (typeof mapVerifiedUser !== 'function') throw new TypeError('Thiếu hàm mapVerifiedUser(user).');
  return function leaveActorAdapter(req, res, next) {
    ensure(req.user, 401, 'Chưa có danh tính đã được xác thực.');
    req.actor = actorSchema.parse(mapVerifiedUser(req.user));
    next();
  };
}
