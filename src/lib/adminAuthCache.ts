export interface VerifiedAuthClaims {
  sub?: string
  app_metadata?: {
    role?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

type CacheEntry = {
  claims: VerifiedAuthClaims
  expiresAt: number
}

type AuthCacheGlobal = typeof globalThis & {
  __paraglowAdminAuthCache?: Map<string, CacheEntry>
  __paraglowAdminAuthPending?: Map<string, Promise<VerifiedAuthClaims | null>>
}

const globalAuth = globalThis as AuthCacheGlobal
const verifiedCache = globalAuth.__paraglowAdminAuthCache ?? new Map<string, CacheEntry>()
const pendingChecks =
  globalAuth.__paraglowAdminAuthPending ?? new Map<string, Promise<VerifiedAuthClaims | null>>()

globalAuth.__paraglowAdminAuthCache = verifiedCache
globalAuth.__paraglowAdminAuthPending = pendingChecks

const MAX_CACHE_MS = 60_000
const MAX_CACHE_ENTRIES = 100

function pruneExpired(now: number) {
  for (const [token, entry] of verifiedCache) {
    if (entry.expiresAt <= now) verifiedCache.delete(token)
  }

  while (verifiedCache.size > MAX_CACHE_ENTRIES) {
    const oldest = verifiedCache.keys().next().value
    if (!oldest) break
    verifiedCache.delete(oldest)
  }
}

/**
 * Uses an unverified access token only as an opaque cache key.
 * Authorization is granted only after verifier() has successfully validated it.
 */
export async function getVerifiedClaimsCached(
  token: string,
  tokenExpiresAtSeconds: number | undefined,
  verifier: () => Promise<VerifiedAuthClaims | null>
): Promise<VerifiedAuthClaims | null> {
  const now = Date.now()
  const cached = verifiedCache.get(token)

  if (cached && cached.expiresAt > now) {
    return cached.claims
  }

  const existingCheck = pendingChecks.get(token)
  if (existingCheck) {
    return existingCheck
  }

  const verification = (async () => {
    const claims = await verifier()
    if (!claims) return null

    const hardExpiry = tokenExpiresAtSeconds
      ? tokenExpiresAtSeconds * 1000 - 5_000
      : Date.now() + MAX_CACHE_MS
    const ttl = Math.min(MAX_CACHE_MS, Math.max(0, hardExpiry - Date.now()))

    if (ttl > 0) {
      verifiedCache.set(token, {
        claims,
        expiresAt: Date.now() + ttl,
      })
    }

    pruneExpired(Date.now())
    return claims
  })()

  pendingChecks.set(token, verification)

  try {
    return await verification
  } finally {
    pendingChecks.delete(token)
  }
}
