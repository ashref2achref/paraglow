export const ADMIN_SESSION_COOKIE = 'admin-session'
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export type AdminSessionPayload = {
  exp: number
  iat: number
  nonce: string
}

export function getAdminSessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim()
  return secret && secret.length >= 32 ? secret : null
}

export function splitAdminSessionToken(token: string | undefined) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  return { payloadPart: parts[0], signaturePart: parts[1] }
}
