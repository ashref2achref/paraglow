import { NextRequest } from 'next/server'

function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    
    // Decode base64 bytes safely supporting UTF-8 characters
    const raw = atob(base64)
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) {
      bytes[i] = raw.charCodeAt(i)
    }
    const decoder = new TextDecoder()
    const jsonPayload = decoder.decode(bytes)
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export function checkAdminAuth(request: NextRequest | Request) {
  try {
    // 1. Get the cookies header from the request
    const cookieHeader = 'headers' in request 
      ? request.headers.get('cookie') 
      : (request as any).headers?.cookie

    if (!cookieHeader) {
      console.warn('[checkAdminAuth] No cookie header found in request')
      return false
    }

    // 2. Parse the cookie header into a Map
    const cookiesMap = new Map<string, string>()
    cookieHeader.split(';').forEach((c: string) => {
      const parts = c.trim().split('=')
      if (parts[0] && parts[1]) {
        cookiesMap.set(parts[0], decodeURIComponent(parts[1]))
      }
    })

    // 3. Find the Supabase auth token cookie (matches sb-[ref]-auth-token or sb-[ref]-auth-token.0, .1...)
    const baseKeys = new Set<string>()
    for (const key of cookiesMap.keys()) {
      if (key.startsWith('sb-') && (key.endsWith('-auth-token') || key.includes('-auth-token.'))) {
        const baseKey = key.split('.')[0]
        baseKeys.add(baseKey)
      }
    }

    let tokenValue = ''
    if (baseKeys.size > 0) {
      const baseKey = Array.from(baseKeys)[0]
      if (cookiesMap.has(baseKey)) {
        tokenValue = cookiesMap.get(baseKey) || ''
      } else {
        // Reconstruct from chunks (.0, .1, .2...)
        const chunks: { index: number; value: string }[] = []
        for (const [key, value] of cookiesMap.entries()) {
          if (key.startsWith(baseKey + '.')) {
            const indexStr = key.substring(baseKey.length + 1)
            const index = parseInt(indexStr, 10)
            if (!isNaN(index)) {
              chunks.push({ index, value })
            }
          }
        }
        chunks.sort((a, b) => a.index - b.index)
        tokenValue = chunks.map(c => c.value).join('')
      }
    }

    if (!tokenValue) {
      console.warn('[checkAdminAuth] Supabase auth token cookie not found')
      return false
    }

    // 4. Supabase token cookies can be stored as JSON arrays or objects, possibly base64 encoded with "base64-" prefix
    let accessToken = ''
    let parsedTokenValue = tokenValue
    if (tokenValue.startsWith('base64-')) {
      try {
        const base64Str = tokenValue.substring(7)
        parsedTokenValue = Buffer.from(base64Str, 'base64').toString('utf-8')
      } catch (err) {
        console.warn('[checkAdminAuth] Failed to decode base64 prefixed tokenValue:', err)
      }
    }

    try {
      const parsed = JSON.parse(parsedTokenValue)
      accessToken = Array.isArray(parsed)
        ? parsed[0]
        : (typeof parsed === 'object' && parsed !== null ? parsed.access_token : parsed)
    } catch {
      // Fallback if it is stored as a raw string
      accessToken = parsedTokenValue
    }

    if (!accessToken) {
      console.warn('[checkAdminAuth] Access token not found in cookie payload')
      return false
    }

    // 5. Decode the JWT payload synchronously
    const payload = decodeJwt(accessToken)
    if (!payload) {
      console.warn('[checkAdminAuth] Failed to decode JWT payload')
      return false
    }

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.warn('[checkAdminAuth] Session token is expired')
      return false
    }

    // 6. Verify role metadata is ADMIN
    const role = payload.user_metadata?.role || payload.app_metadata?.role
    if (role !== 'ADMIN') {
      console.warn(`[checkAdminAuth] Access denied: User has role "${role}", expected "ADMIN"`)
      return false
    }

    return true
  } catch (err) {
    console.error('[checkAdminAuth] Auth check failed:', err)
    return false
  }
}

// Keep placeholders for backward compatibility
export function verifyAdminSessionToken(token: string | undefined) {
  return false
}

export function createAdminSessionToken() {
  return ''
}

export function setAdminSessionCookie(response: any, token: string) {}

export function clearAdminSessionCookie(response: any) {}
