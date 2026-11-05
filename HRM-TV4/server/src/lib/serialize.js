export function serialize(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toHexString === 'function') return value.toHexString();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value.toObject === 'function') return serialize(value.toObject());
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== '__v' && key !== 'passwordHash')
    .map(([key, item]) => [key === '_id' ? 'id' : key, serialize(item)]));
  return value;
}
