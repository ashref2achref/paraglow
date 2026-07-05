import prisma from '@/lib/prisma'
import { routing } from '@/i18n/routing'

type SupportedLocale = (typeof routing.locales)[number]

// Verified empirically (Chantier 9): Next.js 16's Proxy (the renamed Middleware)
// defaults to the Node.js runtime, so a direct Prisma/better-sqlite3 query from
// proxy.ts works in both `next dev` and `next start`.
//
// Propagation model — important architectural note:
// Next.js bundles the Proxy (proxy.ts) SEPARATELY from the server/API bundle, so
// this module is instantiated TWICE at runtime with independent module state: once
// inside the proxy bundle, once inside the server bundle. That means an in-memory
// "invalidate this cache" signal fired from an API route (server bundle) can NEVER
// reach the proxy bundle's copy — cross-bundle in-memory invalidation is impossible
// by construction. The single source of truth both bundles DO share is the SQLite
// row itself. So we use a short TTL: each bundle re-reads the row at most once per
// TTL window. The admin's "default language" is set once and changed very rarely,
// so a bounded staleness of a few seconds on that rare change is perfectly
// acceptable, and the read is a synchronous single-row PK lookup (microseconds).
// This matches the task's accepted "revalidation toutes les X" option; true
// immediate cross-bundle invalidation is not achievable in this architecture.
const CACHE_TTL_MS = 15_000

let cachedLocale: SupportedLocale | null = null
let cachedAt = 0

function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && (routing.locales as readonly string[]).includes(value)
}

/**
 * Returns the admin-configured preferred locale for unprefixed "/" visits,
 * falling back to routing.ts's static defaultLocale ('fr') when unset or
 * invalid. This does NOT change which locales are supported or how any
 * already-prefixed route (e.g. /en/catalogue) resolves — only the fallback
 * used for a first-time visitor with no explicit locale in the URL.
 */
export async function getPreferredLocale(): Promise<SupportedLocale> {
  const now = Date.now()
  if (cachedLocale && now - cachedAt < CACHE_TTL_MS) {
    return cachedLocale
  }

  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'preferredLocale' } })
    const value = setting?.value
    cachedLocale = isSupportedLocale(value) ? value : routing.defaultLocale
  } catch {
    // DB unreachable or transient error — keep serving the static default rather
    // than fail every page request.
    cachedLocale = routing.defaultLocale
  }

  cachedAt = now
  return cachedLocale
}
