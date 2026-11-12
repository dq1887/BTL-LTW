import { create } from 'zustand';
import { todayVN } from '../types';
interface Filters { q: string; status: string; employeeId: string; from: string; to: string; year: number }
interface Store extends Filters { set: (patch: Partial<Filters>) => void; reset: () => void }
const defaults = (): Filters => ({ q: '', status: '', employeeId: '', from: '', to: '', year: Number(todayVN().slice(0,4)) });
export const useLeaveFilters = create<Store>((set) => ({ ...defaults(), set: (patch) => set(patch), reset: () => set(defaults()) }));


