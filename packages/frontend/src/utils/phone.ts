/**
 * Korean phone number auto-formatter.
 *
 * Strips every non-digit, then inserts hyphens based on length:
 *   3 digits           → 010
 *   4-7 digits         → 010-1234
 *   8-10 digits (010-) → 010-1234-5678
 *   8 digits (02-)     → 02-1234-5678
 *   9 digits           → 02-123-4567
 *   11 digits          → 010-1234-5678
 *
 * Designed for live `onChange` formatting in <input> — produces a value
 * the user can keep typing into without their cursor jumping around for
 * the common 010-XXXX-XXXX case.
 *
 * Pass-through for empty / undefined so cleared inputs stay cleared.
 */
export function formatPhoneNumber(raw: string | undefined | null): string {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '').slice(0, 11);

  if (digits.length === 0) return '';

  // Seoul / 지역번호 starting with 02 → 2-3-4 or 2-4-4
  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  // Mobile / 070 / other 3-digit prefix → 3-3-4 or 3-4-4
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/**
 * Korean business registration number (사업자등록번호) formatter.
 * Format is fixed 3-2-5 → "000-00-00000" (10 digits total).
 * Strips non-digits, caps at 10, inserts hyphens as the user types.
 */
export function formatBusinessNumber(raw: string | undefined | null): string {
  if (!raw) return '';
  const d = String(raw).replace(/\D/g, '').slice(0, 10);
  if (d.length === 0) return '';
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}
