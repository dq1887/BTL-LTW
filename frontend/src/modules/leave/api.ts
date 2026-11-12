let accessToken = '';
export const setAccessToken = (token: string) => { accessToken = token; };
export class ApiError extends Error { status: number; code: string; constructor(status: number, message: string, code = '') { super(message); this.status = status; this.code = code; } }
export async function api<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api' + path, { method, signal, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  } catch (error) { if (signal?.aborted) throw error; throw new ApiError(0, 'KhÃ´ng káº¿t ná»‘i Ä‘Æ°á»£c mÃ¡y chá»§. Vui lÃ²ng kiá»ƒm tra káº¿t ná»‘i vÃ  thá»­ láº¡i.'); }
  if (response.status === 204) return undefined as T;
  let result: { success?: boolean; data?: T; message?: string; code?: string };
  try {
    const parsed: unknown = await response.json();
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('Invalid JSON object');
    result = parsed as typeof result;
  } catch { throw new ApiError(response.status, 'MÃ¡y chá»§ chÆ°a sáºµn sÃ ng hoáº·c pháº£n há»“i khÃ´ng há»£p lá»‡. Vui lÃ²ng thá»­ láº¡i.'); }
  if (!response.ok || result.success !== true) {
    if ((response.status === 401 && path !== '/auth/login') || result.code === 'EMPLOYEE_INACTIVE') window.dispatchEvent(new Event('auth-expired'));
    throw new ApiError(response.status, result.message ?? 'KhÃ´ng thá»±c hiá»‡n Ä‘Æ°á»£c yÃªu cáº§u.', result.code);
  }
  return result.data as T;
}


