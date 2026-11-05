let accessToken = '';
export const setAccessToken = (token: string) => { accessToken = token; };
export class ApiError extends Error { constructor(public status: number, message: string, public code = '') { super(message); } }
export async function api<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api' + path, { method, signal, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  } catch (error) { if (signal?.aborted) throw error; throw new ApiError(0, 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.'); }
  if (response.status === 204) return undefined as T;
  let result: { success?: boolean; data?: T; message?: string; code?: string };
  try {
    const parsed: unknown = await response.json();
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('Invalid JSON object');
    result = parsed as typeof result;
  } catch { throw new ApiError(response.status, 'Máy chủ chưa sẵn sàng hoặc phản hồi không hợp lệ. Vui lòng thử lại.'); }
  if (!response.ok || result.success !== true) {
    if ((response.status === 401 && path !== '/auth/login') || result.code === 'EMPLOYEE_INACTIVE') window.dispatchEvent(new Event('auth-expired'));
    throw new ApiError(response.status, result.message ?? 'Không thực hiện được yêu cầu.', result.code);
  }
  return result.data as T;
}
