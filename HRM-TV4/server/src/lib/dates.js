import { z } from 'zod';
export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}, 'Ngày không hợp lệ');
export function todayVN() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function daysByYear(dates) {
  return dates.reduce((acc, date) => { const year = date.slice(0, 4); acc[year] = (acc[year] ?? 0) + 1; return acc; }, {});
}
export function periodsInRange(from, to) {
  const periods = []; let year = Number(from.slice(0, 4)); let month = Number(from.slice(5, 7));
  while (`${year}-${String(month).padStart(2, '0')}` <= to.slice(0, 7)) {
    periods.push(`${year}-${String(month).padStart(2, '0')}`);
    month++; if (month === 13) { month = 1; year++; }
  }
  return periods;
}
