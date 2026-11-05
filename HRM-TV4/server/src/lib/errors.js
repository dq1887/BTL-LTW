export class AppError extends Error {
  constructor(status, message, code = 'BUSINESS_ERROR') {
    super(message); this.status = status; this.code = code;
  }
}
export function ensure(condition, status, message, code) {
  if (!condition) throw new AppError(status, message, code);
}
