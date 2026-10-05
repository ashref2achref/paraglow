import prisma from '@/lib/prisma'
import { routing } from '@/i18n/routing'

type SupportedLocale = (typeof routing.locales)[number]

// The Proxy and server/API bundles have independent module state. A short TTL
// keeps the preferred-locale lookup inexpensive while still reflecting admin changes
// quickly. PostgreSQL remains the shared source of truth across all server instances.
const CACHE_TTL_MS = 60_000

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

export function invalidatePreferredLocaleCache() {
  cachedLocale = null
  cachedAt = 0
}
