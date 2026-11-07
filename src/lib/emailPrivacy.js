/**
 * Presentation-only concealment. Never substitute this value for a real email
 * in authentication, receipts, password resets or database ownership checks.
 */
export function maskEmail(value) {
  const text = String(value || '').trim();
  const parts = text.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1] || !parts[1].includes('.')) return '••••';
  const [local, host] = parts;
  const dot = host.lastIndexOf('.');
  const base = host.slice(0, dot);
  const suffix = host.slice(dot);
  const exposedLocal = [...local].slice(0, local.length > 2 ? 2 : 1).join('');
  return exposedLocal + '••••@' + [...base].slice(0,1).join('') + '••••' + suffix;
}
