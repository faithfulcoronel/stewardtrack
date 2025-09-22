export function uniqueID(prefix = ''): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
    return prefix ? `${prefix}-${id}` : id;
  }

  const random = Math.random().toString(36).slice(2, 14).toUpperCase();
  return prefix ? `${prefix}-${random}` : random;
}
