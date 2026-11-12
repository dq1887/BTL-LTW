import { Router } from 'express';
import { ensure } from '../lib/errors.js';
const defaultAuthenticate = (_req, _res, next) => next(new Error('Missing group authentication middleware'));
const defaultHrOnly = (req, _res, next) => { ensure(req.actor?.role === 'admin_hr', 403, 'Chá»‰ HR Ä‘Æ°á»£c quáº£n lÃ½ loáº¡i nghá»‰.'); next(); };
import * as c from '../controllers/leaveController.js';
export function createLeaveRouter({ authenticate = defaultAuthenticate, hrOnly = defaultHrOnly } = {}) {
  const leaveRouter = Router();
  leaveRouter.use(authenticate);
  leaveRouter.get('/leave-employees', c.employees);
  leaveRouter.get('/leave-types', c.listTypes);
  leaveRouter.post('/leave-types', hrOnly, c.createType);
  leaveRouter.get('/leave-types/:id', c.typeDetail);
  leaveRouter.patch('/leave-types/:id', hrOnly, c.editType);
  leaveRouter.delete('/leave-types/:id', hrOnly, c.removeType);
  leaveRouter.get('/leave-requests', c.listRequests);
  leaveRouter.post('/leave-requests', c.createRequest);
  leaveRouter.post('/leave-requests/preview', c.preview);
  leaveRouter.get('/leave-requests/:id', c.requestDetail);
  leaveRouter.patch('/leave-requests/:id', c.editRequest);
  leaveRouter.delete('/leave-requests/:id', c.removeRequest);
  leaveRouter.post('/leave-requests/:id/approve', c.approve);
  leaveRouter.post('/leave-requests/:id/reject', c.reject);
  leaveRouter.post('/leave-requests/:id/cancel', c.cancel);
  leaveRouter.get('/leave-balances/:employeeId', c.balances);
  leaveRouter.get('/leave-approved-days', c.approvedDays);

  return leaveRouter;
}
export const leaveRouter = createLeaveRouter();


