/**
 * Tunisian phone utilities — single source of truth (see CHANTIER 2D).
 *
 * normalizeTunisianPhone strips spaces, dashes, dots, parentheses and the
 * international prefixes (+216 / 216 / 00216) down to the local 8-digit number,
 * so tracking lookups and client matching are robust to formatting.
 */
export function normalizeTunisianPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  let digits = String(raw).replace(/\D/g, '') // keep digits only

  // Drop international prefixes
  if (digits.startsWith('00216')) {
    digits = digits.slice(5)
  } else if (digits.startsWith('216') && digits.length > 8) {
    digits = digits.slice(3)
  }

  // Compare on the trailing 8 digits (local number)
  if (digits.length > 8) digits = digits.slice(-8)
  return digits
}

/** wa.me-ready number: "216" + local 8 digits (digits only), or '' if invalid. */
export function toWhatsAppNumber(raw: string | null | undefined): string {
  const local = normalizeTunisianPhone(raw)
  return local.length === 8 ? `216${local}` : ''
}
