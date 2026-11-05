import { serialize } from '../lib/serialize.js';
import { z } from 'zod';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { LeaveType } from '../models/LeaveType.js';
import { visibleEmployees } from '../integrations/hrmGateway.js';
import { ensure } from '../lib/errors.js';
import { dateOnly, todayVN } from '../lib/dates.js';
import * as service from '../services/leaveService.js';
import { objectId, typeInput, typePatch, requestInput, requestPatch, filtersInput, noteInput, approveInput } from '../validators/leave.js';
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data: serialize(data) });
export const listTypes = async (req, res) => {
  const [types, ids] = await Promise.all([LeaveType.find().sort({ code: 1 }), LeaveRequest.distinct('leaveTypeId')]);
  const used = new Set(ids.map(String));
  ok(res, types.map((type) => ({ ...type.toObject(), used: used.has(String(type._id)) })));
};
export const typeDetail = async (req, res) => { const doc = await LeaveType.findById(objectId.parse(req.params.id)); ensure(doc, 404, 'Không tìm thấy loại nghỉ.'); ok(res, doc); };
export const createType = async (req, res) => ok(res, await service.saveType(null, typeInput.parse(req.body)), 201);
export const editType = async (req, res) => ok(res, await service.saveType(objectId.parse(req.params.id), typePatch.parse(req.body)));
export const removeType = async (req, res) => { await service.deleteType(objectId.parse(req.params.id)); res.status(204).end(); };
export const listRequests = async (req, res) => ok(res, await service.listRequests(req.actor, filtersInput.parse(req.query)));
export const requestDetail = async (req, res) => ok(res, await service.requestDetail(req.actor, objectId.parse(req.params.id)));
export const createRequest = async (req, res) => ok(res, await service.createRequest(req.actor, requestInput.parse(req.body)), 201);
export const editRequest = async (req, res) => ok(res, await service.editRequest(req.actor, objectId.parse(req.params.id), requestPatch.parse(req.body)));
export const removeRequest = async (req, res) => { await service.deleteRequest(req.actor, objectId.parse(req.params.id)); res.status(204).end(); };
export const approve = async (req, res) => ok(res, await service.reviewRequest(req.actor, objectId.parse(req.params.id), 'approved', approveInput.parse(req.body).note));
export const reject = async (req, res) => ok(res, await service.reviewRequest(req.actor, objectId.parse(req.params.id), 'rejected', noteInput.parse(req.body).note));
export const cancel = async (req, res) => ok(res, await service.cancelRequest(req.actor, objectId.parse(req.params.id), noteInput.parse(req.body).note));
export const balances = async (req, res) => {
  const year = z.coerce.number().int().min(2000).max(2100).parse(req.query.year ?? todayVN().slice(0,4));
  ok(res, await service.balances(req.actor, objectId.parse(req.params.employeeId), year));
};
export const employees = async (req, res) => ok(res, await visibleEmployees(req.actor));
export const approvedDays = async (req, res) => {
  const query = z.object({ employeeId: objectId, from: dateOnly, to: dateOnly }).strict().refine((v) => v.from <= v.to).parse(req.query);
  ok(res, await service.approvedDays(req.actor, query.employeeId, query.from, query.to));
};

export const preview = async (req, res) => {
  const { requestId, ...data } = z.object({ requestId: objectId.optional() }).passthrough().parse(req.body);
  ok(res, await service.previewRequest(req.actor, requestInput.parse({ ...data, reason: 'Xem trước đơn nghỉ' }), requestId));
};
