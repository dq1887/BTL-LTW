import { z } from 'zod';
import { dateOnly } from '../lib/dates.js';
export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'ID khÃ´ng há»£p lá»‡');
export const typeInput = z.object({
  code: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/).transform((s) => s.toUpperCase()),
  name: z.string().trim().min(2).max(100), paid: z.boolean(),
  annualQuota: z.number().int().min(0).max(366).nullable(), active: z.boolean().default(true),
}).strict();
export const typePatch = typeInput.extend({ active: z.boolean() }).partial().refine((v) => Object.keys(v).length > 0, 'KhÃ´ng cÃ³ dá»¯ liá»‡u cáº­p nháº­t');
export const requestInput = z.object({
  employeeId: objectId.optional(), leaveTypeId: objectId,
  fromDate: dateOnly, toDate: dateOnly, reason: z.string().trim().min(5).max(1000),
}).strict().refine((v) => v.fromDate <= v.toDate, 'NgÃ y káº¿t thÃºc khÃ´ng Ä‘Æ°á»£c trÆ°á»›c ngÃ y báº¯t Ä‘áº§u')
.refine((v) => (Date.parse(v.toDate) - Date.parse(v.fromDate)) / 86400000 <= 366, 'Má»—i Ä‘Æ¡n tá»‘i Ä‘a 367 ngÃ y lá»‹ch');
export const requestPatch = z.object({ leaveTypeId: objectId.optional(), fromDate: dateOnly.optional(), toDate: dateOnly.optional(), reason: z.string().trim().min(5).max(1000).optional() }).strict().refine((v) => Object.keys(v).length > 0, 'KhÃ´ng cÃ³ dá»¯ liá»‡u cáº­p nháº­t');
export const noteInput = z.object({ note: z.string().trim().min(3).max(500) }).strict();
export const approveInput = z.object({ note: z.string().trim().max(500).default('') }).strict();
export const filtersInput = z.object({
  employeeId: objectId.optional(), status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  from: dateOnly.optional(), to: dateOnly.optional(), q: z.string().max(100).optional(),
}).strict().refine((v) => !v.from || !v.to || v.from <= v.to, 'Khoáº£ng lá»c ngÃ y khÃ´ng há»£p lá»‡');


